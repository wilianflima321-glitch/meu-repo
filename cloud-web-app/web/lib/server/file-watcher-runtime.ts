/**
 * Aethel Engine - File Watcher Runtime
 * 
 * Backend real de file watching usando chokidar.
 * Integra com WebSocket server para notificações em tempo real.
 */

import chokidar, { FSWatcher, WatchOptions } from 'chokidar';
import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs/promises';
import { getWebSocketServer } from './websocket-server';

// ============================================================================
// Types
// ============================================================================

export interface FileWatcherConfig {
  workspaceId: string;
  paths: string[];
  options?: WatcherOptions;
}

export interface WatcherOptions {
  ignored?: string | RegExp | ((path: string) => boolean) | Array<string | RegExp>;
  persistent?: boolean;
  ignoreInitial?: boolean;
  followSymlinks?: boolean;
  depth?: number;
  usePolling?: boolean;
  interval?: number;
  binaryInterval?: number;
  alwaysStat?: boolean;
  awaitWriteFinish?: boolean | {
    stabilityThreshold?: number;
    pollInterval?: number;
  };
}

export interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
  path: string;
  workspaceId: string;
  timestamp: number;
  stats?: FileStats;
}

export interface FileStats {
  size: number;
  mtime: number;
  isDirectory: boolean;
}

export interface WatchedWorkspace {
  id: string;
  paths: string[];
  watcher: FSWatcher;
  options: WatcherOptions;
  createdAt: number;
  eventCount: number;
}

// ============================================================================
// Default Ignore Patterns
// ============================================================================

const DEFAULT_IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/.svn/**',
  '**/.hg/**',
  '**/CVS/**',
  '**/.DS_Store',
  '**/Thumbs.db',
  '**/*.swp',
  '**/*.swo',
  '**/*~',
  '**/dist/**',
  '**/build/**',
  '**/out/**',
  '**/.next/**',
  '**/.nuxt/**',
  '**/.cache/**',
  '**/coverage/**',
  '**/.nyc_output/**',
  '**/logs/**',
  '**/*.log',
  '**/tmp/**',
  '**/temp/**',
  '**/__pycache__/**',
  '**/*.pyc',
  '**/*.pyo',
  '**/venv/**',
  '**/.venv/**',
  '**/env/**',
  '**/.env.local',
  '**/target/**',        // Rust/Java
  '**/Intermediate/**',  // Unreal
  '**/Saved/**',         // Unreal
  '**/DerivedDataCache/**', // Unreal
];

// ============================================================================
// File Watcher Manager
// ============================================================================

export class FileWatcherManager extends EventEmitter {
  private watchers: Map<string, WatchedWorkspace> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private pendingEvents: Map<string, FileChangeEvent[]> = new Map();
  
  private readonly debounceMs = 100;
  private readonly maxEventsPerBatch = 100;
  
  constructor() {
    super();
    this.setupProcessHandlers();
  }
  
  // ==========================================================================
  // Watcher Management
  // ==========================================================================
  
  async watch(config: FileWatcherConfig): Promise<WatchedWorkspace> {
    const { workspaceId, paths, options = {} } = config;
    
    // Check if already watching
    const existing = this.watchers.get(workspaceId);
    if (existing) {
      // Add new paths to existing watcher
      existing.watcher.add(paths);
      existing.paths.push(...paths);
      return existing;
    }
    
    // Validate paths
    const validPaths: string[] = [];
    for (const p of paths) {
      try {
        await fs.access(p);
        validPaths.push(p);
      } catch {
        console.warn(`Path not accessible, skipping: ${p}`);
      }
    }
    
    if (validPaths.length === 0) {
      throw new Error('No valid paths to watch');
    }
    
    // Build watcher options
    const watcherOptions: WatchOptions = {
      persistent: options.persistent ?? true,
      ignoreInitial: options.ignoreInitial ?? true,
      followSymlinks: options.followSymlinks ?? false,
      depth: options.depth ?? 10,
      usePolling: options.usePolling ?? false,
      interval: options.interval ?? 100,
      binaryInterval: options.binaryInterval ?? 300,
      alwaysStat: options.alwaysStat ?? true,
      awaitWriteFinish: options.awaitWriteFinish ?? {
        stabilityThreshold: 200,
        pollInterval: 100,
      },
      ignored: [
        ...DEFAULT_IGNORE_PATTERNS,
        ...(Array.isArray(options.ignored) ? options.ignored : options.ignored ? [options.ignored] : []),
      ],
    };
    
    // Create watcher
    const watcher = chokidar.watch(validPaths, watcherOptions);
    
    const workspace: WatchedWorkspace = {
      id: workspaceId,
      paths: validPaths,
      watcher,
      options: options,
      createdAt: Date.now(),
      eventCount: 0,
    };
    
    // Setup event handlers
    this.setupWatcherEvents(workspace);
    
    this.watchers.set(workspaceId, workspace);
    this.emit('watcherCreated', { workspaceId, paths: validPaths });
    
    // Wait for ready
    await new Promise<void>((resolve) => {
      watcher.on('ready', () => {
        console.log(`File watcher ready for workspace: ${workspaceId}`);
        resolve();
      });
    });
    
    return workspace;
  }
  
