/**
 * Aethel Trading AI - Type Definitions
 * Tipos fundamentais para o sistema de trading autônomo
 */

// ============================================
// MARKET TYPES
// ============================================

export type MarketType = 'equity' | 'crypto' | 'forex' | 'futures' | 'options' | 'commodity' | 'stock';
export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop';
export type OrderStatus = 'pending' | 'open' | 'partial' | 'filled' | 'cancelled' | 'rejected';
export type TimeInForce = 'GTC' | 'IOC' | 'FOK' | 'DAY' | 'day' | 'gtc' | 'ioc' | 'fok';

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: MarketType;
  exchange: string;
  currency: string;
  minQuantity?: number;
  quantityStep?: number;
  priceStep?: number;
  tradingHours?: TradingHours;
}

export interface TradingHours {
  timezone: string;
  sessions: Array<{
    open: string;  // HH:MM
    close: string; // HH:MM
    days: number[]; // 0-6, domingo-sábado
  }>;
}

// ============================================
// PRICE & QUOTE TYPES
// ============================================

export interface Quote {
  symbol: string;
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
  last: number;
  lastSize: number;
  volume: number;
  timestamp: number;
}

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
  orders?: number;
}

export interface OrderBook {
  assetId: string;
  symbol?: string;
  bids: OrderBookLevel[] | Array<{ price: number; quantity: number }>;
  asks: OrderBookLevel[] | Array<{ price: number; quantity: number }>;
  timestamp: Date | number;
}

// ============================================
// ORDER TYPES
// ============================================

export interface Order {
  id: string;
  clientOrderId?: string;
  assetId: string;
  symbol?: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
  stopPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  trailingPercent?: number;
  timeInForce?: TimeInForce;
  status: OrderStatus;
  filledQuantity: number;
  averagePrice: number;
  createdAt: Date | number;
  updatedAt: Date | number;
  brokerId?: string;
  metadata?: Record<string, any>;
}

export interface OrderRequest {
  assetId: string;
  symbol?: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
  stopPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  trailingPercent?: number;
  timeInForce?: TimeInForce;
  reduceOnly?: boolean;
  postOnly?: boolean;
  metadata?: Record<string, any>;
}

// ============================================
// POSITION TYPES
// ============================================

export interface Position {
  id: string;
  assetId: string;
  symbol?: string;
  side: 'long' | 'short' | 'flat';
  quantity: number;
  averagePrice: number;
  averageEntryPrice?: number;
  currentPrice?: number;
  marketValue: number;
  unrealizedPnL?: number;
  unrealizedPnLPercent?: number;
  realizedPnL?: number;
  openedAt: Date | number;
  brokerId?: string;
  stopLoss?: number;
  takeProfit?: number;
  costBasis?: number;
  leverage?: number;
  metadata?: Record<string, any>;
}

// ============================================
// STRATEGY TYPES
// ============================================

export type StrategyType = 
  | 'trend_following'
  | 'mean_reversion'
  | 'breakout'
  | 'momentum'
  | 'arbitrage'
  | 'market_making'
  | 'event_driven'
  | 'statistical'
  | 'scalping'
  | 'ensemble';

export type MarketRegime = 
  | 'trending_up'
  | 'trending_down'
  | 'ranging'
  | 'volatile'
  | 'low_volatility'
  | 'crash'
  | 'recovery'
  | 'unknown';

export interface Strategy {
  id: string;
  name: string;
  type: StrategyType;
  description?: string;
  parameters: Record<string, any>;
  supportedMarkets?: MarketType[];
  supportedRegimes?: MarketRegime[];
  riskLevel?: 'low' | 'medium' | 'high';
  enabled?: boolean;
  performance?: StrategyPerformance;
}

export interface StrategyPerformance {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  avgWin?: number;
  avgLoss?: number;
  averageReturn?: number;
  lastUpdated: Date | number;
}

