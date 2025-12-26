/**
 * Trading Service - Orchestrador Principal
 * Integra todos os componentes do sistema de trading
 */

import { injectable, inject } from 'inversify';
import { EventEmitter } from 'events';
import { TradingAIBrain } from './trading-ai-brain';
import { AntiDetectionSystem } from './anti-detection-system';
import { RiskManager } from './risk-manager';
import { StrategyEngine, StrategyInput } from './strategy-engine';
import { IBroker, BaseBroker, PaperBroker } from './broker-interface';
import {
  AITradingState,
  TradingEvent,
  TradeDecision,
  Position,
  OrderRequest,
  Order,
  Quote,
  Asset,
  AutonomyLevel,
  MarketAnalysis,
  TechnicalAnalysis,
  MarketRegime,
  StrategySignal,
} from './trading-types';

export interface TradingServiceConfig {
  autonomyLevel: AutonomyLevel;
  activeBrokers: string[];
  activeStrategies: string[];
  paperTrading: boolean;
  maxConcurrentPositions: number;
  defaultAssets: string[];
}

/**
 * Trading Service - Main Orchestrator
 */
@injectable()
export class TradingService extends EventEmitter {
  private config: TradingServiceConfig;
  private aiBrain: TradingAIBrain;
  private antiDetection: AntiDetectionSystem;
  private riskManager: RiskManager;
  private strategyEngine: StrategyEngine;
  private brokers: Map<string, IBroker> = new Map();
  private activeBroker: IBroker | null = null;
  
  private state: AITradingState;
  private isRunning: boolean = false;
  private analysisInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    
    // Initialize components
    this.aiBrain = new TradingAIBrain();
    this.antiDetection = new AntiDetectionSystem();
    this.riskManager = new RiskManager();
    this.strategyEngine = new StrategyEngine();
    
    // Default config
    this.config = this.getDefaultConfig();
    
    // Initialize state
    this.state = this.getInitialState();

    // Setup event listeners
    this.setupEventListeners();

