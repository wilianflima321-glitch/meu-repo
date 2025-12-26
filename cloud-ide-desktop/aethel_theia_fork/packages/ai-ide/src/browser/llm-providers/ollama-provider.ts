import { injectable, inject } from 'inversify';
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

@injectable()
export class OllamaProvider {
    private config: OllamaConfig | null = null;
    private readonly DEFAULT_BASE_URL = 'http://localhost:11434';
    private readonly DEFAULT_MODEL = 'llama3.2';

    constructor(
        @inject(ObservabilityService) private observability: ObservabilityService
    ) {}

    /**
     * Configure provider
     */
    configure(config: OllamaConfig): void {
        this.config = config;
    }

    /**
     * Check if provider is configured
     */
    isConfigured(): boolean {
        return this.config !== null;
    }

    /**
     * Check if Ollama server is running
     */
    async isServerRunning(): Promise<boolean> {
        try {
            const baseURL = this.config?.baseURL || this.DEFAULT_BASE_URL;
            const response = await fetch(`${baseURL}/api/tags`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000),
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    /**
     * Get available models from Ollama
     */
    async getAvailableModels(): Promise<OllamaModelInfo[]> {
        const baseURL = this.config?.baseURL || this.DEFAULT_BASE_URL;
        
        try {
            const response = await fetch(`${baseURL}/api/tags`);
            if (!response.ok) {
                return [];
            }
            
            const data = await response.json();
            return (data.models || []).map((m: any) => ({
                name: m.name,
                size: m.size,
                modifiedAt: m.modified_at,
                digest: m.digest,
            }));
        } catch {
            return [];
        }
    }

    /**
     * Pull a model from Ollama registry
     */
    async pullModel(modelName: string, onProgress?: (status: string) => void): Promise<void> {
        const baseURL = this.config?.baseURL || this.DEFAULT_BASE_URL;

        const response = await fetch(`${baseURL}/api/pull`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: modelName, stream: true }),
        });

        if (!response.ok) {
            throw new Error(`Failed to pull model: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const lines = decoder.decode(value).split('\n').filter(Boolean);
                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);
                        if (onProgress && data.status) {
                            onProgress(data.status);
                        }
                    } catch {
                        // Skip malformed lines
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }

    /**
     * Send request to Ollama
     */
    async sendRequest(request: OllamaRequest): Promise<OllamaResponse> {
        if (!this.isConfigured() && !await this.isServerRunning()) {
            throw new Error('Ollama server not running. Start Ollama first.');
        }

        const startTime = Date.now();
        const providerId = 'ollama';

        try {
            const response = await this.callOllama(request);
            
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
     * Stream response from Ollama
     */
    async *streamRequest(request: OllamaRequest): AsyncGenerator<string, void, unknown> {
        const config = this.config;
        const baseURL = config?.baseURL || this.DEFAULT_BASE_URL;
        const model = config?.model || this.DEFAULT_MODEL;

        const body = {
            model,
            messages: request.messages,
            stream: true,
            options: {
                temperature: request.options?.temperature ?? config?.temperature ?? 0.7,
                num_ctx: request.options?.num_ctx ?? config?.contextLength ?? 4096,
                num_predict: request.options?.num_predict ?? 2048,
            },
        };

        const response = await fetch(`${baseURL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Ollama API error: ${response.status} - ${error}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('No response body');
        }

        const decoder = new TextDecoder();

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const lines = decoder.decode(value).split('\n').filter(Boolean);
                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);
                        if (data.message?.content) {
                            yield data.message.content;
                        }
                        if (data.done) return;
                    } catch {
                        // Skip malformed lines
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }

    /**
     * Call Ollama API
     */
    private async callOllama(request: OllamaRequest): Promise<OllamaResponse> {
        const config = this.config;
        const baseURL = config?.baseURL || this.DEFAULT_BASE_URL;
        const model = config?.model || this.DEFAULT_MODEL;

        const body = {
            model,
            messages: request.messages,
            stream: false,
            options: {
                temperature: request.options?.temperature ?? config?.temperature ?? 0.7,
                num_ctx: request.options?.num_ctx ?? config?.contextLength ?? 4096,
                num_predict: request.options?.num_predict ?? 2048,
            },
        };

        const response = await fetch(`${baseURL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Ollama API error: ${response.status} - ${error}`);
        }

        const data = await response.json();

        return {
            content: data.message?.content || '',
            model: data.model || model,
            totalDuration: data.total_duration || 0,
            evalCount: data.eval_count || 0,
            promptEvalCount: data.prompt_eval_count || 0,
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
    convertMessages(messages: Array<{ role: string; content: string }>): OllamaMessage[] {
        return messages.map(m => ({
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content,
        }));
    }

    /**
     * Get provider info
     */
    getProviderInfo(): { id: string; name: string; models: string[] } {
        return {
            id: 'ollama',
            name: 'Ollama (Local)',
            models: [
                'llama3.2',
                'llama3.2:1b',
                'llama3.1',
                'mistral',
                'codellama',
                'deepseek-coder',
                'qwen2.5-coder',
            ],
        };
    }
}
