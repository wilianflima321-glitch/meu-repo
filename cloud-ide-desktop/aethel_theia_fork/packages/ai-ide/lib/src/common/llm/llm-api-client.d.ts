import { Event } from '@theia/core/lib/common';
/**
 * Supported LLM providers
 */
export type LLMProviderType = 'openai' | 'anthropic' | 'google' | 'mistral' | 'cohere' | 'groq' | 'together' | 'fireworks' | 'azure-openai' | 'ollama' | 'local';
/**
 * API Configuration for each provider
 */
export interface LLMAPIConfig {
    provider: LLMProviderType;
    apiKey: string;
    baseUrl?: string;
    organization?: string;
    timeout?: number;
    maxRetries?: number;
    headers?: Record<string, string>;
}
/**
 * Message format (OpenAI-compatible)
 */
export interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | ContentPart[];
    name?: string;
    tool_call_id?: string;
    tool_calls?: ToolCall[];
}
/**
 * Multimodal content part
 */
export interface ContentPart {
    type: 'text' | 'image_url' | 'audio' | 'video';
    text?: string;
    image_url?: {
        url: string;
        detail?: 'low' | 'high' | 'auto';
    };
    audio?: {
        data: string;
        format: 'wav' | 'mp3' | 'webm';
    };
}
/**
 * Tool/Function call
 */
export interface ToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}
/**
 * Tool definition
 */
export interface ToolDefinition {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: {
            type: 'object';
            properties: Record<string, unknown>;
            required?: string[];
        };
    };
}
/**
 * Chat completion request
 */
export interface ChatCompletionRequest {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    stop?: string | string[];
    stream?: boolean;
    tools?: ToolDefinition[];
    tool_choice?: 'none' | 'auto' | 'required' | {
        type: 'function';
        function: {
            name: string;
        };
    };
    response_format?: {
        type: 'text' | 'json_object';
    };
    seed?: number;
    user?: string;
}
/**
 * Chat completion response
 */
export interface ChatCompletionResponse {
    id: string;
    object: 'chat.completion';
    created: number;
    model: string;
    choices: Array<{
        index: number;
        message: ChatMessage;
        finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
        logprobs?: unknown;
    }>;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    system_fingerprint?: string;
}
/**
 * Streaming chunk
 */
export interface ChatCompletionChunk {
    id: string;
    object: 'chat.completion.chunk';
    created: number;
    model: string;
    choices: Array<{
        index: number;
        delta: Partial<ChatMessage>;
        finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
    }>;
}
/**
 * API Error with details
 */
export declare class LLMAPIError extends Error {
    readonly status: number;
    readonly code: string;
    readonly provider: LLMProviderType;
    readonly retryable: boolean;
    constructor(message: string, status: number, code: string, provider: LLMProviderType, retryable?: boolean);
}
/**
 * Real LLM API Client
 * Production-ready implementation with retry logic, rate limiting, and error handling
 */
export declare class LLMAPIClient {
    private readonly configs;
    private readonly rateLimiters;
    private readonly retryDelays;
    private readonly onRequestEmitter;
    private readonly onResponseEmitter;
    private readonly onErrorEmitter;
    private readonly onStreamChunkEmitter;
    readonly onRequest: Event<{
        provider: LLMProviderType;
        model: string;
    }>;
    readonly onResponse: Event<{
        provider: LLMProviderType;
        tokens: number;
        latency: number;
    }>;
    readonly onError: Event<{
        provider: LLMProviderType;
        error: Error;
    }>;
    readonly onStreamChunk: Event<{
        provider: LLMProviderType;
        chunk: string;
    }>;
    private readonly providerEndpoints;
    /**
     * Register API configuration for a provider
     */
    registerProvider(config: LLMAPIConfig): void;
    /**
     * Get registered provider configuration
     */
    getProviderConfig(provider: LLMProviderType): LLMAPIConfig | undefined;
    /**
     * Check if provider is configured
     */
    isProviderConfigured(provider: LLMProviderType): boolean;
    /**
     * Chat completion - non-streaming
     */
    chatCompletion(provider: LLMProviderType, request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
    /**
     * Chat completion - streaming
     */
    chatCompletionStream(provider: LLMProviderType, request: ChatCompletionRequest): AsyncGenerator<ChatCompletionChunk, void, unknown>;
    /**
     * Execute HTTP request to provider API
     */
    private executeRequest;
    /**
     * Execute streaming request
     */
    private executeStreamRequest;
    /**
     * Prepare request based on provider format
     */
    private prepareRequest;
    /**
     * OpenAI-compatible request format
     */
    private prepareOpenAIRequest;
    /**
     * Anthropic request format (Claude)
     */
    private prepareAnthropicRequest;
    /**
     * Google Gemini request format
     */
    private prepareGoogleRequest;
    /**
     * Cohere request format
     */
    private prepareCohereRequest;
    /**
     * Convert content parts to Anthropic format
     */
    private convertContentParts;
    /**
     * Create appropriate API error
     */
    private createAPIError;
    /**
     * Check if error is retryable
     */
    private isRetryableError;
    /**
     * Get config or throw error
     */
    private getConfigOrThrow;
    /**
     * Get rate limit for provider
     */
    private getProviderRateLimit;
    /**
     * Get token limit for provider
     */
    private getProviderTokenLimit;
    /**
     * Delay helper
     */
    private delay;
}
/**
 * Rate limiter implementation
 */
declare class RateLimiter {
    private readonly limits;
    private requestCount;
    private tokenCount;
    private windowStart;
    private queue;
    constructor(limits: {
        requestsPerMinute: number;
        tokensPerMinute: number;
    });
    waitForCapacity(messages: ChatMessage[]): Promise<void>;
    recordUsage(tokens: number): void;
    private resetWindow;
    private estimateTokens;
}
/**
 * Embeddings API
 */
export declare class EmbeddingsAPIClient {
    private configs;
    registerProvider(config: LLMAPIConfig): void;
    createEmbedding(provider: LLMProviderType, model: string, input: string | string[]): Promise<{
        embedding: number[];
        index: number;
    }[]>;
    private openAIEmbeddings;
    private cohereEmbeddings;
}
export { RateLimiter };
