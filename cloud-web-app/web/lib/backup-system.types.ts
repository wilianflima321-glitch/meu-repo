// Backup and recovery contracts shared by manager and React hooks.

export type BackupType = 'full' | 'incremental' | 'differential' | 'snapshot';
export type BackupStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'expired';
export type RecoveryMode = 'full' | 'selective' | 'point_in_time';

export interface BackupMetadata {
  id: string;
  userId: string;
  projectId?: string;
  type: BackupType;
  status: BackupStatus;
  size: number;
  compressedSize: number;
  checksum: string;
  encryptionKey?: string;
  version: number;
  parentBackupId?: string;
  createdAt: Date;
  completedAt?: Date;
  expiresAt: Date;
  description?: string;
  tags?: string[];
  contents: BackupContents;
}

export interface BackupContents {
  projects: string[];
  files: number;
  assets: number;
  settings: boolean;
  preferences: boolean;
  workflows: boolean;
}

export interface BackupSchedule {
  id: string;
  userId: string;
  projectId?: string;
  type: BackupType;
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  time?: string; // HH:MM
  dayOfWeek?: number; // 0-6
  dayOfMonth?: number; // 1-31
  retention: number; // Dias para manter
  enabled: boolean;
  lastRun?: Date;
  nextRun: Date;
}

export interface FileVersion {
  id: string;
  fileId: string;
  version: number;
  size: number;
  checksum: string;
  createdAt: Date;
  createdBy: string;
  comment?: string;
  changes?: {
    linesAdded: number;
    linesRemoved: number;
    diff?: string;
  };
}

export interface RecoveryPoint {
  id: string;
  backupId: string;
  projectId: string;
  timestamp: Date;
  description: string;
  type: 'auto' | 'manual' | 'pre_deploy';
}

export interface RecoveryOptions {
  mode: RecoveryMode;
  targetTime?: Date;
  includeProjects?: string[];
  includeFiles?: string[];
  excludePatterns?: string[];
  overwrite: boolean;
  validateFirst: boolean;
}
