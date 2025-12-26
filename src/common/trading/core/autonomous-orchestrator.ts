/**
 * Autonomous Trading Orchestrator
 * Sistema orquestrador final que integra todos os componentes
 * Para operação totalmente autônoma do sistema de trading
 */

import { EventEmitter } from 'events';
import {
  OHLCV,
  Order,
  Position,
  Quote,
  TradeDecision,
  AccountInfo,
  RiskLevel,
  OrderType,
  OrderSide,
} from './trading-types';
import { technicalIndicators, ComprehensiveIndicators } from './technical-indicators';
import { patternRecognition, PatternScanResult } from './pattern-recognition';
import { AIMarketVision, MarketSnapshot, OpportunityAssessment, AIDecisionContext } from './ai-market-vision';
import { MarketRegimeAdapter, RegimeState, StrategyAdjustments, createMarketRegimeAdapter } from './market-regime-adapter';
import { ProfitOptimizer, RankedOpportunity, PortfolioOptimization, TradeOptimization, createProfitOptimizer } from './profit-optimizer';
import { LivePreviewManager, TradingChatManager, createLivePreviewManager, createTradingChatManager, ChatContext } from './live-chat-integration';
import { BacktestingEngine, BacktestResult, StrategyFunction } from './backtesting-engine';

// ============================================
// ORCHESTRATOR TYPES
// ============================================

export interface OrchestratorConfig {
  // Mode settings
  mode: 'autonomous' | 'semi-autonomous' | 'manual';
  autoExecute: boolean;
  requireConfirmation: boolean;
  
  // Risk management
  globalRiskLevel: RiskLevel;
  maxDailyLoss: number; // % of capital
  maxDailyTrades: number;
  maxOpenPositions: number;
  
  // Capital management
  initialCapital: number;
  reserveCapital: number; // % to keep in reserve
  maxCapitalPerTrade: number; // %
  
  // Timing
  tradingHours: { start: string; end: string }; // HH:MM format
  tradingDays: number[]; // 0-6 (Sunday-Saturday)
  cooldownAfterLoss: number; // ms
  
  // Signals
  minSignalConfidence: number; // 0-1
  minRiskReward: number;
  useConfirmation: boolean; // Wait for confirmation signals
  
  // Monitoring
  healthCheckInterval: number; // ms
  dataRefreshInterval: number; // ms
  positionCheckInterval: number; // ms
  
  // Features
  enableLivePreview: boolean;
  enableChat: boolean;
  enableAlerting: boolean;
  enableAutoScaling: boolean;
  enableTrailingStops: boolean;
}

export interface SystemState {
  status: 'initializing' | 'running' | 'paused' | 'stopped' | 'error';
  isTrading: boolean;
  lastError: string | null;
  
  // Performance
  dailyPnL: number;
  dailyTrades: number;
  winRate: number;
  
  // Health
  dataFreshness: number; // ms since last update
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  lastHealthCheck: Date;
  
  // Positions
  openPositions: number;
  totalExposure: number;
  currentRisk: number;
}

export interface TradingSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  
  // Statistics
  tradesExecuted: number;
  wins: number;
  losses: number;
  totalPnL: number;
  maxDrawdown: number;
  
  // Signals
  signalsGenerated: number;
  signalsExecuted: number;
  signalsRejected: number;
  
  // Performance
  sharpeRatio: number;
  profitFactor: number;
}

export interface ExecutionOrder {
  id: string;
  signal: TradeDecision;
  optimization: TradeOptimization;
  
  // Status
  status: 'pending' | 'confirmed' | 'executing' | 'filled' | 'partial' | 'cancelled' | 'rejected' | 'error';
  statusReason?: string;
  
  // Execution details
  requestedAt: Date;
  confirmedAt?: Date;
  executedAt?: Date;
  
  // Fill info
  filledQuantity: number;
  averageFillPrice: number;
  
  // Tracking
  orderId?: string; // Broker order ID
  positionId?: string; // Resulting position ID
}

export interface OrchestratorEvent {
  type: 'signal' | 'execution' | 'position_update' | 'risk_alert' | 'system_status' | 'error';
  timestamp: Date;
  data: unknown;
  severity: 'info' | 'warning' | 'critical';
}

// ============================================
// BROKER ADAPTER INTERFACE
// ============================================

