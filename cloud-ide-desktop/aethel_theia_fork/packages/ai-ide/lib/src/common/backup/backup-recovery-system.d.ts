/**
 * Backup & Recovery System - Professional Auto-Save Infrastructure
 *
 * Sistema de backup e recuperação profissional para IDE de produção.
 * Inspirado em VS Code, JetBrains, Unreal Engine.
 * Suporta:
 * - Auto-save inteligente
 * - Recuperação de crashes
 * - Versionamento de arquivos
 * - Snapshots de projeto
 * - Backup incremental
 * - Recuperação de sessão
 * - Backup em nuvem
 */
type Event<T> = (listener: (e: T) => void) => {
    dispose: () => void;
};
/**
 * Backup type
 */
export declare enum BackupType {
    AutoSave = "auto-save",
    ManualSave = "manual-save",
    CrashRecovery = "crash-recovery",
    Snapshot = "snapshot",
    Incremental = "incremental",
    Full = "full",
    Cloud = "cloud"
}
/**
 * Backup status
 */
export declare enum BackupStatus {
    Pending = "pending",
    InProgress = "in-progress",
    Completed = "completed",
    Failed = "failed",
    Partial = "partial"
}
/**
 * Recovery status
 */
export declare enum RecoveryStatus {
    None = "none",
    Available = "available",
    Restored = "restored",
    Failed = "failed",
    Partial = "partial"
}
/**
 * Backup trigger
 */
export declare enum BackupTrigger {
    Timer = "timer",
    ContentChange = "content-change",
    FocusLost = "focus-lost",
    BeforeClose = "before-close",
    Manual = "manual",
    Scheduled = "scheduled",
    CrashDetected = "crash-detected"
}
/**
 * File backup metadata
 */
export interface FileBackup {
    id: string;
    uri: string;
    filename: string;
    content: string;
    contentHash: string;
    size: number;
    timestamp: number;
    type: BackupType;
    trigger: BackupTrigger;
    version: number;
    isDirty: boolean;
    encoding?: string;
    lineEnding?: 'LF' | 'CRLF';
    language?: string;
}
/**
 * Project snapshot
 */
export interface ProjectSnapshot {
    id: string;
    name: string;
    description?: string;
    timestamp: number;
    files: SnapshotFile[];
    metadata: {
        totalSize: number;
        fileCount: number;
        dirtyCount: number;
        openEditors: string[];
        activeEditor?: string;
        workspaceState?: Record<string, unknown>;
    };
}
/**
 * Snapshot file
 */
export interface SnapshotFile {
    uri: string;
    contentHash: string;
    size: number;
    isDirty: boolean;
    cursorPosition?: {
        line: number;
        column: number;
    };
    viewState?: unknown;
}
/**
 * Recovery session
 */
export interface RecoverySession {
    id: string;
    crashTimestamp: number;
    detectedTimestamp: number;
    status: RecoveryStatus;
    files: RecoverableFile[];
    workspaceState?: Record<string, unknown>;
}
/**
 * Recoverable file
 */
export interface RecoverableFile {
    uri: string;
    backupPath: string;
    originalHash?: string;
    backupHash: string;
    timestamp: number;
    isRecovered: boolean;
    conflictWith?: string;
}
/**
 * Backup config
 */
export interface BackupConfig {
    autoSaveEnabled: boolean;
    autoSaveDelayMs: number;
    autoSaveOnFocusLost: boolean;
    autoSaveOnWindowChange: boolean;
    maxBackupsPerFile: number;
    backupRetentionDays: number;
    backupLocation: string;
    snapshotEnabled: boolean;
    snapshotIntervalMinutes: number;
    maxSnapshots: number;
    cloudBackupEnabled: boolean;
    cloudSyncIntervalMinutes: number;
    cloudProvider?: string;
    crashRecoveryEnabled: boolean;
    heartbeatIntervalMs: number;
}
/**
 * Backup created event
 */
export interface BackupCreatedEvent {
    backup: FileBackup;
    previousVersion?: number;
}
/**
 * Backup restored event
 */
export interface BackupRestoredEvent {
    backup: FileBackup;
    targetUri: string;
}
/**
 * Crash detected event
 */
export interface CrashDetectedEvent {
    session: RecoverySession;
    recoverableFiles: number;
}
/**
 * Snapshot created event
 */
