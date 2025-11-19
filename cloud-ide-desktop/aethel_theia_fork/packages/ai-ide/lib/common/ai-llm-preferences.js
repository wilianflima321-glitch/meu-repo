"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiLlmPreferenceSchema = exports.AI_LLM_DEFAULT_PROVIDER_PREF = exports.AI_LLM_PROVIDERS_PREF = void 0;
exports.AI_LLM_PROVIDERS_PREF = 'ai.externalProviders';
exports.AI_LLM_DEFAULT_PROVIDER_PREF = 'ai.defaultProvider';
exports.aiLlmPreferenceSchema = {
    type: 'object',
    properties: {
        [exports.AI_LLM_PROVIDERS_PREF]: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    type: { type: 'string', enum: ['custom', 'aethel'] },
                    endpoint: { type: 'string' },
                    apiKey: { type: 'string' },
                    description: { type: 'string' },
                    isEnabled: { type: 'boolean' },
                    billingMode: { type: 'string', enum: ['platform', 'self', 'sponsored'] },
                    ownerId: { type: 'string' },
                    promoId: { type: 'string' }
                },
                required: ['id', 'name', 'type']
            },
            default: []
        },
        [exports.AI_LLM_DEFAULT_PROVIDER_PREF]: { type: 'string', default: '' }
    }
};
//# sourceMappingURL=ai-llm-preferences.js.map