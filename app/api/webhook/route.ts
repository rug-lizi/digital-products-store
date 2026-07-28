import { json, recordEvent, runtime, verifyStripeWebhook } from "../../server";

type StripeEvent = {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!(await verifyStripeWebhook(rawBody, request.headers.get("stripe-signature")))) {
    return json({ error: "Invalid Stripe signature" }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return json({ error: "Invalid payload" }, { status: 400 });
  }

  const firstSeen = await runtime().DB.prepare(
    `INSERT OR IGNORE INTO webhook_events (event_id, event_type, received_at)
     VALUES (?, ?, ?)`,
  ).bind(event.id, event.type, Date.now()).run();
  if ((firstSeen.meta.changes || 0) === 0) return json({ received: true, duplicate: true });

  const object = event.data.object;
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const metadata = (object.metadata || {}) as Record<string, string>;
    const orderId = metadata.order_id || String(object.client_reference_id || "");
    const order = await runtime().DB.prepare(
      "SELECT id, price_id FROM orders WHERE id = ?",
    ).bind(orderId).first<{ id: string; price_id: string }>();
    if (!order || metadata.price_id !== order.price_id) {
      await runtime().DB.prepare("DELETE FROM webhook_events WHERE event_id = ?").bind(event.id).run();
      return json({ error: "Order mismatch" }, { status: 422 });
    }
    const paymentStatus = String(object.payment_status || "");
    const paid =
      paymentStatus === "paid" ||
      paymentStatus === "no_payment_required" ||
      event.type === "checkout.session.async_payment_succeeded";
    if (paid) {
      const now = Date.now();
      await runtime().DB.prepare(
        `UPDATE orders
         SET status = 'paid',
             stripe_session_id = COALESCE(stripe_session_id, ?),
             stripe_payment_intent_id = COALESCE(stripe_payment_intent_id, ?),
             amount_total = ?,
             currency = ?,
             customer_email = ?,
             paid_at = COALESCE(paid_at, ?)
         WHERE id = ? AND status IN ('pending', 'paid')`,
      ).bind(
        String(object.id || ""),
        typeof object.payment_intent === "string" ? object.payment_intent : null,
        typeof object.amount_total === "number" ? object.amount_total : null,
        typeof object.currency === "string" ? object.currency : null,
        ((object.customer_details || {}) as Record<string, unknown>).email || object.customer_email || null,
        now,
        orderId,
      ).run();
      await recordEvent(request, "payment_completed", {
        priceId: order.price_id,
        amount: typeof object.amount_total === "number" ? object.amount_total : undefined,
        orderId,
      });
    }
  } else if (event.type === "checkout.session.async_payment_failed") {
    const metadata = (object.metadata || {}) as Record<string, string>;
    const orderId = metadata.order_id || String(object.client_reference_id || "");
    if (orderId) {
      await runtime().DB.prepare(
        "UPDATE orders SET status = 'failed' WHERE id = ? AND status = 'pending'",
      ).bind(orderId).run();
    }
  } else if (event.type === "charge.refunded") {
    const paymentIntentId =
      typeof object.payment_intent === "string" ? object.payment_intent : "";
    if (paymentIntentId) {
      const order = await runtime().DB.prepare(
        "SELECT id FROM orders WHERE stripe_payment_intent_id = ?",
      ).bind(paymentIntentId).first<{ id: string }>();
      if (order) {
        await runtime().DB.batch([
          runtime().DB.prepare("UPDATE orders SET status = 'refunded' WHERE id = ?").bind(order.id),
          runtime().DB.prepare("UPDATE download_grants SET revoked_at = ? WHERE order_id = ? AND revoked_at IS NULL").bind(Date.now(), order.id),
        ]);
      }
    }
  }

  return json({ received: true });
}
