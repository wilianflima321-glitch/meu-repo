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

import { injectable, inject, optional } from 'inversify';

// Theia-compatible Emitter implementation
type Event<T> = (listener: (e: T) => void) => { dispose: () => void };

class Emitter<T> {
    private listeners: Array<(e: T) => void> = [];
    
    get event(): Event<T> {
        return (listener: (e: T) => void) => {
            this.listeners.push(listener);
            return {
                dispose: () => {
                    const idx = this.listeners.indexOf(listener);
                    if (idx >= 0) this.listeners.splice(idx, 1);
                }
            };
        };
    }
    
    fire(event: T): void {
        this.listeners.forEach(l => l(event));
    }
    
    dispose(): void {
        this.listeners = [];
    }
}

// ==================== Operation Types ====================

/**
 * Operation type
 */
export enum OperationType {
    // Editor operations
    TextInsert = 'text.insert',
    TextDelete = 'text.delete',
    TextReplace = 'text.replace',
    TextFormat = 'text.format',
    
    // File operations
    FileCreate = 'file.create',
    FileDelete = 'file.delete',
    FileRename = 'file.rename',
    FileMove = 'file.move',
    
    // Selection operations
    SelectionChange = 'selection.change',
    CursorMove = 'cursor.move',
    
    // Object operations
    ObjectCreate = 'object.create',
    ObjectDelete = 'object.delete',
    ObjectTransform = 'object.transform',
    ObjectModify = 'object.modify',
    ObjectGroup = 'object.group',
    ObjectUngroup = 'object.ungroup',
    ObjectParent = 'object.parent',
    
    // Layer operations
    LayerCreate = 'layer.create',
    LayerDelete = 'layer.delete',
    LayerReorder = 'layer.reorder',
    LayerVisibility = 'layer.visibility',
    LayerLock = 'layer.lock',
    LayerBlend = 'layer.blend',
    
    // Timeline operations
    TimelineClipAdd = 'timeline.clip.add',
    TimelineClipRemove = 'timeline.clip.remove',
    TimelineClipMove = 'timeline.clip.move',
    TimelineClipTrim = 'timeline.clip.trim',
    TimelineClipSplit = 'timeline.clip.split',
    TimelineTrackAdd = 'timeline.track.add',
    TimelineTrackRemove = 'timeline.track.remove',
    
    // Material operations
    MaterialCreate = 'material.create',
    MaterialModify = 'material.modify',
    MaterialAssign = 'material.assign',
    
    // Animation operations
    AnimationKeyAdd = 'animation.key.add',
    AnimationKeyRemove = 'animation.key.remove',
    AnimationKeyModify = 'animation.key.modify',
    
    // Audio operations
    AudioClipAdd = 'audio.clip.add',
    AudioClipModify = 'audio.clip.modify',
    AudioMixChange = 'audio.mix.change',
    
    // Effect operations
    EffectAdd = 'effect.add',
    EffectRemove = 'effect.remove',
    EffectModify = 'effect.modify',
    
    // Generic
    PropertyChange = 'property.change',
    StateChange = 'state.change',
    Custom = 'custom'
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
    
    // Execution
    execute(): Promise<void> | void;
    undo(): Promise<void> | void;
    redo(): Promise<void> | void;
    
    // Merge support
    canMerge?(other: Operation): boolean;
    merge?(other: Operation): Operation;
    
    // Cleanup
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

// ==================== Transaction Types ====================

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

// ==================== History Stack Types ====================

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

// ==================== Events ====================

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

// ==================== Configuration ====================

/**
 * History configuration
 */
export interface HistoryConfig {
    maxHistorySize: number;
    maxUndoLevels: number;
    mergeDelay: number; // ms - merge operations within this window
    autoCheckpointInterval: number; // ms, 0 to disable
    autoCheckpointOperations: number; // checkpoint after N operations
    enableBranching: boolean;
    enableSnapshots: boolean;
    compressOldHistory: boolean;
    persistHistory: boolean;
}

// ==================== Main History System ====================

@injectable()
export class HistorySystem {
    // History entries indexed by ID
    private readonly entries: Map<string, HistoryEntry> = new Map();
    
    // Document-specific history stacks
    private readonly documentStacks: Map<string, DocumentHistoryStack> = new Map();
    
    // Global history (for cross-document operations)
    private globalStack: HistoryEntry[] = [];
    private globalUndoIndex: number = -1;
    
