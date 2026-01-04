/**
 * Aethel File System Runtime - Backend Real
 * 
 * Sistema de arquivos real com operações de leitura, escrita,
 * criação, deleção e monitoramento.
 * 
 * Features:
 * - CRUD completo de arquivos e diretórios
 * - File watching em tempo real
 * - Operações atômicas
 * - Backup antes de modificação
 * - Suporte a encoding variados
 * - Compressão para downloads
 */

import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createGzip, createGunzip } from 'zlib';
import { resolveWorkspaceRoot } from './workspace-path';

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// MIME TYPES
// ============================================================================

const MIME_TYPES: Record<string, string> = {
  // Text
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.yaml': 'text/yaml',
  '.yml': 'text/yaml',
  '.csv': 'text/csv',
  
  // Code
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.cjs': 'text/javascript',
  '.ts': 'text/typescript',
  '.tsx': 'text/typescript-jsx',
  '.jsx': 'text/javascript-jsx',
  '.py': 'text/x-python',
  '.rb': 'text/x-ruby',
  '.go': 'text/x-go',
  '.rs': 'text/x-rust',
  '.java': 'text/x-java',
  '.c': 'text/x-c',
  '.cpp': 'text/x-c++',
  '.h': 'text/x-c',
  '.hpp': 'text/x-c++',
  '.cs': 'text/x-csharp',
  '.php': 'text/x-php',
  '.swift': 'text/x-swift',
  '.kt': 'text/x-kotlin',
  '.scala': 'text/x-scala',
  
  // Web
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.scss': 'text/x-scss',
  '.sass': 'text/x-sass',
  '.less': 'text/x-less',
  '.vue': 'text/x-vue',
  '.svelte': 'text/x-svelte',
  
  // Config
  '.toml': 'text/x-toml',
  '.ini': 'text/x-ini',
  '.env': 'text/plain',
  '.gitignore': 'text/plain',
  '.dockerignore': 'text/plain',
  
  // Images
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  
  // Audio
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  
  // Video
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
  
  // Archives
  '.zip': 'application/zip',
  '.tar': 'application/x-tar',
  '.gz': 'application/gzip',
  '.rar': 'application/vnd.rar',
  '.7z': 'application/x-7z-compressed',
  
  // Documents
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  
  // Fonts
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  
  // Binary
  '.exe': 'application/x-msdownload',
  '.dll': 'application/x-msdownload',
  '.so': 'application/x-sharedlib',
  '.wasm': 'application/wasm',
};

const LANGUAGE_MAP: Record<string, string> = {
  '.js': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescriptreact',
  '.jsx': 'javascriptreact',
  '.py': 'python',
  '.rb': 'ruby',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.cs': 'csharp',
  '.php': 'php',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.scala': 'scala',
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.sass': 'sass',
  '.less': 'less',
  '.vue': 'vue',
  '.svelte': 'svelte',
  '.json': 'json',
  '.xml': 'xml',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.md': 'markdown',
  '.sql': 'sql',
  '.sh': 'shellscript',
  '.bash': 'shellscript',
  '.zsh': 'shellscript',
  '.ps1': 'powershell',
  '.dockerfile': 'dockerfile',
  '.toml': 'toml',
  '.ini': 'ini',
};

// ============================================================================
// FILE SYSTEM RUNTIME CLASS
// ============================================================================

export class FileSystemRuntime extends EventEmitter {
  private watchers: Map<string, fsSync.FSWatcher> = new Map();
  
  constructor() {
    super();
  }
  
  // ==========================================================================
  // READ OPERATIONS
  // ==========================================================================
  
  /**
   * Lista conteúdo de um diretório
   */
  async listDirectory(dirPath: string, options?: { 
    recursive?: boolean;
    includeHidden?: boolean;
    sortBy?: 'name' | 'size' | 'modified' | 'type';
    sortOrder?: 'asc' | 'desc';
  }): Promise<DirectoryListing> {
    const resolvedPath = resolveWorkspaceRoot(dirPath);
    const entries: FileInfo[] = [];
    
    const {
      recursive = false,
      includeHidden = false,
      sortBy = 'name',
      sortOrder = 'asc',
    } = options || {};
    
    await this.walkDirectory(resolvedPath, entries, recursive, includeHidden);
    
    // Sort entries
    entries.sort((a, b) => {
      let comparison = 0;
      
      // Directories first
      if (a.type === 'directory' && b.type !== 'directory') return -1;
      if (a.type !== 'directory' && b.type === 'directory') return 1;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'modified':
          comparison = a.modified.getTime() - b.modified.getTime();
          break;
        case 'type':
          comparison = (a.extension || '').localeCompare(b.extension || '');
          break;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });
    
    return {
      path: resolvedPath,
      entries,
      total: entries.length,
    };
  }
  
