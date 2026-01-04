import { ObservabilityService } from '../../common/observability-service';
/**
 * Anthropic Claude LLM Provider
 * Real integration with Anthropic API
 */
export interface AnthropicConfig {
    apiKey: string;
    model: string;
    maxTokens?: number;
    temperature?: number;
}
export interface AnthropicMessage {
    role: 'user' | 'assistant';
    content: string;
}
export interface AnthropicRequest {
    messages: AnthropicMessage[];
    system?: string;
    maxTokens?: number;
    temperature?: number;
    stream?: boolean;
}
export interface AnthropicResponse {
    content: string;
    model: string;
    usage: {
        inputTokens: number;
        outputTokens: number;
    };
    stopReason: string;
}
export declare class AnthropicProvider {
    private observability;
    private config;
    private readonly DEFAULT_MODEL;
    private readonly BASE_URL;
    private readonly API_VERSION;
    constructor(observability: ObservabilityService);
    /**
     * Configure provider
     */
    configure(config: AnthropicConfig): void;
    /**
     * Check if provider is configured
     */
    isConfigured(): boolean;
    /**
     * Get available models
     */
    getAvailableModels(): string[];
    /**
     * Send request to Anthropic
     */
    sendRequest(request: AnthropicRequest): Promise<AnthropicResponse>;
    /**
     * Stream response from Anthropic
     */
    streamRequest(request: AnthropicRequest): AsyncGenerator<string, void, unknown>;
    /**
     * Call Anthropic API
     */
    private callAnthropic;
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
    }>): AnthropicMessage[];
    /**
     * Get provider info
     */
    getProviderInfo(): {
        id: string;
        name: string;
        models: string[];
    };
}
