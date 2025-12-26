import { injectable } from 'inversify';
import { Emitter, Event } from '@theia/core/lib/common';

// ============================================================================
// AETHEL MEMORY & PERSISTENCE ENGINE
// Advanced state management with persistent storage, caching, and sync
// ============================================================================

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Storage backend types
 */
export type StorageBackend = 
  | 'memory'
  | 'localStorage'
  | 'indexedDB'
  | 'file'
  | 'sqlite'
  | 'redis'
  | 'postgresql'
  | 'mongodb';

/**
 * Serialization format
 */
export type SerializationFormat = 'json' | 'msgpack' | 'protobuf' | 'bson';

/**
 * Cache eviction policy
 */
export type EvictionPolicy = 'lru' | 'lfu' | 'fifo' | 'ttl' | 'random';

/**
 * Sync strategy
 */
export type SyncStrategy = 'immediate' | 'debounced' | 'batched' | 'manual';

/**
 * Data change type
 */
export type ChangeType = 'create' | 'update' | 'delete' | 'batch';

/**
 * Storage statistics
 */
export interface StorageStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
  writeCount: number;
  readCount: number;
  syncCount: number;
}

/**
 * Storage entry metadata
 */
export interface EntryMetadata {
  key: string;
  size: number;
  created: Date;
  modified: Date;
  accessed: Date;
  accessCount: number;
  ttl?: number;
  expiresAt?: Date;
  version: number;
  checksum?: string;
  tags?: string[];
  encrypted?: boolean;
}

/**
 * Storage entry
 */
export interface StorageEntry<T = unknown> {
  key: string;
  value: T;
  metadata: EntryMetadata;
}

/**
 * Query filter
 */
export interface QueryFilter {
  prefix?: string;
  suffix?: string;
  pattern?: RegExp;
  tags?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  modifiedAfter?: Date;
  modifiedBefore?: Date;
  minSize?: number;
  maxSize?: number;
}

/**
 * Query options
 */
export interface QueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'key' | 'created' | 'modified' | 'accessed' | 'size';
  sortOrder?: 'asc' | 'desc';
  includeMetadata?: boolean;
}

/**
 * Change event
 */
export interface ChangeEvent<T = unknown> {
  type: ChangeType;
  key: string;
  value?: T;
  previousValue?: T;
  timestamp: Date;
  source: string;
}

/**
 * Transaction
 */
export interface Transaction {
  id: string;
  operations: TransactionOperation[];
  status: 'pending' | 'committed' | 'rolled-back';
  startTime: Date;
  endTime?: Date;
}

/**
 * Transaction operation
 */
export interface TransactionOperation {
  type: 'set' | 'delete' | 'update';
  key: string;
  value?: unknown;
  previousValue?: unknown;
}

/**
 * Persistence configuration
 */
export interface PersistenceConfig {
  backend: StorageBackend;
  namespace: string;
  serialization: SerializationFormat;
  encryption?: {
    enabled: boolean;
    algorithm: 'aes-256-gcm' | 'chacha20-poly1305';
    keyDerivation: 'pbkdf2' | 'argon2';
  };
  compression?: {
    enabled: boolean;
    algorithm: 'gzip' | 'lz4' | 'zstd';
    threshold: number;
  };
  cache?: {
    enabled: boolean;
    maxSize: number;
    maxEntries: number;
    evictionPolicy: EvictionPolicy;
    defaultTTL?: number;
  };
  sync?: {
    strategy: SyncStrategy;
    debounceMs?: number;
    batchSize?: number;
    retryAttempts?: number;
  };
}

// ============================================================================
// MEMORY CACHE
// ============================================================================

/**
 * LRU/LFU Cache implementation
 */
export class MemoryCache<T = unknown> {
  private cache = new Map<string, { value: T; frequency: number; lastAccess: number }>();
  private readonly maxSize: number;
  private readonly maxEntries: number;
  private readonly evictionPolicy: EvictionPolicy;
  private readonly defaultTTL?: number;
  private ttlTimers = new Map<string, NodeJS.Timeout>();
  private currentSize = 0;

  constructor(config: NonNullable<PersistenceConfig['cache']>) {
    this.maxSize = config.maxSize;
    this.maxEntries = config.maxEntries;
    this.evictionPolicy = config.evictionPolicy;
    this.defaultTTL = config.defaultTTL;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Update access stats
    entry.frequency++;
    entry.lastAccess = Date.now();
    
    return entry.value;
  }

