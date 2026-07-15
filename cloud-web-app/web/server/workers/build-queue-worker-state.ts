import { prisma } from '../../lib/db';
import type { BuildQueueMessage, ExportState, RedisClient } from './build-queue-worker-contracts';
import { appendLog, nowIso, parseJsonObject } from './build-queue-worker.utils';

export async function updateExportState(
  redis: RedisClient,
  exportId: string,
  patch: Partial<Record<string, unknown>> & { status?: string; progress?: number; currentStep?: string; error?: string }
) {
  const key = `export:${exportId}`;
  let existing: ExportState | null = null;
  try {
    const raw = await redis.get(key);
    if (raw) existing = parseJsonObject(raw);
  } catch {
    // State writes must not hide the worker's primary failure.
  }

  const payload = {
    ...(existing || {}),
    ...patch,
    id: exportId,
  };

  if (patch.currentStep) {
    payload.logs = appendLog(existing, patch.currentStep);
  }

  await redis.set(key, JSON.stringify(payload), 'EX', 86400);
  return payload;
}

export async function markExportFailed(
  redis: RedisClient,
  message: BuildQueueMessage,
  reason: string
): Promise<void> {
  if (!message.exportId) return;

  const key = `export:${message.exportId}`;
  let existing: ExportState | null = null;
  try {
    const raw = await redis.get(key);
    if (raw) existing = parseJsonObject(raw);
  } catch {
    // Keep going so the DB status can still be updated.
  }

  const payload = {
    ...(existing || {}),
    id: message.exportId,
    projectId: message.projectId,
    userId: message.userId,
    platform: message.platform,
    configuration: message.configuration,
    status: 'failed',
    progress: existing?.progress ?? 0,
    currentStep: 'Failed',
    error: reason,
    completedAt: nowIso(),
  };

  payload.logs = appendLog(existing, `Failed: ${reason}`);

  await redis.set(key, JSON.stringify(payload), 'EX', 86400);

  try {
    await prisma.exportJob.update({
      where: { id: message.exportId },
      data: {
        status: 'failed',
        completedAt: new Date(),
      },
    });
  } catch {
    // The row may not exist yet, or the local schema may differ in dev.
  }
}