export interface BrokerAdapter {
  // Connection
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  
  // Account
  getAccountInfo(): Promise<AccountInfo>;
  getPositions(): Promise<Position[]>;
  getOrders(): Promise<Order[]>;
  
  // Market data
  getQuote(symbol: string): Promise<Quote>;
  getOHLCV(symbol: string, timeframe: string, limit: number): Promise<OHLCV[]>;
  subscribeToQuotes(symbols: string[], callback: (quote: Quote) => void): () => void;
  
  // Trading
  placeOrder(order: Partial<Order>): Promise<Order>;
  cancelOrder(orderId: string): Promise<boolean>;
  modifyOrder(orderId: string, updates: Partial<Order>): Promise<Order>;
  closePosition(positionId: string): Promise<boolean>;
  
  // Events
  on(event: string, callback: (...args: unknown[]) => void): void;
  off(event: string, callback: (...args: unknown[]) => void): void;
}

// ============================================
// AUTONOMOUS ORCHESTRATOR
// ============================================

export class AutonomousTradingOrchestrator extends EventEmitter {
  private config: OrchestratorConfig;
  private state: SystemState;
  private session: TradingSession | null = null;
  
  // Core components
  private aiVision: AIMarketVision;
  private regimeAdapter: MarketRegimeAdapter;
  private profitOptimizer: ProfitOptimizer;
  private livePreview: LivePreviewManager;
  private chatManager: TradingChatManager | null = null;
  
  // Broker connection
  private broker: BrokerAdapter | null = null;
  
  // Data storage
  private marketData: Map<string, OHLCV[]> = new Map();
  private snapshots: Map<string, MarketSnapshot> = new Map();
  private opportunities: Map<string, { assessment: OpportunityAssessment; snapshot: MarketSnapshot }> = new Map();
  private pendingOrders: Map<string, ExecutionOrder> = new Map();
  
  // State tracking
  private positions: Position[] = [];
  private account: AccountInfo | null = null;
  private dailyTrades: Array<{ pnl: number; timestamp: Date }> = [];
  
  // Intervals
  private dataRefreshInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private positionCheckInterval: NodeJS.Timeout | null = null;
  
  // Counters
  private orderIdCounter: number = 0;
  private sessionIdCounter: number = 0;

  constructor(config: Partial<OrchestratorConfig> = {}) {
    super();
    
    this.config = {
      mode: 'semi-autonomous',
      autoExecute: false,
      requireConfirmation: true,
      globalRiskLevel: 'medium',
      maxDailyLoss: 0.05, // 5%
      maxDailyTrades: 20,
      maxOpenPositions: 5,
      initialCapital: 10000,
      reserveCapital: 0.2, // 20%
      maxCapitalPerTrade: 0.1, // 10%
      tradingHours: { start: '09:00', end: '17:00' },
      tradingDays: [1, 2, 3, 4, 5], // Mon-Fri
      cooldownAfterLoss: 30 * 60 * 1000, // 30 minutes
      minSignalConfidence: 0.6,
      minRiskReward: 1.5,
      useConfirmation: true,
      healthCheckInterval: 60 * 1000, // 1 minute
      dataRefreshInterval: 5 * 1000, // 5 seconds
      positionCheckInterval: 10 * 1000, // 10 seconds
      enableLivePreview: true,
      enableChat: true,
      enableAlerting: true,
      enableAutoScaling: true,
      enableTrailingStops: true,
      ...config,
    };
    
    this.state = {
      status: 'initializing',
      isTrading: false,
      lastError: null,
      dailyPnL: 0,
      dailyTrades: 0,
      winRate: 0,
      dataFreshness: 0,
      connectionStatus: 'disconnected',
      lastHealthCheck: new Date(),
      openPositions: 0,
      totalExposure: 0,
      currentRisk: 0,
    };
    
    // Initialize components
    this.aiVision = new AIMarketVision(technicalIndicators, patternRecognition);
    
    this.regimeAdapter = createMarketRegimeAdapter(technicalIndicators);
    
    this.profitOptimizer = createProfitOptimizer({
      maxRiskPerTrade: this.config.maxCapitalPerTrade,
      minRiskReward: this.config.minRiskReward,
    });
    
    this.livePreview = createLivePreviewManager({
      showAIReasoning: true,
    });
  }

  // ============================================
  // LIFECYCLE MANAGEMENT
  // ============================================

