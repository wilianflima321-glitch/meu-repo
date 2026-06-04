export interface FileInfo {
  name: string;
  path: string;
  type: 'file' | 'directory' | 'symlink';
  size: number;
  created: Date;
  modified: Date;
  accessed: Date;
  permissions: string;
  isHidden: boolean;
  extension?: string;
  mimeType?: string;
}

export interface DirectoryListing {
  path: string;
  entries: FileInfo[];
  total: number;
}

export interface FileContent {
  path: string;
  content: string;
  encoding: BufferEncoding;
  size: number;
  modified: Date;
  language?: string;
}

export interface WriteOptions {
  encoding?: BufferEncoding;
  createDirectories?: boolean;
  backup?: boolean;
  atomic?: boolean;
}

export interface CopyOptions {
  overwrite?: boolean;
  recursive?: boolean;
  preserveTimestamps?: boolean;
}

export interface MoveOptions {
  overwrite?: boolean;
}

export interface WatchOptions {
  recursive?: boolean;
  persistent?: boolean;
  ignorePatterns?: string[];
}

export interface FileChange {
  type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
  path: string;
  timestamp: Date;
}
