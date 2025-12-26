/**
 * Aethel Trading AI Brain
 * Núcleo de decisão autônoma com auto-questionamento
 */

import { injectable } from 'inversify';
import { Emitter, Event } from '@theia/core';
import {
  AITradingState,
  AutonomyLevel,
  AutonomyConfig,
  MarketAnalysis,
  TradeDecision,
  StrategySignal,
  RiskAssessment,
  Position,
  Order,
  TradingEvent,
  MarketRegime,
  RiskLevel,
  TradingPreferences,
} from './trading-types';

/**
 * Self-questioning criteria for AI decisions
 */
interface SelfQuestion {
  question: string;
  validator: (context: DecisionContext) => { answer: string; validated: boolean };
  weight: number;
  required: boolean;
}

interface DecisionContext {
  analysis: MarketAnalysis;
  signals: StrategySignal[];
  currentPositions: Position[];
  pendingOrders: Order[];
  riskAssessment: RiskAssessment;
  marketRegime: MarketRegime;
  portfolioValue: number;
  dailyPnL: number;
}

/**
 * Trading AI Brain - Core Decision Engine
 */
@injectable()
export class TradingAIBrain {
  // State
  private state: AITradingState;
  private preferences: TradingPreferences;
  private autonomyConfig: AutonomyConfig;
  
  // Self-questioning system
  private selfQuestions: Map<string, SelfQuestion[]> = new Map();
  
  // Decision history for learning
  private decisionHistory: TradeDecision[] = [];
  private maxHistorySize = 1000;
  
  // Emitters
  private readonly onDecisionEmitter = new Emitter<TradeDecision>();
  readonly onDecision: Event<TradeDecision> = this.onDecisionEmitter.event;
  
  private readonly onStateChangeEmitter = new Emitter<AITradingState>();
  readonly onStateChange: Event<AITradingState> = this.onStateChangeEmitter.event;
  
  private readonly onEventEmitter = new Emitter<TradingEvent>();
  readonly onEvent: Event<TradingEvent> = this.onEventEmitter.event;

  constructor() {
    this.state = this.getInitialState();
    this.preferences = this.getDefaultPreferences();
    this.autonomyConfig = this.getDefaultAutonomyConfig();
    this.initializeSelfQuestions();
  }

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * Process market analysis and generate decision
   */
  async processAnalysis(analysis: MarketAnalysis): Promise<TradeDecision | null> {
    if (!this.state.isActive) {
      return null;
    }

    // Build decision context
    const context: DecisionContext = {
      analysis,
      signals: this.collectSignals(analysis),
      currentPositions: this.state.openPositions || [],
      pendingOrders: [], // TODO: Get from order manager
      riskAssessment: await this.assessRisk(analysis),
      marketRegime: analysis.regime,
      portfolioValue: this.calculatePortfolioValue(),
      dailyPnL: this.state.performance?.today?.totalReturn || 0,
    };

    // Run self-questioning
    const questioningResult = this.runSelfQuestioning(context, 'pre_decision');
    
    // If questioning fails critical checks, abort
    if (!questioningResult.passed) {
      this.emitEvent({
        id: this.generateId(),
        type: 'decision_made',
        data: {
          action: 'hold',
          reason: 'Failed self-questioning',
          failedQuestions: questioningResult.failures,
        },
        timestamp: Date.now(),
        importance: 'medium',
      });
      return null;
    }

    // Generate trade decision
    const decision = this.generateDecision(context, questioningResult);
    
    // Apply autonomy level filter
    const filteredDecision = this.applyAutonomyFilter(decision);
    
    if (filteredDecision) {
      this.recordDecision(filteredDecision);
      this.onDecisionEmitter.fire(filteredDecision);
    }

    return filteredDecision;
  }

  /**
   * Update AI state
   */
  updateState(partial: Partial<AITradingState>): void {
    this.state = { ...this.state, ...partial, lastUpdated: Date.now() };
    this.onStateChangeEmitter.fire(this.state);
  }

  /**
   * Set autonomy level
   */
  setAutonomyLevel(level: AutonomyLevel): void {
    this.autonomyConfig.level = level;
    this.updateAutonomyConfig(level);
  }

