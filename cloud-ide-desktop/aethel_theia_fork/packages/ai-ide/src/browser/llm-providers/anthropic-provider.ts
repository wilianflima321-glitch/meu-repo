import { injectable, inject } from 'inversify';
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

@injectable()
export class AnthropicProvider {
    private config: AnthropicConfig | null = null;
    private readonly DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';
    private readonly BASE_URL = 'https://api.anthropic.com/v1';
    private readonly API_VERSION = '2023-06-01';

    constructor(
        @inject(ObservabilityService) private observability: ObservabilityService
    ) {}

    /**
     * Configure provider
     */
    configure(config: AnthropicConfig): void {
        this.config = config;
    }

    /**
     * Check if provider is configured
     */
    isConfigured(): boolean {
        return this.config !== null && !!this.config.apiKey;
    }

    /**
     * Get available models
     */
    getAvailableModels(): string[] {
        return [
            'claude-3-5-sonnet-20241022',
            'claude-3-5-haiku-20241022',
            'claude-3-opus-20240229',
            'claude-3-sonnet-20240229',
            'claude-3-haiku-20240307',
        ];
    }

    /**
     * Send request to Anthropic
     */
    async sendRequest(request: AnthropicRequest): Promise<AnthropicResponse> {
        if (!this.isConfigured()) {
            throw new Error('Anthropic provider not configured. Set API key first.');
        }

        const startTime = Date.now();
        const providerId = 'anthropic';

        try {
            const response = await this.callAnthropic(request);
            
            const duration = Date.now() - startTime;
            this.observability.recordProviderRequest(providerId, duration, true);
            
            return response;
        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMsg = this.extractErrorMessage(error);
            this.observability.recordProviderRequest(providerId, duration, false, errorMsg);
            throw error;
        }
    }

    /**
     * Stream response from Anthropic
     */
    async *streamRequest(request: AnthropicRequest): AsyncGenerator<string, void, unknown> {
        if (!this.isConfigured()) {
            throw new Error('Anthropic provider not configured. Set API key first.');
        }

        const config = this.config!;
        const model = config.model || this.DEFAULT_MODEL;

        const body = {
            model,
            messages: request.messages,
            system: request.system,
            max_tokens: request.maxTokens || config.maxTokens || 4096,
            temperature: request.temperature ?? config.temperature ?? 0.7,
            stream: true,
        };

        const response = await fetch(`${this.BASE_URL}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.apiKey,
                'anthropic-version': this.API_VERSION,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(`Anthropic API error: ${response.status} - ${JSON.stringify(error)}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('No response body');
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
                        if (data === '[DONE]') return;

                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                                yield parsed.delta.text;
                            }
                        } catch {
                            // Skip malformed JSON
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }

    /**
     * Call Anthropic API
     */
    private async callAnthropic(request: AnthropicRequest): Promise<AnthropicResponse> {
        const config = this.config!;
        const model = config.model || this.DEFAULT_MODEL;

        const body = {
            model,
            messages: request.messages,
            system: request.system,
            max_tokens: request.maxTokens || config.maxTokens || 4096,
            temperature: request.temperature ?? config.temperature ?? 0.7,
        };

        const response = await fetch(`${this.BASE_URL}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.apiKey,
                'anthropic-version': this.API_VERSION,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(`Anthropic API error: ${response.status} - ${JSON.stringify(error)}`);
        }

        const data = await response.json();

        return {
            content: data.content?.[0]?.text || '',
            model: data.model,
            usage: {
                inputTokens: data.usage?.input_tokens || 0,
                outputTokens: data.usage?.output_tokens || 0,
            },
            stopReason: data.stop_reason || 'unknown',
        };
    }

    /**
     * Extract error message from various error types
     */
    private extractErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        }
        if (typeof error === 'string') {
            return error;
        }
        return 'Unknown error';
    }

    /**
     * Convert messages from generic format
     */
    convertMessages(messages: Array<{ role: string; content: string }>): AnthropicMessage[] {
        return messages.map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
        }));
    }

    /**
     * Get provider info
     */
    getProviderInfo(): { id: string; name: string; models: string[] } {
        return {
            id: 'anthropic',
            name: 'Anthropic Claude',
            models: this.getAvailableModels(),
        };
    }
}
