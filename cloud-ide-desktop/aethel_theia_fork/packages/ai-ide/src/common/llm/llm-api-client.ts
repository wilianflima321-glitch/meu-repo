import { injectable, inject } from 'inversify';
import { Emitter, Event } from '@theia/core/lib/common';

// ============================================================================
// AETHEL LLM API CLIENT - Real API Connections
// Production-ready implementation for OpenAI, Anthropic, Google, etc.
// ============================================================================

/**
 * Supported LLM providers
 */
export type LLMProviderType = 
  | 'openai' 
  | 'anthropic' 
  | 'google' 
  | 'mistral' 
  | 'cohere' 
  | 'groq' 
  | 'together'
  | 'fireworks'
  | 'azure-openai'
  | 'ollama'
  | 'local';

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
  tool_choice?: 'none' | 'auto' | 'required' | { type: 'function'; function: { name: string } };
  response_format?: { type: 'text' | 'json_object' };
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
export class LLMAPIError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly provider: LLMProviderType,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'LLMAPIError';
  }
}

/**
 * Real LLM API Client
 * Production-ready implementation with retry logic, rate limiting, and error handling
 */
@injectable()
export class LLMAPIClient {
  private readonly configs = new Map<LLMProviderType, LLMAPIConfig>();
  private readonly rateLimiters = new Map<string, RateLimiter>();
  private readonly retryDelays = [1000, 2000, 4000, 8000, 16000];
  
  private readonly onRequestEmitter = new Emitter<{ provider: LLMProviderType; model: string }>();
  private readonly onResponseEmitter = new Emitter<{ provider: LLMProviderType; tokens: number; latency: number }>();
  private readonly onErrorEmitter = new Emitter<{ provider: LLMProviderType; error: Error }>();
  private readonly onStreamChunkEmitter = new Emitter<{ provider: LLMProviderType; chunk: string }>();

  readonly onRequest: Event<{ provider: LLMProviderType; model: string }> = this.onRequestEmitter.event;
  readonly onResponse: Event<{ provider: LLMProviderType; tokens: number; latency: number }> = this.onResponseEmitter.event;
  readonly onError: Event<{ provider: LLMProviderType; error: Error }> = this.onErrorEmitter.event;
  readonly onStreamChunk: Event<{ provider: LLMProviderType; chunk: string }> = this.onStreamChunkEmitter.event;

  // Provider endpoint configurations
  private readonly providerEndpoints: Record<LLMProviderType, string> = {
    'openai': 'https://api.openai.com/v1',
    'anthropic': 'https://api.anthropic.com/v1',
    'google': 'https://generativelanguage.googleapis.com/v1beta',
    'mistral': 'https://api.mistral.ai/v1',
    'cohere': 'https://api.cohere.ai/v1',
    'groq': 'https://api.groq.com/openai/v1',
    'together': 'https://api.together.xyz/v1',
    'fireworks': 'https://api.fireworks.ai/inference/v1',
    'azure-openai': '', // Requires custom baseUrl
    'ollama': 'http://localhost:11434/v1',
    'local': 'http://localhost:8080/v1',
  };

  /**
   * Register API configuration for a provider
   */
  registerProvider(config: LLMAPIConfig): void {
    this.configs.set(config.provider, {
      ...config,
      baseUrl: config.baseUrl || this.providerEndpoints[config.provider],
      timeout: config.timeout || 60000,
      maxRetries: config.maxRetries || 3,
    });

    // Initialize rate limiter for this provider
    this.rateLimiters.set(config.provider, new RateLimiter({
      requestsPerMinute: this.getProviderRateLimit(config.provider),
      tokensPerMinute: this.getProviderTokenLimit(config.provider),
    }));
  }

  /**
   * Get registered provider configuration
   */
  getProviderConfig(provider: LLMProviderType): LLMAPIConfig | undefined {
    return this.configs.get(provider);
  }

  /**
   * Check if provider is configured
   */
  isProviderConfigured(provider: LLMProviderType): boolean {
    return this.configs.has(provider);
  }

