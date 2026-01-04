import { Event } from '@theia/core';
/**
 * Configuration entry
 */
export interface ConfigEntry {
    key: string;
    value: any;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    category: 'llm' | 'policy' | 'feature-flags' | 'ui' | 'system';
    description: string;
    defaultValue: any;
    validation?: {
        required?: boolean;
        min?: number;
        max?: number;
        pattern?: string;
        enum?: any[];
    };
    secret?: boolean;
    updatedAt?: number;
    updatedBy?: string;
}
/**
 * Configuration change event
 */
export interface ConfigChangeEvent {
    key: string;
    oldValue: any;
    newValue: any;
    timestamp: number;
    userId: string;
}
/**
 * Config Service - Dynamic configuration management
 * Replaces hardcoded configs with database-backed configuration
 */
export declare class ConfigService {
    private configs;
    private changeHistory;
    private readonly onConfigChangedEmitter;
    readonly onConfigChanged: Event<ConfigChangeEvent>;
    private isLoaded;
    private loadPromise;
    constructor();
    /**
     * Load configuration from storage
     * Must be called before using the service
     */
    load(): Promise<void>;
    private _load;
    /**
     * Check if configuration is loaded
     */
    isReady(): boolean;
    /**
     * Wait for configuration to be ready
     */
    waitForReady(): Promise<void>;
    /**
     * Get configuration value
     */
    get<T = any>(key: string, defaultValue?: T): T;
    /**
     * Get configuration value asynchronously (waits for load)
     */
    getAsync<T = any>(key: string, defaultValue?: T): Promise<T>;
    /**
     * Set configuration value
     */
    set(key: string, value: any, userId?: string): Promise<void>;
    /**
     * Get all configurations by category
     */
    getByCategory(category: ConfigEntry['category']): ConfigEntry[];
    /**
     * Get all configurations
     */
    getAll(): ConfigEntry[];
    /**
     * Delete configuration
     */
    delete(key: string, userId?: string): Promise<void>;
    /**
     * Reset to default value
     */
    reset(key: string, userId?: string): Promise<void>;
    /**
     * Get change history
     */
    getChangeHistory(key?: string): ConfigChangeEvent[];
    /**
     * Export configuration
     */
    export(): string;
    /**
     * Import configuration
     */
    import(data: string, userId?: string): Promise<void>;
    private initializeDefaults;
    private registerDefault;
    private validate;
    private inferCategory;
    private getDefaultValue;
    private persist;
    /**
     * Load from storage
     */
    private loadFromStorage;
    /**
     * Load environment variable overrides
     */
    private loadEnvironmentOverrides;
}
