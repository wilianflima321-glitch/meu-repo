import { LlmProviderRegistry } from './llm-provider-registry';
import { ILlmProvider, SendRequestOptions, LlmProviderResponse } from '../common/llm-provider';
export declare class LlmProviderService {
    protected readonly registry: LlmProviderRegistry;
    constructor(registry: LlmProviderRegistry);
    instantiate(cfg: any): ILlmProvider | undefined;
    getProvider(providerId?: string): ILlmProvider | undefined;
    sendRequestToProvider(providerId: string | undefined, options: SendRequestOptions): Promise<LlmProviderResponse>;
}
//# sourceMappingURL=llm-provider-service.d.ts.map