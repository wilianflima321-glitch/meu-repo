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
import { OPENROUTER_MODELS } from './openrouter-models';
import { convertToAnthropic, convertToGoogle, convertToOpenAI } from './advanced-ai-provider-adapters';
import { completeOpenAICompatible } from './advanced-ai-provider-openai-compatible';
import { initializeAdvancedAIClients, selectDefaultAdvancedAIModel } from './advanced-ai-provider-registry';

import type {
  CompletionOptions,
  CompletionResponse,
  EmbeddingResponse,
  Message,
  Provider,
  ToolCall,
} from './advanced-ai-provider-contracts';
import { MODEL_INFO } from './advanced-ai-provider-model-info';

export type {
  CompletionOptions,
  CompletionResponse,
  EmbeddingResponse,
  ImageInput,
  Message,
  Provider,
  ToolCall,
  ToolDefinition,
  ToolResult,
} from './advanced-ai-provider-contracts';
import { normalizeFinishReason, parseToolArguments, readToolArguments } from './advanced-ai-provider-normalizers';

// ============================================================================
// ADVANCED AI PROVIDER
// ============================================================================

export class AdvancedAIProvider extends EventEmitter {
  private openai: OpenAI | null = null;
  private openrouter: OpenAI | null = null;
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
    const clients = initializeAdvancedAIClients();
    this.openai = clients.openai;
    this.openrouter = clients.openrouter;
    this.anthropic = clients.anthropic;
    this.google = clients.google;
  }


  /**
   * Get available models based on configured API keys
   */
  getAvailableModels(): string[] {
    const models: string[] = [];

    if (this.openai) {
      models.push('gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1-mini');
    }

    if (this.openrouter) {
      models.push(...OPENROUTER_MODELS.map((model) => model.id));
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
        response = await completeOpenAICompatible(this.openai, 'openai', messages, { ...options, model });
        break;
      case 'openrouter':
        response = await completeOpenAICompatible(this.openrouter, 'openrouter', messages, { ...options, model });
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
      case 'openrouter':
        yield* this.streamOpenRouter(messages, { ...options, model });
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
   * OpenAI streaming
   */
  private async *streamOpenAI(
    messages: Message[],
    options: CompletionOptions
  ): AsyncGenerator<{ content?: string; toolCall?: ToolCall }, void, unknown> {
    if (!this.openai) throw new Error('OpenAI not configured');

    const openaiMessages = convertToOpenAI(messages);

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
   * OpenRouter streaming via OpenAI-compatible API
   */
  private async *streamOpenRouter(
    messages: Message[],
    options: CompletionOptions
  ): AsyncGenerator<{ content?: string; toolCall?: ToolCall }, void, unknown> {
    if (!this.openrouter) throw new Error('OpenRouter not configured');

    const openaiMessages = convertToOpenAI(messages);

    const stream = await this.openrouter.chat.completions.create({
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

    const { system, messages: anthropicMessages } = convertToAnthropic(messages);
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
      arguments: tc.type === 'tool_use' ? readToolArguments(tc.input) : {},
    }));

    return {
      content: textContent?.type === 'text' ? textContent.text : '',
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      finishReason: normalizeFinishReason(response.stop_reason),
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

    const { system, messages: anthropicMessages } = convertToAnthropic(messages);

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
    const { systemInstruction, contents } = convertToGoogle(messages);

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
    const { systemInstruction, contents } = convertToGoogle(messages);

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
   * Select default model based on available providers
   */
  private selectDefaultModel(): string {
    return selectDefaultAdvancedAIModel({
      openai: this.openai,
      openrouter: this.openrouter,
      anthropic: this.anthropic,
      google: this.google,
    });
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
