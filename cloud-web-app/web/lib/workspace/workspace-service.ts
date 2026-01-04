/**
 * Workspace API Service
 * Complete workspace management for the Aethel Engine IDE
 */

import { EventEmitter } from 'events';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface WorkspaceFolder {
  uri: string;
  name: string;
  index: number;
}

export interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: Date;
  created?: Date;
  readonly?: boolean;
}

export interface FileChangeEvent {
  type: 'created' | 'changed' | 'deleted';
  uri: string;
  timestamp: Date;
}

export interface FileWatcher {
  id: string;
  pattern: string;
  recursive: boolean;
  onDidChange: (callback: (event: FileChangeEvent) => void) => void;
  onDidCreate: (callback: (event: FileChangeEvent) => void) => void;
  onDidDelete: (callback: (event: FileChangeEvent) => void) => void;
  dispose: () => void;
}

export interface WorkspaceConfiguration {
  get<T>(key: string, defaultValue?: T): T | undefined;
  has(key: string): boolean;
  update(key: string, value: unknown, global?: boolean): Promise<void>;
  inspect<T>(key: string): ConfigurationInspect<T> | undefined;
}

export interface ConfigurationInspect<T> {
  key: string;
  defaultValue?: T;
  globalValue?: T;
  workspaceValue?: T;
  workspaceFolderValue?: T;
}

export interface SearchOptions {
  query: string;
  includePattern?: string;
  excludePattern?: string;
  maxResults?: number;
  caseSensitive?: boolean;
  wholeWord?: boolean;
  useRegex?: boolean;
}

export interface SearchResult {
  uri: string;
  matches: SearchMatch[];
}

export interface SearchMatch {
  line: number;
  column: number;
  length: number;
  text: string;
  preview: string;
}

export interface RecentFile {
  uri: string;
  name: string;
  lastAccessed: Date;
  pinned: boolean;
}

export interface DirtyFile {
  uri: string;
  originalContent: string;
  currentContent: string;
  lastModified: Date;
}

export interface FileOperationOptions {
  overwrite?: boolean;
  recursive?: boolean;
  preserveTimestamps?: boolean;
}

export interface WatcherEntry {
  watcher: FileWatcher;
  callbacks: {
    change: Set<(event: FileChangeEvent) => void>;
    create: Set<(event: FileChangeEvent) => void>;
    delete: Set<(event: FileChangeEvent) => void>;
  };
  debounceTimer?: ReturnType<typeof setTimeout>;
}

