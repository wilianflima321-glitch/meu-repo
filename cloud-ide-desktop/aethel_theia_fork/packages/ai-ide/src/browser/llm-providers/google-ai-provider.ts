import { injectable, inject } from 'inversify';
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
    parts: Array<{ text: string }>;
}

export interface GoogleAIRequest {
    contents: GoogleAIContent[];
    systemInstruction?: { parts: Array<{ text: string }> };
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

@injectable()
export class GoogleAIProvider {
    private config: GoogleAIConfig | null = null;
    private readonly DEFAULT_MODEL = 'gemini-1.5-pro';
    private readonly BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

    constructor(
        @inject(ObservabilityService) private observability: ObservabilityService
    ) {}

    /**
     * Configure provider
     */
    configure(config: GoogleAIConfig): void {
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
            'gemini-1.5-pro',
            'gemini-1.5-flash',
            'gemini-1.5-flash-8b',
            'gemini-2.0-flash-exp',
            'gemini-exp-1206',
        ];
    }

    /**
     * Send request to Google AI
     */
    async sendRequest(request: GoogleAIRequest): Promise<GoogleAIResponse> {
        if (!this.isConfigured()) {
            throw new Error('Google AI provider not configured. Set API key first.');
        }

        const startTime = Date.now();
        const providerId = 'google-ai';

        try {
            const response = await this.callGoogleAI(request);
            
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
     * Stream response from Google AI
     */
    async *streamRequest(request: GoogleAIRequest): AsyncGenerator<string, void, unknown> {
        if (!this.isConfigured()) {
            throw new Error('Google AI provider not configured. Set API key first.');
        }

        const config = this.config!;
        const model = config.model || this.DEFAULT_MODEL;

        const body = {
            contents: request.contents,
            systemInstruction: request.systemInstruction,
            generationConfig: {
                maxOutputTokens: request.generationConfig?.maxOutputTokens || config.maxOutputTokens || 8192,
                temperature: request.generationConfig?.temperature ?? config.temperature ?? 0.7,
                topP: request.generationConfig?.topP ?? 0.95,
                topK: request.generationConfig?.topK ?? 40,
            },
        };

        const url = `${this.BASE_URL}/models/${model}:streamGenerateContent?key=${config.apiKey}&alt=sse`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(`Google AI API error: ${response.status} - ${JSON.stringify(error)}`);
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
                            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                            if (text) {
                                yield text;
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
     * Call Google AI API
     */
    private async callGoogleAI(request: GoogleAIRequest): Promise<GoogleAIResponse> {
        const config = this.config!;
        const model = config.model || this.DEFAULT_MODEL;

        const body = {
            contents: request.contents,
            systemInstruction: request.systemInstruction,
            generationConfig: {
                maxOutputTokens: request.generationConfig?.maxOutputTokens || config.maxOutputTokens || 8192,
                temperature: request.generationConfig?.temperature ?? config.temperature ?? 0.7,
                topP: request.generationConfig?.topP ?? 0.95,
                topK: request.generationConfig?.topK ?? 40,
            },
        };

        const url = `${this.BASE_URL}/models/${model}:generateContent?key=${config.apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(`Google AI API error: ${response.status} - ${JSON.stringify(error)}`);
        }

        const data = await response.json();

        const candidate = data.candidates?.[0];
        const content = candidate?.content?.parts?.[0]?.text || '';

        return {
            content,
            model: model,
            usage: {
                promptTokens: data.usageMetadata?.promptTokenCount || 0,
                candidatesTokens: data.usageMetadata?.candidatesTokenCount || 0,
                totalTokens: data.usageMetadata?.totalTokenCount || 0,
            },
            finishReason: candidate?.finishReason || 'unknown',
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
     * Convert messages from generic format to Google AI format
     */
    convertMessages(messages: Array<{ role: string; content: string }>): GoogleAIContent[] {
        return messages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
        }));
    }

    /**
     * Get provider info
     */
    getProviderInfo(): { id: string; name: string; models: string[] } {
        return {
            id: 'google-ai',
            name: 'Google AI (Gemini)',
            models: this.getAvailableModels(),
        };
    }
}
