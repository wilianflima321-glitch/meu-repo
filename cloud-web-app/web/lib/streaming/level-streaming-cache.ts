/**
 * @aethel-heavy-async-boundary
 * Lightweight asset cache used by level streaming.
 */

// ============================================================================
// ASSET CACHE
// ============================================================================

export class AssetCache {
  private cache: Map<string, { data: unknown; size: number; lastAccess: number }> = new Map();
  private totalSize = 0;
  private maxSizeMB: number;

  constructor(maxSizeMB = 512) {
    this.maxSizeMB = maxSizeMB;
  }

  set(key: string, data: unknown, sizeMB: number): void {
    // Evict if necessary
    while (this.totalSize + sizeMB > this.maxSizeMB && this.cache.size > 0) {
      this.evictOldest();
    }

    const existing = this.cache.get(key);
    if (existing) {
      this.totalSize -= existing.size;
    }

    this.cache.set(key, {
      data,
      size: sizeMB,
      lastAccess: Date.now(),
    });

    this.totalSize += sizeMB;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    entry.lastAccess = Date.now();
    return entry.data as T;
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.totalSize -= entry.size;
      this.cache.delete(key);
    }
  }

  clear(): void {
    this.cache.clear();
    this.totalSize = 0;
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  getMemoryUsage(): number {
    return this.totalSize;
  }

  getStats(): { count: number; sizeMB: number; maxSizeMB: number } {
    return {
      count: this.cache.size,
      sizeMB: this.totalSize,
      maxSizeMB: this.maxSizeMB,
    };
  }
}