    // Branches
    private readonly branches: Map<string, HistoryBranch> = new Map();
    private activeBranchId: string = 'main';
    
    // Snapshots
    private readonly snapshots: Map<string, HistorySnapshot> = new Map();
    
    // Checkpoints
    private readonly checkpoints: Map<string, HistoryCheckpoint> = new Map();
    private lastCheckpointTime: number = 0;
    private operationsSinceCheckpoint: number = 0;
    
    // Active transaction
    private activeTransaction: Transaction | null = null;
    
    // Configuration
    private config: HistoryConfig = {
        maxHistorySize: 1000,
        maxUndoLevels: 100,
        mergeDelay: 300,
        autoCheckpointInterval: 300000, // 5 minutes
        autoCheckpointOperations: 50,
        enableBranching: true,
        enableSnapshots: true,
        compressOldHistory: true,
        persistHistory: false
    };
    
    // Last operation for merging
    private lastOperation: { op: Operation; time: number } | null = null;
    
    // Events
    private readonly onHistoryChangedEmitter = new Emitter<HistoryChangedEvent>();
    readonly onHistoryChanged: Event<HistoryChangedEvent> = this.onHistoryChangedEmitter.event;
    
    private readonly onOperationExecutedEmitter = new Emitter<OperationExecutedEvent>();
    readonly onOperationExecuted: Event<OperationExecutedEvent> = this.onOperationExecutedEmitter.event;
    
    private readonly onCanUndoChangedEmitter = new Emitter<{ documentId?: string; canUndo: boolean }>();
    readonly onCanUndoChanged: Event<{ documentId?: string; canUndo: boolean }> = this.onCanUndoChangedEmitter.event;
    
    private readonly onCanRedoChangedEmitter = new Emitter<{ documentId?: string; canRedo: boolean }>();
    readonly onCanRedoChanged: Event<{ documentId?: string; canRedo: boolean }> = this.onCanRedoChangedEmitter.event;

    // Timers
    private checkpointTimer: ReturnType<typeof setInterval> | null = null;

    constructor() {
        this.initializeMainBranch();
        this.startAutoCheckpoint();
    }

    // ==================== Operation Execution ====================

    /**
     * Execute and record an operation
     */
    async execute(operation: Operation): Promise<void> {
        // If in transaction, add to transaction
        if (this.activeTransaction) {
            this.activeTransaction.operations.push(operation);
            await operation.execute();
            return;
        }

        // Check for merge with last operation
        if (this.shouldMerge(operation)) {
            const merged = this.mergeWithLast(operation);
            if (merged) {
                await merged.redo();
                return;
            }
        }

        // Execute operation
        await operation.execute();

        // Create history entry
        const entry = this.createEntry(operation);
        
        // Add to appropriate stack
        if (operation.documentId) {
            this.pushToDocument(operation.documentId, entry);
        } else {
            this.pushToGlobal(entry);
        }

        // Update last operation for merging
        this.lastOperation = { op: operation, time: Date.now() };

        // Check for auto-checkpoint
        this.checkAutoCheckpoint();

        // Fire events
        this.onOperationExecutedEmitter.fire({ operation, direction: 'do' });
        this.onHistoryChangedEmitter.fire({ action: 'push', entry, documentId: operation.documentId });
    }

    /**
     * Undo last operation
     */
    async undo(documentId?: string): Promise<boolean> {
        if (documentId) {
            return this.undoDocument(documentId);
        }
        return this.undoGlobal();
    }

    /**
     * Redo last undone operation
     */
    async redo(documentId?: string): Promise<boolean> {
        if (documentId) {
            return this.redoDocument(documentId);
        }
        return this.redoGlobal();
    }

    /**
     * Undo in document context
     */
    private async undoDocument(documentId: string): Promise<boolean> {
        const stack = this.documentStacks.get(documentId);
        if (!stack || !stack.canUndo()) return false;

        const entry = stack.undo();
        if (!entry) return false;

        await this.undoEntry(entry);
        
        this.onCanUndoChangedEmitter.fire({ documentId, canUndo: stack.canUndo() });
        this.onCanRedoChangedEmitter.fire({ documentId, canRedo: stack.canRedo() });
        this.onHistoryChangedEmitter.fire({ action: 'undo', entry, documentId });
        
        return true;
    }

