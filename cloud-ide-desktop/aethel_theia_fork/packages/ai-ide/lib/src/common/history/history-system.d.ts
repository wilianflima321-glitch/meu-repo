/**
 * History System - Professional Undo/Redo Infrastructure
 *
 * Sistema de histórico profissional para operações de edição.
 * Inspirado em Unreal Engine, Photoshop, DaVinci Resolve.
 * Suporta:
 * - Undo/Redo multinível
 * - Operações compostas (transactions)
 * - Branching de histórico
 * - Snapshots e checkpoints
 * - Histórico por documento
 * - Merge de operações similares
 * - Histórico persistente
 * - Compressão de histórico
 */
type Event<T> = (listener: (e: T) => void) => {
    dispose: () => void;
};
/**
 * Operation type
 */
export declare enum OperationType {
    TextInsert = "text.insert",
    TextDelete = "text.delete",
    TextReplace = "text.replace",
    TextFormat = "text.format",
    FileCreate = "file.create",
    FileDelete = "file.delete",
    FileRename = "file.rename",
    FileMove = "file.move",
    SelectionChange = "selection.change",
    CursorMove = "cursor.move",
    ObjectCreate = "object.create",
    ObjectDelete = "object.delete",
    ObjectTransform = "object.transform",
    ObjectModify = "object.modify",
    ObjectGroup = "object.group",
    ObjectUngroup = "object.ungroup",
    ObjectParent = "object.parent",
    LayerCreate = "layer.create",
    LayerDelete = "layer.delete",
    LayerReorder = "layer.reorder",
    LayerVisibility = "layer.visibility",
    LayerLock = "layer.lock",
    LayerBlend = "layer.blend",
    TimelineClipAdd = "timeline.clip.add",
    TimelineClipRemove = "timeline.clip.remove",
    TimelineClipMove = "timeline.clip.move",
    TimelineClipTrim = "timeline.clip.trim",
    TimelineClipSplit = "timeline.clip.split",
    TimelineTrackAdd = "timeline.track.add",
    TimelineTrackRemove = "timeline.track.remove",
    MaterialCreate = "material.create",
    MaterialModify = "material.modify",
    MaterialAssign = "material.assign",
    AnimationKeyAdd = "animation.key.add",
    AnimationKeyRemove = "animation.key.remove",
    AnimationKeyModify = "animation.key.modify",
    AudioClipAdd = "audio.clip.add",
    AudioClipModify = "audio.clip.modify",
    AudioMixChange = "audio.mix.change",
    EffectAdd = "effect.add",
    EffectRemove = "effect.remove",
    EffectModify = "effect.modify",
    PropertyChange = "property.change",
    StateChange = "state.change",
    Custom = "custom"
}
/**
 * Operation state
 */
export interface OperationState {
    before: unknown;
    after: unknown;
}
/**
 * Base operation interface
 */
export interface Operation {
    id: string;
    type: OperationType;
    label: string;
    description?: string;
    documentId?: string;
    timestamp: number;
    state: OperationState;
    metadata?: Record<string, unknown>;
    execute(): Promise<void> | void;
    undo(): Promise<void> | void;
    redo(): Promise<void> | void;
    canMerge?(other: Operation): boolean;
    merge?(other: Operation): Operation;
    dispose?(): void;
}
/**
 * Operation builder
 */
export interface OperationBuilder<T extends Operation> {
    setLabel(label: string): this;
    setDescription(description: string): this;
    setDocumentId(documentId: string): this;
    setMetadata(metadata: Record<string, unknown>): this;
    setState(before: unknown, after: unknown): this;
    build(): T;
}
/**
 * Transaction - group of operations executed atomically
 */
export interface Transaction {
    id: string;
    label: string;
    description?: string;
    operations: Operation[];
    startTime: number;
    endTime?: number;
    committed: boolean;
    rolledBack: boolean;
}
/**
 * Transaction handle for building transactions
 */
export interface TransactionHandle {
    addOperation(operation: Operation): void;
    commit(): void;
    rollback(): void;
    isActive(): boolean;
}
/**
 * History entry
 */
export interface HistoryEntry {
    id: string;
    operation: Operation | Transaction;
    timestamp: number;
    branchId: string;
    parentId?: string;
    children: string[];
    tags: string[];
}
/**
 * History branch
 */
export interface HistoryBranch {
    id: string;
    name: string;
    parentBranchId?: string;
    forkPoint?: string;
    headId?: string;
    createdAt: number;
    isMain: boolean;
}
/**
 * History snapshot
 */
export interface HistorySnapshot {
    id: string;
    name: string;
    description?: string;
    entryId: string;
    branchId: string;
    timestamp: number;
    state: unknown;
    thumbnail?: string;
}
/**
 * History checkpoint (auto-save point)
 */
export interface HistoryCheckpoint {
    id: string;
    entryId: string;
    branchId: string;
    timestamp: number;
    reason: 'auto' | 'manual' | 'time' | 'operation-count';
}
/**
 * History changed event
 */
export interface HistoryChangedEvent {
    action: 'push' | 'undo' | 'redo' | 'clear' | 'branch' | 'merge';
    entry?: HistoryEntry;
    documentId?: string;
}
/**
 * Operation executed event
 */