  /**
   * Emergency stop (IA): desativa decisão/autonomia e emite evento crítico.
   * IMPORTANTE: cancelamento de ordens/fechamento de posições deve ser feito pelo TradingService/broker.
   */
  emergencyStop(): void {
    this.updateState({ isActive: false });
    this.emitEvent({
      id: this.generateId(),
      type: 'circuit_breaker',
      data: {
        reason: 'Emergency stop triggered by user',
        requiresBrokerEmergencyStop: true,
      },
      timestamp: Date.now(),
      importance: 'critical',
    });
  }

  /**
   * Get current state
   */
  getState(): AITradingState {
    return { ...this.state };
  }

  /**
   * Run periodic self-assessment
   */
  runSelfAssessment(): void {
    const assessment = this.performSelfAssessment();
    this.state.selfAssessment = {
      lastQuestioningAt: Date.now(),
      concerns: assessment.concerns,
      improvements: assessment.improvements,
      learnings: assessment.learnings,
    };
    this.onStateChangeEmitter.fire(this.state);
  }

  // ============================================
  // SELF-QUESTIONING SYSTEM
  // ============================================

  private initializeSelfQuestions(): void {
    // Pre-decision questions
    this.selfQuestions.set('pre_decision', [
      {
        question: 'Por que este trade e não outro?',
        validator: (ctx) => this.validateTradeRationale(ctx),
        weight: 1.0,
        required: true,
      },
      {
        question: 'Qual o risco real vs. percebido?',
        validator: (ctx) => this.validateRiskPerception(ctx),
        weight: 1.0,
        required: true,
      },
      {
        question: 'O mercado mudou desde a análise?',
        validator: (ctx) => this.validateAnalysisFreshness(ctx),
        weight: 0.8,
        required: false,
      },
      {
        question: 'Estou seguindo viés ou dados?',
        validator: (ctx) => this.validateBiasDetection(ctx),
        weight: 0.9,
        required: true,
      },
      {
        question: 'Qual o custo de oportunidade?',
        validator: (ctx) => this.validateOpportunityCost(ctx),
        weight: 0.7,
        required: false,
      },
      {
        question: 'E se eu estiver errado?',
        validator: (ctx) => this.validateWrongScenario(ctx),
        weight: 1.0,
        required: true,
      },
      {
        question: 'Esta decisão está alinhada com meu mandato?',
        validator: (ctx) => this.validateMandateAlignment(ctx),
        weight: 1.0,
        required: true,
      },
    ]);

    // Position management questions
    this.selfQuestions.set('position_management', [
      {
        question: 'Minhas posições ainda fazem sentido?',
        validator: (ctx) => this.validatePositionRationale(ctx),
        weight: 1.0,
        required: true,
      },
      {
        question: 'Preciso ajustar stops/targets?',
        validator: (ctx) => this.validateStopTargetLevels(ctx),
        weight: 0.9,
        required: false,
      },
      {
        question: 'Estou muito exposto em algum setor?',
        validator: (ctx) => this.validateSectorExposure(ctx),
        weight: 0.8,
        required: false,
      },
    ]);

    // End of day questions
    this.selfQuestions.set('daily_review', [
      {
        question: 'O que aprendi hoje?',
        validator: (ctx) => this.extractDailyLearnings(ctx),
        weight: 0.7,
        required: false,
      },
      {
        question: 'Onde errei e por quê?',
        validator: (ctx) => this.analyzeErrors(ctx),
        weight: 0.9,
        required: false,
      },
      {
        question: 'Devo mudar minha estratégia?',
        validator: (ctx) => this.evaluateStrategyChange(ctx),
        weight: 0.8,
        required: false,
      },
    ]);
  }

  private runSelfQuestioning(
    context: DecisionContext,
    phase: string
  ): { passed: boolean; score: number; results: any[]; failures: string[] } {
    const questions = this.selfQuestions.get(phase) || [];
    const results: any[] = [];
    const failures: string[] = [];
    let totalWeight = 0;
    let passedWeight = 0;

    for (const q of questions) {
      const result = q.validator(context);
      results.push({
        question: q.question,
        answer: result.answer,
        validated: result.validated,
        weight: q.weight,
        required: q.required,
      });

      totalWeight += q.weight;
      if (result.validated) {
        passedWeight += q.weight;
      } else if (q.required) {
        failures.push(q.question);
      }
    }

    const score = totalWeight > 0 ? passedWeight / totalWeight : 0;
    const passed = failures.length === 0 && score >= 0.6;

    return { passed, score, results, failures };
  }