export interface StrategySignal {
  strategyId: string;
  assetId: string;
  symbol?: string;
  action: 'buy' | 'sell' | 'hold' | 'close';
  confidence: number;  // 0-1
  strength?: number;    // 0-1
  reasoning?: string[];
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  suggestedQuantity?: number;
  suggestedEntry?: number;
  suggestedStop?: number;
  suggestedTarget?: number;
  timestamp: Date | number;
  expiresAt?: number;
  metadata?: Record<string, any>;
}

// ============================================
// ACCOUNT TYPES
// ============================================

export interface AccountInfo {
  id: string;
  balance: number;
  equity: number;
  margin?: number;
  freeMargin?: number;
  currency?: string;
  leverage?: number;
  marginLevel?: number;
  buyingPower?: number;
  cashAvailable?: number;
  portfolioValue?: number;
  dayTradingBuyingPower?: number;
  initialMargin?: number;
  maintenanceMargin?: number;
  marginUsed?: number;
  dayTradesRemaining?: number;
  accountType?: string;
  status?: string;
}

export interface Balance {
  asset: string;
  free: number;
  locked: number;
  total: number;
}

// ============================================
// RISK TYPES
// ============================================

export type RiskLevel = 'low' | 'medium' | 'high' | 'conservative' | 'moderate' | 'aggressive';

export interface RiskParameters {
  perTrade: {
    maxPositionSize: number;        // % do capital
    maxLossPerTrade: number;        // % do capital
    minRiskRewardRatio: number;
    requireStopLoss: boolean;
    stopLoss: {
      defaultPct: number;
      useATR: boolean;
      atrMultiplier: number;
      useVolatility: boolean;
    };
  };
  daily: {
    maxDailyLoss: number;           // % do capital
    maxTradesPerDay: number;
    coolingPeriodAfterLoss: number; // ms
  };
  period: {
    maxWeeklyDrawdown: number;
    maxMonthlyDrawdown: number;
  };
  systemic: {
    maxConcentrationPerAsset: number;
    maxSectorConcentration: number;
    maxCorrelation: number;
    minCashReserve: number;
  };
  kellyMultiplier: number;          // Fraction of Kelly to use
  maxPositionSize?: number;
  maxPortfolioRisk?: number;
  maxDrawdown?: number;
  stopLossRequired?: boolean;
  minRiskReward?: number;
  maxLeverage?: number;
  maxOpenPositions?: number;
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  score: number;              // 0-100
  warnings: string[];
  blocks: string[];
  recommendations: string[];
  canTrade?: boolean;
  riskScore?: number;
  blockers?: string[];
  adjustedQuantity?: number;
  adjustedStopLoss?: number;
  reasoning?: string;
}

// ============================================
// AUTONOMY TYPES
// ============================================

export type AutonomyLevel = 
  | 'advisory'      // Só sugere
  | 'semi_auto'     // Executa com confirmação
  | 'full_auto'     // Totalmente autônomo
  | 'guardian';     // Só protege patrimônio

export interface AutonomyConfig {
  level: AutonomyLevel;
  allowedActions: Array<'analyze' | 'alert' | 'suggest' | 'execute' | 'manage'>;
  requireConfirmation: boolean;
  confirmationTimeout: number;  // ms, 0 = indefinido
  maxTradeValue: number;        // Valor máximo por trade
  emergencyStopEnabled: boolean;
}

// ============================================
// ANALYSIS TYPES
// ============================================

export interface TechnicalAnalysis {
  symbol: string;
  timeframe: string;
  trend: {
    direction: 'up' | 'down' | 'sideways';
    strength: number;
    duration: number;
  };
  indicators: Record<string, number>;
  patterns: string[];
  support: number[];
  resistance: number[];
  signals: Array<{
    indicator: string;
    signal: 'buy' | 'sell' | 'neutral';
    value: number;
  }>;
  timestamp: number;
}

export interface FundamentalAnalysis {
  symbol: string;
  valuation: {
    pe: number;
    pb: number;
    ps: number;
    evEbitda: number;
    dcfValue: number;
    fairValue: number;
    upside: number;
  };
  financials: {
    revenue: number;
    revenueGrowth: number;
    profit: number;
    profitMargin: number;
    roe: number;
    debt: number;
    debtToEquity: number;
  };
  quality: {
    score: number;
    moat: 'none' | 'narrow' | 'wide';
    management: number;
    governance: number;
  };
  rating: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  timestamp: number;
}