  set(key: string, value: T, ttl?: number): void {
    const size = this.estimateSize(value);
    
    // Evict if necessary
    while (this.cache.size >= this.maxEntries || this.currentSize + size > this.maxSize) {
      this.evictOne();
    }

    // Clear existing TTL timer
    const existingTimer = this.ttlTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Update size tracking
    const existing = this.cache.get(key);
    if (existing) {
      this.currentSize -= this.estimateSize(existing.value);
    }

    this.cache.set(key, {
      value,
      frequency: existing ? existing.frequency + 1 : 1,
      lastAccess: Date.now(),
    });
    this.currentSize += size;

    // Set TTL timer
    const effectiveTTL = ttl ?? this.defaultTTL;
    if (effectiveTTL) {
      const timer = setTimeout(() => {
        this.delete(key);
      }, effectiveTTL);
      this.ttlTimers.set(key, timer);
    }
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    this.currentSize -= this.estimateSize(entry.value);
    this.cache.delete(key);

    const timer = this.ttlTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.ttlTimers.delete(key);
    }

    return true;
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
    
    for (const timer of this.ttlTimers.values()) {
      clearTimeout(timer);
    }
    this.ttlTimers.clear();
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  size(): number {
    return this.cache.size;
  }

  memoryUsage(): number {
    return this.currentSize;
  }

  private evictOne(): void {
    if (this.cache.size === 0) return;

    let keyToEvict: string | null = null;

    switch (this.evictionPolicy) {
      case 'lru':
        keyToEvict = this.findLRU();
        break;
      case 'lfu':
        keyToEvict = this.findLFU();
        break;
      case 'fifo':
        keyToEvict = this.cache.keys().next().value || null;
        break;
      case 'random':
        const keys = Array.from(this.cache.keys());
        keyToEvict = keys[Math.floor(Math.random() * keys.length)];
        break;
      case 'ttl':
        // TTL eviction is handled by timers
        keyToEvict = this.findLRU();
        break;
    }

    if (keyToEvict) {
      this.delete(keyToEvict);
    }
  }

  private findLRU(): string | null {
    let oldest = Infinity;
    let oldestKey: string | null = null;

    for (const [key, entry] of this.cache) {
      if (entry.lastAccess < oldest) {
        oldest = entry.lastAccess;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  private findLFU(): string | null {
    let minFreq = Infinity;
    let minKey: string | null = null;

    for (const [key, entry] of this.cache) {
      if (entry.frequency < minFreq) {
        minFreq = entry.frequency;
        minKey = key;
      }
    }

    return minKey;
  }

  private estimateSize(value: unknown): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'string') return value.length * 2;
    if (typeof value === 'number') return 8;
    if (typeof value === 'boolean') return 4;
    if (value instanceof ArrayBuffer) return value.byteLength;
    if (Array.isArray(value)) {
      return value.reduce((sum, item) => sum + this.estimateSize(item), 0);
    }
    if (typeof value === 'object') {
      return JSON.stringify(value).length * 2;
    }
    return 8;
  }
}

// ============================================================================
// STORAGE ADAPTERS
// ============================================================================

/**
 * Storage adapter interface
 */
interface StorageAdapter {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<boolean>;
  has(key: string): Promise<boolean>;
  keys(prefix?: string): Promise<string[]>;
  clear(): Promise<void>;
  close(): Promise<void>;
}

/**
 * Memory storage adapter
 */
class MemoryStorageAdapter implements StorageAdapter {
  private storage = new Map<string, unknown>();

  async get(key: string): Promise<unknown> {
    return this.storage.get(key);
  }

  async set(key: string, value: unknown): Promise<void> {
    this.storage.set(key, value);
  }

  async delete(key: string): Promise<boolean> {
    return this.storage.delete(key);
  }

  async has(key: string): Promise<boolean> {
    return this.storage.has(key);
  }

  async keys(prefix?: string): Promise<string[]> {
    const allKeys = Array.from(this.storage.keys());
    if (!prefix) return allKeys;
    return allKeys.filter(k => k.startsWith(prefix));
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }

  async close(): Promise<void> {
    // No-op for memory storage
  }
}

/**
 * LocalStorage adapter
 */
class LocalStorageAdapter implements StorageAdapter {
  private readonly namespace: string;