  /**
   * Initialize the orchestrator
   */
  async initialize(broker: BrokerAdapter, symbols: string[]): Promise<boolean> {
    try {
      this.emit('status', { status: 'initializing' });
      
      // Store broker adapter
      this.broker = broker;
      
      // Connect to broker
      const connected = await broker.connect();
      if (!connected) {
        throw new Error('Failed to connect to broker');
      }
      
      this.state.connectionStatus = 'connected';
      
      // Get account info
      this.account = await broker.getAccountInfo();
      this.positions = await broker.getPositions();
      
      // Initialize chat if enabled
      if (this.config.enableChat) {
        const chatContext: ChatContext = {
          userId: this.account.id,
          sessionId: `session_${++this.sessionIdCounter}`,
          positions: this.positions,
          account: this.account,
          preferences: {
            language: 'pt-br',
            riskTolerance: this.config.globalRiskLevel,
            autoExecute: this.config.autoExecute,
            confirmationRequired: this.config.requireConfirmation,
            notificationLevel: 'important',
          },
        };
        
        this.chatManager = createTradingChatManager(chatContext);
        this.setupChatHandlers();
      }
      
      // Load initial market data
      for (const symbol of symbols) {
        await this.loadMarketData(symbol);
      }
      
      // Subscribe to real-time updates
      broker.subscribeToQuotes(symbols, (quote) => this.handleQuoteUpdate(quote));
      
      // Setup broker event handlers
      this.setupBrokerHandlers();
      
      // Start monitoring
      this.startMonitoring();
      
      // Create new session
      this.startNewSession();
      
      this.state.status = 'running';
      this.emit('initialized', { symbols, account: this.account });
      
      return true;
    } catch (error) {
      this.state.status = 'error';
      this.state.lastError = error instanceof Error ? error.message : 'Unknown error';
      this.emit('error', error);
      return false;
    }
  }

  /**
   * Start new trading session
   */
  private startNewSession(): void {
    this.session = {
      id: `session_${++this.sessionIdCounter}`,
      startTime: new Date(),
      tradesExecuted: 0,
      wins: 0,
      losses: 0,
      totalPnL: 0,
      maxDrawdown: 0,
      signalsGenerated: 0,
      signalsExecuted: 0,
      signalsRejected: 0,
      sharpeRatio: 0,
      profitFactor: 0,
    };
    
    this.emit('sessionStarted', this.session);
  }

  /**
   * Stop the orchestrator
   */
  async stop(): Promise<void> {
    this.state.status = 'stopped';
    this.state.isTrading = false;
    
    // Stop intervals
    if (this.dataRefreshInterval) clearInterval(this.dataRefreshInterval);
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
    if (this.positionCheckInterval) clearInterval(this.positionCheckInterval);
    
    // Close session
    if (this.session) {
      this.session.endTime = new Date();
      this.emit('sessionEnded', this.session);
    }
    
    // Disconnect broker
    if (this.broker) {
      await this.broker.disconnect();
    }
    
    this.emit('stopped');
  }

  /**
   * Pause trading
   */
  pause(): void {
    this.state.status = 'paused';
    this.state.isTrading = false;
    this.emit('paused');
  }

  /**
   * Resume trading
   */
  resume(): void {
    if (this.state.status === 'paused') {
      this.state.status = 'running';
      this.state.isTrading = this.canTrade();
      this.emit('resumed');
    }
  }

  // ============================================
  // MARKET DATA HANDLING
  // ============================================

  /**
   * Load market data for a symbol
   */
  private async loadMarketData(symbol: string): Promise<void> {
    if (!this.broker) return;
    
    const candles = await this.broker.getOHLCV(symbol, '1h', 200);
    this.marketData.set(symbol, candles);
    
    // Update components
    this.regimeAdapter.updateMarketData(symbol, candles);
    
    // Generate snapshot
    await this.generateSnapshot(symbol, candles);
    
    // Update LivePreview
    if (this.config.enableLivePreview) {
      this.livePreview.initialize(symbol, candles);
    }
    
    this.emit('dataLoaded', { symbol, candleCount: candles.length });
  }

