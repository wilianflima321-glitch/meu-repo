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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var LlmProviderRegistry_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LlmProviderRegistry = void 0;
const inversify_1 = require("@theia/core/shared/inversify");
const core_1 = require("@theia/core");
const common_1 = require("@theia/core/lib/common");
const ai_llm_preferences_1 = require("../common/ai-llm-preferences");
let LlmProviderRegistry = class LlmProviderRegistry {
    static { LlmProviderRegistry_1 = this; }
    constructor(preferenceService) {
        this.providersChangedEmitter = new common_1.Emitter();
        this.defaultProviderChangedEmitter = new common_1.Emitter();
        this.preferenceService = preferenceService;
    }
    get onDidChangeProviders() {
        return this.providersChangedEmitter.event;
    }
    get onDidChangeDefaultProvider() {
        return this.defaultProviderChangedEmitter.event;
    }
    getAll() {
        this.scheduleProvidersRefresh();
        return this.normalizeProviders(this.getProvidersFromPreferences());
    }
    saveAll(providers) {
        const sanitized = providers.map(LlmProviderRegistry_1.sanitizeProvider);
        this.setPreference(LlmProviderRegistry_1.PROVIDERS_KEY, sanitized);
        this.fireProvidersChanged(sanitized);
        void this.persistProvidersRemotely(sanitized)
            .then(success => {
            if (success) {
                this.scheduleProvidersRefresh();
            }
        })
            .catch(() => undefined);
    }
    addProvider(cfg) {
        const providers = this.getProvidersFromPreferences().filter(existing => existing.id !== cfg.id);
        const next = [...providers, LlmProviderRegistry_1.sanitizeProvider(cfg)];
        this.setPreference(LlmProviderRegistry_1.PROVIDERS_KEY, next);
        this.fireProvidersChanged(next);
        void this.createProviderRemotely(cfg)
            .then(success => {
            if (success) {
                this.scheduleProvidersRefresh();
            }
        })
            .catch(() => undefined);
    }
    removeProvider(id) {
        const providers = this.getProvidersFromPreferences().filter(provider => provider.id !== id);
        this.setPreference(LlmProviderRegistry_1.PROVIDERS_KEY, providers);
        this.fireProvidersChanged(providers);
        void this.deleteProviderRemotely(id)
            .then(success => {
            if (success) {
                this.scheduleProvidersRefresh();
            }
        })
            .catch(() => undefined);
    }
    getDefaultProviderId() {
        this.scheduleDefaultProviderRefresh();
        return this.getDefaultProviderFromPreferences();
    }
    setDefaultProvider(id) {
        this.setPreference(LlmProviderRegistry_1.DEFAULT_PROVIDER_KEY, id);
        this.fireDefaultProviderChanged(id);
        void this.persistDefaultProviderRemotely(id)
            .then(success => {
            if (success) {
                this.scheduleDefaultProviderRefresh();
            }
        })
            .catch(() => undefined);
    }
    fireProvidersChanged(providers) {
        this.providersChangedEmitter.fire(this.normalizeProviders(providers ?? this.getProvidersFromPreferences()));
    }
    fireDefaultProviderChanged(id) {
        this.defaultProviderChangedEmitter.fire(id ?? this.getDefaultProviderFromPreferences());
    }
    scheduleProvidersRefresh() {
        if (!this.providersRefreshPromise) {
            this.providersRefreshPromise = this.refreshProvidersFromBackend()
                .catch(() => undefined)
                .finally(() => {
                this.providersRefreshPromise = undefined;
            });
        }
    }
    scheduleDefaultProviderRefresh() {
        if (!this.defaultRefreshPromise) {
            this.defaultRefreshPromise = this.refreshDefaultProviderFromBackend()
                .catch(() => undefined)
                .finally(() => {
                this.defaultRefreshPromise = undefined;
            });
        }
    }
    async refreshProvidersFromBackend() {
        try {
            const globalObj = typeof window !== 'undefined' ? window : undefined;
            const base = globalObj && typeof globalObj['__LLM_MOCK_URL'] === 'string' ? String(globalObj['__LLM_MOCK_URL']) : '/api';
            const resp = await fetch(`${base}/llm/providers`, { credentials: 'same-origin' });
            if (!resp.ok) {
                return;
            }
            const json = await resp.json();
            if (Array.isArray(json)) {
                const providers = json.map(LlmProviderRegistry_1.sanitizeProvider);
                const current = this.getProvidersFromPreferences();
                if (!this.areProvidersEqual(current, providers)) {
                    this.setPreference(LlmProviderRegistry_1.PROVIDERS_KEY, providers);
                    this.fireProvidersChanged(providers);
                }
            }
        }
        catch {
            /* ignore network errors */
        }
    }
    async persistProvidersRemotely(providers) {
        try {
            const resp = await fetch('/api/llm/providers', {
                method: 'PUT',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(providers)
            });
            return resp.ok;
        }
        catch {
            return false;
        }
    }
    async createProviderRemotely(cfg) {
        try {
            const resp = await fetch('/api/llm/providers', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cfg)
            });
            return resp.ok;
        }
        catch {
            return false;
        }
    }
    async deleteProviderRemotely(id) {
        try {
            const resp = await fetch(`/api/llm/providers/${encodeURIComponent(id)}`, {
                method: 'DELETE',
                credentials: 'same-origin'
            });
            return resp.ok;
        }
        catch {
            return false;
        }
    }
    async refreshDefaultProviderFromBackend() {
        try {
            const resp = await fetch('/api/llm/providers/default', { credentials: 'same-origin' });
            if (!resp.ok) {
                return;
            }
            const json = await resp.json();
            if (json && typeof json.id === 'string') {
                if (json.id !== this.getDefaultProviderFromPreferences()) {
                    this.setPreference(LlmProviderRegistry_1.DEFAULT_PROVIDER_KEY, json.id);
                    this.fireDefaultProviderChanged(json.id);
                }
            }
        }
        catch {
            /* ignore network errors */
        }
    }
    async persistDefaultProviderRemotely(id) {
        try {
            const resp = await fetch('/api/llm/providers/default', {
                method: 'PUT',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            return resp.ok;
        }
        catch {
            return false;
        }
    }
    getProvidersFromPreferences() {
        const raw = this.getPreference(LlmProviderRegistry_1.PROVIDERS_KEY, []);
        return raw ? [...raw] : [];
    }
    getDefaultProviderFromPreferences() {
        const id = this.getPreference(LlmProviderRegistry_1.DEFAULT_PROVIDER_KEY, '');
        return typeof id === 'string' && id.length > 0 ? id : undefined;
    }
    normalizeProviders(providers) {
        return providers.map(provider => ({
            billingMode: provider.billingMode ?? 'self',
            ownerId: provider.ownerId ?? undefined,
            promoId: provider.promoId ?? undefined,
            ...provider
        }));
    }
    areProvidersEqual(left, right) {
        if (left.length !== right.length) {
            return false;
        }
        const orderedLeft = this.orderProvidersForComparison(left);
        const orderedRight = this.orderProvidersForComparison(right);
        return JSON.stringify(orderedLeft) === JSON.stringify(orderedRight);
    }
    orderProvidersForComparison(providers) {
        const normalized = this.normalizeProviders(providers);
        return normalized.sort((a, b) => {
            const leftId = a.id ?? '';
            const rightId = b.id ?? '';
            return leftId.localeCompare(rightId);
        });
    }
    getPreference(key, defaultValue) {
        const getter = this.preferenceService.get;
        return getter ? getter.call(this.preferenceService, key, defaultValue) : defaultValue;
    }
    setPreference(key, value) {
        const setter = this.preferenceService.set;
        if (typeof setter === 'function') {
            setter.call(this.preferenceService, key, value);
        }
    }
    static sanitizeProvider(provider) {
        const copy = { ...provider };
        if ('apiKey' in copy) {
            delete copy['apiKey'];
        }
        return copy;
    }
    static { this.PROVIDERS_KEY = ai_llm_preferences_1.AI_LLM_PROVIDERS_PREF; }
    static { this.DEFAULT_PROVIDER_KEY = ai_llm_preferences_1.AI_LLM_DEFAULT_PROVIDER_PREF; }
    dispose() {
        this.providersChangedEmitter.dispose();
        this.defaultProviderChangedEmitter.dispose();
    }
};
exports.LlmProviderRegistry = LlmProviderRegistry;
exports.LlmProviderRegistry = LlmProviderRegistry = LlmProviderRegistry_1 = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(core_1.PreferenceService)),
    __metadata("design:paramtypes", [Object])
], LlmProviderRegistry);
