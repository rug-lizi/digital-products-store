import { productByPriceId, products } from "./catalog";

type RuntimeEnv = {
  DB: D1Database;
  BUCKET: R2Bucket;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  ADMIN_PASSWORD?: string;
  DOWNLOAD_SIGNING_SECRET?: string;
  SUPPORT_EMAIL?: string;
  DOWNLOAD_LINK_HOURS?: string;
  DOWNLOAD_MAX_USES?: string;
  ADMIN_SESSION_HOURS?: string;
  APP_SECRET?: string;
};

export function runtime(): RuntimeEnv {
  const value = (globalThis as typeof globalThis & { __SITES_ENV__?: RuntimeEnv }).__SITES_ENV__;
  if (!value?.DB || !value.BUCKET) throw new Error("Sites runtime bindings are unavailable");
  return value;
}

export function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  secureHeaders(headers);
  return Response.json(data, { ...init, headers });
}

export function secureHeaders(headers: Headers) {
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
}

export function clientIp(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function constantTimeEqual(a: string, b: string) {
  const [left, right] = await Promise.all([sha256(a), sha256(b)]);
  let difference = left.length ^ right.length;
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    difference |= left.charCodeAt(index % left.length) ^ right.charCodeAt(index % right.length);
  }
  return difference === 0;
}

export function randomToken(bytes = 32) {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return btoa(String.fromCharCode(...value)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64Url(value: string) {
  return btoa(value).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function hmacHex(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

export async function makeDownloadToken(grant: {
  id: string;
  orderId: string;
  expiresAt: number;
}) {
  const secret = (await getSecureSetting("DOWNLOAD_SIGNING_SECRET")) || runtime().DOWNLOAD_SIGNING_SECRET || "";
  if (secret.length < 32) throw new Error("Download signing is not configured");
  const payload = base64Url(JSON.stringify([grant.id, grant.orderId, grant.expiresAt]));
  return `${payload}.${await hmacHex(secret, payload)}`;
}

export function parseCookies(request: Request) {
  const result = new Map<string, string>();
  for (const pair of (request.headers.get("cookie") || "").split(";")) {
    const separator = pair.indexOf("=");
    if (separator < 1) continue;
    result.set(pair.slice(0, separator).trim(), decodeURIComponent(pair.slice(separator + 1).trim()));
  }
  return result;
}

export function positiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function requireAdmin(request: Request) {
  const token = parseCookies(request).get("admin_session");
  if (!token) return false;
  const tokenHash = await sha256(token);
  const row = await runtime().DB.prepare(
    "SELECT token_hash FROM admin_sessions WHERE token_hash = ? AND expires_at > ?",
  ).bind(tokenHash, Date.now()).first();
  return Boolean(row);
}

export async function recordEvent(
  request: Request,
  type: string,
  values: { priceId?: string; amount?: number; orderId?: string } = {},
) {
  const ipHash = await sha256(clientIp(request));
  await runtime().DB.prepare(
    `INSERT INTO events (type, ip, price_id, amount, order_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(type, ipHash.slice(0, 16), values.priceId || null, values.amount || null, values.orderId || null, Date.now())
    .run();
}

export function productInfo() {
  return Object.fromEntries(
    products.map((product) => [
      product.priceId,
      { name: product.name, icon: product.icon, price: product.price },
    ]),
  );
}

export async function createStripeCheckout(request: Request, priceId: string, orderId: string) {
  const secret = (await getSecureSetting("STRIPE_SECRET_KEY")) || runtime().STRIPE_SECRET_KEY || "";
  if (!secret.startsWith("sk_")) throw new Error("Stripe is not configured");
  const origin = new URL(request.url).origin;
  const body = new URLSearchParams({
    mode: "payment",
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    client_reference_id: orderId,
    "metadata[order_id]": orderId,
    "metadata[price_id]": priceId,
    success_url: `${origin}/order-status?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/`,
  });
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const payload = (await response.json()) as { id?: string; url?: string; error?: { message?: string } };
  if (!response.ok || !payload.id || !payload.url) {
    throw new Error(payload.error?.message || "Stripe session creation failed");
  }
  return { id: payload.id, url: payload.url };
}

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifyStripeWebhook(rawBody: string, signatureHeader: string | null) {
  const secret = (await getSecureSetting("STRIPE_WEBHOOK_SECRET")) || runtime().STRIPE_WEBHOOK_SECRET || "";
  if (!secret.startsWith("whsec_") || !signatureHeader) return false;
  const values = signatureHeader.split(",").map((entry) => entry.split("=", 2));
  const timestamp = values.find(([key]) => key === "t")?.[1];
  const signatures = values.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!timestamp || signatures.length === 0) return false;
  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber) || Math.abs(Date.now() / 1000 - timestampNumber) > 300) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = hex(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${rawBody}`)),
  );
  for (const candidate of signatures) {
    if (await constantTimeEqual(expected, candidate)) return true;
  }
  return false;
}

export function getProduct(priceId: string) {
  return productByPriceId.get(priceId);
}

function bytesToBase64(value: Uint8Array) {
  return btoa(String.fromCharCode(...value));
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function settingsKey() {
  const appSecret = runtime().APP_SECRET || "";
  if (appSecret.length < 32) throw new Error("APP_SECRET is not configured");
  return crypto.subtle.importKey(
    "raw",
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(appSecret)),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptSetting(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await settingsKey(),
    new TextEncoder().encode(value),
  );
  return `${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(encrypted))}`;
}

export async function getSecureSetting(name: string) {
  const row = await runtime().DB.prepare(
    "SELECT encrypted_value FROM secure_settings WHERE key = ?",
  ).bind(name).first<{ encrypted_value: string }>();
  if (!row) return null;
  const [ivValue, encryptedValue] = row.encrypted_value.split(".", 2);
  if (!ivValue || !encryptedValue) throw new Error("Invalid encrypted setting");
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(ivValue) },
    await settingsKey(),
    base64ToBytes(encryptedValue),
  );
  return new TextDecoder().decode(decrypted);
}
