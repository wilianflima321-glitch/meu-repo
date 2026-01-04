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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LlmProviderService = void 0;
const inversify_1 = require("@theia/core/shared/inversify");
const core_1 = require("@theia/core");
const llm_provider_registry_1 = require("./llm-provider-registry");
const uuid_1 = require("uuid");
let LlmProviderService = class LlmProviderService {
    constructor(registry) {
        this.onDidProviderWarningEmitter = new core_1.Emitter();
        // event that consumers (UI) can subscribe to to show warnings returned by providers
        this.onDidProviderWarning = this.onDidProviderWarningEmitter.event;
        this._registry = registry;
    }
    instantiate(cfg) {
        if (!cfg) {
            return undefined;
        }
        if (cfg.type === 'custom') {
            // local require to keep module loading lazy
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { CustomHttpProvider } = require('./llm-providers/custom-provider');
            return new CustomHttpProvider(cfg);
        }
        if (cfg.type === 'ensemble') {
            // create an EnsembleProvider that will call back to this service to resolve child providers
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { EnsembleProvider } = require('./llm-providers/ensemble-provider');
            return new EnsembleProvider(cfg, (id) => this.getProvider(id));
        }
        // aethel provider can be added later
        return undefined;
    }
    getProvider(providerId) {
        const _all = this._registry.getAll();
        const pid = providerId ?? this._registry.getDefaultProviderId();
        const cfg = pid ? _all.find(p => p.id === pid) : _all[0];
        if (!cfg) {
            return undefined;
        }
        return this.instantiate(cfg);
    }
    async sendRequestToProvider(providerId, options) {
        const provider = this.getProvider(providerId);
        if (!provider) {
            throw new Error('No provider available');
        }
        const resp = await provider.sendRequest(options);
        // if the provider returned warnings (e.g. soft verification), surface an event for UI
        try {
            const respObj = resp;
            let warnings;
            if (respObj && Array.isArray(respObj['warnings'])) {
                warnings = respObj['warnings'];
            }
            else if (respObj && respObj['body'] && Array.isArray(respObj['body']['warnings'])) {
                warnings = (respObj['body']['warnings']);
            }
            if (warnings && warnings.length) {
                try {
                    const providerObj = provider;
                    this.onDidProviderWarningEmitter.fire({ providerId: providerObj?.['id'], warnings, options });
                }
                catch (e) {
                    // swallow emitter errors
                }
            }
        }
        catch (e) {
            // non-critical
        }
        // Best-effort emit usage event to central billing service
        (async () => {
            try {
                const globalObj = typeof window !== 'undefined' ? window : undefined;
                const userId = globalObj && typeof globalObj['__CURRENT_USER_ID'] === 'string' ? String(globalObj['__CURRENT_USER_ID']) : undefined;
                const orgId = globalObj && typeof globalObj['__CURRENT_ORG_ID'] === 'string' ? String(globalObj['__CURRENT_ORG_ID']) : undefined;
                const requestId = (0, uuid_1.v4)();
                const tokensInput = estimateTokens(options.input);
                const tokensOutput = tryExtractTokensFromResponse(resp) ?? 0;
                const providerObj = provider;
                const estimatedProviderCost = calcEstimatedProviderCost(providerObj, tokensInput + tokensOutput);
                const getStatus = (r) => {
                    try {
                        const rr = r;
                        if (rr && typeof rr.status === 'number')
                            return rr.status;
                        if (rr && typeof rr.status === 'string')
                            return Number(rr.status) || 0;
                    }
                    catch {
                        // ignore
                    }
                    return 0;
                };
                const body = {
                    requestId,
                    providerId: providerObj?.['id'],
                    providerType: providerObj?.['type'],
                    userId,
                    orgId,
                    timestamp: new Date().toISOString(),
                    model: options.settings?.model ?? undefined,
                    tokensInput,
                    tokensOutput,
                    estimatedProviderCost,
                    billingMode: providerObj?.['billingMode'] ?? 'self',
                    providerOwnerId: providerObj?.['ownerId'] ?? undefined,
                    status: getStatus(resp)
                };
                const base = globalObj && typeof globalObj['__LLM_MOCK_URL'] === 'string' ? String(globalObj['__LLM_MOCK_URL']) : '/api';
                await fetch(`${base}/llm/usage`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            }
            catch (e) {
                // ignore any telemetry failures
            }
        })().catch(() => { });
        return resp;
    }
};
exports.LlmProviderService = LlmProviderService;
exports.LlmProviderService = LlmProviderService = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(llm_provider_registry_1.LlmProviderRegistry)),
    __metadata("design:paramtypes", [llm_provider_registry_1.LlmProviderRegistry])
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
        if (!resp || !resp.body) {
            return undefined;
        }
        // some providers return token usage in body. Try common paths
        const b = resp.body;
        const usage = b?.['usage'];
        if (usage && typeof usage['total_tokens'] === 'number') {
            return Number(usage['total_tokens']);
        }
        if (usage && typeof usage['prompt_tokens'] === 'number' && typeof usage['completion_tokens'] === 'number') {
            return Number(usage['prompt_tokens']) + Number(usage['completion_tokens']);
        }
        return undefined;
    }
    catch {
        return undefined;
    }
}
function calcEstimatedProviderCost(provider, tokens) {
    try {
        const p = provider;
        const rate = (p && p['rateCard'] && p['rateCard']['pricePerToken'] ? Number(p['rateCard']['pricePerToken']) : 0);
        return +(rate * tokens);
    }
    catch {
        return 0;
    }
}
