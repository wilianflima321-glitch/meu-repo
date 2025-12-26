/**
 * AI Market Vision
 * Sistema de visualização interna para IAs - dados estruturados para tomada de decisão
 * Interface visual conceitual que a IA usa para "ver" o mercado
 * 
 * ATUALIZAÇÃO: Agora com integração LLM para análises mais profundas!
 */

import { EventEmitter } from 'events';
import { 
  OHLCV, 
  Quote, 
  MarketRegime,
  Position,
  Order,
} from './trading-types';
import { 
  TechnicalIndicatorsEngine, 
  ComprehensiveIndicators,
  SupportResistanceLevel,
} from './technical-indicators';
import { 
  PatternRecognitionEngine, 
  PatternScanResult, 
  DetectedPattern 
} from './pattern-recognition';
import { getLLMBridge, LLMIntegrationBridge, TradingAnalysisResult } from '../../llm/llm-integration-bridge';

// ============================================
// AI VISION TYPES
// ============================================

export interface MarketSnapshot {
  symbol: string;
  timestamp: number;
  
  // Current State
  currentPrice: number;
  bid: number;
  ask: number;
  spread: number;
  spreadPercent: number;
  
  // Price Context
  priceChange24h: number;
  priceChangePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  
  // Technical Summary
  indicators: ComprehensiveIndicators | null;
  patterns: PatternScanResult | null;
  
  // Key Levels (most important)
  keyLevels: {
    immediateResistance: number | null;
    immediateSupport: number | null;
    strongResistance: number | null;
    strongSupport: number | null;
    dailyPivot: number;
  };
  
  // Trend Analysis
  trend: {
    shortTerm: 'up' | 'down' | 'sideways';
    mediumTerm: 'up' | 'down' | 'sideways';
    longTerm: 'up' | 'down' | 'sideways';
    strength: number;
    momentum: number;
  };
  
  // Volatility
  volatility: {
    current: number;
    average: number;
    expanding: boolean;
    regime: 'low' | 'normal' | 'high' | 'extreme';
  };
  
  // Volume Analysis
  volume: {
    current: number;
    average: number;
    ratio: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    buyPressure: number; // 0-1
  };
  
  // Market Regime
  regime: MarketRegime;
  regimeConfidence: number;
  
  // Overall Assessment
  bias: 'strong_bullish' | 'bullish' | 'neutral' | 'bearish' | 'strong_bearish';
  confidence: number;
  tradingConditions: 'excellent' | 'good' | 'fair' | 'poor' | 'avoid';
}

export interface OpportunityAssessment {
  symbol: string;
  timestamp: number;
  
  // Trade Setup
  hasSetup: boolean;
  setupQuality: number; // 0-100
  setupType: string | null;
  
  // Entry Analysis
  entry: {
    recommendedPrice: number;
    entryType: 'market' | 'limit' | 'stop';
    entryZone: { min: number; max: number };
    timing: 'now' | 'wait' | 'missed';
  } | null;
  
  // Risk/Reward
  riskReward: {
    stopLoss: number;
    takeProfit1: number;
    takeProfit2?: number;
    takeProfit3?: number;
    riskPercent: number;
    rewardPercent: number;
    ratio: number;
  } | null;
  
  // Confidence Factors
  confidenceFactors: {
    technicalAlignment: number;
    patternConfirmation: number;
    volumeConfirmation: number;
    trendAlignment: number;
    levelProximity: number;
    timeOfDay: number;
    overall: number;
  };
  
  // Risk Factors
  riskFactors: string[];
  
  // Recommended Action
  action: 'buy' | 'sell' | 'wait' | 'avoid';
  urgency: 'immediate' | 'soon' | 'patient' | 'none';
  reasoning: string[];
}

export interface MarketOverview {
  timestamp: number;
  
  // Watchlist Summary
  markets: Map<string, MarketSnapshot>;
  
  // Best Opportunities (ranked)
  topOpportunities: OpportunityAssessment[];
  
  // Market Conditions
  marketConditions: {
    overall: 'risk_on' | 'risk_off' | 'mixed' | 'uncertain';
    volatilityEnvironment: 'low' | 'normal' | 'high' | 'extreme';
    trendingMarkets: string[];
    rangingMarkets: string[];
    avoidMarkets: string[];
  };
  
  // Correlations
  correlations: {
    strongPositive: Array<{ pair: [string, string]; correlation: number }>;
    strongNegative: Array<{ pair: [string, string]; correlation: number }>;
  };
  
  // News/Events
  upcomingEvents: Array<{
    time: number;
    event: string;
    impact: 'low' | 'medium' | 'high';
    affectedSymbols: string[];
  }>;
}

export interface AIDecisionContext {
  timestamp: number;
  
  // Market Data
  snapshot: MarketSnapshot;
  opportunity: OpportunityAssessment;
  
  // Portfolio Context
  portfolio: {
    totalValue: number;
    availableCash: number;
    usedMargin: number;
    currentExposure: number;
    maxExposure: number;
    openPositions: Position[];
    pendingOrders: Order[];
    todayPnL: number;
    weekPnL: number;
  };
  
  // Risk Limits
  riskLimits: {
    maxPositionSize: number;
    maxLossPerTrade: number;
    remainingDailyRisk: number;
    remainingWeeklyRisk: number;
    correlatedExposure: number;
  };
  
  // Historical Context
  history: {
    recentTrades: Array<{
      symbol: string;
      side: 'buy' | 'sell';
      pnl: number;
      timestamp: number;
    }>;
    performanceThisAsset: {
      trades: number;
      winRate: number;
      avgPnL: number;
    };
    lastTradedAt: number | null;
  };
  
  // Decision Support
  support: {
    alignedIndicators: string[];
    conflictingIndicators: string[];
    supportingPatterns: DetectedPattern[];
    warnings: string[];
    suggestions: string[];
  };
}