  /**
   * Handle real-time quote update
   */
  private handleQuoteUpdate(quote: Quote): void {
    const symbol = quote.symbol;
    const candles = this.marketData.get(symbol);
    
    if (!candles || candles.length === 0) return;
    
    // Update last candle
    const lastCandle = candles[candles.length - 1];
    lastCandle.close = quote.bid;
    lastCandle.high = Math.max(lastCandle.high, quote.bid);
    lastCandle.low = Math.min(lastCandle.low, quote.bid);
    
    // Update data freshness
    this.state.dataFreshness = Date.now() - quote.timestamp;
    
    // Trigger analysis update periodically
    this.emit('quoteUpdate', quote);
  }

  /**
   * Generate market snapshot
   */
  private async generateSnapshot(symbol: string, candles: OHLCV[]): Promise<void> {
    // Create a quote from last candle for analysis
    const lastCandle = candles[candles.length - 1];
    const currentQuote: Quote = {
      symbol,
      bid: lastCandle.close,
      ask: lastCandle.close * 1.0001, // Small spread
      bidSize: 1000,
      askSize: 1000,
      timestamp: lastCandle.timestamp,
      last: lastCandle.close,
      lastSize: 100,
      volume: lastCandle.volume,
    };
    
    // Generate snapshot via AI Vision (it handles indicators and patterns internally)
    const snapshot = this.aiVision.generateSnapshot(symbol, currentQuote, candles);
    
    // Update regime adapter
    const regime = this.regimeAdapter.updateMarketData(symbol, candles, currentQuote);
    
    // Store snapshot
    this.snapshots.set(symbol, snapshot);
    
    // Generate opportunity assessment
    const riskParams = {
      maxRiskPercent: this.config.maxCapitalPerTrade,
      minRiskReward: this.config.minRiskReward,
    };
    const assessment = this.aiVision.assessOpportunity(symbol, snapshot, riskParams);
    this.opportunities.set(symbol, { assessment, snapshot });
    
    // Update LivePreview
    if (this.config.enableLivePreview) {
      const rankedOpps = this.profitOptimizer.rankOpportunities(
        this.opportunities,
        this.positions,
        this.account?.equity || this.config.initialCapital
      );
      
      const portfolio = {
        totalValue: this.account?.equity || this.config.initialCapital,
        availableCash: this.account?.balance || this.config.initialCapital,
        positions: this.positions,
        orders: [],
        todayPnL: this.state.dailyPnL,
        weekPnL: 0,
      };
      
      const riskLimits = {
        maxPositionSize: this.config.maxCapitalPerTrade,
        maxLossPerTrade: this.config.maxDailyLoss / 10,
        maxDailyLoss: this.config.maxDailyLoss,
        maxWeeklyLoss: this.config.maxDailyLoss * 5,
      };
      
      const decision = this.aiVision.generateDecisionContext(symbol, portfolio, riskLimits, []);
      
      this.livePreview.updateAnalysis(snapshot, rankedOpps, decision);
    }
    
    this.emit('snapshotGenerated', { symbol, snapshot });
  }

  // ============================================
  // AUTONOMOUS TRADING LOGIC
  // ============================================

  /**
   * Main trading cycle - called periodically
   */
  async runTradingCycle(): Promise<void> {
    if (!this.canTrade()) return;
    
    try {
      // 1. Update all snapshots
      for (const symbol of this.marketData.keys()) {
        const candles = this.marketData.get(symbol);
        if (candles) {
          await this.generateSnapshot(symbol, candles);
        }
      }
      
      // 2. Rank all opportunities
      const rankedOpportunities = this.profitOptimizer.rankOpportunities(
        this.opportunities,
        this.positions,
        this.account?.equity || this.config.initialCapital
      );
      
      // 3. Get portfolio optimization
      const portfolioOpt = this.profitOptimizer.optimizePortfolio(
        this.positions,
        this.opportunities,
        this.account?.equity || this.config.initialCapital,
        this.state.dailyPnL,
        this.state.dailyTrades
      );
      
      // 4. Optimize existing positions
      for (const posOpt of portfolioOpt.positionActions) {
        await this.handlePositionOptimization(posOpt);
      }
      
      // 5. Evaluate new opportunities
      if (portfolioOpt.recommendation.canOpenNew) {
        const topOpp = rankedOpportunities[0];
        if (topOpp && this.shouldTakeOpportunity(topOpp)) {
          await this.processOpportunity(topOpp, portfolioOpt);
        }
      }
      
      // 6. Update session stats
      if (this.session) {
        this.session.signalsGenerated = rankedOpportunities.length;
      }
      
      this.emit('tradingCycleComplete', { opportunities: rankedOpportunities.length });
      
    } catch (error) {
      this.state.lastError = error instanceof Error ? error.message : 'Trading cycle error';
      this.emit('error', error);
    }
  }

