/**
 * ═══════════════════════════════════════════════════════════════
 * LLM INTEGRATION BRIDGE
 * ═══════════════════════════════════════════════════════════════
 * 
 * Ponte de integração que conecta o RealLLMClient aos outros
 * sistemas do Aethel Engine:
 * 
 * - Mission System (planejamento inteligente)
 * - Trading AI (análise de mercado)
 * - Agent System (comandos em linguagem natural)
 * - Web Automation (decisões autônomas)
 * 
 * @module LLMIntegrationBridge
 * @version 1.0.0
 */

import { EventEmitter } from 'events';
import { RealLLMClient, getLLMClient, CompletionResult, Message } from './real-llm-client';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface LLMBridgeConfig {
  /** Modelo padrão para planejamento */
  planningModel?: string;
  /** Modelo padrão para análise de trading */
  tradingModel?: string;
  /** Modelo padrão para comandos de chat */
  chatModel?: string;
  /** Modelo padrão para código */
  codingModel?: string;
  /** Budget máximo por operação (USD) */
  maxCostPerOperation?: number;
  /** Habilitar cache de respostas */
  enableCache?: boolean;
  /** TTL do cache em ms */
  cacheTTL?: number;
}

export interface PlanningRequest {
  objective: string;
  context?: string;
  constraints?: string[];
  availableTools?: string[];
  maxSteps?: number;
}

export interface PlanningResult {
  plan: PlanStep[];
  reasoning: string;
  estimatedDuration: string;
  confidence: number;
  warnings?: string[];
}

export interface PlanStep {
  id: number;
  action: string;
  tool?: string;
  parameters?: Record<string, any>;
  dependencies?: number[];
  expectedOutcome: string;
}

export interface TradingAnalysisRequest {
  symbol: string;
  timeframe: string;
  indicators: Record<string, any>;
  patterns: string[];
  currentPrice: number;
  context?: string;
}

export interface TradingAnalysisResult {
  recommendation: 'buy' | 'sell' | 'hold' | 'wait';
  confidence: number;
  reasoning: string;
  entry?: number;
  stopLoss?: number;
  takeProfit?: number;
  riskRewardRatio?: number;
  timeHorizon?: string;
  warnings?: string[];
}

export interface ChatCommandResult {
  intent: string;
  action: string;
  parameters: Record<string, any>;
  response: string;
  requiresConfirmation: boolean;
}

// ═══════════════════════════════════════════════════════════════
// PROMPTS ESPECIALIZADOS
// ═══════════════════════════════════════════════════════════════

const SYSTEM_PROMPTS = {
  planner: `Você é um planejador de tarefas especializado para automação.
Sua função é decompor objetivos complexos em passos executáveis.

Regras:
1. Cada passo deve ser atômico e verificável
2. Identifique dependências entre passos
3. Considere tratamento de erros
4. Estime tempo de execução
5. Responda APENAS em JSON válido

Ferramentas disponíveis:
- browser: navegação web, clicks, formulários
- file: criar, ler, editar arquivos
- terminal: executar comandos
- api: chamadas HTTP
- wait: aguardar condições`,

  trading: `Você é um analista de trading quantitativo experiente.
Analise dados de mercado e forneça recomendações fundamentadas.

Regras:
1. Considere múltiplos indicadores técnicos
2. Avalie risco/retorno
3. Identifique padrões de price action
4. Considere contexto de mercado
5. Seja conservador em casos de incerteza
6. Responda APENAS em JSON válido

Sua análise deve incluir:
- Direção do trade (buy/sell/hold/wait)
- Níveis de entrada, stop e alvo
- Confiança (0-100%)
- Raciocínio detalhado`,

  chatCommand: `Você é um assistente que interpreta comandos em linguagem natural.
Converta comandos do usuário em ações estruturadas.

Ações disponíveis:
- navigate: ir para URL
- click: clicar em elemento
- fill: preencher formulário
- extract: extrair dados
- trade: executar trade
- deploy: fazer deploy
- search: pesquisar
- create: criar arquivo/projeto
- run: executar comando

Responda SEMPRE em JSON com:
{
  "intent": "descrição da intenção",
  "action": "nome_da_ação",
  "parameters": {},
  "response": "resposta amigável",
  "requiresConfirmation": boolean
}`,

  coder: `Você é um desenvolvedor expert em TypeScript, React, Node.js e Python.
Gere código limpo, bem documentado e seguindo melhores práticas.

Regras:
1. Use TypeScript com tipos explícitos
2. Siga padrões do projeto
3. Adicione comentários explicativos
4. Considere tratamento de erros
5. Escreva código testável`
};

