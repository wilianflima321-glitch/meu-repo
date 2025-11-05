export type AIProvider = 'openai' | 'anthropic' | 'ollama' | 'huggingface' | 'google';
export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
export interface ChatCompletionRequest {
    provider?: AIProvider;
    model?: string;
    messages: ChatMessage[];
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    stream?: boolean;
    tools?: unknown[];
    tool_choice?: unknown;
    request_id?: string;
    metadata?: Record<string, unknown>;
}
export interface ChatCompletionUsage {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
}
export interface ChatCompletionChoice {
    index?: number;
    message: ChatMessage;
    finish_reason?: string;
}
export interface ChatCompletionResponse {
    id: string;
    provider?: AIProvider;
    model: string;
    choices: ChatCompletionChoice[];
    usage?: ChatCompletionUsage;
    message?: ChatMessage;
    error?: string;
}
export interface ChatStreamChunk {
    content?: string;
    usage?: ChatCompletionUsage;
    done?: boolean;
    event?: string;
}
export interface ModelLoadRequest {
    model_name: string;
    provider: AIProvider;
    device?: string;
    quantization?: string;
}
export interface LoadModelResponse {
    status: string;
    model_name: string;
    provider: string;
    device?: string;
}
export interface InferenceRequest {
    model_name: string;
    prompt: string;
    max_tokens?: number;
    temperature?: number;
}
export interface InferenceResponse {
    model_name: string;
    result: string;
    tokens_generated?: number;
}
export interface HealthResponse {
    status: string;
    version?: string;
    uptime?: number;
}
export interface AethelBackendClientConfig {
    baseUrl: string;
    token?: string;
    timeoutMs?: number;
    retries?: number;
    enableLogging?: boolean;
}
export declare class AethelAIBackendClient {
    private readonly api;
    private readonly enableLogging;
    private readonly retries;
    constructor(config: AethelBackendClientConfig);
    setToken(token: string | undefined): void;
    health(): Promise<HealthResponse>;
    chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
    chatStream(request: ChatCompletionRequest, _options?: {
        signal?: AbortSignal;
    }): AsyncGenerator<ChatStreamChunk>;
    loadModel(request: ModelLoadRequest): Promise<LoadModelResponse>;
    runInference(request: InferenceRequest): Promise<InferenceResponse>;
    listModels(): Promise<string[]>;
    unloadModel(modelName: string): Promise<{
        status: string;
    }>;
    getGPUInfo(): Promise<Record<string, unknown>>;
    private normalizeChatResponse;
    private buildErrorResponse;
    private formatError;
    private ensureMutableHeaders;
    private log;
}
export declare function getDefaultClient(): AethelAIBackendClient;
export declare function setDefaultClient(client: AethelAIBackendClient | undefined): void;
export { BackendStreamingIterator, type BackendStreamContext } from './streaming';
//# sourceMappingURL=index.d.ts.map