  constructor(namespace: string) {
    this.namespace = namespace;
  }

  private prefixKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  async get(key: string): Promise<unknown> {
    const data = localStorage.getItem(this.prefixKey(key));
    if (data === null) return undefined;
    return JSON.parse(data);
  }

  async set(key: string, value: unknown): Promise<void> {
    localStorage.setItem(this.prefixKey(key), JSON.stringify(value));
  }

  async delete(key: string): Promise<boolean> {
    const prefixed = this.prefixKey(key);
    if (localStorage.getItem(prefixed) === null) return false;
    localStorage.removeItem(prefixed);
    return true;
  }

  async has(key: string): Promise<boolean> {
    return localStorage.getItem(this.prefixKey(key)) !== null;
  }

  async keys(prefix?: string): Promise<string[]> {
    const result: string[] = [];
    const fullPrefix = prefix ? `${this.namespace}:${prefix}` : `${this.namespace}:`;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(fullPrefix)) {
        result.push(key.slice(this.namespace.length + 1));
      }
    }
    
    return result;
  }

  async clear(): Promise<void> {
    const keysToRemove: string[] = [];
    const prefix = `${this.namespace}:`;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  }

  async close(): Promise<void> {
    // No-op for localStorage
  }
}

/**
 * IndexedDB adapter
 */
class IndexedDBAdapter implements StorageAdapter {
  private db: IDBDatabase | null = null;
  private readonly dbName: string;
  private readonly storeName = 'keyvalue';

  constructor(namespace: string) {
    this.dbName = `aethel_${namespace}`;
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  async get(key: string): Promise<unknown> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.get(key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async set(key: string, value: unknown): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.put(value, key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async delete(key: string): Promise<boolean> {
    const db = await this.ensureDB();
    const exists = await this.has(key);
    if (!exists) return false;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.delete(key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(true);
    });
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== undefined;
  }

  async keys(prefix?: string): Promise<string[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.getAllKeys();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        let keys = request.result.map(k => String(k));
        if (prefix) {
          keys = keys.filter(k => k.startsWith(prefix));
        }
        resolve(keys);
      };
    });
  }

  async clear(): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.clear();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// ============================================================================
// PERSISTENCE ENGINE
// ============================================================================

@injectable()
export class PersistenceEngine {
  private adapter!: StorageAdapter;
  private cache?: MemoryCache;
  private config!: PersistenceConfig;
  private metadata = new Map<string, EntryMetadata>();
  private pendingWrites = new Map<string, { value: unknown; timestamp: number }>();
  private writeTimer?: NodeJS.Timeout;
  private transactions = new Map<string, Transaction>();
  private stats: StorageStats = {
    totalEntries: 0,
    totalSize: 0,
    hitRate: 0,
    missRate: 0,
    evictionCount: 0,
    writeCount: 0,
    readCount: 0,
    syncCount: 0,
  };
  private hitCount = 0;
  private missCount = 0;

  private readonly onChangeEmitter = new Emitter<ChangeEvent>();
  private readonly onSyncEmitter = new Emitter<{ count: number; success: boolean }>();
  private readonly onErrorEmitter = new Emitter<{ operation: string; error: Error }>();

  readonly onChange: Event<ChangeEvent> = this.onChangeEmitter.event;
  readonly onSync: Event<{ count: number; success: boolean }> = this.onSyncEmitter.event;
  readonly onError: Event<{ operation: string; error: Error }> = this.onErrorEmitter.event;

  // ========================================================================
  // INITIALIZATION
  // ========================================================================

  /**
   * Initialize the persistence engine
   */
  async initialize(config: PersistenceConfig): Promise<void> {
    this.config = config;

    // Create storage adapter
    this.adapter = this.createAdapter(config.backend, config.namespace);

    // Initialize cache if enabled
    if (config.cache?.enabled) {
      this.cache = new MemoryCache(config.cache);
    }

    // Load metadata
    await this.loadMetadata();

    // Start sync timer if using debounced strategy
    if (config.sync?.strategy === 'debounced') {
      this.startSyncTimer(config.sync.debounceMs || 1000);
    }
  }

