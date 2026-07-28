import { json, makeDownloadToken, positiveInt, runtime, sha256 } from "../../server";

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId || sessionId.length > 255) {
    return json({ status: "invalid", message: "Missing order reference." }, { status: 400 });
  }
  const order = await runtime().DB.prepare(
    "SELECT * FROM orders WHERE stripe_session_id = ?",
  ).bind(sessionId).first<Record<string, unknown>>();
  if (!order) {
    return json({ status: "pending", message: "Order confirmation has not arrived yet." }, { status: 404 });
  }
  if (order.status !== "paid") return json({ status: order.status });

  const paidAt = Number(order.paid_at || 0);
  const deadline = paidAt + positiveInt(runtime().DOWNLOAD_LINK_HOURS, 72) * 60 * 60 * 1000;
  if (Date.now() >= deadline) {
    return json({ status: "expired", message: "Please contact support to renew this download." });
  }

  let grant = await runtime().DB.prepare(
    `SELECT id, token_hash, expires_at, download_count, max_downloads
     FROM download_grants
     WHERE order_id = ? AND revoked_at IS NULL`,
  ).bind(order.id).first<Record<string, unknown>>();
  let grantId: string;
  if (!grant) {
    grantId = crypto.randomUUID();
    const token = await makeDownloadToken({ id: grantId, orderId: String(order.id), expiresAt: deadline });
    const tokenHash = await sha256(token);
    await runtime().DB.prepare(
      `INSERT OR IGNORE INTO download_grants
       (id, order_id, token_hash, created_at, expires_at, download_count, max_downloads)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
    ).bind(
      grantId,
      order.id,
      tokenHash,
      Date.now(),
      deadline,
      positiveInt(runtime().DOWNLOAD_MAX_USES, 5),
    ).run();
    grant = await runtime().DB.prepare(
      "SELECT id, token_hash, expires_at, download_count, max_downloads FROM download_grants WHERE order_id = ?",
    ).bind(order.id).first<Record<string, unknown>>();
  }
  grantId = String(grant?.id);
  const token = await makeDownloadToken({
    id: grantId,
    orderId: String(order.id),
    expiresAt: Number(grant?.expires_at),
  });

  return json({
    status: "paid",
    downloadUrl: `/download?token=${encodeURIComponent(token)}`,
    remainingDownloads: Math.max(0, Number(grant?.max_downloads || 0) - Number(grant?.download_count || 0)),
    expiresAt: Number(grant?.expires_at || 0),
  });
}
