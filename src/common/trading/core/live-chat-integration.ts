/**
 * LivePreview & Chat Integration
 * Sistema de integração com LivePreview e Chat para trading
 * Permite IAs trabalharem junto com usuários e suas corretoras
 */

import { EventEmitter } from 'events';
import {
  Position,
  Order,
  Quote,
  OHLCV,
  TradeDecision,
  AccountInfo,
  RiskLevel,
} from './trading-types';
import { MarketSnapshot, OpportunityAssessment, AIDecisionContext } from './ai-market-vision';
import { RankedOpportunity, PortfolioOptimization } from './profit-optimizer';
import { BacktestResult, BacktestMetrics } from './backtesting-engine';

// ============================================
// LIVE PREVIEW TYPES
// ============================================

export interface LivePreviewConfig {
  // Display settings
  refreshRate: number; // ms
  showIndicators: boolean;
  showPatterns: boolean;
  showSignals: boolean;
  showPositions: boolean;
  showOrders: boolean;
  
  // Chart settings
  chartType: 'candlestick' | 'line' | 'heikin-ashi' | 'renko';
  defaultTimeframe: string;
  showVolume: boolean;
  darkMode: boolean;
  
  // Overlay settings
  showSupportResistance: boolean;
  showTrendlines: boolean;
  showFibonacci: boolean;
  showPivotPoints: boolean;
  
  // Notification settings
  alertOnSignal: boolean;
  alertOnExecution: boolean;
  alertOnRiskThreshold: boolean;
  
  // Interactivity
  allowManualTrades: boolean;
  requireConfirmation: boolean;
  showAIReasoning: boolean;
}

export interface ChartAnnotation {
  id: string;
  type: 'line' | 'ray' | 'horizontal' | 'vertical' | 'rectangle' | 'ellipse' | 'fibonacci' | 'text' | 'arrow';
  points: Array<{ price: number; time: Date }>;
  style: {
    color: string;
    lineWidth: number;
    lineStyle: 'solid' | 'dashed' | 'dotted';
    fillColor?: string;
    opacity?: number;
  };
  label?: string;
  visible: boolean;
  locked: boolean;
}

export interface ChartSignal {
  id: string;
  type: 'buy' | 'sell' | 'close' | 'alert' | 'info';
  price: number;
  time: Date;
  label: string;
  description: string;
  confidence: number;
  source: 'ai' | 'indicator' | 'pattern' | 'user';
  active: boolean;
}

export interface LivePreviewState {
  // Current data
  symbol: string;
  timeframe: string;
  candles: OHLCV[];
  currentPrice: number;
  
  // AI analysis
  snapshot: MarketSnapshot | null;
  opportunities: RankedOpportunity[];
  decision: AIDecisionContext | null;
  
  // Chart elements
  annotations: ChartAnnotation[];
  signals: ChartSignal[];
  
  // Positions and orders
  positions: Position[];
  pendingOrders: Order[];
  
  // Status
  isConnected: boolean;
  lastUpdate: Date;
  error: string | null;
}

// ============================================
// CHAT INTERFACE TYPES
// ============================================

export interface ChatMessage {
  id: string;
  timestamp: Date;
  role: 'user' | 'ai' | 'system' | 'broker';
  content: string;
  
  // Rich content
  attachments?: ChatAttachment[];
  actions?: ChatAction[];
  
  // Metadata
  symbol?: string;
  relatedTo?: string; // Related trade/position ID
  confidence?: number;
  
  // Status
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
}

export interface ChatAttachment {
  type: 'chart' | 'analysis' | 'trade' | 'position' | 'order' | 'backtest' | 'alert';
  data: unknown;
  preview?: string;
}

export interface ChatAction {
  id: string;
  type: 'confirm_trade' | 'cancel_trade' | 'modify_order' | 'close_position' | 'view_analysis' | 'run_backtest' | 'custom';
  label: string;
  icon?: string;
  primary?: boolean;
  payload?: unknown;
}

export interface ChatCommand {
  command: string;
  aliases: string[];
  description: string;
  usage: string;
  examples: string[];
  handler: (args: string[], context: ChatContext) => Promise<ChatCommandResult>;
}

export interface ChatContext {
  userId: string;
  sessionId: string;
  currentSymbol?: string;
  positions: Position[];
  account: AccountInfo | null;
  preferences: ChatPreferences;
}

export interface ChatPreferences {
  language: 'pt-br' | 'en' | 'es';
  riskTolerance: RiskLevel;
  autoExecute: boolean;
  confirmationRequired: boolean;
  notificationLevel: 'all' | 'important' | 'critical' | 'none';
}

export interface ChatCommandResult {
  success: boolean;
  message: string;
  attachments?: ChatAttachment[];
  actions?: ChatAction[];
  error?: string;
}

// ============================================
// BROKER INTEGRATION TYPES
// ============================================

