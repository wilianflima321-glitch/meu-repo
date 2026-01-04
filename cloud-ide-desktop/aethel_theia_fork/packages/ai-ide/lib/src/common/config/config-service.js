"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigService = void 0;
const inversify_1 = require("inversify");
const core_1 = require("@theia/core");
/**
 * Config Service - Dynamic configuration management
 * Replaces hardcoded configs with database-backed configuration
 */
let ConfigService = class ConfigService {
    constructor() {
        this.configs = new Map();
        this.changeHistory = [];
        this.onConfigChangedEmitter = new core_1.Emitter();
        this.onConfigChanged = this.onConfigChangedEmitter.event;
        this.isLoaded = false;
        this.loadPromise = null;
        // Don't initialize defaults in constructor
        // Wait for explicit load() call
    }
    /**
     * Load configuration from storage
     * Must be called before using the service
     */
    async load() {
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
    async _load() {
        try {
            // Initialize defaults first
            this.initializeDefaults();
            // Load from persistent storage (localStorage, database, etc.)
            await this.loadFromStorage();
            // Load environment overrides
            this.loadEnvironmentOverrides();
            this.isLoaded = true;
        }
        catch (error) {
            console.error('Failed to load configuration:', error);
            // Fall back to defaults
            this.initializeDefaults();
            this.isLoaded = true;
        }
    }
    /**
     * Check if configuration is loaded
     */
    isReady() {
        return this.isLoaded;
    }
    /**
     * Wait for configuration to be ready
     */
    async waitForReady() {
        if (this.isLoaded) {
            return;
        }
        if (this.loadPromise) {
            await this.loadPromise;
        }
        else {
            await this.load();
        }
    }
    /**
     * Get configuration value
     */
    get(key, defaultValue) {
        if (!this.isLoaded) {
            console.warn(`ConfigService.get('${key}') called before load(). Using defaults.`);
        }
        const entry = this.configs.get(key);
        if (!entry) {
            return defaultValue !== undefined ? defaultValue : this.getDefaultValue(key);
        }
        return entry.value;
    }
    /**
     * Get configuration value asynchronously (waits for load)
     */
    async getAsync(key, defaultValue) {
        await this.waitForReady();
        return this.get(key, defaultValue);
    }
    /**
     * Set configuration value
     */
    async set(key, value, userId = 'system') {
        const entry = this.configs.get(key);
        const oldValue = entry?.value;
        // Validate
        if (entry?.validation) {
            this.validate(key, value, entry.validation);
        }
        // Update or create
        const newEntry = entry ? { ...entry, value, updatedAt: Date.now(), updatedBy: userId } : {
            key,
            value,
            type: typeof value,
            category: this.inferCategory(key),
            description: '',
            defaultValue: value,
            updatedAt: Date.now(),
            updatedBy: userId,
        };
        this.configs.set(key, newEntry);
        // Record change
        const changeEvent = {
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
    getByCategory(category) {
        return Array.from(this.configs.values()).filter(c => c.category === category);
    }
    /**
     * Get all configurations
     */
    getAll() {
        return Array.from(this.configs.values());
    }
    /**
     * Delete configuration
     */
    async delete(key, userId = 'system') {
        const entry = this.configs.get(key);
        if (entry) {
            this.configs.delete(key);
            const changeEvent = {
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
    async reset(key, userId = 'system') {
        const entry = this.configs.get(key);
        if (entry) {
            await this.set(key, entry.defaultValue, userId);
        }
    }
    /**
     * Get change history
     */
    getChangeHistory(key) {
        if (key) {
            return this.changeHistory.filter(c => c.key === key);
        }
        return this.changeHistory;
    }
    /**
     * Export configuration
     */
    export() {
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
    async import(data, userId = 'system') {
        const parsed = JSON.parse(data);
        for (const config of parsed.configs) {
            if (config.value !== '***REDACTED***') {
                await this.set(config.key, config.value, userId);
            }
        }
    }
    // Private methods
    initializeDefaults() {
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
    registerDefault(entry) {
        this.configs.set(entry.key, entry);
    }
    validate(key, value, validation) {
        if (!validation)
            return;
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
    inferCategory(key) {
        if (key.startsWith('llm.'))
            return 'llm';
        if (key.startsWith('policy.'))
            return 'policy';
        if (key.startsWith('features.'))
            return 'feature-flags';
        if (key.startsWith('ui.'))
            return 'ui';
        return 'system';
    }
    getDefaultValue(key) {
        // Return sensible defaults for unknown keys
        return undefined;
    }
    async persist() {
        // In production, save to database
        // For now, save to localStorage if available
        if (typeof localStorage !== 'undefined') {
            try {
                const data = this.export();
                localStorage.setItem('ai-ide-config', data);
            }
            catch (error) {
                console.error('Failed to persist config:', error);
            }
        }
    }
    /**
     * Load from storage
     */
    async loadFromStorage() {
        if (typeof localStorage !== 'undefined') {
            try {
                const data = localStorage.getItem('ai-ide-config');
                if (data) {
                    await this.import(data, 'system');
                }
            }
            catch (error) {
                console.error('Failed to load config from storage:', error);
            }
        }
    }
    /**
     * Load environment variable overrides
     */
    loadEnvironmentOverrides() {
        // Override with environment variables
        const envOverrides = {
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
};
exports.ConfigService = ConfigService;
exports.ConfigService = ConfigService = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], ConfigService);
