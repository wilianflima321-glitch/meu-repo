import { ILlmProvider, SendRequestOptions, LlmProviderResponse } from '../../common/llm-provider';
export declare class CustomHttpProvider implements ILlmProvider {
    id: string;
    name: string;
    type: 'custom' | 'aethel';
    endpoint?: string;
    apiKey?: string;
    constructor(cfg: any);
    sendRequest(options: SendRequestOptions): Promise<LlmProviderResponse>;
}
//# sourceMappingURL=custom-provider.d.ts.map