export interface SnapshotCreatedEvent {
    snapshot: ProjectSnapshot;
}
export declare class BackupRecoverySystem {
    private config;
    private readonly fileBackups;
    private readonly snapshots;
    private readonly pendingBackups;
    private sessionId;
    private lastHeartbeat;
    private heartbeatTimer;
    private snapshotTimer;
    private readonly dirtyFiles;
    private readonly onBackupCreatedEmitter;
    readonly onBackupCreated: Event<BackupCreatedEvent>;
    private readonly onBackupRestoredEmitter;
    readonly onBackupRestored: Event<BackupRestoredEvent>;
    private readonly onCrashDetectedEmitter;
    readonly onCrashDetected: Event<CrashDetectedEvent>;
    private readonly onSnapshotCreatedEmitter;
    readonly onSnapshotCreated: Event<SnapshotCreatedEvent>;
    private readonly onAutoSaveEmitter;
    readonly onAutoSave: Event<{
        uri: string;
        success: boolean;
    }>;
    private readonly onConfigChangedEmitter;
    readonly onConfigChanged: Event<BackupConfig>;
    constructor();
    /**
     * Initialize the backup system
     */
    private initialize;
    /**
     * Generate session ID
     */
    private generateSessionId;
    /**
     * Start heartbeat
     */
    private startHeartbeat;
    /**
     * Update heartbeat
     */
    private updateHeartbeat;
    /**
     * Start snapshot timer
     */
    private startSnapshotTimer;
    /**
     * Check for crash recovery
     */
    private checkForCrashRecovery;
    /**
     * Detect if previous session crashed
     */
    private detectCrash;
    /**
     * Update configuration
     */
    updateConfig(updates: Partial<BackupConfig>): void;
    /**
     * Get configuration
     */
    getConfig(): BackupConfig;
    /**
     * Mark file as dirty
     */
    markDirty(uri: string, content: string): void;
    /**
     * Mark file as saved
     */
    markSaved(uri: string): void;
    /**
     * Schedule auto-save
     */
    private scheduleAutoSave;
    /**
     * Cancel pending backup
     */
    private cancelPendingBackup;
    /**
     * Handle focus lost
     */
    handleFocusLost(): void;
    /**
     * Handle window change
     */
    handleWindowChange(): void;
    /**
     * Save all dirty files
     */
    private saveAllDirty;
    /**
     * Create backup
     */
    createBackup(uri: string, content: string, type?: BackupType, trigger?: BackupTrigger): FileBackup;
    /**
     * Get backups for file
     */
    getBackups(uri: string): FileBackup[];
    /**
     * Get latest backup
     */
    getLatestBackup(uri: string): FileBackup | undefined;
    /**
     * Get backup by version
     */
    getBackupByVersion(uri: string, version: number): FileBackup | undefined;
    /**
     * Get backup by ID
     */
    getBackupById(backupId: string): FileBackup | undefined;
    /**
     * Restore backup
     */
    restoreBackup(backupId: string): FileBackup | undefined;
    /**
     * Delete backup
     */
    deleteBackup(backupId: string): boolean;
    /**
     * Delete all backups for file
     */
    deleteBackupsForFile(uri: string): number;
    /**
     * Clean old backups
     */
    cleanOldBackups(): number;
    /**
     * Create project snapshot
     */
    createSnapshot(name?: string, description?: string): ProjectSnapshot;
    /**
     * Get all snapshots
     */
    getSnapshots(): ProjectSnapshot[];
    /**
     * Get snapshot by ID
     */
    getSnapshot(snapshotId: string): ProjectSnapshot | undefined;
    /**
     * Delete snapshot
     */
    deleteSnapshot(snapshotId: string): boolean;
    /**
     * Restore from snapshot
     */
    restoreFromSnapshot(snapshotId: string): {
        restored: string[];
        failed: string[];
    };
    /**
     * Trim old snapshots
     */
    private trimSnapshots;
    /**
     * Create recovery session from previous state
     */
    private createRecoverySession;
    /**
     * Recover file
     */
    recoverFile(uri: string): FileBackup | undefined;
    /**
     * Recover all files
     */
    recoverAll(session: RecoverySession): {
        recovered: string[];
        failed: string[];
    };
    /**
     * Dismiss recovery
     */
    dismissRecovery(session: RecoverySession): void;
    /**
     * Save session state
     */
    private saveSessionState;
    /**
     * Load previous session state
     */
    private loadPreviousSessionState;
    /**
     * Mark clean exit
     */
    markCleanExit(): void;
    /**
     * Persist backup
     */
    private persistBackup;
    /**
     * Persist snapshot
     */
    private persistSnapshot;
    /**
     * Persist session state
     */
    private persistSessionState;
    /**
     * Get backup path
     */
    private getBackupPath;
    /**
     * Enable cloud backup
     */
    enableCloudBackup(provider: string, config?: Record<string, unknown>): void;
    /**
     * Disable cloud backup
     */
    disableCloudBackup(): void;
    /**
     * Sync to cloud
     */
    syncToCloud(): Promise<{
        synced: number;
        failed: number;
    }>;
    /**
     * Restore from cloud
     */
    restoreFromCloud(timestamp?: number): Promise<{
        restored: number;
        failed: number;
    }>;
    /**
     * Get backup statistics
     */
    getStatistics(): {
        totalBackups: number;
        totalSnapshots: number;
        totalSize: number;
        dirtyFiles: number;
        oldestBackup: number | null;
        newestBackup: number | null;
        backupsByType: Record<BackupType, number>;
    };
    /**
     * Hash content
     */
    private hashContent;
    /**
     * Get filename from URI
     */
    private getFilename;
    /**
     * Dispose
     */
    dispose(): void;
}
export default BackupRecoverySystem;