  /**
   * Check if trading is allowed
   */
  private canTrade(): boolean {
    // Check system status
    if (this.state.status !== 'running') return false;
    if (this.state.connectionStatus !== 'connected') return false;
    
    // Check daily limits
    if (this.state.dailyTrades >= this.config.maxDailyTrades) return false;
    
    // Check daily loss limit
    const dailyLossLimit = (this.account?.equity || this.config.initialCapital) * this.config.maxDailyLoss;
    if (this.state.dailyPnL < -dailyLossLimit) return false;
    
    // Check position limits
    if (this.positions.length >= this.config.maxOpenPositions) return false;
    
    // Check trading hours
    if (!this.isWithinTradingHours()) return false;
    
    // Check trading days
    if (!this.isTradingDay()) return false;
    
    return true;
  }

  /**
   * Check if within trading hours
   */
  private isWithinTradingHours(): boolean {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = hours * 60 + minutes;
    
    const [startH, startM] = this.config.tradingHours.start.split(':').map(Number);
    const [endH, endM] = this.config.tradingHours.end.split(':').map(Number);
    
    const startTime = startH * 60 + startM;
    const endTime = endH * 60 + endM;
    
    return currentTime >= startTime && currentTime <= endTime;
  }

  /**
   * Check if today is a trading day
   */
  private isTradingDay(): boolean {
    const today = new Date().getDay();
    return this.config.tradingDays.includes(today);
  }

  /**
   * Evaluate if should take an opportunity
   */
  private shouldTakeOpportunity(opp: RankedOpportunity): boolean {
    // Check minimum confidence
    if (opp.score / 100 < this.config.minSignalConfidence) return false;
    
    // Check action type
    if (opp.action === 'watch' || opp.action === 'avoid') return false;
    
    // Check risk/reward
    if (opp.assessment.riskReward && opp.assessment.riskReward.ratio < this.config.minRiskReward) {
      return false;
    }
    
    // Check regime adapter recommendation
    const tradingRec = this.regimeAdapter.isTradingRecommended(opp.symbol);
    if (!tradingRec.recommended) return false;
    
    // Check warnings
    if (opp.warnings.length > 3) return false; // Too many warnings
    
    // Additional checks for autonomous mode
    if (this.config.mode === 'autonomous') {
      return opp.action === 'strong_buy' || opp.action === 'strong_sell';
    }
    
    return true;
  }

  /**
   * Process a trading opportunity
   */
  private async processOpportunity(
    opp: RankedOpportunity,
    portfolioOpt: PortfolioOptimization
  ): Promise<void> {
    // Create trade decision
    const decision: TradeDecision = {
      assetId: opp.symbol,
      action: opp.action.includes('buy') ? 'buy' : 'sell',
      symbol: opp.symbol,
      confidence: opp.score / 100,
      reasoning: opp.reasoning,
      riskReward: opp.assessment.riskReward?.ratio,
      entryPrice: opp.assessment.entry?.recommendedPrice,
      stopLoss: opp.assessment.riskReward?.stopLoss,
      takeProfit: opp.assessment.riskReward?.takeProfit1,
      timestamp: new Date(),
    };
    
    // Optimize the trade
    const optimization = this.profitOptimizer.optimizeTrade(
      decision,
      opp.snapshot,
      this.account?.equity || this.config.initialCapital,
      this.positions
    );
    
    // Create execution order
    const execOrder: ExecutionOrder = {
      id: `exec_${++this.orderIdCounter}`,
      signal: decision,
      optimization,
      status: 'pending',
      requestedAt: new Date(),
      filledQuantity: 0,
      averageFillPrice: 0,
    };
    
    this.pendingOrders.set(execOrder.id, execOrder);
    
    // Update session stats
    if (this.session) {
      this.session.signalsGenerated++;
    }
    
    // Handle based on mode
    if (this.config.mode === 'autonomous' && this.config.autoExecute) {
      await this.executeOrder(execOrder);
    } else if (this.config.mode === 'semi-autonomous') {
      // Request confirmation
      this.requestConfirmation(execOrder);
    } else {
      // Just alert
      this.emit('signalGenerated', execOrder);
    }
  }

