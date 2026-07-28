import { getProduct, json, runtime, secureHeaders, sha256 } from "../server";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token || token.length > 256) return json({ error: "Invalid download link" }, { status: 400 });
  const tokenHash = await sha256(token);
  const grant = await runtime().DB.prepare(
    `SELECT g.id, g.order_id, g.expires_at, g.download_count, g.max_downloads,
            g.revoked_at, o.price_id, o.status
     FROM download_grants g
     JOIN orders o ON o.id = g.order_id
     WHERE g.token_hash = ?`,
  ).bind(tokenHash).first<Record<string, unknown>>();
  if (!grant) return json({ error: "Invalid download link" }, { status: 404 });
  if (grant.status === "refunded" || grant.revoked_at) {
    return json({ error: "This download has been revoked" }, { status: 410 });
  }
  if (Date.now() >= Number(grant.expires_at)) return json({ error: "This download link has expired" }, { status: 410 });
  if (Number(grant.download_count) >= Number(grant.max_downloads)) {
    return json({ error: "Download limit reached" }, { status: 429 });
  }
  const product = getProduct(String(grant.price_id));
  if (!product) return json({ error: "Product unavailable" }, { status: 404 });

  const updated = await runtime().DB.prepare(
    `UPDATE download_grants
     SET download_count = download_count + 1, last_downloaded_at = ?
     WHERE id = ? AND revoked_at IS NULL AND expires_at > ? AND download_count < max_downloads`,
  ).bind(Date.now(), grant.id, Date.now()).run();
  if ((updated.meta.changes || 0) !== 1) return json({ error: "Download unavailable" }, { status: 409 });

  const object = await runtime().BUCKET.get(product.objectKey);
  if (!object) return json({ error: "Product file unavailable" }, { status: 503 });
  const headers = new Headers({
    "Content-Type": product.contentType,
    "Content-Disposition": `attachment; filename="${product.downloadName.replaceAll('"', "")}"`,
    "Cache-Control": "private, no-store",
  });
  if (object.size) headers.set("Content-Length", String(object.size));
  secureHeaders(headers);
  return new Response(object.body, { headers });
}
