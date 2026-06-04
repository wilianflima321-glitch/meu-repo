import { logger } from '@/lib/observability/logger';
/**
 * Workspace API Service
 * Complete workspace management for the Aethel Engine IDE
 */

import { EventEmitter } from 'events';

import { performWorkspaceFileOperation } from './workspace-file-backend';
import {
  createDefaultWorkspaceConfiguration,
  extractWorkspaceFileName,
  extractWorkspaceFolderName,
  matchesWorkspacePattern,
  normalizeWorkspaceUri,
} from './workspace-service.helpers';
import { buildSearchRegex, findMatches, matchesSearchPattern } from './workspace-search';
import {
  clearRecentFilesState,
  getRecentFilesState,
  pinRecentFileState,
  trackRecentFileState,
  transferRecentState,
  unpinRecentFileState,
  markDirtyState,
  updateDirtyContentState,
  transferDirtyState,
} from './workspace-service-state';
import { WorkspaceError } from './workspace-service.types';
import type {
  ConfigurationInspect,
  DirtyFile,
  FileChangeEvent,
  FileInfo,
  FileOperationOptions,
  FileWatcher,
  RecentFile,
  SearchOptions,
  SearchResult,
  WatcherEntry,
  WorkspaceConfiguration,
  WorkspaceFolder,
} from './workspace-service.types';

export type {
  ConfigurationInspect,
  DirtyFile,
  FileChangeEvent,
  FileInfo,
  FileOperationOptions,
  FileWatcher,
  RecentFile,
  SearchMatch,
  SearchOptions,
  SearchResult,
  WatcherEntry,
  WorkspaceConfiguration,
  WorkspaceFolder,
} from './workspace-service.types';
export { WorkspaceError } from './workspace-service.types';

export class WorkspaceService extends EventEmitter {
  private workspaceFolders: Map<string, WorkspaceFolder> = new Map();
  private fileWatchers: Map<string, WatcherEntry> = new Map();
  private recentFiles: Map<string, RecentFile> = new Map();
  private dirtyFiles: Map<string, DirtyFile> = new Map();
  private configurations: Map<string, Map<string, unknown>> = new Map();
  private watcherIdCounter = 0;
  private readonly debounceDelay = 100;
  private readonly maxRecentFiles = 50;
  private fileCache: Map<string, { content: string; timestamp: number }> = new Map();
  private readonly cacheTTL = 5000;

  constructor() {
    super();
    this.setMaxListeners(100);
    this.configurations.set('default', createDefaultWorkspaceConfiguration());
  }

  // ==========================================================================
  // Workspace Folder Management
  // ==========================================================================

  public addWorkspaceFolder(uri: string, name?: string): WorkspaceFolder {
    const existingFolder = this.workspaceFolders.get(uri);
    if (existingFolder) {
      return existingFolder;
    }

    const folder: WorkspaceFolder = {
      uri: normalizeWorkspaceUri(uri),
      name: name || extractWorkspaceFolderName(uri),
      index: this.workspaceFolders.size,
    };

    this.workspaceFolders.set(folder.uri, folder);
    this.emit('workspaceFoldersChanged', this.getWorkspaceFolders());
    return folder;
  }

  public removeWorkspaceFolder(uri: string): boolean {
    const normalizedUri = normalizeWorkspaceUri(uri);
    const removed = this.workspaceFolders.delete(normalizedUri);

    if (removed) {
      this.reindexFolders();
      this.emit('workspaceFoldersChanged', this.getWorkspaceFolders());
    }

    return removed;
  }

  public getWorkspaceFolders(): WorkspaceFolder[] {
    return Array.from(this.workspaceFolders.values()).sort((a, b) => a.index - b.index);
  }

  public getWorkspaceFolder(uri: string): WorkspaceFolder | undefined {
    const normalizedUri = normalizeWorkspaceUri(uri);

    for (const folder of this.workspaceFolders.values()) {
      if (normalizedUri.startsWith(folder.uri)) {
        return folder;
      }
    }

    return undefined;
  }

