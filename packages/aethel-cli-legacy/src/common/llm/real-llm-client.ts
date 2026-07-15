/**
 * ═══════════════════════════════════════════════════════════════
 * REAL LLM CLIENT - CLIENTE QUE REALMENTE FUNCIONA
 * ═══════════════════════════════════════════════════════════════
 * 
 * Este cliente conecta com APIs reais de LLM:
 * - OpenAI (GPT-4, GPT-3.5)
 * - Anthropic (Claude 3.5, Claude 3)
 * - Google (Gemini Pro, Gemini Flash)
 * - Groq (Llama, Mixtral)
 * - DeepSeek (DeepSeek Coder)
 * 
 * DIFERENTE DOS MOCKS: Este código FUNCIONA de verdade!
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { EventEmitter } from 'events';

// ═══════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════

export type LLMProvider = 'openai' | 'anthropic' | 'google' | 'groq' | 'deepseek';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionResult {
  content: string;
  model: string;
  provider: LLMProvider;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: number; // em USD
  latencyMs: number;
}

export interface StreamChunk {
  content: string;
  done: boolean;
}

// ═══════════════════════════════════════════════════════════════
// PREÇOS POR MILHÃO DE TOKENS (Dezembro 2024)
// ═══════════════════════════════════════════════════════════════

const PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  
  // Anthropic
  'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
  'claude-3-5-haiku-20241022': { input: 0.80, output: 4.00 },
  'claude-3-opus-20240229': { input: 15.00, output: 75.00 },
  
  // Google
  'gemini-1.5-pro': { input: 1.25, output: 5.00 },
  'gemini-1.5-flash': { input: 0.075, output: 0.30 },
  'gemini-2.0-flash-exp': { input: 0, output: 0 }, // Free during preview
  
  // Groq (muito barato!)
  'llama-3.3-70b-versatile': { input: 0.59, output: 0.79 },
  'llama-3.1-8b-instant': { input: 0.05, output: 0.08 },
  'mixtral-8x7b-32768': { input: 0.24, output: 0.24 },
  
  // DeepSeek
  'deepseek-chat': { input: 0.14, output: 0.28 },
  'deepseek-coder': { input: 0.14, output: 0.28 },
};

// ═══════════════════════════════════════════════════════════════
// REAL LLM CLIENT
// ═══════════════════════════════════════════════════════════════

export class RealLLMClient extends EventEmitter {
  private openai?: OpenAI;
  private anthropic?: Anthropic;
  private google?: GoogleGenerativeAI;
  private groq?: Groq;
  
  private totalCost = 0;
  private totalTokens = 0;
  private requestCount = 0;
  
  constructor() {
    super();
    this.initializeClients();
  }
  
  /**
   * Inicializa os clientes de cada provider
   */
  private initializeClients(): void {
    // OpenAI
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      console.log('✅ OpenAI client initialized');
    }
    
    // Anthropic
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      console.log('✅ Anthropic client initialized');
    }
    
    // Google
    if (process.env.GOOGLE_API_KEY) {
      this.google = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
      console.log('✅ Google Gemini client initialized');
    }
    
    // Groq
    if (process.env.GROQ_API_KEY) {
      this.groq = new Groq({
        apiKey: process.env.GROQ_API_KEY,
      });
      console.log('✅ Groq client initialized');
    }
  }
  
  /**
   * Verifica quais providers estão disponíveis
   */
  getAvailableProviders(): LLMProvider[] {
    const providers: LLMProvider[] = [];
    if (this.openai) providers.push('openai');
    if (this.anthropic) providers.push('anthropic');
    if (this.google) providers.push('google');
    if (this.groq) providers.push('groq');
    return providers;
  }
  
  /**
   * Completion principal - funciona de verdade!
   */
  async complete(
    messages: Message[],
    config: LLMConfig
  ): Promise<CompletionResult> {
    const startTime = Date.now();
    
    try {
      let result: CompletionResult;
      
      switch (config.provider) {
        case 'openai':
          result = await this.completeOpenAI(messages, config);
          break;
        case 'anthropic':
          result = await this.completeAnthropic(messages, config);
          break;
        case 'google':
          result = await this.completeGoogle(messages, config);
          break;
        case 'groq':
          result = await this.completeGroq(messages, config);
          break;
        case 'deepseek':
          result = await this.completeDeepSeek(messages, config);
          break;
        default:
          throw new Error(`Unknown provider: ${config.provider}`);
      }
      
      result.latencyMs = Date.now() - startTime;
      
      // Atualizar métricas
      this.totalCost += result.cost;
      this.totalTokens += result.usage.totalTokens;
      this.requestCount++;
      
      this.emit('completion', result);
      
      return result;
    } catch (error) {
      this.emit('error', { provider: config.provider, error });
      throw error;
    }
  }
  
  /**
   * OpenAI Completion
   */
  private async completeOpenAI(
    messages: Message[],
    config: LLMConfig
  ): Promise<CompletionResult> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized. Set OPENAI_API_KEY');
    }
    
    const response = await this.openai.chat.completions.create({
      model: config.model || 'gpt-4o-mini',
      messages: messages.map(m => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      })),
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens ?? 4096,
    });
    
    const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    const pricing = PRICING[config.model] || PRICING['gpt-4o-mini'];
    const cost = (usage.prompt_tokens * pricing.input + usage.completion_tokens * pricing.output) / 1_000_000;
    
    return {
      content: response.choices[0]?.message?.content || '',
      model: response.model,
      provider: 'openai',
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      },
      cost,
      latencyMs: 0,
    };
  }
  
  /**
   * Anthropic Completion
   */
  private async completeAnthropic(
    messages: Message[],
    config: LLMConfig
  ): Promise<CompletionResult> {
    if (!this.anthropic) {
      throw new Error('Anthropic client not initialized. Set ANTHROPIC_API_KEY');
    }
    
    // Separar system message das outras
    const systemMessage = messages.find(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system');
    
    const response = await this.anthropic.messages.create({
      model: config.model || 'claude-3-5-haiku-20241022',
      max_tokens: config.maxTokens ?? 4096,
      system: systemMessage?.content,
      messages: chatMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });
    
    const content = response.content[0].type === 'text' 
      ? response.content[0].text 
      : '';
    
    const pricing = PRICING[config.model] || PRICING['claude-3-5-haiku-20241022'];
    const cost = (response.usage.input_tokens * pricing.input + response.usage.output_tokens * pricing.output) / 1_000_000;
    
    return {
      content,
      model: response.model,
      provider: 'anthropic',
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      cost,
      latencyMs: 0,
    };
  }
  
  /**
   * Google Gemini Completion
   */
  private async completeGoogle(
    messages: Message[],
    config: LLMConfig
  ): Promise<CompletionResult> {
    if (!this.google) {
      throw new Error('Google client not initialized. Set GOOGLE_API_KEY');
    }
    
    const model = this.google.getGenerativeModel({ 
      model: config.model || 'gemini-1.5-flash' 
    });
    
    // Converter mensagens para formato Gemini
    const systemMessage = messages.find(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system');
    
    const chat = model.startChat({
      history: chatMessages.slice(0, -1).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      systemInstruction: systemMessage?.content,
    });
    
    const lastMessage = chatMessages[chatMessages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    const response = result.response;
    
    // Gemini não retorna contagem de tokens facilmente, estimamos
    const inputText = messages.map(m => m.content).join(' ');
    const outputText = response.text();
    const estimatedInputTokens = Math.ceil(inputText.length / 4);
    const estimatedOutputTokens = Math.ceil(outputText.length / 4);
    
    const pricing = PRICING[config.model] || PRICING['gemini-1.5-flash'];
    const cost = (estimatedInputTokens * pricing.input + estimatedOutputTokens * pricing.output) / 1_000_000;
    
    return {
      content: outputText,
      model: config.model || 'gemini-1.5-flash',
      provider: 'google',
      usage: {
        promptTokens: estimatedInputTokens,
        completionTokens: estimatedOutputTokens,
        totalTokens: estimatedInputTokens + estimatedOutputTokens,
      },
      cost,
      latencyMs: 0,
    };
  }
  
  /**
   * Groq Completion (muito rápido e barato!)
   */
  private async completeGroq(
    messages: Message[],
    config: LLMConfig
  ): Promise<CompletionResult> {
    if (!this.groq) {
      throw new Error('Groq client not initialized. Set GROQ_API_KEY');
    }
    
    const response = await this.groq.chat.completions.create({
      model: config.model || 'llama-3.3-70b-versatile',
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens ?? 4096,
    });
    
    const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    const pricing = PRICING[config.model] || PRICING['llama-3.3-70b-versatile'];
    const cost = (usage.prompt_tokens * pricing.input + usage.completion_tokens * pricing.output) / 1_000_000;
    
    return {
      content: response.choices[0]?.message?.content || '',
      model: response.model,
      provider: 'groq',
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      },
      cost,
      latencyMs: 0,
    };
  }
  
  /**
   * DeepSeek Completion (compatível com OpenAI API)
   */
  private async completeDeepSeek(
    messages: Message[],
    config: LLMConfig
  ): Promise<CompletionResult> {
    if (!process.env.DEEPSEEK_API_KEY) {
      throw new Error('DeepSeek not configured. Set DEEPSEEK_API_KEY');
    }
    
    // DeepSeek usa API compatível com OpenAI
    const deepseekClient = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com/v1',
    });
    
    const response = await deepseekClient.chat.completions.create({
      model: config.model || 'deepseek-chat',
      messages: messages.map(m => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      })),
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens ?? 4096,
    });
    
    const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    const pricing = PRICING[config.model] || PRICING['deepseek-chat'];
    const cost = (usage.prompt_tokens * pricing.input + usage.completion_tokens * pricing.output) / 1_000_000;
    
    return {
      content: response.choices[0]?.message?.content || '',
      model: response.model,
      provider: 'deepseek',
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      },
      cost,
      latencyMs: 0,
    };
  }
  
  /**
   * Streaming completion
   */
  async *stream(
    messages: Message[],
    config: LLMConfig
  ): AsyncGenerator<StreamChunk> {
    switch (config.provider) {
      case 'openai':
        yield* this.streamOpenAI(messages, config);
        break;
      case 'anthropic':
        yield* this.streamAnthropic(messages, config);
        break;
      case 'groq':
        yield* this.streamGroq(messages, config);
        break;
      default:
        // Fallback para não-streaming
        const result = await this.complete(messages, config);
        yield { content: result.content, done: true };
    }
  }
  
  private async *streamOpenAI(
    messages: Message[],
    config: LLMConfig
  ): AsyncGenerator<StreamChunk> {
    if (!this.openai) throw new Error('OpenAI not initialized');
    
    const stream = await this.openai.chat.completions.create({
      model: config.model || 'gpt-4o-mini',
      messages: messages.map(m => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      })),
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens ?? 4096,
      stream: true,
    });
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      const done = chunk.choices[0]?.finish_reason === 'stop';
      yield { content, done };
    }
  }
  
  private async *streamAnthropic(
    messages: Message[],
    config: LLMConfig
  ): AsyncGenerator<StreamChunk> {
    if (!this.anthropic) throw new Error('Anthropic not initialized');
    
    const systemMessage = messages.find(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system');
    
    const stream = this.anthropic.messages.stream({
      model: config.model || 'claude-3-5-haiku-20241022',
      max_tokens: config.maxTokens ?? 4096,
      system: systemMessage?.content,
      messages: chatMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });
    
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield { content: event.delta.text, done: false };
      }
      if (event.type === 'message_stop') {
        yield { content: '', done: true };
      }
    }
  }
  
  private async *streamGroq(
    messages: Message[],
    config: LLMConfig
  ): AsyncGenerator<StreamChunk> {
    if (!this.groq) throw new Error('Groq not initialized');
    
    const stream = await this.groq.chat.completions.create({
      model: config.model || 'llama-3.3-70b-versatile',
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens ?? 4096,
      stream: true,
    });
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      const done = chunk.choices[0]?.finish_reason === 'stop';
      yield { content, done };
    }
  }
  
  /**
   * Seleciona automaticamente o melhor provider para a tarefa
   */
  async smartComplete(
    messages: Message[],
    options: {
      task: 'code' | 'chat' | 'analysis' | 'creative';
      budget?: 'cheap' | 'balanced' | 'quality';
      maxLatencyMs?: number;
    } = { task: 'chat', budget: 'balanced' }
  ): Promise<CompletionResult> {
    const available = this.getAvailableProviders();
    
    if (available.length === 0) {
      throw new Error('No LLM providers configured. Add API keys to .env');
    }
    
    // Lógica de seleção inteligente
    let config: LLMConfig;
    
    if (options.budget === 'cheap') {
      // Prioridade: Groq > DeepSeek > Gemini Flash > GPT-3.5
      if (available.includes('groq')) {
        config = { provider: 'groq', model: 'llama-3.1-8b-instant' };
      } else if (available.includes('google')) {
        config = { provider: 'google', model: 'gemini-1.5-flash' };
      } else if (available.includes('openai')) {
        config = { provider: 'openai', model: 'gpt-4o-mini' };
      } else {
        config = { provider: available[0], model: 'default' };
      }
    } else if (options.budget === 'quality') {
      // Prioridade: Claude 3.5 > GPT-4o > Gemini Pro
      if (available.includes('anthropic')) {
        config = { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' };
      } else if (available.includes('openai')) {
        config = { provider: 'openai', model: 'gpt-4o' };
      } else if (available.includes('google')) {
        config = { provider: 'google', model: 'gemini-1.5-pro' };
      } else {
        config = { provider: available[0], model: 'default' };
      }
    } else {
      // Balanced: GPT-4o-mini > Claude Haiku > Groq
      if (available.includes('openai')) {
        config = { provider: 'openai', model: 'gpt-4o-mini' };
      } else if (available.includes('anthropic')) {
        config = { provider: 'anthropic', model: 'claude-3-5-haiku-20241022' };
      } else if (available.includes('groq')) {
        config = { provider: 'groq', model: 'llama-3.3-70b-versatile' };
      } else {
        config = { provider: available[0], model: 'default' };
      }
    }
    
    // Ajuste por tipo de tarefa
    if (options.task === 'code' && available.includes('anthropic')) {
      config = { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' };
    }
    
    return this.complete(messages, config);
  }
  
  /**
   * Retorna estatísticas de uso
   */
  getStats() {
    return {
      totalCost: this.totalCost,
      totalTokens: this.totalTokens,
      requestCount: this.requestCount,
      avgCostPerRequest: this.requestCount > 0 ? this.totalCost / this.requestCount : 0,
      availableProviders: this.getAvailableProviders(),
    };
  }
  
  /**
   * Reseta estatísticas
   */
  resetStats(): void {
    this.totalCost = 0;
    this.totalTokens = 0;
    this.requestCount = 0;
  }
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON E FACTORY
// ═══════════════════════════════════════════════════════════════

let instance: RealLLMClient | null = null;

export function getLLMClient(): RealLLMClient {
  if (!instance) {
    instance = new RealLLMClient();
  }
  return instance;
}

export function createLLMClient(): RealLLMClient {
  return new RealLLMClient();
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Função simples para chat
 */
export async function chat(
  message: string,
  options: {
    systemPrompt?: string;
    provider?: LLMProvider;
    model?: string;
  } = {}
): Promise<string> {
  const client = getLLMClient();
  
  const messages: Message[] = [];
  if (options.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }
  messages.push({ role: 'user', content: message });
  
  const result = await client.smartComplete(messages, { task: 'chat' });
  return result.content;
}

/**
 * Função para geração de código
 */
export async function generateCode(
  prompt: string,
  language: string = 'typescript'
): Promise<string> {
  const client = getLLMClient();
  
  const messages: Message[] = [
    {
      role: 'system',
      content: `You are an expert ${language} programmer. Generate clean, efficient, well-documented code. Only output code, no explanations unless asked.`,
    },
    { role: 'user', content: prompt },
  ];
  
  const result = await client.smartComplete(messages, { task: 'code', budget: 'quality' });
  return result.content;
}

/**
 * Função para análise
 */
export async function analyze(
  content: string,
  question: string
): Promise<string> {
  const client = getLLMClient();
  
  const messages: Message[] = [
    {
      role: 'system',
      content: 'You are an expert analyst. Provide detailed, accurate analysis.',
    },
    {
      role: 'user',
      content: `Content:\n${content}\n\nQuestion: ${question}`,
    },
  ];
  
  const result = await client.smartComplete(messages, { task: 'analysis', budget: 'balanced' });
  return result.content;
}

export default RealLLMClient;