  private async walkDirectory(
    dirPath: string,
    entries: FileInfo[],
    recursive: boolean,
    includeHidden: boolean
  ): Promise<void> {
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const item of items) {
      if (!includeHidden && item.name.startsWith('.')) {
        continue;
      }
      
      const fullPath = path.join(dirPath, item.name);
      const info = await this.getFileInfo(fullPath);
      entries.push(info);
      
      if (recursive && item.isDirectory()) {
        await this.walkDirectory(fullPath, entries, recursive, includeHidden);
      }
    }
  }
  
  /**
   * Obtém informações de um arquivo/diretório
   */
  async getFileInfo(filePath: string): Promise<FileInfo> {
    const resolvedPath = resolveWorkspaceRoot(filePath);
    const stats = await fs.stat(resolvedPath);
    const lstat = await fs.lstat(resolvedPath);
    
    const name = path.basename(resolvedPath);
    const ext = path.extname(resolvedPath).toLowerCase();
    
    return {
      name,
      path: resolvedPath,
      type: lstat.isSymbolicLink() ? 'symlink' : stats.isDirectory() ? 'directory' : 'file',
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      accessed: stats.atime,
      permissions: this.formatPermissions(stats.mode),
      isHidden: name.startsWith('.'),
      extension: ext || undefined,
      mimeType: MIME_TYPES[ext] || undefined,
    };
  }
  
  /**
   * Lê conteúdo de um arquivo
   */
  async readFile(filePath: string, options?: {
    encoding?: BufferEncoding;
    maxSize?: number;
  }): Promise<FileContent> {
    const resolvedPath = resolveWorkspaceRoot(filePath);
    const { encoding = 'utf-8', maxSize = 10 * 1024 * 1024 } = options || {}; // 10MB default
    
    const stats = await fs.stat(resolvedPath);
    
    if (stats.size > maxSize) {
      throw new Error(`File too large: ${stats.size} bytes (max: ${maxSize})`);
    }
    
    const content = await fs.readFile(resolvedPath, encoding);
    const ext = path.extname(resolvedPath).toLowerCase();
    
    return {
      path: resolvedPath,
      content,
      encoding,
      size: stats.size,
      modified: stats.mtime,
      language: LANGUAGE_MAP[ext],
    };
  }
  
  /**
   * Lê arquivo como buffer (para binários)
   */
  async readFileBinary(filePath: string): Promise<Buffer> {
    const resolvedPath = resolveWorkspaceRoot(filePath);
    return fs.readFile(resolvedPath);
  }
  
  /**
   * Verifica se arquivo/diretório existe
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      const resolvedPath = resolveWorkspaceRoot(filePath);
      await fs.access(resolvedPath);
      return true;
    } catch {
      return false;
    }
  }
  
  // ==========================================================================
  // WRITE OPERATIONS
  // ==========================================================================
  
  /**
   * Escreve conteúdo em um arquivo
   */
  async writeFile(filePath: string, content: string | Buffer, options?: WriteOptions): Promise<void> {
    const resolvedPath = resolveWorkspaceRoot(filePath);
    const {
      encoding = 'utf-8',
      createDirectories = true,
      backup = false,
      atomic = true,
    } = options || {};
    
    // Create parent directories if needed
    if (createDirectories) {
      await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
    }
    
    // Backup existing file
    if (backup && await this.exists(resolvedPath)) {
      const backupPath = `${resolvedPath}.bak`;
      await fs.copyFile(resolvedPath, backupPath);
    }
    
    if (atomic) {
      // Write to temp file first, then rename (atomic operation)
      const tempPath = `${resolvedPath}.tmp`;
      
      if (typeof content === 'string') {
        await fs.writeFile(tempPath, content, encoding);
      } else {
        // Cast Buffer to Uint8Array for compatibility
        await fs.writeFile(tempPath, new Uint8Array(content));
      }
      
      await fs.rename(tempPath, resolvedPath);
    } else {
      if (typeof content === 'string') {
        await fs.writeFile(resolvedPath, content, encoding);
      } else {
        // Cast Buffer to Uint8Array for compatibility
        await fs.writeFile(resolvedPath, new Uint8Array(content));
      }
    }
    
    this.emit('fileChanged', { type: 'change', path: resolvedPath, timestamp: new Date() });
  }
  
  /**
   * Cria um novo diretório
   */
  async createDirectory(dirPath: string, options?: { recursive?: boolean }): Promise<void> {
    const resolvedPath = resolveWorkspaceRoot(dirPath);
    await fs.mkdir(resolvedPath, { recursive: options?.recursive ?? true });
    this.emit('fileChanged', { type: 'addDir', path: resolvedPath, timestamp: new Date() });
  }
  
  /**
   * Deleta arquivo ou diretório
   */
  async delete(filePath: string, options?: { recursive?: boolean; force?: boolean }): Promise<void> {
    const resolvedPath = resolveWorkspaceRoot(filePath);
    const stats = await fs.stat(resolvedPath);
    
    if (stats.isDirectory()) {
      await fs.rm(resolvedPath, { 
        recursive: options?.recursive ?? true,
        force: options?.force ?? false,
      });
      this.emit('fileChanged', { type: 'unlinkDir', path: resolvedPath, timestamp: new Date() });
    } else {
      await fs.unlink(resolvedPath);
      this.emit('fileChanged', { type: 'unlink', path: resolvedPath, timestamp: new Date() });
    }
  }
  
  /**
   * Copia arquivo ou diretório
   */
  async copy(srcPath: string, destPath: string, options?: CopyOptions): Promise<void> {
    const resolvedSrc = resolveWorkspaceRoot(srcPath);
    const resolvedDest = resolveWorkspaceRoot(destPath);
    
    const {
      overwrite = false,
      recursive = true,
      preserveTimestamps = true,
    } = options || {};
    
    // Check if destination exists
    if (!overwrite && await this.exists(resolvedDest)) {
      throw new Error(`Destination already exists: ${resolvedDest}`);
    }
    
    const stats = await fs.stat(resolvedSrc);
    
    if (stats.isDirectory()) {
      await this.copyDirectory(resolvedSrc, resolvedDest, recursive, preserveTimestamps);
    } else {
      await fs.mkdir(path.dirname(resolvedDest), { recursive: true });
      await fs.copyFile(resolvedSrc, resolvedDest);
      
      if (preserveTimestamps) {
        await fs.utimes(resolvedDest, stats.atime, stats.mtime);
      }
    }
    
    this.emit('fileChanged', { type: 'add', path: resolvedDest, timestamp: new Date() });
  }
  
  private async copyDirectory(src: string, dest: string, recursive: boolean, preserveTimestamps: boolean): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        if (recursive) {
          await this.copyDirectory(srcPath, destPath, recursive, preserveTimestamps);
        }
      } else {
        const stats = await fs.stat(srcPath);
        await fs.copyFile(srcPath, destPath);
        
        if (preserveTimestamps) {
          await fs.utimes(destPath, stats.atime, stats.mtime);
        }
      }
    }
  }
  
  /**
   * Move/renomeia arquivo ou diretório
   */
  async move(srcPath: string, destPath: string, options?: MoveOptions): Promise<void> {
    const resolvedSrc = resolveWorkspaceRoot(srcPath);
    const resolvedDest = resolveWorkspaceRoot(destPath);
    
    const { overwrite = false } = options || {};
    
    if (!overwrite && await this.exists(resolvedDest)) {
      throw new Error(`Destination already exists: ${resolvedDest}`);
    }
    
    // Create parent directory
    await fs.mkdir(path.dirname(resolvedDest), { recursive: true });
    
    // Try rename first (faster for same filesystem)
    try {
      await fs.rename(resolvedSrc, resolvedDest);
    } catch (error: any) {
      // If rename fails (cross-device), fall back to copy+delete
      if (error.code === 'EXDEV') {
        await this.copy(resolvedSrc, resolvedDest, { overwrite: true });
        await this.delete(resolvedSrc, { recursive: true, force: true });
      } else {
        throw error;
      }
    }
    
    this.emit('fileChanged', { type: 'unlink', path: resolvedSrc, timestamp: new Date() });
    this.emit('fileChanged', { type: 'add', path: resolvedDest, timestamp: new Date() });
  }
  
  // ==========================================================================
  // WATCHING
  // ==========================================================================
  
  /**
   * Inicia watching de um caminho
   */
  watch(watchPath: string, options?: WatchOptions): string {
    const resolvedPath = resolveWorkspaceRoot(watchPath);
    const watchId = `watch_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    const watcher = fsSync.watch(
      resolvedPath,
      {
        recursive: options?.recursive ?? true,
        persistent: options?.persistent ?? true,
      },
      (eventType, filename) => {
        if (!filename) return;
        
        const fullPath = path.join(resolvedPath, filename);
        
        // Ignore patterns
        if (options?.ignorePatterns) {
          for (const pattern of options.ignorePatterns) {
            if (fullPath.includes(pattern)) return;
          }
        }
        
        const change: FileChange = {
          type: eventType === 'rename' ? 'add' : 'change',
          path: fullPath,
          timestamp: new Date(),
        };
        
        this.emit('watch', { watchId, ...change });
      }
    );
    
    this.watchers.set(watchId, watcher);
    return watchId;
  }
  
  /**
   * Para watching
   */
  unwatch(watchId: string): void {
    const watcher = this.watchers.get(watchId);
    if (watcher) {
      watcher.close();
      this.watchers.delete(watchId);
    }
  }
  
  /**
   * Para todos os watchers
   */
  unwatchAll(): void {
    for (const [id, watcher] of this.watchers) {
      watcher.close();
    }
    this.watchers.clear();
  }
  
  // ==========================================================================
  // UTILITIES
  // ==========================================================================
  
  /**
   * Comprime arquivo
   */
  async compress(srcPath: string, destPath?: string): Promise<string> {
    const resolvedSrc = resolveWorkspaceRoot(srcPath);
    const resolvedDest = destPath 
      ? resolveWorkspaceRoot(destPath) 
      : `${resolvedSrc}.gz`;
    
    await pipeline(
      createReadStream(resolvedSrc),
      createGzip(),
      createWriteStream(resolvedDest)
    );
    
    return resolvedDest;
  }
  
  /**
   * Descomprime arquivo
   */
  async decompress(srcPath: string, destPath?: string): Promise<string> {
    const resolvedSrc = resolveWorkspaceRoot(srcPath);
    const resolvedDest = destPath 
      ? resolveWorkspaceRoot(destPath)
      : resolvedSrc.replace(/\.gz$/, '');
    
    await pipeline(
      createReadStream(resolvedSrc),
      createGunzip(),
      createWriteStream(resolvedDest)
    );
    
    return resolvedDest;
  }
  
  /**
   * Calcula hash de arquivo
   */
  async getFileHash(filePath: string, algorithm: 'md5' | 'sha1' | 'sha256' = 'sha256'): Promise<string> {
    const crypto = await import('crypto');
    const resolvedPath = resolveWorkspaceRoot(filePath);
    
    const content = await fs.readFile(resolvedPath);
    const hash = crypto.createHash(algorithm);
    // Cast Buffer to Uint8Array for crypto compatibility
    hash.update(new Uint8Array(content));
    
    return hash.digest('hex');
  }
  
  /**
   * Formata permissões Unix
   */
  private formatPermissions(mode: number): string {
    const permissions = [
      (mode & parseInt('0400', 8)) ? 'r' : '-',
      (mode & parseInt('0200', 8)) ? 'w' : '-',
      (mode & parseInt('0100', 8)) ? 'x' : '-',
      (mode & parseInt('040', 8)) ? 'r' : '-',
      (mode & parseInt('020', 8)) ? 'w' : '-',
      (mode & parseInt('010', 8)) ? 'x' : '-',
      (mode & parseInt('04', 8)) ? 'r' : '-',
      (mode & parseInt('02', 8)) ? 'w' : '-',
      (mode & parseInt('01', 8)) ? 'x' : '-',
    ];
    
    return permissions.join('');
  }
  
  /**
   * Obtém tipo MIME de arquivo
   */
  getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    return MIME_TYPES[ext] || 'application/octet-stream';
  }
  
  /**
   * Obtém linguagem para Monaco
   */
  getLanguage(filePath: string): string | undefined {
    const ext = path.extname(filePath).toLowerCase();
    return LANGUAGE_MAP[ext];
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let fileSystemRuntime: FileSystemRuntime | null = null;

export function getFileSystemRuntime(): FileSystemRuntime {
  if (!fileSystemRuntime) {
    fileSystemRuntime = new FileSystemRuntime();
  }
  return fileSystemRuntime;
}

export { FileSystemRuntime as default };
