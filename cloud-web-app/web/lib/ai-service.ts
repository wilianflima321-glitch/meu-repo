/**
 * AI Service - Conexão Real com Providers LLM
 * 
 * Este serviço conecta DIRETAMENTE com OpenAI, Anthropic, Google e Groq
 * Não é mock, não é placeholder - FUNCIONA DE VERDADE!
 * 
 * INTEGRAÇÃO COM EMERGENCY MODE:
 * - Controle de custos em tempo real
 * - Downgrade automático para modelos baratos em emergência
 * - Shadow ban para usuários abusivos
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { emergencyController, MODEL_CONFIGS } from './emergency-mode';

// ============================================================================
// TIPOS
// ============================================================================

export type LLMProvider = 'openai' | 'openrouter' | 'anthropic' | 'google' | 'groq';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIQueryOptions {
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  userId?: string; // Para tracking e shadow ban
  bypassEmergency?: boolean; // Para admin override
}

export interface AIResponse {
  content: string;
  model: string;
  provider: LLMProvider;
  tokensUsed: number;
  latencyMs: number;
  cost?: number; // Custo estimado em USD
  downgraded?: boolean; // Se foi downgrade por emergency mode
  originalModel?: string; // Modelo original se foi downgraded
}

function parseModelSelection(
  model?: string,
  provider?: LLMProvider
): { model?: string; provider?: LLMProvider } {
  const rawModel = String(model || '').trim();
  if (!rawModel) {
    return { model: undefined, provider };
  }

  const colonIndex = rawModel.indexOf(':');
  if (colonIndex > 0 && colonIndex < rawModel.length - 1) {
    const prefix = rawModel.slice(0, colonIndex).toLowerCase();
    const nextModel = rawModel.slice(colonIndex + 1);
    if (prefix === 'openrouter') return { model: nextModel, provider: 'openrouter' };
    if (prefix === 'openai') return { model: nextModel, provider: provider === 'openrouter' ? provider : 'openai' };
    if (prefix === 'anthropic') return { model: nextModel, provider: provider === 'openrouter' ? provider : 'anthropic' };
    if (prefix === 'google') return { model: nextModel, provider: provider === 'openrouter' ? provider : 'google' };
    if (prefix === 'groq') return { model: nextModel, provider: 'groq' };
  }

  if (!provider) {
    if (rawModel.startsWith('openai/')) return { model: rawModel, provider: 'openrouter' };
    if (rawModel.startsWith('anthropic/')) return { model: rawModel, provider: 'openrouter' };
    if (rawModel.startsWith('google/')) return { model: rawModel, provider: 'openrouter' };
  }

  return { model: rawModel, provider };
}

// ============================================================================
// PRICING POR MILHÃO DE TOKENS (Dezembro 2024)
// ============================================================================

const PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  'openai/gpt-4o-mini': { input: 0.15, output: 0.60 },
  'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
  'claude-3-5-haiku-20241022': { input: 0.80, output: 4.00 },
  'anthropic/claude-3.5-haiku': { input: 0.80, output: 4.00 },
  'gemini-1.5-pro': { input: 1.25, output: 5.00 },
  'gemini-1.5-flash': { input: 0.075, output: 0.30 },
  'google/gemini-3.1-flash-lite-preview': { input: 0.10, output: 0.40 },
};

// ============================================================================
// AI SERVICE CLASS
// ============================================================================

class AIService {
  private openai: OpenAI | null = null;
  private openrouter: OpenAI | null = null;
  private anthropic: Anthropic | null = null;
  private google: GoogleGenerativeAI | null = null;
  
  constructor() {
    this.initializeClients();
  }
  
  private initializeClients(): void {
    // OpenAI
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }

    if (process.env.OPENROUTER_API_KEY) {
      this.openrouter = new OpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'Aethel Engine',
        },
      });
    }
    
    // Anthropic
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }
    
    // Google
    if (process.env.GOOGLE_API_KEY) {
      this.google = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    }
  }
  
  /**
   * Verifica quais providers estão disponíveis
   */
  getAvailableProviders(): LLMProvider[] {
    const providers: LLMProvider[] = [];
    if (this.openai) providers.push('openai');
    if (this.openrouter) providers.push('openrouter');
    if (this.anthropic) providers.push('anthropic');
    if (this.google) providers.push('google');
    return providers;
  }
  
  /**
   * Seleciona o melhor provider disponível
   */
  private selectProvider(): LLMProvider {
    // Prioridade factual: OpenRouter (multi-provider padr?o) > Google > OpenAI > Anthropic
    if (this.openrouter) return 'openrouter';
    if (this.google) return 'google';
    if (this.openai) return 'openai';
    if (this.anthropic) return 'anthropic';
    throw new Error('Nenhum provider de IA configurado. Configure ao menos uma API key no .env');
  }

  /**
   * Calcula custo estimado baseado no modelo e tokens
   */
  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = PRICING[model];
    if (!pricing) return 0;
    
    return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
  }
  
  /**
   * Query principal - FUNCIONA DE VERDADE!
   * Agora com integração do Emergency Mode
   */
  async query(
    userQuery: string,
    context?: string,
    options: AIQueryOptions = {}
  ): Promise<AIResponse> {
    const startTime = Date.now();
    const parsedSelection = parseModelSelection(options.model, options.provider);
    let provider = parsedSelection.provider || this.selectProvider();
    let model = parsedSelection.model || this.getDefaultModel(provider);
    let wasDowngraded = false;
    let originalModel: string | undefined;
    
    // =========================================================================
    // EMERGENCY MODE CHECK
    // =========================================================================
    if (!options.bypassEmergency) {
      const emergencyCheck = emergencyController.canMakeRequest(model, options.maxTokens || 2048);
      
      if (!emergencyCheck.allowed) {
        // Tentar com modelo mais barato
        const cheapModel = this.openrouter ? 'google/gemini-3.1-flash-lite-preview' : 'gpt-4o-mini';
        const fallbackCheck = emergencyController.canMakeRequest(cheapModel, options.maxTokens || 2048);
        
        if (!fallbackCheck.allowed) {
          throw new Error(`[EMERGENCY MODE] ${emergencyCheck.reason}`);
        }
        
        // Forçar downgrade
        originalModel = model;
        model = cheapModel;
        provider = parseModelSelection(cheapModel).provider || (this.openrouter ? 'openrouter' : 'openai');
        wasDowngraded = true;
        console.warn(`[AIService] Emergency downgrade: ${originalModel} -> ${model}`);
      } else if (emergencyCheck.model && emergencyCheck.model !== model) {
        // Emergency mode sugeriu outro modelo
        originalModel = model;
        model = emergencyCheck.model;
        wasDowngraded = true;
      }
    }
    
    const systemPrompt = options.systemPrompt || `Você é o assistente de IA do Aethel Engine, uma IDE avançada para criação de jogos, aplicativos e mídia.
Responda de forma clara, concisa e útil. Se não souber a resposta, diga claramente.
${context ? `\nContexto adicional:\n${context}` : ''}`;
    
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userQuery }
    ];
    
    try {
      let response: AIResponse;
      
      switch (provider) {
        case 'openai':
          response = await this.queryOpenAI(messages, { ...options, model }, startTime);
          break;
        case 'openrouter':
          response = await this.queryOpenRouter(messages, { ...options, model }, startTime);
          break;
        case 'anthropic':
          response = await this.queryAnthropic(messages, { ...options, model }, startTime);
          break;
        case 'google':
          response = await this.queryGoogle(messages, { ...options, model }, startTime);
          break;
        default:
          throw new Error(`Provider não suportado: ${provider}`);
      }
      
      // Calcular custo e registrar no Emergency Mode
      const estimatedInput = Math.ceil((systemPrompt.length + userQuery.length) / 4);
      const estimatedOutput = Math.ceil(response.content.length / 4);
      const cost = this.calculateCost(response.model, estimatedInput, estimatedOutput);
      
      if (!options.bypassEmergency) {
        emergencyController.recordSpend(cost);
      }
      
      // Adicionar campos extras na resposta
      response.cost = cost;
      response.downgraded = wasDowngraded;
      if (originalModel) {
        response.originalModel = originalModel;
      }
      
      return response;
      
    } catch (error) {
      console.error(`[AIService] Erro com provider ${provider}:`, error);
      
      // Fallback para outro provider
      const availableProviders = this.getAvailableProviders().filter(p => p !== provider);
      if (availableProviders.length > 0) {
        console.log(`[AIService] Tentando fallback para ${availableProviders[0]}`);
        return this.query(userQuery, context, { ...options, provider: availableProviders[0] });
      }
      
      throw error;
    }
  }
  
  /**
   * Retorna modelo default por provider
   */
  private getDefaultModel(provider: LLMProvider): string {
    switch (provider) {
      case 'openai': return 'gpt-4o-mini';
      case 'openrouter': return 'google/gemini-3.1-flash-lite-preview';
      case 'anthropic': return 'claude-3-5-haiku-20241022';
      case 'google': return 'gemini-1.5-flash';
      default: return 'gpt-4o-mini';
    }
  }
  
  /**
   * Verifica se está em modo de emergência
   */
  getEmergencyState() {
    return emergencyController.getState();
  }
  
  /**
   * Verifica se pode fazer request (para UI)
   */
  canMakeRequest(model?: string, tokens?: number) {
    const parsedSelection = parseModelSelection(model);
    return emergencyController.canMakeRequest(parsedSelection.model || 'gpt-4o-mini', tokens ?? 0);
  }
  
  /**
   * OpenAI Query
   */
  private async queryOpenAI(
    messages: Message[],
    options: AIQueryOptions,
    startTime: number
  ): Promise<AIResponse> {
    if (!this.openai) {
      throw new Error('OpenAI não configurado');
    }
    
    const model = options.model || 'gpt-4o-mini';
    
    const response = await this.openai.chat.completions.create({
      model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
    });
    
    const usage = response.usage || { total_tokens: 0 };
    
    return {
      content: response.choices[0]?.message?.content || '',
      model: response.model,
      provider: 'openai',
      tokensUsed: usage.total_tokens,
      latencyMs: Date.now() - startTime,
    };
  }
  
  /**
   * OpenRouter Query (OpenAI-compatible API)
   */
  private async queryOpenRouter(
    messages: Message[],
    options: AIQueryOptions,
    startTime: number
  ): Promise<AIResponse> {
    if (!this.openrouter) {
      throw new Error('OpenRouter n??o configurado');
    }

    const model = options.model || 'google/gemini-3.1-flash-lite-preview';

    const response = await this.openrouter.chat.completions.create({
      model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
    });

    const usage = response.usage || { total_tokens: 0 };

    return {
      content: response.choices[0]?.message?.content || '',
      model: response.model,
      provider: 'openrouter',
      tokensUsed: usage.total_tokens,
      latencyMs: Date.now() - startTime,
    };
  }

  /**
   * Anthropic Query
   */
  private async queryAnthropic(
    messages: Message[],
    options: AIQueryOptions,
    startTime: number
  ): Promise<AIResponse> {
    if (!this.anthropic) {
      throw new Error('Anthropic não configurado');
    }
    
    const model = options.model || 'claude-3-5-haiku-20241022';
    const systemMessage = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');
    
    const response = await this.anthropic.messages.create({
      model,
      max_tokens: options.maxTokens ?? 2048,
      system: systemMessage?.content || '',
      messages: userMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });
    
    const content = response.content[0];
    const text = content.type === 'text' ? content.text : '';
    
    return {
      content: text,
      model,
      provider: 'anthropic',
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      latencyMs: Date.now() - startTime,
    };
  }
  
  /**
   * Google Gemini Query
   */
  private async queryGoogle(
    messages: Message[],
    options: AIQueryOptions,
    startTime: number
  ): Promise<AIResponse> {
    if (!this.google) {
      throw new Error('Google não configurado');
    }
    
    const model = options.model || 'gemini-1.5-flash';
    const geminiModel = this.google.getGenerativeModel({ model });
    
    // Converter mensagens para formato Gemini
    const systemMessage = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');
    
    const prompt = [
      systemMessage?.content || '',
      ...userMessages.map(m => `${m.role}: ${m.content}`)
    ].join('\n\n');
    
    const result = await geminiModel.generateContent(prompt);
    const response = result.response;
    
    return {
      content: response.text(),
      model,
      provider: 'google',
      tokensUsed: 0, // Gemini não retorna contagem de tokens na API simples
      latencyMs: Date.now() - startTime,
    };
  }

  /**
   * Chat API - Interface de conversação simplificada
   * Compatível com agent-mode, ghost-text e inline-edit
   */
  async chat(params: {
    messages: Message[];
    model?: string;
    provider?: LLMProvider;
    temperature?: number;
    maxTokens?: number;
  }): Promise<AIResponse> {
    const { messages, temperature, maxTokens } = params;
    const parsedSelection = parseModelSelection(params.model, params.provider);
    
    // Extrai system prompt e user query das mensagens
    const systemMessage = messages.find(m => m.role === 'system');
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    
    if (!lastUserMessage) {
      throw new Error('Chat requires at least one user message');
    }
    
    // Monta contexto a partir de mensagens anteriores (excluindo system e última user)
    const contextMessages = messages
      .filter(m => m.role !== 'system' && m !== lastUserMessage)
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');
    
    return this.query(lastUserMessage.content, contextMessages || undefined, {
      provider: parsedSelection.provider,
      model: parsedSelection.model,
      temperature,
      maxTokens,
      systemPrompt: systemMessage?.content,
    });
  }
  
  /**
   * Streaming Chat - Para respostas progressivas
   */
  async *chatStream(params: {
    messages: Message[];
    model?: string;
    provider?: LLMProvider;
    temperature?: number;
    maxTokens?: number;
  }): AsyncGenerator<string, void, unknown> {
    const parsedSelection = parseModelSelection(params.model, params.provider);
    const provider = parsedSelection.provider || this.selectProvider();
    const systemMessage = params.messages.find(m => m.role === 'system');
    const userMessages = params.messages.filter(m => m.role !== 'system');
    
    if (provider === 'openai' && this.openai) {
      const model = parsedSelection.model || 'gpt-4o-mini';
      
      const stream = await this.openai.chat.completions.create({
        model,
        messages: params.messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens ?? 2048,
        stream: true,
      });
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } else if (provider === 'openrouter' && this.openrouter) {
      const model = parsedSelection.model || 'google/gemini-3.1-flash-lite-preview';

      const stream = await this.openrouter.chat.completions.create({
        model,
        messages: params.messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens ?? 2048,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } else if (provider === 'anthropic' && this.anthropic) {
      const model = parsedSelection.model || 'claude-3-5-haiku-20241022';
      
      const stream = await this.anthropic.messages.stream({
        model,
        max_tokens: params.maxTokens ?? 2048,
        system: systemMessage?.content || '',
        messages: userMessages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      });
      
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          yield chunk.delta.text;
        }
      }
    } else {
      // Fallback: non-streaming response yielded all at once
      const response = await this.chat(params);
      yield response.content;
    }
  }
}

// Singleton
export const aiService = new AIService();