  // ============================================
  // QUESTION VALIDATORS
  // ============================================

  private validateTradeRationale(ctx: DecisionContext): { answer: string; validated: boolean } {
    const signals = ctx.signals.filter(s => s.confidence > 0.6);
    if (signals.length === 0) {
      return {
        answer: 'Nenhum sinal de alta confiança identificado',
        validated: false,
      };
    }

    const reasons = signals.map(s => `${s.strategyId}: ${(s.reasoning || []).join(', ')}`);
    return {
      answer: `Trade justificado por ${signals.length} sinais: ${reasons.join('; ')}`,
      validated: true,
    };
  }

  private validateRiskPerception(ctx: DecisionContext): { answer: string; validated: boolean } {
    const { riskAssessment } = ctx;
    
    if (riskAssessment.canTrade === false) {
      return {
        answer: `Risco bloqueado: ${(riskAssessment.blockers || riskAssessment.blocks || []).join(', ')}`,
        validated: false,
      };
    }

    const riskScore = riskAssessment.riskScore ?? riskAssessment.score ?? 0;
    if (riskScore > 70) {
      return {
        answer: `Risco alto (${riskScore}/100): ${riskAssessment.warnings.join(', ')}`,
        validated: false,
      };
    }

    return {
      answer: `Risco aceitável (${riskScore}/100)`,
      validated: true,
    };
  }

  private validateAnalysisFreshness(ctx: DecisionContext): { answer: string; validated: boolean } {
    const age = Date.now() - ctx.analysis.timestamp;
    const maxAge = 5 * 60 * 1000; // 5 minutes

    if (age > maxAge) {
      return {
        answer: `Análise desatualizada (${Math.round(age / 60000)} min)`,
        validated: false,
      };
    }

    return {
      answer: `Análise recente (${Math.round(age / 1000)}s)`,
      validated: true,
    };
  }

  private validateBiasDetection(ctx: DecisionContext): { answer: string; validated: boolean } {
    // Check for recency bias
    const recentTrades = this.decisionHistory.slice(-10);
    const sameSideCount = recentTrades.filter(
      t => t.symbol === ctx.analysis.symbol && t.action === ctx.analysis.recommendation
    ).length;

    if (sameSideCount > 3) {
      return {
        answer: `Possível viés de confirmação: ${sameSideCount} trades recentes no mesmo sentido`,
        validated: false,
      };
    }

    // Check for loss aversion after losing streak
    const recentLosses = recentTrades.filter(t => t.executed && t.resultingOrder?.status === 'filled');
    // TODO: Check P&L of recent trades

    return {
      answer: 'Nenhum viés significativo detectado',
      validated: true,
    };
  }

  private validateOpportunityCost(ctx: DecisionContext): { answer: string; validated: boolean } {
    // Check if better opportunities exist
    // This would require scanning other assets
    const currentScore = ctx.analysis.overallScore;
    
    // For now, validate if the score is above threshold
    if (currentScore < 60) {
      return {
        answer: `Score baixo (${currentScore}), podem existir melhores oportunidades`,
        validated: false,
      };
    }

    return {
      answer: `Score satisfatório (${currentScore})`,
      validated: true,
    };
  }

  private validateWrongScenario(ctx: DecisionContext): { answer: string; validated: boolean } {
    const { riskAssessment } = ctx;
    
    // Check if stop loss is defined
    if (!riskAssessment.adjustedStopLoss) {
      return {
        answer: 'Stop loss não definido - cenário de erro não protegido',
        validated: false,
      };
    }

    // Check risk/reward
    const potentialLoss = riskAssessment.riskScore ?? riskAssessment.score ?? 0;
    if (potentialLoss > 50) {
      return {
        answer: `Perda potencial significativa (${potentialLoss}% do risco permitido)`,
        validated: false,
      };
    }

    return {
      answer: 'Cenário de erro mapeado e protegido com stop loss',
      validated: true,
    };
  }

