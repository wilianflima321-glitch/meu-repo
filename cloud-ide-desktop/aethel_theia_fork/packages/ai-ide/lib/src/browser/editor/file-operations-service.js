"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileOperationsService = void 0;
const inversify_1 = require("inversify");
let FileOperationsService = class FileOperationsService {
    constructor() {
        this.recentFiles = [];
        this.operationHistory = [];
        this.MAX_RECENT_FILES = 20;
        this.MAX_HISTORY = 100;
    }
    /**
     * Create new file
     */
    async createFile(uri, content = '') {
        try {
            // Placeholder - actual implementation would use file system API
            this.recordOperation({
                type: 'create',
                uri,
                timestamp: Date.now(),
                success: true
            });
            return { success: true };
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            this.recordOperation({
                type: 'create',
                uri,
                timestamp: Date.now(),
                success: false,
                error: errorMsg
            });
            return { success: false, error: errorMsg };
        }
    }
    /**
     * Open file
     */
    async openFile(uri) {
        try {
            // Placeholder - actual implementation would read file
            this.addToRecentFiles(uri);
            this.recordOperation({
                type: 'open',
                uri,
                timestamp: Date.now(),
                success: true
            });
            return { success: true, content: '' };
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            this.recordOperation({
                type: 'open',
                uri,
                timestamp: Date.now(),
                success: false,
                error: errorMsg
            });
            return { success: false, error: errorMsg };
        }
    }
    /**
     * Rename file with confirmation
     */
    async renameFile(oldUri, newUri, skipConfirmation = false) {
        if (!skipConfirmation) {
            const confirmed = await this.showConfirmation({
                title: 'Rename File',
                message: `Rename "${this.getFileName(oldUri)}" to "${this.getFileName(newUri)}"?`,
                detail: 'This action cannot be undone.',
                confirmLabel: 'Rename',
                cancelLabel: 'Cancel'
            });
            if (!confirmed) {
                return { success: false, error: 'User cancelled' };
            }
        }
        try {
            // Placeholder - actual implementation would rename file
            this.updateRecentFile(oldUri, newUri);
            this.recordOperation({
                type: 'rename',
                uri: oldUri,
                newUri,
                timestamp: Date.now(),
                success: true
            });
            return { success: true };
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            this.recordOperation({
                type: 'rename',
                uri: oldUri,
                newUri,
                timestamp: Date.now(),
                success: false,
                error: errorMsg
            });
            return { success: false, error: errorMsg };
        }
    }
    /**
     * Delete file with confirmation
     */
    async deleteFile(uri, skipConfirmation = false) {
        if (!skipConfirmation) {
            const confirmed = await this.showConfirmation({
                title: 'Delete File',
                message: `Are you sure you want to delete "${this.getFileName(uri)}"?`,
                detail: 'This action cannot be undone. The file will be permanently deleted.',
                confirmLabel: 'Delete',
                cancelLabel: 'Cancel',
                destructive: true
            });
            if (!confirmed) {
                return { success: false, error: 'User cancelled' };
            }
        }
        try {
            // Placeholder - actual implementation would delete file
            this.removeFromRecentFiles(uri);
            this.recordOperation({
                type: 'delete',
                uri,
                timestamp: Date.now(),
                success: true
            });
            return { success: true };
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            this.recordOperation({
                type: 'delete',
                uri,
                timestamp: Date.now(),
                success: false,
                error: errorMsg
            });
            return { success: false, error: errorMsg };
        }
    }
    /**
     * Move file
     */
    async moveFile(oldUri, newUri, skipConfirmation = false) {
        if (!skipConfirmation) {
            const confirmed = await this.showConfirmation({
                title: 'Move File',
                message: `Move "${this.getFileName(oldUri)}" to "${this.getDirectoryName(newUri)}"?`,
                confirmLabel: 'Move',
                cancelLabel: 'Cancel'
            });
            if (!confirmed) {
                return { success: false, error: 'User cancelled' };
            }
        }
        try {
            // Placeholder - actual implementation would move file
            this.updateRecentFile(oldUri, newUri);
            this.recordOperation({
                type: 'move',
                uri: oldUri,
                newUri,
                timestamp: Date.now(),
                success: true
            });
            return { success: true };
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            this.recordOperation({
                type: 'move',
                uri: oldUri,
                newUri,
                timestamp: Date.now(),
                success: false,
                error: errorMsg
            });
            return { success: false, error: errorMsg };
        }
    }
    /**
     * Copy file
     */
    async copyFile(sourceUri, targetUri) {
        try {
            // Placeholder - actual implementation would copy file
            this.recordOperation({
                type: 'copy',
                uri: sourceUri,
                newUri: targetUri,
                timestamp: Date.now(),
                success: true
            });
            return { success: true };
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            this.recordOperation({
                type: 'copy',
                uri: sourceUri,
                newUri: targetUri,
                timestamp: Date.now(),
                success: false,
                error: errorMsg
            });
            return { success: false, error: errorMsg };
        }
    }
    /**
     * Get recent files
     */
    getRecentFiles() {
        return [...this.recentFiles].sort((a, b) => {
            // Pinned files first
            if (a.pinned && !b.pinned)
                return -1;
            if (!a.pinned && b.pinned)
                return 1;
            // Then by last opened
            return b.lastOpened - a.lastOpened;
        });
    }
    /**
     * Pin/unpin file
     */
    togglePinFile(uri) {
        const file = this.recentFiles.find(f => f.uri === uri);
        if (file) {
            file.pinned = !file.pinned;
        }
    }
    /**
     * Clear recent files
     */
    clearRecentFiles() {
        this.recentFiles = this.recentFiles.filter(f => f.pinned);
    }
    /**
     * Get operation history
     */
    getOperationHistory() {
        return [...this.operationHistory];
    }
    /**
     * Clear operation history
     */
    clearOperationHistory() {
        this.operationHistory = [];
    }
    /**
     * Show confirmation dialog
     */
    async showConfirmation(options) {
        // Placeholder - actual implementation would show modal dialog
        // For now, return true to allow operations
        console.log('Confirmation:', options);
        return true;
    }
    /**
     * Add file to recent files
     */
    addToRecentFiles(uri) {
        const existing = this.recentFiles.find(f => f.uri === uri);
        if (existing) {
            existing.lastOpened = Date.now();
        }
        else {
            this.recentFiles.unshift({
                uri,
                name: this.getFileName(uri),
                lastOpened: Date.now(),
                pinned: false
            });
            // Keep only MAX_RECENT_FILES
            if (this.recentFiles.length > this.MAX_RECENT_FILES) {
                this.recentFiles = this.recentFiles
                    .filter(f => f.pinned)
                    .concat(this.recentFiles
                    .filter(f => !f.pinned)
                    .slice(0, this.MAX_RECENT_FILES - this.recentFiles.filter(f => f.pinned).length));
            }
        }
    }
    /**
     * Update recent file URI
     */
    updateRecentFile(oldUri, newUri) {
        const file = this.recentFiles.find(f => f.uri === oldUri);
        if (file) {
            file.uri = newUri;
            file.name = this.getFileName(newUri);
        }
    }
    /**
     * Remove file from recent files
     */
    removeFromRecentFiles(uri) {
        this.recentFiles = this.recentFiles.filter(f => f.uri !== uri);
    }
    /**
     * Record file operation
     */
    recordOperation(operation) {
        this.operationHistory.unshift(operation);
        // Keep only MAX_HISTORY operations
        if (this.operationHistory.length > this.MAX_HISTORY) {
            this.operationHistory = this.operationHistory.slice(0, this.MAX_HISTORY);
        }
    }
    /**
     * Get file name from URI
     */
    getFileName(uri) {
        return uri.split('/').pop() || uri;
    }
    /**
     * Get directory name from URI
     */
    getDirectoryName(uri) {
        const parts = uri.split('/');
        parts.pop();
        return parts.join('/') || '/';
    }
    /**
     * Get operation statistics
     */
    getStatistics() {
        const operationsByType = {};
        let successfulOperations = 0;
        let failedOperations = 0;
        for (const op of this.operationHistory) {
            operationsByType[op.type] = (operationsByType[op.type] || 0) + 1;
            if (op.success) {
                successfulOperations++;
            }
            else {
                failedOperations++;
            }
        }
        return {
            totalOperations: this.operationHistory.length,
            successfulOperations,
            failedOperations,
            operationsByType,
            recentFilesCount: this.recentFiles.length,
            pinnedFilesCount: this.recentFiles.filter(f => f.pinned).length
        };
    }
};
exports.FileOperationsService = FileOperationsService;
exports.FileOperationsService = FileOperationsService = __decorate([
    (0, inversify_1.injectable)()
], FileOperationsService);