export interface BrokerConnection {
  id: string;
  name: string;
  type: 'api' | 'fix' | 'websocket' | 'oauth';
  status: 'connected' | 'disconnected' | 'error' | 'connecting';
  
  // Capabilities
  capabilities: {
    realtime: boolean;
    historicalData: boolean;
    trading: boolean;
    marginTrading: boolean;
    options: boolean;
    futures: boolean;
  };
  
  // Rate limits
  rateLimits: {
    ordersPerSecond: number;
    requestsPerMinute: number;
    currentUsage: number;
  };
  
  // Account info
  accountId: string;
  accountType: 'live' | 'paper' | 'demo';
  
  // Timestamps
  connectedAt?: Date;
  lastActivity?: Date;
}

export interface BrokerCommand {
  type: 'market_order' | 'limit_order' | 'stop_order' | 'cancel_order' | 'modify_order' | 'close_position' | 'get_account' | 'get_positions';
  payload: unknown;
  callback?: (result: BrokerCommandResult) => void;
}

export interface BrokerCommandResult {
  success: boolean;
  data?: unknown;
  orderId?: string;
  error?: string;
  timestamp: Date;
}

// ============================================
// LIVE PREVIEW MANAGER
// ============================================

export class LivePreviewManager extends EventEmitter {
  private config: LivePreviewConfig;
  private state: LivePreviewState;
  private refreshInterval: NodeJS.Timeout | null = null;
  private annotationIdCounter: number = 0;
  private signalIdCounter: number = 0;

  constructor(config: Partial<LivePreviewConfig> = {}) {
    super();
    
    this.config = {
      refreshRate: 1000,
      showIndicators: true,
      showPatterns: true,
      showSignals: true,
      showPositions: true,
      showOrders: true,
      chartType: 'candlestick',
      defaultTimeframe: '1h',
      showVolume: true,
      darkMode: true,
      showSupportResistance: true,
      showTrendlines: true,
      showFibonacci: true,
      showPivotPoints: true,
      alertOnSignal: true,
      alertOnExecution: true,
      alertOnRiskThreshold: true,
      allowManualTrades: true,
      requireConfirmation: true,
      showAIReasoning: true,
      ...config,
    };
    
    this.state = {
      symbol: '',
      timeframe: this.config.defaultTimeframe,
      candles: [],
      currentPrice: 0,
      snapshot: null,
      opportunities: [],
      decision: null,
      annotations: [],
      signals: [],
      positions: [],
      pendingOrders: [],
      isConnected: false,
      lastUpdate: new Date(),
      error: null,
    };
  }

  // ============================================
  // STATE MANAGEMENT
  // ============================================

  /**
   * Initialize preview for a symbol
   */
  initialize(symbol: string, candles: OHLCV[]): void {
    this.state.symbol = symbol;
    this.state.candles = candles;
    this.state.currentPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;
    this.state.isConnected = true;
    this.state.lastUpdate = new Date();
    
    this.emit('initialized', { symbol, candleCount: candles.length });
  }

  /**
   * Update with new candle data
   */
  updateCandles(candles: OHLCV[]): void {
    this.state.candles = candles;
    this.state.currentPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;
    this.state.lastUpdate = new Date();
    
    this.emit('candlesUpdated', { count: candles.length, price: this.state.currentPrice });
  }

  /**
   * Update AI analysis
   */
  updateAnalysis(
    snapshot: MarketSnapshot,
    opportunities: RankedOpportunity[],
    decision: AIDecisionContext
  ): void {
    this.state.snapshot = snapshot;
    this.state.opportunities = opportunities;
    this.state.decision = decision;
    this.state.lastUpdate = new Date();
    
    // Auto-add signals from opportunities
    if (this.config.showSignals) {
      this.addSignalsFromOpportunities(opportunities);
    }
    
    // Auto-add annotations from snapshot
    if (this.config.showSupportResistance && snapshot) {
      this.addSupportResistanceAnnotations(snapshot);
    }
    
    this.emit('analysisUpdated', { snapshot, opportunities, decision });
  }

  /**
   * Update positions and orders
   */
  updatePositions(positions: Position[], orders: Order[]): void {
    this.state.positions = positions;
    this.state.pendingOrders = orders;
    
    // Add position markers to chart
    if (this.config.showPositions) {
      this.addPositionAnnotations(positions);
    }
    
    this.emit('positionsUpdated', { positions, orders });
  }

  /**
   * Get current state
   */
  getState(): LivePreviewState {
    return { ...this.state };
  }

  // ============================================
  // ANNOTATIONS
  // ============================================

  /**
   * Add annotation to chart
   */
  addAnnotation(annotation: Omit<ChartAnnotation, 'id'>): string {
    const id = `ann_${++this.annotationIdCounter}`;
    const fullAnnotation: ChartAnnotation = { ...annotation, id };
    
    this.state.annotations.push(fullAnnotation);
    this.emit('annotationAdded', fullAnnotation);
    
    return id;
  }