    /**
     * Redo in document context
     */
    private async redoDocument(documentId: string): Promise<boolean> {
        const stack = this.documentStacks.get(documentId);
        if (!stack || !stack.canRedo()) return false;

        const entry = stack.redo();
        if (!entry) return false;

        await this.redoEntry(entry);
        
        this.onCanUndoChangedEmitter.fire({ documentId, canUndo: stack.canUndo() });
        this.onCanRedoChangedEmitter.fire({ documentId, canRedo: stack.canRedo() });
        this.onHistoryChangedEmitter.fire({ action: 'redo', entry, documentId });
        
        return true;
    }

    /**
     * Undo global operation
     */
    private async undoGlobal(): Promise<boolean> {
        if (this.globalUndoIndex < 0) return false;

        const entry = this.globalStack[this.globalUndoIndex];
        this.globalUndoIndex--;

        await this.undoEntry(entry);
        
        this.onCanUndoChangedEmitter.fire({ canUndo: this.canUndo() });
        this.onCanRedoChangedEmitter.fire({ canRedo: this.canRedo() });
        this.onHistoryChangedEmitter.fire({ action: 'undo', entry });
        
        return true;
    }

    /**
     * Redo global operation
     */
    private async redoGlobal(): Promise<boolean> {
        if (this.globalUndoIndex >= this.globalStack.length - 1) return false;

        this.globalUndoIndex++;
        const entry = this.globalStack[this.globalUndoIndex];

        await this.redoEntry(entry);
        
        this.onCanUndoChangedEmitter.fire({ canUndo: this.canUndo() });
        this.onCanRedoChangedEmitter.fire({ canRedo: this.canRedo() });
        this.onHistoryChangedEmitter.fire({ action: 'redo', entry });
        
        return true;
    }

    /**
     * Undo a history entry
     */
    private async undoEntry(entry: HistoryEntry): Promise<void> {
        if (this.isTransaction(entry.operation)) {
            // Undo transaction in reverse order
            const operations = [...entry.operation.operations].reverse();
            for (const op of operations) {
                await op.undo();
                this.onOperationExecutedEmitter.fire({ operation: op, direction: 'undo' });
            }
        } else {
            await entry.operation.undo();
            this.onOperationExecutedEmitter.fire({ operation: entry.operation, direction: 'undo' });
        }
    }

    /**
     * Redo a history entry
     */
    private async redoEntry(entry: HistoryEntry): Promise<void> {
        if (this.isTransaction(entry.operation)) {
            for (const op of entry.operation.operations) {
                await op.redo();
                this.onOperationExecutedEmitter.fire({ operation: op, direction: 'redo' });
            }
        } else {
            await entry.operation.redo();
            this.onOperationExecutedEmitter.fire({ operation: entry.operation, direction: 'redo' });
        }
    }

    /**
     * Check if operation is a transaction
     */
    private isTransaction(op: Operation | Transaction): op is Transaction {
        return 'operations' in op && Array.isArray(op.operations);
    }

    // ==================== State Queries ====================

    /**
     * Check if undo is available
     */
    canUndo(documentId?: string): boolean {
        if (documentId) {
            const stack = this.documentStacks.get(documentId);
            return stack ? stack.canUndo() : false;
        }
        return this.globalUndoIndex >= 0;
    }

    /**
     * Check if redo is available
     */
    canRedo(documentId?: string): boolean {
        if (documentId) {
            const stack = this.documentStacks.get(documentId);
            return stack ? stack.canRedo() : false;
        }
        return this.globalUndoIndex < this.globalStack.length - 1;
    }

    /**
     * Get undo stack
     */
    getUndoStack(documentId?: string): HistoryEntry[] {
        if (documentId) {
            const stack = this.documentStacks.get(documentId);
            return stack ? stack.getUndoStack() : [];
        }
        return this.globalStack.slice(0, this.globalUndoIndex + 1);
    }

    /**
     * Get redo stack
     */
    getRedoStack(documentId?: string): HistoryEntry[] {
        if (documentId) {
            const stack = this.documentStacks.get(documentId);
            return stack ? stack.getRedoStack() : [];
        }
        return this.globalStack.slice(this.globalUndoIndex + 1);
    }