  public isMultiRootWorkspace(): boolean {
    return this.workspaceFolders.size > 1;
  }

  private reindexFolders(): void {
    let index = 0;
    for (const folder of this.workspaceFolders.values()) {
      folder.index = index++;
    }
  }
// ==========================================================================
  // File Operations
  // ==========================================================================

  public async readFile(uri: string): Promise<string> {
    const normalizedUri = normalizeWorkspaceUri(uri);

    const cached = this.fileCache.get(normalizedUri);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.content;
    }

    try {
      const response = await performWorkspaceFileOperation('read', normalizedUri);
      const content = response.content;

      this.fileCache.set(normalizedUri, { content, timestamp: Date.now() });
      this.trackRecentFile(normalizedUri);

      return content;
    } catch (error) {
      throw this.createFileError('READ_ERROR', `Failed to read file: ${normalizedUri}`, error);
    }
  }

  public async writeFile(
    uri: string,
    content: string,
    options: FileOperationOptions = {}
  ): Promise<void> {
    const normalizedUri = normalizeWorkspaceUri(uri);

    try {
      const exists = await this.fileExists(normalizedUri);

      if (exists && !options.overwrite) {
        throw this.createFileError('FILE_EXISTS', `File already exists: ${normalizedUri}`);
      }

      await performWorkspaceFileOperation('write', normalizedUri, { content });

      this.fileCache.set(normalizedUri, { content, timestamp: Date.now() });
      this.clearDirtyFile(normalizedUri);
      this.trackRecentFile(normalizedUri);

      this.emitFileChange(exists ? 'changed' : 'created', normalizedUri);
    } catch (error) {
      if (error instanceof WorkspaceError) throw error;
      throw this.createFileError('WRITE_ERROR', `Failed to write file: ${normalizedUri}`, error);
    }
  }

  public async deleteFile(uri: string): Promise<void> {
    const normalizedUri = normalizeWorkspaceUri(uri);

    try {
      await performWorkspaceFileOperation('delete', normalizedUri);

      this.fileCache.delete(normalizedUri);
      this.dirtyFiles.delete(normalizedUri);
      this.recentFiles.delete(normalizedUri);

      this.emitFileChange('deleted', normalizedUri);
    } catch (error) {
      throw this.createFileError('DELETE_ERROR', `Failed to delete file: ${normalizedUri}`, error);
    }
  }

  public async renameFile(
    oldUri: string,
    newUri: string,
    options: FileOperationOptions = {}
  ): Promise<void> {
    const normalizedOldUri = normalizeWorkspaceUri(oldUri);
    const normalizedNewUri = normalizeWorkspaceUri(newUri);

    try {
      const exists = await this.fileExists(normalizedNewUri);

      if (exists && !options.overwrite) {
        throw this.createFileError('FILE_EXISTS', `Target file already exists: ${normalizedNewUri}`);
      }

      await performWorkspaceFileOperation('rename', normalizedOldUri, { newUri: normalizedNewUri });

      const cached = this.fileCache.get(normalizedOldUri);
      if (cached) {
        this.fileCache.set(normalizedNewUri, cached);
        this.fileCache.delete(normalizedOldUri);
      }

      transferDirtyState(this.dirtyFiles, normalizedOldUri, normalizedNewUri);
      transferRecentState(this.recentFiles, normalizedOldUri, normalizedNewUri);

      this.emitFileChange('deleted', normalizedOldUri);
      this.emitFileChange('created', normalizedNewUri);
    } catch (error) {
      if (error instanceof WorkspaceError) throw error;
      throw this.createFileError('RENAME_ERROR', `Failed to rename file: ${normalizedOldUri}`, error);
    }
  }

  public async copyFile(
    sourceUri: string,
    targetUri: string,
    options: FileOperationOptions = {}
  ): Promise<void> {
    const normalizedSource = normalizeWorkspaceUri(sourceUri);
    const normalizedTarget = normalizeWorkspaceUri(targetUri);

    try {
      const exists = await this.fileExists(normalizedTarget);

      if (exists && !options.overwrite) {
        throw this.createFileError('FILE_EXISTS', `Target file already exists: ${normalizedTarget}`);
      }

      const content = await this.readFile(normalizedSource);
      await this.writeFile(normalizedTarget, content, { overwrite: options.overwrite });
    } catch (error) {
      if (error instanceof WorkspaceError) throw error;
      throw this.createFileError('COPY_ERROR', `Failed to copy file: ${normalizedSource}`, error);
    }
  }

  public async fileExists(uri: string): Promise<boolean> {
    try {
      await this.getFileInfo(uri);
      return true;
    } catch {
      return false;
    }
  }

  public async getFileInfo(uri: string): Promise<FileInfo> {
    const normalizedUri = normalizeWorkspaceUri(uri);

    try {
      const response = await performWorkspaceFileOperation('stat', normalizedUri);
      return {
        name: extractWorkspaceFileName(normalizedUri),
        path: normalizedUri,
        isDirectory: response.isDirectory,
        size: response.size,
        modified: new Date(response.modified),
        created: response.created ? new Date(response.created) : undefined,
        readonly: response.readonly,
      };
    } catch (error) {
      throw this.createFileError('STAT_ERROR', `Failed to get file info: ${normalizedUri}`, error);
    }
  }
