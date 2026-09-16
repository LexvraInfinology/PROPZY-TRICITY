import Redis, { type RedisOptions } from 'ioredis';

interface GlobalRedis {
  client: Redis | null;
  isConnected: boolean;
  hasWarned: boolean;
}

declare global {
  var redisGlobal: GlobalRedis | undefined;
}

const globalStore: GlobalRedis = globalThis.redisGlobal ?? {
  client: null,
  isConnected: false,
  hasWarned: false,
};

globalThis.redisGlobal = globalStore;

const DEFAULT_REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

/**
 * Initializes and returns a singleton Redis client instance with graceful error handling.
 */
export function getRedisClient(): Redis | null {
  if (globalStore.client) {
    return globalStore.client;
  }

  const redisUrl = process.env.REDIS_URL;

  // If REDIS_URL is explicitly disabled or empty and in development without a local server, skip gracefully
  if (!redisUrl && process.env.NODE_ENV === 'production') {
    if (!globalStore.hasWarned) {
      console.warn('⚠️ [Redis] REDIS_URL not provided. Running with in-memory fallback cache.');
      globalStore.hasWarned = true;
    }
    return null;
  }

  const targetUrl = redisUrl || DEFAULT_REDIS_URL;

  try {
    const options: RedisOptions = {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      commandTimeout: 3000,
      enableOfflineQueue: false,
      lazyConnect: true,
      retryStrategy(times) {
        if (times > 3) {
          // Stop retrying quickly to avoid blocking operations if Redis is unavailable
          return null;
        }
        return Math.min(times * 100, 1000);
      },
    };

    const client = new Redis(targetUrl, options);

    client.on('connect', () => {
      globalStore.isConnected = true;
      console.log('✅ [Redis] Connected successfully to Redis Cache');
    });

    client.on('ready', () => {
      globalStore.isConnected = true;
    });

    client.on('error', (err) => {
      globalStore.isConnected = false;
      if (!globalStore.hasWarned) {
        console.warn(`⚠️ [Redis] Connection warning (${err.message}). In-memory cache fallback is active.`);
        globalStore.hasWarned = true;
      }
    });

    client.on('close', () => {
      globalStore.isConnected = false;
    });

    // Initiate non-blocking connection
    client.connect().catch(() => {
      globalStore.isConnected = false;
    });

    globalStore.client = client;
    return client;
  } catch (err: any) {
    if (!globalStore.hasWarned) {
      console.warn('⚠️ [Redis] Initialization failed. Falling back to in-memory cache:', err.message);
      globalStore.hasWarned = true;
    }
    return null;
  }
}

/**
 * Checks whether Redis is currently reachable and ready.
 */
export function isRedisAvailable(): boolean {
  return Boolean(globalStore.client && globalStore.isConnected);
}

/**
 * Performs an active Redis PING health check.
 */
export async function checkRedisHealth(): Promise<{ ok: boolean; message: string }> {
  try {
    const client = getRedisClient();
    if (!client) {
      return { ok: false, message: 'Redis client not initialized (in-memory fallback active).' };
    }
    const pingRes = await client.ping();
    if (pingRes === 'PONG') {
      return { ok: true, message: 'Redis is online and responding to PING.' };
    }
    return { ok: false, message: `Unexpected Redis response: ${pingRes}` };
  } catch (err: any) {
    return { ok: false, message: `Redis healthcheck error: ${err?.message}` };
  }
}

/**
 * Gets and parses JSON value from Redis.
 */
export async function redisGet<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client || !globalStore.isConnected) return null;

  try {
    const data = await client.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

/**
 * Sets a JSON-serializable value in Redis with an optional TTL (in seconds).
 */
export async function redisSet(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
  const client = getRedisClient();
  if (!client || !globalStore.isConnected) return false;

  try {
    const serialized = JSON.stringify(value);
    if (ttlSeconds && ttlSeconds > 0) {
      await client.set(key, serialized, 'EX', ttlSeconds);
    } else {
      await client.set(key, serialized);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Deletes keys by exact name or wildcard pattern (e.g. "prop:*").
 * Uses SCAN for non-blocking iteration.
 */
export async function redisDel(patternOrKey: string): Promise<number> {
  const client = getRedisClient();
  if (!client || !globalStore.isConnected) return 0;

  try {
    if (!patternOrKey.includes('*')) {
      return await client.del(patternOrKey);
    }

    let cursor = '0';
    let totalDeleted = 0;

    do {
      const [nextCursor, keys] = await client.scan(cursor, 'MATCH', patternOrKey, 'COUNT', 100);
      cursor = nextCursor;

      if (keys.length > 0) {
        const deleted = await client.del(...keys);
        totalDeleted += deleted;
      }
    } while (cursor !== '0');

    return totalDeleted;
  } catch {
    return 0;
  }
}

/**
 * Flushes all keys in the current Redis database.
 */
export async function redisFlush(): Promise<boolean> {
  const client = getRedisClient();
  if (!client || !globalStore.isConnected) return false;

  try {
    await client.flushdb();
    return true;
  } catch {
    return false;
  }
}

/**
 * Tests connection latency via PING.
 */
export async function redisPing(): Promise<number | null> {
  const client = getRedisClient();
  if (!client) return null;

  try {
    if (client.status === 'wait') {
      await client.connect().catch(() => {});
    } else if (client.status === 'connecting') {
      await new Promise<void>((resolve) => {
        client.once('ready', () => resolve());
        client.once('error', () => resolve());
        setTimeout(() => resolve(), 3000);
      });
    }
    const start = performance.now();
    await client.ping();
    return Number((performance.now() - start).toFixed(2));
  } catch {
    return null;
  }
}
