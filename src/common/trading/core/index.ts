/**
 * Trading Module Index
 * Exporta todos os componentes do sistema de trading v2.0
 */

// ============================================
// CORE TYPES
// ============================================
export * from './trading-types';

// ============================================
// LEGACY COMPONENTS (still supported)
// ============================================

// AI Brain - Decision Engine
export { TradingAIBrain } from './trading-ai-brain';

// Anti-Detection System
export { AntiDetectionSystem } from './anti-detection-system';

// Risk Management
export { RiskManager } from './risk-manager';

// Strategy Engine
export { StrategyEngine, IStrategy } from './strategy-engine';

// Broker Interface
export { IBroker, BaseBroker, PaperBroker, AccountInfo, Balance } from './broker-interface';

// Trading Service (Orchestrator)
export { TradingService, TradingServiceConfig, tradingService } from './trading-service';

// UI Controller
export { 
  TradingUIController, 
  StatusBarData, 
  PreviewPanelData,
  ChatCommand,
  ChatResponse,
} from './trading-ui';

// ============================================
// NEW V2.0 COMPONENTS - Advanced Trading AI
// ============================================

// Technical Analysis - Comprehensive Indicators
export { 
  TechnicalIndicatorsEngine,
  technicalIndicators,
  type ComprehensiveIndicators,
  type MovingAverageResult,
  type RSIResult,
  type MACDResult,
  type StochasticResult,
  type BollingerBandsResult,
  type ADXResult,
  type IchimokuResult,
  type VolumeAnalysis,
  type SupportResistanceLevel,
  type FibonacciLevels,
  type PivotPoints,
} from './technical-indicators';

// Pattern Recognition - Candlestick, Chart, Harmonic
export {
  PatternRecognitionEngine,
  patternRecognition,
  type DetectedPattern,
  type CandlestickPattern,
  type ChartPattern,
  type HarmonicPattern,
  type PatternScanResult,
} from './pattern-recognition';

// AI Market Vision - Internal visualization for AI
export {
  AIMarketVision,
  createAIMarketVision,
  type MarketSnapshot,
  type OpportunityAssessment,
  type AIDecisionContext,
  type MarketOverview,
  type AIVisualizationMessage,
  type ChartVisualization,
} from './ai-market-vision';

// Market Regime Adapter - Dynamic strategy adjustment
export {
  MarketRegimeAdapter,
  createMarketRegimeAdapter,
  type RegimeState,
  type RegimeCharacteristics,
  type StrategyAdjustments,
  type RegimeTransition,
} from './market-regime-adapter';

// Profit Optimizer - Autonomous profit maximization
export {
  ProfitOptimizer,
  createProfitOptimizer,
  type OptimizationConfig,
  type RankedOpportunity,
  type PositionOptimization,
  type PortfolioOptimization,
  type TradeOptimization,
} from './profit-optimizer';

// Backtesting Engine - Strategy validation
export {
  BacktestingEngine,
  createBacktestingEngine,
  exampleStrategies,
  type BacktestConfig,
  type BacktestTrade,
  type BacktestMetrics,
  type EquityCurve,
  type BacktestResult,
  type WalkForwardResult,
  type MonteCarloResult,
  type StrategySignal,
  type StrategyFunction,
} from './backtesting-engine';

// LivePreview & Chat Integration
export {
  LivePreviewManager,
  TradingChatManager,
  createLivePreviewManager,
  createTradingChatManager,
  type LivePreviewConfig,
  type ChartAnnotation,
  type ChartSignal,
  type LivePreviewState,
  type LivePreviewRenderData,
  type ChatMessage,
  type ChatAttachment,
  type ChatAction,
  type ChatCommand as NewChatCommand,
  type ChatContext,
  type ChatPreferences,
  type ChatCommandResult,
  type BrokerConnection,
  type BrokerCommand,
  type BrokerCommandResult,
} from './live-chat-integration';

// Autonomous Orchestrator - Full system control
export {
  AutonomousTradingOrchestrator,
  createAutonomousOrchestrator,
  type OrchestratorConfig,
  type SystemState,
  type TradingSession,
  type ExecutionOrder,
  type OrchestratorEvent,
  type BrokerAdapter,
} from './autonomous-orchestrator';

// ============================================
// V2.1 COMPONENTS - Cost Optimization & User Protection
// ============================================

// Resource Manager - Token & resource tracking
export {
  ResourceManager,
  createResourceManager,
  getResourceManager,
  DEFAULT_TIER_LIMITS,
  OPERATION_COSTS,
  ADAPTIVE_ANALYSIS_CONFIG,
  ResourceExhaustedError,
  type UserTier,
  type AnalysisLevel,
  type ResourceQuota,
  type TierLimits,
  type CacheEntry,
  type ResourceStatus,
  type ResourceUsageReport,
  type AdaptiveAnalysisConfig,
} from './resource-manager';