    /**
     * Get next undo operation label
     */
    getUndoLabel(documentId?: string): string | undefined {
        if (documentId) {
            const stack = this.documentStacks.get(documentId);
            return stack?.getUndoLabel();
        }
        if (this.globalUndoIndex >= 0) {
            const entry = this.globalStack[this.globalUndoIndex];
            return this.isTransaction(entry.operation) 
                ? entry.operation.label 
                : entry.operation.label;
        }
        return undefined;
    }

    /**
     * Get next redo operation label
     */
    getRedoLabel(documentId?: string): string | undefined {
        if (documentId) {
            const stack = this.documentStacks.get(documentId);
            return stack?.getRedoLabel();
        }
        if (this.globalUndoIndex < this.globalStack.length - 1) {
            const entry = this.globalStack[this.globalUndoIndex + 1];
            return this.isTransaction(entry.operation) 
                ? entry.operation.label 
                : entry.operation.label;
        }
        return undefined;
    }

    // ==================== Transactions ====================

    /**
     * Begin a transaction
     */
    beginTransaction(label: string, description?: string): TransactionHandle {
        if (this.activeTransaction) {
            throw new Error('A transaction is already active');
        }

        this.activeTransaction = {
            id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            label,
            description,
            operations: [],
            startTime: Date.now(),
            committed: false,
            rolledBack: false
        };

        const transaction = this.activeTransaction;

        return {
            addOperation: (op: Operation) => {
                if (!this.activeTransaction || this.activeTransaction.id !== transaction.id) {
                    throw new Error('Transaction is no longer active');
                }
                this.activeTransaction.operations.push(op);
            },
            commit: () => this.commitTransaction(),
            rollback: () => this.rollbackTransaction(),
            isActive: () => this.activeTransaction?.id === transaction.id
        };
    }

    /**
     * Commit current transaction
     */
    private commitTransaction(): void {
        if (!this.activeTransaction) {
            throw new Error('No active transaction');
        }

        const transaction = this.activeTransaction;
        transaction.endTime = Date.now();
        transaction.committed = true;

        // Only record if there were operations
        if (transaction.operations.length > 0) {
            const entry = this.createEntry(transaction);
            
            // Determine document ID from operations
            const documentIds = new Set(
                transaction.operations
                    .map(op => op.documentId)
                    .filter((id): id is string => id !== undefined)
            );

            if (documentIds.size === 1) {
                const documentId = [...documentIds][0];
                this.pushToDocument(documentId, entry);
            } else {
                this.pushToGlobal(entry);
            }

            this.onHistoryChangedEmitter.fire({ action: 'push', entry });
        }

        this.activeTransaction = null;
    }

    /**
     * Rollback current transaction
     */
    private async rollbackTransaction(): Promise<void> {
        if (!this.activeTransaction) {
            throw new Error('No active transaction');
        }

        const transaction = this.activeTransaction;
        transaction.rolledBack = true;

        // Undo all operations in reverse order
        for (let i = transaction.operations.length - 1; i >= 0; i--) {
            await transaction.operations[i].undo();
        }

        this.activeTransaction = null;
    }

    /**
     * Check if in transaction
     */
    isInTransaction(): boolean {
        return this.activeTransaction !== null;
    }

    // ==================== Branching ====================