  /**
   * Create storage adapter based on backend type
   */
  private createAdapter(backend: StorageBackend, namespace: string): StorageAdapter {
    switch (backend) {
      case 'memory':
        return new MemoryStorageAdapter();
      case 'localStorage':
        return new LocalStorageAdapter(namespace);
      case 'indexedDB':
        return new IndexedDBAdapter(namespace);
      default:
        // For other backends (file, sqlite, redis, etc.), return memory adapter as fallback
        console.warn(`Backend '${backend}' not implemented, using memory storage`);
        return new MemoryStorageAdapter();
    }
  }

  /**
   * Load metadata from storage
   */
  private async loadMetadata(): Promise<void> {
    const keys = await this.adapter.keys();
    
    for (const key of keys) {
      if (key.startsWith('_meta:')) continue;
      
      const metaKey = `_meta:${key}`;
      const meta = await this.adapter.get(metaKey) as EntryMetadata | undefined;
      
      if (meta) {
        this.metadata.set(key, meta);
      }
    }

    this.stats.totalEntries = this.metadata.size;
  }

  // ========================================================================
  // CORE OPERATIONS
  // ========================================================================

  /**
   * Get value by key
   */
  async get<T = unknown>(key: string): Promise<T | undefined> {
    this.stats.readCount++;

    // Check cache first
    if (this.cache?.has(key)) {
      this.hitCount++;
      this.updateHitRate();
      return this.cache.get(key) as T;
    }

    this.missCount++;
    this.updateHitRate();

    // Get from storage
    const value = await this.adapter.get(key) as T | undefined;
    
    if (value !== undefined) {
      // Update cache
      this.cache?.set(key, value);
      
      // Update access metadata
      const meta = this.metadata.get(key);
      if (meta) {
        meta.accessed = new Date();
        meta.accessCount++;
      }
    }

    return value;
  }

  /**
   * Set value by key
   */
  async set<T = unknown>(key: string, value: T, options: { ttl?: number; tags?: string[] } = {}): Promise<void> {
    const now = new Date();
    const previousValue = await this.get<T>(key);

    // Serialize value
    const serialized = await this.serialize(value);

    // Update or create metadata
    let meta = this.metadata.get(key);
    if (!meta) {
      meta = {
        key,
        size: 0,
        created: now,
        modified: now,
        accessed: now,
        accessCount: 1,
        version: 1,
      };
      this.metadata.set(key, meta);
      this.stats.totalEntries++;
    }

    meta.modified = now;
    meta.size = serialized.length;
    meta.version++;
    
    if (options.ttl) {
      meta.ttl = options.ttl;
      meta.expiresAt = new Date(now.getTime() + options.ttl);
    }
    
    if (options.tags) {
      meta.tags = options.tags;
    }

    // Update cache
    this.cache?.set(key, value, options.ttl);

    // Write to storage based on sync strategy
    await this.writeToStorage(key, serialized, meta);

    this.stats.writeCount++;
    this.stats.totalSize += serialized.length;

    // Emit change event
    this.onChangeEmitter.fire({
      type: previousValue !== undefined ? 'update' : 'create',
      key,
      value,
      previousValue,
      timestamp: now,
      source: 'local',
    });
  }

