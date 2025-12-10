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
  getText(range?: any): string;
  getWordRangeAtPosition(position: any, regex?: RegExp): any;
  validateRange(range: any): any;
  validatePosition(position: any): any;
  positionAt(offset: number): any;
  offsetAt(position: any): number;
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
  update(section: string, value: any, configurationTarget?: number): Promise<void>;
}

class WorkspaceAPI {
  private workspaceFolders: WorkspaceFolder[] = [];
  private textDocuments: Map<string, TextDocument> = new Map();
  private fileWatchers: FileSystemWatcher[] = [];
  private configuration: Map<string, any> = new Map();
  private onDidChangeWorkspaceFoldersListeners: Array<(event: any) => void> = [];
  private onDidOpenTextDocumentListeners: Array<(document: TextDocument) => void> = [];
  private onDidCloseTextDocumentListeners: Array<(document: TextDocument) => void> = [];
  private onDidChangeTextDocumentListeners: Array<(event: any) => void> = [];
  private onDidSaveTextDocumentListeners: Array<(document: TextDocument) => void> = [];

  /**
   * Get workspace folders
   */
  get workspaceFolders(): WorkspaceFolder[] | undefined {
    return this.workspaceFolders.length > 0 ? this.workspaceFolders : undefined;
  }

  /**
   * Get workspace name
   */
  get name(): string | undefined {
    return this.workspaceFolders[0]?.name;
  }

  /**
   * Get workspace file
   */
  get workspaceFile(): string | undefined {
    return this.workspaceFolders.length > 0 
      ? `${this.workspaceFolders[0].uri}/.vscode/workspace.code-workspace`
      : undefined;
  }

  /**
   * Get text documents
   */
  get textDocuments(): TextDocument[] {
    return Array.from(this.textDocuments.values());
  }

  /**
   * Get workspace folder for URI
   */
  getWorkspaceFolder(uri: string): WorkspaceFolder | undefined {
    return this.workspaceFolders.find(folder => uri.startsWith(folder.uri));
  }

  /**
   * Get relative path
   */
  asRelativePath(pathOrUri: string | { path: string }, includeWorkspaceFolder?: boolean): string {
    const path = typeof pathOrUri === 'string' ? pathOrUri : pathOrUri.path;
    
    for (const folder of this.workspaceFolders) {
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
    const oldFolders = [...this.workspaceFolders];

    if (deleteCount !== null) {
      this.workspaceFolders.splice(start, deleteCount);
    }

    if (workspaceFoldersToAdd.length > 0) {
      const newFolders = workspaceFoldersToAdd.map((folder, index) => ({
        uri: folder.uri,
        name: folder.name || `Folder ${start + index}`,
        index: start + index,
      }));
      this.workspaceFolders.splice(start, 0, ...newFolders);
    }

    // Reindex
    this.workspaceFolders.forEach((folder, index) => {
      folder.index = index;
    });

    // Notify listeners
    this.onDidChangeWorkspaceFoldersListeners.forEach(listener => {
      listener({
        added: this.workspaceFolders.filter(f => !oldFolders.includes(f)),
        removed: oldFolders.filter(f => !this.workspaceFolders.includes(f)),
      });
    });

    console.log('[Workspace] Updated workspace folders:', this.workspaceFolders);
    return true;
  }

  /**
   * Open text document
   */
  async openTextDocument(uri: string | { scheme: string; path: string }): Promise<TextDocument> {
    const uriStr = typeof uri === 'string' ? uri : `${uri.scheme}://${uri.path}`;

    // Check if already open
    if (this.textDocuments.has(uriStr)) {
      return this.textDocuments.get(uriStr)!;
    }

    // Create new document
    const document = this.createTextDocument(uriStr);
    this.textDocuments.set(uriStr, document);

    // Notify listeners
    this.onDidOpenTextDocumentListeners.forEach(listener => listener(document));

    console.log('[Workspace] Opened text document:', uriStr);
    return document;
  }

  /**
   * Save text document
   */
  async saveTextDocument(document: TextDocument): Promise<boolean> {
    console.log('[Workspace] Saving document:', document.uri);

    // Mark as not dirty
    (document as any).isDirty = false;

    // Notify listeners
    this.onDidSaveTextDocumentListeners.forEach(listener => listener(document));

    return true;
  }

  /**
   * Save all text documents
   */
  async saveAll(includeUntitled?: boolean): Promise<boolean> {
    const documents = includeUntitled 
      ? this.textDocuments 
      : Array.from(this.textDocuments.values()).filter(d => !d.isUntitled);

    for (const document of documents) {
      await this.saveTextDocument(document);
    }

    console.log('[Workspace] Saved all documents');
    return true;
  }

  /**
   * Apply edit
   */
  async applyEdit(edit: any): Promise<boolean> {
    console.log('[Workspace] Applying edit:', edit);

    // Mock implementation
    return true;
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
    console.log('[Workspace] Created file system watcher:', globPattern);

    return watcher;
  }

  /**
   * Find files
   */
  async findFiles(
    include: string,
    exclude?: string | null,
    maxResults?: number,
    token?: any
  ): Promise<string[]> {
    console.log('[Workspace] Finding files:', { include, exclude, maxResults });

    // Mock implementation
    return [];
  }

  /**
   * Get configuration
   */
  getConfiguration(section?: string, scope?: any): WorkspaceConfiguration {
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
      update: async (key: string, value: any, target?: number) => {
        const fullKey = section ? `${section}.${key}` : key;
        this.configuration.set(fullKey, value);
        console.log('[Workspace] Updated configuration:', fullKey, value);
      },
    };

    return config;
  }