// ═══════════════════════════════════════════════════════════════
// LLM INTEGRATION BRIDGE
// ═══════════════════════════════════════════════════════════════

const DEFAULT_CONFIG: LLMBridgeConfig = {
  planningModel: 'claude-3-5-sonnet-20241022',
  tradingModel: 'gpt-4o',
  chatModel: 'gpt-4o-mini',
  codingModel: 'claude-3-5-sonnet-20241022',
  maxCostPerOperation: 0.50,
  enableCache: true,
  cacheTTL: 5 * 60 * 1000, // 5 minutos
};

export class LLMIntegrationBridge extends EventEmitter {
  private client: RealLLMClient;
  private config: LLMBridgeConfig;
  private cache: Map<string, { result: any; timestamp: number }> = new Map();
  private totalCost: number = 0;
  
  constructor(config: Partial<LLMBridgeConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.client = getLLMClient();
  }
  
  // ═══════════════════════════════════════════════════════════════
  // MISSION PLANNING
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Gera um plano de execução para uma missão
   */
  async planMission(request: PlanningRequest): Promise<PlanningResult> {
    const cacheKey = `plan:${JSON.stringify(request)}`;
    
    if (this.config.enableCache) {
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
    }
    
    const prompt = this.buildPlanningPrompt(request);
    
    try {
      // Usar complete com messages e config na ordem correta
      const messages: Message[] = [
        { role: 'system', content: SYSTEM_PROMPTS.planner },
        { role: 'user', content: prompt }
      ];
      
      const result = await this.client.complete(messages, {
        provider: 'anthropic',
        model: this.config.planningModel!,
        temperature: 0.3,
        maxTokens: 4000,
      });
      
      this.trackCost(result);
      
      const plan = this.parsePlanningResult(result.content);
      
      if (this.config.enableCache) {
        this.setCache(cacheKey, plan);
      }
      
      this.emit('planGenerated', { request, plan });
      return plan;
      
    } catch (error) {
      this.emit('error', { type: 'planning', error });
      throw error;
    }
  }
  
  private buildPlanningPrompt(request: PlanningRequest): string {
    let prompt = `OBJETIVO: ${request.objective}\n\n`;
    
    if (request.context) {
      prompt += `CONTEXTO: ${request.context}\n\n`;
    }
    
    if (request.constraints?.length) {
      prompt += `RESTRIÇÕES:\n${request.constraints.map(c => `- ${c}`).join('\n')}\n\n`;
    }
    
    if (request.availableTools?.length) {
      prompt += `FERRAMENTAS DISPONÍVEIS:\n${request.availableTools.map(t => `- ${t}`).join('\n')}\n\n`;
    }
    
    if (request.maxSteps) {
      prompt += `MÁXIMO DE PASSOS: ${request.maxSteps}\n\n`;
    }
    
    prompt += `
Gere um plano de execução em JSON:
{
  "plan": [
    {
      "id": 1,
      "action": "descrição da ação",
      "tool": "nome_da_ferramenta",
      "parameters": {},
      "dependencies": [],
      "expectedOutcome": "resultado esperado"
    }
  ],
  "reasoning": "explicação do raciocínio",
  "estimatedDuration": "tempo estimado",
  "confidence": 85,
  "warnings": ["aviso se houver"]
}`;
    
    return prompt;
  }
  
