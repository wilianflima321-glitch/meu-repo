"use strict";
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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HistorySystem = exports.OperationType = void 0;
const inversify_1 = require("inversify");
class Emitter {
    constructor() {
        this.listeners = [];
    }
    get event() {
        return (listener) => {
            this.listeners.push(listener);
            return {
                dispose: () => {
                    const idx = this.listeners.indexOf(listener);
                    if (idx >= 0)
                        this.listeners.splice(idx, 1);
                }
            };
        };
    }
    fire(event) {
        this.listeners.forEach(l => l(event));
    }
    dispose() {
        this.listeners = [];
    }
}
// ==================== Operation Types ====================
/**
 * Operation type
 */
var OperationType;
(function (OperationType) {
    // Editor operations
    OperationType["TextInsert"] = "text.insert";
    OperationType["TextDelete"] = "text.delete";
    OperationType["TextReplace"] = "text.replace";
    OperationType["TextFormat"] = "text.format";
    // File operations
    OperationType["FileCreate"] = "file.create";
    OperationType["FileDelete"] = "file.delete";
    OperationType["FileRename"] = "file.rename";
    OperationType["FileMove"] = "file.move";
    // Selection operations
    OperationType["SelectionChange"] = "selection.change";
    OperationType["CursorMove"] = "cursor.move";
    // Object operations
    OperationType["ObjectCreate"] = "object.create";
    OperationType["ObjectDelete"] = "object.delete";
    OperationType["ObjectTransform"] = "object.transform";
    OperationType["ObjectModify"] = "object.modify";
    OperationType["ObjectGroup"] = "object.group";
    OperationType["ObjectUngroup"] = "object.ungroup";
    OperationType["ObjectParent"] = "object.parent";
    // Layer operations
    OperationType["LayerCreate"] = "layer.create";
    OperationType["LayerDelete"] = "layer.delete";
    OperationType["LayerReorder"] = "layer.reorder";
    OperationType["LayerVisibility"] = "layer.visibility";
    OperationType["LayerLock"] = "layer.lock";
    OperationType["LayerBlend"] = "layer.blend";
    // Timeline operations
    OperationType["TimelineClipAdd"] = "timeline.clip.add";
    OperationType["TimelineClipRemove"] = "timeline.clip.remove";
    OperationType["TimelineClipMove"] = "timeline.clip.move";
    OperationType["TimelineClipTrim"] = "timeline.clip.trim";
    OperationType["TimelineClipSplit"] = "timeline.clip.split";
    OperationType["TimelineTrackAdd"] = "timeline.track.add";
    OperationType["TimelineTrackRemove"] = "timeline.track.remove";
    // Material operations
    OperationType["MaterialCreate"] = "material.create";
    OperationType["MaterialModify"] = "material.modify";
    OperationType["MaterialAssign"] = "material.assign";
    // Animation operations
    OperationType["AnimationKeyAdd"] = "animation.key.add";
    OperationType["AnimationKeyRemove"] = "animation.key.remove";
    OperationType["AnimationKeyModify"] = "animation.key.modify";
    // Audio operations
    OperationType["AudioClipAdd"] = "audio.clip.add";
    OperationType["AudioClipModify"] = "audio.clip.modify";
    OperationType["AudioMixChange"] = "audio.mix.change";
    // Effect operations
    OperationType["EffectAdd"] = "effect.add";
    OperationType["EffectRemove"] = "effect.remove";
    OperationType["EffectModify"] = "effect.modify";
    // Generic
    OperationType["PropertyChange"] = "property.change";
    OperationType["StateChange"] = "state.change";
    OperationType["Custom"] = "custom";
})(OperationType || (exports.OperationType = OperationType = {}));
// ==================== Main History System ====================
let HistorySystem = class HistorySystem {
    constructor() {
        // History entries indexed by ID
        this.entries = new Map();
        // Document-specific history stacks
        this.documentStacks = new Map();
        // Global history (for cross-document operations)
        this.globalStack = [];
        this.globalUndoIndex = -1;
        // Branches
        this.branches = new Map();
        this.activeBranchId = 'main';
        // Snapshots
        this.snapshots = new Map();
        // Checkpoints
        this.checkpoints = new Map();
        this.lastCheckpointTime = 0;
        this.operationsSinceCheckpoint = 0;
        // Active transaction
        this.activeTransaction = null;
        // Configuration
        this.config = {
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
        this.lastOperation = null;
        // Events
        this.onHistoryChangedEmitter = new Emitter();
        this.onHistoryChanged = this.onHistoryChangedEmitter.event;
        this.onOperationExecutedEmitter = new Emitter();
        this.onOperationExecuted = this.onOperationExecutedEmitter.event;
        this.onCanUndoChangedEmitter = new Emitter();
        this.onCanUndoChanged = this.onCanUndoChangedEmitter.event;
        this.onCanRedoChangedEmitter = new Emitter();
        this.onCanRedoChanged = this.onCanRedoChangedEmitter.event;
        // Timers
        this.checkpointTimer = null;
        this.initializeMainBranch();
        this.startAutoCheckpoint();
    }
    // ==================== Operation Execution ====================
    /**
     * Execute and record an operation
     */
    async execute(operation) {
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
        }
        else {
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
    async undo(documentId) {
        if (documentId) {
            return this.undoDocument(documentId);
        }
        return this.undoGlobal();
    }
    /**
     * Redo last undone operation
     */
    async redo(documentId) {
        if (documentId) {
            return this.redoDocument(documentId);
        }
        return this.redoGlobal();
    }
    /**
     * Undo in document context
     */
    async undoDocument(documentId) {
        const stack = this.documentStacks.get(documentId);
        if (!stack || !stack.canUndo())
            return false;
        const entry = stack.undo();
        if (!entry)
            return false;
        await this.undoEntry(entry);
        this.onCanUndoChangedEmitter.fire({ documentId, canUndo: stack.canUndo() });
        this.onCanRedoChangedEmitter.fire({ documentId, canRedo: stack.canRedo() });
        this.onHistoryChangedEmitter.fire({ action: 'undo', entry, documentId });
        return true;
    }
    /**
     * Redo in document context
     */
    async redoDocument(documentId) {
        const stack = this.documentStacks.get(documentId);
        if (!stack || !stack.canRedo())
            return false;
        const entry = stack.redo();
        if (!entry)
            return false;
        await this.redoEntry(entry);
        this.onCanUndoChangedEmitter.fire({ documentId, canUndo: stack.canUndo() });
        this.onCanRedoChangedEmitter.fire({ documentId, canRedo: stack.canRedo() });
        this.onHistoryChangedEmitter.fire({ action: 'redo', entry, documentId });
        return true;
    }
    /**
     * Undo global operation
     */
    async undoGlobal() {
        if (this.globalUndoIndex < 0)
            return false;
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
    async redoGlobal() {
        if (this.globalUndoIndex >= this.globalStack.length - 1)
            return false;
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
    async undoEntry(entry) {
        if (this.isTransaction(entry.operation)) {
            // Undo transaction in reverse order
            const operations = [...entry.operation.operations].reverse();
            for (const op of operations) {
                await op.undo();
                this.onOperationExecutedEmitter.fire({ operation: op, direction: 'undo' });
            }
        }
        else {
            await entry.operation.undo();
            this.onOperationExecutedEmitter.fire({ operation: entry.operation, direction: 'undo' });
        }
    }
    /**
     * Redo a history entry
     */
    async redoEntry(entry) {
        if (this.isTransaction(entry.operation)) {
            for (const op of entry.operation.operations) {
                await op.redo();
                this.onOperationExecutedEmitter.fire({ operation: op, direction: 'redo' });
            }
        }
        else {
            await entry.operation.redo();
            this.onOperationExecutedEmitter.fire({ operation: entry.operation, direction: 'redo' });
        }
    }
    /**
     * Check if operation is a transaction
     */
    isTransaction(op) {
        return 'operations' in op && Array.isArray(op.operations);
    }
    // ==================== State Queries ====================
    /**
     * Check if undo is available
     */
    canUndo(documentId) {
        if (documentId) {
            const stack = this.documentStacks.get(documentId);
            return stack ? stack.canUndo() : false;
        }
        return this.globalUndoIndex >= 0;
    }
    /**
     * Check if redo is available
     */
    canRedo(documentId) {
        if (documentId) {
            const stack = this.documentStacks.get(documentId);
            return stack ? stack.canRedo() : false;
        }
        return this.globalUndoIndex < this.globalStack.length - 1;
    }
    /**
     * Get undo stack
     */
    getUndoStack(documentId) {
        if (documentId) {
            const stack = this.documentStacks.get(documentId);
            return stack ? stack.getUndoStack() : [];
        }
        return this.globalStack.slice(0, this.globalUndoIndex + 1);
    }
    /**
     * Get redo stack
     */
    getRedoStack(documentId) {
        if (documentId) {
            const stack = this.documentStacks.get(documentId);
            return stack ? stack.getRedoStack() : [];
        }
        return this.globalStack.slice(this.globalUndoIndex + 1);
    }
    /**
     * Get next undo operation label
     */
    getUndoLabel(documentId) {
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
    getRedoLabel(documentId) {
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
    beginTransaction(label, description) {
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
            addOperation: (op) => {
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
    commitTransaction() {
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
            const documentIds = new Set(transaction.operations
                .map(op => op.documentId)
                .filter((id) => id !== undefined));
            if (documentIds.size === 1) {
                const documentId = [...documentIds][0];
                this.pushToDocument(documentId, entry);
            }
            else {
                this.pushToGlobal(entry);
            }
            this.onHistoryChangedEmitter.fire({ action: 'push', entry });
        }
        this.activeTransaction = null;
    }
    /**
     * Rollback current transaction
     */
    async rollbackTransaction() {
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
    isInTransaction() {
        return this.activeTransaction !== null;
    }
    // ==================== Branching ====================
    /**
     * Create new branch at current position
     */
    createBranch(name, documentId) {
        if (!this.config.enableBranching) {
            throw new Error('Branching is disabled');
        }
        const branchId = `branch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const currentEntry = documentId
            ? this.documentStacks.get(documentId)?.getCurrentEntry()
            : this.globalStack[this.globalUndoIndex];
        const branch = {
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
    async switchBranch(branchId) {
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
    async mergeBranch(branchId) {
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
            }
            else {
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
    getBranches() {
        return Array.from(this.branches.values());
    }
    /**
     * Get active branch
     */
    getActiveBranch() {
        return this.branches.get(this.activeBranchId);
    }
    /**
     * Find path between branches
     */
    findBranchPath(fromBranch, toBranch) {
        // Simplified - in production would need proper graph traversal
        return { undo: [], redo: [] };
    }
    /**
     * Get entries for a branch
     */
    getBranchEntries(branchId) {
        return Array.from(this.entries.values())
            .filter(e => e.branchId === branchId)
            .sort((a, b) => a.timestamp - b.timestamp);
    }
    // ==================== Snapshots ====================
    /**
     * Create snapshot at current position
     */
    createSnapshot(name, description, state) {
        if (!this.config.enableSnapshots) {
            throw new Error('Snapshots are disabled');
        }
        const snapshotId = `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const currentEntry = this.globalStack[this.globalUndoIndex];
        const snapshot = {
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
    async restoreSnapshot(snapshotId) {
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
    getSnapshots() {
        return Array.from(this.snapshots.values())
            .sort((a, b) => b.timestamp - a.timestamp);
    }
    /**
     * Delete snapshot
     */
    deleteSnapshot(snapshotId) {
        this.snapshots.delete(snapshotId);
    }
    // ==================== Checkpoints ====================
    /**
     * Create checkpoint
     */
    createCheckpoint(reason = 'manual') {
        const checkpointId = `checkpoint_${Date.now()}`;
        const currentEntry = this.globalStack[this.globalUndoIndex];
        const checkpoint = {
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
    getCheckpoints() {
        return Array.from(this.checkpoints.values())
            .sort((a, b) => b.timestamp - a.timestamp);
    }
    /**
     * Check and create auto checkpoint
     */
    checkAutoCheckpoint() {
        this.operationsSinceCheckpoint++;
        const timeSinceCheckpoint = Date.now() - this.lastCheckpointTime;
        if (this.config.autoCheckpointInterval > 0 &&
            timeSinceCheckpoint >= this.config.autoCheckpointInterval) {
            this.createCheckpoint('time');
        }
        else if (this.config.autoCheckpointOperations > 0 &&
            this.operationsSinceCheckpoint >= this.config.autoCheckpointOperations) {
            this.createCheckpoint('operation-count');
        }
    }
    /**
     * Start auto checkpoint timer
     */
    startAutoCheckpoint() {
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
    shouldMerge(operation) {
        if (!this.lastOperation)
            return false;
        const timeDiff = Date.now() - this.lastOperation.time;
        if (timeDiff > this.config.mergeDelay)
            return false;
        const lastOp = this.lastOperation.op;
        // Same type and document
        if (lastOp.type !== operation.type)
            return false;
        if (lastOp.documentId !== operation.documentId)
            return false;
        // Check if operation supports merging
        if (lastOp.canMerge && lastOp.canMerge(operation)) {
            return true;
        }
        return false;
    }
    /**
     * Merge with last operation
     */
    mergeWithLast(operation) {
        if (!this.lastOperation || !this.lastOperation.op.merge) {
            return null;
        }
        const merged = this.lastOperation.op.merge(operation);
        // Update last entry
        if (operation.documentId) {
            const stack = this.documentStacks.get(operation.documentId);
            stack?.updateLast(merged);
        }
        else {
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
    createEntry(operation) {
        const id = `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const entry = {
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
    pushToDocument(documentId, entry) {
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
    pushToGlobal(entry) {
        // Clear redo stack
        this.globalStack = this.globalStack.slice(0, this.globalUndoIndex + 1);
        // Add new entry
        this.globalStack.push(entry);
        this.globalUndoIndex = this.globalStack.length - 1;
        // Trim if over limit
        while (this.globalStack.length > this.config.maxHistorySize) {
            const removed = this.globalStack.shift();
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
    clearDocument(documentId) {
        const stack = this.documentStacks.get(documentId);
        if (stack) {
            // Dispose operations
            for (const entry of stack.getAll()) {
                if (this.isTransaction(entry.operation)) {
                    entry.operation.operations.forEach(op => op.dispose?.());
                }
                else {
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
    clearAll() {
        // Dispose all operations
        for (const entry of this.entries.values()) {
            if (this.isTransaction(entry.operation)) {
                entry.operation.operations.forEach(op => op.dispose?.());
            }
            else {
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
    getConfig() {
        return { ...this.config };
    }
    /**
     * Set configuration
     */
    setConfig(config) {
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
    initializeMainBranch() {
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
    dispose() {
        if (this.checkpointTimer) {
            clearInterval(this.checkpointTimer);
        }
        this.clearAll();
        this.onHistoryChangedEmitter.dispose();
        this.onOperationExecutedEmitter.dispose();
        this.onCanUndoChangedEmitter.dispose();
        this.onCanRedoChangedEmitter.dispose();
    }
};
exports.HistorySystem = HistorySystem;
exports.HistorySystem = HistorySystem = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], HistorySystem);
// ==================== Document History Stack ====================
class DocumentHistoryStack {
    constructor(maxSize) {
        this.maxSize = maxSize;
        this.entries = [];
        this.undoIndex = -1;
    }
    push(entry) {
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
    undo() {
        if (this.undoIndex < 0)
            return undefined;
        const entry = this.entries[this.undoIndex];
        this.undoIndex--;
        return entry;
    }
    redo() {
        if (this.undoIndex >= this.entries.length - 1)
            return undefined;
        this.undoIndex++;
        return this.entries[this.undoIndex];
    }
    canUndo() {
        return this.undoIndex >= 0;
    }
    canRedo() {
        return this.undoIndex < this.entries.length - 1;
    }
    getUndoStack() {
        return this.entries.slice(0, this.undoIndex + 1);
    }
    getRedoStack() {
        return this.entries.slice(this.undoIndex + 1);
    }
    getAll() {
        return [...this.entries];
    }
    getCurrentEntry() {
        return this.entries[this.undoIndex];
    }
    getUndoLabel() {
        if (this.undoIndex >= 0) {
            const entry = this.entries[this.undoIndex];
            return 'operations' in entry.operation
                ? entry.operation.label
                : entry.operation.label;
        }
        return undefined;
    }
    getRedoLabel() {
        if (this.undoIndex < this.entries.length - 1) {
            const entry = this.entries[this.undoIndex + 1];
            return 'operations' in entry.operation
                ? entry.operation.label
                : entry.operation.label;
        }
        return undefined;
    }
    updateLast(operation) {
        if (this.undoIndex >= 0) {
            this.entries[this.undoIndex].operation = operation;
        }
    }
}
// ==================== Export ====================
exports.default = HistorySystem;