// ==========================================================================
  // Folder Operations
  // ==========================================================================

  public async createFolder(uri: string): Promise<void> {
    const normalizedUri = normalizeWorkspaceUri(uri);

    try {
      await performWorkspaceFileOperation('mkdir', normalizedUri);
      this.emitFileChange('created', normalizedUri);
    } catch (error) {
      throw this.createFileError('MKDIR_ERROR', `Failed to create folder: ${normalizedUri}`, error);
    }
  }

  public async deleteFolder(uri: string, recursive = false): Promise<void> {
    const normalizedUri = normalizeWorkspaceUri(uri);

    try {
      if (recursive) {
        const entries = await this.listFolder(normalizedUri);

        for (const entry of entries) {
          if (entry.isDirectory) {
            await this.deleteFolder(entry.path, true);
          } else {
            await this.deleteFile(entry.path);
          }
        }
      }

      await performWorkspaceFileOperation('rmdir', normalizedUri);
      this.emitFileChange('deleted', normalizedUri);
    } catch (error) {
      if (error instanceof WorkspaceError) throw error;
      throw this.createFileError('RMDIR_ERROR', `Failed to delete folder: ${normalizedUri}`, error);
    }
  }

  public async listFolder(uri: string): Promise<FileInfo[]> {
    const normalizedUri = normalizeWorkspaceUri(uri);

    try {
      const response = await performWorkspaceFileOperation('readdir', normalizedUri);

      return response.entries.map((entry: { name: string; isDirectory: boolean; size: number; modified: string }) => ({
        name: entry.name,
        path: `${normalizedUri}/${entry.name}`,
        isDirectory: entry.isDirectory,
        size: entry.size,
        modified: new Date(entry.modified),
      }));
    } catch (error) {
      throw this.createFileError('READDIR_ERROR', `Failed to list folder: ${normalizedUri}`, error);
    }
  }

  public async listFolderRecursive(uri: string, maxDepth = 10): Promise<FileInfo[]> {
    const results: FileInfo[] = [];

    const traverse = async (currentUri: string, depth: number): Promise<void> => {
      if (depth > maxDepth) return;

      const entries = await this.listFolder(currentUri);

      for (const entry of entries) {
        results.push(entry);

        if (entry.isDirectory) {
          await traverse(entry.path, depth + 1);
        }
      }
    };

    await traverse(normalizeWorkspaceUri(uri), 0);
    return results;
  }

  // ==========================================================================
  // File Watching
  // ==========================================================================

  public watch(pattern: string, recursive = true): FileWatcher {
    const watcherId = `watcher_${++this.watcherIdCounter}`;

    const callbacks = {
      change: new Set<(event: FileChangeEvent) => void>(),
      create: new Set<(event: FileChangeEvent) => void>(),
      delete: new Set<(event: FileChangeEvent) => void>(),
    };

    const watcher: FileWatcher = {
      id: watcherId,
      pattern,
      recursive,
      onDidChange: (callback) => {
        callbacks.change.add(callback);
      },
      onDidCreate: (callback) => {
        callbacks.create.add(callback);
      },
      onDidDelete: (callback) => {
        callbacks.delete.add(callback);
      },
      dispose: () => {
        this.unwatch(watcherId);
      },
    };

    this.fileWatchers.set(watcherId, { watcher, callbacks });
    this.emit('watcherCreated', watcher);

    return watcher;
  }

  public unwatch(watcherId: string): boolean {
    const entry = this.fileWatchers.get(watcherId);

    if (entry) {
      if (entry.debounceTimer) {
        clearTimeout(entry.debounceTimer);
      }

      entry.callbacks.change.clear();
      entry.callbacks.create.clear();
      entry.callbacks.delete.clear();

      this.fileWatchers.delete(watcherId);
      this.emit('watcherDisposed', watcherId);

      return true;
    }

    return false;
  }

  public getActiveWatchers(): FileWatcher[] {
    return Array.from(this.fileWatchers.values()).map(entry => entry.watcher);
  }

  private emitFileChange(type: FileChangeEvent['type'], uri: string): void {
    const event: FileChangeEvent = {
      type,
      uri,
      timestamp: new Date(),
    };

    this.emit('fileChanged', event);

    for (const entry of this.fileWatchers.values()) {
      if (matchesWorkspacePattern(uri, entry.watcher.pattern)) {
        if (entry.debounceTimer) {
          clearTimeout(entry.debounceTimer);
        }

        entry.debounceTimer = setTimeout(() => {
          const callbackSet = type === 'created'
            ? entry.callbacks.create
            : type === 'deleted'
              ? entry.callbacks.delete
              : entry.callbacks.change;

          for (const callback of callbackSet) {
            try {
              callback(event);
            } catch (error) {
              logger.error('Watcher callback error:', error);
            }
          }
        }, this.debounceDelay);
      }
    }
  }
