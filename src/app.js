'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  randomToken,
  hashToken,
  makeDownloadToken,
  safePasswordEquals,
  parseCookies,
  adminCookie,
  clearAdminCookie
} = require('./security');

const MAX_BODY_BYTES = 1024 * 1024;
const ADMIN_COOKIE = 'admin_session';

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Request body too large'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function json(res, statusCode, value, extraHeaders = {}) {
  const body = JSON.stringify(value);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    ...extraHeaders
  });
  res.end(body);
}

function html(res, statusCode, value) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(value),
    'Cache-Control': 'no-store'
  });
  res.end(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function clientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.socket.remoteAddress
    || 'unknown';
}

function securityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

function createApp({ config, db, stripe, now = () => Date.now() }) {
  const loginAttempts = new Map();
  const productionCookie = config.baseUrl.startsWith('https://');

  function isAdmin(req) {
    const token = parseCookies(req.headers.cookie)[ADMIN_COOKIE];
    return Boolean(token && db.hasValidAdminSession(hashToken(token), now()));
  }

  function requireAdmin(req, res) {
    if (isAdmin(req)) return true;
    json(res, 401, { error: 'Unauthorized' });
    return false;
  }

  function loginAllowed(ip) {
    const entry = loginAttempts.get(ip);
    if (!entry || entry.resetAt <= now()) {
      loginAttempts.delete(ip);
      return true;
    }
    return entry.failures < 5;
  }

  function recordLoginFailure(ip) {
    const current = loginAttempts.get(ip);
    if (!current || current.resetAt <= now()) {
      loginAttempts.set(ip, { failures: 1, resetAt: now() + 15 * 60 * 1000 });
      return;
    }
    current.failures += 1;
  }

  function orderStatusPage(sessionId) {
    const safeSessionId = escapeHtml(sessionId || '');
    const safeSupport = escapeHtml(config.supportEmail);
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Your download — Adam Li Digital</title>
  <style>
    body{margin:0;background:#0a0a0a;color:#e5e5e5;font-family:system-ui,-apple-system,sans-serif;display:grid;place-items:center;min-height:100vh}
    main{width:min(560px,calc(100% - 40px));background:#141414;border:1px solid #292929;border-radius:18px;padding:36px;text-align:center}
    h1{margin-top:0}p{color:#aaa}.button{display:inline-block;margin-top:18px;padding:12px 20px;border-radius:10px;background:#6366f1;color:white;text-decoration:none;font-weight:700}
    .error{color:#f87171}
  </style>
</head>
<body>
  <main>
    <h1 id="title">Confirming your payment…</h1>
    <p id="message">This normally takes only a few seconds. You can keep this page open.</p>
    <div id="action"></div>
    <p>If you need help, contact <a href="mailto:${safeSupport}">${safeSupport}</a>.</p>
  </main>
  <script>
    const sessionId = ${JSON.stringify(safeSessionId)};
    let attempts = 0;
    async function check() {
      attempts += 1;
      const response = await fetch('/api/order-status?session_id=' + encodeURIComponent(sessionId), { cache: 'no-store' });
      const data = await response.json();
      if (data.status === 'paid' && data.downloadUrl) {
        document.getElementById('title').textContent = 'Payment confirmed';
        document.getElementById('message').textContent = 'Your secure download is ready. The link has limited time and uses.';
        document.getElementById('action').innerHTML = '<a class="button" href="' + data.downloadUrl + '">Download product</a>';
        return;
      }
      if (data.status === 'expired' || data.status === 'exhausted' || data.status === 'failed' || response.status >= 400) {
        document.getElementById('title').textContent = data.status === 'expired' ? 'Download link expired' : data.status === 'exhausted' ? 'Download limit reached' : 'We could not confirm the order';
        document.getElementById('title').className = 'error';
        document.getElementById('message').textContent = data.message || 'Please contact support with your payment receipt.';
        return;
      }
      if (attempts < 20) {
        setTimeout(check, 2000);
      } else {
        document.getElementById('message').textContent = 'Payment confirmation is taking longer than expected. Refresh this page in a minute.';
      }
    }
    check();
  </script>
</body>
</html>`;
  }

  return async function handler(req, res) {
    securityHeaders(res);
    const requestUrl = new URL(req.url, config.baseUrl);
    const pathname = requestUrl.pathname;
    const ip = clientIp(req);

    try {
      if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
        db.recordEvent({ type: 'page_view', ip, now: now() });
        const body = fs.readFileSync(path.join(config.rootDir, 'index.html'), 'utf8');
        html(res, 200, body);
        return;
      }

      if (req.method === 'GET' && pathname === '/admin') {
        const body = fs.readFileSync(path.join(config.rootDir, 'admin.html'), 'utf8');
        html(res, 200, body);
        return;
      }

      if (req.method === 'POST' && pathname === '/api/admin/login') {
        if (!loginAllowed(ip)) {
          json(res, 429, { error: 'Too many login attempts. Try again later.' }, { 'Retry-After': '900' });
          return;
        }
        const body = JSON.parse((await readRawBody(req)).toString('utf8'));
        if (!safePasswordEquals(body.password || '', config.adminPassword)) {
          recordLoginFailure(ip);
          json(res, 401, { error: 'Invalid password' });
          return;
        }

        loginAttempts.delete(ip);
        const token = randomToken();
        const issuedAt = now();
        db.purgeExpired(issuedAt);
        db.createAdminSession(hashToken(token), issuedAt, issuedAt + config.adminSessionMs);
        json(res, 200, { ok: true }, {
          'Set-Cookie': adminCookie(token, Math.floor(config.adminSessionMs / 1000), productionCookie)
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/admin/logout') {
        const token = parseCookies(req.headers.cookie)[ADMIN_COOKIE];
        if (token) db.deleteAdminSession(hashToken(token));
        json(res, 200, { ok: true }, { 'Set-Cookie': clearAdminCookie(productionCookie) });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/admin/stats') {
        if (!requireAdmin(req, res)) return;
        json(res, 200, db.getStats(config.products));
        return;
      }

      if (req.method === 'POST' && pathname === '/api/checkout') {
        const body = JSON.parse((await readRawBody(req)).toString('utf8'));
        const product = config.products.get(body.priceId);
        if (!product) {
          json(res, 400, { error: 'Unknown product' });
          return;
        }

        const orderId = crypto.randomUUID();
        const createdAt = now();
        db.createOrder({ id: orderId, priceId: product.priceId, now: createdAt });
        db.recordEvent({ type: 'checkout_attempt', ip, priceId: product.priceId, orderId, now: createdAt });

        try {
          const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            line_items: [{ price: product.priceId, quantity: 1 }],
            client_reference_id: orderId,
            metadata: { order_id: orderId, price_id: product.priceId },
            success_url: `${config.baseUrl}/order-status?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${config.baseUrl}/`
          });
          db.attachStripeSession(orderId, session.id);
          json(res, 200, { url: session.url });
        } catch (error) {
          db.markOrderFailed(orderId);
          console.error('Stripe checkout creation failed:', error.message);
          json(res, 502, { error: 'Checkout is temporarily unavailable' });
        }
        return;
      }

      if (req.method === 'POST' && pathname === '/api/webhook') {
        const rawBody = await readRawBody(req);
        const signature = req.headers['stripe-signature'];
        let event;
        try {
          event = stripe.webhooks.constructEvent(rawBody, signature, config.stripeWebhookSecret);
        } catch (error) {
          console.warn('Rejected Stripe webhook:', error.message);
          json(res, 400, { error: 'Invalid Stripe signature' });
          return;
        }

        const eventNow = now();
        if (event.type === 'checkout.session.completed'
          || event.type === 'checkout.session.async_payment_succeeded') {
          const session = event.data.object;
          const orderId = session.metadata?.order_id || session.client_reference_id;
          const order = orderId ? db.getOrderById(orderId) : null;
          const paid = session.payment_status === 'paid'
            || session.payment_status === 'no_payment_required'
            || event.type === 'checkout.session.async_payment_succeeded';

          if (!order || session.metadata?.price_id !== order.price_id) {
            console.error(`Webhook ${event.id} did not match a known order`);
            json(res, 422, { error: 'Order mismatch' });
            return;
          }

          if (paid) {
            db.recordWebhookAndFulfill({
              eventId: event.id,
              eventType: event.type,
              orderId,
              session,
              now: eventNow
            });
          } else {
            db.recordWebhookEvent({ eventId: event.id, eventType: event.type, now: eventNow });
          }
        } else if (event.type === 'checkout.session.async_payment_failed') {
          const session = event.data.object;
          const orderId = session.metadata?.order_id || session.client_reference_id;
          if (orderId) {
            db.recordFailedWebhook({
              eventId: event.id,
              eventType: event.type,
              orderId,
              now: eventNow
            });
          } else {
            db.recordWebhookEvent({ eventId: event.id, eventType: event.type, now: eventNow });
          }
        } else if (event.type === 'charge.refunded') {
          const charge = event.data.object;
          const paymentIntentId = typeof charge.payment_intent === 'string'
            ? charge.payment_intent
            : charge.payment_intent?.id;
          if (paymentIntentId) {
            db.refundByPaymentIntent({
              eventId: event.id,
              eventType: event.type,
              paymentIntentId,
              now: eventNow
            });
          } else {
            db.recordWebhookEvent({ eventId: event.id, eventType: event.type, now: eventNow });
          }
        } else {
          db.recordWebhookEvent({ eventId: event.id, eventType: event.type, now: eventNow });
        }

        json(res, 200, { received: true });
        return;
      }

      if (req.method === 'GET' && pathname === '/order-status') {
        html(res, 200, orderStatusPage(requestUrl.searchParams.get('session_id')));
        return;
      }

      if (req.method === 'GET' && pathname === '/api/order-status') {
        const sessionId = requestUrl.searchParams.get('session_id');
        if (!sessionId || sessionId.length > 255) {
          json(res, 400, { status: 'invalid', message: 'Missing order reference.' });
          return;
        }
        const order = db.getOrderBySessionId(sessionId);
        if (!order) {
          json(res, 404, { status: 'pending', message: 'Order confirmation has not arrived yet.' });
          return;
        }
        if (order.status !== 'paid') {
          json(res, 200, { status: order.status });
          return;
        }

        const deadline = order.paid_at + config.downloadLinkMs;
        if (now() >= deadline) {
          json(res, 200, { status: 'expired', message: 'Please contact support to renew this download.' });
          return;
        }

        let grant = db.getActiveGrantForOrder(order.id);
        if (!grant) {
          const id = crypto.randomUUID();
          const unsignedGrant = { id, order_id: order.id, expires_at: deadline };
          const token = makeDownloadToken(unsignedGrant, config.downloadSigningSecret);
          db.createDownloadGrant({
            id,
            orderId: order.id,
            tokenHash: hashToken(token),
            now: now(),
            expiresAt: deadline,
            maxDownloads: config.downloadMaxUses
          });
          grant = db.getActiveGrantForOrder(order.id);
        }

        if (grant.download_count >= grant.max_downloads) {
          json(res, 200, {
            status: 'exhausted',
            message: 'This order has reached its download limit. Please contact support.'
          });
          return;
        }

        const token = makeDownloadToken(grant, config.downloadSigningSecret);
        json(res, 200, {
          status: 'paid',
          downloadUrl: `/download?token=${encodeURIComponent(token)}`,
          expiresAt: new Date(grant.expires_at).toISOString(),
          maxDownloads: grant.max_downloads
        });
        return;
      }

      if (req.method === 'GET' && pathname === '/download') {
        const token = requestUrl.searchParams.get('token');
        if (!token || token.length > 512) {
          html(res, 400, '<h1>Invalid download link</h1>');
          return;
        }

        const consumed = db.consumeDownload(hashToken(token), now());
        if (!consumed.ok) {
          html(
            res,
            consumed.reason === 'limit' ? 429 : 410,
            `<h1>Download unavailable</h1><p>The link is invalid, expired, revoked, or has reached its download limit. Contact ${escapeHtml(config.supportEmail)} for help.</p>`
          );
          return;
        }

        const product = config.products.get(consumed.priceId);
        if (!product || !fs.existsSync(product.absolutePath)) {
          console.error(`Product file missing for ${consumed.priceId}`);
          html(res, 500, '<h1>Product file temporarily unavailable</h1>');
          return;
        }

        const stat = fs.statSync(product.absolutePath);
        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${product.downloadName.replaceAll('"', '')}"`,
          'Content-Length': stat.size,
          'Cache-Control': 'private, no-store'
        });
        fs.createReadStream(product.absolutePath).pipe(res);
        return;
      }

      html(res, 404, '<h1>404 Not Found</h1>');
    } catch (error) {
      const status = error.statusCode || (error instanceof SyntaxError ? 400 : 500);
      if (status >= 500) console.error(error);
      if (!res.headersSent) json(res, status, { error: status === 500 ? 'Internal server error' : error.message });
      else res.destroy();
    }
  };
}

module.exports = { createApp };
