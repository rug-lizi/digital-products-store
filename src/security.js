'use strict';

const crypto = require('crypto');

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function makeDownloadToken(grant, secret) {
  const payload = `${grant.id}.${grant.order_id}.${grant.expires_at}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${grant.id}.${signature}`;
}

function safePasswordEquals(actual, expected) {
  const actualHash = crypto.createHash('sha256').update(String(actual)).digest();
  const expectedHash = crypto.createHash('sha256').update(String(expected)).digest();
  return crypto.timingSafeEqual(actualHash, expectedHash);
}

function parseCookies(header = '') {
  const cookies = {};
  for (const pair of header.split(';')) {
    const index = pair.indexOf('=');
    if (index < 0) continue;
    const key = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

function adminCookie(token, maxAgeSeconds, secure = true) {
  const attributes = [
    `admin_session=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${maxAgeSeconds}`
  ];
  if (secure) attributes.push('Secure');
  return attributes.join('; ');
}

function clearAdminCookie(secure = true) {
  const attributes = [
    'admin_session=',
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    'Max-Age=0'
  ];
  if (secure) attributes.push('Secure');
  return attributes.join('; ');
}

module.exports = {
  randomToken,
  hashToken,
  makeDownloadToken,
  safePasswordEquals,
  parseCookies,
  adminCookie,
  clearAdminCookie
};
