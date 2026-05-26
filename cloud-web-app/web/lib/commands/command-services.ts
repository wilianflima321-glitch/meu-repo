'use client';

import { logger } from '@/lib/observability/logger';

// ============================================================================
// CLIPBOARD SERVICE (Browser API)
// ============================================================================

class ClipboardService {
  private internalClipboard: unknown = null;

  async copy(data: unknown): Promise<boolean> {
    try {
      if (typeof data === 'string') {
        await navigator.clipboard.writeText(data);
      } else {
        await navigator.clipboard.writeText(JSON.stringify(data));
        this.internalClipboard = data;
      }
      return true;
    } catch (error) {
      logger.error('Clipboard copy failed:', error);
      this.internalClipboard = data;
      return false;
    }
  }

  async paste(): Promise<string> {
    try {
      return await navigator.clipboard.readText();
    } catch (error) {
      logger.error('Clipboard paste failed:', error);
      return '';
    }
  }

  async pasteInternal<T>(): Promise<T | null> {
    return this.internalClipboard as T | null;
  }
}

export const clipboardService = new ClipboardService();

// ============================================================================
// UNDO/REDO MANAGER
// ============================================================================

interface UndoableAction {
  id: string;
  type: string;
  timestamp: number;
  data: unknown;
  undo: () => void | Promise<void>;
  redo: () => void | Promise<void>;
}

class UndoRedoManager {
  private undoStack: UndoableAction[] = [];
  private redoStack: UndoableAction[] = [];
  private maxStackSize = 100;
  private listeners: Set<() => void> = new Set();

  push(action: Omit<UndoableAction, 'id' | 'timestamp'>): void {
    const undoableAction: UndoableAction = {
      ...action,
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    this.undoStack.push(undoableAction);
    this.redoStack = []; // Clear redo stack on new action

    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }

    this.notifyListeners();
  }

  async undo(): Promise<boolean> {
    const action = this.undoStack.pop();
    if (!action) return false;

    try {
      await action.undo();
      this.redoStack.push(action);
      this.notifyListeners();
      return true;
    } catch (error) {
      logger.error('Undo failed:', error);
      this.undoStack.push(action); // Restore if failed
      return false;
    }
  }

  async redo(): Promise<boolean> {
    const action = this.redoStack.pop();
    if (!action) return false;

    try {
      await action.redo();
      this.undoStack.push(action);
      this.notifyListeners();
      return true;
    } catch (error) {
      logger.error('Redo failed:', error);
      this.redoStack.push(action); // Restore if failed
      return false;
    }
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  getUndoLabel(): string {
    const action = this.undoStack[this.undoStack.length - 1];
    return action ? action.type : '';
  }

  getRedoLabel(): string {
    const action = this.redoStack[this.redoStack.length - 1];
    return action ? action.type : '';
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.notifyListeners();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

export const undoRedoManager = new UndoRedoManager();

// ============================================================================
// FILE OPERATIONS
// ============================================================================

interface FileDialogOptions {
  accept?: string;
  multiple?: boolean;
}

class FileOperations {
  private dirtyFiles: Map<string, string> = new Map();
  private autoSaveInterval: ReturnType<typeof setInterval> | null = null;
  private listeners: Map<string, Set<(content: string) => void>> = new Map();

  constructor() {
    this.startAutoSave();
  }

  private startAutoSave(): void {
    if (typeof window === 'undefined') return;
    
    this.autoSaveInterval = setInterval(() => {
      this.autoSaveAll();
    }, 30000); // Auto-save every 30 seconds
  }

  async showOpenDialog(options: FileDialogOptions = {}): Promise<File[]> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = options.accept || '*';
      input.multiple = options.multiple || false;
      
      input.onchange = () => {
        const files = Array.from(input.files || []);
        resolve(files);
      };
      
      input.oncancel = () => resolve([]);
      input.click();
    });
  }

