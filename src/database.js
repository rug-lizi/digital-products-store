'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

class StoreDatabase {
  constructor(filename = ':memory:') {
    if (filename !== ':memory:') {
      fs.mkdirSync(path.dirname(filename), { recursive: true });
    }
    this.db = new Database(filename);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.migrate();
  }

  migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        stripe_session_id TEXT UNIQUE,
        stripe_payment_intent_id TEXT UNIQUE,
        price_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
        amount_total INTEGER,
        currency TEXT,
        customer_email TEXT,
        created_at INTEGER NOT NULL,
        paid_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS webhook_events (
        event_id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        received_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS download_grants (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        download_count INTEGER NOT NULL DEFAULT 0,
        max_downloads INTEGER NOT NULL,
        last_downloaded_at INTEGER,
        revoked_at INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_download_grants_order
        ON download_grants(order_id);

      CREATE TABLE IF NOT EXISTS admin_sessions (
        token_hash TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        ip TEXT NOT NULL,
        price_id TEXT,
        amount INTEGER,
        order_id TEXT,
        created_at INTEGER NOT NULL
      );
    `);
  }

  close() {
    this.db.close();
  }

  createOrder({ id, priceId, now }) {
    this.db.prepare(`
      INSERT INTO orders (id, price_id, status, created_at)
      VALUES (?, ?, 'pending', ?)
    `).run(id, priceId, now);
  }

  attachStripeSession(orderId, stripeSessionId) {
    this.db.prepare(`
      UPDATE orders SET stripe_session_id = ? WHERE id = ?
    `).run(stripeSessionId, orderId);
  }

  markOrderFailed(orderId) {
    this.db.prepare(`
      UPDATE orders SET status = 'failed'
      WHERE id = ? AND status = 'pending'
    `).run(orderId);
  }

  getOrderById(orderId) {
    return this.db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  }

  getOrderBySessionId(sessionId) {
    return this.db.prepare('SELECT * FROM orders WHERE stripe_session_id = ?').get(sessionId);
  }

  recordWebhookAndFulfill({ eventId, eventType, orderId, session, now }) {
    const transaction = this.db.transaction(() => {
      const inserted = this.db.prepare(`
        INSERT OR IGNORE INTO webhook_events (event_id, event_type, received_at)
        VALUES (?, ?, ?)
      `).run(eventId, eventType, now);

      if (inserted.changes === 0) return { duplicate: true };

      const updated = this.db.prepare(`
        UPDATE orders
        SET status = 'paid',
            stripe_session_id = COALESCE(stripe_session_id, ?),
            stripe_payment_intent_id = COALESCE(stripe_payment_intent_id, ?),
            amount_total = ?,
            currency = ?,
            customer_email = ?,
            paid_at = COALESCE(paid_at, ?)
        WHERE id = ? AND status IN ('pending', 'paid')
      `).run(
        session.id,
        typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || null,
        session.amount_total ?? null,
        session.currency ?? null,
        session.customer_details?.email || session.customer_email || null,
        now,
        orderId
      );

      if (updated.changes === 0) {
        throw new Error(`Order not found or not fulfillable: ${orderId}`);
      }

      this.db.prepare(`
        INSERT INTO events (type, ip, price_id, amount, order_id, created_at)
        SELECT 'payment_completed', 'stripe_webhook', price_id, ?, id, ?
        FROM orders
        WHERE id = ?
          AND NOT EXISTS (
            SELECT 1 FROM events
            WHERE type = 'payment_completed' AND order_id = ?
          )
      `).run(session.amount_total ?? 0, now, orderId, orderId);

      return { duplicate: false };
    });

    return transaction();
  }

  recordWebhookEvent({ eventId, eventType, now }) {
    const inserted = this.db.prepare(`
      INSERT OR IGNORE INTO webhook_events (event_id, event_type, received_at)
      VALUES (?, ?, ?)
    `).run(eventId, eventType, now);
    return { duplicate: inserted.changes === 0 };
  }

  recordFailedWebhook({ eventId, eventType, orderId, now }) {
    const transaction = this.db.transaction(() => {
      const inserted = this.db.prepare(`
        INSERT OR IGNORE INTO webhook_events (event_id, event_type, received_at)
        VALUES (?, ?, ?)
      `).run(eventId, eventType, now);
      if (inserted.changes === 0) return { duplicate: true };
      this.db.prepare(`
        UPDATE orders SET status = 'failed'
        WHERE id = ? AND status = 'pending'
      `).run(orderId);
      return { duplicate: false };
    });
    return transaction();
  }

  createDownloadGrant({ id, orderId, tokenHash, now, expiresAt, maxDownloads }) {
    const order = this.getOrderById(orderId);
    if (!order || order.status !== 'paid') {
      throw new Error('Download grants require a paid order');
    }
    this.db.prepare(`
      INSERT INTO download_grants
        (id, order_id, token_hash, created_at, expires_at, max_downloads)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, orderId, tokenHash, now, expiresAt, maxDownloads);
  }

  getActiveGrantForOrder(orderId) {
    return this.db.prepare(`
      SELECT *
      FROM download_grants
      WHERE order_id = ? AND revoked_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `).get(orderId);
  }

  refundByPaymentIntent({ eventId, eventType, paymentIntentId, now }) {
    const transaction = this.db.transaction(() => {
      const inserted = this.db.prepare(`
        INSERT OR IGNORE INTO webhook_events (event_id, event_type, received_at)
        VALUES (?, ?, ?)
      `).run(eventId, eventType, now);
      if (inserted.changes === 0) return { duplicate: true };

      const order = this.db.prepare(`
        SELECT id FROM orders WHERE stripe_payment_intent_id = ?
      `).get(paymentIntentId);
      if (!order) return { duplicate: false, matched: false };

      this.db.prepare(`
        UPDATE orders SET status = 'refunded' WHERE id = ?
      `).run(order.id);
      this.db.prepare(`
        UPDATE download_grants SET revoked_at = ?
        WHERE order_id = ? AND revoked_at IS NULL
      `).run(now, order.id);
      return { duplicate: false, matched: true };
    });
    return transaction();
  }

