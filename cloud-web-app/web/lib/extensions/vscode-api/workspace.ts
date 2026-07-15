import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('extensions/vscode-api/workspace')

export type WorkspaceApiValue = unknown

export type WorkspacePosition = {
  line: number
  character: number
}

export type WorkspaceRange = {
  start?: WorkspacePosition
  end?: WorkspacePosition
}

export type WorkspaceFoldersChangeEvent = {
  added: WorkspaceFolder[]
  removed: WorkspaceFolder[]
}

export type TextDocumentChangeEvent = {
  document: TextDocument
  contentChanges?: WorkspaceApiValue[]
}

/**
 * VS Code Workspace API Implementation
 * Provides workspace-related functionality (files, folders, configuration)
 */

export interface WorkspaceFolder {
  uri: string;
  name: string;
  index: number;
}

export interface TextDocument {
  uri: string;
  fileName: string;
  isUntitled: boolean;
  languageId: string;
  version: number;
  isDirty: boolean;
  isClosed: boolean;
  save(): Promise<boolean>;
  eol: number;
  lineCount: number;
  getText(range?: WorkspaceRange): string;
  getWordRangeAtPosition(position: WorkspacePosition, regex?: RegExp): WorkspaceRange | undefined;
  validateRange(range: WorkspaceRange): WorkspaceRange;
  validatePosition(position: WorkspacePosition): WorkspacePosition;
  positionAt(offset: number): WorkspacePosition;
  offsetAt(position: WorkspacePosition): number;
}

export interface FileSystemWatcher {
  ignoreCreateEvents: boolean;
  ignoreChangeEvents: boolean;
  ignoreDeleteEvents: boolean;
  onDidCreate: (listener: (uri: string) => void) => { dispose: () => void };
  onDidChange: (listener: (uri: string) => void) => { dispose: () => void };
  onDidDelete: (listener: (uri: string) => void) => { dispose: () => void };
  dispose(): void;
}

export interface WorkspaceConfiguration {
  get<T>(section: string, defaultValue?: T): T;
  has(section: string): boolean;
  inspect<T>(section: string): {
    key: string;
    defaultValue?: T;
    globalValue?: T;
    workspaceValue?: T;
    workspaceFolderValue?: T;
  } | undefined;
  update(section: string, value: WorkspaceApiValue, configurationTarget?: number): Promise<void>;
}

class WorkspaceAPI {
  private _workspaceFolders: WorkspaceFolder[] = [];
  private _textDocuments: Map<string, TextDocument> = new Map();
  private fileWatchers: FileSystemWatcher[] = [];
  private configuration: Map<string, WorkspaceApiValue> = new Map();
  private onDidChangeWorkspaceFoldersListeners: Array<(event: WorkspaceFoldersChangeEvent) => void> = [];
  private onDidOpenTextDocumentListeners: Array<(document: TextDocument) => void> = [];
  private onDidCloseTextDocumentListeners: Array<(document: TextDocument) => void> = [];
  private onDidChangeTextDocumentListeners: Array<(event: TextDocumentChangeEvent) => void> = [];
  private onDidSaveTextDocumentListeners: Array<(document: TextDocument) => void> = [];

  /**
   * Get workspace folders
   */
  get workspaceFolders(): WorkspaceFolder[] | undefined {
    return this._workspaceFolders.length > 0 ? this._workspaceFolders : undefined;
  }

  /**
   * Get workspace name
   */
  get name(): string | undefined {
    return this._workspaceFolders[0]?.name;
  }

  /**
   * Get workspace file
   */
  get workspaceFile(): string | undefined {
    return this._workspaceFolders.length > 0
      ? `${this._workspaceFolders[0].uri}/.vscode/workspace.code-workspace`
      : undefined;
  }

  /**
   * Get text documents
   */
  get textDocuments(): TextDocument[] {
    return Array.from(this._textDocuments.values());
  }

