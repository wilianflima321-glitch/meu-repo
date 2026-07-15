/**
 * @deprecated Block 6G.1 — DO NOT RUN as the UsageBucket flush path.
 * Canonical flush: `flushMeteringBufferForUser` in `lib/metering-redis-buffer.ts`.
 * Kept only so historical stream keys are not silently reconnected.
 */
import { Redis } from 'ioredis';
import { createComponentLogger } from '../observability/logger';
import { prisma } from '../db';

const log = createComponentLogger('worker.billing-sync');
const BILLING_STREAM_KEY = 'aethel:billing:tokens_stream';
const CONSUMER_GROUP = 'aethel-billing-sync';
const CONSUMER_NAME = `worker-${process.pid}`;

let isShuttingDown = false;
let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  try {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    return redis;
  } catch (error) {
    log.error('billing_sync.redis_connect_failed', error);
    return null;
  }
}

async function ensureConsumerGroup(client: Redis) {
  try {
    await client.xgroup('CREATE', BILLING_STREAM_KEY, CONSUMER_GROUP, '0', 'MKSTREAM');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('BUSYGROUP')) {
      throw error;
    }
  }
}

function monthWindow(date: Date): { window: string; windowStart: Date; windowEnd: Date } {
  const windowStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const windowEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return {
    window: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
    windowStart,
    windowEnd,
  };
}

async function syncBatch(events: Array<{ userId: string; tokens: number }>) {
  const byUser = new Map<string, number>();
  for (const event of events) {
    byUser.set(event.userId, (byUser.get(event.userId) || 0) + event.tokens);
  }

  const now = new Date();
  const { window, windowStart, windowEnd } = monthWindow(now);

  for (const [userId, tokens] of byUser.entries()) {
    await prisma.usageBucket.upsert({
      where: {
        userId_window_windowStart: { userId, window, windowStart },
      },
      create: {
        userId,
        window,
        windowStart,
        windowEnd,
        requests: 1,
        tokens,
      },
      update: {
        requests: { increment: 1 },
        tokens: { increment: tokens },
      },
    });
  }
}

async function syncLoop() {
  log.info('billing_sync.worker_started');
  const client = getRedis();
  if (!client) {
    log.warn('billing_sync.redis_unavailable');
    return;
  }

  await ensureConsumerGroup(client);

  while (!isShuttingDown) {
    try {
      const results = await client.xreadgroup(
        'GROUP',
        CONSUMER_GROUP,
        CONSUMER_NAME,
        'COUNT',
        50,
        'BLOCK',
        5000,
        'STREAMS',
        BILLING_STREAM_KEY,
        '>',
      );

      if (!results) continue;

      type StreamEntry = [string, string[]];
      type StreamResult = [string, StreamEntry[]];
      const streamResults = results as StreamResult[];

      const events: Array<{ id: string; userId: string; tokens: number }> = [];

      for (const [, entries] of streamResults) {
        for (const entry of entries) {
          const id = entry[0];
          const fields = entry[1] as string[];
          const map: Record<string, string> = {};
          for (let i = 0; i < fields.length; i += 2) {
            map[fields[i]] = fields[i + 1];
          }
          const userId = map.userId;
          const tokensUsed = Number(map.tokensUsed || '0');
          if (userId && tokensUsed > 0) {
            events.push({ id, userId, tokens: tokensUsed });
          }
        }
      }

      if (events.length > 0) {
        await syncBatch(events.map((e) => ({ userId: e.userId, tokens: e.tokens })));
        for (const event of events) {
          await client.xack(BILLING_STREAM_KEY, CONSUMER_GROUP, event.id);
          const cacheKey = `aethel:billing:balance:${event.userId}`;
          await client.hincrby(cacheKey, 'tokens_used_uncommitted', -event.tokens);
        }
        log.info('billing_sync.batch_committed', { count: events.length });
      }
    } catch (error) {
      log.error('billing_sync.loop_error', error);
      await new Promise((r) => setTimeout(r, 10000));
    }
  }

  log.info('billing_sync.worker_stopped');
}

export function startBillingSyncWorker() {
  syncLoop().catch((e) => log.error('billing_sync.fatal', e));
}

export function stopBillingSyncWorker() {
  isShuttingDown = true;
  redis?.disconnect();
}

if (require.main === module) {
  startBillingSyncWorker();

  process.on('SIGTERM', () => {
    log.info('billing_sync.sigterm');
    stopBillingSyncWorker();
  });

  process.on('SIGINT', () => {
    log.info('billing_sync.sigint');
    stopBillingSyncWorker();
  });
}
