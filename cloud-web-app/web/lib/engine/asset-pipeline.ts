/**
 * Aethel Engine - Asset Pipeline
 * 
 * Complete asset management system with loading, caching, hot-reloading,
 * and support for multiple asset types (textures, models, audio, etc.)
 */

import { EventEmitter } from 'events';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type AssetType = 
  | 'texture'
  | 'model'
  | 'audio'
  | 'shader'
  | 'material'
  | 'prefab'
  | 'scene'
  | 'script'
  | 'font'
  | 'animation'
  | 'json'
  | 'binary';

export type AssetStatus = 'pending' | 'loading' | 'loaded' | 'error' | 'unloaded';

export interface AssetMetadata {
  id: string;
  name: string;
  type: AssetType;
  path: string;
  size?: number;
  lastModified?: number;
  checksum?: string;
  tags?: string[];
  dependencies?: string[];
  customData?: Record<string, unknown>;
}

export interface AssetLoadOptions {
  priority?: number;
  cache?: boolean;
  forceReload?: boolean;
  timeout?: number;
  retries?: number;
  onProgress?: (progress: number) => void;
}

export interface Asset<T = unknown> {
  metadata: AssetMetadata;
  status: AssetStatus;
  data: T | null;
  error?: Error;
  loadedAt?: number;
  accessedAt?: number;
  refCount: number;
}

export interface AssetBundle {
  id: string;
  name: string;
  assets: string[];
  size: number;
  compressed?: boolean;
}

export interface TextureData {
  image: HTMLImageElement | ImageBitmap;
  width: number;
  height: number;
  format: string;
  mipmaps?: boolean;
}

export interface ModelData {
  vertices: Float32Array;
  indices: Uint16Array | Uint32Array;
  normals?: Float32Array;
  uvs?: Float32Array;
  tangents?: Float32Array;
  weights?: Float32Array;
  joints?: Uint16Array;
  boundingBox?: { min: number[]; max: number[] };
}

export interface AudioData {
  buffer: AudioBuffer;
  duration: number;
  channels: number;
  sampleRate: number;
}

export interface ShaderData {
  vertexSource: string;
  fragmentSource: string;
  uniforms?: string[];
  attributes?: string[];
}

export interface AssetCacheConfig {
  maxSize: number; // bytes
  maxAge: number; // milliseconds
  cleanupInterval: number; // milliseconds
}

// ============================================================================
// Asset Loaders
// ============================================================================

export interface AssetLoader<T> {
  type: AssetType;
  extensions: string[];
  load(path: string, options?: AssetLoadOptions): Promise<T>;
  unload?(data: T): void;
}

class TextureLoader implements AssetLoader<TextureData> {
  type: AssetType = 'texture';
  extensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'];

  async load(path: string, options?: AssetLoadOptions): Promise<TextureData> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      
      if (options?.timeout) {
        setTimeout(() => {
          reject(new Error(`Texture load timeout: ${path}`));
        }, options.timeout);
      }

      image.onload = () => {
        resolve({
          image,
          width: image.width,
          height: image.height,
          format: path.split('.').pop() || 'unknown',
        });
      };

      image.onerror = () => {
        reject(new Error(`Failed to load texture: ${path}`));
      };

      image.crossOrigin = 'anonymous';
      image.src = path;
    });
  }

  unload(data: TextureData): void {
    // Cleanup
    if ('close' in data.image) {
      (data.image as ImageBitmap).close();
    }
  }
}

class ModelLoader implements AssetLoader<ModelData> {
  type: AssetType = 'model';
  extensions = ['.obj', '.gltf', '.glb', '.fbx'];

  async load(path: string): Promise<ModelData> {
    const response = await fetch(path);
    const ext = path.split('.').pop()?.toLowerCase();

    if (ext === 'obj') {
      return this.parseOBJ(await response.text());
    } else if (ext === 'gltf' || ext === 'glb') {
      return this.parseGLTF(await response.arrayBuffer());
    }

    throw new Error(`Unsupported model format: ${ext}`);
  }

