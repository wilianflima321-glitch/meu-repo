/**
 * Aethel Engine - Hot Reload Server
 * 
 * Servidor de hot reload real com HMR para React/Next.js.
 * Integra com file watcher para recarregamento automático.
 */

import { EventEmitter } from 'events';
import { getFileWatcherManager, FileChangeEvent } from './file-watcher-runtime';
import { getWebSocketServer, AethelWebSocketServer } from './websocket-server';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface HotReloadConfig {
  workspaceId: string;
  workspacePath: string;
  watchPaths?: string[];
  hmrEnabled?: boolean;
  fastRefresh?: boolean;
  fullReloadPatterns?: string[];
  ignorePatterns?: string[];
}

export interface ModuleUpdate {
  type: 'update' | 'full-reload' | 'css-update';
  path: string;
  hash?: string;
  content?: string;
  timestamp: number;
}

export interface HotReloadState {
  isEnabled: boolean;
  connectedClients: number;
  lastUpdate: number;
  updateCount: number;
  pendingUpdates: ModuleUpdate[];
}

// ============================================================================
// File Hash Cache
// ============================================================================

class FileHashCache {
  private cache: Map<string, { hash: string; mtime: number }> = new Map();
  
  async getHash(filePath: string): Promise<string> {
    try {
      const stat = await fs.stat(filePath);
      const cached = this.cache.get(filePath);
      
      if (cached && cached.mtime === stat.mtimeMs) {
        return cached.hash;
      }
      
      const content = await fs.readFile(filePath);
      // Cast to Uint8Array for crypto compatibility
      const hash = crypto.createHash('md5').update(new Uint8Array(content)).digest('hex');
      
      this.cache.set(filePath, { hash, mtime: stat.mtimeMs });
      return hash;
    } catch {
      return '';
    }
  }
  
  invalidate(filePath: string): void {
    this.cache.delete(filePath);
  }
  
  clear(): void {
    this.cache.clear();
  }
}

// ============================================================================
// Hot Reload Manager
// ============================================================================

export class HotReloadManager extends EventEmitter {
  private configs: Map<string, HotReloadConfig> = new Map();
  private hashCache: FileHashCache;
  private updateCount = 0;
  private lastUpdate = 0;
  private pendingUpdates: ModuleUpdate[] = [];
  private debounceTimer: NodeJS.Timeout | null = null;
  private readonly debounceMs = 50;
  
  // Patterns that require full reload
  private readonly fullReloadPatterns = [
    /package\.json$/,
    /tsconfig\.json$/,
    /next\.config\.(js|ts|mjs)$/,
    /\.env(\..+)?$/,
    /tailwind\.config\.(js|ts)$/,
    /postcss\.config\.(js|ts)$/,
  ];
  
  // CSS patterns for CSS-only updates
  private readonly cssPatterns = [
    /\.css$/,
    /\.scss$/,
    /\.sass$/,
    /\.less$/,
  ];
  
  constructor() {
    super();
    this.hashCache = new FileHashCache();
    this.setupFileWatcherIntegration();
  }
  
  // ==========================================================================
  // Configuration
  // ==========================================================================
  
  async enable(config: HotReloadConfig): Promise<void> {
    const { workspaceId, workspacePath, watchPaths = ['src', 'app', 'pages', 'components', 'lib'] } = config;
    
    // Store config
    this.configs.set(workspaceId, {
      ...config,
      hmrEnabled: config.hmrEnabled ?? true,
      fastRefresh: config.fastRefresh ?? true,
    });
    
    // Setup file watching
    const fileWatcher = getFileWatcherManager();
    const absolutePaths = watchPaths.map(p => path.join(workspacePath, p));
    
    // Filter to existing paths
    const existingPaths: string[] = [];
    for (const p of absolutePaths) {
      try {
        await fs.access(p);
        existingPaths.push(p);
      } catch {}
    }
    
    if (existingPaths.length > 0) {
      await fileWatcher.watch({
        workspaceId,
        paths: existingPaths,
        options: {
          ignoreInitial: true,
          depth: 10,
        },
      });
    }
    
    console.log(`[HotReload] Enabled for workspace ${workspaceId}, watching ${existingPaths.length} paths`);
    this.emit('enabled', { workspaceId });
  }
  
  disable(workspaceId: string): void {
    this.configs.delete(workspaceId);
    
    const fileWatcher = getFileWatcherManager();
    fileWatcher.unwatch(workspaceId);
    
    console.log(`[HotReload] Disabled for workspace ${workspaceId}`);
    this.emit('disabled', { workspaceId });
  }
  
  // ==========================================================================
  // File Change Handling
  // ==========================================================================
  
  private setupFileWatcherIntegration(): void {
    const fileWatcher = getFileWatcherManager();
    
    fileWatcher.on('fileChanges', ({ workspaceId, events }: { workspaceId: string; events: FileChangeEvent[] }) => {
      const config = this.configs.get(workspaceId);
      if (!config || !config.hmrEnabled) return;
      
      this.handleFileChanges(workspaceId, events);
    });
  }
  
  private handleFileChanges(workspaceId: string, events: FileChangeEvent[]): void {
    const config = this.configs.get(workspaceId);
    if (!config) return;
    
    for (const event of events) {
      // Skip directories
      if (event.type === 'addDir' || event.type === 'unlinkDir') continue;
      
      const update = this.createModuleUpdate(event, config);
      if (update) {
        this.queueUpdate(update);
      }
    }
  }
  