// ==========================================================================
  // Configuration Management
  // ==========================================================================

  public getConfiguration(section?: string): WorkspaceConfiguration {
    const configMap = this.configurations.get(section || 'default') || new Map();

    return {
      get: <T>(key: string, defaultValue?: T): T | undefined => {
        const value = configMap.get(key);
        return value !== undefined ? (value as T) : defaultValue;
      },
      has: (key: string): boolean => {
        return configMap.has(key);
      },
      update: async (key: string, value: unknown, global = false): Promise<void> => {
        const targetSection = global ? 'global' : (section || 'default');
        let targetMap = this.configurations.get(targetSection);

        if (!targetMap) {
          targetMap = new Map();
          this.configurations.set(targetSection, targetMap);
        }

        targetMap.set(key, value);
        this.emit('configurationChanged', { section: targetSection, key, value });
      },
      inspect: <T>(key: string): ConfigurationInspect<T> | undefined => {
        const globalConfig = this.configurations.get('global');
        const workspaceConfig = this.configurations.get('default');
        const sectionConfig = section ? this.configurations.get(section) : undefined;

        return {
          key,
          defaultValue: undefined,
          globalValue: globalConfig?.get(key) as T | undefined,
          workspaceValue: workspaceConfig?.get(key) as T | undefined,
          workspaceFolderValue: sectionConfig?.get(key) as T | undefined,
        };
      },
    };
  }

  public async updateConfiguration(
    section: string,
    key: string,
    value: unknown
  ): Promise<void> {
    const config = this.getConfiguration(section);
    await config.update(key, value);
  }