// ============================================
// VISUALIZATION MESSAGES FOR LIVEPREVIEW
// ============================================

export interface AIVisualizationMessage {
  type: 'chart' | 'analysis' | 'opportunity' | 'decision' | 'alert';
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  data: any;
  displayFormat: 'card' | 'chart' | 'table' | 'notification';
}

export interface ChartVisualization {
  symbol: string;
  timeframe: string;
  candles: OHLCV[];
  indicators: {
    name: string;
    values: number[];
    color: string;
    style: 'line' | 'histogram' | 'area';
  }[];
  annotations: {
    type: 'line' | 'ray' | 'zone' | 'arrow' | 'text';
    from: { x: number; y: number };
    to?: { x: number; y: number };
    color: string;
    label?: string;
  }[];
  patterns: {
    name: string;
    startX: number;
    endX: number;
    highlight: boolean;
  }[];
}

// ============================================
// AI MARKET VISION ENGINE
// ============================================

export class AIMarketVision extends EventEmitter {
  private indicatorsEngine: TechnicalIndicatorsEngine;
  private patternEngine: PatternRecognitionEngine;
  private llmBridge: LLMIntegrationBridge;
  private useLLM: boolean = true;
  
  private snapshots: Map<string, MarketSnapshot> = new Map();
  private opportunities: Map<string, OpportunityAssessment> = new Map();
  private watchlist: Set<string> = new Set();
  private llmAnalysisCache: Map<string, { result: TradingAnalysisResult; timestamp: number }> = new Map();
  
  // Update intervals
  private updateInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(
    indicatorsEngine: TechnicalIndicatorsEngine,
    patternEngine: PatternRecognitionEngine,
    options?: { useLLM?: boolean }
  ) {
    super();
    this.indicatorsEngine = indicatorsEngine;
    this.patternEngine = patternEngine;
    
    // Inicializar LLM Bridge
    this.llmBridge = getLLMBridge();
    this.useLLM = options?.useLLM ?? true;
    
    if (this.useLLM && !this.llmBridge.isReady()) {
      console.warn('[AIMarketVision] LLM não disponível - usando apenas indicadores técnicos');
      this.useLLM = false;
    }
  }
  
  // ============================================
  // LLM-POWERED ANALYSIS (NOVO!)
  // ============================================
  
  /**
   * Análise profunda com LLM - combina indicadores técnicos com raciocínio de IA
   */
  async analyzeWithLLM(
    symbol: string,
    snapshot: MarketSnapshot,
    additionalContext?: string
  ): Promise<TradingAnalysisResult | null> {
    if (!this.useLLM || !this.llmBridge.isReady()) {
      return null;
    }
    
    // Verificar cache (1 minuto)
    const cached = this.llmAnalysisCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < 60000) {
      return cached.result;
    }
    