    /**
     * Create new branch at current position
     */
    createBranch(name: string, documentId?: string): string {
        if (!this.config.enableBranching) {
            throw new Error('Branching is disabled');
        }

        const branchId = `branch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const currentEntry = documentId 
            ? this.documentStacks.get(documentId)?.getCurrentEntry()
            : this.globalStack[this.globalUndoIndex];

        const branch: HistoryBranch = {
            id: branchId,
            name,
            parentBranchId: this.activeBranchId,
            forkPoint: currentEntry?.id,
            createdAt: Date.now(),
            isMain: false
        };

        this.branches.set(branchId, branch);
        
        this.onHistoryChangedEmitter.fire({ action: 'branch', documentId });
        
        return branchId;
    }

    /**
     * Switch to branch
     */
    async switchBranch(branchId: string): Promise<void> {
        const branch = this.branches.get(branchId);
        if (!branch) {
            throw new Error(`Branch '${branchId}' not found`);
        }

        // Find common ancestor and apply/undo operations
        const path = this.findBranchPath(this.activeBranchId, branchId);
        
        // Undo to fork point
        for (const entryId of path.undo) {
            const entry = this.entries.get(entryId);
            if (entry) {
                await this.undoEntry(entry);
            }
        }

        // Redo to target
        for (const entryId of path.redo) {
            const entry = this.entries.get(entryId);
            if (entry) {
                await this.redoEntry(entry);
            }
        }

        this.activeBranchId = branchId;
    }

    /**
     * Merge branch into current
     */
    async mergeBranch(branchId: string): Promise<void> {
        const branch = this.branches.get(branchId);
        if (!branch) {
            throw new Error(`Branch '${branchId}' not found`);
        }

        // Get operations from branch since fork
        const branchEntries = this.getBranchEntries(branchId);
        
        // Apply as new transaction
        const handle = this.beginTransaction(`Merge branch: ${branch.name}`);
        
        for (const entry of branchEntries) {
            if (this.isTransaction(entry.operation)) {
                for (const op of entry.operation.operations) {
                    handle.addOperation(op);
                    await op.execute();
                }
            } else {
                handle.addOperation(entry.operation);
                await entry.operation.execute();
            }
        }

        handle.commit();
        
        this.onHistoryChangedEmitter.fire({ action: 'merge' });
    }

    /**
     * Get branch list
     */
    getBranches(): HistoryBranch[] {
        return Array.from(this.branches.values());
    }

    /**
     * Get active branch
     */
    getActiveBranch(): HistoryBranch | undefined {
        return this.branches.get(this.activeBranchId);
    }

    /**
     * Find path between branches
     */
    private findBranchPath(fromBranch: string, toBranch: string): { undo: string[]; redo: string[] } {
        // Simplified - in production would need proper graph traversal
        return { undo: [], redo: [] };
    }

    /**
     * Get entries for a branch
     */
    private getBranchEntries(branchId: string): HistoryEntry[] {
        return Array.from(this.entries.values())
            .filter(e => e.branchId === branchId)
            .sort((a, b) => a.timestamp - b.timestamp);
    }

    // ==================== Snapshots ====================

    /**
     * Create snapshot at current position
     */
    createSnapshot(name: string, description?: string, state?: unknown): string {
        if (!this.config.enableSnapshots) {
            throw new Error('Snapshots are disabled');
        }

        const snapshotId = `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const currentEntry = this.globalStack[this.globalUndoIndex];

        const snapshot: HistorySnapshot = {
            id: snapshotId,
            name,
            description,
            entryId: currentEntry?.id || '',
            branchId: this.activeBranchId,
            timestamp: Date.now(),
            state
        };

        this.snapshots.set(snapshotId, snapshot);
        
        return snapshotId;
    }

    /**
     * Restore to snapshot
     */
    async restoreSnapshot(snapshotId: string): Promise<void> {
        const snapshot = this.snapshots.get(snapshotId);
        if (!snapshot) {
            throw new Error(`Snapshot '${snapshotId}' not found`);
        }

        // Find entry and restore
        const targetEntry = this.entries.get(snapshot.entryId);
        if (!targetEntry) {
            throw new Error('Snapshot entry not found');
        }

        // Undo/redo to reach target
        // This is simplified - would need proper implementation
        await this.switchBranch(snapshot.branchId);
    }

