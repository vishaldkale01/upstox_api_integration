'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const { createClient } = require('redis');
const { RedisStore } = require('connect-redis');
const { readConfig } = require('./security/config');

async function start() {
  const config = readConfig();
  const redis = createClient({ url: process.env.REDIS_URL || 'redis://127.0.0.1:6379', RESP: 2 });
  let lastRedisError;
  redis.on('error', error => {
    const message = error instanceof Error ? error.message : String(error);
    if (message !== lastRedisError) {
      console.error('Session store unavailable:', message);
      lastRedisError = message;
    }
  });
  let dependency = 'Redis';
  try {
    await redis.connect();
    dependency = 'MongoDB';
    await mongoose.connect(process.env.MONGO_DB, { serverSelectionTimeoutMS: 5000 });
    dependency = 'MongoDB index setup';
    await Promise.all([
      mongoose.connection.db.collection('trades').createIndex({ status: 1, created_at: -1 }),
      mongoose.connection.db.collection('trades').createIndex({ 'entry.signal_id': 1 }),
      mongoose.connection.db.collection('signals').createIndex({ timestamp: -1 })
    ]);
    dependency = 'application setup';
    require('./loaders/module')();
    const app = require('./loaders/express')({ config, store: new RedisStore({ client: redis, prefix: 'tradestack:session:' }) });
    const server = app.listen(Number(process.env.PORT || 3000), process.env.HOST || '127.0.0.1', () => console.log('TradeStack gateway started'));
    async function close() { server.close(); await mongoose.disconnect(); await redis.quit(); }
    process.once('SIGTERM', close);
    process.once('SIGINT', close);
    return server;
  } catch (_) {
    if (redis.isOpen) await redis.quit();
    await mongoose.disconnect();
    throw new Error(`${dependency} dependency unavailable`);
  }
}
if (require.main === module) start().catch((error) => {
  console.error('Startup failed. Check environment, MongoDB and Redis configuration.');
  if (error instanceof Error && error.message) console.error(error.message);
  else console.error(error);
  process.exitCode = 1;
});
module.exports = { start };
