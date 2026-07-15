import type { RedisClient, RedisConstructor } from './build-queue-worker-contracts';

function resolveRedisConstructor(moduleValue: unknown): RedisConstructor {
  if (typeof moduleValue === 'function') {
    return moduleValue as RedisConstructor;
  }

  if (moduleValue && typeof moduleValue === 'object' && 'default' in moduleValue) {
    const candidate = (moduleValue as { default?: unknown }).default;
    if (typeof candidate === 'function') {
      return candidate as RedisConstructor;
    }
  }

  throw new Error('Invalid ioredis module shape.');
}

export async function createRedisClient(): Promise<RedisClient> {
  let Redis: RedisConstructor;
  try {
    const moduleValue = await (eval('import("ioredis")') as Promise<unknown>);
    Redis = resolveRedisConstructor(moduleValue);
  } catch {
    throw new Error('Missing dependency: ioredis. Install with `npm i ioredis` (cloud-web-app/web).');
  }

  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    return new Redis(redisUrl, { maxRetriesPerRequest: null });
  }

  const host = process.env.REDIS_HOST || 'localhost';
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);
  const password = process.env.REDIS_PASSWORD || undefined;
  return new Redis({ host, port, password, maxRetriesPerRequest: null });
}