  async showSaveDialog(content: string, filename: string, mimeType = 'text/plain'): Promise<boolean> {
    try {
      if ('showSaveFilePicker' in window) {
        // Modern File System Access API
        const handle = await (window as unknown as { showSaveFilePicker: (options: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: 'Files',
            accept: { [mimeType]: [`.${filename.split('.').pop()}`] }
          }]
        });
        
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        return true;
      } else {
        // Fallback to download
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        return true;
      }
    } catch (error) {
      logger.error('Save dialog failed:', error);
      return false;
    }
  }

  markDirty(uri: string, content: string): void {
    this.dirtyFiles.set(uri, content);
    this.notifyListeners(uri, content);
  }

  isDirty(uri: string): boolean {
    return this.dirtyFiles.has(uri);
  }

  clearDirty(uri: string): void {
    this.dirtyFiles.delete(uri);
  }

  getDirtyFiles(): string[] {
    return Array.from(this.dirtyFiles.keys());
  }

  private async autoSaveAll(): Promise<void> {
    const autoSaveEnabled = localStorage.getItem('aethel_autoSave') !== 'false';
    if (!autoSaveEnabled) return;

    for (const [uri, content] of this.dirtyFiles.entries()) {
      try {
        await this.saveToStorage(uri, content);
      } catch (error) {
        logger.error(`Auto-save failed for ${uri}:`, error);
      }
    }
  }

  private async saveToStorage(uri: string, content: string): Promise<void> {
    const key = `aethel_file_${uri}`;
    localStorage.setItem(key, content);
    localStorage.setItem(`${key}_timestamp`, Date.now().toString());
  }

  async loadFromStorage(uri: string): Promise<string | null> {
    const key = `aethel_file_${uri}`;
    return localStorage.getItem(key);
  }

  subscribe(uri: string, callback: (content: string) => void): () => void {
    if (!this.listeners.has(uri)) {
      this.listeners.set(uri, new Set());
    }
    this.listeners.get(uri)!.add(callback);
    return () => this.listeners.get(uri)?.delete(callback);
  }

  private notifyListeners(uri: string, content: string): void {
    this.listeners.get(uri)?.forEach(callback => callback(content));
  }

  destroy(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
  }
}

export const fileOperations = new FileOperations();

// ============================================================================
// SEARCH SERVICE
// ============================================================================

export interface SearchOptions {
  query: string;
  caseSensitive?: boolean;
  wholeWord?: boolean;
  regex?: boolean;
  includePattern?: string;
  excludePattern?: string;
}

export interface SearchResult {
  uri: string;
  line: number;
  column: number;
  text: string;
  preview: string;
}

class SearchService {
  private activeSearch: AbortController | null = null;
  private searchHistory: string[] = [];
  private replaceHistory: string[] = [];
  private maxHistory = 20;

  async searchInFile(content: string, options: SearchOptions): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const lines = content.split('\n');
    
    let pattern: RegExp;
    if (options.regex) {
      pattern = new RegExp(options.query, options.caseSensitive ? 'g' : 'gi');
    } else {
      const escaped = options.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const wordBoundary = options.wholeWord ? '\\b' : '';
      pattern = new RegExp(`${wordBoundary}${escaped}${wordBoundary}`, options.caseSensitive ? 'g' : 'gi');
    }

    lines.forEach((line, lineIndex) => {
      let match;
      while ((match = pattern.exec(line)) !== null) {
        results.push({
          uri: '',
          line: lineIndex + 1,
          column: match.index + 1,
          text: match[0],
          preview: this.getPreview(line, match.index, match[0].length),
        });
      }
    });

    return results;
  }

  replaceInContent(content: string, searchOptions: SearchOptions, replacement: string): string {
    let pattern: RegExp;
    if (searchOptions.regex) {
      pattern = new RegExp(searchOptions.query, searchOptions.caseSensitive ? 'g' : 'gi');
    } else {
      const escaped = searchOptions.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const wordBoundary = searchOptions.wholeWord ? '\\b' : '';
      pattern = new RegExp(`${wordBoundary}${escaped}${wordBoundary}`, searchOptions.caseSensitive ? 'g' : 'gi');
    }

    return content.replace(pattern, replacement);
  }

  private getPreview(line: string, matchIndex: number, matchLength: number): string {
    const contextBefore = 20;
    const contextAfter = 40;
    
    const start = Math.max(0, matchIndex - contextBefore);
    const end = Math.min(line.length, matchIndex + matchLength + contextAfter);
    
    let preview = line.substring(start, end);
    if (start > 0) preview = '...' + preview;
    if (end < line.length) preview = preview + '...';
    
    return preview;
  }

  addToSearchHistory(query: string): void {
    this.searchHistory = [query, ...this.searchHistory.filter(q => q !== query)].slice(0, this.maxHistory);
    this.saveHistory();
  }

  addToReplaceHistory(replacement: string): void {
    this.replaceHistory = [replacement, ...this.replaceHistory.filter(r => r !== replacement)].slice(0, this.maxHistory);
    this.saveHistory();
  }

  getSearchHistory(): string[] {
    return [...this.searchHistory];
  }

  getReplaceHistory(): string[] {
    return [...this.replaceHistory];
  }

  private saveHistory(): void {
    localStorage.setItem('aethel_search_history', JSON.stringify(this.searchHistory));
    localStorage.setItem('aethel_replace_history', JSON.stringify(this.replaceHistory));
  }

  loadHistory(): void {
    try {
      const searchHistory = localStorage.getItem('aethel_search_history');
      const replaceHistory = localStorage.getItem('aethel_replace_history');
      
      if (searchHistory) this.searchHistory = JSON.parse(searchHistory);
      if (replaceHistory) this.replaceHistory = JSON.parse(replaceHistory);
    } catch {
      // Ignore parse errors
    }
  }

  cancelSearch(): void {
    this.activeSearch?.abort();
    this.activeSearch = null;
  }
}