  /**
   * Chat completion - non-streaming
   */
  async chatCompletion(
    provider: LLMProviderType,
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    const config = this.getConfigOrThrow(provider);
    const startTime = Date.now();

    this.onRequestEmitter.fire({ provider, model: request.model });

    // Check rate limit
    const rateLimiter = this.rateLimiters.get(provider);
    if (rateLimiter) {
      await rateLimiter.waitForCapacity(request.messages);
    }

    let lastError: Error | undefined;
    const maxRetries = config.maxRetries || 3;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.executeRequest(provider, config, request);
        const latency = Date.now() - startTime;
        
        this.onResponseEmitter.fire({
          provider,
          tokens: response.usage.total_tokens,
          latency,
        });

        // Update rate limiter with actual usage
        if (rateLimiter) {
          rateLimiter.recordUsage(response.usage.total_tokens);
        }

        return response;
      } catch (error) {
        lastError = error as Error;
        
        if (!this.isRetryableError(error as Error) || attempt === maxRetries) {
          this.onErrorEmitter.fire({ provider, error: lastError });
          throw lastError;
        }

        // Exponential backoff
        await this.delay(this.retryDelays[Math.min(attempt, this.retryDelays.length - 1)]);
      }
    }

    throw lastError;
  }

  /**
   * Chat completion - streaming
   */
  async *chatCompletionStream(
    provider: LLMProviderType,
    request: ChatCompletionRequest
  ): AsyncGenerator<ChatCompletionChunk, void, unknown> {
    const config = this.getConfigOrThrow(provider);
    
    this.onRequestEmitter.fire({ provider, model: request.model });

    const rateLimiter = this.rateLimiters.get(provider);
    if (rateLimiter) {
      await rateLimiter.waitForCapacity(request.messages);
    }

    const streamRequest = { ...request, stream: true };
    
    try {
      const response = await this.executeStreamRequest(provider, config, streamRequest);
      
      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content;
        const chunkText = typeof content === 'string' ? content : '';
        this.onStreamChunkEmitter.fire({ 
          provider, 
          chunk: chunkText
        });
        yield chunk;
      }
    } catch (error) {
      this.onErrorEmitter.fire({ provider, error: error as Error });
      throw error;
    }
  }

  /**
   * Execute HTTP request to provider API
   */
  private async executeRequest(
    provider: LLMProviderType,
    config: LLMAPIConfig,
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    const { url, headers, body } = this.prepareRequest(provider, config, request);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(config.timeout || 60000),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw this.createAPIError(provider, response.status, errorBody);
    }

    return response.json();
  }

  /**
   * Execute streaming request
   */
  private async *executeStreamRequest(
    provider: LLMProviderType,
    config: LLMAPIConfig,
    request: ChatCompletionRequest
  ): AsyncGenerator<ChatCompletionChunk, void, unknown> {
    const { url, headers, body } = this.prepareRequest(provider, config, request);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(config.timeout || 60000),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw this.createAPIError(provider, response.status, errorBody);
    }

    if (!response.body) {
      throw new LLMAPIError('No response body for stream', 500, 'NO_BODY', provider);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          
          try {
            const chunk = JSON.parse(data) as ChatCompletionChunk;
            yield chunk;
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }
  }

  /**
   * Prepare request based on provider format
   */
  private prepareRequest(
    provider: LLMProviderType,
    config: LLMAPIConfig,
    request: ChatCompletionRequest
  ): { url: string; headers: Record<string, string>; body: unknown } {
    const baseUrl = config.baseUrl || this.providerEndpoints[provider];

    switch (provider) {
      case 'anthropic':
        return this.prepareAnthropicRequest(baseUrl, config, request);
      case 'google':
        return this.prepareGoogleRequest(baseUrl, config, request);
      case 'cohere':
        return this.prepareCohereRequest(baseUrl, config, request);
      default:
        // OpenAI-compatible format (works for most providers)
        return this.prepareOpenAIRequest(baseUrl, config, request);
    }
  }

  /**
   * OpenAI-compatible request format
   */
  private prepareOpenAIRequest(
    baseUrl: string,
    config: LLMAPIConfig,
    request: ChatCompletionRequest
  ): { url: string; headers: Record<string, string>; body: unknown } {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      ...config.headers,
    };

    if (config.organization) {
      headers['OpenAI-Organization'] = config.organization;
    }

    return {
      url: `${baseUrl}/chat/completions`,
      headers,
      body: request,
    };
  }

  /**
   * Anthropic request format (Claude)
   */
  private prepareAnthropicRequest(
    baseUrl: string,
    config: LLMAPIConfig,
    request: ChatCompletionRequest
  ): { url: string; headers: Record<string, string>; body: unknown } {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      ...config.headers,
    };

    // Convert OpenAI format to Anthropic format
    const systemMessage = request.messages.find(m => m.role === 'system');
    const nonSystemMessages = request.messages.filter(m => m.role !== 'system');

    const body = {
      model: request.model,
      max_tokens: request.max_tokens || 4096,
      messages: nonSystemMessages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: typeof m.content === 'string' ? m.content : this.convertContentParts(m.content as ContentPart[]),
      })),
      system: systemMessage?.content,
      temperature: request.temperature,
      top_p: request.top_p,
      stop_sequences: request.stop ? (Array.isArray(request.stop) ? request.stop : [request.stop]) : undefined,
      stream: request.stream,
      tools: request.tools?.map(t => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters,
      })),
    };

    return {
      url: `${baseUrl}/messages`,
      headers,
      body,
    };
  }

  /**
   * Google Gemini request format
   */
  private prepareGoogleRequest(
    baseUrl: string,
    config: LLMAPIConfig,
    request: ChatCompletionRequest
  ): { url: string; headers: Record<string, string>; body: unknown } {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.headers,
    };

    // Convert OpenAI format to Gemini format
    const systemInstruction = request.messages.find(m => m.role === 'system');
    const contents = request.messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: typeof m.content === 'string' 
          ? [{ text: m.content }]
          : (m.content as ContentPart[]).map(p => 
              p.type === 'text' ? { text: p.text } : { inlineData: p.image_url }
            ),
      }));

    const body = {
      contents,
      systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction.content }] } : undefined,
      generationConfig: {
        temperature: request.temperature,
        topP: request.top_p,
        maxOutputTokens: request.max_tokens,
        stopSequences: request.stop ? (Array.isArray(request.stop) ? request.stop : [request.stop]) : undefined,
      },
    };

    const modelName = request.model.startsWith('gemini') ? request.model : `gemini-${request.model}`;
    const action = request.stream ? 'streamGenerateContent' : 'generateContent';

    return {
      url: `${baseUrl}/models/${modelName}:${action}?key=${config.apiKey}`,
      headers,
      body,
    };
  }

  /**
   * Cohere request format
   */
  private prepareCohereRequest(
    baseUrl: string,
    config: LLMAPIConfig,
    request: ChatCompletionRequest
  ): { url: string; headers: Record<string, string>; body: unknown } {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      ...config.headers,
    };

    // Convert OpenAI format to Cohere format
    const systemMessage = request.messages.find(m => m.role === 'system');
    const chatHistory = request.messages
      .filter(m => m.role !== 'system')
      .slice(0, -1)
      .map(m => ({
        role: m.role.toUpperCase(),
        message: typeof m.content === 'string' ? m.content : '',
      }));
    
    const lastMessage = request.messages[request.messages.length - 1];

    const body = {
      model: request.model,
      message: typeof lastMessage.content === 'string' ? lastMessage.content : '',
      chat_history: chatHistory,
      preamble: systemMessage?.content,
      temperature: request.temperature,
      max_tokens: request.max_tokens,
      p: request.top_p,
      stop_sequences: request.stop ? (Array.isArray(request.stop) ? request.stop : [request.stop]) : undefined,
      stream: request.stream,
    };

    return {
      url: `${baseUrl}/chat`,
      headers,
      body,
    };
  }

  /**
   * Convert content parts to Anthropic format
   */
  private convertContentParts(parts: ContentPart[]): Array<{ type: string; text?: string; source?: unknown }> {
    return parts.map(p => {
      if (p.type === 'text') {
        return { type: 'text', text: p.text };
      }
      if (p.type === 'image_url' && p.image_url) {
        // Handle base64 or URL images
        if (p.image_url.url.startsWith('data:')) {
          const [meta, data] = p.image_url.url.split(',');
          const mediaType = meta.split(':')[1].split(';')[0];
          return {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data },
          };
        }
        return {
          type: 'image',
          source: { type: 'url', url: p.image_url.url },
        };
      }
      return { type: 'text', text: '' };
    });
  }

  /**
   * Create appropriate API error
   */
  private createAPIError(
    provider: LLMProviderType,
    status: number,
    body: string
  ): LLMAPIError {
    let message = 'Unknown API error';
    let code = 'UNKNOWN_ERROR';
    let retryable = false;

    try {
      const parsed = JSON.parse(body);
      message = parsed.error?.message || parsed.message || message;
      code = parsed.error?.code || parsed.code || code;
    } catch {
      message = body || message;
    }

    // Determine if retryable
    if (status === 429 || status >= 500) {
      retryable = true;
    }

    return new LLMAPIError(message, status, code, provider, retryable);
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    if (error instanceof LLMAPIError) {
      return error.retryable;
    }
    // Network errors are retryable
    if (error.name === 'TypeError' || error.message.includes('fetch')) {
      return true;
    }
    return false;
  }

  /**
   * Get config or throw error
   */
  private getConfigOrThrow(provider: LLMProviderType): LLMAPIConfig {
    const config = this.configs.get(provider);
    if (!config) {
      throw new LLMAPIError(
        `Provider ${provider} not configured. Call registerProvider first.`,
        500,
        'PROVIDER_NOT_CONFIGURED',
        provider
      );
    }
    return config;
  }

  /**
   * Get rate limit for provider
   */
  private getProviderRateLimit(provider: LLMProviderType): number {
    const limits: Record<LLMProviderType, number> = {
      'openai': 500,
      'anthropic': 300,
      'google': 60,
      'mistral': 200,
      'cohere': 100,
      'groq': 30,
      'together': 200,
      'fireworks': 200,
      'azure-openai': 300,
      'ollama': 1000,
      'local': 1000,
    };
    return limits[provider] || 100;
  }

  /**
   * Get token limit for provider
   */
  private getProviderTokenLimit(provider: LLMProviderType): number {
    const limits: Record<LLMProviderType, number> = {
      'openai': 90000,
      'anthropic': 80000,
      'google': 60000,
      'mistral': 60000,
      'cohere': 30000,
      'groq': 30000,
      'together': 60000,
      'fireworks': 60000,
      'azure-openai': 90000,
      'ollama': Infinity,
      'local': Infinity,
    };
    return limits[provider] || 30000;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Rate limiter implementation
 */
class RateLimiter {
  private requestCount = 0;
  private tokenCount = 0;
  private windowStart = Date.now();
  private queue: Array<() => void> = [];

  constructor(
    private readonly limits: {
      requestsPerMinute: number;
      tokensPerMinute: number;
    }
  ) {
    // Reset counts every minute
    setInterval(() => this.resetWindow(), 60000);
  }

  async waitForCapacity(messages: ChatMessage[]): Promise<void> {
    const estimatedTokens = this.estimateTokens(messages);

    // Check if we're over limits
    if (
      this.requestCount >= this.limits.requestsPerMinute ||
      this.tokenCount + estimatedTokens >= this.limits.tokensPerMinute
    ) {
      // Wait until next window
      const waitTime = 60000 - (Date.now() - this.windowStart);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    this.requestCount++;
    this.tokenCount += estimatedTokens;
  }

  recordUsage(tokens: number): void {
    // Adjust token count if actual usage differs from estimate
    this.tokenCount = Math.max(0, this.tokenCount - this.estimateTokens([]) + tokens);
  }

  private resetWindow(): void {
    this.requestCount = 0;
    this.tokenCount = 0;
    this.windowStart = Date.now();
    
    // Process queued requests
    while (this.queue.length > 0) {
      const callback = this.queue.shift();
      callback?.();
    }
  }

  private estimateTokens(messages: ChatMessage[]): number {
    // Rough estimate: ~4 chars per token
    let total = 0;
    for (const msg of messages) {
      if (typeof msg.content === 'string') {
        total += Math.ceil(msg.content.length / 4);
      } else if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part.type === 'text' && part.text) {
            total += Math.ceil(part.text.length / 4);
          }
        }
      }
    }
    return total || 100; // Minimum estimate
  }
}