  /**
   * Register text document content provider
   */
  registerTextDocumentContentProvider(
    scheme: string,
    provider: any
  ): { dispose: () => void } {
    console.log('[Workspace] Registered text document content provider:', scheme);

    return {
      dispose: () => {
        console.log('[Workspace] Disposed text document content provider:', scheme);
      },
    };
  }

  /**
   * Register file system provider
   */
  registerFileSystemProvider(
    scheme: string,
    provider: any,
    options?: any
  ): { dispose: () => void } {
    console.log('[Workspace] Registered file system provider:', scheme);

    return {
      dispose: () => {
        console.log('[Workspace] Disposed file system provider:', scheme);
      },
    };
  }

  /**
   * Event listeners
   */
  onDidChangeWorkspaceFolders(listener: (event: any) => void): { dispose: () => void } {
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

  onDidChangeTextDocument(listener: (event: any) => void): { dispose: () => void } {
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

  onDidChangeConfiguration(listener: (event: any) => void): { dispose: () => void } {
    console.log('[Workspace] Registered configuration change listener');
    return {
      dispose: () => {
        console.log('[Workspace] Disposed configuration change listener');
      },
    };
  }

  /**
   * Create text document
   */
  private createTextDocument(uri: string): TextDocument {
    const fileName = uri.split('/').pop() || 'untitled';
    const languageId = this.detectLanguageId(fileName);

    return {
      uri,
      fileName,
      isUntitled: uri.startsWith('untitled:'),
      languageId,
      version: 1,
      isDirty: false,
      isClosed: false,
      save: async () => this.saveTextDocument(this as any),
      eol: 1, // LF
      lineCount: 0,
      getText: (range?: any) => '',
      getWordRangeAtPosition: (position: any, regex?: RegExp) => undefined,
      validateRange: (range: any) => range,
      validatePosition: (position: any) => position,
      positionAt: (offset: number) => ({ line: 0, character: offset }),
      offsetAt: (position: any) => position.character,
    };
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
    this.workspaceFolders = folders.map((folder, index) => ({
      ...folder,
      index,
    }));
    console.log('[Workspace] Initialized with folders:', this.workspaceFolders);
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