export const searchService = new SearchService();

// ============================================================================
// NAVIGATION SERVICE
// ============================================================================

interface NavigationEntry {
  uri: string;
  position: { line: number; column: number };
  timestamp: number;
}

class NavigationService {
  private backStack: NavigationEntry[] = [];
  private forwardStack: NavigationEntry[] = [];
  private currentEntry: NavigationEntry | null = null;
  private listeners: Set<(entry: NavigationEntry | null) => void> = new Set();

  navigate(uri: string, position = { line: 1, column: 1 }): void {
    if (this.currentEntry) {
      this.backStack.push(this.currentEntry);
    }

    this.currentEntry = { uri, position, timestamp: Date.now() };
    this.forwardStack = [];
    this.notifyListeners();
  }

  goBack(): NavigationEntry | null {
    if (this.backStack.length === 0) return null;

    if (this.currentEntry) {
      this.forwardStack.push(this.currentEntry);
    }

    this.currentEntry = this.backStack.pop()!;
    this.notifyListeners();
    return this.currentEntry;
  }

  goForward(): NavigationEntry | null {
    if (this.forwardStack.length === 0) return null;

    if (this.currentEntry) {
      this.backStack.push(this.currentEntry);
    }

    this.currentEntry = this.forwardStack.pop()!;
    this.notifyListeners();
    return this.currentEntry;
  }

  canGoBack(): boolean {
    return this.backStack.length > 0;
  }

  canGoForward(): boolean {
    return this.forwardStack.length > 0;
  }

  getCurrentEntry(): NavigationEntry | null {
    return this.currentEntry;
  }

  subscribe(listener: (entry: NavigationEntry | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentEntry));
  }
}

export const navigationService = new NavigationService();

// ============================================================================
// COMMAND EVENT BUS
// ============================================================================

export type CommandEventType = 
  | 'file:new'
  | 'file:open'
  | 'file:save'
  | 'file:saveAll'
  | 'file:close'
  | 'file:closeAll'
  | 'edit:undo'
  | 'edit:redo'
  | 'edit:cut'
  | 'edit:copy'
  | 'edit:paste'
  | 'edit:find'
  | 'edit:replace'
  | 'edit:selectAll'
  | 'view:commandPalette'
  | 'view:explorer'
  | 'view:search'
  | 'view:git'
  | 'view:debug'
  | 'view:extensions'
  | 'view:terminal'
  | 'view:problems'
  | 'view:output'
  | 'view:toggleSidebar'
  | 'view:toggleBottomPanel'
  | 'view:zoomIn'
  | 'view:zoomOut'
  | 'view:resetZoom'
  | 'run:start'
  | 'run:debug'
  | 'run:stop'
  | 'run:build'
  | 'debug:toggleBreakpoint'
  | 'debug:stepOver'
  | 'debug:stepInto'
  | 'debug:stepOut'
  | 'debug:continue'
  | 'git:commit'
  | 'git:push'
  | 'git:pull'
  | 'git:sync'
  | 'git:branch'
  | 'ai:chat'
  | 'ai:generate'
  | 'ai:explain'
  | 'ai:fix'
  | 'engine:play'
  | 'engine:pause'
  | 'engine:stop'
  | 'engine:build'
  | 'preferences:open'
  | 'preferences:keyboardShortcuts'
  | 'help:documentation'
  | 'help:releaseNotes'
  | 'help:about';

type EventCallback = (data?: unknown) => void | Promise<void>;

class CommandEventBus {
  private handlers: Map<CommandEventType, Set<EventCallback>> = new Map();

  on(event: CommandEventType, callback: EventCallback): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(callback);
    
    return () => this.handlers.get(event)?.delete(callback);
  }

  async emit(event: CommandEventType, data?: unknown): Promise<void> {
    const callbacks = this.handlers.get(event);
    if (!callbacks) return;

    const promises = Array.from(callbacks).map(callback => {
      try {
        return Promise.resolve(callback(data));
      } catch (error) {
        logger.error(`Error in event handler for ${event}:`, error);
        return Promise.resolve();
      }
    });

    await Promise.all(promises);
  }

  off(event: CommandEventType, callback: EventCallback): void {
    this.handlers.get(event)?.delete(callback);
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const commandEventBus = new CommandEventBus();
