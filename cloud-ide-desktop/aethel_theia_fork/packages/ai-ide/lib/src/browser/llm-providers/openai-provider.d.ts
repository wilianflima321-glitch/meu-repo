import { ObservabilityService } from '../../common/observability-service';
/**
 * OpenAI LLM Provider
 * Real integration with OpenAI API
 */
export interface OpenAIConfig {
    apiKey: string;
    model: string;
    baseURL?: string;
    organization?: string;
    maxTokens?: number;
    temperature?: number;
}
export interface LLMRequest {
    messages: Array<{
        role: string;
        content: string;
    }>;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
}
export interface LLMResponse {
    content: string;
    model: string;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    finishReason: string;
}
export declare class OpenAIProvider {
    private observability;
    private config;
    private readonly DEFAULT_MODEL;
    private readonly DEFAULT_BASE_URL;
    constructor(observability: ObservabilityService);
    /**
     * Configure provider
     */
    configure(config: OpenAIConfig): void;
    /**
     * Check if provider is configured
     */
    isConfigured(): boolean;
    /**
     * Send request to OpenAI
     */
    sendRequest(request: LLMRequest): Promise<LLMResponse>;
    /**
     * Call OpenAI API
     */
    private callOpenAI;
    /**
     * Stream request (for real-time responses)
     */
    streamRequest(request: LLMRequest): AsyncGenerator<string, void, unknown>;
    /**
     * Extract error message from error object
     */
    private extractErrorMessage;
    /**
     * Test connection
     */
    testConnection(): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Get provider status
     */
    getStatus(): {
        configured: boolean;
        model: string;
        baseURL: string;
    };
}