  private parseOBJ(text: string): ModelData {
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const vertexData: number[] = [];
    const normalData: number[] = [];
    const uvData: number[] = [];
    const indexData: number[] = [];

    const lines = text.split('\n');

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const type = parts[0];

      switch (type) {
        case 'v':
          positions.push(
            parseFloat(parts[1]),
            parseFloat(parts[2]),
            parseFloat(parts[3])
          );
          break;
        case 'vn':
          normals.push(
            parseFloat(parts[1]),
            parseFloat(parts[2]),
            parseFloat(parts[3])
          );
          break;
        case 'vt':
          uvs.push(parseFloat(parts[1]), parseFloat(parts[2]));
          break;
        case 'f':
          // Parse face (triangulate if needed)
          const vertices = parts.slice(1);
          for (let i = 0; i < vertices.length - 2; i++) {
            this.parseFaceVertex(vertices[0], positions, normals, uvs, vertexData, normalData, uvData, indexData);
            this.parseFaceVertex(vertices[i + 1], positions, normals, uvs, vertexData, normalData, uvData, indexData);
            this.parseFaceVertex(vertices[i + 2], positions, normals, uvs, vertexData, normalData, uvData, indexData);
          }
          break;
      }
    }

    return {
      vertices: new Float32Array(vertexData),
      indices: new Uint16Array(indexData),
      normals: normalData.length > 0 ? new Float32Array(normalData) : undefined,
      uvs: uvData.length > 0 ? new Float32Array(uvData) : undefined,
    };
  }

  private parseFaceVertex(
    vertex: string,
    positions: number[],
    normals: number[],
    uvs: number[],
    vertexData: number[],
    normalData: number[],
    uvData: number[],
    indexData: number[]
  ): void {
    const indices = vertex.split('/').map(v => parseInt(v, 10) - 1);
    const vIdx = indices[0];
    const uvIdx = indices[1];
    const nIdx = indices[2];

    if (vIdx >= 0) {
      vertexData.push(
        positions[vIdx * 3],
        positions[vIdx * 3 + 1],
        positions[vIdx * 3 + 2]
      );
      indexData.push(indexData.length);
    }

    if (uvIdx >= 0 && uvs.length > 0) {
      uvData.push(uvs[uvIdx * 2], uvs[uvIdx * 2 + 1]);
    }

    if (nIdx >= 0 && normals.length > 0) {
      normalData.push(
        normals[nIdx * 3],
        normals[nIdx * 3 + 1],
        normals[nIdx * 3 + 2]
      );
    }
  }

  private parseGLTF(_buffer: ArrayBuffer): ModelData {
    // Simplified GLTF parsing - in production use a proper library
    // This is a placeholder
    return {
      vertices: new Float32Array([]),
      indices: new Uint16Array([]),
    };
  }
}

class AudioLoader implements AssetLoader<AudioData> {
  type: AssetType = 'audio';
  extensions = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.webm'];

  private audioContext: AudioContext | null = null;

  setAudioContext(ctx: AudioContext): void {
    this.audioContext = ctx;
  }

  async load(path: string): Promise<AudioData> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    const response = await fetch(path);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = await this.audioContext.decodeAudioData(arrayBuffer);

    return {
      buffer,
      duration: buffer.duration,
      channels: buffer.numberOfChannels,
      sampleRate: buffer.sampleRate,
    };
  }
}

class ShaderLoader implements AssetLoader<ShaderData> {
  type: AssetType = 'shader';
  extensions = ['.glsl', '.vert', '.frag', '.shader'];

