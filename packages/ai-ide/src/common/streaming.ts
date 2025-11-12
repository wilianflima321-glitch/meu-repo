// Streaming support for LLM responses

export interface Delta {
    content: string;
    tokens?: number;
    metadata?: Record<string, unknown>;
}

export interface StreamingHandle {
    iterable: AsyncIterable<Delta>;
    cancel: () => void;
}

export interface StreamingOptions {
    onDelta?: (delta: Delta) => void;
    onComplete?: (metadata: any) => void;
    onError?: (error: Error) => void;
}

export class StreamingProvider {
    private abortController: AbortController | null = null;

    async *streamRequest(
        endpoint: string,
        apiKey: string,
        payload: any
    ): AsyncGenerator<Delta> {
        this.abortController = new AbortController();

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    ...payload,
                    stream: true
                }),
                signal: this.abortController.signal
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No response body available');
            }

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim() === '') continue;
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        
                        if (data === '[DONE]') {
                            return;
                        }

                        try {
                            const parsed = JSON.parse(data);
                            const content = this.extractContent(parsed);
                            
                            if (content) {
                                yield {
                                    content,
                                    tokens: 1,
                                    metadata: parsed
                                };
                            }
                        } catch (e) {
                            console.warn('Failed to parse streaming chunk:', e);
                        }
                    }
                }
            }
        } finally {
            this.abortController = null;
        }
    }

    private extractContent(data: any): string | null {
        // OpenAI format
        if (data.choices?.[0]?.delta?.content) {
            return data.choices[0].delta.content;
        }

        // Anthropic format
        if (data.delta?.text) {
            return data.delta.text;
        }

        // Generic format
        if (data.content) {
            return data.content;
        }

        return null;
    }

    cancel(): void {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }

    createHandle(
        endpoint: string,
        apiKey: string,
        payload: any
    ): StreamingHandle {
        const iterable = this.streamRequest(endpoint, apiKey, payload);
        
        return {
            iterable,
            cancel: () => this.cancel()
        };
    }
}

export class StreamingClient {
    private streamingProvider: StreamingProvider;

    constructor() {
        this.streamingProvider = new StreamingProvider();
    }

    async streamResponse(
        endpoint: string,
        apiKey: string,
        payload: any,
        options: StreamingOptions = {}
    ): Promise<string> {
        let fullContent = '';

        try {
            const handle = this.streamingProvider.createHandle(endpoint, apiKey, payload);

            for await (const delta of handle.iterable) {
                fullContent += delta.content;
                
                if (options.onDelta) {
                    options.onDelta(delta);
                }
            }

            if (options.onComplete) {
                options.onComplete({ totalTokens: fullContent.length });
            }

            return fullContent;

        } catch (error) {
            if (options.onError) {
                options.onError(error instanceof Error ? error : new Error(String(error)));
            }
            throw error;
        }
    }

    cancel(): void {
        this.streamingProvider.cancel();
    }
}