  /**
   * Delete value by key
   */
  async delete(key: string): Promise<boolean> {
    const previousValue = await this.get(key);
    if (previousValue === undefined) return false;

    // Remove from cache
    this.cache?.delete(key);

    // Remove from storage
    await this.adapter.delete(key);
    await this.adapter.delete(`_meta:${key}`);

    // Update stats
    const meta = this.metadata.get(key);
    if (meta) {
      this.stats.totalSize -= meta.size;
    }
    
    this.metadata.delete(key);
    this.stats.totalEntries--;

    // Emit change event
    this.onChangeEmitter.fire({
      type: 'delete',
      key,
      previousValue,
      timestamp: new Date(),
      source: 'local',
    });

    return true;
  }

  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    if (this.cache?.has(key)) return true;
    return this.adapter.has(key);
  }

  /**
   * Get all keys matching filter
   */
  async keys(filter?: QueryFilter): Promise<string[]> {
    let keys = await this.adapter.keys(filter?.prefix);

    // Apply filters
    if (filter) {
      keys = keys.filter(key => {
        const meta = this.metadata.get(key);
        if (!meta) return true;

        if (filter.suffix && !key.endsWith(filter.suffix)) return false;
        if (filter.pattern && !filter.pattern.test(key)) return false;
        if (filter.tags && !filter.tags.some(t => meta.tags?.includes(t))) return false;
        if (filter.createdAfter && meta.created < filter.createdAfter) return false;
        if (filter.createdBefore && meta.created > filter.createdBefore) return false;
        if (filter.modifiedAfter && meta.modified < filter.modifiedAfter) return false;
        if (filter.modifiedBefore && meta.modified > filter.modifiedBefore) return false;
        if (filter.minSize && meta.size < filter.minSize) return false;
        if (filter.maxSize && meta.size > filter.maxSize) return false;

        return true;
      });
    }

    // Filter out metadata keys
    return keys.filter(k => !k.startsWith('_meta:'));
  }

  /**
   * Query entries with options
   */
  async query<T = unknown>(
    filter?: QueryFilter,
    options?: QueryOptions
  ): Promise<StorageEntry<T>[]> {
    let keys = await this.keys(filter);

    // Sort
    if (options?.sortBy) {
      keys = keys.sort((a, b) => {
        const metaA = this.metadata.get(a);
        const metaB = this.metadata.get(b);
        if (!metaA || !metaB) return 0;

        let comparison = 0;
        switch (options.sortBy) {
          case 'key':
            comparison = a.localeCompare(b);
            break;
          case 'created':
            comparison = metaA.created.getTime() - metaB.created.getTime();
            break;
          case 'modified':
            comparison = metaA.modified.getTime() - metaB.modified.getTime();
            break;
          case 'accessed':
            comparison = metaA.accessed.getTime() - metaB.accessed.getTime();
            break;
          case 'size':
            comparison = metaA.size - metaB.size;
            break;
        }

        return options.sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    // Pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || keys.length;
    keys = keys.slice(offset, offset + limit);

    // Fetch values
    const entries: StorageEntry<T>[] = [];
    for (const key of keys) {
      const value = await this.get<T>(key);
      const metadata = this.metadata.get(key);
      
      if (value !== undefined && metadata) {
        entries.push({ key, value, metadata });
      }
    }

    return entries;
  }

  /**
   * Clear all data
   */
  async clear(): Promise<void> {
    this.cache?.clear();
    await this.adapter.clear();
    this.metadata.clear();
    
    this.stats.totalEntries = 0;
    this.stats.totalSize = 0;
  }

  // ========================================================================
  // BATCH OPERATIONS
  // ========================================================================

  /**
   * Get multiple values
   */
  async getMany<T = unknown>(keys: string[]): Promise<Map<string, T>> {
    const result = new Map<string, T>();
    
    await Promise.all(keys.map(async key => {
      const value = await this.get<T>(key);
      if (value !== undefined) {
        result.set(key, value);
      }
    }));

    return result;
  }

  /**
   * Set multiple values
   */
  async setMany<T = unknown>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    const ops: TransactionOperation[] = [];
    
    for (const entry of entries) {
      const prev = await this.get<T>(entry.key);
      ops.push({
        type: prev !== undefined ? 'update' : 'set',
        key: entry.key,
        value: entry.value,
        previousValue: prev,
      });
    }

    await Promise.all(entries.map(e => this.set(e.key, e.value, { ttl: e.ttl })));

    // Emit batch change event
    this.onChangeEmitter.fire({
      type: 'batch',
      key: entries.map(e => e.key).join(','),
      timestamp: new Date(),
      source: 'local',
    });
  }

  /**
   * Delete multiple values
   */
  async deleteMany(keys: string[]): Promise<number> {
    let deleted = 0;
    
    await Promise.all(keys.map(async key => {
      if (await this.delete(key)) {
        deleted++;
      }
    }));

    return deleted;
  }

  // ========================================================================
  // TRANSACTIONS
  // ========================================================================

  /**
   * Begin a transaction
   */
  beginTransaction(): string {
    const id = generateId();
    const tx: Transaction = {
      id,
      operations: [],
      status: 'pending',
      startTime: new Date(),
    };
    this.transactions.set(id, tx);
    return id;
  }

  /**
   * Add operation to transaction
   */
  addToTransaction(txId: string, operation: TransactionOperation): void {
    const tx = this.transactions.get(txId);
    if (!tx || tx.status !== 'pending') {
      throw new Error('Invalid or completed transaction');
    }
    tx.operations.push(operation);
  }

  /**
   * Commit transaction
   */
  async commitTransaction(txId: string): Promise<void> {
    const tx = this.transactions.get(txId);
    if (!tx || tx.status !== 'pending') {
      throw new Error('Invalid or completed transaction');
    }

    try {
      for (const op of tx.operations) {
        switch (op.type) {
          case 'set':
          case 'update':
            await this.set(op.key, op.value);
            break;
          case 'delete':
            await this.delete(op.key);
            break;
        }
      }

      tx.status = 'committed';
      tx.endTime = new Date();
    } catch (error) {
      await this.rollbackTransaction(txId);
      throw error;
    }
  }

  /**
   * Rollback transaction
   */
  async rollbackTransaction(txId: string): Promise<void> {
    const tx = this.transactions.get(txId);
    if (!tx) {
      throw new Error('Invalid transaction');
    }

    // Reverse operations
    for (const op of [...tx.operations].reverse()) {
      if (op.previousValue !== undefined) {
        await this.set(op.key, op.previousValue);
      } else if (op.type === 'set') {
        await this.delete(op.key);
      }
    }

    tx.status = 'rolled-back';
    tx.endTime = new Date();
  }

  // ========================================================================
  // SERIALIZATION
  // ========================================================================

  /**
   * Serialize value
   */
  private async serialize(value: unknown): Promise<string> {
    let serialized: string;

    switch (this.config.serialization) {
      case 'json':
      default:
        serialized = JSON.stringify(value);
        break;
      // Add other serialization formats as needed
    }

    // Compress if enabled and above threshold
    if (this.config.compression?.enabled && 
        serialized.length > this.config.compression.threshold) {
      // Compression would be implemented here
    }

    // Encrypt if enabled
    if (this.config.encryption?.enabled) {
      // Encryption would be implemented here
    }

    return serialized;
  }

  /**
   * Deserialize value
   */
  private async deserialize<T>(data: string): Promise<T> {
    let deserialized = data;

    // Decrypt if needed
    if (this.config.encryption?.enabled) {
      // Decryption would be implemented here
    }

    // Decompress if needed
    if (this.config.compression?.enabled) {
      // Decompression would be implemented here
    }

    switch (this.config.serialization) {
      case 'json':
      default:
        return JSON.parse(deserialized) as T;
    }
  }

  // ========================================================================
  // SYNC & PERSISTENCE
  // ========================================================================

  /**
   * Write to storage based on sync strategy
   */
  private async writeToStorage(key: string, value: string, meta: EntryMetadata): Promise<void> {
    switch (this.config.sync?.strategy) {
      case 'immediate':
        await this.adapter.set(key, value);
        await this.adapter.set(`_meta:${key}`, meta);
        break;

      case 'debounced':
        this.pendingWrites.set(key, { value, timestamp: Date.now() });
        break;

      case 'batched':
        this.pendingWrites.set(key, { value, timestamp: Date.now() });
        if (this.pendingWrites.size >= (this.config.sync.batchSize || 100)) {
          await this.flushWrites();
        }
        break;

      case 'manual':
        this.pendingWrites.set(key, { value, timestamp: Date.now() });
        break;

      default:
        await this.adapter.set(key, value);
        await this.adapter.set(`_meta:${key}`, meta);
    }
  }

  /**
   * Start sync timer for debounced writes
   */
  private startSyncTimer(intervalMs: number): void {
    this.writeTimer = setInterval(() => {
      this.flushWrites().catch(err => {
        this.onErrorEmitter.fire({ operation: 'sync', error: err });
      });
    }, intervalMs);
  }

  /**
   * Flush pending writes to storage
   */
  async flushWrites(): Promise<void> {
    if (this.pendingWrites.size === 0) return;

    const writes = new Map(this.pendingWrites);
    this.pendingWrites.clear();

    let successCount = 0;
    
    for (const [key, { value }] of writes) {
      try {
        await this.adapter.set(key, value);
        const meta = this.metadata.get(key);
        if (meta) {
          await this.adapter.set(`_meta:${key}`, meta);
        }
        successCount++;
      } catch (error) {
        // Re-add failed writes
        this.pendingWrites.set(key, { value, timestamp: Date.now() });
        this.onErrorEmitter.fire({ 
          operation: 'write', 
          error: error instanceof Error ? error : new Error(String(error)) 
        });
      }
    }

    this.stats.syncCount++;
    this.onSyncEmitter.fire({ count: successCount, success: successCount === writes.size });
  }

  /**
   * Force sync all data
   */
  async sync(): Promise<void> {
    await this.flushWrites();
  }

  // ========================================================================
  // STATISTICS & MONITORING
  // ========================================================================

  /**
   * Get storage statistics
   */
  getStats(): StorageStats {
    return { ...this.stats };
  }

  /**
   * Get entry metadata
   */
  getMetadata(key: string): EntryMetadata | undefined {
    return this.metadata.get(key);
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.hitCount + this.missCount;
    if (total > 0) {
      this.stats.hitRate = this.hitCount / total;
      this.stats.missRate = this.missCount / total;
    }
  }

  // ========================================================================
  // CLEANUP
  // ========================================================================

  /**
   * Clean up expired entries
   */
  async cleanupExpired(): Promise<number> {
    const now = new Date();
    let removed = 0;

    for (const [key, meta] of this.metadata) {
      if (meta.expiresAt && meta.expiresAt <= now) {
        await this.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Close and cleanup
   */
  async close(): Promise<void> {
    if (this.writeTimer) {
      clearInterval(this.writeTimer);
    }
    
    await this.flushWrites();
    await this.adapter.close();
    this.cache?.clear();
  }
}

// ============================================================================
// STATE MANAGER
// ============================================================================

/**
 * State slice definition
 */
export interface StateSlice<T> {
  name: string;
  initialState: T;
  reducers: Record<string, (state: T, payload?: unknown) => T>;
}

/**
 * Reactive state manager with persistence
 */
@injectable()
export class StateManager<S extends Record<string, unknown>> {
  private state: S;
  private readonly slices = new Map<string, StateSlice<unknown>>();
  private readonly subscribers = new Map<string, Set<(state: unknown) => void>>();
  private persistence?: PersistenceEngine;
  private persistenceKey?: string;

  private readonly onStateChangeEmitter = new Emitter<{ path: string; value: unknown }>();
  readonly onStateChange: Event<{ path: string; value: unknown }> = this.onStateChangeEmitter.event;

  constructor(initialState: S) {
    this.state = initialState;
  }

  /**
   * Enable persistence for state
   */
  async enablePersistence(
    persistence: PersistenceEngine, 
    key: string
  ): Promise<void> {
    this.persistence = persistence;
    this.persistenceKey = key;

    // Load persisted state
    const persisted = await persistence.get<S>(key);
    if (persisted) {
      this.state = { ...this.state, ...persisted };
    }
  }

  /**
   * Register a state slice
   */
  registerSlice<T>(slice: StateSlice<T>): void {
    this.slices.set(slice.name, slice as StateSlice<unknown>);
    (this.state as Record<string, unknown>)[slice.name] = slice.initialState;
  }

  /**
   * Get current state
   */
  getState(): S {
    return this.state;
  }

  /**
   * Get state slice
   */
  getSlice<T>(name: string): T {
    return this.state[name] as T;
  }

  /**
   * Dispatch action to reducer
   */
  async dispatch(sliceName: string, action: string, payload?: unknown): Promise<void> {
    const slice = this.slices.get(sliceName);
    if (!slice) {
      throw new Error(`Unknown slice: ${sliceName}`);
    }

    const reducer = slice.reducers[action];
    if (!reducer) {
      throw new Error(`Unknown action: ${action}`);
    }

    const currentSliceState = this.state[sliceName];
    const newSliceState = reducer(currentSliceState, payload);

    (this.state as Record<string, unknown>)[sliceName] = newSliceState;

    // Notify subscribers
    const subscribers = this.subscribers.get(sliceName);
    if (subscribers) {
      for (const callback of subscribers) {
        callback(newSliceState);
      }
    }

    this.onStateChangeEmitter.fire({ path: sliceName, value: newSliceState });

    // Persist if enabled
    if (this.persistence && this.persistenceKey) {
      await this.persistence.set(this.persistenceKey, this.state);
    }
  }

  /**
   * Subscribe to slice changes
   */
  subscribe<T>(sliceName: string, callback: (state: T) => void): () => void {
    if (!this.subscribers.has(sliceName)) {
      this.subscribers.set(sliceName, new Set());
    }
    
    this.subscribers.get(sliceName)!.add(callback as (state: unknown) => void);

    return () => {
      this.subscribers.get(sliceName)?.delete(callback as (state: unknown) => void);
    };
  }

  /**
   * Select derived state
   */
  select<T>(selector: (state: S) => T): T {
    return selector(this.state);
  }
}

// ============================================================================
// UTILITY
// ============================================================================

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}

