'use strict';

const fs = require('fs');
const path = require('path');

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function loadProducts(catalogPath, productRoot) {
  const parsed = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  if (!Array.isArray(parsed.products) || parsed.products.length === 0) {
    throw new Error('products.json must contain at least one product');
  }

  const products = new Map();
  for (const product of parsed.products) {
    if (!product.priceId || !product.file || !product.downloadName) {
      throw new Error('Each product requires priceId, file, and downloadName');
    }
    products.set(product.priceId, {
      ...product,
      absolutePath: path.resolve(productRoot, product.file)
    });
  }
  return products;
}

function loadConfig(env = process.env, rootDir = path.resolve(__dirname, '..')) {
  const nodeEnv = env.NODE_ENV || 'development';
  const config = {
    nodeEnv,
    host: env.HOST || '127.0.0.1',
    port: positiveInt(env.PORT, 3000),
    baseUrl: (env.BASE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, ''),
    stripeSecretKey: env.STRIPE_SECRET_KEY || '',
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET || '',
    adminPassword: env.ADMIN_PASSWORD || '',
    downloadSigningSecret: env.DOWNLOAD_SIGNING_SECRET || '',
    databasePath: path.resolve(env.DATABASE_PATH || path.join(rootDir, 'data', 'store.db')),
    productRoot: path.resolve(env.PRODUCT_ROOT || path.join(rootDir, 'products')),
    supportEmail: env.SUPPORT_EMAIL || 'support@example.com',
    adminSessionMs: positiveInt(env.ADMIN_SESSION_HOURS, 8) * 60 * 60 * 1000,
    downloadLinkMs: positiveInt(env.DOWNLOAD_LINK_HOURS, 72) * 60 * 60 * 1000,
    downloadMaxUses: positiveInt(env.DOWNLOAD_MAX_USES, 5),
    rootDir
  };

  config.products = loadProducts(path.join(rootDir, 'products.json'), config.productRoot);

  if (nodeEnv === 'production') {
    const missing = [];
    if (!config.stripeSecretKey.startsWith('sk_')) missing.push('STRIPE_SECRET_KEY');
    if (!config.stripeWebhookSecret.startsWith('whsec_')) missing.push('STRIPE_WEBHOOK_SECRET');
    if (config.adminPassword.length < 12) missing.push('ADMIN_PASSWORD (minimum 12 characters)');
    if (config.downloadSigningSecret.length < 32) {
      missing.push('DOWNLOAD_SIGNING_SECRET (minimum 32 characters)');
    }
    if (!config.baseUrl.startsWith('https://')) missing.push('BASE_URL (must use HTTPS)');
    if (missing.length > 0) {
      throw new Error(`Missing or unsafe production configuration: ${missing.join(', ')}`);
    }
  }

  return config;
}

module.exports = { loadConfig, loadProducts };