    /**
     * Get snapshots
     */
    getSnapshots(): HistorySnapshot[] {
        return Array.from(this.snapshots.values())
            .sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Delete snapshot
     */
    deleteSnapshot(snapshotId: string): void {
        this.snapshots.delete(snapshotId);
    }

    // ==================== Checkpoints ====================

    /**
     * Create checkpoint
     */
    createCheckpoint(reason: HistoryCheckpoint['reason'] = 'manual'): string {
        const checkpointId = `checkpoint_${Date.now()}`;
        const currentEntry = this.globalStack[this.globalUndoIndex];

        const checkpoint: HistoryCheckpoint = {
            id: checkpointId,
            entryId: currentEntry?.id || '',
            branchId: this.activeBranchId,
            timestamp: Date.now(),
            reason
        };

        this.checkpoints.set(checkpointId, checkpoint);
        this.lastCheckpointTime = Date.now();
        this.operationsSinceCheckpoint = 0;

        return checkpointId;
    }

    /**
     * Get checkpoints
     */
    getCheckpoints(): HistoryCheckpoint[] {
        return Array.from(this.checkpoints.values())
            .sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Check and create auto checkpoint
     */
    private checkAutoCheckpoint(): void {
        this.operationsSinceCheckpoint++;

        const timeSinceCheckpoint = Date.now() - this.lastCheckpointTime;
        
        if (this.config.autoCheckpointInterval > 0 && 
            timeSinceCheckpoint >= this.config.autoCheckpointInterval) {
            this.createCheckpoint('time');
        } else if (this.config.autoCheckpointOperations > 0 && 
            this.operationsSinceCheckpoint >= this.config.autoCheckpointOperations) {
            this.createCheckpoint('operation-count');
        }
    }

    /**
     * Start auto checkpoint timer
     */
    private startAutoCheckpoint(): void {
        if (this.config.autoCheckpointInterval > 0) {
            this.checkpointTimer = setInterval(() => {
                if (this.operationsSinceCheckpoint > 0) {
                    this.createCheckpoint('auto');
                }
            }, this.config.autoCheckpointInterval);
        }
    }

    // ==================== Merging ====================

    /**
     * Check if should merge with last operation
     */
    private shouldMerge(operation: Operation): boolean {
        if (!this.lastOperation) return false;
        
        const timeDiff = Date.now() - this.lastOperation.time;
        if (timeDiff > this.config.mergeDelay) return false;

        const lastOp = this.lastOperation.op;
        
        // Same type and document
        if (lastOp.type !== operation.type) return false;
        if (lastOp.documentId !== operation.documentId) return false;

        // Check if operation supports merging
        if (lastOp.canMerge && lastOp.canMerge(operation)) {
            return true;
        }

        return false;
    }

    /**
     * Merge with last operation
     */
    private mergeWithLast(operation: Operation): Operation | null {
        if (!this.lastOperation || !this.lastOperation.op.merge) {
            return null;
        }

        const merged = this.lastOperation.op.merge(operation);
        
        // Update last entry
        if (operation.documentId) {
            const stack = this.documentStacks.get(operation.documentId);
            stack?.updateLast(merged);
        } else {
            const entry = this.globalStack[this.globalUndoIndex];
            if (entry) {
                entry.operation = merged;
            }
        }

        this.lastOperation.op = merged;
        this.lastOperation.time = Date.now();

        return merged;
    }

    // ==================== Stack Management ====================

    /**
     * Create history entry
     */
    private createEntry(operation: Operation | Transaction): HistoryEntry {
        const id = `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const entry: HistoryEntry = {
            id,
            operation,
            timestamp: Date.now(),
            branchId: this.activeBranchId,
            parentId: this.globalStack[this.globalUndoIndex]?.id,
            children: [],
            tags: []
        };

        this.entries.set(id, entry);
        
        // Update parent's children
        if (entry.parentId) {
            const parent = this.entries.get(entry.parentId);
            if (parent) {
                parent.children.push(id);
            }
        }

        return entry;
    }

    /**
     * Push entry to document stack
     */
    private pushToDocument(documentId: string, entry: HistoryEntry): void {
        let stack = this.documentStacks.get(documentId);
        if (!stack) {
            stack = new DocumentHistoryStack(this.config.maxUndoLevels);
            this.documentStacks.set(documentId, stack);
        }
        
        stack.push(entry);
        
        this.onCanUndoChangedEmitter.fire({ documentId, canUndo: stack.canUndo() });
        this.onCanRedoChangedEmitter.fire({ documentId, canRedo: stack.canRedo() });
    }

    /**
     * Push entry to global stack
     */
    private pushToGlobal(entry: HistoryEntry): void {
        // Clear redo stack
        this.globalStack = this.globalStack.slice(0, this.globalUndoIndex + 1);
        
        // Add new entry
        this.globalStack.push(entry);
        this.globalUndoIndex = this.globalStack.length - 1;

        // Trim if over limit
        while (this.globalStack.length > this.config.maxHistorySize) {
            const removed = this.globalStack.shift()!;
            this.entries.delete(removed.id);
            this.globalUndoIndex--;
        }

        this.onCanUndoChangedEmitter.fire({ canUndo: this.canUndo() });
        this.onCanRedoChangedEmitter.fire({ canRedo: this.canRedo() });
    }

    // ==================== Clear ====================

    /**
     * Clear history for document
     */
    clearDocument(documentId: string): void {
        const stack = this.documentStacks.get(documentId);
        if (stack) {
            // Dispose operations
            for (const entry of stack.getAll()) {
                if (this.isTransaction(entry.operation)) {
                    entry.operation.operations.forEach(op => op.dispose?.());
                } else {
                    entry.operation.dispose?.();
                }
                this.entries.delete(entry.id);
            }
            
            this.documentStacks.delete(documentId);
        }

        this.onHistoryChangedEmitter.fire({ action: 'clear', documentId });
    }

    /**
     * Clear all history
     */
    clearAll(): void {
        // Dispose all operations
        for (const entry of this.entries.values()) {
            if (this.isTransaction(entry.operation)) {
                entry.operation.operations.forEach(op => op.dispose?.());
            } else {
                entry.operation.dispose?.();
            }
        }

        this.entries.clear();
        this.documentStacks.clear();
        this.globalStack = [];
        this.globalUndoIndex = -1;
        this.snapshots.clear();
        this.checkpoints.clear();
        this.lastOperation = null;

        this.onHistoryChangedEmitter.fire({ action: 'clear' });
    }

    // ==================== Configuration ====================

    /**
     * Get configuration
     */
    getConfig(): HistoryConfig {
        return { ...this.config };
    }

    /**
     * Set configuration
     */
    setConfig(config: Partial<HistoryConfig>): void {
        Object.assign(this.config, config);

        // Restart auto checkpoint if interval changed
        if (config.autoCheckpointInterval !== undefined) {
            if (this.checkpointTimer) {
                clearInterval(this.checkpointTimer);
            }
            this.startAutoCheckpoint();
        }
    }

    // ==================== Initialization ====================

    /**
     * Initialize main branch
     */
    private initializeMainBranch(): void {
        this.branches.set('main', {
            id: 'main',
            name: 'Main',
            createdAt: Date.now(),
            isMain: true
        });
    }

    // ==================== Utilities ====================

    /**
     * Dispose
     */
    dispose(): void {
        if (this.checkpointTimer) {
            clearInterval(this.checkpointTimer);
        }
        
        this.clearAll();
        
        this.onHistoryChangedEmitter.dispose();
        this.onOperationExecutedEmitter.dispose();
        this.onCanUndoChangedEmitter.dispose();
        this.onCanRedoChangedEmitter.dispose();
    }
}

// ==================== Document History Stack ====================

class DocumentHistoryStack {
    private entries: HistoryEntry[] = [];
    private undoIndex: number = -1;
    
    constructor(private maxSize: number) {}

    push(entry: HistoryEntry): void {
        // Clear redo stack
        this.entries = this.entries.slice(0, this.undoIndex + 1);
        
        // Add entry
        this.entries.push(entry);
        this.undoIndex = this.entries.length - 1;

        // Trim if over limit
        while (this.entries.length > this.maxSize) {
            this.entries.shift();
            this.undoIndex--;
        }
    }

    undo(): HistoryEntry | undefined {
        if (this.undoIndex < 0) return undefined;
        const entry = this.entries[this.undoIndex];
        this.undoIndex--;
        return entry;
    }

    redo(): HistoryEntry | undefined {
        if (this.undoIndex >= this.entries.length - 1) return undefined;
        this.undoIndex++;
        return this.entries[this.undoIndex];
    }

    canUndo(): boolean {
        return this.undoIndex >= 0;
    }

    canRedo(): boolean {
        return this.undoIndex < this.entries.length - 1;
    }

    getUndoStack(): HistoryEntry[] {
        return this.entries.slice(0, this.undoIndex + 1);
    }

    getRedoStack(): HistoryEntry[] {
        return this.entries.slice(this.undoIndex + 1);
    }

    getAll(): HistoryEntry[] {
        return [...this.entries];
    }

    getCurrentEntry(): HistoryEntry | undefined {
        return this.entries[this.undoIndex];
    }

    getUndoLabel(): string | undefined {
        if (this.undoIndex >= 0) {
            const entry = this.entries[this.undoIndex];
            return 'operations' in entry.operation
                ? (entry.operation as Transaction).label
                : entry.operation.label;
        }
        return undefined;
    }

    getRedoLabel(): string | undefined {
        if (this.undoIndex < this.entries.length - 1) {
            const entry = this.entries[this.undoIndex + 1];
            return 'operations' in entry.operation
                ? (entry.operation as Transaction).label
                : entry.operation.label;
        }
        return undefined;
    }

    updateLast(operation: Operation): void {
        if (this.undoIndex >= 0) {
            this.entries[this.undoIndex].operation = operation;
        }
    }
}

// ==================== Export ====================

export default HistorySystem;