    try {
      console.log(`[AIMarketVision] 🧠 Analisando ${symbol} com LLM...`);
      
      // Preparar indicadores para o LLM
      const indicatorsSummary: Record<string, any> = {};
      
      if (snapshot.indicators) {
        indicatorsSummary['RSI'] = snapshot.indicators.rsi14.value?.toFixed(2);
        indicatorsSummary['MACD'] = {
          value: snapshot.indicators.macd.histogram?.toFixed(4),
          signal: snapshot.indicators.macd.signal
        };
        indicatorsSummary['SMA_20'] = snapshot.indicators.sma20?.value?.toFixed(2);
        indicatorsSummary['SMA_50'] = snapshot.indicators.sma50?.value?.toFixed(2);
        indicatorsSummary['SMA_200'] = snapshot.indicators.sma200?.value?.toFixed(2);
        indicatorsSummary['EMA_9'] = snapshot.indicators.ema9?.value?.toFixed(2);
        indicatorsSummary['EMA_21'] = snapshot.indicators.ema21?.value?.toFixed(2);
        indicatorsSummary['ATR'] = snapshot.indicators.atr14.normalized?.toFixed(4);
        indicatorsSummary['BBands'] = {
          upper: snapshot.indicators.bollingerBands.upper?.toFixed(2),
          middle: snapshot.indicators.bollingerBands.middle?.toFixed(2),
          lower: snapshot.indicators.bollingerBands.lower?.toFixed(2),
          bandwidth: snapshot.indicators.bollingerBands.bandwidth?.toFixed(4)
        };
        indicatorsSummary['Stochastic'] = snapshot.indicators.stochastic?.k?.toFixed(2);
      }
      
      indicatorsSummary['Trend'] = snapshot.trend;
      indicatorsSummary['Volatility'] = snapshot.volatility;
      indicatorsSummary['Volume'] = snapshot.volume;
      indicatorsSummary['Regime'] = snapshot.regime;
      indicatorsSummary['Bias'] = snapshot.bias;
      
      // Padrões identificados
      const patternNames = snapshot.patterns?.patterns.map(p => 
        `${p.name} (${p.direction}, confiança: ${(p.confidence * 100).toFixed(0)}%)`
      ) || [];
      
      // Chamar LLM Bridge
      const llmResult = await this.llmBridge.analyzeTrade({
        symbol,
        timeframe: '1h',
        indicators: indicatorsSummary,
        patterns: patternNames,
        currentPrice: snapshot.currentPrice,
        context: additionalContext
      });
      
      // Cachear resultado
      this.llmAnalysisCache.set(symbol, {
        result: llmResult,
        timestamp: Date.now()
      });
      
      console.log(`[AIMarketVision] ✅ LLM recomenda: ${llmResult.recommendation} (${llmResult.confidence}% confiança)`);
      
      this.emit('llmAnalysisComplete', { symbol, analysis: llmResult });
      
      return llmResult;
      
    } catch (error) {
      console.error(`[AIMarketVision] ❌ Erro na análise LLM:`, error);
      this.emit('llmAnalysisError', { symbol, error });
      return null;
    }
  }
  
  /**
   * Gera snapshot COM análise LLM integrada
   */
  async generateEnhancedSnapshot(
    symbol: string,
    quote: Quote,
    candles: OHLCV[],
    includeAIAnalysis: boolean = true
  ): Promise<MarketSnapshot & { aiAnalysis?: TradingAnalysisResult }> {
    // Gerar snapshot básico
    const snapshot = this.generateSnapshot(symbol, quote, candles);
    
    // Adicionar análise LLM se habilitado
    if (includeAIAnalysis && this.useLLM) {
      const aiAnalysis = await this.analyzeWithLLM(symbol, snapshot);
      if (aiAnalysis) {
        return { ...snapshot, aiAnalysis };
      }
    }
    
    return snapshot;
  }

  // ============================================
  // WATCHLIST MANAGEMENT
  // ============================================

  addToWatchlist(symbol: string): void {
    this.watchlist.add(symbol);
    this.emit('watchlistUpdated', Array.from(this.watchlist));
  }

  removeFromWatchlist(symbol: string): void {
    this.watchlist.delete(symbol);
    this.snapshots.delete(symbol);
    this.opportunities.delete(symbol);
    this.emit('watchlistUpdated', Array.from(this.watchlist));
  }

  getWatchlist(): string[] {
    return Array.from(this.watchlist);
  }

  // ============================================
  // MARKET SNAPSHOT GENERATION
  // ============================================

  generateSnapshot(
    symbol: string,
    quote: Quote,
    candles: OHLCV[]
  ): MarketSnapshot {
    // Get technical indicators
    this.indicatorsEngine.setPriceHistory(symbol, candles);
    const indicators = this.indicatorsEngine.generateComprehensiveAnalysis(symbol, quote);
    
    // Get pattern analysis
    this.patternEngine.setPriceHistory(symbol, candles);
    const patterns = this.patternEngine.scanAllPatterns(symbol, '1h');
    
    // Calculate 24h stats
    const candles24h = candles.slice(-24);
    const high24h = Math.max(...candles24h.map(c => c.high));
    const low24h = Math.min(...candles24h.map(c => c.low));
    const volume24h = candles24h.reduce((s, c) => s + c.volume, 0);
    const open24h = candles24h[0]?.open || quote.last;
    const priceChange24h = quote.last - open24h;
    const priceChangePercent24h = (priceChange24h / open24h) * 100;
    
    // Determine trends
    const shortTermTrend = this.determineTrend(candles.slice(-10));
    const mediumTermTrend = this.determineTrend(candles.slice(-50));
    const longTermTrend = this.determineTrend(candles.slice(-200));
    
    // Calculate trend strength and momentum
    const trendStrength = this.calculateTrendStrength(indicators);
    const momentum = this.calculateMomentum(indicators);
    
    // Find key levels
    const keyLevels = this.findKeyLevels(indicators, quote.last);
    
    // Determine volatility regime
    const volatilityRegime = this.determineVolatilityRegime(indicators);
    
    // Calculate volume analysis
    const volumeAnalysis = this.analyzeVolume(candles, indicators);
    
    // Determine market regime
    const { regime, confidence: regimeConfidence } = this.determineMarketRegime(
      shortTermTrend,
      mediumTermTrend,
      volatilityRegime,
      indicators
    );
    
    // Calculate overall bias
    const bias = this.calculateBias(indicators, patterns, shortTermTrend);
    
    // Determine trading conditions
    const tradingConditions = this.assessTradingConditions(
      volatilityRegime,
      volumeAnalysis,
      indicators
    );
    
    // Calculate overall confidence
    const confidence = this.calculateOverallConfidence(indicators, patterns);
    
    const snapshot: MarketSnapshot = {
      symbol,
      timestamp: Date.now(),
      currentPrice: quote.last,
      bid: quote.bid,
      ask: quote.ask,
      spread: quote.ask - quote.bid,
      spreadPercent: ((quote.ask - quote.bid) / quote.last) * 100,
      priceChange24h,
      priceChangePercent24h,
      high24h,
      low24h,
      volume24h,
      indicators,
      patterns,
      keyLevels,
      trend: {
        shortTerm: shortTermTrend,
        mediumTerm: mediumTermTrend,
        longTerm: longTermTrend,
        strength: trendStrength,
        momentum,
      },
      volatility: {
        current: indicators?.atr14.normalized || 0,
        average: 2, // TODO: Calculate average ATR
        expanding: indicators?.atr14.expanding || false,
        regime: volatilityRegime,
      },
      volume: volumeAnalysis,
      regime,
      regimeConfidence,
      bias,
      confidence,
      tradingConditions,
    };
    
    this.snapshots.set(symbol, snapshot);
    this.emit('snapshotUpdated', snapshot);
    
    return snapshot;
  }

  // ============================================
  // OPPORTUNITY ASSESSMENT
  // ============================================

  assessOpportunity(
    symbol: string,
    snapshot: MarketSnapshot,
    riskParams: { maxRiskPercent: number; minRiskReward: number }
  ): OpportunityAssessment {
    const { indicators, patterns } = snapshot;
    
    // Check if there's a valid setup
    const { hasSetup, setupQuality, setupType } = this.identifySetup(snapshot);
    
    // Calculate entry parameters
    const entry = hasSetup ? this.calculateEntry(snapshot) : null;
    
    // Calculate risk/reward
    const riskReward = hasSetup && entry ? this.calculateRiskReward(
      snapshot,
      entry.recommendedPrice,
      riskParams.minRiskReward
    ) : null;
    
    // Calculate confidence factors
    const confidenceFactors = this.calculateConfidenceFactors(snapshot);
    
    // Identify risk factors
    const riskFactors = this.identifyRiskFactors(snapshot);
    
    // Determine recommended action
    const { action, urgency, reasoning } = this.determineAction(
      snapshot,
      hasSetup,
      setupQuality,
      riskReward,
      confidenceFactors,
      riskFactors
    );
    
    const assessment: OpportunityAssessment = {
      symbol,
      timestamp: Date.now(),
      hasSetup,
      setupQuality,
      setupType,
      entry,
      riskReward,
      confidenceFactors,
      riskFactors,
      action,
      urgency,
      reasoning,
    };
    
    this.opportunities.set(symbol, assessment);
    this.emit('opportunityAssessed', assessment);
    
    return assessment;
  }

  // ============================================
  // DECISION CONTEXT GENERATION
  // ============================================

  generateDecisionContext(
    symbol: string,
    portfolio: {
      totalValue: number;
      availableCash: number;
      positions: Position[];
      orders: Order[];
      todayPnL: number;
      weekPnL: number;
    },
    riskLimits: {
      maxPositionSize: number;
      maxLossPerTrade: number;
      maxDailyLoss: number;
      maxWeeklyLoss: number;
    },
    tradeHistory: Array<{ symbol: string; side: 'buy' | 'sell'; pnl: number; timestamp: number }>
  ): AIDecisionContext {
    const snapshot = this.snapshots.get(symbol);
    const opportunity = this.opportunities.get(symbol);
    
    if (!snapshot || !opportunity) {
      throw new Error(`No data available for ${symbol}`);
    }
    
    // Calculate risk limits
    const remainingDailyRisk = riskLimits.maxDailyLoss - Math.abs(Math.min(0, portfolio.todayPnL));
    const remainingWeeklyRisk = riskLimits.maxWeeklyLoss - Math.abs(Math.min(0, portfolio.weekPnL));
    
    // Calculate current exposure
    const currentExposure = portfolio.positions.reduce((sum, p) => sum + p.marketValue, 0);
    const maxExposure = portfolio.totalValue * 0.8; // 80% max exposure
    
    // Calculate correlated exposure
    const correlatedExposure = this.calculateCorrelatedExposure(symbol, portfolio.positions);
    
    // Get performance for this asset
    const assetTrades = tradeHistory.filter(t => t.symbol === symbol);
    const performanceThisAsset = {
      trades: assetTrades.length,
      winRate: assetTrades.length > 0 
        ? assetTrades.filter(t => t.pnl > 0).length / assetTrades.length 
        : 0,
      avgPnL: assetTrades.length > 0
        ? assetTrades.reduce((s, t) => s + t.pnl, 0) / assetTrades.length
        : 0,
    };
    
    // Find aligned and conflicting indicators
    const { aligned, conflicting } = this.analyzeIndicatorAlignment(snapshot);
    
    // Get supporting patterns
    const supportingPatterns = snapshot.patterns?.patterns.filter(
      p => p.direction === (opportunity.action === 'buy' ? 'bullish' : 'bearish')
    ) || [];
    
    // Generate warnings and suggestions
    const { warnings, suggestions } = this.generateWarningsAndSuggestions(
      snapshot,
      opportunity,
      portfolio,
      riskLimits
    );
    
    return {
      timestamp: Date.now(),
      snapshot,
      opportunity,
      portfolio: {
        totalValue: portfolio.totalValue,
        availableCash: portfolio.availableCash,
        usedMargin: currentExposure,
        currentExposure,
        maxExposure,
        openPositions: portfolio.positions,
        pendingOrders: portfolio.orders,
        todayPnL: portfolio.todayPnL,
        weekPnL: portfolio.weekPnL,
      },
      riskLimits: {
        maxPositionSize: riskLimits.maxPositionSize,
        maxLossPerTrade: riskLimits.maxLossPerTrade,
        remainingDailyRisk,
        remainingWeeklyRisk,
        correlatedExposure,
      },
      history: {
        recentTrades: tradeHistory.slice(-10),
        performanceThisAsset,
        lastTradedAt: assetTrades.length > 0 
          ? assetTrades[assetTrades.length - 1].timestamp 
          : null,
      },
      support: {
        alignedIndicators: aligned,
        conflictingIndicators: conflicting,
        supportingPatterns,
        warnings,
        suggestions,
      },
    };
  }

  // ============================================
  // MARKET OVERVIEW
  // ============================================

  generateMarketOverview(): MarketOverview {
    const markets = new Map(this.snapshots);
    
    // Get all opportunities and rank them
    const allOpportunities = Array.from(this.opportunities.values())
      .filter(o => o.hasSetup && o.action !== 'avoid')
      .sort((a, b) => b.setupQuality - a.setupQuality);
    
    // Categorize markets
    const trendingMarkets: string[] = [];
    const rangingMarkets: string[] = [];
    const avoidMarkets: string[] = [];
    
    for (const [symbol, snapshot] of markets) {
      if (snapshot.tradingConditions === 'avoid') {
        avoidMarkets.push(symbol);
      } else if (snapshot.regime === 'trending_up' || snapshot.regime === 'trending_down') {
        trendingMarkets.push(symbol);
      } else if (snapshot.regime === 'ranging') {
        rangingMarkets.push(symbol);
      }
    }
    
    // Determine overall market conditions
    const avgVolatility = Array.from(markets.values())
      .reduce((s, m) => s + (m.volatility.current || 0), 0) / markets.size;
    
    let volatilityEnvironment: 'low' | 'normal' | 'high' | 'extreme' = 'normal';
    if (avgVolatility < 1) volatilityEnvironment = 'low';
    else if (avgVolatility > 3) volatilityEnvironment = 'high';
    else if (avgVolatility > 5) volatilityEnvironment = 'extreme';
    
    const bullishCount = Array.from(markets.values())
      .filter(m => m.bias.includes('bullish')).length;
    const bearishCount = Array.from(markets.values())
      .filter(m => m.bias.includes('bearish')).length;
    
    let overall: 'risk_on' | 'risk_off' | 'mixed' | 'uncertain' = 'mixed';
    if (bullishCount > bearishCount * 1.5) overall = 'risk_on';
    else if (bearishCount > bullishCount * 1.5) overall = 'risk_off';
    else if (volatilityEnvironment === 'extreme') overall = 'uncertain';
    
    return {
      timestamp: Date.now(),
      markets,
      topOpportunities: allOpportunities.slice(0, 5),
      marketConditions: {
        overall,
        volatilityEnvironment,
        trendingMarkets,
        rangingMarkets,
        avoidMarkets,
      },
      correlations: {
        strongPositive: [],
        strongNegative: [],
      },
      upcomingEvents: [],
    };
  }

  // ============================================
  // VISUALIZATION FOR LIVEPREVIEW
  // ============================================

  generateVisualizationMessage(
    type: AIVisualizationMessage['type'],
    data: any,
    priority: AIVisualizationMessage['priority'] = 'medium'
  ): AIVisualizationMessage {
    let displayFormat: AIVisualizationMessage['displayFormat'] = 'card';
    
    switch (type) {
      case 'chart':
        displayFormat = 'chart';
        break;
      case 'analysis':
        displayFormat = 'card';
        break;
      case 'opportunity':
        displayFormat = 'card';
        break;
      case 'decision':
        displayFormat = 'notification';
        break;
      case 'alert':
        displayFormat = 'notification';
        break;
    }
    
    return {
      type,
      priority,
      timestamp: Date.now(),
      data,
      displayFormat,
    };
  }

  generateChartVisualization(
    symbol: string,
    candles: OHLCV[],
    timeframe: string
  ): ChartVisualization {
    const snapshot = this.snapshots.get(symbol);
    const indicators = snapshot?.indicators;
    
    const visualization: ChartVisualization = {
      symbol,
      timeframe,
      candles: candles.slice(-100),
      indicators: [],
      annotations: [],
      patterns: [],
    };
    
    // Add moving averages
    if (indicators) {
      // SMA 20
      visualization.indicators.push({
        name: 'SMA 20',
        values: [], // Would need to extract from indicator data
        color: '#FFD700',
        style: 'line',
      });
      
      // SMA 50
      visualization.indicators.push({
        name: 'SMA 50',
        values: [],
        color: '#FF6347',
        style: 'line',
      });
      
      // SMA 200
      visualization.indicators.push({
        name: 'SMA 200',
        values: [],
        color: '#4169E1',
        style: 'line',
      });
    }
    
    // Add support/resistance lines
    if (snapshot?.keyLevels) {
      const { immediateResistance, immediateSupport, strongResistance, strongSupport } = snapshot.keyLevels;
      
      if (immediateResistance) {
        visualization.annotations.push({
          type: 'line',
          from: { x: 0, y: immediateResistance },
          to: { x: candles.length - 1, y: immediateResistance },
          color: '#FF0000',
          label: 'R1',
        });
      }
      
      if (immediateSupport) {
        visualization.annotations.push({
          type: 'line',
          from: { x: 0, y: immediateSupport },
          to: { x: candles.length - 1, y: immediateSupport },
          color: '#00FF00',
          label: 'S1',
        });
      }
    }
    
    // Add detected patterns
    if (snapshot?.patterns) {
      for (const pattern of snapshot.patterns.patterns) {
        visualization.patterns.push({
          name: pattern.name,
          startX: pattern.startIndex,
          endX: pattern.endIndex,
          highlight: pattern.confidence > 0.7,
        });
      }
    }
    
    return visualization;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private determineTrend(candles: OHLCV[]): 'up' | 'down' | 'sideways' {
    if (candles.length < 5) return 'sideways';
    
    const first = candles[0].close;
    const last = candles[candles.length - 1].close;
    const change = (last - first) / first;
    
    if (change > 0.02) return 'up';
    if (change < -0.02) return 'down';
    return 'sideways';
  }

  private calculateTrendStrength(indicators: ComprehensiveIndicators | null): number {
    if (!indicators) return 0.5;
    
    const adxStrength = Math.min(1, indicators.adx.adx / 50);
    const maAlignment = this.calculateMAAlignment(indicators);
    
    return (adxStrength + maAlignment) / 2;
  }

  private calculateMAAlignment(indicators: ComprehensiveIndicators): number {
    const price = indicators.price.last;
    const sma20 = indicators.sma20.value;
    const sma50 = indicators.sma50.value;
    const sma200 = indicators.sma200.value;
    
    let alignment = 0;
    
    // Bullish alignment
    if (price > sma20 && sma20 > sma50 && sma50 > sma200) {
      alignment = 1;
    }
    // Bearish alignment
    else if (price < sma20 && sma20 < sma50 && sma50 < sma200) {
      alignment = 1;
    }
    // Partial alignment
    else if (price > sma20 && sma20 > sma50) {
      alignment = 0.6;
    }
    else if (price < sma20 && sma20 < sma50) {
      alignment = 0.6;
    }
    else {
      alignment = 0.3;
    }
    
    return alignment;
  }

  private calculateMomentum(indicators: ComprehensiveIndicators | null): number {
    if (!indicators) return 0;
    
    // RSI-based momentum
    const rsiMomentum = (indicators.rsi14.value - 50) / 50;
    
    // MACD-based momentum
    const macdMomentum = indicators.macd.histogram > 0 ? 0.5 : -0.5;
    
    return (rsiMomentum + macdMomentum) / 2;
  }

  private findKeyLevels(
    indicators: ComprehensiveIndicators | null,
    currentPrice: number
  ): MarketSnapshot['keyLevels'] {
    if (!indicators) {
      return {
        immediateResistance: null,
        immediateSupport: null,
        strongResistance: null,
        strongSupport: null,
        dailyPivot: currentPrice,
      };
    }
    
    const sr = indicators.supportResistance;
    const pivots = indicators.pivotPoints;
    
    const resistances = sr
      .filter(l => l.type === 'resistance' && l.price > currentPrice)
      .sort((a, b) => a.price - b.price);
    
    const supports = sr
      .filter(l => l.type === 'support' && l.price < currentPrice)
      .sort((a, b) => b.price - a.price);
    
    return {
      immediateResistance: resistances[0]?.price || pivots.r1,
      immediateSupport: supports[0]?.price || pivots.s1,
      strongResistance: resistances.find(r => r.strength > 0.7)?.price || pivots.r2,
      strongSupport: supports.find(s => s.strength > 0.7)?.price || pivots.s2,
      dailyPivot: pivots.pp,
    };
  }

  private determineVolatilityRegime(
    indicators: ComprehensiveIndicators | null
  ): 'low' | 'normal' | 'high' | 'extreme' {
    if (!indicators) return 'normal';
    // Map 'medium' to 'normal' if present
    const vol = indicators.atr14.volatility;
    return vol === 'medium' ? 'normal' : vol;
  }

  private analyzeVolume(
    candles: OHLCV[],
    indicators: ComprehensiveIndicators | null
  ): MarketSnapshot['volume'] {
    if (!indicators) {
      const avgVol = candles.slice(-20).reduce((s, c) => s + c.volume, 0) / 20;
      const current = candles[candles.length - 1]?.volume || 0;
      return {
        current,
        average: avgVol,
        ratio: current / avgVol,
        trend: 'stable',
        buyPressure: 0.5,
      };
    }
    
    return {
      current: indicators.volume.current,
      average: indicators.volume.average,
      ratio: indicators.volume.ratio,
      trend: indicators.volume.trend,
      buyPressure: indicators.volume.mfi / 100,
    };
  }

  private determineMarketRegime(
    shortTermTrend: 'up' | 'down' | 'sideways',
    mediumTermTrend: 'up' | 'down' | 'sideways',
    volatility: 'low' | 'normal' | 'high' | 'extreme',
    indicators: ComprehensiveIndicators | null
  ): { regime: MarketRegime; confidence: number } {
    if (volatility === 'extreme') {
      if (shortTermTrend === 'down' && mediumTermTrend === 'down') {
        return { regime: 'crash', confidence: 0.8 };
      }
      return { regime: 'volatile', confidence: 0.7 };
    }
    
    if (shortTermTrend === 'up' && mediumTermTrend === 'up') {
      return { regime: 'trending_up', confidence: 0.8 };
    }
    
    if (shortTermTrend === 'down' && mediumTermTrend === 'down') {
      return { regime: 'trending_down', confidence: 0.8 };
    }
    
    if (shortTermTrend === 'sideways' || volatility === 'low') {
      return { regime: 'ranging', confidence: 0.7 };
    }
    
    if (shortTermTrend === 'up' && mediumTermTrend === 'down') {
      return { regime: 'recovery', confidence: 0.6 };
    }
    
    return { regime: 'unknown', confidence: 0.4 };
  }

  private calculateBias(
    indicators: ComprehensiveIndicators | null,
    patterns: PatternScanResult | null,
    shortTermTrend: 'up' | 'down' | 'sideways'
  ): MarketSnapshot['bias'] {
    if (!indicators) return 'neutral';
    
    let score = 0; // -10 to +10
    
    // Trend contribution
    if (shortTermTrend === 'up') score += 2;
    else if (shortTermTrend === 'down') score -= 2;
    
    // RSI contribution
    if (indicators.rsi14.value > 50) score += 1;
    else score -= 1;
    
    // MACD contribution
    if (indicators.macd.histogram > 0) score += 1;
    else score -= 1;
    
    // Pattern contribution
    if (patterns) {
      if (patterns.overallBias === 'bullish') score += 2;
      else if (patterns.overallBias === 'bearish') score -= 2;
    }
    
    // MA alignment
    if (indicators.sma20.signal === 'buy') score += 1;
    else if (indicators.sma20.signal === 'sell') score -= 1;
    
    if (score >= 5) return 'strong_bullish';
    if (score >= 2) return 'bullish';
    if (score <= -5) return 'strong_bearish';
    if (score <= -2) return 'bearish';
    return 'neutral';
  }

  private assessTradingConditions(
    volatility: 'low' | 'normal' | 'high' | 'extreme',
    volume: MarketSnapshot['volume'],
    indicators: ComprehensiveIndicators | null
  ): MarketSnapshot['tradingConditions'] {
    if (volatility === 'extreme') return 'avoid';
    if (volume.ratio < 0.5) return 'poor';
    
    if (!indicators) return 'fair';
    
    // Check spread (if available from indicator data)
    // Check indicator confluence
    const adxStrength = indicators.adx.adx;
    
    if (adxStrength > 25 && volume.ratio > 1 && volatility === 'normal') {
      return 'excellent';
    }
    
    if (adxStrength > 20 && volume.ratio > 0.8) {
      return 'good';
    }
    
    if (adxStrength < 15) {
      return 'poor';
    }
    
    return 'fair';
  }

  private calculateOverallConfidence(
    indicators: ComprehensiveIndicators | null,
    patterns: PatternScanResult | null
  ): number {
    if (!indicators) return 0.3;
    
    let confidence = 0.5;
    
    // ADX adds confidence in trending markets
    if (indicators.adx.adx > 25) confidence += 0.15;
    
    // Pattern confluence adds confidence
    if (patterns && patterns.confluence > 0.7) confidence += 0.15;
    
    // Volume confirmation
    if (indicators.volume.ratio > 1.2) confidence += 0.1;
    
    // Indicator alignment
    if (indicators.signalStrength > 0.7) confidence += 0.1;
    
    return Math.min(1, confidence);
  }

  private identifySetup(snapshot: MarketSnapshot): {
    hasSetup: boolean;
    setupQuality: number;
    setupType: string | null;
  } {
    if (!snapshot.indicators || !snapshot.patterns) {
      return { hasSetup: false, setupQuality: 0, setupType: null };
    }
    
    // Check for pattern-based setups
    const strongPatterns = snapshot.patterns.patterns.filter(
      p => p.reliability > 0.7 && p.confidence > 0.7
    );
    
    if (strongPatterns.length > 0) {
      const best = strongPatterns[0];
      return {
        hasSetup: true,
        setupQuality: (best.reliability + best.confidence) / 2 * 100,
        setupType: best.name,
      };
    }
    
    // Check for indicator-based setups
    const { rsi14, macd, stochastic } = snapshot.indicators;
    
    // Oversold bounce setup
    if (rsi14.signal === 'oversold' && macd.crossover === 'bullish_cross') {
      return {
        hasSetup: true,
        setupQuality: 70,
        setupType: 'Oversold Bounce',
      };
    }
    
    // Overbought reversal setup
    if (rsi14.signal === 'overbought' && macd.crossover === 'bearish_cross') {
      return {
        hasSetup: true,
        setupQuality: 70,
        setupType: 'Overbought Reversal',
      };
    }
    
    // Trend continuation setup
    if (snapshot.trend.strength > 0.7 && snapshot.trend.shortTerm === snapshot.trend.mediumTerm) {
      return {
        hasSetup: true,
        setupQuality: 60,
        setupType: 'Trend Continuation',
      };
    }
    
    return { hasSetup: false, setupQuality: 0, setupType: null };
  }

  private calculateEntry(snapshot: MarketSnapshot): OpportunityAssessment['entry'] {
    const currentPrice = snapshot.currentPrice;
    const bias = snapshot.bias;
    
    if (bias === 'neutral') return null;
    
    const isBullish = bias.includes('bullish');
    const keyLevels = snapshot.keyLevels;
    
    // Determine entry type and price
    let entryType: 'market' | 'limit' | 'stop' = 'limit';
    let recommendedPrice = currentPrice;
    let entryZone: { min: number; max: number };
    
    if (isBullish && keyLevels.immediateSupport) {
      // Buy near support
      recommendedPrice = keyLevels.immediateSupport * 1.005;
      entryZone = {
        min: keyLevels.immediateSupport,
        max: keyLevels.immediateSupport * 1.01,
      };
    } else if (!isBullish && keyLevels.immediateResistance) {
      // Sell near resistance
      recommendedPrice = keyLevels.immediateResistance * 0.995;
      entryZone = {
        min: keyLevels.immediateResistance * 0.99,
        max: keyLevels.immediateResistance,
      };
    } else {
      entryZone = {
        min: currentPrice * 0.998,
        max: currentPrice * 1.002,
      };
    }
    
    // Determine timing
    let timing: 'now' | 'wait' | 'missed' = 'wait';
    if (currentPrice >= entryZone.min && currentPrice <= entryZone.max) {
      timing = 'now';
    } else if (
      (isBullish && currentPrice > entryZone.max * 1.02) ||
      (!isBullish && currentPrice < entryZone.min * 0.98)
    ) {
      timing = 'missed';
    }
    
    return {
      recommendedPrice,
      entryType,
      entryZone,
      timing,
    };
  }

  private calculateRiskReward(
    snapshot: MarketSnapshot,
    entryPrice: number,
    minRiskReward: number
  ): OpportunityAssessment['riskReward'] {
    const isBullish = snapshot.bias.includes('bullish');
    const keyLevels = snapshot.keyLevels;
    const atr = snapshot.indicators?.atr14.value || entryPrice * 0.02;
    
    let stopLoss: number;
    let takeProfit1: number;
    
    if (isBullish) {
      stopLoss = keyLevels.immediateSupport 
        ? keyLevels.immediateSupport * 0.995
        : entryPrice - (atr * 1.5);
      
      takeProfit1 = keyLevels.immediateResistance
        ? keyLevels.immediateResistance * 0.99
        : entryPrice + (atr * 3);
    } else {
      stopLoss = keyLevels.immediateResistance
        ? keyLevels.immediateResistance * 1.005
        : entryPrice + (atr * 1.5);
      
      takeProfit1 = keyLevels.immediateSupport
        ? keyLevels.immediateSupport * 1.01
        : entryPrice - (atr * 3);
    }
    
    const riskPercent = Math.abs(entryPrice - stopLoss) / entryPrice * 100;
    const rewardPercent = Math.abs(takeProfit1 - entryPrice) / entryPrice * 100;
    const ratio = rewardPercent / riskPercent;
    
    return {
      stopLoss,
      takeProfit1,
      takeProfit2: isBullish 
        ? entryPrice + (takeProfit1 - entryPrice) * 1.5
        : entryPrice - (entryPrice - takeProfit1) * 1.5,
      riskPercent,
      rewardPercent,
      ratio,
    };
  }

  private calculateConfidenceFactors(
    snapshot: MarketSnapshot
  ): OpportunityAssessment['confidenceFactors'] {
    const indicators = snapshot.indicators;
    const patterns = snapshot.patterns;
    
    return {
      technicalAlignment: indicators ? indicators.signalStrength : 0.5,
      patternConfirmation: patterns ? patterns.confluence : 0,
      volumeConfirmation: snapshot.volume.ratio > 1 ? 0.8 : 0.4,
      trendAlignment: snapshot.trend.strength,
      levelProximity: 0.6, // Would need to calculate distance to key levels
      timeOfDay: 0.7, // Would need market hours data
      overall: snapshot.confidence,
    };
  }

  private identifyRiskFactors(snapshot: MarketSnapshot): string[] {
    const risks: string[] = [];
    
    if (snapshot.volatility.regime === 'high' || snapshot.volatility.regime === 'extreme') {
      risks.push('Alta volatilidade');
    }
    
    if (snapshot.volume.ratio < 0.7) {
      risks.push('Volume abaixo da média');
    }
    
    if (snapshot.spreadPercent > 0.1) {
      risks.push('Spread elevado');
    }
    
    if (snapshot.tradingConditions === 'poor' || snapshot.tradingConditions === 'avoid') {
      risks.push('Condições de trading desfavoráveis');
    }
    
    if (snapshot.regime === 'volatile' || snapshot.regime === 'crash') {
      risks.push('Regime de mercado instável');
    }
    
    if (snapshot.indicators?.bollingerBands.squeeze) {
      risks.push('Possível expansão de volatilidade iminente');
    }
    
    return risks;
  }

  private determineAction(
    snapshot: MarketSnapshot,
    hasSetup: boolean,
    setupQuality: number,
    riskReward: OpportunityAssessment['riskReward'],
    confidenceFactors: OpportunityAssessment['confidenceFactors'],
    riskFactors: string[]
  ): { action: 'buy' | 'sell' | 'wait' | 'avoid'; urgency: OpportunityAssessment['urgency']; reasoning: string[] } {
    const reasoning: string[] = [];
    
    // Check for avoid conditions
    if (snapshot.tradingConditions === 'avoid' || riskFactors.length > 3) {
      reasoning.push('Condições de mercado desfavoráveis');
      riskFactors.forEach(r => reasoning.push(`- ${r}`));
      return { action: 'avoid', urgency: 'none', reasoning };
    }
    
    // Check for valid setup
    if (!hasSetup || setupQuality < 50) {
      reasoning.push('Nenhum setup válido identificado');
      return { action: 'wait', urgency: 'patient', reasoning };
    }
    
    // Check risk/reward
    if (!riskReward || riskReward.ratio < 1.5) {
      reasoning.push(`Risk/Reward insuficiente (${riskReward?.ratio.toFixed(2) || 'N/A'})`);
      return { action: 'wait', urgency: 'patient', reasoning };
    }
    
    // Determine action based on bias
    const isBullish = snapshot.bias.includes('bullish');
    const action: 'buy' | 'sell' = isBullish ? 'buy' : 'sell';
    
    // Add reasoning
    reasoning.push(`Viés: ${snapshot.bias}`);
    reasoning.push(`Setup: ${setupQuality.toFixed(0)}% qualidade`);
    reasoning.push(`R/R: ${riskReward.ratio.toFixed(2)}`);
    reasoning.push(`Confiança: ${(confidenceFactors.overall * 100).toFixed(0)}%`);
    
    // Determine urgency
    let urgency: OpportunityAssessment['urgency'] = 'patient';
    if (setupQuality > 80 && confidenceFactors.overall > 0.7) {
      urgency = 'immediate';
    } else if (setupQuality > 60 && confidenceFactors.overall > 0.6) {
      urgency = 'soon';
    }
    
    return { action, urgency, reasoning };
  }

  private calculateCorrelatedExposure(symbol: string, positions: Position[]): number {
    // Simplified - would need correlation matrix
    const sameAssetPosition = positions.find(p => p.symbol === symbol);
    return sameAssetPosition ? sameAssetPosition.marketValue : 0;
  }

  private analyzeIndicatorAlignment(snapshot: MarketSnapshot): {
    aligned: string[];
    conflicting: string[];
  } {
    const aligned: string[] = [];
    const conflicting: string[] = [];
    
    if (!snapshot.indicators) return { aligned, conflicting };
    
    const { rsi14, macd, stochastic, adx, sma20, sma50 } = snapshot.indicators;
    const isBullish = snapshot.bias.includes('bullish');
    
    // Check each indicator
    if ((isBullish && rsi14.value > 50) || (!isBullish && rsi14.value < 50)) {
      aligned.push('RSI');
    } else {
      conflicting.push('RSI');
    }
    
    if ((isBullish && macd.trend === 'bullish') || (!isBullish && macd.trend === 'bearish')) {
      aligned.push('MACD');
    } else if (macd.trend !== 'neutral') {
      conflicting.push('MACD');
    }
    
    if (adx.adx > 20) {
      if ((isBullish && adx.direction === 'bullish') || (!isBullish && adx.direction === 'bearish')) {
        aligned.push('ADX');
      } else {
        conflicting.push('ADX');
      }
    }
    
    return { aligned, conflicting };
  }

  private generateWarningsAndSuggestions(
    snapshot: MarketSnapshot,
    opportunity: OpportunityAssessment,
    portfolio: any,
    riskLimits: any
  ): { warnings: string[]; suggestions: string[] } {
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    // Risk warnings
    if (opportunity.riskFactors.length > 0) {
      warnings.push(...opportunity.riskFactors);
    }
    
    // Position size suggestions
    if (opportunity.riskReward && opportunity.riskReward.riskPercent > 2) {
      suggestions.push('Considerar reduzir tamanho da posição devido ao risco elevado');
    }
    
    // Timing suggestions
    if (opportunity.entry?.timing === 'wait') {
      suggestions.push('Aguardar melhor ponto de entrada próximo ao suporte/resistência');
    }
    
    // Trend alignment
    if (snapshot.trend.shortTerm !== snapshot.trend.mediumTerm) {
      warnings.push('Conflito entre tendência de curto e médio prazo');
    }
    
    return { warnings, suggestions };
  }

  // ============================================
  // LIFECYCLE
  // ============================================

  start(updateIntervalMs: number = 5000): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.emit('started');
  }

  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.isRunning = false;
    this.emit('stopped');
  }

  getSnapshot(symbol: string): MarketSnapshot | undefined {
    return this.snapshots.get(symbol);
  }

  getOpportunity(symbol: string): OpportunityAssessment | undefined {
    return this.opportunities.get(symbol);
  }
}

// Factory function
export function createAIMarketVision(
  indicatorsEngine: TechnicalIndicatorsEngine,
  patternEngine: PatternRecognitionEngine
): AIMarketVision {
  return new AIMarketVision(indicatorsEngine, patternEngine);
}
