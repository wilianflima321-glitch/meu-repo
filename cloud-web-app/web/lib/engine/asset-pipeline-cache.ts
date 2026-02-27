/**
 * Asset cache runtime extracted from asset-pipeline.
 */

import type {
  Asset,
  AssetCacheConfig,
  AudioData,
  ModelData,
  TextureData,
} from './asset-pipeline';

export class AssetCache {
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