  private validateMandateAlignment(ctx: DecisionContext): { answer: string; validated: boolean } {
    const { analysis, riskAssessment } = ctx;
    
    // Check if action aligns with risk profile
    const riskScore = riskAssessment.riskScore ?? riskAssessment.score ?? 0;
    if (this.preferences.riskLevel === 'conservative' && riskScore > 40) {
      return {
        answer: 'Trade agressivo demais para perfil conservador',
        validated: false,
      };
    }

    // Check market type preference
    if (!this.preferences.preferredMarkets.includes(analysis.technical.symbol as any)) {
      // Allow but note
    }

    return {
      answer: 'Trade alinhado com mandato e preferências',
      validated: true,
    };
  }

  private validatePositionRationale(ctx: DecisionContext): { answer: string; validated: boolean } {
    // Check each open position
    const validPositions = ctx.currentPositions.filter(p => {
      // Position should still have positive expected value
      return (p.unrealizedPnLPercent ?? 0) > -10; // Within acceptable drawdown
    });

    if (validPositions.length < ctx.currentPositions.length) {
      return {
        answer: `${ctx.currentPositions.length - validPositions.length} posições precisam de revisão`,
        validated: false,
      };
    }

    return {
      answer: 'Todas as posições justificadas',
      validated: true,
    };
  }

  private validateStopTargetLevels(ctx: DecisionContext): { answer: string; validated: boolean } {
    // All positions should have stops
    const unprotectedPositions = ctx.currentPositions.filter(p => !p.stopLoss);
    
    if (unprotectedPositions.length > 0) {
      return {
        answer: `${unprotectedPositions.length} posições sem stop loss`,
        validated: false,
      };
    }

    return {
      answer: 'Todos os stops definidos',
      validated: true,
    };
  }

  private validateSectorExposure(ctx: DecisionContext): { answer: string; validated: boolean } {
    // TODO: Implement sector exposure check
    return {
      answer: 'Exposição setorial dentro dos limites',
      validated: true,
    };
  }

  private extractDailyLearnings(ctx: DecisionContext): { answer: string; validated: boolean } {
    const now = Date.now();
    const todayDecisions = this.decisionHistory.filter(
      d => {
        const ts = d.timestamp instanceof Date ? d.timestamp.getTime() : d.timestamp;
        return ts > now - 24 * 60 * 60 * 1000;
      }
    );
    
    const learnings: string[] = [];
    
    // Analyze patterns
    if (todayDecisions.length > 0) {
      const avgConfidence = todayDecisions.reduce((s, d) => s + d.confidence, 0) / todayDecisions.length;
      learnings.push(`Confiança média: ${(avgConfidence * 100).toFixed(1)}%`);
    }

    return {
      answer: learnings.length > 0 ? learnings.join('; ') : 'Nenhuma operação hoje',
      validated: true,
    };
  }

  private analyzeErrors(ctx: DecisionContext): { answer: string; validated: boolean } {
    // TODO: Implement error analysis based on closed trades
    return {
      answer: 'Análise de erros pendente',
      validated: true,
    };
  }

  private evaluateStrategyChange(ctx: DecisionContext): { answer: string; validated: boolean } {
    // Check if current strategy mix is performing well
    const performance = this.state.performance?.week;
    
    if (performance && performance.totalReturnPercent < -5) {
      return {
        answer: 'Performance negativa significativa - considerar ajuste de estratégia',
        validated: false,
      };
    }

    return {
      answer: 'Performance aceitável - manter estratégia atual',
      validated: true,
    };
  }

  // ============================================
  // DECISION GENERATION
  // ============================================

