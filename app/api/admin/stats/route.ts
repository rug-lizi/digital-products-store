import { products } from "../../../catalog";
import { json, productInfo, requireAdmin, runtime } from "../../../server";

export async function GET(request: Request) {
  if (!(await requireAdmin(request))) return json({ error: "Unauthorized" }, { status: 401 });
  const [overall, sales, perProductRows, recentEvents, paidRows] = await Promise.all([
    runtime().DB.prepare(
      `SELECT
         SUM(CASE WHEN type = 'page_view' THEN 1 ELSE 0 END) pageViews,
         COUNT(DISTINCT CASE WHEN type = 'page_view' THEN ip END) uniqueVisitors,
         SUM(CASE WHEN type = 'checkout_attempt' THEN 1 ELSE 0 END) checkoutAttempts
       FROM events`,
    ).first<Record<string, number>>(),
    runtime().DB.prepare(
      `SELECT COUNT(*) completedSales, COALESCE(SUM(amount_total), 0) revenue
       FROM orders WHERE status = 'paid'`,
    ).first<Record<string, number>>(),
    runtime().DB.prepare(
      `SELECT price_id,
         SUM(CASE WHEN type = 'product_view' THEN 1 ELSE 0 END) views,
         SUM(CASE WHEN type = 'checkout_attempt' THEN 1 ELSE 0 END) checkouts
       FROM events WHERE price_id IS NOT NULL GROUP BY price_id`,
    ).all<Record<string, unknown>>(),
    runtime().DB.prepare(
      `SELECT type, ip, price_id priceId, amount, order_id orderId, created_at createdAt
       FROM events ORDER BY created_at DESC, id DESC LIMIT 50`,
    ).all<Record<string, unknown>>(),
    runtime().DB.prepare(
      `SELECT price_id, COUNT(*) sales, COALESCE(SUM(amount_total), 0) revenue
       FROM orders WHERE status = 'paid' GROUP BY price_id`,
    ).all<Record<string, unknown>>(),
  ]);
  const perProduct = Object.fromEntries(
    products.map((product) => [product.priceId, { views: 0, checkouts: 0, sales: 0, revenue: 0 }]),
  );
  for (const row of perProductRows.results) {
    const item = perProduct[String(row.price_id)];
    if (item) {
      item.views = Number(row.views || 0);
      item.checkouts = Number(row.checkouts || 0);
    }
  }
  for (const row of paidRows.results) {
    const item = perProduct[String(row.price_id)];
    if (item) {
      item.sales = Number(row.sales || 0);
      item.revenue = Number(row.revenue || 0);
    }
  }
  return json({
    pageViews: Number(overall?.pageViews || 0),
    uniqueVisitors: Number(overall?.uniqueVisitors || 0),
    checkoutAttempts: Number(overall?.checkoutAttempts || 0),
    completedSales: Number(sales?.completedSales || 0),
    revenue: Number(sales?.revenue || 0),
    perProduct,
    productInfo: productInfo(),
    recentEvents: recentEvents.results,
  });
}
