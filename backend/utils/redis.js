const Redis = require('ioredis');
const { logger } = require('./logger');

// ── Redis client singleton ─────────────────────────────────────
// Usage: const { getRedisClient } = require('./redis');
//        await getRedisClient().set('key', 'value', 'EX', 60);
//
// Requires REDIS_URL in .env, e.g.:
//   REDIS_URL=redis://localhost:6379
//   REDIS_URL=redis://:password@host:6379
//   REDIS_URL=rediss://host:6380  (TLS)
//
// If Redis is unavailable the app still starts — operations that
// depend on Redis (token blacklist) fail open with a warning log.

let client = null;
let stubWarnedOnce = false;

function getRedisClient() {
  if (client) return client;

  const url = process.env.REDIS_URL;
  if (!url) {
    if (!stubWarnedOnce) {
      logger.warn('REDIS_URL not set — Redis features (token blacklist) will be degraded');
      stubWarnedOnce = true;
    }
    return createStub();
  }

  client = new Redis(url, {
    // Retry up to 3 times with increasing delay, then stop
    retryStrategy: (times) => {
      if (times > 3) {
        logger.error('Redis retry limit reached — giving up');
        return null; // Stop retrying
      }
      return Math.min(times * 200, 1000);
    },
    enableOfflineQueue:       false, // Don't queue commands when disconnected
    lazyConnect:              false,
    connectTimeout:           5000,
    maxRetriesPerRequest:     1,
  });

  client.on('connect',      ()    => logger.success('Redis connected'));
  client.on('ready',        ()    => logger.success('Redis ready'));
  client.on('error',        (err) => logger.error('Redis error', err.message));
  client.on('close',        ()    => logger.warn('Redis connection closed'));
  client.on('reconnecting', ()    => logger.info('Redis reconnecting...'));
  client.on('end',          ()    => {
    logger.warn('Redis connection ended — falling back to stub');
    client = null; // Reset so next call gets a fresh attempt
  });

  return client;
}

// ── No-op stub (Redis unavailable) ────────────────────────────
// Returns a minimal object that satisfies the get/set/del calls
// used in auth.js — all operations resolve as if nothing is stored.
function createStub() {
  return {
    get:  async () => null,
    set:  async () => 'OK',
    del:  async () => 0,
    ping: async () => 'PONG',
  };
}

// ── Graceful shutdown ──────────────────────────────────────────
async function closeRedis() {
  if (client) {
    await client.quit();
    client = null;
    logger.info('Redis connection closed gracefully');
  }
}

const BLACKLIST_PREFIX = 'blacklist:';

async function isTokenBlacklisted(token) {
  try {
    const redis = getRedisClient();
    const result = await redis.get(`${BLACKLIST_PREFIX}${token}`);
    return result !== null;
  } catch (err) {
    logger.warn('Redis blacklist read failed — allowing token through', err.message);
    return false;
  }
}

module.exports = { getRedisClient, closeRedis, isTokenBlacklisted };