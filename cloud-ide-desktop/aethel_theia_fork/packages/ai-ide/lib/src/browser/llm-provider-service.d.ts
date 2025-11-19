import { Emitter } from '@theia/core';
import { LlmProviderRegistry } from './llm-provider-registry';
import { ILlmProvider, SendRequestOptions, LlmProviderResponse } from '../common/llm-provider';
export declare class LlmProviderService {
    protected readonly _registry: LlmProviderRegistry;
    constructor(registry: LlmProviderRegistry);
    protected readonly onDidProviderWarningEmitter: Emitter<unknown>;
    onDidProviderWarning: import("@theia/core").Event<unknown>;
    instantiate(cfg: any): ILlmProvider | undefined;
    getProvider(providerId?: string): ILlmProvider | undefined;
    sendRequestToProvider(providerId: string | undefined, options: SendRequestOptions): Promise<LlmProviderResponse>;
}