  consumeDownload(tokenHash, now) {
    const transaction = this.db.transaction(() => {
      const grant = this.db.prepare(`
        SELECT
          g.id,
          g.download_count,
          g.max_downloads,
          g.expires_at,
          g.revoked_at,
          o.id AS order_id,
          o.price_id,
          o.status
        FROM download_grants g
        JOIN orders o ON o.id = g.order_id
        WHERE g.token_hash = ?
      `).get(tokenHash);

      if (!grant) return { ok: false, reason: 'invalid' };
      if (grant.status !== 'paid' || grant.revoked_at) return { ok: false, reason: 'revoked' };
      if (grant.expires_at <= now) return { ok: false, reason: 'expired' };
      if (grant.download_count >= grant.max_downloads) return { ok: false, reason: 'limit' };

      this.db.prepare(`
        UPDATE download_grants
        SET download_count = download_count + 1, last_downloaded_at = ?
        WHERE id = ?
      `).run(now, grant.id);

      return { ok: true, orderId: grant.order_id, priceId: grant.price_id };
    });

    return transaction();
  }

  createAdminSession(tokenHash, now, expiresAt) {
    this.db.prepare(`
      INSERT INTO admin_sessions (token_hash, created_at, expires_at)
      VALUES (?, ?, ?)
    `).run(tokenHash, now, expiresAt);
  }

  hasValidAdminSession(tokenHash, now) {
    const row = this.db.prepare(`
      SELECT 1 FROM admin_sessions
      WHERE token_hash = ? AND expires_at > ?
    `).get(tokenHash, now);
    return Boolean(row);
  }

  deleteAdminSession(tokenHash) {
    this.db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(tokenHash);
  }

  purgeExpired(now) {
    this.db.prepare('DELETE FROM admin_sessions WHERE expires_at <= ?').run(now);
    this.db.prepare(`
      DELETE FROM download_grants
      WHERE expires_at <= ? OR revoked_at IS NOT NULL
    `).run(now);
  }

  recordEvent({ type, ip, priceId = null, amount = null, orderId = null, now }) {
    this.db.prepare(`
      INSERT INTO events (type, ip, price_id, amount, order_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(type, ip, priceId, amount, orderId, now);
  }

  getStats(products) {
    const overall = this.db.prepare(`
      SELECT
        SUM(CASE WHEN type = 'page_view' THEN 1 ELSE 0 END) AS pageViews,
        COUNT(DISTINCT CASE WHEN type = 'page_view' THEN ip END) AS uniqueVisitors,
        SUM(CASE WHEN type = 'checkout_attempt' THEN 1 ELSE 0 END) AS checkoutAttempts
      FROM events
    `).get();

    const sales = this.db.prepare(`
      SELECT
        COUNT(*) AS completedSales,
        COALESCE(SUM(amount_total), 0) AS revenue
      FROM orders
      WHERE status = 'paid'
    `).get();

    const perProductRows = this.db.prepare(`
      SELECT
        p.price_id,
        COALESCE(v.views, 0) AS views,
        COALESCE(c.checkouts, 0) AS checkouts,
        COALESCE(s.sales, 0) AS sales,
        COALESCE(s.revenue, 0) AS revenue
      FROM (
        SELECT price_id FROM orders
        UNION
        SELECT price_id FROM events WHERE price_id IS NOT NULL
      ) p
      LEFT JOIN (
        SELECT price_id, COUNT(*) AS views
        FROM events WHERE type = 'product_view'
        GROUP BY price_id
      ) v ON v.price_id = p.price_id
      LEFT JOIN (
        SELECT price_id, COUNT(*) AS checkouts
        FROM events WHERE type = 'checkout_attempt'
        GROUP BY price_id
      ) c ON c.price_id = p.price_id
      LEFT JOIN (
        SELECT price_id, COUNT(*) AS sales, COALESCE(SUM(amount_total), 0) AS revenue
        FROM orders WHERE status = 'paid'
        GROUP BY price_id
      ) s ON s.price_id = p.price_id
    `).all();

    const perProduct = {};
    const productInfo = {};
    for (const [priceId, product] of products) {
      perProduct[priceId] = { views: 0, checkouts: 0, sales: 0, revenue: 0 };
      productInfo[priceId] = { name: product.name, price: product.price, icon: product.icon };
    }
    for (const row of perProductRows) {
      if (perProduct[row.price_id]) {
        perProduct[row.price_id] = {
          views: row.views,
          checkouts: row.checkouts,
          sales: row.sales,
          revenue: row.revenue
        };
      }
    }

    const recentEvents = this.db.prepare(`
      SELECT
        type,
        ip,
        price_id AS priceId,
        amount,
        order_id AS orderId,
        datetime(created_at / 1000, 'unixepoch') || 'Z' AS ts
      FROM events
      ORDER BY id DESC
      LIMIT 50
    `).all();

    return {
      pageViews: overall.pageViews || 0,
      uniqueVisitors: overall.uniqueVisitors || 0,
      checkoutAttempts: overall.checkoutAttempts || 0,
      completedSales: sales.completedSales || 0,
      revenue: sales.revenue || 0,
      perProduct,
      productInfo,
      recentEvents
    };
  }
}

module.exports = { StoreDatabase };