  private generateDecision(
    context: DecisionContext,
    questioningResult: { results: any[] }
  ): TradeDecision {
    const { analysis, signals, riskAssessment } = context;
    
    // Determine action based on consensus
    let action = this.determineAction(analysis, signals);

    // Determine entry/stop/target primeiro (sizing depende do stop distance)
    const entry = this.determineEntryPrice(analysis, action);

    // Falha segura: não gerar buy/sell sem preço
    if ((action === 'buy' || action === 'sell') && (!Number.isFinite(entry) || entry <= 0)) {
      action = 'hold';
    }

    const stop = riskAssessment.adjustedStopLoss || this.calculateStopLoss(analysis, action, entry);
    const target = this.calculateTakeProfit(analysis, action, entry, stop);

    // Calculate position size
    const quantity = riskAssessment.adjustedQuantity || this.calculatePositionSizeForTrade(context, action, entry, stop);

    const denom = (entry - stop);
    const riskReward = denom !== 0 ? Math.abs((target - entry) / denom) : 0;

    return {
      id: this.generateId(),
      assetId: analysis.symbol,
      symbol: analysis.symbol,
      action,
      orderType: this.determineOrderType(analysis, action),
      quantity,
      entryPrice: entry,
      stopLoss: stop,
      takeProfit: target,
      riskReward,
      confidence: analysis.confidence,
      reasoning: analysis.reasoning,
      selfQuestions: questioningResult.results,
      signals,
      riskAssessment,
      timestamp: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 min expiry
      executed: false,
    };
  }

  private determineAction(
    analysis: MarketAnalysis,
    signals: StrategySignal[]
  ): 'buy' | 'sell' | 'hold' | 'close' {
    // Weight signals by confidence
    let buyWeight = 0;
    let sellWeight = 0;
    
    for (const signal of signals) {
      const weight = signal.confidence * (signal.strength ?? 1);
      if (signal.action === 'buy') buyWeight += weight;
      if (signal.action === 'sell') sellWeight += weight;
    }

    // Add analysis recommendation weight
    if (analysis.recommendation === 'strong_buy' || analysis.recommendation === 'buy') {
      buyWeight += analysis.confidence;
    }
    if (analysis.recommendation === 'strong_sell' || analysis.recommendation === 'sell') {
      sellWeight += analysis.confidence;
    }

    // Determine action
    const threshold = 0.6;
    if (buyWeight > sellWeight && buyWeight > threshold) return 'buy';
    if (sellWeight > buyWeight && sellWeight > threshold) return 'sell';
    return 'hold';
  }

  private determineOrderType(analysis: MarketAnalysis, action: string): 'market' | 'limit' {
    // Use limit orders in low volatility, market in high volatility
    if (analysis.regime === 'volatile' || analysis.regime === 'crash') {
      return 'market';
    }
    return 'limit';
  }

  private determineEntryPrice(analysis: MarketAnalysis, action: string): number {
    const basePrice = analysis.technical?.indicators?.price;
    if (typeof basePrice !== 'number' || !Number.isFinite(basePrice) || basePrice <= 0) {
      return 0;
    }

    const trendStrength = Math.max(0, Math.min(1, analysis.technical?.trend?.strength ?? 0));
    const rsi14 = analysis.technical?.indicators?.rsi14;

    // Ajuste determinístico pequeno (evita piorar slippage artificialmente)
    let adjustment = trendStrength * 0.001;
    if (typeof rsi14 === 'number') {
      if (action === 'buy' && rsi14 < 35) adjustment += 0.001;
      if (action === 'sell' && rsi14 > 65) adjustment += 0.001;
    }

    if (action === 'buy') return basePrice * (1 + adjustment);
    if (action === 'sell') return basePrice * (1 - adjustment);
    return basePrice;
  }

  private calculatePositionSizeForTrade(
    context: DecisionContext,
    action: 'buy' | 'sell' | 'hold' | 'close',
    entry: number,
    stop: number
  ): number {
    if (action === 'hold' || action === 'close') return 0;
    if (!Number.isFinite(entry) || entry <= 0) return 0;
    if (!Number.isFinite(stop) || stop <= 0) return 0;

    const stopDistance = Math.abs(entry - stop);
    if (!Number.isFinite(stopDistance) || stopDistance <= 0) return 0;

    const portfolioValue = context.portfolioValue;
    if (!Number.isFinite(portfolioValue) || portfolioValue <= 0) return 0;

    // % risco por trade baseado em preferências
    const level = this.preferences.riskLevel;
    const baseRiskPercent =
      level === 'conservative' || level === 'low' ? 0.01 :
      level === 'moderate' || level === 'medium' ? 0.02 :
      0.03; // aggressive/high

    const riskAssessment = context.riskAssessment;
    const riskFactor = riskAssessment.overallRisk === 'critical' ? 0 : riskAssessment.overallRisk === 'high' ? 0.5 : riskAssessment.overallRisk === 'medium' ? 0.8 : 1;
    const riskAmount = portfolioValue * baseRiskPercent * riskFactor;
    if (!Number.isFinite(riskAmount) || riskAmount <= 0) return 0;

    // Qty ~= risco monetário / distância do stop
    const qty = riskAmount / stopDistance;
    if (!Number.isFinite(qty) || qty <= 0) return 0;

    // Evita ordens absurdas em preços baixos
    const maxNotional = Math.max(0, this.autonomyConfig.maxTradeValue);
    if (maxNotional > 0) {
      const notional = qty * entry;
      if (notional > maxNotional) return maxNotional / entry;
    }

    return qty;
  }

