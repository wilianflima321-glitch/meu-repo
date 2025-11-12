export declare const AI_LLM_PROVIDERS_PREF = "ai.externalProviders";
export declare const AI_LLM_DEFAULT_PROVIDER_PREF = "ai.defaultProvider";
export interface LlmProviderConfig {
    id: string;
    name: string;
    type: 'custom' | 'aethel';
    endpoint?: string;
    apiKey?: string;
    description?: string;
    isEnabled?: boolean;
    billingMode?: 'platform' | 'self' | 'sponsored';
    ownerId?: string;
    promoId?: string;
}
export declare const aiLlmPreferenceSchema: {
    type: string;
    properties: {
        "ai.externalProviders": {
            type: string;
            items: {
                type: string;
                properties: {
                    id: {
                        type: string;
                    };
                    name: {
                        type: string;
                    };
                    type: {
                        type: string;
                        enum: string[];
                    };
                    endpoint: {
                        type: string;
                    };
                    apiKey: {
                        type: string;
                    };
                    description: {
                        type: string;
                    };
                    isEnabled: {
                        type: string;
                    };
                    billingMode: {
                        type: string;
                        enum: string[];
                    };
                    ownerId: {
                        type: string;
                    };
                    promoId: {
                        type: string;
                    };
                };
                required: string[];
            };
            default: never[];
        };
        "ai.defaultProvider": {
            type: string;
            default: string;
        };
    };
};
//# sourceMappingURL=ai-llm-preferences.d.ts.map