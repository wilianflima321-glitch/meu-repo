import { useCallback, useEffect, useMemo, useState } from 'react';

import { BackupManager } from './backup-system';
import type { BackupMetadata, BackupType, FileVersion, RecoveryOptions } from './backup-system.types';

export function useBackups(projectId?: string) {
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const manager = useMemo(() => BackupManager.getInstance(), []);

  const refreshBackups = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const list = await manager.listBackups(userId, { projectId });
      setBackups(list);
    } finally {
      setLoading(false);
    }
  }, [manager, projectId]);

  const createBackup = useCallback(async (
    userId: string,
    type: BackupType,
    options?: Parameters<typeof manager.createBackup>[2]
  ) => {
    const backup = await manager.createBackup(userId, type, { ...options, projectId });
    setBackups((prev) => [backup, ...prev]);
    return backup;
  }, [manager, projectId]);

  const restore = useCallback(async (
    backupId: string,
    options: RecoveryOptions
  ) => {
    return manager.restore(backupId, options);
  }, [manager]);

  return {
    backups,
    loading,
    refreshBackups,
    createBackup,
    restore,
  };
}

export function useFileVersions(fileId: string) {
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const manager = useMemo(() => BackupManager.getInstance(), []);

  useEffect(() => {
    setVersions(manager.getFileVersions(fileId));
  }, [fileId, manager]);

  const saveVersion = useCallback(async (
    content: string,
    options?: Parameters<typeof manager.saveFileVersion>[2]
  ) => {
    const version = await manager.saveFileVersion(fileId, content, options);
    setVersions(manager.getFileVersions(fileId));
    return version;
  }, [fileId, manager]);

  const restoreVersion = useCallback(async (versionId: string) => {
    await manager.restoreFileVersion(fileId, versionId);
    setVersions(manager.getFileVersions(fileId));
  }, [fileId, manager]);

  return {
    versions,
    saveVersion,
    restoreVersion,
    getContent: manager.getVersionContent.bind(manager),
  };
}