  /**
   * Remove annotation
   */
  removeAnnotation(id: string): boolean {
    const index = this.state.annotations.findIndex(a => a.id === id);
    if (index >= 0) {
      const removed = this.state.annotations.splice(index, 1)[0];
      this.emit('annotationRemoved', removed);
      return true;
    }
    return false;
  }

  /**
   * Add support/resistance annotations from snapshot
   */
  private addSupportResistanceAnnotations(snapshot: MarketSnapshot): void {
    // Remove old S/R annotations
    this.state.annotations = this.state.annotations.filter(
      a => !a.label?.includes('Support') && !a.label?.includes('Resistance')
    );
    
    const keyLevels = snapshot.keyLevels;
    
    if (keyLevels.immediateSupport) {
      this.addAnnotation({
        type: 'horizontal',
        points: [{ price: keyLevels.immediateSupport, time: new Date() }],
        style: { color: '#4CAF50', lineWidth: 1, lineStyle: 'dashed' },
        label: `Support ${keyLevels.immediateSupport.toFixed(2)}`,
        visible: true,
        locked: false,
      });
    }
    
    if (keyLevels.immediateResistance) {
      this.addAnnotation({
        type: 'horizontal',
        points: [{ price: keyLevels.immediateResistance, time: new Date() }],
        style: { color: '#F44336', lineWidth: 1, lineStyle: 'dashed' },
        label: `Resistance ${keyLevels.immediateResistance.toFixed(2)}`,
        visible: true,
        locked: false,
      });
    }
  }

  /**
   * Add position annotations
   */
  private addPositionAnnotations(positions: Position[]): void {
    // Remove old position annotations
    this.state.annotations = this.state.annotations.filter(
      a => !a.label?.includes('Entry') && !a.label?.includes('Stop') && !a.label?.includes('Target')
    );
    
    for (const pos of positions) {
      const entryPrice = pos.averageEntryPrice || pos.averagePrice;
      const isLong = pos.side === 'long';
      
      // Entry line
      this.addAnnotation({
        type: 'horizontal',
        points: [{ price: entryPrice, time: new Date() }],
        style: { color: '#2196F3', lineWidth: 2, lineStyle: 'solid' },
        label: `Entry ${entryPrice.toFixed(2)}`,
        visible: true,
        locked: true,
      });
      
      // Stop loss
      if (pos.stopLoss) {
        this.addAnnotation({
          type: 'horizontal',
          points: [{ price: pos.stopLoss, time: new Date() }],
          style: { color: '#F44336', lineWidth: 1, lineStyle: 'dotted' },
          label: `Stop ${pos.stopLoss.toFixed(2)}`,
          visible: true,
          locked: true,
        });
      }
      
      // Take profit
      if (pos.takeProfit) {
        this.addAnnotation({
          type: 'horizontal',
          points: [{ price: pos.takeProfit, time: new Date() }],
          style: { color: '#4CAF50', lineWidth: 1, lineStyle: 'dotted' },
          label: `Target ${pos.takeProfit.toFixed(2)}`,
          visible: true,
          locked: true,
        });
      }
    }
  }

  // ============================================
  // SIGNALS
  // ============================================

  /**
   * Add signal to chart
   */
  addSignal(signal: Omit<ChartSignal, 'id'>): string {
    const id = `sig_${++this.signalIdCounter}`;
    const fullSignal: ChartSignal = { ...signal, id };
    
    this.state.signals.push(fullSignal);
    
    // Alert if configured
    if (this.config.alertOnSignal && signal.active) {
      this.emit('signalAlert', fullSignal);
    }
    
    this.emit('signalAdded', fullSignal);
    return id;
  }

  /**
   * Add signals from ranked opportunities
   */
  private addSignalsFromOpportunities(opportunities: RankedOpportunity[]): void {
    // Keep only recent AI signals
    const now = Date.now();
    this.state.signals = this.state.signals.filter(
      s => s.source !== 'ai' || (now - s.time.getTime()) < 60 * 60 * 1000 // 1 hour
    );
    
    for (const opp of opportunities.slice(0, 5)) { // Top 5 opportunities
      const isStrongSignal = opp.action === 'strong_buy' || opp.action === 'strong_sell';
      
      this.addSignal({
        type: opp.action.includes('buy') ? 'buy' : opp.action.includes('sell') ? 'sell' : 'alert',
        price: opp.snapshot.currentPrice,
        time: new Date(),
        label: `${opp.action.toUpperCase()} (${opp.score.toFixed(0)})`,
        description: opp.reasoning.join('. '),
        confidence: opp.score / 100,
        source: 'ai',
        active: isStrongSignal,
      });
    }
  }

  // ============================================
  // RENDERING DATA
  // ============================================

