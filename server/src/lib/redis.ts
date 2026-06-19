import Redis, { type RedisOptions } from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times: number) {
    if (times > 3) return null;
    return Math.min(times * 200, 2000);
  },
  lazyConnect: true,
});

redis.on('error', (err: Error) => {
  if (process.env.NODE_ENV !== 'test') {
    console.warn('[Redis] 连接错误:', err.message);
  }
});

let connected = false;

export async function connectRedis() {
  if (!connected) {
    try {
      await redis.connect();
      connected = true;
      console.log('[Redis] 已连接');
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'test') {
        console.warn('[Redis] 连接失败，将跳过缓存:', err.message);
      }
    }
  }
  return redis;
}

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    if (!connected) return null;
    const val = await redis.get(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

export async function setCache(key: string, value: any, ttlSeconds: number = 30) {
  try {
    if (!connected) return;
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // 缓存写入失败不应影响主流程
  }
}

export async function delCache(pattern: string) {
  try {
    if (!connected) return;
    // 用 SCAN 替代 KEYS，避免大键集阻塞
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [nextCursor, found] = await redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;
      keys.push(...found);
      // 防止无限循环：单次最多扫描 10000 个键
      if (keys.length > 10000) break;
    } while (cursor !== '0');
    if (keys.length > 0) await redis.del(...keys);
  } catch {
    // 静默失败
  }
}

export { redis };