  async unwatch(workspaceId: string): Promise<boolean> {
    const workspace = this.watchers.get(workspaceId);
    if (!workspace) return false;
    
    await workspace.watcher.close();
    this.watchers.delete(workspaceId);
    
    // Clear any pending timers
    const timer = this.debounceTimers.get(workspaceId);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(workspaceId);
    }
    this.pendingEvents.delete(workspaceId);
    
    this.emit('watcherClosed', { workspaceId });
    return true;
  }
  
  async unwatchAll(): Promise<void> {
    const ids = Array.from(this.watchers.keys());
    await Promise.all(ids.map(id => this.unwatch(id)));
  }
  
  // ==========================================================================
  // Event Handling
  // ==========================================================================
  
  private setupWatcherEvents(workspace: WatchedWorkspace): void {
    const { watcher, id: workspaceId } = workspace;
    
    const createEvent = (type: FileChangeEvent['type'], filePath: string, stats?: any): FileChangeEvent => ({
      type,
      path: filePath,
      workspaceId,
      timestamp: Date.now(),
      stats: stats ? {
        size: stats.size || 0,
        mtime: stats.mtimeMs || Date.now(),
        isDirectory: stats.isDirectory?.() || false,
      } : undefined,
    });
    
    // File events
    watcher.on('add', (filePath, stats) => {
      this.queueEvent(createEvent('add', filePath, stats));
    });
    
    watcher.on('change', (filePath, stats) => {
      this.queueEvent(createEvent('change', filePath, stats));
    });
    
    watcher.on('unlink', (filePath) => {
      this.queueEvent(createEvent('unlink', filePath));
    });
    
    // Directory events
    watcher.on('addDir', (dirPath, stats) => {
      this.queueEvent(createEvent('addDir', dirPath, stats));
    });
    
    watcher.on('unlinkDir', (dirPath) => {
      this.queueEvent(createEvent('unlinkDir', dirPath));
    });
    
    // Error handling
    watcher.on('error', (error) => {
      console.error(`Watcher error for ${workspaceId}:`, error);
      this.emit('watcherError', { workspaceId, error });
    });
  }
  
  private queueEvent(event: FileChangeEvent): void {
    const { workspaceId } = event;
    
    // Get or create pending events array
    let pending = this.pendingEvents.get(workspaceId);
    if (!pending) {
      pending = [];
      this.pendingEvents.set(workspaceId, pending);
    }
    
    // Add event (with deduplication)
    const existingIndex = pending.findIndex(e => e.path === event.path && e.type === event.type);
    if (existingIndex >= 0) {
      pending[existingIndex] = event; // Update with latest
    } else {
      pending.push(event);
    }
    
    // Update event count
    const workspace = this.watchers.get(workspaceId);
    if (workspace) {
      workspace.eventCount++;
    }
    
    // Debounce flush
    this.scheduleFlush(workspaceId);
  }
  
  private scheduleFlush(workspaceId: string): void {
    // Clear existing timer
    const existing = this.debounceTimers.get(workspaceId);
    if (existing) {
      clearTimeout(existing);
    }
    
    // Set new timer
    const timer = setTimeout(() => {
      this.flushEvents(workspaceId);
    }, this.debounceMs);
    
    this.debounceTimers.set(workspaceId, timer);
  }
  
  private flushEvents(workspaceId: string): void {
    const events = this.pendingEvents.get(workspaceId);
    if (!events || events.length === 0) return;
    
    // Clear pending
    this.pendingEvents.set(workspaceId, []);
    this.debounceTimers.delete(workspaceId);
    
    // Batch if too many events
    const batches: FileChangeEvent[][] = [];
    for (let i = 0; i < events.length; i += this.maxEventsPerBatch) {
      batches.push(events.slice(i, i + this.maxEventsPerBatch));
    }
    
    // Process batches
    for (const batch of batches) {
      this.processEventBatch(workspaceId, batch);
    }
  }
  
  private processEventBatch(workspaceId: string, events: FileChangeEvent[]): void {
    // Emit local event
    this.emit('fileChanges', { workspaceId, events });
    
    // Notify via WebSocket
    try {
      const wsServer = getWebSocketServer();
      
      for (const event of events) {
        const wsEventType = this.mapEventType(event.type);
        wsServer.notifyFileChange(workspaceId, {
          type: wsEventType,
          path: event.path,
        });
      }
    } catch (error) {
      // WebSocket server might not be running
      console.debug('WebSocket notification skipped:', error);
    }
  }
  
  private mapEventType(type: FileChangeEvent['type']): 'changed' | 'created' | 'deleted' | 'renamed' {
    switch (type) {
      case 'add':
      case 'addDir':
        return 'created';
      case 'change':
        return 'changed';
      case 'unlink':
      case 'unlinkDir':
        return 'deleted';
      default:
        return 'changed';
    }
  }
  
  // ==========================================================================
  // Path Operations
  // ==========================================================================
  
  addPaths(workspaceId: string, paths: string[]): boolean {
    const workspace = this.watchers.get(workspaceId);
    if (!workspace) return false;
    
    workspace.watcher.add(paths);
    workspace.paths.push(...paths);
    return true;
  }
  
  removePaths(workspaceId: string, paths: string[]): boolean {
    const workspace = this.watchers.get(workspaceId);
    if (!workspace) return false;
    
    workspace.watcher.unwatch(paths);
    workspace.paths = workspace.paths.filter(p => !paths.includes(p));
    return true;
  }
  
  // ==========================================================================
  // Status & Info
  // ==========================================================================
  
  getWatcher(workspaceId: string): WatchedWorkspace | undefined {
    return this.watchers.get(workspaceId);
  }
  
  getAllWatchers(): WatchedWorkspace[] {
    return Array.from(this.watchers.values());
  }
  
  getStats(): {
    totalWatchers: number;
    totalPaths: number;
    totalEvents: number;
  } {
    let totalPaths = 0;
    let totalEvents = 0;
    
    for (const workspace of this.watchers.values()) {
      totalPaths += workspace.paths.length;
      totalEvents += workspace.eventCount;
    }
    
    return {
      totalWatchers: this.watchers.size,
      totalPaths,
      totalEvents,
    };
  }
  
  async getWatchedFiles(workspaceId: string): Promise<string[]> {
    const workspace = this.watchers.get(workspaceId);
    if (!workspace) return [];
    
    const watched = workspace.watcher.getWatched();
    const files: string[] = [];
    
    for (const [dir, names] of Object.entries(watched)) {
      for (const name of names) {
        files.push(path.join(dir, name));
      }
    }
    
    return files;
  }
  
  // ==========================================================================
  // Cleanup
  // ==========================================================================
  
  private setupProcessHandlers(): void {
    const cleanup = async () => {
      console.log('Cleaning up file watchers...');
      await this.unwatchAll();
    };
    
    process.on('beforeExit', cleanup);
    process.on('SIGINT', async () => {
      await cleanup();
      process.exit(0);
    });
    process.on('SIGTERM', async () => {
      await cleanup();
      process.exit(0);
    });
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let _manager: FileWatcherManager | null = null;

export function getFileWatcherManager(): FileWatcherManager {
  if (!_manager) {
    _manager = new FileWatcherManager();
  }
  return _manager;
}

export async function watchWorkspace(config: FileWatcherConfig): Promise<WatchedWorkspace> {
  const manager = getFileWatcherManager();
  return manager.watch(config);
}

export async function unwatchWorkspace(workspaceId: string): Promise<boolean> {
  const manager = getFileWatcherManager();
  return manager.unwatch(workspaceId);
}

export default getFileWatcherManager;