  /**
   * Generate rendering data for frontend
   */
  generateRenderData(): LivePreviewRenderData {
    const snapshot = this.state.snapshot;
    
    return {
      chart: {
        symbol: this.state.symbol,
        timeframe: this.state.timeframe,
        type: this.config.chartType,
        candles: this.state.candles,
        currentPrice: this.state.currentPrice,
        annotations: this.state.annotations.filter(a => a.visible),
        signals: this.state.signals.filter(s => s.active),
        darkMode: this.config.darkMode,
      },
      
      analysis: snapshot ? {
        bias: snapshot.bias,
        confidence: snapshot.confidence,
        regime: snapshot.regime,
        volatility: snapshot.volatility.regime,
        trend: {
          short: snapshot.trend.shortTerm,
          medium: snapshot.trend.mediumTerm,
          long: snapshot.trend.longTerm,
        },
        indicators: this.config.showIndicators ? {
          rsi: snapshot.indicators?.rsi14.value,
          macd: snapshot.indicators?.macd.histogram,
          atr: snapshot.indicators?.atr14.value,
        } : null,
        patterns: this.config.showPatterns ? snapshot.patterns : null,
      } : null,
      
      opportunities: this.state.opportunities.slice(0, 5).map(opp => ({
        symbol: opp.symbol,
        action: opp.action,
        score: opp.score,
        riskReward: opp.assessment.riskReward?.ratio || 0,
        reasoning: opp.reasoning.slice(0, 3),
        warnings: opp.warnings,
      })),
      
      positions: this.state.positions.map(pos => ({
        symbol: pos.symbol || pos.assetId,
        side: pos.side,
        quantity: pos.quantity,
        entry: pos.averageEntryPrice || pos.averagePrice,
        current: pos.currentPrice || pos.averageEntryPrice || 0,
        pnl: pos.unrealizedPnL || 0,
        pnlPercent: pos.unrealizedPnLPercent || 0,
        stopLoss: pos.stopLoss,
        takeProfit: pos.takeProfit,
      })),
      
      orders: this.state.pendingOrders.map(ord => ({
        id: ord.id,
        symbol: ord.symbol || ord.assetId,
        side: ord.side,
        type: ord.type,
        quantity: ord.quantity,
        price: ord.price,
        status: ord.status,
      })),
      
      aiReasoning: this.config.showAIReasoning && this.state.decision ? {
        summary: this.state.decision.opportunity.reasoning.join('; '),
        recommendation: this.state.decision.opportunity.action,
        confidence: this.state.decision.opportunity.confidenceFactors.overall,
        riskAssessment: `Daily: ${this.state.decision.riskLimits.remainingDailyRisk.toFixed(2)}%, Weekly: ${this.state.decision.riskLimits.remainingWeeklyRisk.toFixed(2)}%`,
      } : null,
      
      status: {
        isConnected: this.state.isConnected,
        lastUpdate: this.state.lastUpdate,
        error: this.state.error,
      },
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LivePreviewConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('configUpdated', this.config);
  }
}

// Render data type for frontend
export interface LivePreviewRenderData {
  chart: {
    symbol: string;
    timeframe: string;
    type: string;
    candles: OHLCV[];
    currentPrice: number;
    annotations: ChartAnnotation[];
    signals: ChartSignal[];
    darkMode: boolean;
  };
  analysis: {
    bias: string;
    confidence: number;
    regime: string;
    volatility: string;
    trend: { short: string; medium: string; long: string };
    indicators: { rsi?: number; macd?: number; atr?: number } | null;
    patterns: unknown | null;
  } | null;
  opportunities: Array<{
    symbol: string;
    action: string;
    score: number;
    riskReward: number;
    reasoning: string[];
    warnings: string[];
  }>;
  positions: Array<{
    symbol: string;
    side: string;
    quantity: number;
    entry: number;
    current: number;
    pnl: number;
    pnlPercent: number;
    stopLoss?: number;
    takeProfit?: number;
  }>;
  orders: Array<{
    id: string;
    symbol: string;
    side: string;
    type: string;
    quantity: number;
    price?: number;
    status: string;
  }>;
  aiReasoning: {
    summary: string;
    recommendation: string;
    confidence: number;
    riskAssessment: string;
  } | null;
  status: {
    isConnected: boolean;
    lastUpdate: Date;
    error: string | null;
  };
}

// ============================================
// CHAT MANAGER
// ============================================

export class TradingChatManager extends EventEmitter {
  private messages: ChatMessage[] = [];
  private commands: Map<string, ChatCommand> = new Map();
  private context: ChatContext;
  private messageIdCounter: number = 0;
  private brokerConnection: BrokerConnection | null = null;

  constructor(context: ChatContext) {
    super();
    this.context = context;
    this.registerDefaultCommands();
  }

  // ============================================
  // MESSAGE HANDLING
  // ============================================

  /**
   * Process incoming user message
   */
  async processMessage(content: string): Promise<ChatMessage> {
    // Create user message
    const userMessage = this.createMessage('user', content);
    this.messages.push(userMessage);
    this.emit('messageReceived', userMessage);
    
    // Check if it's a command
    if (content.startsWith('/')) {
      return this.processCommand(content);
    }
    
    // Otherwise, process as natural language
    return this.processNaturalLanguage(content);
  }