  /**
   * Get workspace folder for URI
   */
  getWorkspaceFolder(uri: string): WorkspaceFolder | undefined {
    return this._workspaceFolders.find(folder => uri.startsWith(folder.uri));
  }

  /**
   * Get relative path
   */
  asRelativePath(pathOrUri: string | { path: string }, includeWorkspaceFolder?: boolean): string {
    const path = typeof pathOrUri === 'string' ? pathOrUri : pathOrUri.path;

    for (const folder of this._workspaceFolders) {
      if (path.startsWith(folder.uri)) {
        const relative = path.substring(folder.uri.length + 1);
        return includeWorkspaceFolder ? `${folder.name}/${relative}` : relative;
      }
    }

    return path;
  }

  /**
   * Update workspace folders
   */
  updateWorkspaceFolders(
    start: number,
    deleteCount: number | null,
    ...workspaceFoldersToAdd: Array<{ uri: string; name?: string }>
  ): boolean {
    const oldFolders = [...this._workspaceFolders];

    if (deleteCount !== null) {
      this._workspaceFolders.splice(start, deleteCount);
    }

    if (workspaceFoldersToAdd.length > 0) {
      const newFolders = workspaceFoldersToAdd.map((folder, index) => ({
        uri: folder.uri,
        name: folder.name || `Folder ${start + index}`,
        index: start + index,
      }));
      this._workspaceFolders.splice(start, 0, ...newFolders);
    }

    // Reindex
    this._workspaceFolders.forEach((folder, index) => {
      folder.index = index;
    });

    // Notify listeners
    this.onDidChangeWorkspaceFoldersListeners.forEach(listener => {
      listener({
        added: this._workspaceFolders.filter(f => !oldFolders.includes(f)),
        removed: oldFolders.filter(f => !this._workspaceFolders.includes(f)),
      });
    });

    log.info('[Workspace] Updated workspace folders:', this._workspaceFolders);
    return true;
  }

  /**
   * Open text document
   */
  async openTextDocument(uri: string | { scheme: string; path: string }): Promise<TextDocument> {
    const uriStr = typeof uri === 'string' ? uri : `${uri.scheme}://${uri.path}`;

    // Check if already open
    if (this._textDocuments.has(uriStr)) {
      return this._textDocuments.get(uriStr)!;
    }

    // Create new document
    const document = this.createTextDocument(uriStr);
    this._textDocuments.set(uriStr, document);

    // Notify listeners
    this.onDidOpenTextDocumentListeners.forEach(listener => listener(document));

    log.info('[Workspace] Opened text document:', uriStr);
    return document;
  }

  /**
   * Save text document
   */
  async saveTextDocument(document: TextDocument): Promise<boolean> {
    log.info('[Workspace] Saving document:', document.uri);

    // Mark as not dirty
    document.isDirty = false;

    // Notify listeners
    this.onDidSaveTextDocumentListeners.forEach(listener => listener(document));

    return true;
  }

  /**
   * Save all text documents
   */
  async saveAll(includeUntitled?: boolean): Promise<boolean> {
    const documents = includeUntitled
      ? Array.from(this._textDocuments.values())
      : Array.from(this._textDocuments.values()).filter(d => !d.isUntitled);

    for (const document of documents) {
      await this.saveTextDocument(document);
    }

    log.info('[Workspace] Saved all documents');
    return true;
  }

  /**
   * Apply edit
   */
  async applyEdit(edit: WorkspaceApiValue): Promise<boolean> {
    log.info('[Workspace] Applying edit:', edit);

    return false;
  }

