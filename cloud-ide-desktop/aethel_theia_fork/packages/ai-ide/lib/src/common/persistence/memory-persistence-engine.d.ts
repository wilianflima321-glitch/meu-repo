import { Event } from '@theia/core/lib/common';
/**
 * Storage backend types
 */
export type StorageBackend = 'memory' | 'localStorage' | 'indexedDB' | 'file' | 'sqlite' | 'redis' | 'postgresql' | 'mongodb';
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
/**
 * LRU/LFU Cache implementation
 */
export declare class MemoryCache<T = unknown> {
    private cache;
    private readonly maxSize;
    private readonly maxEntries;
    private readonly evictionPolicy;
    private readonly defaultTTL?;
    private ttlTimers;
    private currentSize;
    constructor(config: NonNullable<PersistenceConfig['cache']>);
    get(key: string): T | undefined;
    set(key: string, value: T, ttl?: number): void;
    delete(key: string): boolean;
    has(key: string): boolean;
    clear(): void;
    keys(): string[];
    size(): number;
    memoryUsage(): number;
    private evictOne;
    private findLRU;
    private findLFU;
    private estimateSize;
}
export declare class PersistenceEngine {
    private adapter;
    private cache?;
    private config;
    private metadata;
    private pendingWrites;
    private writeTimer?;
    private transactions;
    private stats;
    private hitCount;
    private missCount;
    private readonly onChangeEmitter;
    private readonly onSyncEmitter;
    private readonly onErrorEmitter;
    readonly onChange: Event<ChangeEvent>;
    readonly onSync: Event<{
        count: number;
        success: boolean;
    }>;
    readonly onError: Event<{
        operation: string;
        error: Error;
    }>;
    /**
     * Initialize the persistence engine
     */
    initialize(config: PersistenceConfig): Promise<void>;
    /**
     * Create storage adapter based on backend type
     */
    private createAdapter;
    /**
     * Load metadata from storage
     */
    private loadMetadata;
    /**
     * Get value by key
     */
    get<T = unknown>(key: string): Promise<T | undefined>;
    /**
     * Set value by key
     */
    set<T = unknown>(key: string, value: T, options?: {
        ttl?: number;
        tags?: string[];
    }): Promise<void>;
    /**
     * Delete value by key
     */
    delete(key: string): Promise<boolean>;
    /**
     * Check if key exists
     */
    has(key: string): Promise<boolean>;
    /**
     * Get all keys matching filter
     */
    keys(filter?: QueryFilter): Promise<string[]>;
    /**
     * Query entries with options
     */
    query<T = unknown>(filter?: QueryFilter, options?: QueryOptions): Promise<StorageEntry<T>[]>;
    /**
     * Clear all data
     */
    clear(): Promise<void>;
    /**
     * Get multiple values
     */
    getMany<T = unknown>(keys: string[]): Promise<Map<string, T>>;
    /**
     * Set multiple values
     */
    setMany<T = unknown>(entries: Array<{
        key: string;
        value: T;
        ttl?: number;
    }>): Promise<void>;
    /**
     * Delete multiple values
     */
    deleteMany(keys: string[]): Promise<number>;
    /**
     * Begin a transaction
     */
    beginTransaction(): string;
    /**
     * Add operation to transaction
     */
    addToTransaction(txId: string, operation: TransactionOperation): void;
    /**
     * Commit transaction
     */
    commitTransaction(txId: string): Promise<void>;
    /**
     * Rollback transaction
     */
    rollbackTransaction(txId: string): Promise<void>;
    /**
     * Serialize value
     */
    private serialize;
    /**
     * Deserialize value
     */
    private deserialize;
    /**
     * Write to storage based on sync strategy
     */
    private writeToStorage;
    /**
     * Start sync timer for debounced writes
     */
    private startSyncTimer;
    /**
     * Flush pending writes to storage
     */
    flushWrites(): Promise<void>;
    /**
     * Force sync all data
     */
    sync(): Promise<void>;
    /**
     * Get storage statistics
     */
    getStats(): StorageStats;
    /**
     * Get entry metadata
     */
    getMetadata(key: string): EntryMetadata | undefined;
    /**
     * Update hit rate
     */
    private updateHitRate;
    /**
     * Clean up expired entries
     */
    cleanupExpired(): Promise<number>;
    /**
     * Close and cleanup
     */
    close(): Promise<void>;
}
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
export declare class StateManager<S extends Record<string, unknown>> {
    private state;
    private readonly slices;
    private readonly subscribers;
    private persistence?;
    private persistenceKey?;
    private readonly onStateChangeEmitter;
    readonly onStateChange: Event<{
        path: string;
        value: unknown;
    }>;
    constructor(initialState: S);
    /**
     * Enable persistence for state
     */
    enablePersistence(persistence: PersistenceEngine, key: string): Promise<void>;
    /**
     * Register a state slice
     */
    registerSlice<T>(slice: StateSlice<T>): void;
    /**
     * Get current state
     */
    getState(): S;
    /**
     * Get state slice
     */
    getSlice<T>(name: string): T;
    /**
     * Dispatch action to reducer
     */
    dispatch(sliceName: string, action: string, payload?: unknown): Promise<void>;
    /**
     * Subscribe to slice changes
     */
    subscribe<T>(sliceName: string, callback: (state: T) => void): () => void;
    /**
     * Select derived state
     */
    select<T>(selector: (state: S) => T): T;
}