// ==========================================================================
  // Search Operations
  // ==========================================================================

  public async search(options: SearchOptions): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const folders = this.getWorkspaceFolders();

    if (folders.length === 0) {
      return results;
    }

    const searchRegex = buildSearchRegex(options);
    let totalMatches = 0;
    const maxResults = options.maxResults || 1000;

    for (const folder of folders) {
      if (totalMatches >= maxResults) break;

      try {
        const files = await this.listFolderRecursive(folder.uri);

        for (const file of files) {
          if (totalMatches >= maxResults) break;
          if (file.isDirectory) continue;
          if (!matchesSearchPattern(file.path, options.includePattern, options.excludePattern, matchesWorkspacePattern)) {
            continue;
          }

          try {
            const content = await this.readFile(file.path);
            const matches = findMatches(content, searchRegex);

            if (matches.length > 0) {
              results.push({ uri: file.path, matches });
              totalMatches += matches.length;
            }
          } catch {
            // Skip files that can't be read
          }
        }
      } catch {
        // Skip folders that can't be listed
      }
    }

    return results;
  }

  // ==========================================================================
  // Recent Files Tracking
  // ==========================================================================

  public trackRecentFile(uri: string, pinned = false): void {
    trackRecentFileState(this.recentFiles, uri, pinned, this.maxRecentFiles);
    this.emit('recentFilesChanged', this.getRecentFiles());
  }

  public getRecentFiles(limit?: number): RecentFile[] {
    return getRecentFilesState(this.recentFiles, limit);
  }

  public clearRecentFiles(): void {
    clearRecentFilesState(this.recentFiles);
    this.emit('recentFilesChanged', this.getRecentFiles());
  }

  public pinRecentFile(uri: string): void {
    if (pinRecentFileState(this.recentFiles, uri)) {
      this.emit('recentFilesChanged', this.getRecentFiles());
    }
  }

  public unpinRecentFile(uri: string): void {
    if (unpinRecentFileState(this.recentFiles, uri)) {
      this.emit('recentFilesChanged', this.getRecentFiles());
    }
  }

  // ==========================================================================
  // Dirty Files Tracking
  // ==========================================================================

  public markDirty(uri: string, originalContent: string, currentContent: string): void {
    markDirtyState(this.dirtyFiles, uri, originalContent, currentContent);
    this.emit('dirtyFilesChanged', this.getDirtyFiles());
  }

  public updateDirtyContent(uri: string, currentContent: string): void {
    if (updateDirtyContentState(this.dirtyFiles, uri, currentContent)) {
      this.emit('dirtyFilesChanged', this.getDirtyFiles());
    }
  }

  public clearDirtyFile(uri: string): void {
    const normalizedUri = normalizeWorkspaceUri(uri);

    if (this.dirtyFiles.delete(normalizedUri)) {
      this.emit('dirtyFilesChanged', this.getDirtyFiles());
    }
  }

  public getDirtyFiles(): DirtyFile[] {
    return Array.from(this.dirtyFiles.values());
  }

  public isDirty(uri: string): boolean {
    return this.dirtyFiles.has(normalizeWorkspaceUri(uri));
  }

  public hasUnsavedChanges(): boolean {
    return this.dirtyFiles.size > 0;
  }

  public async revertFile(uri: string): Promise<void> {
    const normalizedUri = normalizeWorkspaceUri(uri);
    const dirty = this.dirtyFiles.get(normalizedUri);

    if (dirty) {
      await this.writeFile(normalizedUri, dirty.originalContent, { overwrite: true });
      this.clearDirtyFile(normalizedUri);
    }
  }

  // ==========================================================================
  // Internal Helpers
  // ==========================================================================

  private createFileError(code: string, message: string, cause?: unknown): WorkspaceError {
    return new WorkspaceError(code, message, cause);
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  public dispose(): void {
    for (const entry of this.fileWatchers.values()) {
      if (entry.debounceTimer) {
        clearTimeout(entry.debounceTimer);
      }
    }

    this.fileWatchers.clear();
    this.fileCache.clear();
    this.dirtyFiles.clear();
    this.recentFiles.clear();
    this.configurations.clear();
    this.workspaceFolders.clear();

    this.removeAllListeners();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const workspaceService = new WorkspaceService();

export default workspaceService;
