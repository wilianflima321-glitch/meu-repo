import { logger } from '@/lib/observability/logger';
import { EventEmitter } from 'events';

import { performWorkspaceFileOperation } from './workspace-file-backend';
import { createWorkspaceFolder, deleteWorkspaceFolder, fileInfoFromStatResponse, listWorkspaceFolder, listWorkspaceFolderRecursive } from './workspace-folder-operations';
import { getWorkspaceConfigurationFromMaps } from './workspace-configuration';
import {
  createDefaultWorkspaceConfiguration,
  extractWorkspaceFolderName,
  matchesWorkspacePattern,
  normalizeWorkspaceUri,
} from './workspace-service.helpers';
import { runWorkspaceSearch } from './workspace-search-runner';
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
      return fileInfoFromStatResponse(normalizedUri, response);
    } catch (error) {
      throw this.createFileError('STAT_ERROR', `Failed to get file info: ${normalizedUri}`, error);
    }
  }

  public async createFolder(uri: string): Promise<void> {
    const normalizedUri = await createWorkspaceFolder(uri);
    this.emitFileChange('created', normalizedUri);
  }

  public async deleteFolder(uri: string, recursive = false): Promise<void> {
    const normalizedUri = await deleteWorkspaceFolder(uri, recursive, fileUri => this.deleteFile(fileUri));
    this.emitFileChange('deleted', normalizedUri);
  }

  public async listFolder(uri: string): Promise<FileInfo[]> {
    return listWorkspaceFolder(uri);
  }

  public async listFolderRecursive(uri: string, maxDepth = 10): Promise<FileInfo[]> {
    return listWorkspaceFolderRecursive(uri, maxDepth);
  }

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

  public getConfiguration(section?: string): WorkspaceConfiguration {
    return getWorkspaceConfigurationFromMaps(
      this.configurations,
      section,
      payload => this.emit('configurationChanged', payload),
    );
  }

  public async updateConfiguration(
    section: string,
    key: string,
    value: unknown
  ): Promise<void> {
    const config = this.getConfiguration(section);
    await config.update(key, value);
  }

  public async search(options: SearchOptions): Promise<SearchResult[]> {
    return runWorkspaceSearch(
      options,
      this.getWorkspaceFolders(),
      uri => this.listFolderRecursive(uri),
      uri => this.readFile(uri),
    );
  }

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

  private createFileError(code: string, message: string, cause?: unknown): WorkspaceError {
    return new WorkspaceError(code, message, cause);
  }

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

export const workspaceService = new WorkspaceService();

export default workspaceService;