  /**
   * Execute a trading order
   */
  private async executeOrder(execOrder: ExecutionOrder): Promise<void> {
    if (!this.broker) return;
    
    try {
      execOrder.status = 'executing';
      execOrder.confirmedAt = new Date();
      
      // Create order request
      const orderRequest = {
        symbol: execOrder.signal.symbol,
        assetId: execOrder.signal.symbol || execOrder.signal.assetId,
        side: execOrder.signal.action === 'buy' ? 'buy' as const : 'sell' as const,
        type: execOrder.optimization.entryTiming === 'now' ? 'market' as const : 'limit' as const,
        quantity: execOrder.optimization.optimizedQuantity,
        price: execOrder.optimization.entryTiming === 'limit' 
          ? execOrder.optimization.optimizedEntry 
          : undefined,
        stopLoss: execOrder.optimization.optimizedStop,
        takeProfit: execOrder.optimization.optimizedTarget,
        timeInForce: 'gtc' as const,
      };
      
      const placedOrder = await this.broker.placeOrder(orderRequest);
      
      execOrder.orderId = placedOrder.id;
      execOrder.status = placedOrder.status === 'filled' ? 'filled' : 'partial';
      execOrder.executedAt = new Date();
      execOrder.filledQuantity = placedOrder.filledQuantity || 0;
      execOrder.averageFillPrice = placedOrder.averagePrice || placedOrder.price || 0;
      
      // Update session stats
      if (this.session) {
        this.session.signalsExecuted++;
        this.session.tradesExecuted++;
      }
      
      this.state.dailyTrades++;
      
      this.emit('orderExecuted', execOrder);
      
      // Alert
      if (this.config.enableAlerting) {
        this.emit('alert', {
          type: 'execution',
          message: `Ordem executada: ${execOrder.signal.action} ${execOrder.signal.symbol}`,
          order: execOrder,
        });
      }
      
    } catch (error) {
      execOrder.status = 'error';
      execOrder.statusReason = error instanceof Error ? error.message : 'Execution failed';
      this.emit('executionError', { order: execOrder, error });
    }
  }

  /**
   * Request confirmation for an order
   */
  private requestConfirmation(execOrder: ExecutionOrder): void {
    execOrder.status = 'pending';
    
    this.emit('confirmationRequired', {
      order: execOrder,
      message: this.formatConfirmationMessage(execOrder),
    });
    
    // If chat is enabled, send message there
    if (this.chatManager) {
      const content = this.formatConfirmationMessage(execOrder);
      // Chat manager would handle this
    }
  }

  /**
   * Confirm and execute a pending order
   */
  async confirmOrder(orderId: string): Promise<boolean> {
    const execOrder = this.pendingOrders.get(orderId);
    if (!execOrder || execOrder.status !== 'pending') {
      return false;
    }
    
    execOrder.status = 'confirmed';
    await this.executeOrder(execOrder);
    
    return execOrder.status === 'filled' as ExecutionOrder['status'] || 
           execOrder.status === 'partial' as ExecutionOrder['status'];
  }

  /**
   * Reject a pending order
   */
  rejectOrder(orderId: string, reason?: string): void {
    const execOrder = this.pendingOrders.get(orderId);
    if (!execOrder) return;
    
    execOrder.status = 'rejected';
    execOrder.statusReason = reason || 'Rejected by user';
    
    if (this.session) {
      this.session.signalsRejected++;
    }
    
    this.emit('orderRejected', execOrder);
  }

