/**
 * Advanced AI Provider System
 * 
 * Sistema avançado de provedores de IA com:
 * - Function calling / Tool use
 * - Streaming responses
 * - Context management
 * - Rate limiting
 * - Cost tracking
 * - Embeddings
 * - Vision capabilities
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

export type Provider = 'openai' | 'anthropic' | 'google' | 'groq' | 'ollama';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface ToolResult {
  toolCallId: string;
  result: any;
  error?: string;
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  images?: ImageInput[];
}

export interface ImageInput {
  type: 'base64' | 'url';
  data: string;
  mediaType?: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
}

export interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  tools?: ToolDefinition[];
  toolChoice?: 'auto' | 'required' | 'none' | { type: 'function'; function: { name: string } };
  responseFormat?: { type: 'text' | 'json_object' };
}

export interface CompletionResponse {
  content: string;
  toolCalls?: ToolCall[];
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter';
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: Provider;
  latencyMs: number;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  dimensions: number;
  tokensUsed: number;
}

// ============================================================================
// PRICING & LIMITS
// ============================================================================

const MODEL_INFO: Record<string, {
  provider: Provider;
  contextWindow: number;
  maxOutput: number;
  inputCost: number;  // per 1M tokens
  outputCost: number; // per 1M tokens
  supportsVision?: boolean;
  supportsTools?: boolean;
  supportsJson?: boolean;
}> = {
  // OpenAI
  'gpt-4o': { provider: 'openai', contextWindow: 128000, maxOutput: 16384, inputCost: 2.50, outputCost: 10.00, supportsVision: true, supportsTools: true, supportsJson: true },
  'gpt-4o-mini': { provider: 'openai', contextWindow: 128000, maxOutput: 16384, inputCost: 0.15, outputCost: 0.60, supportsVision: true, supportsTools: true, supportsJson: true },
  'gpt-4-turbo': { provider: 'openai', contextWindow: 128000, maxOutput: 4096, inputCost: 10.00, outputCost: 30.00, supportsVision: true, supportsTools: true, supportsJson: true },
  'o1-preview': { provider: 'openai', contextWindow: 128000, maxOutput: 32768, inputCost: 15.00, outputCost: 60.00, supportsTools: false },
  'o1-mini': { provider: 'openai', contextWindow: 128000, maxOutput: 65536, inputCost: 3.00, outputCost: 12.00, supportsTools: false },
  
  // Anthropic
  'claude-3-5-sonnet-20241022': { provider: 'anthropic', contextWindow: 200000, maxOutput: 8192, inputCost: 3.00, outputCost: 15.00, supportsVision: true, supportsTools: true },
  'claude-3-5-haiku-20241022': { provider: 'anthropic', contextWindow: 200000, maxOutput: 8192, inputCost: 0.80, outputCost: 4.00, supportsVision: true, supportsTools: true },
  'claude-3-opus-20240229': { provider: 'anthropic', contextWindow: 200000, maxOutput: 4096, inputCost: 15.00, outputCost: 75.00, supportsVision: true, supportsTools: true },
  
  // Google
  'gemini-1.5-pro': { provider: 'google', contextWindow: 2000000, maxOutput: 8192, inputCost: 1.25, outputCost: 5.00, supportsVision: true, supportsTools: true, supportsJson: true },
  'gemini-1.5-flash': { provider: 'google', contextWindow: 1000000, maxOutput: 8192, inputCost: 0.075, outputCost: 0.30, supportsVision: true, supportsTools: true, supportsJson: true },
  'gemini-2.0-flash-exp': { provider: 'google', contextWindow: 1000000, maxOutput: 8192, inputCost: 0.10, outputCost: 0.40, supportsVision: true, supportsTools: true, supportsJson: true },
};

// ============================================================================
// ADVANCED AI PROVIDER
// ============================================================================

export class AdvancedAIProvider extends EventEmitter {
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;
  private google: GoogleGenerativeAI | null = null;
  
  private totalCost = 0;
  private requestCount = 0;
  private tokenCount = 0;
  
  // Rate limiting
  private requestTimestamps: number[] = [];
  private readonly MAX_REQUESTS_PER_MINUTE = 60;

  constructor() {
    super();
    this.initializeClients();
  }

  private initializeClients(): void {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
    
    if (process.env.GOOGLE_API_KEY) {
      this.google = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    }
  }

  /**
   * Get available models based on configured API keys
   */
  getAvailableModels(): string[] {
    const models: string[] = [];
    
    if (this.openai) {
      models.push('gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1-mini');
    }
    
    if (this.anthropic) {
      models.push('claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022');
    }
    
    if (this.google) {
      models.push('gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash-exp');
    }
    
    return models;
  }

  /**
   * Get model information
   */
  getModelInfo(model: string) {
    return MODEL_INFO[model];
  }

  /**
   * Check rate limiting
   */
  private checkRateLimit(): void {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    this.requestTimestamps = this.requestTimestamps.filter(t => t > oneMinuteAgo);
    
    if (this.requestTimestamps.length >= this.MAX_REQUESTS_PER_MINUTE) {
      throw new Error('Rate limit exceeded. Please wait before making more requests.');
    }
    
    this.requestTimestamps.push(now);
  }

  /**
   * Track usage and cost
   */
  private trackUsage(model: string, promptTokens: number, completionTokens: number): void {
    const info = MODEL_INFO[model];
    if (info) {
      const inputCost = (promptTokens / 1_000_000) * info.inputCost;
      const outputCost = (completionTokens / 1_000_000) * info.outputCost;
      const cost = inputCost + outputCost;
      
      this.totalCost += cost;
      this.tokenCount += promptTokens + completionTokens;
      this.requestCount++;
      
      this.emit('usage', {
        model,
        promptTokens,
        completionTokens,
        cost,
        totalCost: this.totalCost,
        totalTokens: this.tokenCount,
        totalRequests: this.requestCount,
      });
    }
  }

  /**
   * Main completion method
   */
  async complete(
    messages: Message[],
    options: CompletionOptions = {}
  ): Promise<CompletionResponse> {
    this.checkRateLimit();
    
    const startTime = Date.now();
    const model = options.model || this.selectDefaultModel();
    const info = MODEL_INFO[model];
    
    if (!info) {
      throw new Error(`Unknown model: ${model}`);
    }
    
    let response: CompletionResponse;
    
    switch (info.provider) {
      case 'openai':
        response = await this.completeOpenAI(messages, { ...options, model });
        break;
      case 'anthropic':
        response = await this.completeAnthropic(messages, { ...options, model });
        break;
      case 'google':
        response = await this.completeGoogle(messages, { ...options, model });
        break;
      default:
        throw new Error(`Provider not supported: ${info.provider}`);
    }
    
    response.latencyMs = Date.now() - startTime;
    this.trackUsage(model, response.usage.promptTokens, response.usage.completionTokens);
    
    return response;
  }

  /**
   * Streaming completion
   */
  async *stream(
    messages: Message[],
    options: CompletionOptions = {}
  ): AsyncGenerator<{ content?: string; toolCall?: ToolCall }, void, unknown> {
    this.checkRateLimit();
    
    const model = options.model || this.selectDefaultModel();
    const info = MODEL_INFO[model];
    
    if (!info) {
      throw new Error(`Unknown model: ${model}`);
    }
    
    switch (info.provider) {
      case 'openai':
        yield* this.streamOpenAI(messages, { ...options, model });
        break;
      case 'anthropic':
        yield* this.streamAnthropic(messages, { ...options, model });
        break;
      case 'google':
        yield* this.streamGoogle(messages, { ...options, model });
        break;
    }
  }

  /**
   * OpenAI completion
   */
  private async completeOpenAI(
    messages: Message[],
    options: CompletionOptions
  ): Promise<CompletionResponse> {
    if (!this.openai) throw new Error('OpenAI not configured');
    
    const openaiMessages = this.convertToOpenAI(messages);
    const tools = options.tools?.map(t => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));
    
    const response = await this.openai.chat.completions.create({
      model: options.model!,
      messages: openaiMessages,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      top_p: options.topP,
      frequency_penalty: options.frequencyPenalty,
      presence_penalty: options.presencePenalty,
      stop: options.stop,
      tools: tools?.length ? tools : undefined,
      tool_choice: options.toolChoice as any,
      response_format: options.responseFormat,
    });
    
    const choice = response.choices[0];
    const toolCalls = choice.message.tool_calls?.map(tc => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments),
    }));
    
    return {
      content: choice.message.content || '',
      toolCalls,
      finishReason: choice.finish_reason as any,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
      model: response.model,
      provider: 'openai',
      latencyMs: 0,
    };
  }

  /**
   * OpenAI streaming
   */
  private async *streamOpenAI(
    messages: Message[],
    options: CompletionOptions
  ): AsyncGenerator<{ content?: string; toolCall?: ToolCall }, void, unknown> {
    if (!this.openai) throw new Error('OpenAI not configured');
    
    const openaiMessages = this.convertToOpenAI(messages);
    
    const stream = await this.openai.chat.completions.create({
      model: options.model!,
      messages: openaiMessages,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      stream: true,
    });
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield { content };
      }
    }
  }

  /**
   * Anthropic completion
   */
  private async completeAnthropic(
    messages: Message[],
    options: CompletionOptions
  ): Promise<CompletionResponse> {
    if (!this.anthropic) throw new Error('Anthropic not configured');
    
    const { system, messages: anthropicMessages } = this.convertToAnthropic(messages);
    const tools = options.tools?.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters,
    }));
    
    const response = await this.anthropic.messages.create({
      model: options.model!,
      system,
      messages: anthropicMessages,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature,
      stop_sequences: options.stop,
      tools: tools?.length ? tools : undefined,
    });
    
    const textContent = response.content.find(c => c.type === 'text');
    const toolUseContent = response.content.filter(c => c.type === 'tool_use');
    
    const toolCalls = toolUseContent.map(tc => ({
      id: tc.type === 'tool_use' ? tc.id : '',
      name: tc.type === 'tool_use' ? tc.name : '',
      arguments: tc.type === 'tool_use' ? tc.input as Record<string, any> : {},
    }));
    
    return {
      content: textContent?.type === 'text' ? textContent.text : '',
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      finishReason: response.stop_reason as any || 'stop',
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      model: options.model!,
      provider: 'anthropic',
      latencyMs: 0,
    };
  }

  /**
   * Anthropic streaming
   */
  private async *streamAnthropic(
    messages: Message[],
    options: CompletionOptions
  ): AsyncGenerator<{ content?: string; toolCall?: ToolCall }, void, unknown> {
    if (!this.anthropic) throw new Error('Anthropic not configured');
    
    const { system, messages: anthropicMessages } = this.convertToAnthropic(messages);
    
    const stream = await this.anthropic.messages.stream({
      model: options.model!,
      system,
      messages: anthropicMessages,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature,
    });
    
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield { content: event.delta.text };
      }
    }
  }

  /**
   * Google completion
   */
  private async completeGoogle(
    messages: Message[],
    options: CompletionOptions
  ): Promise<CompletionResponse> {
    if (!this.google) throw new Error('Google not configured');
    
    const model = this.google.getGenerativeModel({ model: options.model! });
    const { systemInstruction, contents } = this.convertToGoogle(messages);
    
    const result = await model.generateContent({
      systemInstruction,
      contents,
      generationConfig: {
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens,
        topP: options.topP,
        stopSequences: options.stop,
      },
    });
    
    const response = result.response;
    
    return {
      content: response.text(),
      finishReason: 'stop',
      usage: {
        promptTokens: 0, // Gemini doesn't return this in simple API
        completionTokens: 0,
        totalTokens: 0,
      },
      model: options.model!,
      provider: 'google',
      latencyMs: 0,
    };
  }

  /**
   * Google streaming
   */
  private async *streamGoogle(
    messages: Message[],
    options: CompletionOptions
  ): AsyncGenerator<{ content?: string; toolCall?: ToolCall }, void, unknown> {
    if (!this.google) throw new Error('Google not configured');
    
    const model = this.google.getGenerativeModel({ model: options.model! });
    const { systemInstruction, contents } = this.convertToGoogle(messages);
    
    const result = await model.generateContentStream({
      systemInstruction,
      contents,
      generationConfig: {
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens,
      },
    });
    
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield { content: text };
      }
    }
  }

  /**
   * Generate embeddings
   */
  async embed(
    text: string | string[],
    options: { model?: string } = {}
  ): Promise<EmbeddingResponse | EmbeddingResponse[]> {
    const model = options.model || 'text-embedding-3-small';
    const texts = Array.isArray(text) ? text : [text];
    
    if (!this.openai) {
      throw new Error('OpenAI required for embeddings');
    }
    
    const response = await this.openai.embeddings.create({
      model,
      input: texts,
    });
    
    const results = response.data.map((d, i) => ({
      embedding: d.embedding,
      model,
      dimensions: d.embedding.length,
      tokensUsed: response.usage.total_tokens / texts.length,
    }));
    
    return Array.isArray(text) ? results : results[0];
  }

  /**
   * Convert messages to OpenAI format
   */
  private convertToOpenAI(messages: Message[]): OpenAI.ChatCompletionMessageParam[] {
    const result: OpenAI.ChatCompletionMessageParam[] = [];
    
    for (const m of messages) {
      if (m.role === 'tool') {
        result.push({
          role: 'tool',
          content: m.content,
          tool_call_id: m.toolCallId!,
        });
      } else if (m.role === 'user' && m.images && m.images.length > 0) {
        result.push({
          role: 'user',
          content: [
            { type: 'text', text: m.content },
            ...m.images.map(img => ({
              type: 'image_url' as const,
              image_url: {
                url: img.type === 'base64' 
                  ? `data:${img.mediaType || 'image/jpeg'};base64,${img.data}`
                  : img.data,
              },
            })),
          ],
        });
      } else if (m.role === 'system') {
        result.push({
          role: 'system',
          content: m.content,
        });
      } else if (m.role === 'assistant') {
        result.push({
          role: 'assistant',
          content: m.content,
        });
      } else {
        result.push({
          role: 'user',
          content: m.content,
        });
      }
    }
    
    return result;
  }

  /**
   * Convert messages to Anthropic format
   */
  private convertToAnthropic(messages: Message[]): {
    system: string;
    messages: Anthropic.MessageParam[];
  } {
    const systemMessage = messages.find(m => m.role === 'system');
    const otherMessages = messages.filter(m => m.role !== 'system');
    
    return {
      system: systemMessage?.content || '',
      messages: otherMessages.map(m => {
        if (m.role === 'tool') {
          return {
            role: 'user' as const,
            content: [{
              type: 'tool_result' as const,
              tool_use_id: m.toolCallId!,
              content: m.content,
            }],
          };
        }
        
        if (m.images && m.images.length > 0) {
          return {
            role: m.role as 'user' | 'assistant',
            content: [
              { type: 'text' as const, text: m.content },
              ...m.images.map(img => ({
                type: 'image' as const,
                source: {
                  type: 'base64' as const,
                  media_type: img.mediaType || 'image/jpeg',
                  data: img.data,
                },
              })),
            ],
          };
        }
        
        return {
          role: m.role as 'user' | 'assistant',
          content: m.content,
        };
      }),
    };
  }

  /**
   * Convert messages to Google format
   */
  private convertToGoogle(messages: Message[]): {
    systemInstruction: string;
    contents: any[];
  } {
    const systemMessage = messages.find(m => m.role === 'system');
    const otherMessages = messages.filter(m => m.role !== 'system');
    
    return {
      systemInstruction: systemMessage?.content || '',
      contents: otherMessages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: m.images?.length
          ? [
              { text: m.content },
              ...m.images.map(img => ({
                inlineData: {
                  mimeType: img.mediaType || 'image/jpeg',
                  data: img.data,
                },
              })),
            ]
          : [{ text: m.content }],
      })),
    };
  }

  /**
   * Select default model based on available providers
   */
  private selectDefaultModel(): string {
    if (this.google) return 'gemini-1.5-flash';
    if (this.openai) return 'gpt-4o-mini';
    if (this.anthropic) return 'claude-3-5-haiku-20241022';
    throw new Error('No AI provider configured');
  }

  /**
   * Get usage statistics
   */
  getUsageStats() {
    return {
      totalCost: this.totalCost,
      totalTokens: this.tokenCount,
      totalRequests: this.requestCount,
    };
  }

  /**
   * Reset usage statistics
   */
  resetUsageStats(): void {
    this.totalCost = 0;
    this.tokenCount = 0;
    this.requestCount = 0;
  }
}

// Export singleton
export const advancedAI = new AdvancedAIProvider();
export default advancedAI;
