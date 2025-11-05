"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LlmProviderService = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const llm_provider_registry_1 = require("./llm-provider-registry");
const uuid_1 = require("uuid");
let LlmProviderService = class LlmProviderService {
    registry;
    constructor(registry) {
        this.registry = registry;
    }
    instantiate(cfg) {
        if (!cfg)
            return undefined;
        if (cfg.type === 'custom') {
            // local require to keep module loading lazy
            const { CustomHttpProvider } = require('./llm-providers/custom-provider');
            return new CustomHttpProvider(cfg);
        }
        // aethel provider can be added later
        return undefined;
    }
    getProvider(providerId) {
        const all = this.registry.getAll();
        const pid = providerId ?? this.registry.getDefaultProviderId();
        const cfg = pid ? all.find(p => p.id === pid) : all[0];
        if (!cfg)
            return undefined;
        return this.instantiate(cfg);
    }
    async sendRequestToProvider(providerId, options) {
        const provider = this.getProvider(providerId);
        if (!provider)
            throw new Error('No provider available');
        const resp = await provider.sendRequest(options);
        // Best-effort emit usage event to central billing service
        void (async () => {
            try {
                const userId = (typeof window !== 'undefined' && window.__CURRENT_USER_ID) ? window.__CURRENT_USER_ID : undefined;
                const orgId = (typeof window !== 'undefined' && window.__CURRENT_ORG_ID) ? window.__CURRENT_ORG_ID : undefined;
                const requestId = (0, uuid_1.v4)();
                const tokensInput = estimateTokens(options.input);
                const tokensOutput = tryExtractTokensFromResponse(resp) ?? 0;
                const estimatedProviderCost = calcEstimatedProviderCost(provider, tokensInput + tokensOutput);
                const body = {
                    requestId,
                    providerId: provider.id,
                    providerType: provider.type,
                    userId,
                    orgId,
                    timestamp: new Date().toISOString(),
                    model: options.settings?.model ?? undefined,
                    tokensInput,
                    tokensOutput,
                    estimatedProviderCost,
                    billingMode: provider.billingMode ?? 'self',
                    providerOwnerId: provider.ownerId ?? undefined,
                    status: resp?.status ?? 0
                };
                const base = (typeof window !== 'undefined' && window.__LLM_MOCK_URL) ? window.__LLM_MOCK_URL : '/api';
                await fetch(`${base}/llm/usage`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            }
            catch (e) {
                // ignore any telemetry failures
            }
        })();
        return resp;
    }
};
exports.LlmProviderService = LlmProviderService;
exports.LlmProviderService = LlmProviderService = tslib_1.__decorate([
    (0, inversify_1.injectable)(),
    tslib_1.__param(0, (0, inversify_1.inject)(llm_provider_registry_1.LlmProviderRegistry)),
    tslib_1.__metadata("design:paramtypes", [llm_provider_registry_1.LlmProviderRegistry])
], LlmProviderService);
function estimateTokens(input) {
    try {
        const s = typeof input === 'string' ? input : JSON.stringify(input);
        // naive heuristic: 4 characters per token
        return Math.max(1, Math.ceil(s.length / 4));
    }
    catch {
        return 0;
    }
}
function tryExtractTokensFromResponse(resp) {
    try {
        if (!resp || !resp.body)
            return undefined;
        // some providers return token usage in body. Try common paths
        const b = resp.body;
        if (typeof b.usage?.total_tokens === 'number')
            return b.usage.total_tokens;
        if (typeof b.usage?.prompt_tokens === 'number' && typeof b.usage?.completion_tokens === 'number')
            return b.usage.prompt_tokens + b.usage.completion_tokens;
        return undefined;
    }
    catch {
        return undefined;
    }
}
function calcEstimatedProviderCost(provider, tokens) {
    try {
        const rate = provider?.rateCard?.pricePerToken ?? 0;
        return +(rate * tokens);
    }
    catch {
        return 0;
    }
}
//# sourceMappingURL=llm-provider-service.js.map