  /**
   * Process command
   */
  private async processCommand(content: string): Promise<ChatMessage> {
    const parts = content.slice(1).split(' ');
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    // Find command
    let command: ChatCommand | undefined;
    for (const [_, cmd] of this.commands) {
      if (cmd.command === commandName || cmd.aliases.includes(commandName)) {
        command = cmd;
        break;
      }
    }
    
    if (!command) {
      return this.createAIResponse(`Comando não reconhecido: /${commandName}. Use /ajuda para ver comandos disponíveis.`);
    }
    
    try {
      const result = await command.handler(args, this.context);
      
      const response = this.createMessage('ai', result.message, {
        attachments: result.attachments,
        actions: result.actions,
      });
      
      this.messages.push(response);
      this.emit('messageSent', response);
      
      return response;
    } catch (error) {
      return this.createAIResponse(`Erro ao executar comando: ${error}`);
    }
  }

  /**
   * Process natural language message
   */
  private async processNaturalLanguage(content: string): Promise<ChatMessage> {
    const lowerContent = content.toLowerCase();
    
    // Detect intent
    const intent = this.detectIntent(lowerContent);
    
    switch (intent) {
      case 'buy':
        return this.handleBuyIntent(content);
      case 'sell':
        return this.handleSellIntent(content);
      case 'close':
        return this.handleCloseIntent(content);
      case 'analysis':
        return this.handleAnalysisIntent(content);
      case 'positions':
        return this.handlePositionsIntent();
      case 'performance':
        return this.handlePerformanceIntent();
      case 'risk':
        return this.handleRiskIntent(content);
      case 'help':
        return this.handleHelpIntent();
      default:
        return this.handleUnknownIntent(content);
    }
  }

  /**
   * Detect intent from message
   */
  private detectIntent(content: string): string {
    const buyKeywords = ['comprar', 'buy', 'long', 'entrar', 'abrir compra'];
    const sellKeywords = ['vender', 'sell', 'short', 'abrir venda'];
    const closeKeywords = ['fechar', 'close', 'sair', 'encerrar'];
    const analysisKeywords = ['análise', 'analisar', 'analysis', 'como está', 'o que acha'];
    const positionsKeywords = ['posições', 'positions', 'carteira', 'portfolio'];
    const performanceKeywords = ['performance', 'desempenho', 'resultado', 'lucro', 'prejuízo'];
    const riskKeywords = ['risco', 'risk', 'stop', 'proteção'];
    const helpKeywords = ['ajuda', 'help', 'comandos', 'o que você pode'];
    
    if (buyKeywords.some(k => content.includes(k))) return 'buy';
    if (sellKeywords.some(k => content.includes(k))) return 'sell';
    if (closeKeywords.some(k => content.includes(k))) return 'close';
    if (analysisKeywords.some(k => content.includes(k))) return 'analysis';
    if (positionsKeywords.some(k => content.includes(k))) return 'positions';
    if (performanceKeywords.some(k => content.includes(k))) return 'performance';
    if (riskKeywords.some(k => content.includes(k))) return 'risk';
    if (helpKeywords.some(k => content.includes(k))) return 'help';
    
    return 'unknown';
  }

  // ============================================
  // INTENT HANDLERS
  // ============================================

  private async handleBuyIntent(content: string): Promise<ChatMessage> {
    const symbol = this.extractSymbol(content) || this.context.currentSymbol;
    
    if (!symbol) {
      return this.createAIResponse(
        'Qual ativo você gostaria de comprar? Por favor, especifique o símbolo.',
        undefined,
        [
          { id: 'btc', type: 'custom', label: 'BTC/USDT', payload: { symbol: 'BTC/USDT' } },
          { id: 'eth', type: 'custom', label: 'ETH/USDT', payload: { symbol: 'ETH/USDT' } },
        ]
      );
    }
    
    // Extract quantity if mentioned
    const quantity = this.extractQuantity(content);
    
    const response = `📈 **Ordem de Compra - ${symbol}**\n\n` +
      `Você está solicitando uma ordem de compra para ${symbol}.\n\n` +
      `${quantity ? `Quantidade: ${quantity}\n` : 'Quantidade: A definir\n'}` +
      `\nDeseja confirmar esta operação?`;
    
    return this.createAIResponse(response, undefined, [
      { 
        id: 'confirm', 
        type: 'confirm_trade', 
        label: '✅ Confirmar Compra', 
        primary: true,
        payload: { action: 'buy', symbol, quantity }
      },
      { 
        id: 'cancel', 
        type: 'cancel_trade', 
        label: '❌ Cancelar',
        payload: {}
      },
      { 
        id: 'analyze', 
        type: 'view_analysis', 
        label: '📊 Ver Análise',
        payload: { symbol }
      },
    ]);
  }

