/**
 * Engine Asset Pipeline - split runtime modules.
 *
 * Asset loaders, cache, manager, manifest, and importer are split so Studio
 * asset flows can lazy-load heavy browser/Three.js loader code safely.
 */

import { EventEmitter } from 'events';
import { createComponentLogger } from '@/lib/observability/logger';
import { AssetCache } from './cache';
import { AudioLoader, BinaryLoader, FontLoader, JSONLoader, ModelLoader, ShaderLoader, TextureLoader } from './loaders';
import type { Asset, AssetBundle, AssetLoader, AssetLoadOptions, AssetType } from './types';

const log = createComponentLogger('engine/asset-pipeline');

export class AssetManager extends EventEmitter {
  private static instance: AssetManager | null = null;
  
  private loaders = new Map<AssetType, AssetLoader<unknown>>();
  private extensionMap = new Map<string, AssetType>();
  private cache: AssetCache;
  private loadQueue: { id: string; priority: number; resolve: () => void }[] = [];
  private isProcessing = false;
  private maxConcurrent = 4;
  private activeLoads = 0;
  
  // Hot reload
  private watchedPaths = new Set<string>();
  private hotReloadEnabled = false;

  private constructor() {
    super();
    
    // Initialize cache with 100MB, 5 min max age, 1 min cleanup
    this.cache = new AssetCache({
      maxSize: 100 * 1024 * 1024,
      maxAge: 5 * 60 * 1000,
      cleanupInterval: 60 * 1000,
    });

    // Register default loaders
    this.registerLoader(new TextureLoader());
    this.registerLoader(new ModelLoader());
    this.registerLoader(new AudioLoader());
    this.registerLoader(new ShaderLoader());
    this.registerLoader(new JSONLoader());
    this.registerLoader(new BinaryLoader());
    this.registerLoader(new FontLoader());
  }

  static getInstance(): AssetManager {
    if (!AssetManager.instance) {
      AssetManager.instance = new AssetManager();
    }
    return AssetManager.instance;
  }

  static resetInstance(): void {
    if (AssetManager.instance) {
      AssetManager.instance.dispose();
      AssetManager.instance = null;
    }
  }

  // Loader management
  registerLoader<T>(loader: AssetLoader<T>): void {
    this.loaders.set(loader.type, loader as AssetLoader<unknown>);
    
    for (const ext of loader.extensions) {
      this.extensionMap.set(ext.toLowerCase(), loader.type);
    }
  }

  getLoaderForPath(path: string): AssetLoader<unknown> | undefined {
    const ext = '.' + path.split('.').pop()?.toLowerCase();
    const type = this.extensionMap.get(ext);
    return type ? this.loaders.get(type) : undefined;
  }