  /**
   * Handle position optimization action
   */
  private async handlePositionOptimization(
    posOpt: ReturnType<typeof this.profitOptimizer.optimizePositions>[0]
  ): Promise<void> {
    if (!this.broker) return;
    
    switch (posOpt.action) {
      case 'close':
        if (posOpt.urgency === 'immediate') {
          await this.broker.closePosition(posOpt.position.id);
          this.emit('positionClosed', { position: posOpt.position, reason: posOpt.reasoning });
        }
        break;
        
      case 'adjust_stops':
        if (posOpt.newStopLoss) {
          // Find and modify the order
          const orders = await this.broker.getOrders();
          const stopOrder = orders.find(o => 
            o.symbol === posOpt.position.symbol && o.type === 'stop'
          );
          
          if (stopOrder) {
            await this.broker.modifyOrder(stopOrder.id, { 
              price: posOpt.newStopLoss 
            });
          }
        }
        break;
        
      case 'scale_out':
        if (posOpt.scaleQuantity) {
          // Create partial close order
          await this.broker.placeOrder({
            symbol: posOpt.position.symbol,
            side: posOpt.position.side === 'long' ? 'sell' : 'buy',
            type: 'market',
            quantity: posOpt.scaleQuantity,
          });
        }
        break;
        
      case 'scale_in':
        if (this.canTrade() && posOpt.scaleQuantity) {
          await this.broker.placeOrder({
            symbol: posOpt.position.symbol,
            side: posOpt.position.side as OrderSide,
            type: 'market',
            quantity: posOpt.scaleQuantity,
          });
        }
        break;
    }
  }

  // ============================================
  // MONITORING
  // ============================================

  /**
   * Start monitoring intervals
   */
  private startMonitoring(): void {
    // Data refresh
    this.dataRefreshInterval = setInterval(async () => {
      for (const symbol of this.marketData.keys()) {
        await this.loadMarketData(symbol);
      }
    }, this.config.dataRefreshInterval);
    
    // Health check
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
    
    // Position check
    this.positionCheckInterval = setInterval(async () => {
      await this.checkPositions();
    }, this.config.positionCheckInterval);
    
    // Trading cycle (if autonomous)
    if (this.config.mode === 'autonomous') {
      setInterval(() => {
        this.runTradingCycle();
      }, 30 * 1000); // Every 30 seconds
    }
  }

  /**
   * Perform health check
   */
  private performHealthCheck(): void {
    const now = new Date();
    
    // Check connection
    if (this.broker && !this.broker.isConnected()) {
      this.state.connectionStatus = 'disconnected';
      this.state.status = 'error';
      this.emit('alert', {
        type: 'system',
        severity: 'critical',
        message: 'Conexão com corretora perdida',
      });
    }
    
    // Check data freshness
    if (this.state.dataFreshness > 60000) { // 1 minute stale
      this.emit('alert', {
        type: 'system',
        severity: 'warning',
        message: 'Dados de mercado desatualizados',
      });
    }
    
    // Check daily limits
    const dailyLossLimit = (this.account?.equity || this.config.initialCapital) * this.config.maxDailyLoss;
    if (this.state.dailyPnL < -dailyLossLimit * 0.8) {
      this.emit('alert', {
        type: 'risk',
        severity: 'warning',
        message: 'Aproximando do limite de perda diária',
      });
    }
    
    this.state.lastHealthCheck = now;
    this.emit('healthCheck', this.state);
  }

  /**
   * Check and update positions
   */
  private async checkPositions(): Promise<void> {
    if (!this.broker) return;
    
    try {
      const positions = await this.broker.getPositions();
      
      // Calculate P&L changes
      let totalPnL = 0;
      for (const pos of positions) {
        totalPnL += pos.unrealizedPnL || 0;
      }
      
      // Update state
      this.positions = positions;
      this.state.openPositions = positions.length;
      this.state.totalExposure = positions.reduce((sum, p) => sum + p.marketValue, 0);
      
      // Update LivePreview
      if (this.config.enableLivePreview) {
        const orders = await this.broker.getOrders();
        this.livePreview.updatePositions(positions, orders);
      }
      
      // Update chat context
      if (this.chatManager) {
        this.chatManager.updateContext({ positions });
      }
      
      this.emit('positionsUpdated', positions);
      
    } catch (error) {
      this.emit('error', error);
    }
  }

  // ============================================
  // SETUP HANDLERS
  // ============================================