// Economical Analysis - Cost-optimized AI analysis
export {
  EconomicalAnalysisEngine,
  getEconomicalEngine,
  createEconomicalEngine,
  DEFAULT_ECONOMICAL_CONFIG,
  type EconomicalConfig,
  type EconomicalAnalysisResult,
  type PartialAnalysisData,
} from './economical-analysis';

// Resource-Aware Orchestrator - Full system with cost protection
export {
  ResourceAwareOrchestrator,
  createResourceAwareOrchestrator,
  formatResourceStatusForUI,
  type ResourceAwareConfig,
  type ResourceAwareState,
  type UserNotification,
  type NotificationAction,
  type ResourceStatusUI,
} from './resource-aware-orchestrator';

// Resource Status UI Components
export {
  ResourceStatusCard,
  NotificationCard,
  NotificationList,
  AnalysisLevelSelector,
  SessionStats,
  UpgradePrompt,
  ResourceUIStyles,
  getProgressColor,
  getTierColor,
  getNotificationColor,
} from './resource-status-ui';

// ============================================
// VERSION
// ============================================
export const TRADING_SYSTEM_VERSION = '2.1.0';

// ============================================
// QUICK START FACTORY FUNCTIONS
// ============================================

import { AutonomousTradingOrchestrator, OrchestratorConfig, BrokerAdapter } from './autonomous-orchestrator';
import { EventEmitter } from 'events';
import { Position, Order, Quote, OHLCV, AccountInfo } from './trading-types';

/**
 * Create a fully configured trading system
 */
export function createTradingSystem(
  broker: BrokerAdapter,
  symbols: string[],
  config?: Partial<OrchestratorConfig>
): {
  orchestrator: AutonomousTradingOrchestrator;
  initialize: () => Promise<boolean>;
  start: () => void;
  stop: () => Promise<void>;
} {
  const orchestrator = new AutonomousTradingOrchestrator(config);
  
  return {
    orchestrator,
    initialize: () => orchestrator.initialize(broker, symbols),
    start: () => orchestrator.resume(),
    stop: () => orchestrator.stop(),
  };
}

/**
 * Create paper trading system for testing
 */
export function createPaperTradingSystem(
  symbols: string[],
  initialCapital: number = 10000
): {
  orchestrator: AutonomousTradingOrchestrator;
  paperBroker: PaperTradingBroker;
  initialize: () => Promise<boolean>;
} {
  const paperBroker = new PaperTradingBroker(initialCapital);
  const orchestrator = new AutonomousTradingOrchestrator({
    mode: 'semi-autonomous',
    autoExecute: false,
    initialCapital,
  });
  
  return {
    orchestrator,
    paperBroker,
    initialize: () => orchestrator.initialize(paperBroker, symbols),
  };
}

// ============================================
// PAPER TRADING BROKER (SIMULADO)
// ============================================

export class PaperTradingBroker extends EventEmitter implements BrokerAdapter {
  private connected: boolean = false;
  private capital: number;
  private priceFeed: Map<string, number> = new Map();
  private positions: Map<string, Position> = new Map();
  private orders: Map<string, Order> = new Map();
  private orderIdCounter: number = 0;
  
  constructor(initialCapital: number = 10000) {
    super();
    this.capital = initialCapital;
  }

