import { injectable } from 'inversify';
import { nls } from '../../common/nls';

/**
 * File Operations Service
 * Professional file management with confirmations and history
 */

export interface FileOperation {
    type: 'create' | 'open' | 'rename' | 'delete' | 'move' | 'copy';
    uri: string;
    newUri?: string;
    timestamp: number;
    success: boolean;
    error?: string;
}

export interface RecentFile {
    uri: string;
    name: string;
    lastOpened: number;
    pinned: boolean;
}

export interface ConfirmationOptions {
    title: string;
    message: string;
    detail?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
}

@injectable()
export class FileOperationsService {
    private recentFiles: RecentFile[] = [];
    private operationHistory: FileOperation[] = [];
    private readonly MAX_RECENT_FILES = 20;
    private readonly MAX_HISTORY = 100;

    /**
     * Create new file
     */
    async createFile(uri: string, content: string = ''): Promise<{ success: boolean; error?: string }> {
        try {
            // Placeholder - actual implementation would use file system API
            this.recordOperation({
                type: 'create',
                uri,
                timestamp: Date.now(),
                success: true
            });

            return { success: true };
        } catch (error) {
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
    async openFile(uri: string): Promise<{ success: boolean; content?: string; error?: string }> {
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
        } catch (error) {
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
    async renameFile(
        oldUri: string,
        newUri: string,
        skipConfirmation: boolean = false
    ): Promise<{ success: boolean; error?: string }> {
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
        } catch (error) {
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
    async deleteFile(
        uri: string,
        skipConfirmation: boolean = false
    ): Promise<{ success: boolean; error?: string }> {
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
        } catch (error) {
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
    async moveFile(
        oldUri: string,
        newUri: string,
        skipConfirmation: boolean = false
    ): Promise<{ success: boolean; error?: string }> {
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
        } catch (error) {
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
    async copyFile(
        sourceUri: string,
        targetUri: string
    ): Promise<{ success: boolean; error?: string }> {
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
        } catch (error) {
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
    getRecentFiles(): RecentFile[] {
        return [...this.recentFiles].sort((a, b) => {
            // Pinned files first
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            // Then by last opened
            return b.lastOpened - a.lastOpened;
        });
    }

    /**
     * Pin/unpin file
     */
    togglePinFile(uri: string): void {
        const file = this.recentFiles.find(f => f.uri === uri);
        if (file) {
            file.pinned = !file.pinned;
        }
    }

    /**
     * Clear recent files
     */
    clearRecentFiles(): void {
        this.recentFiles = this.recentFiles.filter(f => f.pinned);
    }

    /**
     * Get operation history
     */
    getOperationHistory(): FileOperation[] {
        return [...this.operationHistory];
    }

    /**
     * Clear operation history
     */
    clearOperationHistory(): void {
        this.operationHistory = [];
    }

    /**
     * Show confirmation dialog
     */
    private async showConfirmation(options: ConfirmationOptions): Promise<boolean> {
        // Placeholder - actual implementation would show modal dialog
        // For now, return true to allow operations
        console.log('Confirmation:', options);
        return true;
    }

    /**
     * Add file to recent files
     */
    private addToRecentFiles(uri: string): void {
        const existing = this.recentFiles.find(f => f.uri === uri);
        
        if (existing) {
            existing.lastOpened = Date.now();
        } else {
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
                    .concat(
                        this.recentFiles
                            .filter(f => !f.pinned)
                            .slice(0, this.MAX_RECENT_FILES - this.recentFiles.filter(f => f.pinned).length)
                    );
            }
        }
    }

    /**
     * Update recent file URI
     */
    private updateRecentFile(oldUri: string, newUri: string): void {
        const file = this.recentFiles.find(f => f.uri === oldUri);
        if (file) {
            file.uri = newUri;
            file.name = this.getFileName(newUri);
        }
    }

    /**
     * Remove file from recent files
     */
    private removeFromRecentFiles(uri: string): void {
        this.recentFiles = this.recentFiles.filter(f => f.uri !== uri);
    }

    /**
     * Record file operation
     */
    private recordOperation(operation: FileOperation): void {
        this.operationHistory.unshift(operation);

        // Keep only MAX_HISTORY operations
        if (this.operationHistory.length > this.MAX_HISTORY) {
            this.operationHistory = this.operationHistory.slice(0, this.MAX_HISTORY);
        }
    }

    /**
     * Get file name from URI
     */
    private getFileName(uri: string): string {
        return uri.split('/').pop() || uri;
    }

    /**
     * Get directory name from URI
     */
    private getDirectoryName(uri: string): string {
        const parts = uri.split('/');
        parts.pop();
        return parts.join('/') || '/';
    }

    /**
     * Get operation statistics
     */
    getStatistics(): {
        totalOperations: number;
        successfulOperations: number;
        failedOperations: number;
        operationsByType: Record<string, number>;
        recentFilesCount: number;
        pinnedFilesCount: number;
    } {
        const operationsByType: Record<string, number> = {};
        let successfulOperations = 0;
        let failedOperations = 0;

        for (const op of this.operationHistory) {
            operationsByType[op.type] = (operationsByType[op.type] || 0) + 1;
            if (op.success) {
                successfulOperations++;
            } else {
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
}
