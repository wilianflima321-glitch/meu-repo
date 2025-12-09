import { injectable } from 'inversify';
import { Emitter, Event } from '@theia/core';

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
@injectable()
export class ConfigService {
    private configs: Map<string, ConfigEntry> = new Map();
    private changeHistory: ConfigChangeEvent[] = [];

    private readonly onConfigChangedEmitter = new Emitter<ConfigChangeEvent>();
    readonly onConfigChanged: Event<ConfigChangeEvent> = this.onConfigChangedEmitter.event;

    private isLoaded = false;
    private loadPromise: Promise<void> | null = null;

    constructor() {
        // Don't initialize defaults in constructor
        // Wait for explicit load() call
    }

    /**
     * Load configuration from storage
     * Must be called before using the service
     */
    async load(): Promise<void> {
        // Prevent multiple simultaneous loads
        if (this.loadPromise) {
            return this.loadPromise;
        }

        if (this.isLoaded) {
            return;
        }

        this.loadPromise = this._load();
        await this.loadPromise;
        this.loadPromise = null;
    }

    private async _load(): Promise<void> {
        try {
            // Initialize defaults first
            this.initializeDefaults();

            // Load from persistent storage (localStorage, database, etc.)
            await this.loadFromStorage();

            // Load environment overrides
            this.loadEnvironmentOverrides();

            this.isLoaded = true;
        } catch (error) {
            console.error('Failed to load configuration:', error);
            // Fall back to defaults
            this.initializeDefaults();
            this.isLoaded = true;
        }
    }

    /**
     * Check if configuration is loaded
     */
    isReady(): boolean {
        return this.isLoaded;
    }

    /**
     * Wait for configuration to be ready
     */
    async waitForReady(): Promise<void> {
        if (this.isLoaded) {
            return;
        }
        if (this.loadPromise) {
            await this.loadPromise;
        } else {
            await this.load();
        }
    }

    /**
     * Get configuration value
     */
    get<T = any>(key: string, defaultValue?: T): T {
        if (!this.isLoaded) {
            console.warn(`ConfigService.get('${key}') called before load(). Using defaults.`);
        }
        
        const entry = this.configs.get(key);
        if (!entry) {
            return defaultValue !== undefined ? defaultValue : this.getDefaultValue(key);
        }
        return entry.value as T;
    }

    /**
     * Get configuration value asynchronously (waits for load)
     */
    async getAsync<T = any>(key: string, defaultValue?: T): Promise<T> {
        await this.waitForReady();
        return this.get(key, defaultValue);
    }

    /**
     * Set configuration value
     */
    async set(key: string, value: any, userId: string = 'system'): Promise<void> {
        const entry = this.configs.get(key);
        const oldValue = entry?.value;

        // Validate
        if (entry?.validation) {
            this.validate(key, value, entry.validation);
        }

        // Update or create
        const newEntry: ConfigEntry = entry ? { ...entry, value, updatedAt: Date.now(), updatedBy: userId } : {
            key,
            value,
            type: typeof value as any,
            category: this.inferCategory(key),
            description: '',
            defaultValue: value,
            updatedAt: Date.now(),
            updatedBy: userId,
        };

        this.configs.set(key, newEntry);

        // Record change
        const changeEvent: ConfigChangeEvent = {
            key,
            oldValue,
            newValue: value,
            timestamp: Date.now(),
            userId,
        };
        this.changeHistory.push(changeEvent);

        // Emit event
        this.onConfigChangedEmitter.fire(changeEvent);

        // Persist to storage (in production, save to database)
        await this.persist();
    }

    /**
     * Get all configurations by category
     */
    getByCategory(category: ConfigEntry['category']): ConfigEntry[] {
        return Array.from(this.configs.values()).filter(c => c.category === category);
    }

    /**
     * Get all configurations
     */
    getAll(): ConfigEntry[] {
        return Array.from(this.configs.values());
    }

    /**
     * Delete configuration
     */
    async delete(key: string, userId: string = 'system'): Promise<void> {
        const entry = this.configs.get(key);
        if (entry) {
            this.configs.delete(key);

            const changeEvent: ConfigChangeEvent = {
                key,
                oldValue: entry.value,
                newValue: undefined,
                timestamp: Date.now(),
                userId,
            };
            this.changeHistory.push(changeEvent);
            this.onConfigChangedEmitter.fire(changeEvent);

            await this.persist();
        }
    }

