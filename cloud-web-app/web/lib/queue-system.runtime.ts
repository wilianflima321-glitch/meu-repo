import { createComponentLogger } from '@/lib/observability/logger'
import type { BullMQRuntime, RedisConnectionAdapter, RedisConstructor } from './queue-system.types';

const log = createComponentLogger('queue-system/runtime')

let BullMQ: BullMQRuntime | null = null;
let IORedis: RedisConstructor | null = null;
let loadAttempted = false;
let redisConnection: RedisConnectionAdapter | null = null;

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
};

export async function loadQueueDependencies(): Promise<BullMQRuntime | null> {
  if (loadAttempted) return BullMQ;
  loadAttempted = true;

  try {
    BullMQ = (await eval('import("bullmq")')) as BullMQRuntime;
    const redisModule = (await eval('import("ioredis")')) as { default?: RedisConstructor } | RedisConstructor;
    IORedis = typeof redisModule === 'function' ? redisModule : redisModule.default || null;
    return BullMQ;
  } catch {
    log.warn('[QueueSystem] bullmq/ioredis not installed. Queue features disabled.');
    return null;
  }
}

export async function getQueueRedisConnection(): Promise<RedisConnectionAdapter | null> {
  const bullmq = await loadQueueDependencies();
  if (!bullmq || !IORedis) return null;

  if (!redisConnection) {
    redisConnection = new IORedis(redisConfig);

    redisConnection.on('error', (error: unknown) => {
      log.error('[QueueSystem] Redis connection error:', error);
    });

    redisConnection.on('connect', () => {
      log.info('[QueueSystem] Redis connected');
    });
  }
  return redisConnection;
}

export async function closeQueueRedisConnection(): Promise<void> {
  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
  }
}