// ============================================================================
// WorkspaceService Class
// ============================================================================

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
    this.initializeDefaultConfiguration();
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
      uri: this.normalizeUri(uri),
      name: name || this.extractFolderName(uri),
      index: this.workspaceFolders.size,
    };

    this.workspaceFolders.set(folder.uri, folder);
    this.emit('workspaceFoldersChanged', this.getWorkspaceFolders());
    return folder;
  }

  public removeWorkspaceFolder(uri: string): boolean {
    const normalizedUri = this.normalizeUri(uri);
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
    const normalizedUri = this.normalizeUri(uri);
    
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

  private extractFolderName(uri: string): string {
    const parts = uri.replace(/\\/g, '/').split('/').filter(Boolean);
    return parts[parts.length - 1] || 'workspace';
  }

  private normalizeUri(uri: string): string {
    return uri.replace(/\\/g, '/').replace(/\/+$/, '');
  }

  // ==========================================================================
  // File Operations
  // ==========================================================================

  public async readFile(uri: string): Promise<string> {
    const normalizedUri = this.normalizeUri(uri);
    
    const cached = this.fileCache.get(normalizedUri);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.content;
    }

    try {
      const response = await this.performFileOperation('read', normalizedUri);
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
    const normalizedUri = this.normalizeUri(uri);

    try {
      const exists = await this.fileExists(normalizedUri);
      
      if (exists && !options.overwrite) {
        throw this.createFileError('FILE_EXISTS', `File already exists: ${normalizedUri}`);
      }

      await this.performFileOperation('write', normalizedUri, { content });
      
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
    const normalizedUri = this.normalizeUri(uri);

    try {
      await this.performFileOperation('delete', normalizedUri);
      
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
    const normalizedOldUri = this.normalizeUri(oldUri);
    const normalizedNewUri = this.normalizeUri(newUri);

    try {
      const exists = await this.fileExists(normalizedNewUri);
      
      if (exists && !options.overwrite) {
        throw this.createFileError('FILE_EXISTS', `Target file already exists: ${normalizedNewUri}`);
      }

      await this.performFileOperation('rename', normalizedOldUri, { newUri: normalizedNewUri });
      
      const cached = this.fileCache.get(normalizedOldUri);
      if (cached) {
        this.fileCache.set(normalizedNewUri, cached);
        this.fileCache.delete(normalizedOldUri);
      }
      
      this.transferDirtyState(normalizedOldUri, normalizedNewUri);
      this.transferRecentState(normalizedOldUri, normalizedNewUri);
      
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
    const normalizedSource = this.normalizeUri(sourceUri);
    const normalizedTarget = this.normalizeUri(targetUri);

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
    const normalizedUri = this.normalizeUri(uri);

    try {
      const response = await this.performFileOperation('stat', normalizedUri);
      return {
        name: this.extractFileName(normalizedUri),
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

  private extractFileName(uri: string): string {
    const parts = uri.split('/').filter(Boolean);
    return parts[parts.length - 1] || '';
  }

  // ==========================================================================
  // Folder Operations
  // ==========================================================================

  public async createFolder(uri: string): Promise<void> {
    const normalizedUri = this.normalizeUri(uri);

    try {
      await this.performFileOperation('mkdir', normalizedUri);
      this.emitFileChange('created', normalizedUri);
    } catch (error) {
      throw this.createFileError('MKDIR_ERROR', `Failed to create folder: ${normalizedUri}`, error);
    }
  }

  public async deleteFolder(uri: string, recursive = false): Promise<void> {
    const normalizedUri = this.normalizeUri(uri);

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

      await this.performFileOperation('rmdir', normalizedUri);
      this.emitFileChange('deleted', normalizedUri);
    } catch (error) {
      if (error instanceof WorkspaceError) throw error;
      throw this.createFileError('RMDIR_ERROR', `Failed to delete folder: ${normalizedUri}`, error);
    }
  }

  public async listFolder(uri: string): Promise<FileInfo[]> {
    const normalizedUri = this.normalizeUri(uri);

    try {
      const response = await this.performFileOperation('readdir', normalizedUri);
      
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

    await traverse(this.normalizeUri(uri), 0);
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
      if (this.matchPattern(uri, entry.watcher.pattern)) {
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
              console.error('Watcher callback error:', error);
            }
          }
        }, this.debounceDelay);
      }
    }
  }

  private matchPattern(uri: string, pattern: string): boolean {
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    return new RegExp(`^${regexPattern}$`, 'i').test(uri);
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

  private initializeDefaultConfiguration(): void {
    const defaults = new Map<string, unknown>([
      ['editor.tabSize', 2],
      ['editor.insertSpaces', true],
      ['editor.formatOnSave', true],
      ['files.autoSave', 'afterDelay'],
      ['files.autoSaveDelay', 1000],
      ['files.exclude', { '**/node_modules': true, '**/.git': true }],
      ['search.exclude', { '**/node_modules': true, '**/dist': true }],
    ]);

    this.configurations.set('default', defaults);
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

    const searchRegex = this.buildSearchRegex(options);
    let totalMatches = 0;
    const maxResults = options.maxResults || 1000;

    for (const folder of folders) {
      if (totalMatches >= maxResults) break;

      try {
        const files = await this.listFolderRecursive(folder.uri);
        
        for (const file of files) {
          if (totalMatches >= maxResults) break;
          if (file.isDirectory) continue;
          if (!this.matchSearchPattern(file.path, options.includePattern, options.excludePattern)) {
            continue;
          }

          try {
            const content = await this.readFile(file.path);
            const matches = this.findMatches(content, searchRegex, options);
            
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

  private buildSearchRegex(options: SearchOptions): RegExp {
    let pattern = options.useRegex ? options.query : this.escapeRegex(options.query);
    
    if (options.wholeWord) {
      pattern = `\\b${pattern}\\b`;
    }

    const flags = options.caseSensitive ? 'g' : 'gi';
    return new RegExp(pattern, flags);
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private matchSearchPattern(
    path: string,
    includePattern?: string,
    excludePattern?: string
  ): boolean {
    if (excludePattern && this.matchPattern(path, excludePattern)) {
      return false;
    }
    
    if (includePattern && !this.matchPattern(path, includePattern)) {
      return false;
    }
    
    return true;
  }

  private findMatches(content: string, regex: RegExp, _options: SearchOptions): SearchMatch[] {
    const matches: SearchMatch[] = [];
    const lines = content.split('\n');
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      let match: RegExpExecArray | null;
      
      regex.lastIndex = 0;
      
      while ((match = regex.exec(line)) !== null) {
        matches.push({
          line: lineIndex + 1,
          column: match.index + 1,
          length: match[0].length,
          text: match[0],
          preview: this.getLinePreview(line, match.index),
        });
      }
    }
    
    return matches;
  }

  private getLinePreview(line: string, matchIndex: number): string {
    const maxLength = 100;
    const start = Math.max(0, matchIndex - 20);
    const end = Math.min(line.length, start + maxLength);
    
    let preview = line.substring(start, end);
    
    if (start > 0) preview = '...' + preview;
    if (end < line.length) preview = preview + '...';
    
    return preview;
  }

  // ==========================================================================
  // Recent Files Tracking
  // ==========================================================================

  public trackRecentFile(uri: string, pinned = false): void {
    const normalizedUri = this.normalizeUri(uri);
    const name = this.extractFileName(normalizedUri);
    
    this.recentFiles.set(normalizedUri, {
      uri: normalizedUri,
      name,
      lastAccessed: new Date(),
      pinned,
    });

    this.pruneRecentFiles();
    this.emit('recentFilesChanged', this.getRecentFiles());
  }

  public getRecentFiles(limit?: number): RecentFile[] {
    const files = Array.from(this.recentFiles.values())
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return b.lastAccessed.getTime() - a.lastAccessed.getTime();
      });

    return limit ? files.slice(0, limit) : files;
  }

  public clearRecentFiles(): void {
    const pinnedFiles = Array.from(this.recentFiles.values()).filter(f => f.pinned);
    this.recentFiles.clear();
    
    for (const file of pinnedFiles) {
      this.recentFiles.set(file.uri, file);
    }
    
    this.emit('recentFilesChanged', this.getRecentFiles());
  }

  public pinRecentFile(uri: string): void {
    const normalizedUri = this.normalizeUri(uri);
    const file = this.recentFiles.get(normalizedUri);
    
    if (file) {
      file.pinned = true;
      this.emit('recentFilesChanged', this.getRecentFiles());
    }
  }

  public unpinRecentFile(uri: string): void {
    const normalizedUri = this.normalizeUri(uri);
    const file = this.recentFiles.get(normalizedUri);
    
    if (file) {
      file.pinned = false;
      this.emit('recentFilesChanged', this.getRecentFiles());
    }
  }

  private pruneRecentFiles(): void {
    const files = this.getRecentFiles();
    
    if (files.length > this.maxRecentFiles) {
      const unpinned = files.filter(f => !f.pinned);
      const toRemove = unpinned.slice(this.maxRecentFiles - files.filter(f => f.pinned).length);
      
      for (const file of toRemove) {
        this.recentFiles.delete(file.uri);
      }
    }
  }

  private transferRecentState(oldUri: string, newUri: string): void {
    const file = this.recentFiles.get(oldUri);
    
    if (file) {
      this.recentFiles.delete(oldUri);
      this.recentFiles.set(newUri, {
        ...file,
        uri: newUri,
        name: this.extractFileName(newUri),
      });
    }
  }

  // ==========================================================================
  // Dirty Files Tracking
  // ==========================================================================

  public markDirty(uri: string, originalContent: string, currentContent: string): void {
    const normalizedUri = this.normalizeUri(uri);
    
    this.dirtyFiles.set(normalizedUri, {
      uri: normalizedUri,
      originalContent,
      currentContent,
      lastModified: new Date(),
    });
    
    this.emit('dirtyFilesChanged', this.getDirtyFiles());
  }

  public updateDirtyContent(uri: string, currentContent: string): void {
    const normalizedUri = this.normalizeUri(uri);
    const dirty = this.dirtyFiles.get(normalizedUri);
    
    if (dirty) {
      dirty.currentContent = currentContent;
      dirty.lastModified = new Date();
      this.emit('dirtyFilesChanged', this.getDirtyFiles());
    }
  }

  public clearDirtyFile(uri: string): void {
    const normalizedUri = this.normalizeUri(uri);
    
    if (this.dirtyFiles.delete(normalizedUri)) {
      this.emit('dirtyFilesChanged', this.getDirtyFiles());
    }
  }

  public getDirtyFiles(): DirtyFile[] {
    return Array.from(this.dirtyFiles.values());
  }

  public isDirty(uri: string): boolean {
    return this.dirtyFiles.has(this.normalizeUri(uri));
  }

  public hasUnsavedChanges(): boolean {
    return this.dirtyFiles.size > 0;
  }

  public async revertFile(uri: string): Promise<void> {
    const normalizedUri = this.normalizeUri(uri);
    const dirty = this.dirtyFiles.get(normalizedUri);
    
    if (dirty) {
      await this.writeFile(normalizedUri, dirty.originalContent, { overwrite: true });
      this.clearDirtyFile(normalizedUri);
    }
  }

  private transferDirtyState(oldUri: string, newUri: string): void {
    const dirty = this.dirtyFiles.get(oldUri);
    
    if (dirty) {
      this.dirtyFiles.delete(oldUri);
      this.dirtyFiles.set(newUri, {
        ...dirty,
        uri: newUri,
      });
    }
  }

  // ==========================================================================
  // Internal Helpers
  // ==========================================================================

  private async performFileOperation(
    operation: string,
    uri: string,
    data?: Record<string, unknown>
  ): Promise<{ content: string; isDirectory: boolean; size: number; modified: string; created?: string; readonly?: boolean; entries: Array<{ name: string; isDirectory: boolean; size: number; modified: string }> }> {
    // In a real implementation, this would interface with the file system API
    // For now, we simulate the operation and emit appropriate events
    
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          switch (operation) {
            case 'read':
              resolve({ content: '', isDirectory: false, size: 0, modified: new Date().toISOString(), entries: [] });
              break;
            case 'write':
              resolve({ content: data?.content as string || '', isDirectory: false, size: 0, modified: new Date().toISOString(), entries: [] });
              break;
            case 'delete':
            case 'mkdir':
            case 'rmdir':
            case 'rename':
              resolve({ content: '', isDirectory: false, size: 0, modified: new Date().toISOString(), entries: [] });
              break;
            case 'stat':
              resolve({
                content: '',
                isDirectory: false,
                size: 1024,
                modified: new Date().toISOString(),
                created: new Date().toISOString(),
                readonly: false,
                entries: [],
              });
              break;
            case 'readdir':
              resolve({ content: '', isDirectory: true, size: 0, modified: new Date().toISOString(), entries: [] });
              break;
            default:
              reject(new Error(`Unknown operation: ${operation}`));
          }
        } catch (error) {
          reject(error);
        }
      }, 10);
    });
  }

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
// Error Class
// ============================================================================

export class WorkspaceError extends Error {
  public readonly code: string;
  public readonly cause?: unknown;

  constructor(code: string, message: string, cause?: unknown) {
    super(message);
    this.name = 'WorkspaceError';
    this.code = code;
    this.cause = cause;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const workspaceService = new WorkspaceService();

export default workspaceService;