  private async handleSellIntent(content: string): Promise<ChatMessage> {
    const symbol = this.extractSymbol(content) || this.context.currentSymbol;
    
    if (!symbol) {
      return this.createAIResponse('Qual ativo você gostaria de vender?');
    }
    
    const quantity = this.extractQuantity(content);
    
    const response = `📉 **Ordem de Venda - ${symbol}**\n\n` +
      `Você está solicitando uma ordem de venda para ${symbol}.\n\n` +
      `${quantity ? `Quantidade: ${quantity}\n` : 'Quantidade: A definir\n'}` +
      `\nDeseja confirmar esta operação?`;
    
    return this.createAIResponse(response, undefined, [
      { 
        id: 'confirm', 
        type: 'confirm_trade', 
        label: '✅ Confirmar Venda', 
        primary: true,
        payload: { action: 'sell', symbol, quantity }
      },
      { 
        id: 'cancel', 
        type: 'cancel_trade', 
        label: '❌ Cancelar',
        payload: {}
      },
    ]);
  }

  private async handleCloseIntent(content: string): Promise<ChatMessage> {
    const symbol = this.extractSymbol(content);
    const positions = this.context.positions;
    
    if (positions.length === 0) {
      return this.createAIResponse('Você não possui posições abertas no momento.');
    }
    
    if (symbol) {
      const position = positions.find(p => (p.symbol || p.assetId).includes(symbol));
      if (!position) {
        return this.createAIResponse(`Não encontrei posição aberta em ${symbol}.`);
      }
      
      return this.createAIResponse(
        `🔄 **Fechar Posição - ${symbol}**\n\n` +
        `Posição: ${position.side.toUpperCase()}\n` +
        `Quantidade: ${position.quantity}\n` +
        `P&L: ${(position.unrealizedPnL || 0) >= 0 ? '+' : ''}${(position.unrealizedPnL || 0).toFixed(2)} (${(position.unrealizedPnLPercent || 0).toFixed(2)}%)\n\n` +
        `Confirmar fechamento?`,
        undefined,
        [
          { id: 'confirm', type: 'close_position', label: '✅ Fechar', primary: true, payload: { positionId: position.id } },
          { id: 'cancel', type: 'cancel_trade', label: '❌ Manter', payload: {} },
        ]
      );
    }
    
    // Show all positions
    let response = '📋 **Posições Abertas**\n\n';
    const actions: ChatAction[] = [];
    
    positions.forEach((pos, index) => {
      const sym = pos.symbol || pos.assetId;
      response += `${index + 1}. **${sym}** - ${pos.side.toUpperCase()}\n`;
      response += `   P&L: ${(pos.unrealizedPnL || 0) >= 0 ? '+' : ''}${(pos.unrealizedPnL || 0).toFixed(2)}\n`;
      
      actions.push({
        id: `close_${index}`,
        type: 'close_position',
        label: `Fechar ${sym}`,
        payload: { positionId: pos.id },
      });
    });
    
    response += '\nQual posição deseja fechar?';
    
    return this.createAIResponse(response, undefined, actions);
  }

  private async handleAnalysisIntent(content: string): Promise<ChatMessage> {
    const symbol = this.extractSymbol(content) || this.context.currentSymbol || 'BTC/USDT';
    
    // This would integrate with AIMarketVision
    const response = `📊 **Análise de ${symbol}**\n\n` +
      `Estou analisando o mercado para você...\n\n` +
      `*A análise completa será exibida no LivePreview.*`;
    
    return this.createAIResponse(response, 
      [{ type: 'analysis', data: { symbol }, preview: `Análise técnica de ${symbol}` }],
      [
        { id: 'trade', type: 'custom', label: '💹 Operar', payload: { symbol } },
        { id: 'backtest', type: 'run_backtest', label: '📈 Backtest', payload: { symbol } },
      ]
    );
  }

  private async handlePositionsIntent(): Promise<ChatMessage> {
    const positions = this.context.positions;
    
    if (positions.length === 0) {
      return this.createAIResponse('📭 Você não possui posições abertas no momento.');
    }
    
    let response = '📋 **Suas Posições**\n\n';
    let totalPnL = 0;
    
    positions.forEach((pos, index) => {
      const pnl = pos.unrealizedPnL || 0;
      totalPnL += pnl;
      const emoji = pnl >= 0 ? '🟢' : '🔴';
      
      response += `${emoji} **${pos.symbol || pos.assetId}**\n`;
      response += `   ${pos.side.toUpperCase()} | Qty: ${pos.quantity}\n`;
      response += `   Entry: ${pos.averagePrice} | Current: ${pos.currentPrice}\n`;
      response += `   P&L: ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} (${(pos.unrealizedPnLPercent || 0).toFixed(2)}%)\n\n`;
    });
    
    response += `---\n**Total P&L:** ${totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}`;
    
    return this.createAIResponse(response, 
      [{ type: 'position', data: positions, preview: `${positions.length} posições abertas` }]
    );
  }