    // Register paper broker for paper trading
    this.registerBroker(new PaperBroker());
  }

  // ============================================
  // PUBLIC API - Configuration
  // ============================================

  /**
   * Initialize trading service
   */
  async initialize(): Promise<void> {
    this.emit('initializing');

    // Connect to default broker
    if (this.config.paperTrading) {
      await this.setActiveBroker('paper');
    }

    // Activate default strategies
    for (const strategyId of this.config.activeStrategies) {
      this.strategyEngine.activateStrategy(strategyId);
    }

    // Set initial equity
    if (this.activeBroker) {
      const balance = await this.activeBroker.getBalance();
      this.riskManager.setEquity(balance.total);
    }

    this.emit('initialized');
  }

  /**
   * Set autonomy level
   */
  setAutonomyLevel(level: AutonomyLevel): void {
    this.config.autonomyLevel = level;
    this.aiBrain.setAutonomyLevel(level);
    this.emit('autonomyLevelChanged', level);
  }

  /**
   * Register a broker
   */
  registerBroker(broker: IBroker): void {
    this.brokers.set(broker.id, broker);
    this.emit('brokerRegistered', broker.id);
  }

  /**
   * Set active broker
   */
  async setActiveBroker(brokerId: string): Promise<boolean> {
    const broker = this.brokers.get(brokerId);
    if (!broker) return false;

    if (this.activeBroker) {
      await this.activeBroker.disconnect();
    }

    await broker.connect();
    this.activeBroker = broker;
    this.emit('brokerChanged', brokerId);
    
    return true;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TradingServiceConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('configUpdated', this.config);
  }

  // ============================================
  // PUBLIC API - Trading Operations
  // ============================================

  /**
   * Start automated trading
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    
    // Check if trading is allowed
    const tradingAllowed = this.riskManager.isTradingAllowed();
    if (!tradingAllowed.allowed) {
      this.emit('tradingBlocked', tradingAllowed.reason);
      return;
    }

    const timeAllowed = this.antiDetection.isTradingTimeAllowed();
    if (!timeAllowed.allowed) {
      this.emit('tradingBlocked', timeAllowed.reason);
      return;
    }

    this.isRunning = true;
    this.state.isActive = true;
    this.aiBrain.updateState({ isActive: true });
    
    // Start analysis loop
    this.startAnalysisLoop();

    this.emit('started');
    this.recordEvent('system', 'Trading iniciado');
  }

  /**
   * Stop automated trading
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.state.isActive = false;
    this.aiBrain.updateState({ isActive: false });

    // Stop analysis loop
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }

    this.emit('stopped');
    this.recordEvent('system', 'Trading parado');
  }

  /**
   * Emergency stop: para o loop, cancela ordens abertas e tenta zerar posições.
   * Melhor-esforço: falhas individuais não interrompem o processo.
   */
  async emergencyStop(reason: string = 'Emergency stop'): Promise<{ cancelledOrders: number; closeOrders: number; errors: string[] }> {
    const errors: string[] = [];

    // Stop analysis loop immediately
    this.isRunning = false;
    this.state.isActive = false;
    this.state.status = 'idle';
    this.aiBrain.updateState({ isActive: false });
    this.state.pendingDecisions = [];

    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }

    this.recordEvent('circuit_breaker', reason);

    if (!this.activeBroker) {
      return { cancelledOrders: 0, closeOrders: 0, errors };
    }

    // Cancel open/pending orders
    let cancelledOrders = 0;
    try {
      const orders = await this.activeBroker.getOrders();
      const toCancel = orders.filter(o => o.status === 'open' || o.status === 'pending');
      for (const order of toCancel) {
        try {
          const ok = await this.activeBroker.cancelOrder(order.id);
          if (ok) cancelledOrders++;
        } catch (e: any) {
          errors.push(`cancelOrder(${order.id}): ${e?.message ?? String(e)}`);
        }
      }
    } catch (e: any) {
      errors.push(`getOrders(): ${e?.message ?? String(e)}`);
    }

    // Close positions (flatten)
    let closeOrders = 0;
    try {
      const positions = await this.activeBroker.getPositions();
      for (const p of positions) {
        const qty = Math.abs(p.quantity);
        if (!Number.isFinite(qty) || qty <= 0) continue;
        if (p.side === 'flat') continue;

        const side = p.side === 'long' ? 'sell' : 'buy';
        try {
          await this.activeBroker.placeOrder({
            assetId: p.assetId,
            type: 'market',
            side,
            quantity: qty,
            timeInForce: 'day',
            metadata: { reason: 'emergencyStop', positionId: p.id },
          });
          closeOrders++;
        } catch (e: any) {
          errors.push(`closePosition(${p.assetId}): ${e?.message ?? String(e)}`);
        }
      }
    } catch (e: any) {
      errors.push(`getPositions(): ${e?.message ?? String(e)}`);
    }

    return { cancelledOrders, closeOrders, errors };
  }

  getBrokerConnectionStatus(): { connected: boolean; latency?: number; error?: string } {
    if (!this.activeBroker) return { connected: false, error: 'Nenhum broker conectado' };
    const status = this.activeBroker.getConnectionStatus();
    return { connected: status.connected, latency: status.latency, error: status.error };
  }

  isPaperTradingEnabled(): boolean {
    return !!this.config.paperTrading;
  }

  getPnLSummary(): ReturnType<typeof this.riskManager.getPnLSummary> {
    return this.riskManager.getPnLSummary();
  }

  getCircuitBreakerStatus(): ReturnType<typeof this.riskManager.getCircuitBreakerStatus> {
    return this.riskManager.getCircuitBreakerStatus();
  }

  getRiskParameters(): ReturnType<typeof this.riskManager.getParameters> {
    return this.riskManager.getParameters();
  }

  getActiveStrategiesSnapshot(): Array<{ id: string; name: string; performance: number; lastSignal: string }> {
    const active = this.strategyEngine.getActiveStrategies();
    return active.map(s => {
      const perf = s.getPerformance?.();
      const perfValue =
        typeof perf?.profitFactor === 'number' ? perf.profitFactor :
        typeof perf?.winRate === 'number' ? perf.winRate :
        typeof perf?.sharpeRatio === 'number' ? perf.sharpeRatio :
        0;
      const lastSignal = (this.strategyEngine.getSignalHistory(s.id, 1)[0]?.action ?? 'n/a');
      return { id: s.id, name: s.name ?? s.id, performance: perfValue, lastSignal };
    });
  }

  /**
   * Process a manual trade request
   */
  async requestTrade(
    assetId: string,
    action: 'buy' | 'sell',
    quantity?: number,
    options?: { price?: number; stopLoss?: number; takeProfit?: number }
  ): Promise<{ success: boolean; order?: Order; reason?: string }> {
    if (!this.activeBroker) {
      return { success: false, reason: 'Nenhum broker conectado' };
    }

    // Get current quote
    const quote = await this.activeBroker.getQuote(assetId);
    const positions = await this.activeBroker.getPositions();

    // Create decision for risk assessment
    const decision: TradeDecision = {
      assetId,
      action,
      confidence: 1.0, // Manual trade
      price: options?.price || quote.last,
      stopLoss: options?.stopLoss,
      takeProfit: options?.takeProfit,
      size: quantity,
      timestamp: new Date(),
      reasoning: ['Operação manual solicitada pelo usuário'],
      strategySource: 'manual',
    };

    // Assess risk
    const riskAssessment = this.riskManager.assessTradeRisk(decision, positions);
    if (riskAssessment.blocks.length > 0) {
      return { success: false, reason: riskAssessment.blocks.join('; ') };
    }

    // Execute order
    return await this.executeDecision(decision);
  }

  /**
   * Confirma e executa uma decisão pendente (modo semi_auto).
   */
  async confirmPendingDecision(index: number = 0): Promise<{ success: boolean; order?: Order; reason?: string }> {
    const pending = this.state.pendingDecisions ?? [];
    if (pending.length === 0) return { success: false, reason: 'Nenhuma decisão pendente' };
    if (index < 0 || index >= pending.length) return { success: false, reason: 'Índice de decisão pendente inválido' };

    const decision = pending[index];
    const result = await this.executeDecision(decision);

    // Remove da fila independentemente de sucesso (evita repetição acidental)
    this.state.pendingDecisions = pending.filter((_, i) => i !== index);
    return result;
  }

  /**
   * Rejeita (remove) uma decisão pendente (modo semi_auto).
   */
  rejectPendingDecision(index: number = 0): { success: boolean; reason?: string } {
    const pending = this.state.pendingDecisions ?? [];
    if (pending.length === 0) return { success: false, reason: 'Nenhuma decisão pendente' };
    if (index < 0 || index >= pending.length) return { success: false, reason: 'Índice de decisão pendente inválido' };

    this.state.pendingDecisions = pending.filter((_, i) => i !== index);
    return { success: true };
  }

  /**
   * Executa uma análise pontual (não executa trades automaticamente).
   * Útil para UX/CLI: retorna uma sugestão (TradeDecision) se houver.
   */
  async analyzeOnce(assetId: string): Promise<TradeDecision | null> {
    const wasRunning = this.isRunning;
    const wasActive = this.state.isActive;
    try {
      if (!wasRunning) {
        // habilita somente para permitir decisões do AI brain
        this.state.isActive = true;
        this.aiBrain.updateState({ isActive: true });
      }
      return await this.analyzeAsset(assetId);
    } finally {
      if (!wasRunning) {
        this.state.isActive = wasActive;
        this.aiBrain.updateState({ isActive: wasActive });
      }
    }
  }

  /**
   * Get current state
   */
  getState(): AITradingState {
    return { ...this.state };
  }

  /**
   * Get positions
   */
  async getPositions(): Promise<Position[]> {
    if (!this.activeBroker) return [];
    return await this.activeBroker.getPositions();
  }

  /**
   * Get orders
   */
  async getOrders(status?: string): Promise<Order[]> {
    if (!this.activeBroker) return [];
    return await this.activeBroker.getOrders(status);
  }

  /**
   * Get portfolio metrics
   */
  async getPortfolioMetrics(): Promise<ReturnType<typeof this.riskManager.getPortfolioMetrics>> {
    const positions = await this.getPositions();
    return this.riskManager.getPortfolioMetrics(positions);
  }

  /**
   * Get anti-detection metrics
   */
  getAntiDetectionMetrics(): ReturnType<typeof this.antiDetection.getMetrics> {
    return this.antiDetection.getMetrics();
  }

  /**
   * Get event history
   */
  getEventHistory(limit: number = 100): TradingEvent[] {
    return this.state.events.slice(-limit);
  }

  // ============================================
  // PRIVATE METHODS - Analysis & Execution
  // ============================================

  private startAnalysisLoop(): void {
    // Run analysis every 30 seconds by default
    // In production, this would be more sophisticated
    const intervalMs = 30000;

    this.analysisInterval = setInterval(async () => {
      if (!this.isRunning) return;
      
      try {
        await this.runAnalysisCycle();
      } catch (error) {
        this.emit('error', error);
        this.recordEvent('error', `Erro no ciclo de análise: ${error}`);
      }
    }, intervalMs);

    // Run immediately
    this.runAnalysisCycle();
  }

  private async runAnalysisCycle(): Promise<void> {
    if (!this.activeBroker) return;

    // Check if we should trade
    const canAct = this.antiDetection.canPerformAction();
    if (!canAct.allowed) {
      this.state.status = 'cooldown';
      return;
    }

    const timeAllowed = this.antiDetection.isTradingTimeAllowed();
    if (!timeAllowed.allowed) {
      this.state.status = 'outside_hours';
      return;
    }

    this.state.status = 'analyzing';

    // Analyze each asset
    for (const assetId of this.config.defaultAssets) {
      try {
        const analysis = await this.analyzeAsset(assetId);
        if (analysis) {
          await this.processAnalysisResult(analysis);
        }
      } catch (error) {
        this.emit('assetError', { assetId, error });
      }
    }

    this.state.status = 'active';
    this.state.lastAnalysisTime = new Date();
  }

  private async analyzeAsset(assetId: string): Promise<TradeDecision | null> {
    if (!this.activeBroker) return null;

    // Get market data
    const [asset, quote, candles, positions] = await Promise.all([
      this.activeBroker.getAsset(assetId),
      this.activeBroker.getQuote(assetId),
      this.activeBroker.getOHLCV(assetId, '1h', 100),
      this.activeBroker.getPositions(),
    ]);

    // Prepare strategy input
    const input: StrategyInput = {
      asset,
      quotes: [quote],
      candles,
    };

    // Generate strategy signals
    const signals = await this.strategyEngine.generateSignals(input);
    const ensembleSignal = this.strategyEngine.getEnsembleSignal(signals);

    if (!ensembleSignal || ensembleSignal.action === 'hold') {
      return null;
    }

    const analysis = this.buildMarketAnalysis(quote, candles, signals);
    // Carrega os strategy signals como anexo (o AI brain lê via cast seguro)
    (analysis as unknown as { signals: StrategySignal[] }).signals = signals;

    // Let AI brain make final decision
    const decisions = await this.aiBrain.processAnalysis(analysis);
    const decisionArray = Array.isArray(decisions) ? decisions : (decisions ? [decisions] : []);
    
    return decisionArray[0] || null;
  }

  private async processAnalysisResult(decision: TradeDecision): Promise<void> {
    // Add human-like delay
    const delay = this.antiDetection.getHumanizedDelay();
    await new Promise(resolve => setTimeout(resolve, delay));

    // Assess risk
    const positions = await this.getPositions();
    const riskAssessment = this.riskManager.assessTradeRisk(decision, positions);

    // Record analysis
    this.recordEvent('analysis', 
      `${decision.assetId}: ${decision.action} (conf: ${(decision.confidence * 100).toFixed(0)}%, risk: ${riskAssessment.overallRisk})`
    );

    // Check if blocked
    if (riskAssessment.blocks.length > 0) {
      this.recordEvent('blocked', riskAssessment.blocks.join('; '));
      return;
    }

    // Check autonomy level
    if (this.config.autonomyLevel === 'advisory') {
      // Just emit suggestion, don't execute
      this.emit('tradeSuggestion', decision);
      return;
    }

    if (this.config.autonomyLevel === 'semi_auto') {
      // Emit for confirmation
      this.state.pendingDecisions.push(decision);
      this.emit('tradeConfirmationRequired', decision);
      return;
    }

    // Full auto or guardian mode - execute
    await this.executeDecision(decision);
  }

  private async executeDecision(decision: TradeDecision): Promise<{ success: boolean; order?: Order; reason?: string }> {
    if (!this.activeBroker) {
      return { success: false, reason: 'Nenhum broker conectado' };
    }

    // Build order request
    const quantity = decision.quantity ?? decision.size ?? 1;
    const price = decision.price ?? decision.entryPrice;
    const orderType = decision.orderType ?? (price ? 'limit' : 'market');

    const orderRequest: OrderRequest = {
      assetId: decision.assetId,
      type: orderType,
      side: decision.action === 'buy' ? 'buy' : 'sell',
      quantity,
      price,
      stopLoss: decision.stopLoss,
      takeProfit: decision.takeProfit,
      timeInForce: 'day',
    };

    // Humanize order
    const humanizedOrders = this.antiDetection.humanizeOrder(orderRequest);

    // Execute orders
    const orders: Order[] = [];
    for (const order of humanizedOrders) {
      try {
        // Add delay between chunked orders
        if (orders.length > 0) {
          const chunkDelay = this.antiDetection.getHumanizedDelay();
          await new Promise(resolve => setTimeout(resolve, chunkDelay));
        }

        const executedOrder = await this.activeBroker.placeOrder(order);
        orders.push(executedOrder);
        
        this.antiDetection.recordAction();
        this.state.tradesExecuted++;
        
        this.recordEvent('order', 
          `${order.side.toUpperCase()} ${order.quantity} ${order.assetId} @ ${order.price || 'MARKET'}`
        );
      } catch (error: any) {
        this.recordEvent('error', `Erro ao executar ordem: ${error.message}`);
        return { success: false, reason: error.message };
      }
    }

    // Return first order (or consolidated)
    return { success: true, order: orders[0] };
  }

  private buildTechnicalAnalysis(candles: any[], quote: Quote, timeframe: string): TechnicalAnalysis {
    const closes = candles.map(c => c.close as number).filter(n => Number.isFinite(n));
    const highs = candles.map(c => c.high as number).filter(n => Number.isFinite(n));
    const lows = candles.map(c => c.low as number).filter(n => Number.isFinite(n));
    const opens = candles.map(c => c.open as number).filter(n => Number.isFinite(n));

    const sma = (period: number): number => {
      const slice = closes.slice(-period);
      if (slice.length === 0) return quote.last;
      return slice.reduce((a, b) => a + b, 0) / slice.length;
    };

    const sma20 = sma(20);
    const sma50 = sma(50);

    const direction: TechnicalAnalysis['trend']['direction'] = sma20 > sma50 ? 'up' : (sma20 < sma50 ? 'down' : 'sideways');
    const strengthRaw = quote.last ? Math.abs(sma20 - sma50) / quote.last : 0;
    const strength = Math.max(0, Math.min(1, strengthRaw * 10));

    // Trend duration: quantos candles finais seguem a mesma direção (aproximação simples)
    let duration = 0;
    for (let i = closes.length - 1; i >= 1; i--) {
      const delta = closes[i] - closes[i - 1];
      const dir = delta > 0 ? 'up' : (delta < 0 ? 'down' : 'sideways');
      if (dir === direction || (direction === 'sideways' && dir === 'sideways')) duration++;
      else break;
    }

    // RSI 14 (simples)
    const rsi14 = (() => {
      const period = 14;
      const slice = closes.slice(-(period + 1));
      if (slice.length < period + 1) return 50;
      let gains = 0;
      let losses = 0;
      for (let i = 1; i < slice.length; i++) {
        const change = slice[i] - slice[i - 1];
        if (change > 0) gains += change;
        else losses += Math.abs(change);
      }
      const avgGain = gains / period;
      const avgLoss = losses / period;
      if (avgLoss === 0) return 100;
      const rs = avgGain / avgLoss;
      return 100 - 100 / (1 + rs);
    })();

    // ATR 14 (simples, via True Range)
    const atr14 = (() => {
      const period = 14;
      if (highs.length < 2 || lows.length < 2 || closes.length < 2) return 0;
      const tr: number[] = [];
      const start = Math.max(1, highs.length - (period + 1));
      for (let i = start; i < highs.length; i++) {
        const high = highs[i];
        const low = lows[i];
        const prevClose = closes[i - 1] ?? closes[i] ?? 0;
        const trueRange = Math.max(
          high - low,
          Math.abs(high - prevClose),
          Math.abs(low - prevClose)
        );
        if (Number.isFinite(trueRange)) tr.push(trueRange);
      }
      if (tr.length === 0) return 0;
      return tr.reduce((a, b) => a + b, 0) / tr.length;
    })();

    const window = 20;
    const recentHigh = highs.slice(-window);
    const recentLow = lows.slice(-window);
    const resistance = recentHigh.length ? [Math.max(...recentHigh)] : [];
    const support = recentLow.length ? [Math.min(...recentLow)] : [];

    const signals: TechnicalAnalysis['signals'] = [];
    // MA crossover signal
    if (strength > 0.15) {
      signals.push({
        indicator: 'SMA_CROSS',
        signal: direction === 'up' ? 'buy' : direction === 'down' ? 'sell' : 'neutral',
        value: strength,
      });
    }
    // RSI signal
    signals.push({
      indicator: 'RSI_14',
      signal: rsi14 < 30 ? 'buy' : rsi14 > 70 ? 'sell' : 'neutral',
      value: rsi14,
    });

    return {
      symbol: quote.symbol,
      timeframe,
      trend: { direction, strength, duration },
      indicators: {
        price: quote.last,
        sma20,
        sma50,
        rsi14,
        atr14,
      },
      patterns: [],
      support,
      resistance,
      signals,
      timestamp: Date.now(),
    };
  }

  private estimateMarketRegime(technical: TechnicalAnalysis, candles: any[]): MarketRegime {
    const closes = candles.map(c => c.close as number).filter(n => Number.isFinite(n));
    const returns: number[] = [];
    for (let i = Math.max(1, closes.length - 21); i < closes.length; i++) {
      const prev = closes[i - 1];
      const cur = closes[i];
      if (!prev || !cur) continue;
      returns.push((cur - prev) / prev);
    }
    const mean = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const variance = returns.length
      ? returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length
      : 0;
    const vol = Math.sqrt(variance);

    if (vol >= 0.05 && technical.trend.direction === 'down') return 'crash';
    if (vol >= 0.03) return 'volatile';
    if (vol <= 0.01 && technical.trend.strength >= 0.3) {
      return technical.trend.direction === 'up' ? 'trending_up' : technical.trend.direction === 'down' ? 'trending_down' : 'low_volatility';
    }
    if (technical.trend.strength >= 0.5) {
      return technical.trend.direction === 'up' ? 'trending_up' : technical.trend.direction === 'down' ? 'trending_down' : 'ranging';
    }
    return vol <= 0.01 ? 'low_volatility' : 'ranging';
  }

  private buildMarketAnalysis(quote: Quote, candles: any[], signals: StrategySignal[]): MarketAnalysis {
    const timeframe = '1h';
    const technical = this.buildTechnicalAnalysis(candles, quote, timeframe);
    const regime = this.estimateMarketRegime(technical, candles);

    const signalSummary = signals
      .slice(0, 6)
      .map(s => `${s.strategyId}: ${s.action} (${Math.round(s.confidence * 100)}%)`);

    // Recomendações: usar consenso simples
    const buy = signals.filter(s => s.action === 'buy').reduce((a, s) => a + s.confidence, 0);
    const sell = signals.filter(s => s.action === 'sell').reduce((a, s) => a + s.confidence, 0);
    const hold = signals.filter(s => s.action === 'hold').reduce((a, s) => a + s.confidence, 0);
    const total = buy + sell + hold;
    const net = total > 0 ? (buy - sell) / total : 0;
    const confidence = Math.max(0, Math.min(1, Math.abs(net)));

    let recommendation: MarketAnalysis['recommendation'] = 'hold';
    if (net > 0.25) recommendation = confidence > 0.75 ? 'strong_buy' : 'buy';
    if (net < -0.25) recommendation = confidence > 0.75 ? 'strong_sell' : 'sell';

    const overallScore = Math.max(0, Math.min(1, (net + 1) / 2));

    return {
      symbol: quote.symbol,
      technical,
      regime,
      overallScore,
      recommendation,
      confidence,
      reasoning: [
        `Regime: ${regime}`,
        `Preço: ${quote.last}`,
        ...signalSummary,
      ],
      timestamp: Date.now(),
    };
  }

  // ============================================
  // PRIVATE METHODS - Event Handling
  // ============================================

  private setupEventListeners(): void {
    // AI Brain events are handled via processAnalysis return values
    // TradingAIBrain doesn't use EventEmitter pattern directly

    // Risk Manager events
    this.riskManager.on('circuitBreakerTriggered', ({ type, reason }: { type: string; reason: string }) => {
      this.recordEvent('circuit_breaker', `${type}: ${reason}`);
      this.emit('circuitBreaker', { type, reason });

      // Em produção, um circuit breaker crítico deve interromper ações e reduzir risco.
      // Aqui: best-effort emergency stop.
      this.emergencyStop(`${type}: ${reason}`).catch(() => undefined);
    });

    this.riskManager.on('riskEvent', (event) => {
      if (event.severity === 'critical') {
        this.recordEvent('risk_critical', event.message);
      }
    });

    // Strategy Engine events
    this.strategyEngine.on('signalsGenerated', (signals) => {
      this.state.signalsToday += signals.length;
    });
  }

  private recordEvent(type: TradingEvent['type'], message: string): void {
    const event: TradingEvent = {
      type,
      timestamp: new Date(),
      data: { message },
    };

    this.state.events.push(event);
    
    // Keep only last 1000 events
    if (this.state.events.length > 1000) {
      this.state.events = this.state.events.slice(-1000);
    }

    this.emit('event', event);
  }

  // ============================================
  // PRIVATE METHODS - Initialization
  // ============================================

  private getDefaultConfig(): TradingServiceConfig {
    return {
      autonomyLevel: 'advisory',
      activeBrokers: ['paper'],
      activeStrategies: ['trend_following', 'mean_reversion', 'momentum'],
      paperTrading: true,
      maxConcurrentPositions: 5,
      defaultAssets: ['AAPL', 'GOOGL', 'MSFT', 'BTC-USD'],
    };
  }

  private getInitialState(): AITradingState {
    return {
      isActive: false,
      status: 'idle',
      autonomyLevel: 'advisory',
      currentAnalysis: null,
      pendingDecisions: [],
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
}

// Export singleton instance for easy use
export const tradingService = new TradingService();