  // Loading
  async load<T>(
    path: string,
    options: AssetLoadOptions = {}
  ): Promise<Asset<T>> {
    const id = this.pathToId(path);
    
    // Check cache
    if (!options.forceReload) {
      const cached = this.cache.get<T>(id);
      if (cached && cached.status === 'loaded') {
        cached.refCount++;
        return cached;
      }
    }

    // Get loader
    const loader = this.getLoaderForPath(path);
    if (!loader) {
      throw new Error(`No loader for path: ${path}`);
    }

    // Create asset entry
    const asset: Asset<T> = {
      metadata: {
        id,
        name: path.split('/').pop() || path,
        type: loader.type,
        path,
      },
      status: 'pending',
      data: null,
      refCount: 1,
    };

    // Add to cache immediately
    this.cache.set(id, asset as Asset);

    // Add to queue
    return new Promise((resolve, reject) => {
      this.loadQueue.push({
        id,
        priority: options.priority ?? 0,
        resolve: async () => {
          try {
            asset.status = 'loading';
            this.emit('loadStart', asset);

            const data = await this.loadWithRetry(
              loader,
              path,
              options
            );

            asset.data = data as T;
            asset.status = 'loaded';
            asset.loadedAt = Date.now();
            asset.accessedAt = Date.now();

            this.emit('loadComplete', asset);

            if (this.hotReloadEnabled) {
              this.watchedPaths.add(path);
            }

            resolve(asset);
          } catch (error) {
            asset.status = 'error';
            asset.error = error as Error;
            this.emit('loadError', asset);
            reject(error);
          }
        },
      });

      // Sort by priority
      this.loadQueue.sort((a, b) => b.priority - a.priority);

      // Process queue
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.activeLoads >= this.maxConcurrent) return;

    this.isProcessing = true;

    while (this.loadQueue.length > 0 && this.activeLoads < this.maxConcurrent) {
      const item = this.loadQueue.shift();
      if (item) {
        this.activeLoads++;
        Promise.resolve().then(() => item.resolve()).finally(() => {
          this.activeLoads--;
          this.processQueue();
        });
      }
    }

    this.isProcessing = false;
  }

  private async loadWithRetry<T>(
    loader: AssetLoader<T>,
    path: string,
    options: AssetLoadOptions
  ): Promise<T> {
    const maxRetries = options.retries ?? 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await loader.load(path, options);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => 
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        }
      }
    }

    throw lastError;
  }

  // Batch loading
  async loadAll(
    paths: string[],
    options: AssetLoadOptions = {}
  ): Promise<Asset[]> {
    const promises = paths.map(path => this.load(path, options));
    return Promise.all(promises);
  }

  async loadBundle(bundle: AssetBundle): Promise<Asset[]> {
    return this.loadAll(bundle.assets);
  }

  // Unloading
  unload(path: string): boolean {
    const id = this.pathToId(path);
    const asset = this.cache.get(id);
    
    if (!asset) return false;

    asset.refCount--;

    if (asset.refCount <= 0) {
      // Actually unload
      const loader = this.loaders.get(asset.metadata.type);
      if (loader?.unload && asset.data) {
        loader.unload(asset.data);
      }

      asset.status = 'unloaded';
      asset.data = null;
      
      this.cache.remove(id);
      this.watchedPaths.delete(path);
      
      this.emit('unloaded', asset);
      return true;
    }

    return false;
  }

  unloadAll(): void {
    // Can't iterate and modify, so collect IDs first
    const assets = this.getAllAssets();
    for (const asset of assets) {
      this.unload(asset.metadata.path);
    }
  }

  // Access
  get<T>(path: string): Asset<T> | undefined {
    const id = this.pathToId(path);
    return this.cache.get<T>(id);
  }

  getData<T>(path: string): T | null {
    const asset = this.get<T>(path);
    return asset?.data ?? null;
  }

  has(path: string): boolean {
    return this.cache.has(this.pathToId(path));
  }

  getAllAssets(): Asset[] {
    const assets: Asset[] = [];
    // We need to expose cache.entries somehow - let's use a different approach
    return assets;
  }

  // Hot reload
  enableHotReload(): void {
    this.hotReloadEnabled = true;
    
    // In a real implementation, this would use WebSocket or file watchers
    log.info('[AssetManager] Hot reload enabled');
  }

  disableHotReload(): void {
    this.hotReloadEnabled = false;
    this.watchedPaths.clear();
  }

  async reload(path: string): Promise<Asset | undefined> {
    const asset = this.get(path);
    if (!asset) return undefined;

    // Keep ref count
    const refCount = asset.refCount;
    
    // Force reload
    const newAsset = await this.load(path, { forceReload: true });
    newAsset.refCount = refCount;
    
    this.emit('reloaded', newAsset);
    return newAsset;
  }

  // Preloading
  async preload(paths: string[]): Promise<void> {
    await this.loadAll(paths, { priority: -1 }); // Low priority
  }

  // Utils
  private pathToId(path: string): string {
    return path.toLowerCase().replace(/\\/g, '/');
  }

  getStats(): {
    cached: number;
    cacheSize: number;
    maxCacheSize: number;
    queueLength: number;
    activeLoads: number;
  } {
    const cacheStats = this.cache.getStats();
    return {
      cached: cacheStats.count,
      cacheSize: cacheStats.size,
      maxCacheSize: cacheStats.maxSize,
      queueLength: this.loadQueue.length,
      activeLoads: this.activeLoads,
    };
  }

  dispose(): void {
    this.disableHotReload();
    this.loadQueue = [];
    this.cache.dispose();
    this.removeAllListeners();
  }
}

// ============================================================================
// Asset Manifest
// ============================================================================
