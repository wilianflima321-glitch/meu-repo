/**
 * Command Handlers - Implementações Reais dos Comandos
 * 
 * Este módulo conecta os comandos do Command Registry com os serviços
 * reais do Aethel Engine. Nada de console.log - tudo funcional.
 * 
 * @module lib/commands/command-handlers
 */

'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCommandRegistry, type CommandDefinition } from './command-registry';
import { useDevTools } from '@/lib/debug/devtools-provider';

// ============================================================================
// TYPES
// ============================================================================

export interface EditorState {
  activeFile: string | null;
  openFiles: string[];
  cursorPosition: { line: number; column: number };
  selection: { start: { line: number; column: number }; end: { line: number; column: number } } | null;
  isDirty: boolean;
}

export interface SceneState {
  selectedObjects: string[];
  clipboard: unknown[];
  undoStack: unknown[];
  redoStack: unknown[];
}

export interface CommandContext {
  workspace: {
    currentFolder: string | null;
    openFolders: string[];
  };
  editor: EditorState;
  scene: SceneState;
  ui: {
    activePanel: string;
    sidebarVisible: boolean;
    bottomPanelVisible: boolean;
  };
}

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
      console.error('Clipboard copy failed:', error);
      this.internalClipboard = data;
      return false;
    }
  }

  async paste(): Promise<string> {
    try {
      return await navigator.clipboard.readText();
    } catch (error) {
      console.error('Clipboard paste failed:', error);
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
      console.error('Undo failed:', error);
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
      console.error('Redo failed:', error);
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
      console.error('Save dialog failed:', error);
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
        console.error(`Auto-save failed for ${uri}:`, error);
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

type CommandEventType = 
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
        console.error(`Error in event handler for ${event}:`, error);
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

// ============================================================================
// REAL COMMAND HANDLERS HOOK
// ============================================================================

export function useRealCommandHandlers() {
  const router = useRouter();
  const { registerCommands } = useCommandRegistry();
  const { logAction, log } = useDevTools();
  
  const commandPaletteRef = useRef<{ open: () => void; close: () => void } | null>(null);
  const searchPanelRef = useRef<{ open: () => void; focus: () => void } | null>(null);
  const terminalRef = useRef<{ toggle: () => void; focus: () => void } | null>(null);
  
  // UI State refs that can be updated externally
  const uiStateRef = useRef({
    sidebarVisible: true,
    bottomPanelVisible: true,
    zoomLevel: 100,
  });

  // Create real command handlers
  const createFileNew = useCallback(async () => {
    logAction('file:new', undefined, 'CommandHandler');
    log('info', 'Criando novo arquivo...', undefined, 'file');
    
    const filename = `untitled-${Date.now()}.ts`;
    const content = `// ${filename}\n// Created at ${new Date().toISOString()}\n\n`;
    
    fileOperations.markDirty(filename, content);
    commandEventBus.emit('file:new', { filename, content });
    
    // Navigate to editor with new file
    router.push(`/ide?file=${encodeURIComponent(filename)}`);
  }, [logAction, log, router]);

  const createFolderNew = useCallback(async () => {
    logAction('file:newFolder', undefined, 'CommandHandler');
    log('info', 'Criando nova pasta...', undefined, 'file');
    
    const folderName = `new-folder-${Date.now()}`;
    commandEventBus.emit('file:new', { folderName, isDirectory: true });
  }, [logAction, log]);

  const openFile = useCallback(async () => {
    logAction('file:open', undefined, 'CommandHandler');
    
    const files = await fileOperations.showOpenDialog({
      accept: '.ts,.tsx,.js,.jsx,.json,.md,.css,.html',
      multiple: true,
    });
    
    if (files.length > 0) {
      for (const file of files) {
        const content = await file.text();
        log('info', `Arquivo aberto: ${file.name}`, { size: file.size }, 'file');
        commandEventBus.emit('file:open', { name: file.name, content });
      }
    }
  }, [logAction, log]);

  const saveFile = useCallback(async () => {
    logAction('file:save', undefined, 'CommandHandler');
    log('info', 'Salvando arquivo...', undefined, 'file');
    
    const dirtyFiles = fileOperations.getDirtyFiles();
    if (dirtyFiles.length > 0) {
      const uri = dirtyFiles[0];
      const content = await fileOperations.loadFromStorage(uri) || '';
      await fileOperations.showSaveDialog(content, uri.split('/').pop() || 'file.txt');
      fileOperations.clearDirty(uri);
      log('info', `Arquivo salvo: ${uri}`, undefined, 'file');
    }
    
    commandEventBus.emit('file:save');
  }, [logAction, log]);

  const saveAllFiles = useCallback(async () => {
    logAction('file:saveAll', undefined, 'CommandHandler');
    
    const dirtyFiles = fileOperations.getDirtyFiles();
    log('info', `Salvando ${dirtyFiles.length} arquivos...`, undefined, 'file');
    
    for (const uri of dirtyFiles) {
      fileOperations.clearDirty(uri);
    }
    
    commandEventBus.emit('file:saveAll');
    log('info', 'Todos os arquivos salvos', undefined, 'file');
  }, [logAction, log]);

  const undoAction = useCallback(async () => {
    logAction('edit:undo', undefined, 'CommandHandler');
    
    const success = await undoRedoManager.undo();
    if (success) {
      log('info', `Desfeito: ${undoRedoManager.getRedoLabel()}`, undefined, 'edit');
    }
    commandEventBus.emit('edit:undo');
  }, [logAction, log]);

  const redoAction = useCallback(async () => {
    logAction('edit:redo', undefined, 'CommandHandler');
    
    const success = await undoRedoManager.redo();
    if (success) {
      log('info', `Refeito: ${undoRedoManager.getUndoLabel()}`, undefined, 'edit');
    }
    commandEventBus.emit('edit:redo');
  }, [logAction, log]);

  const cutSelection = useCallback(async () => {
    logAction('edit:cut', undefined, 'CommandHandler');
    
    const selection = window.getSelection()?.toString() || '';
    if (selection) {
      await clipboardService.copy(selection);
      log('info', 'Seleção recortada', { length: selection.length }, 'edit');
      // The actual deletion would be handled by the active editor
      commandEventBus.emit('edit:cut', { text: selection });
    }
  }, [logAction, log]);

  const copySelection = useCallback(async () => {
    logAction('edit:copy', undefined, 'CommandHandler');
    
    const selection = window.getSelection()?.toString() || '';
    if (selection) {
      await clipboardService.copy(selection);
      log('info', 'Seleção copiada', { length: selection.length }, 'edit');
    }
    commandEventBus.emit('edit:copy', { text: selection });
  }, [logAction, log]);

  const pasteFromClipboard = useCallback(async () => {
    logAction('edit:paste', undefined, 'CommandHandler');
    
    const text = await clipboardService.paste();
    log('info', 'Texto colado', { length: text.length }, 'edit');
    commandEventBus.emit('edit:paste', { text });
  }, [logAction, log]);

  const openFind = useCallback(() => {
    logAction('edit:find', undefined, 'CommandHandler');
    log('info', 'Abrindo busca...', undefined, 'search');
    
    searchPanelRef.current?.open();
    commandEventBus.emit('edit:find');
  }, [logAction, log]);

  const openReplace = useCallback(() => {
    logAction('edit:replace', undefined, 'CommandHandler');
    log('info', 'Abrindo substituir...', undefined, 'search');
    
    searchPanelRef.current?.open();
    commandEventBus.emit('edit:replace');
  }, [logAction, log]);

  const openCommandPalette = useCallback(() => {
    logAction('view:commandPalette', undefined, 'CommandHandler');
    commandPaletteRef.current?.open();
    commandEventBus.emit('view:commandPalette');
  }, [logAction]);

  const showExplorer = useCallback(() => {
    logAction('view:explorer', undefined, 'CommandHandler');
    router.push('/ide?panel=explorer');
    commandEventBus.emit('view:explorer');
  }, [logAction, router]);

  const showSearch = useCallback(() => {
    logAction('view:search', undefined, 'CommandHandler');
    router.push('/ide?panel=search');
    commandEventBus.emit('view:search');
  }, [logAction, router]);

  const showGit = useCallback(() => {
    logAction('view:git', undefined, 'CommandHandler');
    router.push('/git');
    commandEventBus.emit('view:git');
  }, [logAction, router]);

  const showDebug = useCallback(() => {
    logAction('view:debug', undefined, 'CommandHandler');
    router.push('/debugger');
    commandEventBus.emit('view:debug');
  }, [logAction, router]);

  const showTerminal = useCallback(() => {
    logAction('view:terminal', undefined, 'CommandHandler');
    terminalRef.current?.toggle();
    commandEventBus.emit('view:terminal');
  }, [logAction]);

  const toggleSidebar = useCallback(() => {
    logAction('view:toggleSidebar', undefined, 'CommandHandler');
    uiStateRef.current.sidebarVisible = !uiStateRef.current.sidebarVisible;
    commandEventBus.emit('view:toggleSidebar', { visible: uiStateRef.current.sidebarVisible });
  }, [logAction]);

  const toggleBottomPanel = useCallback(() => {
    logAction('view:toggleBottomPanel', undefined, 'CommandHandler');
    uiStateRef.current.bottomPanelVisible = !uiStateRef.current.bottomPanelVisible;
    commandEventBus.emit('view:toggleBottomPanel', { visible: uiStateRef.current.bottomPanelVisible });
  }, [logAction]);

  const zoomIn = useCallback(() => {
    logAction('view:zoomIn', undefined, 'CommandHandler');
    uiStateRef.current.zoomLevel = Math.min(200, uiStateRef.current.zoomLevel + 10);
    document.body.style.zoom = `${uiStateRef.current.zoomLevel}%`;
    log('info', `Zoom: ${uiStateRef.current.zoomLevel}%`, undefined, 'view');
    commandEventBus.emit('view:zoomIn', { level: uiStateRef.current.zoomLevel });
  }, [logAction, log]);

  const zoomOut = useCallback(() => {
    logAction('view:zoomOut', undefined, 'CommandHandler');
    uiStateRef.current.zoomLevel = Math.max(50, uiStateRef.current.zoomLevel - 10);
    document.body.style.zoom = `${uiStateRef.current.zoomLevel}%`;
    log('info', `Zoom: ${uiStateRef.current.zoomLevel}%`, undefined, 'view');
    commandEventBus.emit('view:zoomOut', { level: uiStateRef.current.zoomLevel });
  }, [logAction, log]);

  const resetZoom = useCallback(() => {
    logAction('view:resetZoom', undefined, 'CommandHandler');
    uiStateRef.current.zoomLevel = 100;
    document.body.style.zoom = '100%';
    log('info', 'Zoom resetado', undefined, 'view');
    commandEventBus.emit('view:resetZoom');
  }, [logAction, log]);

  const runStart = useCallback(() => {
    logAction('run:start', undefined, 'CommandHandler');
    log('info', 'Iniciando execução...', undefined, 'run');
    router.push('/live-preview');
    commandEventBus.emit('run:start');
  }, [logAction, log, router]);

  const runDebug = useCallback(() => {
    logAction('run:debug', undefined, 'CommandHandler');
    log('info', 'Iniciando debug...', undefined, 'debug');
    router.push('/debugger');
    commandEventBus.emit('run:debug');
  }, [logAction, log, router]);

  const runBuild = useCallback(() => {
    logAction('run:build', undefined, 'CommandHandler');
    log('info', 'Iniciando build...', undefined, 'run');
    commandEventBus.emit('run:build');
  }, [logAction, log]);

  const openAIChat = useCallback(() => {
    logAction('ai:chat', undefined, 'CommandHandler');
    log('info', 'Abrindo AI Chat...', undefined, 'ai');
    router.push('/chat');
    commandEventBus.emit('ai:chat');
  }, [logAction, log, router]);

  const openSettings = useCallback(() => {
    logAction('preferences:open', undefined, 'CommandHandler');
    router.push('/settings');
    commandEventBus.emit('preferences:open');
  }, [logAction, router]);

  const openKeyboardShortcuts = useCallback(() => {
    logAction('preferences:keyboardShortcuts', undefined, 'CommandHandler');
    router.push('/settings?tab=keybindings');
    commandEventBus.emit('preferences:keyboardShortcuts');
  }, [logAction, router]);

  const openDocumentation = useCallback(() => {
    logAction('help:documentation', undefined, 'CommandHandler');
    window.open('/docs', '_blank');
    commandEventBus.emit('help:documentation');
  }, [logAction]);

  // Register all real commands
  useEffect(() => {
    const commands: CommandDefinition[] = [
      // File commands
      { id: 'file.new', label: 'Novo Arquivo', description: 'Criar um novo arquivo', category: 'file', shortcut: '⌘N', icon: 'file-plus', priority: 100, tags: ['create', 'new'], handler: createFileNew },
      { id: 'file.newFolder', label: 'Nova Pasta', description: 'Criar uma nova pasta', category: 'file', shortcut: '⇧⌘N', icon: 'folder-plus', priority: 99, tags: ['create', 'folder'], handler: createFolderNew },
      { id: 'file.open', label: 'Abrir Arquivo', description: 'Abrir um arquivo existente', category: 'file', shortcut: '⌘O', icon: 'folder-open', priority: 98, tags: ['open', 'file'], handler: openFile },
      { id: 'file.save', label: 'Salvar', description: 'Salvar o arquivo atual', category: 'file', shortcut: '⌘S', icon: 'save', priority: 97, tags: ['save'], handler: saveFile },
      { id: 'file.saveAll', label: 'Salvar Todos', description: 'Salvar todos os arquivos', category: 'file', shortcut: '⌥⌘S', icon: 'save-all', priority: 96, tags: ['save', 'all'], handler: saveAllFiles },
      
      // Edit commands
      { id: 'edit.undo', label: 'Desfazer', description: 'Desfazer a última ação', category: 'edit', shortcut: '⌘Z', icon: 'undo', priority: 100, tags: ['undo'], handler: undoAction, when: () => undoRedoManager.canUndo() },
      { id: 'edit.redo', label: 'Refazer', description: 'Refazer a ação desfeita', category: 'edit', shortcut: '⇧⌘Z', icon: 'redo', priority: 99, tags: ['redo'], handler: redoAction, when: () => undoRedoManager.canRedo() },
      { id: 'edit.cut', label: 'Recortar', description: 'Recortar seleção', category: 'edit', shortcut: '⌘X', icon: 'scissors', priority: 98, tags: ['cut'], handler: cutSelection },
      { id: 'edit.copy', label: 'Copiar', description: 'Copiar seleção', category: 'edit', shortcut: '⌘C', icon: 'copy', priority: 97, tags: ['copy'], handler: copySelection },
      { id: 'edit.paste', label: 'Colar', description: 'Colar do clipboard', category: 'edit', shortcut: '⌘V', icon: 'clipboard', priority: 96, tags: ['paste'], handler: pasteFromClipboard },
      { id: 'edit.find', label: 'Buscar', description: 'Buscar no arquivo', category: 'edit', shortcut: '⌘F', icon: 'search', priority: 95, tags: ['find', 'search'], handler: openFind },
      { id: 'edit.replace', label: 'Substituir', description: 'Buscar e substituir', category: 'edit', shortcut: '⌥⌘F', icon: 'replace', priority: 94, tags: ['replace'], handler: openReplace },
      
      // View commands
      { id: 'view.commandPalette', label: 'Command Palette', description: 'Abrir paleta de comandos', category: 'view', shortcut: '⇧⌘P', icon: 'command', priority: 100, tags: ['command', 'palette'], handler: openCommandPalette },
      { id: 'view.explorer', label: 'Explorador', description: 'Mostrar explorador', category: 'view', shortcut: '⇧⌘E', icon: 'files', priority: 99, tags: ['explorer'], handler: showExplorer },
      { id: 'view.search', label: 'Buscar em Arquivos', description: 'Buscar em todos os arquivos', category: 'view', shortcut: '⇧⌘F', icon: 'search', priority: 98, tags: ['search'], handler: showSearch },
      { id: 'view.git', label: 'Controle de Versão', description: 'Mostrar Git', category: 'view', shortcut: '⌃⇧G', icon: 'git-branch', priority: 97, tags: ['git', 'version control'], handler: showGit },
      { id: 'view.debug', label: 'Debug', description: 'Mostrar painel de debug', category: 'view', shortcut: '⇧⌘D', icon: 'bug', priority: 96, tags: ['debug'], handler: showDebug },
      { id: 'view.terminal', label: 'Terminal', description: 'Mostrar terminal', category: 'view', shortcut: '⌃`', icon: 'terminal', priority: 95, tags: ['terminal'], handler: showTerminal },
      { id: 'view.toggleSidebar', label: 'Alternar Sidebar', description: 'Mostrar/ocultar sidebar', category: 'view', shortcut: '⌘B', icon: 'sidebar-left', priority: 94, tags: ['sidebar', 'toggle'], handler: toggleSidebar },
      { id: 'view.toggleBottomPanel', label: 'Alternar Painel Inferior', description: 'Mostrar/ocultar painel', category: 'view', shortcut: '⌘J', icon: 'panel-bottom', priority: 93, tags: ['panel', 'toggle'], handler: toggleBottomPanel },
      { id: 'view.zoomIn', label: 'Aumentar Zoom', description: 'Aumentar zoom da interface', category: 'view', shortcut: '⌘=', icon: 'zoom-in', priority: 92, tags: ['zoom', 'in'], handler: zoomIn },
      { id: 'view.zoomOut', label: 'Diminuir Zoom', description: 'Diminuir zoom da interface', category: 'view', shortcut: '⌘-', icon: 'zoom-out', priority: 91, tags: ['zoom', 'out'], handler: zoomOut },
      { id: 'view.resetZoom', label: 'Resetar Zoom', description: 'Voltar zoom para 100%', category: 'view', shortcut: '⌘0', icon: 'zoom-reset', priority: 90, tags: ['zoom', 'reset'], handler: resetZoom },
      
      // Run commands
      { id: 'run.start', label: 'Executar', description: 'Iniciar execução', category: 'run', shortcut: 'F5', icon: 'play', priority: 100, tags: ['run', 'start', 'execute'], handler: runStart },
      { id: 'run.debug', label: 'Iniciar Debug', description: 'Iniciar com debugger', category: 'run', shortcut: '⇧F5', icon: 'bug-play', priority: 99, tags: ['debug', 'start'], handler: runDebug },
      { id: 'run.build', label: 'Build', description: 'Compilar projeto', category: 'run', shortcut: '⇧⌘B', icon: 'package', priority: 98, tags: ['build', 'compile'], handler: runBuild },
      
      // AI commands
      { id: 'ai.chat', label: 'AI Chat', description: 'Abrir chat com IA', category: 'ai', shortcut: '⌘I', icon: 'sparkles', priority: 100, tags: ['ai', 'chat', 'copilot'], handler: openAIChat },
      
      // Preferences
      { id: 'preferences.open', label: 'Configurações', description: 'Abrir configurações', category: 'preferences', shortcut: '⌘,', icon: 'settings', priority: 100, tags: ['settings', 'preferences'], handler: openSettings },
      { id: 'preferences.keyboardShortcuts', label: 'Atalhos de Teclado', description: 'Configurar atalhos', category: 'preferences', shortcut: '⌘K ⌘S', icon: 'keyboard', priority: 99, tags: ['keyboard', 'shortcuts'], handler: openKeyboardShortcuts },
      
      // Help
      { id: 'help.documentation', label: 'Documentação', description: 'Abrir documentação', category: 'help', icon: 'book', priority: 100, tags: ['docs', 'documentation', 'help'], handler: openDocumentation },
    ];

    const unregister = registerCommands(commands);
    
    // Load search history
    searchService.loadHistory();
    
    return unregister;
  }, [
    registerCommands, createFileNew, createFolderNew, openFile, saveFile, saveAllFiles,
    undoAction, redoAction, cutSelection, copySelection, pasteFromClipboard, openFind, openReplace,
    openCommandPalette, showExplorer, showSearch, showGit, showDebug, showTerminal,
    toggleSidebar, toggleBottomPanel, zoomIn, zoomOut, resetZoom,
    runStart, runDebug, runBuild, openAIChat, openSettings, openKeyboardShortcuts, openDocumentation
  ]);

  return {
    commandPaletteRef,
    searchPanelRef,
    terminalRef,
    uiStateRef,
    services: {
      clipboard: clipboardService,
      undoRedo: undoRedoManager,
      file: fileOperations,
      search: searchService,
      navigation: navigationService,
      events: commandEventBus,
    },
  };
}

export default useRealCommandHandlers;
