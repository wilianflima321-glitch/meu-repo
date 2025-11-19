import { PreferenceService } from '@theia/core';
import { LlmProviderConfig } from '../common/ai-llm-preferences';
export declare class LlmProviderRegistry {
    protected readonly preferenceService: PreferenceService;
    constructor(preferenceService: PreferenceService);
    getAll(): LlmProviderConfig[];
    saveAll(providers: LlmProviderConfig[]): void;
    addProvider(cfg: LlmProviderConfig): void;
    removeProvider(id: string): void;
    getDefaultProviderId(): string | undefined;
    setDefaultProvider(id: string): void;
}
//# sourceMappingURL=llm-provider-registry.d.ts.map