  private hashSymbol(symbol: string): number {
    let h = 2166136261;
    for (let i = 0; i < symbol.length; i++) {
      h ^= symbol.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  private getBasePrice(symbol: string): number {
    const seed = this.hashSymbol(symbol);
    const bucket = seed % 5000;
    return 20 + bucket / 10; // 20 .. 520
  }

  private getDeterministicPrice(symbol: string, nowMs: number): number {
    const seed = this.hashSymbol(symbol);
    const base = this.getBasePrice(symbol);

    // Oscilação determinística suave (sem Math.random): ~±1.5%
    const phase = (seed % 360) * (Math.PI / 180);
    const t = nowMs / 60000; // minutos
    const drift = 0.015 * Math.sin(t / 5 + phase) + 0.006 * Math.sin(t / 17 + phase * 0.7);
    const price = base * (1 + drift);

    return Math.max(0.01, price);
  }
  
  async connect(): Promise<boolean> {
    this.connected = true;
    return true;
  }
  
  async disconnect(): Promise<void> {
    this.connected = false;
  }
  
  isConnected(): boolean {
    return this.connected;
  }
  
  async getAccountInfo(): Promise<AccountInfo> {
    return {
      id: 'paper_account',
      currency: 'USD',
      balance: this.capital,
      equity: this.capital,
      buyingPower: this.capital * 2,
      cashAvailable: this.capital,
      portfolioValue: this.capital,
      dayTradingBuyingPower: this.capital * 4,
      initialMargin: 0,
      maintenanceMargin: 0,
      marginUsed: 0,
      dayTradesRemaining: 3,
      accountType: 'paper',
      status: 'active',
    };
  }
  
  async getPositions(): Promise<Position[]> {
    return Array.from(this.positions.values());
  }
  
  async getOrders(): Promise<Order[]> {
    return Array.from(this.orders.values());
  }
  
  async getQuote(symbol: string): Promise<Quote> {
    const now = Date.now();
    const deterministic = this.getDeterministicPrice(symbol, now);

    // Mantém um feed contínuo por símbolo (determinístico no tempo)
    const last = deterministic;
    this.priceFeed.set(symbol, last);

    const spread = Math.max(0.01, last * 0.0005); // 0.05%

    return {
      symbol,
      bid: last - spread / 2,
      ask: last + spread / 2,
      last,
      bidSize: 1000,
      askSize: 1000,
      lastSize: 250,
      volume: 250000,
      timestamp: now,
    };
  }
  
  async getOHLCV(symbol: string, timeframe: string, limit: number): Promise<OHLCV[]> {
    const candles: OHLCV[] = [];
    const now = Date.now();
    const msPerCandle = this.parseTimeframe(timeframe);

    const seed = this.hashSymbol(symbol);
    const base = this.getBasePrice(symbol);
    const phase = (seed % 360) * (Math.PI / 180);
    
    for (let i = limit - 1; i >= 0; i--) {
      const ts = now - i * msPerCandle;
      const t = ts / 60000; // minutos

      // Série determinística: variação suave + micro variação
      const v1 = 0.02 * Math.sin(t / 7 + phase);
      const v2 = 0.008 * Math.sin(t / 3 + phase * 0.7);
      const open = base * (1 + v1);
      const close = base * (1 + v2);
      const high = Math.max(open, close) * 1.004;
      const low = Math.min(open, close) * 0.996;
      
      candles.push({
        timestamp: ts,
        open,
        high,
        low,
        close,
        volume: Math.floor(150000 + 50000 * (1 + Math.sin(t / 11 + phase))),
      });
    }
    
    return candles;
  }
  
  subscribeToQuotes(symbols: string[], callback: (quote: Quote) => void): () => void {
    const interval = setInterval(() => {
      for (const symbol of symbols) {
        this.getQuote(symbol).then(callback);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }
  
  async placeOrder(order: Partial<Order>): Promise<Order> {
    const id = `order_${++this.orderIdCounter}`;
    
    const fullOrder: Order = {
      id,
      clientOrderId: id,
      symbol: order.symbol || '',
      assetId: order.assetId || order.symbol || '',
      side: order.side || 'buy',
      type: order.type || 'market',
      quantity: order.quantity || 0,
      price: order.price,
      stopPrice: order.stopPrice,
      stopLoss: order.stopLoss,
      takeProfit: order.takeProfit,
      timeInForce: order.timeInForce || 'gtc',
      status: 'filled',
      filledQuantity: order.quantity || 0,
      averagePrice: order.price || 100,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    this.orders.set(id, fullOrder);
    
    if (order.type === 'market' || fullOrder.status === 'filled') {
      const posId = `pos_${Date.now()}`;
      const position: Position = {
        id: posId,
        symbol: fullOrder.symbol,
        assetId: fullOrder.assetId,
        side: fullOrder.side === 'buy' ? 'long' : 'short',
        quantity: fullOrder.quantity,
        averagePrice: fullOrder.averagePrice || 100,
        averageEntryPrice: fullOrder.averagePrice || 100,
        marketValue: fullOrder.quantity * (fullOrder.averagePrice || 100),
        costBasis: fullOrder.quantity * (fullOrder.averagePrice || 100),
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        currentPrice: fullOrder.averagePrice || 100,
        stopLoss: fullOrder.stopLoss,
        takeProfit: fullOrder.takeProfit,
        openedAt: Date.now(),
        leverage: 1,
      };
      
      this.positions.set(posId, position);
    }
    
    this.emit('orderFilled', fullOrder);
    return fullOrder;
  }
  
  async cancelOrder(orderId: string): Promise<boolean> {
    const order = this.orders.get(orderId);
    if (order) {
      order.status = 'cancelled';
      this.emit('orderCancelled', order);
      return true;
    }
    return false;
  }
  
  async modifyOrder(orderId: string, updates: Partial<Order>): Promise<Order> {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found');
    Object.assign(order, updates);
    order.updatedAt = new Date();
    return order;
  }
  
  async closePosition(positionId: string): Promise<boolean> {
    const position = this.positions.get(positionId);
    if (position) {
      this.positions.delete(positionId);
      this.emit('positionClosed', position);
      return true;
    }
    return false;
  }
  
  private parseTimeframe(tf: string): number {
    const unit = tf.slice(-1);
    const value = parseInt(tf.slice(0, -1)) || 1;
    switch (unit) {
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000;
    }
  }
}