    /**
     * Reset to default value
     */
    async reset(key: string, userId: string = 'system'): Promise<void> {
        const entry = this.configs.get(key);
        if (entry) {
            await this.set(key, entry.defaultValue, userId);
        }
    }

    /**
     * Get change history
     */
    getChangeHistory(key?: string): ConfigChangeEvent[] {
        if (key) {
            return this.changeHistory.filter(c => c.key === key);
        }
        return this.changeHistory;
    }

    /**
     * Export configuration
     */
    export(): string {
        const exportData = {
            version: '1.0',
            timestamp: Date.now(),
            configs: Array.from(this.configs.entries()).map(([key, entry]) => ({
                key,
                value: entry.secret ? '***REDACTED***' : entry.value,
                type: entry.type,
                category: entry.category,
                description: entry.description,
            })),
        };
        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Import configuration
     */
    async import(data: string, userId: string = 'system'): Promise<void> {
        const parsed = JSON.parse(data);
        
        for (const config of parsed.configs) {
            if (config.value !== '***REDACTED***') {
                await this.set(config.key, config.value, userId);
            }
        }
    }

    // Private methods

    private initializeDefaults(): void {
        // LLM Provider Configs
        this.registerDefault({
            key: 'llm.providers.openai.enabled',
            value: true,
            type: 'boolean',
            category: 'llm',
            description: 'Enable OpenAI provider',
            defaultValue: true,
        });

        this.registerDefault({
            key: 'llm.providers.openai.apiKey',
            value: process.env.OPENAI_API_KEY || '',
            type: 'string',
            category: 'llm',
            description: 'OpenAI API Key',
            defaultValue: '',
            secret: true,
            validation: { required: true },
        });

        this.registerDefault({
            key: 'llm.providers.anthropic.enabled',
            value: true,
            type: 'boolean',
            category: 'llm',
            description: 'Enable Anthropic provider',
            defaultValue: true,
        });

        this.registerDefault({
            key: 'llm.providers.anthropic.apiKey',
            value: process.env.ANTHROPIC_API_KEY || '',
            type: 'string',
            category: 'llm',
            description: 'Anthropic API Key',
            defaultValue: '',
            secret: true,
        });

        // Budget Configs
        this.registerDefault({
            key: 'llm.budget.default',
            value: 100,
            type: 'number',
            category: 'llm',
            description: 'Default workspace budget in USD',
            defaultValue: 100,
            validation: { min: 0, max: 10000 },
        });

        this.registerDefault({
            key: 'llm.budget.alertThresholds',
            value: [0.5, 0.8, 0.95],
            type: 'array',
            category: 'llm',
            description: 'Budget alert thresholds',
            defaultValue: [0.5, 0.8, 0.95],
        });

        // Policy Configs
        this.registerDefault({
            key: 'policy.strictMode',
            value: true,
            type: 'boolean',
            category: 'policy',
            description: 'Enable strict policy enforcement',
            defaultValue: true,
        });

        this.registerDefault({
            key: 'policy.approvalRequired.trading',
            value: true,
            type: 'boolean',
            category: 'policy',
            description: 'Require approval for live trading',
            defaultValue: true,
        });

        this.registerDefault({
            key: 'policy.approvalRequired.deployment',
            value: true,
            type: 'boolean',
            category: 'policy',
            description: 'Require approval for production deployment',
            defaultValue: true,
        });

        // Feature Flags
        this.registerDefault({
            key: 'features.missionControl.enabled',
            value: true,
            type: 'boolean',
            category: 'feature-flags',
            description: 'Enable Mission Control',
            defaultValue: false,
        });

        this.registerDefault({
            key: 'features.trading.enabled',
            value: false,
            type: 'boolean',
            category: 'feature-flags',
            description: 'Enable Trading features',
            defaultValue: false,
        });

        this.registerDefault({
            key: 'features.research.enabled',
            value: true,
            type: 'boolean',
            category: 'feature-flags',
            description: 'Enable Research features',
            defaultValue: true,
        });

        this.registerDefault({
            key: 'features.creative.enabled',
            value: false,
            type: 'boolean',
            category: 'feature-flags',
            description: 'Enable Creative features',
            defaultValue: false,
        });

        // UI Configs
        this.registerDefault({
            key: 'ui.theme',
            value: 'dark',
            type: 'string',
            category: 'ui',
            description: 'UI theme',
            defaultValue: 'dark',
            validation: { enum: ['dark', 'light', 'auto'] },
        });

        this.registerDefault({
            key: 'ui.notifications.enabled',
            value: true,
            type: 'boolean',
            category: 'ui',
            description: 'Enable notifications',
            defaultValue: true,
        });

        this.registerDefault({
            key: 'ui.animations.enabled',
            value: true,
            type: 'boolean',
            category: 'ui',
            description: 'Enable animations',
            defaultValue: true,
        });

        // System Configs
        this.registerDefault({
            key: 'system.telemetry.enabled',
            value: true,
            type: 'boolean',
            category: 'system',
            description: 'Enable telemetry',
            defaultValue: true,
        });

        this.registerDefault({
            key: 'system.analytics.enabled',
            value: true,
            type: 'boolean',
            category: 'system',
            description: 'Enable analytics',
            defaultValue: true,
        });

        this.registerDefault({
            key: 'system.errorReporting.enabled',
            value: true,
            type: 'boolean',
            category: 'system',
            description: 'Enable error reporting',
            defaultValue: true,
        });
    }

    private registerDefault(entry: ConfigEntry): void {
        this.configs.set(entry.key, entry);
    }

    private validate(key: string, value: any, validation: ConfigEntry['validation']): void {
        if (!validation) return;

        if (validation.required && (value === undefined || value === null || value === '')) {
            throw new Error(`Configuration ${key} is required`);
        }

        if (validation.min !== undefined && typeof value === 'number' && value < validation.min) {
            throw new Error(`Configuration ${key} must be >= ${validation.min}`);
        }

        if (validation.max !== undefined && typeof value === 'number' && value > validation.max) {
            throw new Error(`Configuration ${key} must be <= ${validation.max}`);
        }

        if (validation.pattern && typeof value === 'string' && !new RegExp(validation.pattern).test(value)) {
            throw new Error(`Configuration ${key} does not match pattern ${validation.pattern}`);
        }

        if (validation.enum && !validation.enum.includes(value)) {
            throw new Error(`Configuration ${key} must be one of: ${validation.enum.join(', ')}`);
        }
    }

    private inferCategory(key: string): ConfigEntry['category'] {
        if (key.startsWith('llm.')) return 'llm';
        if (key.startsWith('policy.')) return 'policy';
        if (key.startsWith('features.')) return 'feature-flags';
        if (key.startsWith('ui.')) return 'ui';
        return 'system';
    }

    private getDefaultValue(key: string): any {
        // Return sensible defaults for unknown keys
        return undefined;
    }

    private async persist(): Promise<void> {
        // In production, save to database
        // For now, save to localStorage if available
        if (typeof localStorage !== 'undefined') {
            try {
                const data = this.export();
                localStorage.setItem('ai-ide-config', data);
            } catch (error) {
                console.error('Failed to persist config:', error);
            }
        }
    }

    /**
     * Load from storage
     */
    private async loadFromStorage(): Promise<void> {
        if (typeof localStorage !== 'undefined') {
            try {
                const data = localStorage.getItem('ai-ide-config');
                if (data) {
                    await this.import(data, 'system');
                }
            } catch (error) {
                console.error('Failed to load config from storage:', error);
            }
        }
    }

    /**
     * Load environment variable overrides
     */
    private loadEnvironmentOverrides(): void {
        // Override with environment variables
        const envOverrides: Record<string, any> = {
            'llm.providers.openai.apiKey': process.env.OPENAI_API_KEY,
            'llm.providers.anthropic.apiKey': process.env.ANTHROPIC_API_KEY,
            'llm.providers.openai.enabled': process.env.OPENAI_ENABLED === 'true',
            'llm.providers.anthropic.enabled': process.env.ANTHROPIC_ENABLED === 'true',
            'policy.strictMode': process.env.POLICY_STRICT_MODE === 'true',
            'system.telemetry.enabled': process.env.TELEMETRY_ENABLED !== 'false',
        };

        for (const [key, value] of Object.entries(envOverrides)) {
            if (value !== undefined && value !== null && value !== '') {
                const entry = this.configs.get(key);
                if (entry) {
                    entry.value = value;
                }
            }
        }
    }
    async load(): Promise<void> {
        if (typeof localStorage !== 'undefined') {
            try {
                const data = localStorage.getItem('ai-ide-config');
                if (data) {
                    await this.import(data);
                }
            } catch (error) {
                console.error('Failed to load config:', error);
            }
        }
    }
}