  async load(path: string): Promise<ShaderData> {
    const response = await fetch(path);
    const text = await response.text();

    // Parse shader source
    const vertexMatch = text.match(/#ifdef\s+VERTEX[\s\S]*?#endif|\/\/\s*VERTEX[\s\S]*?\/\/\s*END_VERTEX/);
    const fragmentMatch = text.match(/#ifdef\s+FRAGMENT[\s\S]*?#endif|\/\/\s*FRAGMENT[\s\S]*?\/\/\s*END_FRAGMENT/);

    return {
      vertexSource: vertexMatch ? vertexMatch[0] : text,
      fragmentSource: fragmentMatch ? fragmentMatch[0] : text,
    };
  }
}

class JSONLoader implements AssetLoader<unknown> {
  type: AssetType = 'json';
  extensions = ['.json'];

  async load(path: string): Promise<unknown> {
    const response = await fetch(path);
    return response.json();
  }
}

class BinaryLoader implements AssetLoader<ArrayBuffer> {
  type: AssetType = 'binary';
  extensions = ['.bin', '.dat', '.bytes'];

  async load(path: string): Promise<ArrayBuffer> {
    const response = await fetch(path);
    return response.arrayBuffer();
  }
}

class FontLoader implements AssetLoader<FontFace> {
  type: AssetType = 'font';
  extensions = ['.ttf', '.otf', '.woff', '.woff2'];

  async load(path: string): Promise<FontFace> {
    const name = path.split('/').pop()?.replace(/\.[^.]+$/, '') || 'CustomFont';
    const font = new FontFace(name, `url(${path})`);
    await font.load();
    document.fonts.add(font);
    return font;
  }

  unload(data: FontFace): void {
    document.fonts.delete(data);
  }
}

// ============================================================================
// Asset Cache
// ============================================================================

class AssetCache {
  private cache = new Map<string, Asset>();
  private config: AssetCacheConfig;
  private currentSize = 0;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: AssetCacheConfig) {
    this.config = config;
    this.startCleanup();
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  get<T>(id: string): Asset<T> | undefined {
    const asset = this.cache.get(id) as Asset<T> | undefined;
    if (asset) {
      asset.accessedAt = Date.now();
    }
    return asset;
  }

  set<T>(id: string, asset: Asset<T>): void {
    const size = this.estimateSize(asset);
    
    // Evict if needed
    while (this.currentSize + size > this.config.maxSize && this.cache.size > 0) {
      this.evictLRU();
    }

    this.cache.set(id, asset as Asset);
    this.currentSize += size;
  }

  remove(id: string): boolean {
    const asset = this.cache.get(id);
    if (asset) {
      this.currentSize -= this.estimateSize(asset);
      this.cache.delete(id);
      return true;
    }
    return false;
  }

  has(id: string): boolean {
    return this.cache.has(id);
  }

  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
  }

  private cleanup(): void {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [id, asset] of this.cache) {
      if (asset.refCount === 0 && 
          asset.accessedAt && 
          now - asset.accessedAt > this.config.maxAge) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      this.remove(id);
    }
  }

  private evictLRU(): void {
    let oldest: { id: string; time: number } | null = null;

    for (const [id, asset] of this.cache) {
      if (asset.refCount === 0) {
        const time = asset.accessedAt || asset.loadedAt || 0;
        if (!oldest || time < oldest.time) {
          oldest = { id, time };
        }
      }
    }

    if (oldest) {
      this.remove(oldest.id);
    }
  }

  private estimateSize(asset: Asset): number {
    if (!asset.data) return 0;

    // Rough size estimation
    if (asset.metadata.size) return asset.metadata.size;

    const data = asset.data;
    
    if (data instanceof ArrayBuffer) {
      return data.byteLength;
    }
    
    if (typeof data === 'object' && data !== null) {
      if ('buffer' in data && (data as { buffer: AudioBuffer }).buffer instanceof AudioBuffer) {
        const audioData = data as AudioData;
        return audioData.buffer.length * audioData.channels * 4;
      }
      if ('vertices' in data) {
        const modelData = data as ModelData;
        return modelData.vertices.byteLength + (modelData.indices?.byteLength ?? 0);
      }
      if ('image' in data) {
        const textureData = data as TextureData;
        return textureData.width * textureData.height * 4;
      }
    }

    return JSON.stringify(data).length * 2; // Rough estimate
  }

  getStats(): { count: number; size: number; maxSize: number } {
    return {
      count: this.cache.size,
      size: this.currentSize,
      maxSize: this.config.maxSize,
    };
  }

  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }
}

// ============================================================================
// Asset Manager
// ============================================================================

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
    console.log('[AssetManager] Hot reload enabled');
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

export interface AssetManifest {
  version: string;
  baseUrl: string;
  assets: AssetMetadata[];
  bundles: AssetBundle[];
}

