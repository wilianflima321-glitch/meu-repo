import { prisma } from '../../lib/db';
import { createComponentLogger } from '@/lib/observability/logger';
import {
  DELAYED_QUEUE,
  MAX_ATTEMPTS,
  PROCESSING_QUEUE,
  PROCESSING_TIMEOUT_MS,
  PROCESSING_TS_PREFIX,
  REAPER_INTERVAL_MS,
  SOURCE_QUEUE,
  type BuildQueueMessage,
  type RedisClient,
} from './build-queue-worker-contracts';
import { backoffMs, parseJsonObject } from './build-queue-worker.utils';
import { markExportFailed, updateExportState } from './build-queue-worker-state';

const log = createComponentLogger('workers/build-queue-worker-queue');

async function getExportAttempts(redis: RedisClient, exportId: string): Promise<number> {
  try {
    const raw = await redis.get(`export:${exportId}`);
    if (!raw) return 0;
    const parsed = parseJsonObject(raw);
    return typeof parsed?.attempts === 'number' ? parsed.attempts : 0;
  } catch {
    return 0;
  }
}

export async function scheduleRetry(redis: RedisClient, msg: BuildQueueMessage, rawValue: string, reason: string) {
  if (!msg.exportId) return;

  const attempts = (await getExportAttempts(redis, msg.exportId)) + 1;
  const delayMs = backoffMs(attempts);
  const eta = new Date(Date.now() + delayMs);

  if (attempts >= MAX_ATTEMPTS) {
    await markExportFailed(redis, msg, `Exhausted retries (${attempts}/${MAX_ATTEMPTS}): ${reason}`);
    return;
  }

  await prisma.exportJob.update({
    where: { id: msg.exportId },
    data: {
      status: 'queued',
      progress: 0,
      currentStep: `Retry scheduled (attempt ${attempts}/${MAX_ATTEMPTS})`,
      error: reason,
      startedAt: null,
      completedAt: null,
    },
  });

  await updateExportState(redis, msg.exportId, {
    status: 'queued',
    progress: 0,
    currentStep: `Retry scheduled (attempt ${attempts}/${MAX_ATTEMPTS}) in ${Math.round(delayMs / 1000)}s`,
    error: reason,
    attempts,
    retryAt: eta.toISOString(),
  });

  await redis.zadd(DELAYED_QUEUE, Date.now() + delayMs, rawValue);
}

export async function markProcessing(redis: RedisClient, msg: BuildQueueMessage) {
  if (!msg.exportId) return;
  await redis.set(`${PROCESSING_TS_PREFIX}${msg.exportId}`, `${Date.now()}`, 'PX', PROCESSING_TIMEOUT_MS * 4);
}

export async function clearProcessing(redis: RedisClient, msg: BuildQueueMessage) {
  if (!msg.exportId) return;
  await redis.del(`${PROCESSING_TS_PREFIX}${msg.exportId}`);
}

export async function drainDelayed(redis: RedisClient, max = 25) {
  const now = Date.now();
  const due: string[] = await redis.zrangebyscore(DELAYED_QUEUE, 0, now, 'LIMIT', 0, max);
  if (!Array.isArray(due) || due.length === 0) return 0;

  for (const raw of due) {
    try {
      const removed = await redis.zrem(DELAYED_QUEUE, raw);
      if (removed) {
        await redis.lpush(SOURCE_QUEUE, raw);
      }
    } catch {
      // Ignore a single delayed item and keep draining the queue.
    }
  }

  return due.length;
}

export async function reapProcessing(redis: RedisClient, maxScan = 50) {
  let items: string[] = [];
  try {
    items = await redis.lrange(PROCESSING_QUEUE, 0, maxScan - 1);
  } catch {
    return;
  }

  if (!Array.isArray(items) || items.length === 0) return;

  const now = Date.now();
  for (const raw of items) {
    let msg: BuildQueueMessage | null = null;
    try {
      msg = JSON.parse(raw);
    } catch {
      continue;
    }

    if (!msg?.exportId) continue;

    let startedAt = 0;
    try {
      const ts = await redis.get(`${PROCESSING_TS_PREFIX}${msg.exportId}`);
      startedAt = ts ? parseInt(ts, 10) : 0;
    } catch {
      startedAt = 0;
    }

    if (!startedAt || now - startedAt > PROCESSING_TIMEOUT_MS) {
      log.warn(`[build-queue-worker] Reaper: requeuing stuck job exportId=${msg.exportId}`);
      try {
        await updateExportState(redis, msg.exportId, {
          status: 'queued',
          currentStep: 'Requeued by reaper (processing timeout)',
        });
        await prisma.exportJob.update({
          where: { id: msg.exportId },
          data: {
            status: 'queued',
            currentStep: 'Requeued by reaper (processing timeout)',
            completedAt: null,
          },
        });
      } catch {
        // Continue to attempt queue recovery even if DB/state update fails.
      }

      try {
        await redis.lrem(PROCESSING_QUEUE, 1, raw);
        await redis.lpush(SOURCE_QUEUE, raw);
      } catch {
        // Leave the item in processing if Redis recovery fails.
      }

      try {
        await redis.del(`${PROCESSING_TS_PREFIX}${msg.exportId}`);
      } catch {
        // Timestamp cleanup is best-effort.
      }
    }
  }
}

export function shouldRunReaper(lastReaperAt: number) {
  return Date.now() - lastReaperAt > REAPER_INTERVAL_MS;
}
