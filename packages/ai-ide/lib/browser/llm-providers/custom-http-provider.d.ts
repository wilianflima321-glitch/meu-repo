import { ILlmProvider, SendRequestOptions, LlmProviderResponse } from '../../common/llm-provider';
export declare class CustomHttpProvider implements ILlmProvider {
    id: string;
    name: string;
    type: 'custom';
    description?: string;
    isEnabled?: boolean;
    endpoint?: string;
    apiKey?: string;
    constructor(cfg: {
        id: string;
        name: string;
        endpoint?: string;
        apiKey?: string;
        description?: string;
        isEnabled?: boolean;
    });
    sendRequest(payload: SendRequestOptions): Promise<LlmProviderResponse>;
}
//# sourceMappingURL=custom-http-provider.d.ts.map