export interface SentimentAnalysis {
  symbol: string;
  overall: number;           // -1 a 1
  social: {
    twitter: number;
    reddit: number;
    stocktwits: number;
    volume: number;          // Volume de menções
    trending: boolean;
  };
  news: {
    score: number;
    recentHeadlines: string[];
    volume: number;
  };
  institutional: {
    netFlow: number;         // Fluxo líquido
    shortInterest: number;
    insiderActivity: number;
  };
  fearGreedIndex: number;    // 0-100
  timestamp: number;
}

export interface MarketAnalysis {
  symbol: string;
  technical: TechnicalAnalysis;
  fundamental?: FundamentalAnalysis;
  sentiment?: SentimentAnalysis;
  regime: MarketRegime;
  overallScore: number;
  recommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  confidence: number;
  reasoning: string[];
  timestamp: number;
}

// ============================================
// TRADE DECISION TYPES
// ============================================

export interface TradeDecision {
  id?: string;
  assetId: string;
  symbol?: string;
  action: 'buy' | 'sell' | 'hold' | 'close';
  orderType?: OrderType;
  quantity?: number;
  size?: number;
  price?: number;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  riskReward?: number;
  confidence: number;
  reasoning?: string[];
  selfQuestions?: Array<{
    question: string;
    answer: string;
    validated: boolean;
  }>;
  signals?: StrategySignal[];
  riskAssessment?: RiskAssessment;
  strategySource?: string;
  timestamp: Date | number;
  expiresAt?: number;
  executed?: boolean;
  executedAt?: number;
  resultingOrder?: Order;
}

// ============================================
// ANTI-DETECTION TYPES
// ============================================

export interface HumanBehaviorConfig {
  reactionTime: {
    baseMs: number;
    varianceMs: number;
    distribution: 'gaussian' | 'uniform';
  };
  tradingHours: {
    start: string;
    end: string;
    lunchBreak?: { start: string; end: string };
    timezone: string;
  };
  orderPatterns: {
    splitLargeOrders: boolean;
    maxOrderSize: number;
    randomizeSize: boolean;
    useIceberg: boolean;
  };
  activityPatterns: {
    maxTradesPerHour: number;
    cooldownAfterTrade: number;
    simulateFatigue: boolean;
  };
}

export interface AntiDetectionMetrics {
  humanScore: number;          // 0-100, quão humano parece
  patternVariance: number;     // Variância nos padrões
  timingRandomness: number;    // Aleatoriedade no timing
  sizeDistribution: string;    // Distribuição de tamanhos
  warnings: string[];
}

// ============================================
// BROKER TYPES
// ============================================

export type BrokerType = 'api' | 'fix' | 'web';

export interface BrokerConfig {
  id: string;
  name: string;
  type: BrokerType;
  markets: MarketType[];
  credentials: {
    apiKey?: string;
    apiSecret?: string;
    passphrase?: string;
    accountId?: string;
  };
  endpoints: {
    rest?: string;
    websocket?: string;
    fix?: string;
  };
  rateLimit: {
    requestsPerSecond: number;
    ordersPerSecond: number;
  };
  features: {
    streaming: boolean;
    marginTrading: boolean;
    shortSelling: boolean;
    options: boolean;
    futures: boolean;
  };
}

export interface BrokerStatus {
  brokerId: string;
  connected: boolean;
  latencyMs: number;
  lastHeartbeat: number;
  errors: string[];
  restrictions: string[];
}

// ============================================
// PERFORMANCE TYPES
// ============================================

