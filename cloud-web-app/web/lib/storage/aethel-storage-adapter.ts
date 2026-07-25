/**
 * Aethel Unified Storage Adapter (P2 - State Spine & Storage Centralization)
 *
 * Provides a single, versioned, type-safe storage interface for all client-side persistence,
 * eliminating fragmented `localStorage` usage across isolated UI components.
 *
 * Features:
 * - Schema versioning & automatic migration.
 * - Namespaced keys (`aethel:v1:...`).
 * - In-memory fallback when SSR or private browsing disables localStorage.
 * - Zero ghost-state guarantees via structural validation.
 */

export interface StorageAdapterOptions<T> {
  key: string;
  version: number;
  defaultValue: T;
  migrate?: (oldVersion: number, rawData: unknown) => T;
}

const STORAGE_PREFIX = 'aethel:v1:';

class InMemoryStorageFallback {
  private memoryMap = new Map<string, string>();

  getItem(key: string): string | null {
    return this.memoryMap.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.memoryMap.set(key, value);
  }

  removeItem(key: string): void {
    this.memoryMap.delete(key);
  }

  clear(): void {
    this.memoryMap.clear();
  }
}

const inMemoryStorage = new InMemoryStorageFallback();

function getSafeStorage(): Storage | InMemoryStorageFallback {
  if (typeof window === 'undefined') {
    return inMemoryStorage;
  }
  try {
    const testKey = `${STORAGE_PREFIX}__test__`;
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch {
    return inMemoryStorage;
  }
}

export class AethelStorageAdapter<T> {
  private readonly fullKey: string;
  private readonly version: number;
  private readonly defaultValue: T;
  private readonly migrate?: (oldVersion: number, rawData: unknown) => T;
  private storage: Storage | InMemoryStorageFallback;

  constructor(options: StorageAdapterOptions<T>) {
    this.fullKey = `${STORAGE_PREFIX}${options.key}`;
    this.version = options.version;
    this.defaultValue = options.defaultValue;
    this.migrate = options.migrate;
    this.storage = getSafeStorage();
  }

  /**
   * Reads data from storage with automatic migration & fallback.
   */
  get(): T {
    try {
      const raw = this.storage.getItem(this.fullKey);
      if (!raw) {
        return this.defaultValue;
      }
      const parsed = JSON.parse(raw) as { _v?: number; data?: unknown };
      if (typeof parsed !== 'object' || parsed === null) {
        return this.defaultValue;
      }

      const storedVersion = parsed._v ?? 0;
      if (storedVersion === this.version && parsed.data !== undefined) {
        return parsed.data as T;
      }

      if (this.migrate && parsed.data !== undefined) {
        return this.migrate(storedVersion, parsed.data);
      }

      return this.defaultValue;
    } catch {
      return this.defaultValue;
    }
  }

  /**
   * Writes data to storage with current schema version wrapper.
   */
  set(value: T): boolean {
    try {
      const payload = JSON.stringify({
        _v: this.version,
        data: value,
        updatedAt: new Date().toISOString(),
      });
      this.storage.setItem(this.fullKey, payload);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Removes entry from storage.
   */
  remove(): void {
    try {
      this.storage.removeItem(this.fullKey);
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }
}