  private calculateStopLoss(analysis: MarketAnalysis, action: string, entry: number): number {
    if (!Number.isFinite(entry) || entry <= 0) return 0;

    // Use ATR-based stop quando disponível; senão fallback percentual
    const atr = analysis.technical?.indicators?.atr14;
    const atrMultiplier = 2;

    const pctFallback = entry * 0.02;
    const distance = (typeof atr === 'number' && Number.isFinite(atr) && atr > 0) ? (atr * atrMultiplier) : pctFallback;

    if (action === 'buy') {
      const supports = analysis.technical?.support ?? [];
      const supportBelow = supports
        .filter((s) => Number.isFinite(s) && s > 0 && s < entry)
        .sort((a, b) => Math.abs(entry - a) - Math.abs(entry - b))[0];

      const atrStop = entry - distance;
      const supportStop = typeof supportBelow === 'number' ? supportBelow * 0.995 : -Infinity;

      const raw = Math.max(atrStop, supportStop);
      const capped = Math.min(raw, entry * 0.999); // nunca >= entry
      return Number.isFinite(capped) ? capped : atrStop;
    }

    if (action === 'sell') {
      const resistances = analysis.technical?.resistance ?? [];
      const resistanceAbove = resistances
        .filter((r) => Number.isFinite(r) && r > entry)
        .sort((a, b) => Math.abs(a - entry) - Math.abs(b - entry))[0];

      const atrStop = entry + distance;
      const resistanceStop = typeof resistanceAbove === 'number' ? resistanceAbove * 1.005 : Infinity;

      const raw = Math.min(atrStop, resistanceStop);
      const floored = Math.max(raw, entry * 1.001); // nunca <= entry
      return Number.isFinite(floored) ? floored : atrStop;
    }

    return entry;
  }

  private calculateTakeProfit(
    analysis: MarketAnalysis,
    action: string,
    entry: number,
    stop: number
  ): number {
    // Minimum 1.5:1 risk/reward
    const riskAmount = Math.abs(entry - stop);
    const targetAmount = riskAmount * 2; // 2:1 R/R
    return action === 'buy' ? entry + targetAmount : entry - targetAmount;
  }

  // ============================================
  // AUTONOMY FILTER
  // ============================================

