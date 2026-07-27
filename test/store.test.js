'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const Stripe = require('stripe');
const { StoreDatabase } = require('../src/database');
const { createApp } = require('../src/app');

const PRICE_ID = 'price_test_product';

async function createHarness(options = {}) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'digital-shop-test-'));
  const productPath = path.join(tempDir, 'product.txt');
  fs.writeFileSync(productPath, 'paid product contents');
  const databasePath = options.databasePath || ':memory:';
  const db = new StoreDatabase(databasePath);
  let clock = options.now || 1_800_000_000_000;
  let checkoutPayload;

  const createSession = async (payload) => {
    checkoutPayload = payload;
    return { id: 'cs_test_123', url: 'https://checkout.stripe.test/session' };
  };
  let stripe;
  if (options.realWebhookSignature) {
    stripe = new Stripe('sk_test_placeholder');
    stripe.checkout.sessions.create = createSession;
  } else {
    stripe = {
      checkout: { sessions: { create: createSession } },
      webhooks: {
        constructEvent(rawBody, signature) {
          if (signature !== 'valid-signature') throw new Error('bad signature');
          return JSON.parse(rawBody.toString('utf8'));
        }
      }
    };
  }

  const config = {
    rootDir: path.resolve(__dirname, '..'),
    baseUrl: 'https://shop.example.test',
    adminPassword: 'correct horse battery staple',
    stripeWebhookSecret: 'whsec_test',
    downloadSigningSecret: 'test-signing-secret-that-is-long-enough',
    adminSessionMs: 8 * 60 * 60 * 1000,
    downloadLinkMs: 72 * 60 * 60 * 1000,
    downloadMaxUses: options.downloadMaxUses || 2,
    supportEmail: 'support@example.test',
    products: new Map([[
      PRICE_ID,
      {
        priceId: PRICE_ID,
        name: 'Test Product',
        price: 999,
        icon: 'T',
        absolutePath: productPath,
        downloadName: 'Test-Product.txt'
      }
    ]])
  };

  const server = http.createServer(createApp({ config, db, stripe, now: () => clock }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  return {
    db,
    baseUrl,
    config,
    get checkoutPayload() { return checkoutPayload; },
    setNow(value) { clock = value; },
    async close() {
      await new Promise((resolve) => server.close(resolve));
      db.close();
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  };
}

async function createCheckout(harness) {
  const response = await fetch(`${harness.baseUrl}/api/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId: PRICE_ID })
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.url, 'https://checkout.stripe.test/session');
  return harness.checkoutPayload.metadata.order_id;
}

function paidEvent(orderId, eventId = 'evt_paid_1') {
  return {
    id: eventId,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_123',
        payment_status: 'paid',
        payment_intent: 'pi_test_123',
        amount_total: 999,
        currency: 'usd',
        customer_details: { email: 'buyer@example.test' },
        client_reference_id: orderId,
        metadata: { order_id: orderId, price_id: PRICE_ID }
      }
    }
  };
}

async function sendWebhook(harness, event, signature = 'valid-signature') {
  return fetch(`${harness.baseUrl}/api/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Stripe-Signature': signature
    },
    body: JSON.stringify(event)
  });
}

test('admin login uses an HttpOnly session cookie and logout revokes it', async (t) => {
  const harness = await createHarness();
  t.after(() => harness.close());

  let response = await fetch(`${harness.baseUrl}/api/admin/stats`);
  assert.equal(response.status, 401);

  response = await fetch(`${harness.baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: harness.config.adminPassword })
  });
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie');
  assert.match(cookie, /admin_session=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Secure/);

  response = await fetch(`${harness.baseUrl}/api/admin/stats`, {
    headers: { Cookie: cookie.split(';')[0] }
  });
  assert.equal(response.status, 200);

  response = await fetch(`${harness.baseUrl}/api/admin/logout`, {
    method: 'POST',
    headers: { Cookie: cookie.split(';')[0] }
  });
  assert.equal(response.status, 200);

  response = await fetch(`${harness.baseUrl}/api/admin/stats`, {
    headers: { Cookie: cookie.split(';')[0] }
  });
  assert.equal(response.status, 401);
});

test('checkout creates only a pending order and no download grant', async (t) => {
  const harness = await createHarness();
  t.after(() => harness.close());

  const orderId = await createCheckout(harness);
  const order = harness.db.getOrderById(orderId);
  assert.equal(order.status, 'pending');
  assert.equal(order.stripe_session_id, 'cs_test_123');
  assert.equal(harness.db.getActiveGrantForOrder(orderId), undefined);
  assert.equal(
    harness.checkoutPayload.success_url,
    'https://shop.example.test/order-status?session_id={CHECKOUT_SESSION_ID}'
  );
});

test('webhook signature and idempotency protect fulfillment', async (t) => {
  const harness = await createHarness();
  t.after(() => harness.close());
  const orderId = await createCheckout(harness);
  const event = paidEvent(orderId);

  let response = await sendWebhook(harness, event, 'invalid-signature');
  assert.equal(response.status, 400);
  assert.equal(harness.db.getOrderById(orderId).status, 'pending');

  response = await sendWebhook(harness, event);
  assert.equal(response.status, 200);
  assert.equal(harness.db.getOrderById(orderId).status, 'paid');

  response = await sendWebhook(harness, event);
  assert.equal(response.status, 200);
  assert.equal(harness.db.getStats(harness.config.products).completedSales, 1);
});

test('official Stripe signature verification accepts the untouched raw body', async (t) => {
  const harness = await createHarness({ realWebhookSignature: true });
  t.after(() => harness.close());
  const orderId = await createCheckout(harness);
  const payload = JSON.stringify(paidEvent(orderId, 'evt_official_signature'));
  const signature = Stripe.webhooks.generateTestHeaderString({
    payload,
    secret: harness.config.stripeWebhookSecret
  });

  const response = await fetch(`${harness.baseUrl}/api/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Stripe-Signature': signature
    },
    body: payload
  });
  assert.equal(response.status, 200);
  assert.equal(harness.db.getOrderById(orderId).status, 'paid');
});

