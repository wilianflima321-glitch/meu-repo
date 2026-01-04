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
export declare class FileOperationsService {
    private recentFiles;
    private operationHistory;
    private readonly MAX_RECENT_FILES;
    private readonly MAX_HISTORY;
    /**
     * Create new file
     */
    createFile(uri: string, content?: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Open file
     */
    openFile(uri: string): Promise<{
        success: boolean;
        content?: string;
        error?: string;
    }>;
    /**
     * Rename file with confirmation
     */
    renameFile(oldUri: string, newUri: string, skipConfirmation?: boolean): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Delete file with confirmation
     */
    deleteFile(uri: string, skipConfirmation?: boolean): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Move file
     */
    moveFile(oldUri: string, newUri: string, skipConfirmation?: boolean): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Copy file
     */
    copyFile(sourceUri: string, targetUri: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Get recent files
     */
    getRecentFiles(): RecentFile[];
    /**
     * Pin/unpin file
     */
    togglePinFile(uri: string): void;
    /**
     * Clear recent files
     */
    clearRecentFiles(): void;
    /**
     * Get operation history
     */
    getOperationHistory(): FileOperation[];
    /**
     * Clear operation history
     */
    clearOperationHistory(): void;
    /**
     * Show confirmation dialog
     */
    private showConfirmation;
    /**
     * Add file to recent files
     */
    private addToRecentFiles;
    /**
     * Update recent file URI
     */
    private updateRecentFile;
    /**
     * Remove file from recent files
     */
    private removeFromRecentFiles;
    /**
     * Record file operation
     */
    private recordOperation;
    /**
     * Get file name from URI
     */
    private getFileName;
    /**
     * Get directory name from URI
     */
    private getDirectoryName;
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
    };
}