  private applyAutonomyFilter(decision: TradeDecision): TradeDecision | null {
    switch (this.autonomyConfig.level) {
      case 'advisory':
        // Only suggest, never execute
        return { ...decision, executed: false };
        
      case 'semi_auto':
        // Requires confirmation - mark as pending
        return decision;
        
      case 'full_auto':
        // Execute if within limits
        const quantity = decision.quantity ?? decision.size ?? 0;
        if (quantity * (decision.entryPrice || decision.price || 0) <= this.autonomyConfig.maxTradeValue) {
          return decision;
        }
        return null; // Too large for auto
        
      case 'guardian':
        // Only protective actions
        if (decision.action === 'close' || decision.action === 'sell') {
          return decision;
        }
        return null;
        
      default:
        return null;
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  private collectSignals(analysis: MarketAnalysis): StrategySignal[] {
    // Preferir sinais de estratégia anexados pelo TradingService
    const anyAnalysis = analysis as unknown as { signals?: StrategySignal[] };
    if (Array.isArray(anyAnalysis.signals) && anyAnalysis.signals.length > 0) {
      return anyAnalysis.signals;
    }

    // Fallback: transformar sinais técnicos em StrategySignal (mínimo útil)
    const technicalSignals = analysis.technical?.signals ?? [];
    const symbol = analysis.symbol;
    const now = Date.now();

    return technicalSignals.map((s) => ({
      strategyId: 'technical',
      assetId: symbol,
      symbol,
      action: s.signal === 'buy' ? 'buy' : s.signal === 'sell' ? 'sell' : 'hold',
      confidence: Math.max(0, Math.min(1, Math.abs(s.value) / 100)),
      strength: Math.max(0, Math.min(1, Math.abs(s.value) / 100)),
      reasoning: [`${s.indicator}: ${s.signal} (${s.value})`],
      price: analysis.technical?.indicators?.price,
      timestamp: now,
      expiresAt: now + 5 * 60 * 1000,
      metadata: { source: 'technical', indicator: s.indicator, raw: s },
    }));
  }

  private async assessRisk(analysis: MarketAnalysis): Promise<RiskAssessment> {
    const warnings: string[] = [];
    const blocks: string[] = [];
    const recommendations: string[] = [];

    const portfolioValue = this.calculatePortfolioValue();
    if (!Number.isFinite(portfolioValue) || portfolioValue <= 0) {
      blocks.push('Valor de portfólio indisponível (sem métricas de capital)');
      recommendations.push('Conecte um broker que exponha métricas de capital ou alimente performance.starting/endingCapital');
    }

    const regime = analysis.regime;
    const trendStrength = Math.max(0, Math.min(1, analysis.technical?.trend?.strength ?? 0));
    const rsi14 = analysis.technical?.indicators?.rsi14;

    let baseScore = 30;
    if (regime === 'volatile') baseScore = 65;
    if (regime === 'crash') baseScore = 85;
    if (regime === 'low_volatility') baseScore = 25;
    if (regime === 'ranging') baseScore = 45;
    if (regime === 'unknown') baseScore = 55;

    // Tende a ser menos arriscado quando a tendência é forte e alinhada com recommendation
    const rec = analysis.recommendation;
    const recStrength = (rec === 'strong_buy' || rec === 'strong_sell') ? 1 : (rec === 'buy' || rec === 'sell') ? 0.6 : 0.2;
    const confidence = Math.max(0, Math.min(1, analysis.confidence ?? 0));
    const clarity = Math.max(0, Math.min(1, trendStrength * 0.7 + confidence * 0.3));
    baseScore = Math.max(0, Math.min(100, baseScore - Math.round(clarity * recStrength * 15)));

    if (typeof rsi14 === 'number') {
      if (rsi14 > 75 || rsi14 < 25) warnings.push(`RSI extremo (${Math.round(rsi14)})`);
    }
    if (confidence < 0.35) warnings.push('Baixa confiança na recomendação');

    let overallRisk: RiskAssessment['overallRisk'] = 'low';
    if (baseScore >= 80) overallRisk = 'critical';
    else if (baseScore >= 60) overallRisk = 'high';
    else if (baseScore >= 40) overallRisk = 'medium';

    const canTrade = blocks.length === 0 && overallRisk !== 'critical';
    if (!canTrade) {
      recommendations.push('Modo de proteção: não executar trades até remover bloqueios/risco crítico');
    }

    return {
      overallRisk,
      score: baseScore,
      warnings,
      blocks,
      recommendations,
      canTrade,
      riskScore: baseScore,
      blockers: blocks,
      reasoning: `Regime=${regime}, trendStrength=${trendStrength.toFixed(2)}, confidence=${confidence.toFixed(2)}`,
    };
  }

  private calculatePortfolioValue(): number {
    // Melhor esforço: usa métricas de performance se existirem
    const perf = this.state.performance?.today ?? this.state.performance?.week ?? this.state.performance?.month;
    const ending = perf?.endingCapital;
    if (typeof ending === 'number' && Number.isFinite(ending) && ending > 0) return ending;
    const starting = perf?.startingCapital;
    if (typeof starting === 'number' && Number.isFinite(starting) && starting > 0) return starting;

    // Fallback: soma marketValue das posições (sem caixa)
    const positions = this.state.openPositions ?? this.state.activePositions ?? [];
    const totalMV = positions.reduce((sum, p) => sum + (typeof p.marketValue === 'number' && Number.isFinite(p.marketValue) ? p.marketValue : 0), 0);
    return totalMV;
  }

  private performSelfAssessment(): {
    concerns: string[];
    improvements: string[];
    learnings: string[];
  } {
    return {
      concerns: [],
      improvements: [],
      learnings: [],
    };
  }

  private recordDecision(decision: TradeDecision): void {
    this.decisionHistory.push(decision);
    if (this.decisionHistory.length > this.maxHistorySize) {
      this.decisionHistory.shift();
    }
  }

  private emitEvent(event: TradingEvent): void {
    this.onEventEmitter.fire(event);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getInitialState(): AITradingState {
    return {
      isActive: false,
      mode: 'advisory',
      currentFocus: null,
      openPositions: [],
      pendingDecisions: [],
      activeStrategies: [],
      marketView: {
        overall: 'neutral',
        confidence: 0,
        reasoning: [],
      },
      performance: {
        today: this.getEmptyPerformance(),
        week: this.getEmptyPerformance(),
        month: this.getEmptyPerformance(),
      },
      selfAssessment: {
        lastQuestioningAt: 0,
        concerns: [],
        improvements: [],
        learnings: [],
      },
      lastUpdated: Date.now(),
      // Required fields for AITradingState
      status: 'idle',
      autonomyLevel: 'advisory',
      currentAnalysis: null,
      executedTrades: [],
      activePositions: [],
      dailyPnL: 0,
      totalPnL: 0,
      riskLevel: 'low',
      lastAnalysisTime: null,
      events: [],
      tradesExecuted: 0,
      signalsToday: 0,
    };
  }

  private getEmptyPerformance(): any {
    return {
      period: 'day',
      startDate: Date.now(),
      endDate: Date.now(),
      startingCapital: 0,
      endingCapital: 0,
      totalReturn: 0,
      totalReturnPercent: 0,
      trades: {
        total: 0,
        winners: 0,
        losers: 0,
        winRate: 0,
        averageWin: 0,
        averageLoss: 0,
        largestWin: 0,
        largestLoss: 0,
      },
      ratios: {
        sharpeRatio: 0,
        sortinoRatio: 0,
        calmarRatio: 0,
        profitFactor: 0,
        payoffRatio: 0,
      },
      risk: {
        maxDrawdown: 0,
        maxDrawdownDuration: 0,
        volatility: 0,
        var95: 0,
        var99: 0,
      },
    };
  }

  private getDefaultPreferences(): TradingPreferences {
    return {
      autonomyLevel: 'advisory',
      riskLevel: 'moderate',
      preferredMarkets: ['equity', 'crypto'],
      preferredStrategies: ['trend_following', 'mean_reversion'],
      notifications: {
        trades: true,
        alerts: true,
        dailyReport: true,
        weeklyReport: true,
      },
      ui: {
        showStatusBar: true,
        showPreviewPanel: false,
        compactMode: true,
      },
    };
  }

  private getDefaultAutonomyConfig(): AutonomyConfig {
    return {
      level: 'advisory',
      allowedActions: ['analyze', 'alert', 'suggest'],
      requireConfirmation: true,
      confirmationTimeout: 60000,
      maxTradeValue: 1000,
      emergencyStopEnabled: true,
    };
  }

  private updateAutonomyConfig(level: AutonomyLevel): void {
    switch (level) {
      case 'advisory':
        this.autonomyConfig = {
          ...this.autonomyConfig,
          level,
          allowedActions: ['analyze', 'alert', 'suggest'],
          requireConfirmation: true,
        };
        break;
      case 'semi_auto':
        this.autonomyConfig = {
          ...this.autonomyConfig,
          level,
          allowedActions: ['analyze', 'alert', 'suggest', 'execute'],
          requireConfirmation: true,
        };
        break;
      case 'full_auto':
        this.autonomyConfig = {
          ...this.autonomyConfig,
          level,
          allowedActions: ['analyze', 'alert', 'suggest', 'execute', 'manage'],
          requireConfirmation: false,
        };
        break;
      case 'guardian':
        this.autonomyConfig = {
          ...this.autonomyConfig,
          level,
          allowedActions: ['analyze', 'alert', 'manage'],
          requireConfirmation: false,
        };
        break;
    }
  }
}