  /**
   * Setup broker event handlers
   */
  private setupBrokerHandlers(): void {
    if (!this.broker) return;
    
    this.broker.on('orderFilled', (...args: unknown[]) => {
      const order = args[0] as Order;
      const execOrder = Array.from(this.pendingOrders.values())
        .find(e => e.orderId === order.id);
      
      if (execOrder) {
        execOrder.status = 'filled';
        execOrder.filledQuantity = order.filledQuantity || order.quantity;
        execOrder.averageFillPrice = order.averagePrice || order.price || 0;
        
        // Record trade
        this.recordTrade(execOrder);
      }
      
      this.emit('orderFilled', order);
    });
    
    this.broker.on('orderCancelled', (...args: unknown[]) => {
      const order = args[0] as Order;
      this.emit('orderCancelled', order);
    });
    
    this.broker.on('positionClosed', (...args: unknown[]) => {
      const position = args[0] as Position;
      this.recordClosedPosition(position);
      this.emit('positionClosed', position);
    });
    
    this.broker.on('error', (error: unknown) => {
      this.state.lastError = error instanceof Error ? error.message : 'Broker error';
      this.emit('brokerError', error);
    });
  }

  /**
   * Setup chat handlers
   */
  private setupChatHandlers(): void {
    if (!this.chatManager) return;
    
    this.chatManager.on('actionExecuted', async (action) => {
      if (action.type === 'confirm_trade' && action.payload) {
        const payload = action.payload as { orderId?: string };
        if (payload.orderId) {
          await this.confirmOrder(payload.orderId);
        }
      } else if (action.type === 'cancel_trade' && action.payload) {
        const payload = action.payload as { orderId?: string };
        if (payload.orderId) {
          this.rejectOrder(payload.orderId, 'Cancelled via chat');
        }
      }
    });
  }

  // ============================================
  // PERFORMANCE TRACKING
  // ============================================

  /**
   * Record a completed trade
   */
  private recordTrade(execOrder: ExecutionOrder): void {
    // Would calculate actual P&L once position is closed
    this.dailyTrades.push({
      pnl: 0, // Updated when position closes
      timestamp: new Date(),
    });
  }

  /**
   * Record closed position
   */
  private recordClosedPosition(position: Position): void {
    const pnl = position.unrealizedPnL || 0;
    
    // Update daily P&L
    this.state.dailyPnL += pnl;
    
    // Update session
    if (this.session) {
      this.session.totalPnL += pnl;
      if (pnl > 0) {
        this.session.wins++;
      } else {
        this.session.losses++;
      }
    }
    
    // Record in profit optimizer
    this.profitOptimizer.recordTrade(position.symbol || position.assetId, pnl);
    
    // Update win rate
    if (this.session && this.session.tradesExecuted > 0) {
      this.state.winRate = this.session.wins / this.session.tradesExecuted;
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Format confirmation message
   */
  private formatConfirmationMessage(order: ExecutionOrder): string {
    const signal = order.signal;
    const opt = order.optimization;
    const reasons = signal.reasoning || [];
    
    return `📊 **Nova Oportunidade de Trading**\n\n` +
      `**${signal.action.toUpperCase()}** ${signal.symbol}\n\n` +
      `• Entrada: ${opt.optimizedEntry.toFixed(2)}\n` +
      `• Stop Loss: ${opt.optimizedStop.toFixed(2)}\n` +
      `• Take Profit: ${opt.optimizedTarget.toFixed(2)}\n` +
      `• Quantidade: ${opt.optimizedQuantity.toFixed(4)}\n\n` +
      `• R/R: ${opt.adjustedRiskReward.toFixed(2)}\n` +
      `• Confiança: ${(signal.confidence * 100).toFixed(0)}%\n\n` +
      `**Razões:**\n${reasons.map((r: string) => `• ${r}`).join('\n')}\n\n` +
      `Confirmar operação?`;
  }

  // ============================================
  // PUBLIC GETTERS
  // ============================================

  getState(): SystemState {
    return { ...this.state };
  }

  getSession(): TradingSession | null {
    return this.session ? { ...this.session } : null;
  }

  getPositions(): Position[] {
    return [...this.positions];
  }

  getConfig(): OrchestratorConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<OrchestratorConfig>): void {
    this.config = { ...this.config, ...updates };
    this.emit('configUpdated', this.config);
  }

  getLivePreviewData() {
    return this.livePreview.generateRenderData();
  }

  getOpportunities(): RankedOpportunity[] {
    return this.profitOptimizer.rankOpportunities(
      this.opportunities,
      this.positions,
      this.account?.equity || this.config.initialCapital
    );
  }
}

// Factory function
export function createAutonomousOrchestrator(
  config?: Partial<OrchestratorConfig>
): AutonomousTradingOrchestrator {
  return new AutonomousTradingOrchestrator(config);
}

// Default export
export default AutonomousTradingOrchestrator;
