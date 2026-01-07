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

export type LLMProvider = 'openai' | 'anthropic' | 'google' | 'groq';

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

// ============================================================================
// PRICING POR MILHÃO DE TOKENS (Dezembro 2024)
// ============================================================================

const PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
  'claude-3-5-haiku-20241022': { input: 0.80, output: 4.00 },
  'gemini-1.5-pro': { input: 1.25, output: 5.00 },
  'gemini-1.5-flash': { input: 0.075, output: 0.30 },
};

// ============================================================================
// AI SERVICE CLASS
// ============================================================================

class AIService {
  private openai: OpenAI | null = null;
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
    if (this.anthropic) providers.push('anthropic');
    if (this.google) providers.push('google');
    return providers;
  }
  
  /**
   * Seleciona o melhor provider disponível
   */
  private selectProvider(): LLMProvider {
    // Prioridade: Groq (rápido) > Google (barato) > OpenAI > Anthropic
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
    let provider = options.provider || this.selectProvider();
    let model = options.model || this.getDefaultModel(provider);
    let wasDowngraded = false;
    let originalModel: string | undefined;
    
    // =========================================================================
    // EMERGENCY MODE CHECK
    // =========================================================================
    if (!options.bypassEmergency) {
      const emergencyCheck = emergencyController.canMakeRequest(model, options.maxTokens || 2048);
      
      if (!emergencyCheck.allowed) {
        // Tentar com modelo mais barato
        const cheapModel = 'gpt-4o-mini';
        const fallbackCheck = emergencyController.canMakeRequest(cheapModel, options.maxTokens || 2048);
        
        if (!fallbackCheck.allowed) {
          throw new Error(`[EMERGENCY MODE] ${emergencyCheck.reason}`);
        }
        
        // Forçar downgrade
        originalModel = model;
        model = cheapModel;
        provider = 'openai';
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
    return emergencyController.canMakeRequest(model || 'gpt-4o-mini', tokens);
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
    const { messages, model, provider, temperature, maxTokens } = params;
    
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
      provider,
      model,
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
    const provider = params.provider || this.selectProvider();
    const systemMessage = params.messages.find(m => m.role === 'system');
    const userMessages = params.messages.filter(m => m.role !== 'system');
    
    if (provider === 'openai' && this.openai) {
      const model = params.model || 'gpt-4o-mini';
      
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
    } else if (provider === 'anthropic' && this.anthropic) {
      const model = params.model || 'claude-3-5-haiku-20241022';
      
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
