import { ObservabilityService } from '../../common/observability-service';
/**
 * Google AI (Gemini) LLM Provider
 * Real integration with Google AI Studio API
 */
export interface GoogleAIConfig {
    apiKey: string;
    model: string;
    maxOutputTokens?: number;
    temperature?: number;
}
export interface GoogleAIContent {
    role: 'user' | 'model';
    parts: Array<{
        text: string;
    }>;
}
export interface GoogleAIRequest {
    contents: GoogleAIContent[];
    systemInstruction?: {
        parts: Array<{
            text: string;
        }>;
    };
    generationConfig?: {
        maxOutputTokens?: number;
        temperature?: number;
        topP?: number;
        topK?: number;
    };
}
export interface GoogleAIResponse {
    content: string;
    model: string;
    usage: {
        promptTokens: number;
        candidatesTokens: number;
        totalTokens: number;
    };
    finishReason: string;
}
export declare class GoogleAIProvider {
    private observability;
    private config;
    private readonly DEFAULT_MODEL;
    private readonly BASE_URL;
    constructor(observability: ObservabilityService);
    /**
     * Configure provider
     */
    configure(config: GoogleAIConfig): void;
    /**
     * Check if provider is configured
     */
    isConfigured(): boolean;
    /**
     * Get available models
     */
    getAvailableModels(): string[];
    /**
     * Send request to Google AI
     */
    sendRequest(request: GoogleAIRequest): Promise<GoogleAIResponse>;
    /**
     * Stream response from Google AI
     */
    streamRequest(request: GoogleAIRequest): AsyncGenerator<string, void, unknown>;
    /**
     * Call Google AI API
     */
    private callGoogleAI;
    /**
     * Extract error message from various error types
     */
    private extractErrorMessage;
    /**
     * Convert messages from generic format to Google AI format
     */
    convertMessages(messages: Array<{
        role: string;
        content: string;
    }>): GoogleAIContent[];
    /**
     * Get provider info
     */
    getProviderInfo(): {
        id: string;
        name: string;
        models: string[];
    };
}
