import { injectable, inject } from 'inversify';
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
    messages: Array<{ role: string; content: string }>;
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

@injectable()
export class OpenAIProvider {
    private config: OpenAIConfig | null = null;
    private readonly DEFAULT_MODEL = 'gpt-4';
    private readonly DEFAULT_BASE_URL = 'https://api.openai.com/v1';

    constructor(
        @inject(ObservabilityService) private observability: ObservabilityService
    ) {}

    /**
     * Configure provider
     */
    configure(config: OpenAIConfig): void {
        this.config = config;
    }

    /**
     * Check if provider is configured
     */
    isConfigured(): boolean {
        return this.config !== null && !!this.config.apiKey;
    }

    /**
     * Send request to OpenAI
     */
    async sendRequest(request: LLMRequest): Promise<LLMResponse> {
        if (!this.isConfigured()) {
            throw new Error('OpenAI provider not configured. Set API key first.');
        }

        const startTime = Date.now();
        const providerId = 'openai';

        try {
            const response = await this.callOpenAI(request);
            
            const duration = Date.now() - startTime;
            this.observability.recordProviderRequest(providerId, duration, true);
            
            return response;
        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMsg = this.extractErrorMessage(error);
            
            this.observability.recordProviderRequest(providerId, duration, false, errorMsg);
            
            throw new Error(`OpenAI request failed: ${errorMsg}`);
        }
    }

    /**
     * Call OpenAI API
     */
    private async callOpenAI(request: LLMRequest): Promise<LLMResponse> {
        const config = this.config!;
        const baseURL = config.baseURL || this.DEFAULT_BASE_URL;
        const model = config.model || this.DEFAULT_MODEL;

        const requestBody = {
            model,
            messages: request.messages,
            temperature: request.temperature ?? config.temperature ?? 0.7,
            max_tokens: request.maxTokens ?? config.maxTokens ?? 2000,
            stream: request.stream ?? false
        };

        const response = await fetch(`${baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
                ...(config.organization && { 'OpenAI-Organization': config.organization })
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.error?.message || 
                `HTTP ${response.status}: ${response.statusText}`
            );
        }

        const data = await response.json();

        return {
            content: data.choices[0]?.message?.content || '',
            model: data.model,
            usage: {
                promptTokens: data.usage?.prompt_tokens || 0,
                completionTokens: data.usage?.completion_tokens || 0,
                totalTokens: data.usage?.total_tokens || 0
            },
            finishReason: data.choices[0]?.finish_reason || 'unknown'
        };
    }

    /**
     * Stream request (for real-time responses)
     */
    async *streamRequest(request: LLMRequest): AsyncGenerator<string, void, unknown> {
        if (!this.isConfigured()) {
            throw new Error('OpenAI provider not configured');
        }

        const config = this.config!;
        const baseURL = config.baseURL || this.DEFAULT_BASE_URL;
        const model = config.model || this.DEFAULT_MODEL;

        const requestBody = {
            model,
            messages: request.messages,
            temperature: request.temperature ?? config.temperature ?? 0.7,
            max_tokens: request.maxTokens ?? config.maxTokens ?? 2000,
            stream: true
        };

        const response = await fetch(`${baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
                ...(config.organization && { 'OpenAI-Organization': config.organization })
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('Response body is not readable');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices[0]?.delta?.content;
                            if (content) {
                                yield content;
                            }
                        } catch (e) {
                            // Skip invalid JSON
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }

    /**
     * Extract error message from error object
     */
    private extractErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        }
        if (typeof error === 'string') {
            return error;
        }
        if (error && typeof error === 'object' && 'message' in error) {
            return String((error as any).message);
        }
        return 'Unknown error';
    }

    /**
     * Test connection
     */
    async testConnection(): Promise<{ success: boolean; error?: string }> {
        try {
            const response = await this.sendRequest({
                messages: [{ role: 'user', content: 'Hello' }],
                maxTokens: 10
            });
            
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: this.extractErrorMessage(error)
            };
        }
    }

    /**
     * Get provider status
     */
    getStatus(): {
        configured: boolean;
        model: string;
        baseURL: string;
    } {
        return {
            configured: this.isConfigured(),
            model: this.config?.model || this.DEFAULT_MODEL,
            baseURL: this.config?.baseURL || this.DEFAULT_BASE_URL
        };
    }
}
