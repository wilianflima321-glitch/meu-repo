import { ObservabilityService } from '../../common/observability-service';
/**
 * Ollama Local LLM Provider
 * Integration with locally running Ollama server
 */
export interface OllamaConfig {
    baseURL: string;
    model: string;
    contextLength?: number;
    temperature?: number;
}
export interface OllamaMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}
export interface OllamaRequest {
    messages: OllamaMessage[];
    options?: {
        temperature?: number;
        num_ctx?: number;
        num_predict?: number;
    };
    stream?: boolean;
}
export interface OllamaResponse {
    content: string;
    model: string;
    totalDuration: number;
    evalCount: number;
    promptEvalCount: number;
}
export interface OllamaModelInfo {
    name: string;
    size: number;
    modifiedAt: string;
    digest: string;
}
export declare class OllamaProvider {
    private observability;
    private config;
    private readonly DEFAULT_BASE_URL;
    private readonly DEFAULT_MODEL;
    constructor(observability: ObservabilityService);
    /**
     * Configure provider
     */
    configure(config: OllamaConfig): void;
    /**
     * Check if provider is configured
     */
    isConfigured(): boolean;
    /**
     * Check if Ollama server is running
     */
    isServerRunning(): Promise<boolean>;
    /**
     * Get available models from Ollama
     */
    getAvailableModels(): Promise<OllamaModelInfo[]>;
    /**
     * Pull a model from Ollama registry
     */
    pullModel(modelName: string, onProgress?: (status: string) => void): Promise<void>;
    /**
     * Send request to Ollama
     */
    sendRequest(request: OllamaRequest): Promise<OllamaResponse>;
    /**
     * Stream response from Ollama
     */
    streamRequest(request: OllamaRequest): AsyncGenerator<string, void, unknown>;
    /**
     * Call Ollama API
     */
    private callOllama;
    /**
     * Extract error message from various error types
     */
    private extractErrorMessage;
    /**
     * Convert messages from generic format
     */
    convertMessages(messages: Array<{
        role: string;
        content: string;
    }>): OllamaMessage[];
    /**
     * Get provider info
     */
    getProviderInfo(): {
        id: string;
        name: string;
        models: string[];
    };
}
