import { logger } from '@/lib/observability/logger';
import type { BackupMetadata, BackupSchedule, FileVersion, RecoveryOptions } from './backup-system.types';
import {
  generateBackupChecksum,
  generateBackupEncryptionKey,
} from './backup-system.utils';

export async function processBackupRecord(
  backup: BackupMetadata,
  options?: { compress?: boolean; encrypt?: boolean }
): Promise<void> {
  backup.status = 'in_progress';

  try {
    const data = (await collectBackupData(backup.userId, backup.projectId)) as {
      files?: unknown[];
      assets?: unknown[];
      projects?: Array<{ id: string }>;
    };

    const jsonData = JSON.stringify(data);
    backup.size = new Blob([jsonData]).size;
    backup.contents.files = data.files?.length || 0;
    backup.contents.assets = data.assets?.length || 0;
    backup.contents.projects = data.projects?.map((p: { id: string }) => p.id) || [];
    backup.compressedSize = options?.compress ? Math.floor(backup.size * 0.3) : backup.size;
    backup.checksum = await generateBackupChecksum(jsonData);

    if (options?.encrypt) {
      backup.encryptionKey = generateBackupEncryptionKey();
    }

    await saveBackupData(backup.id, data, options);

    backup.status = 'completed';
    backup.completedAt = new Date();
  } catch (error) {
    backup.status = 'failed';
    logger.error('[Backup] Failed:', error);
    throw error;
  }
}

async function collectBackupData(userId: string, projectId?: string): Promise<Record<string, unknown>> {
  const response = await fetch(`/api/backup/collect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, projectId }),
  });

  if (!response.ok) {
    throw new Error('Failed to collect backup data');
  }

  return response.json();
}

async function saveBackupData(
  backupId: string,
  data: Record<string, unknown>,
  options?: { compress?: boolean; encrypt?: boolean }
): Promise<void> {
  await fetch(`/api/backup/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ backupId, data, options }),
  });
}

export async function downloadBackupData(backupId: string): Promise<Record<string, unknown>> {
  const response = await fetch(`/api/backup/${backupId}/download`);
  if (!response.ok) {
    throw new Error('Failed to download backup data');
  }
  return response.json();
}

export async function applyBackupRestoration(
  data: Record<string, unknown>,
  options: RecoveryOptions
): Promise<{ success: boolean; restoredItems: number; errors: string[] }> {
  const errors: string[] = [];
  let restoredItems = 0;

  try {
    const response = await fetch('/api/backup/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, options }),
    });

    if (!response.ok) {
      throw new Error('Restore API failed');
    }

    const result = await response.json();
    restoredItems = result.restoredItems || 0;
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return {
    success: errors.length === 0,
    restoredItems,
    errors,
  };
}

export function calculateFileVersionDiff(
  oldContent: string,
  newContent: string
): FileVersion['changes'] {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');

  let added = 0;
  let removed = 0;

  const maxLen = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLen; i++) {
    if (oldLines[i] !== newLines[i]) {
      if (i >= oldLines.length) {
        added++;
      } else if (i >= newLines.length) {
        removed++;
      } else {
        added++;
        removed++;
      }
    }
  }

  return {
    linesAdded: added,
    linesRemoved: removed,
  };
}

export function calculateNextBackupRun(config: Partial<BackupSchedule>): Date {
  const now = new Date();
  const next = new Date(now);

  switch (config.frequency) {
    case 'hourly':
      next.setHours(next.getHours() + 1, 0, 0, 0);
      break;
    case 'daily':
      if (config.time) {
        const [hours, minutes] = config.time.split(':').map(Number);
        next.setHours(hours, minutes, 0, 0);
        if (next <= now) next.setDate(next.getDate() + 1);
      } else {
        next.setDate(next.getDate() + 1);
      }
      break;
    case 'weekly':
      if (config.dayOfWeek !== undefined) {
        next.setDate(next.getDate() + ((7 + config.dayOfWeek - next.getDay()) % 7 || 7));
      }
      break;
    case 'monthly':
      if (config.dayOfMonth) {
        next.setMonth(next.getMonth() + 1, config.dayOfMonth);
      }
      break;
  }

  return next;
}