  /**
   * Create file system watcher
   */
  createFileSystemWatcher(
    globPattern: string,
    ignoreCreateEvents?: boolean,
    ignoreChangeEvents?: boolean,
    ignoreDeleteEvents?: boolean
  ): FileSystemWatcher {
    const createListeners: Array<(uri: string) => void> = [];
    const changeListeners: Array<(uri: string) => void> = [];
    const deleteListeners: Array<(uri: string) => void> = [];

    const watcher: FileSystemWatcher = {
      ignoreCreateEvents: ignoreCreateEvents || false,
      ignoreChangeEvents: ignoreChangeEvents || false,
      ignoreDeleteEvents: ignoreDeleteEvents || false,
      onDidCreate: (listener) => {
        createListeners.push(listener);
        return { dispose: () => {
          const index = createListeners.indexOf(listener);
          if (index > -1) createListeners.splice(index, 1);
        }};
      },
      onDidChange: (listener) => {
        changeListeners.push(listener);
        return { dispose: () => {
          const index = changeListeners.indexOf(listener);
          if (index > -1) changeListeners.splice(index, 1);
        }};
      },
      onDidDelete: (listener) => {
        deleteListeners.push(listener);
        return { dispose: () => {
          const index = deleteListeners.indexOf(listener);
          if (index > -1) deleteListeners.splice(index, 1);
        }};
      },
      dispose: () => {
        const index = this.fileWatchers.indexOf(watcher);
        if (index > -1) this.fileWatchers.splice(index, 1);
      },
    };

    this.fileWatchers.push(watcher);
    log.info('[Workspace] Created file system watcher:', globPattern);

    return watcher;
  }

  /**
   * Find files
   */
  async findFiles(
    include: string,
    exclude?: string | null,
    maxResults?: number,
    token?: WorkspaceApiValue
  ): Promise<string[]> {
    log.info('[Workspace] Finding files:', { include, exclude, maxResults });

    return [];
  }

  /**
   * Get configuration
   */
  getConfiguration(section?: string, scope?: WorkspaceApiValue): WorkspaceConfiguration {
    const config: WorkspaceConfiguration = {
      get: <T>(key: string, defaultValue?: T): T => {
        const fullKey = section ? `${section}.${key}` : key;
        return (this.configuration.get(fullKey) as T) ?? defaultValue!;
      },
      has: (key: string): boolean => {
        const fullKey = section ? `${section}.${key}` : key;
        return this.configuration.has(fullKey);
      },
      inspect: <T>(key: string) => {
        const fullKey = section ? `${section}.${key}` : key;
        return {
          key: fullKey,
          defaultValue: undefined as T | undefined,
          globalValue: this.configuration.get(fullKey) as T | undefined,
          workspaceValue: undefined as T | undefined,
          workspaceFolderValue: undefined as T | undefined,
        };
      },
      update: async (key: string, value: WorkspaceApiValue, target?: number) => {
        const fullKey = section ? `${section}.${key}` : key;
        this.configuration.set(fullKey, value);
        log.info('[Workspace] Updated configuration:', fullKey, value);
      },
    };

    return config;
  }

  /**
   * Register text document content provider
   */
  registerTextDocumentContentProvider(
    scheme: string,
    provider: WorkspaceApiValue
  ): { dispose: () => void } {
    log.info('[Workspace] Registered text document content provider:', scheme);

    return {
      dispose: () => {
        log.info('[Workspace] Disposed text document content provider:', scheme);
      },
    };
  }

  /**
   * Register file system provider
   */
  registerFileSystemProvider(
    scheme: string,
    provider: WorkspaceApiValue,
    options?: WorkspaceApiValue
  ): { dispose: () => void } {
    log.info('[Workspace] Registered file system provider:', scheme);

    return {
      dispose: () => {
        log.info('[Workspace] Disposed file system provider:', scheme);
      },
    };
  }

  /**
   * Event listeners
   */
  onDidChangeWorkspaceFolders(listener: (event: WorkspaceFoldersChangeEvent) => void): { dispose: () => void } {
    this.onDidChangeWorkspaceFoldersListeners.push(listener);
    return {
      dispose: () => {
        const index = this.onDidChangeWorkspaceFoldersListeners.indexOf(listener);
        if (index > -1) this.onDidChangeWorkspaceFoldersListeners.splice(index, 1);
      },
    };
  }