  private parsePlanningResult(content: string): PlanningResult {
    try {
      // Extrair JSON do conteúdo
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      // Fallback para resultado básico
      return {
        plan: [{
          id: 1,
          action: 'Execute objective directly',
          expectedOutcome: 'Task completed'
        }],
        reasoning: content,
        estimatedDuration: 'Unknown',
        confidence: 50,
        warnings: ['Could not parse structured plan']
      };
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // TRADING ANALYSIS
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Análise de trading com LLM
   */
  async analyzeTrade(request: TradingAnalysisRequest): Promise<TradingAnalysisResult> {
    const cacheKey = `trade:${request.symbol}:${request.timeframe}:${Date.now() - (Date.now() % 60000)}`;
    
    if (this.config.enableCache) {
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
    }
    
    const prompt = this.buildTradingPrompt(request);
    
    try {
      const messages: Message[] = [
        { role: 'system', content: SYSTEM_PROMPTS.trading },
        { role: 'user', content: prompt }
      ];
      
      const result = await this.client.complete(messages, {
        provider: 'openai',
        model: this.config.tradingModel!,
        temperature: 0.2,
        maxTokens: 2000,
      });
      
      this.trackCost(result);
      
      const analysis = this.parseTradingResult(result.content, request.currentPrice);
      
      if (this.config.enableCache) {
        this.setCache(cacheKey, analysis);
      }
      
      this.emit('tradeAnalyzed', { request, analysis });
      return analysis;
      
    } catch (error) {
      this.emit('error', { type: 'trading', error });
      throw error;
    }
  }
  
  private buildTradingPrompt(request: TradingAnalysisRequest): string {
    return `
ANÁLISE DE TRADING

ATIVO: ${request.symbol}
TIMEFRAME: ${request.timeframe}
PREÇO ATUAL: ${request.currentPrice}

INDICADORES TÉCNICOS:
${JSON.stringify(request.indicators, null, 2)}

PADRÕES IDENTIFICADOS:
${request.patterns.map(p => `- ${p}`).join('\n')}

${request.context ? `CONTEXTO ADICIONAL: ${request.context}` : ''}

Forneça sua análise em JSON:
{
  "recommendation": "buy|sell|hold|wait",
  "confidence": 0-100,
  "reasoning": "explicação detalhada",
  "entry": preço_entrada,
  "stopLoss": preço_stop,
  "takeProfit": preço_alvo,
  "riskRewardRatio": ratio,
  "timeHorizon": "tempo esperado",
  "warnings": ["avisos"]
}`;
  }
  
  private parseTradingResult(content: string, currentPrice: number): TradingAnalysisResult {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found');
      }
      return JSON.parse(jsonMatch[0]);
    } catch {
      return {
        recommendation: 'wait',
        confidence: 30,
        reasoning: content,
        warnings: ['Could not parse structured analysis']
      };
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // CHAT COMMAND INTERPRETATION
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Interpreta comandos em linguagem natural
   */
  async interpretCommand(userMessage: string, context?: string): Promise<ChatCommandResult> {
    const prompt = context 
      ? `CONTEXTO: ${context}\n\nCOMANDO DO USUÁRIO: ${userMessage}`
      : `COMANDO DO USUÁRIO: ${userMessage}`;
    
    try {
      const messages: Message[] = [
        { role: 'system', content: SYSTEM_PROMPTS.chatCommand },
        { role: 'user', content: prompt }
      ];
      
      const result = await this.client.complete(messages, {
        provider: 'openai',
        model: this.config.chatModel!,
        temperature: 0.1,
        maxTokens: 1000,
      });
      
      this.trackCost(result);
      
      const command = this.parseCommandResult(result.content, userMessage);
      
      this.emit('commandInterpreted', { userMessage, command });
      return command;
      
    } catch (error) {
      this.emit('error', { type: 'command', error });
      throw error;
    }
  }
  
  private parseCommandResult(content: string, originalMessage: string): ChatCommandResult {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found');
      }
      return JSON.parse(jsonMatch[0]);
    } catch {
      return {
        intent: 'unknown',
        action: 'clarify',
        parameters: { originalMessage },
        response: 'Desculpe, não entendi. Pode reformular?',
        requiresConfirmation: false
      };
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // CODE GENERATION
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Gera código com LLM
   */
  async generateCode(prompt: string, language: string = 'typescript'): Promise<string> {
    const fullPrompt = `
Linguagem: ${language}

${prompt}

Responda APENAS com o código, sem explicações adicionais.
Use markdown code blocks.`;
    
    try {
      const messages: Message[] = [
        { role: 'system', content: SYSTEM_PROMPTS.coder },
        { role: 'user', content: fullPrompt }
      ];
      
      const result = await this.client.complete(messages, {
        provider: 'anthropic',
        model: this.config.codingModel!,
        temperature: 0.2,
        maxTokens: 4000,
      });
      
      this.trackCost(result);
      
      // Extrair código do markdown
      const codeMatch = result.content.match(/```(?:\w+)?\n([\s\S]*?)```/);
      return codeMatch ? codeMatch[1].trim() : result.content;
      
    } catch (error) {
      this.emit('error', { type: 'coding', error });
      throw error;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Conversa genérica com o LLM
   */
  async chat(
    messages: Message[], 
    options?: { model?: string; temperature?: number; maxTokens?: number }
  ): Promise<string> {
    // smartComplete usa task para selecionar modelo
    const result = await this.client.smartComplete(messages, {
      task: 'chat',
      budget: 'balanced'
    });
    
    this.trackCost(result);
    return result.content;
  }
  
  /**
   * Streaming de resposta
   */
  async *streamChat(
    messages: Message[],
    options?: { model?: string; temperature?: number }
  ): AsyncGenerator<string> {
    // Usar stream do client com config separada
    const stream = this.client.stream(messages, {
      provider: 'openai',
      model: options?.model || this.config.chatModel!,
      temperature: options?.temperature || 0.7,
    });
    
    for await (const chunk of stream) {
      if (chunk.content) {
        yield chunk.content;
      }
    }
  }
  
  // Cache management
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.config.cacheTTL!) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.result;
  }
  
  private setCache(key: string, result: any): void {
    this.cache.set(key, { result, timestamp: Date.now() });
    
    // Limpar cache antigo
    if (this.cache.size > 100) {
      const oldest = [...this.cache.entries()]
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, 50);
      oldest.forEach(([k]) => this.cache.delete(k));
    }
  }
  
  private trackCost(result: CompletionResult): void {
    this.totalCost += result.cost;
    this.emit('costTracked', { 
      operationCost: result.cost, 
      totalCost: this.totalCost,
      model: result.model 
    });
  }
  
  // ═══════════════════════════════════════════════════════════════
  // GETTERS
  // ═══════════════════════════════════════════════════════════════
  
  getTotalCost(): number {
    return this.totalCost;
  }
  
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // TODO: implementar tracking
    };
  }
  
  isReady(): boolean {
    return this.client.getAvailableProviders().length > 0;
  }
  
  getAvailableProviders(): string[] {
    return this.client.getAvailableProviders();
  }
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON & FACTORY
// ═══════════════════════════════════════════════════════════════

let bridgeInstance: LLMIntegrationBridge | null = null;

export function getLLMBridge(): LLMIntegrationBridge {
  if (!bridgeInstance) {
    bridgeInstance = new LLMIntegrationBridge();
  }
  return bridgeInstance;
}

export function createLLMBridge(config?: Partial<LLMBridgeConfig>): LLMIntegrationBridge {
  return new LLMIntegrationBridge(config);
}

export default LLMIntegrationBridge;