  private async handlePerformanceIntent(): Promise<ChatMessage> {
    // Would integrate with performance tracking
    const response = `📈 **Performance do Dia**\n\n` +
      `Trades: 5\n` +
      `Win Rate: 60%\n` +
      `P&L: +$125.50\n` +
      `Melhor Trade: +$85.00\n` +
      `Pior Trade: -$32.00\n\n` +
      `*Dados detalhados disponíveis no painel.*`;
    
    return this.createAIResponse(response);
  }

  private async handleRiskIntent(content: string): Promise<ChatMessage> {
    const currentRisk = this.context.preferences.riskTolerance;
    
    const response = `⚠️ **Configuração de Risco**\n\n` +
      `Nível atual: **${currentRisk.toUpperCase()}**\n\n` +
      `Escolha o nível de risco desejado:`;
    
    return this.createAIResponse(response, undefined, [
      { id: 'low', type: 'custom', label: '🟢 Baixo', payload: { risk: 'low' } },
      { id: 'medium', type: 'custom', label: '🟡 Médio', payload: { risk: 'medium' } },
      { id: 'high', type: 'custom', label: '🔴 Alto', payload: { risk: 'high' } },
    ]);
  }

  private async handleHelpIntent(): Promise<ChatMessage> {
    const response = `🤖 **Assistente de Trading**\n\n` +
      `Posso ajudar você com:\n\n` +
      `📊 **Análise** - "Como está o BTC?"\n` +
      `📈 **Comprar** - "Comprar ETH"\n` +
      `📉 **Vender** - "Vender BTC"\n` +
      `🔄 **Fechar** - "Fechar posição"\n` +
      `📋 **Posições** - "Minhas posições"\n` +
      `📈 **Performance** - "Como estou hoje?"\n` +
      `⚠️ **Risco** - "Configurar risco"\n\n` +
      `**Comandos rápidos:**\n` +
      `/analise [SYMBOL] - Análise técnica\n` +
      `/buy [SYMBOL] [QTY] - Ordem de compra\n` +
      `/sell [SYMBOL] [QTY] - Ordem de venda\n` +
      `/positions - Ver posições\n` +
      `/ajuda - Esta mensagem`;
    
    return this.createAIResponse(response);
  }

  private async handleUnknownIntent(content: string): Promise<ChatMessage> {
    return this.createAIResponse(
      `Não tenho certeza do que você precisa. Você pode:\n\n` +
      `• Me pedir uma **análise** de algum ativo\n` +
      `• Solicitar uma ordem de **compra** ou **venda**\n` +
      `• Ver suas **posições** abertas\n` +
      `• Verificar sua **performance**\n\n` +
      `Digite /ajuda para mais opções.`
    );
  }

  // ============================================
  // DEFAULT COMMANDS
  // ============================================

