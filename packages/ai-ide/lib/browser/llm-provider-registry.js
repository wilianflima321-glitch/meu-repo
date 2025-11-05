"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LlmProviderRegistry = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const core_1 = require("@theia/core");
const ai_llm_preferences_1 = require("../common/ai-llm-preferences");
let LlmProviderRegistry = class LlmProviderRegistry {
    preferenceService;
    constructor(preferenceService) {
        this.preferenceService = preferenceService;
    }
    getAll() {
        // Try backend endpoint first (centralized storage). Fall back to preferences if unavailable.
        try {
            void (async () => {
                try {
                    const base = (typeof window !== 'undefined' && window.__LLM_MOCK_URL) ? window.__LLM_MOCK_URL : '/api';
                    const resp = await fetch(`${base}/llm/providers`, { credentials: 'same-origin' });
                    if (resp.ok) {
                        const json = await resp.json();
                        if (Array.isArray(json)) {
                            const setter = this.preferenceService.set;
                            if (typeof setter === 'function') {
                                setter.call(this.preferenceService, ai_llm_preferences_1.AI_LLM_PROVIDERS_PREF, json);
                            }
                        }
                    }
                }
                catch { }
            })();
        }
        catch { }
        const providers = this.preferenceService.get?.(ai_llm_preferences_1.AI_LLM_PROVIDERS_PREF, []);
        // Ensure billing defaults for older records
        const normalized = (providers ?? []).map(p => ({
            billingMode: p.billingMode ?? 'self',
            ownerId: p.ownerId ?? undefined,
            promoId: p.promoId ?? undefined,
            ...p
        }));
        return normalized;
    }
    saveAll(providers) {
        // Try to save centrally; if backend call fails, fall back to preference storage
        const sanitize = (p) => {
            const copy = { ...p };
            // Never persist apiKey or secrets into local preferences cache
            if ('apiKey' in copy)
                delete copy.apiKey;
            return copy;
        };
        void (async () => {
            try {
                const resp = await fetch('/api/llm/providers', { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(providers) });
                if (resp.ok)
                    return;
            }
            catch { }
            const setter = this.preferenceService.set;
            if (typeof setter === 'function') {
                setter.call(this.preferenceService, ai_llm_preferences_1.AI_LLM_PROVIDERS_PREF, providers.map(sanitize));
            }
        })();
    }
    addProvider(cfg) {
        // Try central create API; if it fails, write to preference store
        void (async () => {
            try {
                const resp = await fetch('/api/llm/providers', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cfg) });
                if (resp.ok)
                    return;
            }
            catch { }
            const all = this.getAll();
            this.saveAll([...all.filter(p => p.id !== cfg.id), cfg]);
        })();
    }
    removeProvider(id) {
        void (async () => {
            try {
                const resp = await fetch(`/api/llm/providers/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'same-origin' });
                if (resp.ok)
                    return;
            }
            catch { }
            const all = this.getAll();
            this.saveAll(all.filter(p => p.id !== id));
        })();
    }
    getDefaultProviderId() {
        try {
            // Best-effort async refresh from backend
            void (async () => {
                try {
                    const resp = await fetch('/api/llm/providers/default', { credentials: 'same-origin' });
                    if (resp.ok) {
                        const json = await resp.json();
                        if (json && typeof json.id === 'string') {
                            const setter = this.preferenceService.set;
                            if (typeof setter === 'function') {
                                setter.call(this.preferenceService, ai_llm_preferences_1.AI_LLM_DEFAULT_PROVIDER_PREF, json.id);
                            }
                        }
                    }
                }
                catch { }
            })();
        }
        catch { }
        const id = this.preferenceService.get?.(ai_llm_preferences_1.AI_LLM_DEFAULT_PROVIDER_PREF, '');
        return id || undefined;
    }
    setDefaultProvider(id) {
        void (async () => {
            try {
                const resp = await fetch('/api/llm/providers/default', { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
                if (resp.ok)
                    return;
            }
            catch { }
            const setter = this.preferenceService.set;
            if (typeof setter === 'function') {
                setter.call(this.preferenceService, ai_llm_preferences_1.AI_LLM_DEFAULT_PROVIDER_PREF, id);
            }
        })();
    }
};
exports.LlmProviderRegistry = LlmProviderRegistry;
exports.LlmProviderRegistry = LlmProviderRegistry = tslib_1.__decorate([
    (0, inversify_1.injectable)(),
    tslib_1.__param(0, (0, inversify_1.inject)(core_1.PreferenceService)),
    tslib_1.__metadata("design:paramtypes", [Object])
], LlmProviderRegistry);
//# sourceMappingURL=llm-provider-registry.js.map