test('paid order receives a persistent, expiring, limited-use download', async (t) => {
  const harness = await createHarness({ downloadMaxUses: 2 });
  t.after(() => harness.close());
  const orderId = await createCheckout(harness);
  assert.equal((await sendWebhook(harness, paidEvent(orderId))).status, 200);

  let response = await fetch(`${harness.baseUrl}/api/order-status?session_id=cs_test_123`);
  assert.equal(response.status, 200);
  const firstStatus = await response.json();
  assert.equal(firstStatus.status, 'paid');
  assert.match(firstStatus.downloadUrl, /^\/download\?token=/);

  response = await fetch(`${harness.baseUrl}/api/order-status?session_id=cs_test_123`);
  const secondStatus = await response.json();
  assert.equal(secondStatus.downloadUrl, firstStatus.downloadUrl);

  response = await fetch(`${harness.baseUrl}${firstStatus.downloadUrl}`);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'paid product contents');

  response = await fetch(`${harness.baseUrl}${firstStatus.downloadUrl}`);
  assert.equal(response.status, 200);

  response = await fetch(`${harness.baseUrl}${firstStatus.downloadUrl}`);
  assert.equal(response.status, 429);
});

test('refund revokes an issued download grant', async (t) => {
  const harness = await createHarness();
  t.after(() => harness.close());
  const orderId = await createCheckout(harness);
  await sendWebhook(harness, paidEvent(orderId));

  let response = await fetch(`${harness.baseUrl}/api/order-status?session_id=cs_test_123`);
  const status = await response.json();

  const refundEvent = {
    id: 'evt_refund_1',
    type: 'charge.refunded',
    data: { object: { payment_intent: 'pi_test_123' } }
  };
  response = await sendWebhook(harness, refundEvent);
  assert.equal(response.status, 200);
  assert.equal(harness.db.getOrderById(orderId).status, 'refunded');

  response = await fetch(`${harness.baseUrl}${status.downloadUrl}`);
  assert.equal(response.status, 410);
});

test('SQLite keeps paid orders and grants across a database restart', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'digital-shop-db-test-'));
  const databasePath = path.join(tempDir, 'store.db');
  const now = 1_800_000_000_000;
  const orderId = 'order-persisted';
  const grantId = 'grant-persisted';

  let db = new StoreDatabase(databasePath);
  db.createOrder({ id: orderId, priceId: PRICE_ID, now });
  db.attachStripeSession(orderId, 'cs_persisted');
  db.recordWebhookAndFulfill({
    eventId: 'evt_persisted',
    eventType: 'checkout.session.completed',
    orderId,
    session: {
      id: 'cs_persisted',
      payment_intent: 'pi_persisted',
      amount_total: 999,
      currency: 'usd',
      customer_details: { email: 'buyer@example.test' }
    },
    now
  });
  db.createDownloadGrant({
    id: grantId,
    orderId,
    tokenHash: 'hash-persisted',
    now,
    expiresAt: now + 10_000,
    maxDownloads: 5
  });
  db.close();

  db = new StoreDatabase(databasePath);
  assert.equal(db.getOrderBySessionId('cs_persisted').status, 'paid');
  assert.equal(db.getActiveGrantForOrder(orderId).id, grantId);
  db.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});
