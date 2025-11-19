export interface SendRequestOptions {
    input: string;
    settings?: Record<string, any>;
}
export type LlmRequestPayload = SendRequestOptions;
export interface LlmProviderResponse {
    status: number;
    body: any;
}
export type LlmProviderType = 'custom' | 'aethel';
export interface ILlmProvider {
    id: string;
    name: string;
    type: LlmProviderType;
    description?: string;
    isEnabled?: boolean;
    sendRequest(options: SendRequestOptions): Promise<LlmProviderResponse>;
}
//# sourceMappingURL=llm-provider.d.ts.map