/**
 * Embeddings API
 */
@injectable()
export class EmbeddingsAPIClient {
  private configs = new Map<LLMProviderType, LLMAPIConfig>();

  registerProvider(config: LLMAPIConfig): void {
    this.configs.set(config.provider, config);
  }

  async createEmbedding(
    provider: LLMProviderType,
    model: string,
    input: string | string[]
  ): Promise<{ embedding: number[]; index: number }[]> {
    const config = this.configs.get(provider);
    if (!config) {
      throw new Error(`Provider ${provider} not configured`);
    }

    const inputs = Array.isArray(input) ? input : [input];
    
    switch (provider) {
      case 'openai':
      case 'azure-openai':
        return this.openAIEmbeddings(config, model, inputs);
      case 'cohere':
        return this.cohereEmbeddings(config, model, inputs);
      default:
        // Try OpenAI-compatible endpoint
        return this.openAIEmbeddings(config, model, inputs);
    }
  }

  private async openAIEmbeddings(
    config: LLMAPIConfig,
    model: string,
    inputs: string[]
  ): Promise<{ embedding: number[]; index: number }[]> {
    const response = await fetch(`${config.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: inputs,
      }),
    });

    if (!response.ok) {
      throw new Error(`Embeddings API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }

  private async cohereEmbeddings(
    config: LLMAPIConfig,
    model: string,
    inputs: string[]
  ): Promise<{ embedding: number[]; index: number }[]> {
    const response = await fetch(`${config.baseUrl}/embed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        texts: inputs,
        input_type: 'search_document',
      }),
    });

    if (!response.ok) {
      throw new Error(`Embeddings API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.embeddings.map((embedding: number[], index: number) => ({
      embedding,
      index,
    }));
  }
}

export { RateLimiter };