export class AssetManifestLoader {
  private manifest: AssetManifest | null = null;

  async load(url: string): Promise<AssetManifest> {
    const response = await fetch(url);
    this.manifest = await response.json() as AssetManifest;
    return this.manifest;
  }

  getAssetPath(name: string): string | undefined {
    if (!this.manifest) return undefined;
    
    const asset = this.manifest.assets.find(a => a.name === name);
    return asset ? `${this.manifest.baseUrl}/${asset.path}` : undefined;
  }

  getBundle(name: string): AssetBundle | undefined {
    return this.manifest?.bundles.find(b => b.name === name);
  }

  getAllAssets(): AssetMetadata[] {
    return this.manifest?.assets ?? [];
  }
}

// ============================================================================
// Asset Importer (for editor)
// ============================================================================

export interface ImportSettings {
  texture?: {
    maxSize?: number;
    generateMipmaps?: boolean;
    compression?: 'none' | 'dxt' | 'etc' | 'astc';
    filterMode?: 'point' | 'bilinear' | 'trilinear';
    wrapMode?: 'repeat' | 'clamp' | 'mirror';
  };
  model?: {
    scale?: number;
    importMaterials?: boolean;
    importAnimations?: boolean;
    generateColliders?: boolean;
    optimizeMesh?: boolean;
  };
  audio?: {
    loadType?: 'decompress' | 'streaming' | 'compressed';
    sampleRate?: number;
    channels?: 1 | 2;
    quality?: number;
  };
}

export class AssetImporter extends EventEmitter {
  private settings = new Map<string, ImportSettings>();

  setImportSettings(path: string, settings: ImportSettings): void {
    this.settings.set(path, settings);
  }

  getImportSettings(path: string): ImportSettings | undefined {
    return this.settings.get(path);
  }

  async import(file: File, targetPath: string): Promise<AssetMetadata> {
    const settings = this.settings.get(targetPath);
    
    this.emit('importStart', { file, targetPath });

    // Determine asset type
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const type = this.getAssetType(ext);

    // Process based on type
    let processedData: ArrayBuffer | Blob = await file.arrayBuffer();
    
    if (type === 'texture' && settings?.texture) {
      processedData = await this.processTexture(processedData, settings.texture);
    }

    // Create metadata
    const metadata: AssetMetadata = {
      id: crypto.randomUUID(),
      name: file.name,
      type,
      path: targetPath,
      size: processedData instanceof Blob ? processedData.size : processedData.byteLength,
      lastModified: Date.now(),
    };

    this.emit('importComplete', { metadata, data: processedData });

    return metadata;
  }

  private getAssetType(ext: string): AssetType {
    const typeMap: Record<string, AssetType> = {
      '.png': 'texture',
      '.jpg': 'texture',
      '.jpeg': 'texture',
      '.gif': 'texture',
      '.webp': 'texture',
      '.obj': 'model',
      '.gltf': 'model',
      '.glb': 'model',
      '.fbx': 'model',
      '.mp3': 'audio',
      '.wav': 'audio',
      '.ogg': 'audio',
      '.glsl': 'shader',
      '.vert': 'shader',
      '.frag': 'shader',
      '.json': 'json',
      '.ttf': 'font',
      '.otf': 'font',
      '.woff': 'font',
      '.woff2': 'font',
    };

    return typeMap[ext] ?? 'binary';
  }

  private async processTexture(
    data: ArrayBuffer,
    settings: ImportSettings['texture']
  ): Promise<Blob> {
    // Create image from buffer
    const blob = new Blob([data]);
    const img = await createImageBitmap(blob);

    // Resize if needed
    let width = img.width;
    let height = img.height;
    
    if (settings?.maxSize) {
      const maxDim = Math.max(width, height);
      if (maxDim > settings.maxSize) {
        const scale = settings.maxSize / maxDim;
        width = Math.floor(width * scale);
        height = Math.floor(height * scale);
      }
    }

    // Draw to canvas
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    
    ctx.drawImage(img, 0, 0, width, height);

    // Convert to blob
    return canvas.convertToBlob({ type: 'image/png' });
  }
}

export default AssetManager;