export interface PerformanceMetrics {
  period: 'day' | 'week' | 'month' | 'year' | 'all';
  startDate: number;
  endDate: number;
  startingCapital: number;
  endingCapital: number;
  totalReturn: number;
  totalReturnPercent: number;
  trades: {
    total: number;
    winners: number;
    losers: number;
    winRate: number;
    averageWin: number;
    averageLoss: number;
    largestWin: number;
    largestLoss: number;
  };
  ratios: {
    sharpeRatio: number;
    sortinoRatio: number;
    calmarRatio: number;
    profitFactor: number;
    payoffRatio: number;
  };
  risk: {
    maxDrawdown: number;
    maxDrawdownDuration: number;
    volatility: number;
    var95: number;
    var99: number;
  };
}

// ============================================
// PORTFOLIO METRICS TYPES
// ============================================

export interface PortfolioMetrics {
  totalValue: number;
  totalPnL: number;
  unrealizedPnL: number;
  realizedPnL: number;
  drawdown: number;
  maxDrawdown: number;
  sharpeRatio: number;
  concentration: number;
  correlationRisk: number;
  positionCount: number;
  cashRatio: number;
}

// ============================================
// CIRCUIT BREAKER TYPES
// ============================================

export interface CircuitBreaker {
  type: string;
  threshold: number;
  cooldownPeriod: number;
  triggered: boolean;
  reason?: string;
  triggeredAt?: Date;
  cooldownEndsAt?: Date;
}

export interface RiskEvent {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  data?: Record<string, any>;
}

// ============================================
// BROKER CAPABILITY TYPES
// ============================================

export interface BrokerCapabilities {
  orderTypes: OrderType[];
  timeInForce: string[];
  supportsMarginTrading: boolean;
  supportsShortSelling: boolean;
  supportsOptions: boolean;
  supportsFutures: boolean;
  supportsCrypto: boolean;
  maxOrderSize: number;
  minOrderSize: number;
  supportedMarkets: string[];
}

export interface BrokerConnectionStatus {
  connected: boolean;
  latency: number;
  lastUpdate: Date;
  error?: string;
}

// ============================================
// USER PREFERENCE TYPES
// ============================================

export interface TradingPreferences {
  autonomyLevel: AutonomyLevel;
  riskLevel: RiskLevel;
  preferredMarkets: MarketType[];
  preferredStrategies: StrategyType[];
  notifications: {
    trades: boolean;
    alerts: boolean;
    dailyReport: boolean;
    weeklyReport: boolean;
  };
  ui: {
    showStatusBar: boolean;
    showPreviewPanel: boolean;
    compactMode: boolean;
  };
}

// ============================================
// AI STATE TYPES
// ============================================

export interface AITradingState {
  isActive: boolean;
  status: string;
  autonomyLevel: AutonomyLevel;
  mode?: AutonomyLevel;
  currentAnalysis: any | null;
  currentFocus?: string | null;
  pendingDecisions: TradeDecision[];
  executedTrades: any[];
  activePositions: Position[];
  openPositions?: Position[];
  activeStrategies?: Strategy[];
  dailyPnL: number;
  totalPnL: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastAnalysisTime: Date | null;
  events: TradingEvent[];
  tradesExecuted: number;
  signalsToday: number;
  marketView?: {
    overall: 'bullish' | 'bearish' | 'neutral' | 'uncertain';
    confidence: number;
    reasoning: string[];
  };
  performance?: {
    today: PerformanceMetrics;
    week: PerformanceMetrics;
    month: PerformanceMetrics;
  };
  selfAssessment?: {
    lastQuestioningAt: number;
    concerns: string[];
    improvements: string[];
    learnings: string[];
  };
  lastUpdated?: number;
}

// ============================================
// EVENT TYPES
// ============================================

export interface TradingEvent {
  id?: string;
  type: 
    | 'order_placed'
    | 'order_filled'
    | 'order_cancelled'
    | 'position_opened'
    | 'position_closed'
    | 'stop_triggered'
    | 'target_reached'
    | 'signal_generated'
    | 'decision_made'
    | 'risk_alert'
    | 'circuit_breaker'
    | 'order'
    | 'trade'
    | 'analysis'
    | 'risk'
    | 'system'
    | 'blocked'
    | 'error'
    | 'risk_critical';
  data: Record<string, any>;
  timestamp: Date | number;
  importance?: 'low' | 'medium' | 'high' | 'critical';
}