  private registerDefaultCommands(): void {
    this.registerCommand({
      command: 'analise',
      aliases: ['analysis', 'a'],
      description: 'Gera análise técnica de um ativo',
      usage: '/analise [SYMBOL]',
      examples: ['/analise BTC', '/analise ETH/USDT'],
      handler: async (args, ctx) => {
        const symbol = args[0] || ctx.currentSymbol || 'BTC/USDT';
        return {
          success: true,
          message: `📊 Gerando análise para ${symbol}...`,
          attachments: [{ type: 'analysis', data: { symbol }, preview: `Análise de ${symbol}` }],
        };
      },
    });

    this.registerCommand({
      command: 'buy',
      aliases: ['comprar', 'b'],
      description: 'Cria ordem de compra',
      usage: '/buy [SYMBOL] [QUANTITY]',
      examples: ['/buy BTC 0.1', '/buy ETH'],
      handler: async (args, ctx) => {
        const symbol = args[0] || ctx.currentSymbol;
        const quantity = args[1] ? parseFloat(args[1]) : undefined;
        
        if (!symbol) {
          return { success: false, message: 'Especifique o símbolo do ativo.', error: 'Missing symbol' };
        }
        
        return {
          success: true,
          message: `📈 Ordem de compra para ${symbol}${quantity ? ` (${quantity})` : ''} preparada.`,
          actions: [
            { id: 'confirm', type: 'confirm_trade', label: 'Confirmar', primary: true, payload: { action: 'buy', symbol, quantity } },
            { id: 'cancel', type: 'cancel_trade', label: 'Cancelar', payload: {} },
          ],
        };
      },
    });

    this.registerCommand({
      command: 'sell',
      aliases: ['vender', 's'],
      description: 'Cria ordem de venda',
      usage: '/sell [SYMBOL] [QUANTITY]',
      examples: ['/sell BTC 0.1', '/sell ETH'],
      handler: async (args, ctx) => {
        const symbol = args[0] || ctx.currentSymbol;
        const quantity = args[1] ? parseFloat(args[1]) : undefined;
        
        if (!symbol) {
          return { success: false, message: 'Especifique o símbolo do ativo.', error: 'Missing symbol' };
        }
        
        return {
          success: true,
          message: `📉 Ordem de venda para ${symbol}${quantity ? ` (${quantity})` : ''} preparada.`,
          actions: [
            { id: 'confirm', type: 'confirm_trade', label: 'Confirmar', primary: true, payload: { action: 'sell', symbol, quantity } },
            { id: 'cancel', type: 'cancel_trade', label: 'Cancelar', payload: {} },
          ],
        };
      },
    });

    this.registerCommand({
      command: 'positions',
      aliases: ['posicoes', 'pos', 'p'],
      description: 'Lista posições abertas',
      usage: '/positions',
      examples: ['/positions', '/pos'],
      handler: async (_args, ctx) => {
        if (ctx.positions.length === 0) {
          return { success: true, message: '📭 Nenhuma posição aberta.' };
        }
        
        let msg = '📋 **Posições Abertas:**\n';
        ctx.positions.forEach(pos => {
          msg += `\n• ${pos.symbol || pos.assetId}: ${pos.side} ${pos.quantity}`;
        });
        
        return { 
          success: true, 
          message: msg,
          attachments: [{ type: 'position', data: ctx.positions, preview: `${ctx.positions.length} posições` }],
        };
      },
    });

    this.registerCommand({
      command: 'ajuda',
      aliases: ['help', 'h', '?'],
      description: 'Mostra ajuda',
      usage: '/ajuda',
      examples: ['/ajuda', '/help'],
      handler: async () => {
        let msg = '🤖 **Comandos Disponíveis:**\n\n';
        
        for (const [_, cmd] of this.commands) {
          msg += `**/${cmd.command}** - ${cmd.description}\n`;
          msg += `  Uso: \`${cmd.usage}\`\n\n`;
        }
        
        return { success: true, message: msg };
      },
    });
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Register a new command
   */
  registerCommand(command: ChatCommand): void {
    this.commands.set(command.command, command);
  }

  /**
   * Create a message
   */
  private createMessage(
    role: ChatMessage['role'],
    content: string,
    extras?: Partial<ChatMessage>
  ): ChatMessage {
    return {
      id: `msg_${++this.messageIdCounter}`,
      timestamp: new Date(),
      role,
      content,
      status: 'sent',
      ...extras,
    };
  }

  /**
   * Create AI response
   */
  private createAIResponse(
    content: string,
    attachments?: ChatAttachment[],
    actions?: ChatAction[]
  ): ChatMessage {
    const message = this.createMessage('ai', content, { attachments, actions });
    this.messages.push(message);
    this.emit('messageSent', message);
    return message;
  }

  /**
   * Extract symbol from message
   */
  private extractSymbol(content: string): string | undefined {
    // Common patterns: BTC, ETH, BTC/USDT, BTCUSDT
    const patterns = [
      /\b([A-Z]{2,5})\/([A-Z]{2,5})\b/i,
      /\b([A-Z]{2,5})(USDT|BTC|ETH|USD)\b/i,
      /\b(BTC|ETH|BNB|SOL|XRP|ADA|DOGE|DOT|MATIC|LINK|UNI|AVAX)\b/i,
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return match[0].toUpperCase();
      }
    }
    
    return undefined;
  }

  /**
   * Extract quantity from message
   */
  private extractQuantity(content: string): number | undefined {
    const match = content.match(/(\d+(?:\.\d+)?)\s*(?:unidades?|qty|quantidade)?/i);
    return match ? parseFloat(match[1]) : undefined;
  }

  /**
   * Get all messages
   */
  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  /**
   * Execute action from message
   */
  async executeAction(action: ChatAction): Promise<ChatMessage> {
    this.emit('actionExecuted', action);
    
    switch (action.type) {
      case 'confirm_trade':
        return this.createAIResponse('✅ Ordem enviada para execução!');
      case 'cancel_trade':
        return this.createAIResponse('❌ Operação cancelada.');
      case 'close_position':
        return this.createAIResponse('🔄 Posição sendo fechada...');
      default:
        return this.createAIResponse(`Ação executada: ${action.label}`);
    }
  }

  /**
   * Connect to broker
   */
  connectBroker(connection: BrokerConnection): void {
    this.brokerConnection = connection;
    this.emit('brokerConnected', connection);
    
    this.createMessage('system', `🔗 Conectado à corretora: ${connection.name}`);
  }

  /**
   * Update context
   */
  updateContext(updates: Partial<ChatContext>): void {
    this.context = { ...this.context, ...updates };
  }
}

// Factory functions
export function createLivePreviewManager(config?: Partial<LivePreviewConfig>): LivePreviewManager {
  return new LivePreviewManager(config);
}

export function createTradingChatManager(context: ChatContext): TradingChatManager {
  return new TradingChatManager(context);
}
