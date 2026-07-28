import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  stripeSessionId: text("stripe_session_id").unique(),
  stripePaymentIntentId: text("stripe_payment_intent_id").unique(),
  priceId: text("price_id").notNull(),
  status: text("status", { enum: ["pending", "paid", "failed", "refunded"] }).notNull(),
  amountTotal: integer("amount_total"),
  currency: text("currency"),
  customerEmail: text("customer_email"),
  createdAt: integer("created_at").notNull(),
  paidAt: integer("paid_at"),
});

export const webhookEvents = sqliteTable("webhook_events", {
  eventId: text("event_id").primaryKey(),
  eventType: text("event_type").notNull(),
  receivedAt: integer("received_at").notNull(),
});

export const downloadGrants = sqliteTable("download_grants", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().unique(),
  tokenHash: text("token_hash").notNull().unique(),
  createdAt: integer("created_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
  downloadCount: integer("download_count").notNull().default(0),
  maxDownloads: integer("max_downloads").notNull(),
  lastDownloadedAt: integer("last_downloaded_at"),
  revokedAt: integer("revoked_at"),
});

export const adminSessions = sqliteTable("admin_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  createdAt: integer("created_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
});

export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(),
  ip: text("ip").notNull(),
  priceId: text("price_id"),
  amount: integer("amount"),
  orderId: text("order_id"),
  createdAt: integer("created_at").notNull(),
});

export const loginAttempts = sqliteTable("login_attempts", {
  ipHash: text("ip_hash").primaryKey(),
  failures: integer("failures").notNull(),
  resetAt: integer("reset_at").notNull(),
});

export const secureSettings = sqliteTable("secure_settings", {
  key: text("key").primaryKey(),
  encryptedValue: text("encrypted_value").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
