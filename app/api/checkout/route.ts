import { createStripeCheckout, getProduct, json, recordEvent, runtime } from "../../server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { priceId?: string };
    const product = body.priceId ? getProduct(body.priceId) : undefined;
    if (!product) return json({ error: "Unknown product" }, { status: 400 });

    const orderId = crypto.randomUUID();
    await runtime().DB.prepare(
      `INSERT INTO orders (id, price_id, status, created_at)
       VALUES (?, ?, 'pending', ?)`,
    ).bind(orderId, product.priceId, Date.now()).run();
    await recordEvent(request, "checkout_attempt", { priceId: product.priceId, orderId });

    try {
      const session = await createStripeCheckout(request, product.priceId, orderId);
      await runtime().DB.prepare(
        "UPDATE orders SET stripe_session_id = ? WHERE id = ?",
      ).bind(session.id, orderId).run();
      return json({ url: session.url });
    } catch (error) {
      await runtime().DB.prepare(
        "UPDATE orders SET status = 'failed' WHERE id = ? AND status = 'pending'",
      ).bind(orderId).run();
      console.error("Stripe checkout creation failed", error instanceof Error ? error.message : "unknown");
      return json({ error: "Checkout is temporarily unavailable" }, { status: 502 });
    }
  } catch {
    return json({ error: "Invalid request" }, { status: 400 });
  }
}