  onDidOpenTextDocument(listener: (document: TextDocument) => void): { dispose: () => void } {
    this.onDidOpenTextDocumentListeners.push(listener);
    return {
      dispose: () => {
        const index = this.onDidOpenTextDocumentListeners.indexOf(listener);
        if (index > -1) this.onDidOpenTextDocumentListeners.splice(index, 1);
      },
    };
  }

  onDidCloseTextDocument(listener: (document: TextDocument) => void): { dispose: () => void } {
    this.onDidCloseTextDocumentListeners.push(listener);
    return {
      dispose: () => {
        const index = this.onDidCloseTextDocumentListeners.indexOf(listener);
        if (index > -1) this.onDidCloseTextDocumentListeners.splice(index, 1);
      },
    };
  }

  onDidChangeTextDocument(listener: (event: TextDocumentChangeEvent) => void): { dispose: () => void } {
    this.onDidChangeTextDocumentListeners.push(listener);
    return {
      dispose: () => {
        const index = this.onDidChangeTextDocumentListeners.indexOf(listener);
        if (index > -1) this.onDidChangeTextDocumentListeners.splice(index, 1);
      },
    };
  }

  onDidSaveTextDocument(listener: (document: TextDocument) => void): { dispose: () => void } {
    this.onDidSaveTextDocumentListeners.push(listener);
    return {
      dispose: () => {
        const index = this.onDidSaveTextDocumentListeners.indexOf(listener);
        if (index > -1) this.onDidSaveTextDocumentListeners.splice(index, 1);
      },
    };
  }

  onDidChangeConfiguration(listener: (event: WorkspaceApiValue) => void): { dispose: () => void } {
    log.info('[Workspace] Registered configuration change listener');
    return {
      dispose: () => {
        log.info('[Workspace] Disposed configuration change listener');
      },
    };
  }

  /**
   * Create text document
   */
  private createTextDocument(uri: string): TextDocument {
    const fileName = uri.split('/').pop() || 'untitled';
    const languageId = this.detectLanguageId(fileName);

    const document: TextDocument = {
      uri,
      fileName,
      isUntitled: uri.startsWith('untitled:'),
      languageId,
      version: 1,
      isDirty: false,
      isClosed: false,
      save: async () => this.saveTextDocument(document),
      eol: 1, // LF
      lineCount: 0,
      getText: (range?: WorkspaceRange) => '',
      getWordRangeAtPosition: (position: WorkspacePosition, regex?: RegExp) => undefined,
      validateRange: (range: WorkspaceRange) => range,
      validatePosition: (position: WorkspacePosition) => position,
      positionAt: (offset: number) => ({ line: 0, character: offset }),
      offsetAt: (position: WorkspacePosition) => position.character,
    };

    return document;
  }

  /**
   * Detect language ID from file name
   */
  private detectLanguageId(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();

    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescriptreact',
      'js': 'javascript',
      'jsx': 'javascriptreact',
      'py': 'python',
      'go': 'go',
      'rs': 'rust',
      'java': 'java',
      'cs': 'csharp',
      'cpp': 'cpp',
      'c': 'c',
      'h': 'cpp',
      'hpp': 'cpp',
      'php': 'php',
      'rb': 'ruby',
      'json': 'json',
      'md': 'markdown',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'yaml': 'yaml',
      'yml': 'yaml',
      'xml': 'xml',
      'sh': 'shellscript',
      'bash': 'shellscript',
    };

    return languageMap[ext || ''] || 'plaintext';
  }

  /**
   * Initialize workspace
   */
  initialize(folders: Array<{ uri: string; name: string }>): void {
    this._workspaceFolders = folders.map((folder, index) => ({
      ...folder,
      index,
    }));
    log.info('[Workspace] Initialized with folders:', this._workspaceFolders);
  }
}

// Singleton instance
let workspaceInstance: WorkspaceAPI | null = null;

export function getWorkspaceAPI(): WorkspaceAPI {
  if (!workspaceInstance) {
    workspaceInstance = new WorkspaceAPI();
  }
  return workspaceInstance;
}

export const workspace = getWorkspaceAPI();