  private createModuleUpdate(event: FileChangeEvent, config: HotReloadConfig): ModuleUpdate | null {
    const filePath = event.path;
    const relativePath = path.relative(config.workspacePath, filePath);
    
    // Check if full reload is needed
    const needsFullReload = this.fullReloadPatterns.some(pattern => pattern.test(filePath));
    if (needsFullReload) {
      return {
        type: 'full-reload',
        path: relativePath,
        timestamp: event.timestamp,
      };
    }
    
    // Check if CSS-only update
    const isCss = this.cssPatterns.some(pattern => pattern.test(filePath));
    if (isCss) {
      return {
        type: 'css-update',
        path: relativePath,
        timestamp: event.timestamp,
      };
    }
    
    // Regular HMR update
    return {
      type: 'update',
      path: relativePath,
      timestamp: event.timestamp,
    };
  }
  
  private queueUpdate(update: ModuleUpdate): void {
    this.pendingUpdates.push(update);
    this.hashCache.invalidate(update.path);
    
    // Debounce to batch rapid changes
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(() => {
      this.flushUpdates();
    }, this.debounceMs);
  }
  
  private async flushUpdates(): Promise<void> {
    if (this.pendingUpdates.length === 0) return;
    
    const updates = [...this.pendingUpdates];
    this.pendingUpdates = [];
    
    // Determine if full reload is needed
    const needsFullReload = updates.some(u => u.type === 'full-reload');
    
    // Get unique updates (last one wins for same path)
    const uniqueUpdates = new Map<string, ModuleUpdate>();
    for (const update of updates) {
      uniqueUpdates.set(update.path, update);
    }
    
    const finalUpdates = Array.from(uniqueUpdates.values());
    
    // Update stats
    this.updateCount += finalUpdates.length;
    this.lastUpdate = Date.now();
    
    // Broadcast to clients
    this.broadcastUpdates(finalUpdates, needsFullReload);
    
    // Emit event
    this.emit('updates', {
      updates: finalUpdates,
      needsFullReload,
    });
    
    console.log(`[HotReload] Processed ${finalUpdates.length} updates, full reload: ${needsFullReload}`);
  }
  
  private broadcastUpdates(updates: ModuleUpdate[], needsFullReload: boolean): void {
    try {
      const wsServer = getWebSocketServer();
      
      const message = {
        type: 'hmr:update',
        channel: 'hmr',
        payload: {
          updates,
          needsFullReload,
          timestamp: Date.now(),
        },
      };
      
      // Broadcast to all HMR subscribers
      wsServer.broadcastToChannel('hmr', message);
      
      // Also broadcast to specific workspace channels
      for (const [workspaceId] of this.configs) {
        wsServer.broadcastToChannel(`hmr:${workspaceId}`, message);
      }
    } catch (error) {
      console.debug('[HotReload] WebSocket broadcast skipped:', error);
    }
  }
  
  // ==========================================================================
  // Manual Triggers
  // ==========================================================================
  
  triggerFullReload(workspaceId?: string): void {
    console.log('[HotReload] Manual full reload triggered');
    
    this.broadcastUpdates([{
      type: 'full-reload',
      path: '*',
      timestamp: Date.now(),
    }], true);
  }
  
  async triggerModuleReload(filePath: string): Promise<void> {
    const hash = await this.hashCache.getHash(filePath);
    
    const update: ModuleUpdate = {
      type: 'update',
      path: filePath,
      hash,
      timestamp: Date.now(),
    };
    
    this.broadcastUpdates([update], false);
    this.emit('moduleReloaded', { path: filePath });
  }
  
  // ==========================================================================
  // State
  // ==========================================================================
  
  getState(workspaceId?: string): HotReloadState {
    const config = workspaceId ? this.configs.get(workspaceId) : null;
    
    return {
      isEnabled: workspaceId ? this.configs.has(workspaceId) : this.configs.size > 0,
      connectedClients: this.getConnectedClientsCount(),
      lastUpdate: this.lastUpdate,
      updateCount: this.updateCount,
      pendingUpdates: [...this.pendingUpdates],
    };
  }
  
  private getConnectedClientsCount(): number {
    try {
      const wsServer = getWebSocketServer();
      return wsServer.getStats().clients;
    } catch {
      return 0;
    }
  }
  
  getEnabledWorkspaces(): string[] {
    return Array.from(this.configs.keys());
  }
  
  // ==========================================================================
  // Cleanup
  // ==========================================================================
  
  shutdown(): void {
    for (const workspaceId of this.configs.keys()) {
      this.disable(workspaceId);
    }
    
    this.hashCache.clear();
    this.pendingUpdates = [];
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let _manager: HotReloadManager | null = null;

export function getHotReloadManager(): HotReloadManager {
  if (!_manager) {
    _manager = new HotReloadManager();
  }
  return _manager;
}

export async function enableHotReload(config: HotReloadConfig): Promise<void> {
  const manager = getHotReloadManager();
  await manager.enable(config);
}

export function disableHotReload(workspaceId: string): void {
  const manager = getHotReloadManager();
  manager.disable(workspaceId);
}

export default getHotReloadManager;
