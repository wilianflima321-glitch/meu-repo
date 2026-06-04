/**
 * Shared contracts for the workspace service. Keep these separate so IDE-facing
 * code can depend on the API shape without pulling the singleton service body.
 */

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