export interface OperationExecutedEvent {
    operation: Operation;
    direction: 'do' | 'undo' | 'redo';
}
/**
 * History configuration
 */
export interface HistoryConfig {
    maxHistorySize: number;
    maxUndoLevels: number;
    mergeDelay: number;
    autoCheckpointInterval: number;
    autoCheckpointOperations: number;
    enableBranching: boolean;
    enableSnapshots: boolean;
    compressOldHistory: boolean;
    persistHistory: boolean;
}
export declare class HistorySystem {
    private readonly entries;
    private readonly documentStacks;
    private globalStack;
    private globalUndoIndex;
    private readonly branches;
    private activeBranchId;
    private readonly snapshots;
    private readonly checkpoints;
    private lastCheckpointTime;
    private operationsSinceCheckpoint;
    private activeTransaction;
    private config;
    private lastOperation;
    private readonly onHistoryChangedEmitter;
    readonly onHistoryChanged: Event<HistoryChangedEvent>;
    private readonly onOperationExecutedEmitter;
    readonly onOperationExecuted: Event<OperationExecutedEvent>;
    private readonly onCanUndoChangedEmitter;
    readonly onCanUndoChanged: Event<{
        documentId?: string;
        canUndo: boolean;
    }>;
    private readonly onCanRedoChangedEmitter;
    readonly onCanRedoChanged: Event<{
        documentId?: string;
        canRedo: boolean;
    }>;
    private checkpointTimer;
    constructor();
    /**
     * Execute and record an operation
     */
    execute(operation: Operation): Promise<void>;
    /**
     * Undo last operation
     */
    undo(documentId?: string): Promise<boolean>;
    /**
     * Redo last undone operation
     */
    redo(documentId?: string): Promise<boolean>;
    /**
     * Undo in document context
     */
    private undoDocument;
    /**
     * Redo in document context
     */
    private redoDocument;
    /**
     * Undo global operation
     */
    private undoGlobal;
    /**
     * Redo global operation
     */
    private redoGlobal;
    /**
     * Undo a history entry
     */
    private undoEntry;
    /**
     * Redo a history entry
     */
    private redoEntry;
    /**
     * Check if operation is a transaction
     */
    private isTransaction;
    /**
     * Check if undo is available
     */
    canUndo(documentId?: string): boolean;
    /**
     * Check if redo is available
     */
    canRedo(documentId?: string): boolean;
    /**
     * Get undo stack
     */
    getUndoStack(documentId?: string): HistoryEntry[];
    /**
     * Get redo stack
     */
    getRedoStack(documentId?: string): HistoryEntry[];
    /**
     * Get next undo operation label
     */
    getUndoLabel(documentId?: string): string | undefined;
    /**
     * Get next redo operation label
     */
    getRedoLabel(documentId?: string): string | undefined;
    /**
     * Begin a transaction
     */
    beginTransaction(label: string, description?: string): TransactionHandle;
    /**
     * Commit current transaction
     */
    private commitTransaction;
    /**
     * Rollback current transaction
     */
    private rollbackTransaction;
    /**
     * Check if in transaction
     */
    isInTransaction(): boolean;
    /**
     * Create new branch at current position
     */
    createBranch(name: string, documentId?: string): string;
    /**
     * Switch to branch
     */
    switchBranch(branchId: string): Promise<void>;
    /**
     * Merge branch into current
     */
    mergeBranch(branchId: string): Promise<void>;
    /**
     * Get branch list
     */
    getBranches(): HistoryBranch[];
    /**
     * Get active branch
     */
    getActiveBranch(): HistoryBranch | undefined;
    /**
     * Find path between branches
     */
    private findBranchPath;
    /**
     * Get entries for a branch
     */
    private getBranchEntries;
    /**
     * Create snapshot at current position
     */
    createSnapshot(name: string, description?: string, state?: unknown): string;
    /**
     * Restore to snapshot
     */
    restoreSnapshot(snapshotId: string): Promise<void>;
    /**
     * Get snapshots
     */
    getSnapshots(): HistorySnapshot[];
    /**
     * Delete snapshot
     */
    deleteSnapshot(snapshotId: string): void;
    /**
     * Create checkpoint
     */
    createCheckpoint(reason?: HistoryCheckpoint['reason']): string;
    /**
     * Get checkpoints
     */
    getCheckpoints(): HistoryCheckpoint[];
    /**
     * Check and create auto checkpoint
     */
    private checkAutoCheckpoint;
    /**
     * Start auto checkpoint timer
     */
    private startAutoCheckpoint;
    /**
     * Check if should merge with last operation
     */
    private shouldMerge;
    /**
     * Merge with last operation
     */
    private mergeWithLast;
    /**
     * Create history entry
     */
    private createEntry;
    /**
     * Push entry to document stack
     */
    private pushToDocument;
    /**
     * Push entry to global stack
     */
    private pushToGlobal;
    /**
     * Clear history for document
     */
    clearDocument(documentId: string): void;
    /**
     * Clear all history
     */
    clearAll(): void;
    /**
     * Get configuration
     */
    getConfig(): HistoryConfig;
    /**
     * Set configuration
     */
    setConfig(config: Partial<HistoryConfig>): void;
    /**
     * Initialize main branch
     */
    private initializeMainBranch;
    /**
     * Dispose
     */
    dispose(): void;
}
export default HistorySystem;
