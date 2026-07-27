'use strict';

require('dotenv').config();

const http = require('http');
const Stripe = require('stripe');
const { loadConfig } = require('./src/config');
const { StoreDatabase } = require('./src/database');
const { createApp } = require('./src/app');

const config = loadConfig();
const db = new StoreDatabase(config.databasePath);
const stripe = new Stripe(config.stripeSecretKey);
const server = http.createServer(createApp({ config, db, stripe }));

server.listen(config.port, config.host, () => {
  console.log(`Digital store listening on http://${config.host}:${config.port}`);
  console.log(`Loaded ${config.products.size} products`);
});

function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
