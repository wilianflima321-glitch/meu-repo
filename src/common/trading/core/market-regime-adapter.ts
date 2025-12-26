/**
 * Market Regime Adapter
 * Sistema de adaptação dinâmica ao regime de mercado
 * Detecta e se adapta a diferentes condições automaticamente
 */

import { EventEmitter } from 'events';
import { 
  MarketRegime, 
  RiskLevel, 
  OHLCV, 
  Quote,
  StrategyType,
} from './trading-types';
import { TechnicalIndicatorsEngine, ATRResult, ADXResult } from './technical-indicators';

// ============================================
// REGIME TYPES
// ============================================

export interface RegimeState {
  current: MarketRegime;
  previous: MarketRegime;
  confidence: number;
  duration: number; // Duration in current regime (ms)
  changedAt: number;
  transitionProbability: {
    toTrendingUp: number;
    toTrendingDown: number;
    toRanging: number;
    toVolatile: number;
    toCrash: number;
    toRecovery: number;
  };
}

export interface RegimeCharacteristics {
  volatility: 'low' | 'normal' | 'high' | 'extreme';
  trend: 'strong' | 'weak' | 'none';
  momentum: 'positive' | 'negative' | 'neutral';
  liquidity: 'high' | 'normal' | 'low';
  sentiment: 'bullish' | 'bearish' | 'neutral' | 'fearful' | 'euphoric';
}

export interface StrategyAdjustments {
  // Position sizing adjustments
  positionSizeMultiplier: number;
  
  // Risk adjustments
  stopLossMultiplier: number;
  takeProfitMultiplier: number;
  maxDrawdownTolerance: number;
  
  // Strategy preferences
  preferredStrategies: StrategyType[];
  avoidStrategies: StrategyType[];
  
  // Trading frequency
  tradingFrequency: 'aggressive' | 'normal' | 'reduced' | 'minimal';
  
  // Holding period
  preferredHoldingPeriod: 'scalp' | 'day' | 'swing' | 'position';
  
  // Entry/Exit adjustments
  entryThreshold: number; // 0-1, higher = more selective
  exitAggressiveness: number; // 0-1, higher = faster exits
  
  // Special conditions
  useTrailingStops: boolean;
  trailingStopTightness: number;
  scalingEnabled: boolean;
  hedgingRecommended: boolean;
}

export interface RegimeTransition {
  from: MarketRegime;
  to: MarketRegime;
  timestamp: number;
  confidence: number;
  trigger: string;
  expectedDuration?: number;
}

// ============================================
// REGIME DETECTION CONFIG
// ============================================

const REGIME_CONFIG = {
  // ADX thresholds
  adxTrendStrong: 25,
  adxTrendWeak: 15,
  
  // Volatility thresholds (ATR as % of price)
  volatilityLow: 1.0,
  volatilityHigh: 3.0,
  volatilityExtreme: 5.0,
  
  // Trend thresholds
  trendThresholdStrong: 0.03, // 3% move
  trendThresholdWeak: 0.01,
  
  // Volume thresholds
  volumeSpikeLow: 0.7,
  volumeSpikeHigh: 1.5,
  volumeSpikeExtreme: 2.5,
  
  // Regime stability
  minRegimeDuration: 5 * 60 * 1000, // 5 minutes
  transitionCooldown: 2 * 60 * 1000, // 2 minutes
  
  // Crash detection
  crashThreshold: -0.05, // -5% rapid move
  crashVolumeSpike: 3.0,
  
  // Recovery detection
  recoveryThreshold: 0.03,
  recoveryFromLow: 0.1, // 10% from recent low
};

// Strategy adjustments per regime
const REGIME_ADJUSTMENTS: Record<MarketRegime, StrategyAdjustments> = {
  trending_up: {
    positionSizeMultiplier: 1.2,
    stopLossMultiplier: 1.3,
    takeProfitMultiplier: 1.5,
    maxDrawdownTolerance: 0.08,
    preferredStrategies: ['trend_following', 'momentum', 'breakout'],
    avoidStrategies: ['mean_reversion'],
    tradingFrequency: 'aggressive',
    preferredHoldingPeriod: 'swing',
    entryThreshold: 0.6,
    exitAggressiveness: 0.4,
    useTrailingStops: true,
    trailingStopTightness: 0.6,
    scalingEnabled: true,
    hedgingRecommended: false,
  },
  trending_down: {
    positionSizeMultiplier: 0.8,
    stopLossMultiplier: 1.2,
    takeProfitMultiplier: 1.2,
    maxDrawdownTolerance: 0.05,
    preferredStrategies: ['trend_following', 'momentum'],
    avoidStrategies: ['mean_reversion', 'market_making'],
    tradingFrequency: 'reduced',
    preferredHoldingPeriod: 'day',
    entryThreshold: 0.8,
    exitAggressiveness: 0.7,
    useTrailingStops: true,
    trailingStopTightness: 0.8,
    scalingEnabled: false,
    hedgingRecommended: true,
  },
  ranging: {
    positionSizeMultiplier: 1.0,
    stopLossMultiplier: 0.8,
    takeProfitMultiplier: 0.8,
    maxDrawdownTolerance: 0.04,
    preferredStrategies: ['mean_reversion', 'market_making', 'statistical'],
    avoidStrategies: ['trend_following', 'breakout'],
    tradingFrequency: 'aggressive',
    preferredHoldingPeriod: 'scalp',
    entryThreshold: 0.5,
    exitAggressiveness: 0.6,
    useTrailingStops: false,
    trailingStopTightness: 0.5,
    scalingEnabled: false,
    hedgingRecommended: false,
  },
  volatile: {
    positionSizeMultiplier: 0.5,
    stopLossMultiplier: 2.0,
    takeProfitMultiplier: 2.0,
    maxDrawdownTolerance: 0.03,
    preferredStrategies: ['breakout', 'event_driven'],
    avoidStrategies: ['scalping', 'market_making'],
    tradingFrequency: 'reduced',
    preferredHoldingPeriod: 'day',
    entryThreshold: 0.85,
    exitAggressiveness: 0.8,
    useTrailingStops: true,
    trailingStopTightness: 0.9,
    scalingEnabled: false,
    hedgingRecommended: true,
  },
  low_volatility: {
    positionSizeMultiplier: 1.5,
    stopLossMultiplier: 0.5,
    takeProfitMultiplier: 0.5,
    maxDrawdownTolerance: 0.02,
    preferredStrategies: ['mean_reversion', 'market_making', 'scalping'],
    avoidStrategies: ['breakout', 'momentum'],
    tradingFrequency: 'aggressive',
    preferredHoldingPeriod: 'scalp',
    entryThreshold: 0.4,
    exitAggressiveness: 0.5,
    useTrailingStops: false,
    trailingStopTightness: 0.3,
    scalingEnabled: true,
    hedgingRecommended: false,
  },
  crash: {
    positionSizeMultiplier: 0.0, // No new positions
    stopLossMultiplier: 0.5,
    takeProfitMultiplier: 0.5,
    maxDrawdownTolerance: 0.02,
    preferredStrategies: [],
    avoidStrategies: ['trend_following', 'momentum', 'breakout', 'mean_reversion', 'scalping', 'market_making', 'statistical', 'event_driven', 'arbitrage', 'ensemble'],
    tradingFrequency: 'minimal',
    preferredHoldingPeriod: 'position',
    entryThreshold: 1.0, // Impossible
    exitAggressiveness: 1.0, // Exit everything
    useTrailingStops: true,
    trailingStopTightness: 1.0,
    scalingEnabled: false,
    hedgingRecommended: true,
  },
  recovery: {
    positionSizeMultiplier: 0.6,
    stopLossMultiplier: 1.5,
    takeProfitMultiplier: 2.0,
    maxDrawdownTolerance: 0.06,
    preferredStrategies: ['mean_reversion', 'breakout'],
    avoidStrategies: ['scalping'],
    tradingFrequency: 'normal',
    preferredHoldingPeriod: 'swing',
    entryThreshold: 0.7,
    exitAggressiveness: 0.5,
    useTrailingStops: true,
    trailingStopTightness: 0.5,
    scalingEnabled: true,
    hedgingRecommended: false,
  },
  unknown: {
    positionSizeMultiplier: 0.5,
    stopLossMultiplier: 1.0,
    takeProfitMultiplier: 1.0,
    maxDrawdownTolerance: 0.03,
    preferredStrategies: ['statistical'],
    avoidStrategies: [],
    tradingFrequency: 'reduced',
    preferredHoldingPeriod: 'day',
    entryThreshold: 0.8,
    exitAggressiveness: 0.6,
    useTrailingStops: true,
    trailingStopTightness: 0.7,
    scalingEnabled: false,
    hedgingRecommended: true,
  },
};

// ============================================
// MARKET REGIME ADAPTER
// ============================================

export class MarketRegimeAdapter extends EventEmitter {
  private indicatorsEngine: TechnicalIndicatorsEngine;
  
  private regimeStates: Map<string, RegimeState> = new Map();
  private transitionHistory: Map<string, RegimeTransition[]> = new Map();
  private priceHistory: Map<string, OHLCV[]> = new Map();
  
  // Caches
  private adjustmentCache: Map<string, StrategyAdjustments> = new Map();
  private lastUpdate: Map<string, number> = new Map();
  private updateDebounce = 1000; // 1 second

  constructor(indicatorsEngine: TechnicalIndicatorsEngine) {
    super();
    this.indicatorsEngine = indicatorsEngine;
  }

  // ============================================
  // REGIME DETECTION
  // ============================================

  /**
   * Update price data and detect regime
   */
  updateMarketData(symbol: string, candles: OHLCV[], quote?: Quote): RegimeState {
    // Debounce updates
    const lastUpdate = this.lastUpdate.get(symbol) || 0;
    if (Date.now() - lastUpdate < this.updateDebounce) {
      return this.regimeStates.get(symbol) || this.createInitialState();
    }
    
    this.priceHistory.set(symbol, candles);
    this.indicatorsEngine.setPriceHistory(symbol, candles);
    this.lastUpdate.set(symbol, Date.now());
    
    // Detect current regime
    const detectedRegime = this.detectRegime(symbol, candles, quote);
    
    // Get or create regime state
    let state = this.regimeStates.get(symbol);
    if (!state) {
      state = this.createInitialState();
    }
    
    // Check for regime change
    if (detectedRegime.regime !== state.current) {
      const transition = this.handleRegimeTransition(symbol, state, detectedRegime);
      if (transition) {
        state = {
          current: detectedRegime.regime,
          previous: state.current,
          confidence: detectedRegime.confidence,
          duration: 0,
          changedAt: Date.now(),
          transitionProbability: this.calculateTransitionProbabilities(symbol, detectedRegime.regime),
        };
        
        this.emit('regimeChanged', { symbol, state, transition });
      }
    } else {
      // Update duration and confidence
      state = {
        ...state,
        confidence: detectedRegime.confidence,
        duration: Date.now() - state.changedAt,
        transitionProbability: this.calculateTransitionProbabilities(symbol, state.current),
      };
    }
    
    this.regimeStates.set(symbol, state);
    this.adjustmentCache.delete(symbol); // Invalidate cache
    
    return state;
  }

  /**
   * Detect market regime from price data
   */
  private detectRegime(
    symbol: string,
    candles: OHLCV[],
    quote?: Quote
  ): { regime: MarketRegime; confidence: number; characteristics: RegimeCharacteristics } {
    if (candles.length < 50) {
      return {
        regime: 'unknown',
        confidence: 0.3,
        characteristics: {
          volatility: 'normal',
          trend: 'none',
          momentum: 'neutral',
          liquidity: 'normal',
          sentiment: 'neutral',
        },
      };
    }
    
    const currentPrice = quote?.last || candles[candles.length - 1].close;
    
    // Get indicator data
    const atrResults = this.indicatorsEngine.calculateATR(candles);
    const adxResults = this.indicatorsEngine.calculateADX(candles);
    const rsiResults = this.indicatorsEngine.calculateRSI(candles.map(c => c.close));
    
    const atr = atrResults[atrResults.length - 1];
    const adx = adxResults[adxResults.length - 1];
    const rsi = rsiResults[rsiResults.length - 1];
    
    // Calculate price changes
    const priceChange1h = this.calculatePriceChange(candles, 12); // 12 5-min candles = 1 hour
    const priceChange4h = this.calculatePriceChange(candles, 48);
    const priceChange24h = this.calculatePriceChange(candles, 288);
    
    // Calculate volume characteristics
    const volumeRatio = this.calculateVolumeRatio(candles);
    
    // Determine characteristics
    const characteristics = this.determineCharacteristics(
      atr,
      adx,
      rsi,
      priceChange1h,
      priceChange24h,
      volumeRatio
    );
    
    // Detect specific regime
    const regime = this.classifyRegime(
      characteristics,
      priceChange1h,
      priceChange4h,
      priceChange24h,
      atr,
      adx,
      volumeRatio
    );
    
    // Calculate confidence
    const confidence = this.calculateRegimeConfidence(
      regime,
      characteristics,
      adx,
      atr
    );
    
    return { regime, confidence, characteristics };
  }

  /**
   * Determine market characteristics
   */
  private determineCharacteristics(
    atr: ATRResult,
    adx: ADXResult,
    rsi: { value: number; signal: string },
    priceChange1h: number,
    priceChange24h: number,
    volumeRatio: number
  ): RegimeCharacteristics {
    // Volatility
    let volatility: RegimeCharacteristics['volatility'] = 'normal';
    if (atr.normalized < REGIME_CONFIG.volatilityLow) volatility = 'low';
    else if (atr.normalized > REGIME_CONFIG.volatilityExtreme) volatility = 'extreme';
    else if (atr.normalized > REGIME_CONFIG.volatilityHigh) volatility = 'high';
    
    // Trend
    let trend: RegimeCharacteristics['trend'] = 'none';
    if (adx.adx > REGIME_CONFIG.adxTrendStrong) trend = 'strong';
    else if (adx.adx > REGIME_CONFIG.adxTrendWeak) trend = 'weak';
    
    // Momentum
    let momentum: RegimeCharacteristics['momentum'] = 'neutral';
    if (priceChange1h > 0.01 && rsi.value > 55) momentum = 'positive';
    else if (priceChange1h < -0.01 && rsi.value < 45) momentum = 'negative';
    
    // Liquidity (based on volume)
    let liquidity: RegimeCharacteristics['liquidity'] = 'normal';
    if (volumeRatio > REGIME_CONFIG.volumeSpikeHigh) liquidity = 'high';
    else if (volumeRatio < REGIME_CONFIG.volumeSpikeLow) liquidity = 'low';
    
    // Sentiment (simplified from RSI and price action)
    let sentiment: RegimeCharacteristics['sentiment'] = 'neutral';
    if (rsi.value > 70 && priceChange24h > 0.1) sentiment = 'euphoric';
    else if (rsi.value < 30 && priceChange24h < -0.1) sentiment = 'fearful';
    else if (rsi.value > 60) sentiment = 'bullish';
    else if (rsi.value < 40) sentiment = 'bearish';
    
    return { volatility, trend, momentum, liquidity, sentiment };
  }

  /**
   * Classify market regime
   */
  private classifyRegime(
    characteristics: RegimeCharacteristics,
    priceChange1h: number,
    priceChange4h: number,
    priceChange24h: number,
    atr: ATRResult,
    adx: ADXResult,
    volumeRatio: number
  ): MarketRegime {
    // Crash detection (highest priority)
    if (
      priceChange1h < REGIME_CONFIG.crashThreshold &&
      volumeRatio > REGIME_CONFIG.crashVolumeSpike &&
      characteristics.volatility === 'extreme'
    ) {
      return 'crash';
    }
    
    // Recovery detection
    if (
      priceChange1h > REGIME_CONFIG.recoveryThreshold &&
      characteristics.sentiment === 'fearful' &&
      adx.direction === 'bullish'
    ) {
      return 'recovery';
    }
    
    // Trending up
    if (
      characteristics.trend !== 'none' &&
      adx.direction === 'bullish' &&
      characteristics.momentum === 'positive'
    ) {
      return 'trending_up';
    }
    
    // Trending down
    if (
      characteristics.trend !== 'none' &&
      adx.direction === 'bearish' &&
      characteristics.momentum === 'negative'
    ) {
      return 'trending_down';
    }
    
    // Volatile
    if (
      characteristics.volatility === 'extreme' ||
      (characteristics.volatility === 'high' && characteristics.trend === 'none')
    ) {
      return 'volatile';
    }
    
    // Low volatility
    if (characteristics.volatility === 'low') {
      return 'low_volatility';
    }
    
    // Ranging
    if (
      characteristics.trend === 'none' &&
      (characteristics.volatility as string) !== 'extreme'
    ) {
      return 'ranging';
    }
    
    return 'unknown';
  }

  /**
   * Calculate regime confidence
   */
  private calculateRegimeConfidence(
    regime: MarketRegime,
    characteristics: RegimeCharacteristics,
    adx: ADXResult,
    atr: ATRResult
  ): number {
    let confidence = 0.5;
    
    switch (regime) {
      case 'trending_up':
      case 'trending_down':
        // Higher ADX = higher confidence
        confidence = Math.min(1, adx.adx / 50);
        if (characteristics.trend === 'strong') confidence += 0.1;
        break;
        
      case 'ranging':
        // Low ADX and stable volatility = higher confidence
        confidence = Math.max(0.3, 1 - (adx.adx / 30));
        if (characteristics.volatility === 'normal') confidence += 0.1;
        break;
        
      case 'volatile':
        // Higher volatility = higher confidence
        confidence = Math.min(1, atr.normalized / 5);
        break;
        
      case 'crash':
        // Extreme conditions = high confidence
        confidence = 0.9;
        break;
        
      case 'recovery':
        // Recovery is uncertain
        confidence = 0.6;
        break;
        
      case 'low_volatility':
        confidence = 0.7;
        break;
        
      default:
        confidence = 0.3;
    }
    
    return Math.max(0.2, Math.min(1, confidence));
  }

  // ============================================
  // REGIME TRANSITIONS
  // ============================================

  /**
   * Handle regime transition
   */
  private handleRegimeTransition(
    symbol: string,
    currentState: RegimeState,
    newDetection: { regime: MarketRegime; confidence: number }
  ): RegimeTransition | null {
    // Check minimum duration in current regime
    if (currentState.duration < REGIME_CONFIG.minRegimeDuration) {
      return null;
    }
    
    // Check confidence threshold
    if (newDetection.confidence < 0.5) {
      return null;
    }
    
    // Create transition record
    const transition: RegimeTransition = {
      from: currentState.current,
      to: newDetection.regime,
      timestamp: Date.now(),
      confidence: newDetection.confidence,
      trigger: this.identifyTransitionTrigger(currentState.current, newDetection.regime),
      expectedDuration: this.estimateRegimeDuration(newDetection.regime),
    };
    
    // Record transition
    const history = this.transitionHistory.get(symbol) || [];
    history.push(transition);
    if (history.length > 100) history.shift();
    this.transitionHistory.set(symbol, history);
    
    return transition;
  }

  /**
   * Identify what triggered the transition
   */
  private identifyTransitionTrigger(from: MarketRegime, to: MarketRegime): string {
    const triggers: Record<string, string> = {
      'ranging_trending_up': 'Breakout de consolidação para cima',
      'ranging_trending_down': 'Breakout de consolidação para baixo',
      'trending_up_ranging': 'Perda de momentum de alta',
      'trending_down_ranging': 'Perda de momentum de baixa',
      'trending_up_trending_down': 'Reversão de tendência',
      'trending_down_trending_up': 'Reversão de tendência',
      'any_crash': 'Queda abrupta com volume extremo',
      'crash_recovery': 'Início de recuperação',
      'any_volatile': 'Aumento significativo de volatilidade',
      'volatile_ranging': 'Estabilização da volatilidade',
    };
    
    const key = `${from}_${to}`;
    if (triggers[key]) return triggers[key];
    if (to === 'crash') return triggers['any_crash'];
    if (to === 'volatile') return triggers['any_volatile'];
    
    return `Transição de ${from} para ${to}`;
  }

  /**
   * Estimate how long the regime might last
   */
  private estimateRegimeDuration(regime: MarketRegime): number {
    const durations: Record<MarketRegime, number> = {
      trending_up: 4 * 60 * 60 * 1000, // 4 hours
      trending_down: 2 * 60 * 60 * 1000, // 2 hours (usually faster)
      ranging: 6 * 60 * 60 * 1000, // 6 hours
      volatile: 30 * 60 * 1000, // 30 minutes
      low_volatility: 8 * 60 * 60 * 1000, // 8 hours
      crash: 15 * 60 * 1000, // 15 minutes
      recovery: 1 * 60 * 60 * 1000, // 1 hour
      unknown: 30 * 60 * 1000, // 30 minutes
    };
    
    return durations[regime];
  }

  /**
   * Calculate transition probabilities
   */
  private calculateTransitionProbabilities(
    symbol: string,
    currentRegime: MarketRegime
  ): RegimeState['transitionProbability'] {
    // Base probabilities (would be refined with historical data)
    const baseProbabilities: Record<MarketRegime, RegimeState['transitionProbability']> = {
      trending_up: {
        toTrendingUp: 0.6,
        toTrendingDown: 0.1,
        toRanging: 0.2,
        toVolatile: 0.05,
        toCrash: 0.02,
        toRecovery: 0.03,
      },
      trending_down: {
        toTrendingUp: 0.15,
        toTrendingDown: 0.5,
        toRanging: 0.15,
        toVolatile: 0.1,
        toCrash: 0.08,
        toRecovery: 0.02,
      },
      ranging: {
        toTrendingUp: 0.25,
        toTrendingDown: 0.25,
        toRanging: 0.35,
        toVolatile: 0.1,
        toCrash: 0.03,
        toRecovery: 0.02,
      },
      volatile: {
        toTrendingUp: 0.2,
        toTrendingDown: 0.2,
        toRanging: 0.3,
        toVolatile: 0.2,
        toCrash: 0.08,
        toRecovery: 0.02,
      },
      low_volatility: {
        toTrendingUp: 0.15,
        toTrendingDown: 0.1,
        toRanging: 0.4,
        toVolatile: 0.15,
        toCrash: 0.05,
        toRecovery: 0.15,
      },
      crash: {
        toTrendingUp: 0.05,
        toTrendingDown: 0.15,
        toRanging: 0.1,
        toVolatile: 0.3,
        toCrash: 0.1,
        toRecovery: 0.3,
      },
      recovery: {
        toTrendingUp: 0.35,
        toTrendingDown: 0.1,
        toRanging: 0.25,
        toVolatile: 0.15,
        toCrash: 0.05,
        toRecovery: 0.1,
      },
      unknown: {
        toTrendingUp: 0.2,
        toTrendingDown: 0.2,
        toRanging: 0.3,
        toVolatile: 0.15,
        toCrash: 0.05,
        toRecovery: 0.1,
      },
    };
    
    return baseProbabilities[currentRegime];
  }

  // ============================================
  // STRATEGY ADJUSTMENTS
  // ============================================

  /**
   * Get strategy adjustments for current regime
   */
  getStrategyAdjustments(symbol: string): StrategyAdjustments {
    // Check cache
    const cached = this.adjustmentCache.get(symbol);
    if (cached) return cached;
    
    const state = this.regimeStates.get(symbol);
    if (!state) {
      return REGIME_ADJUSTMENTS.unknown;
    }
    
    // Get base adjustments for current regime
    const baseAdjustments = { ...REGIME_ADJUSTMENTS[state.current] };
    
    // Apply confidence-based modifications
    if (state.confidence < 0.6) {
      // Low confidence = more conservative
      baseAdjustments.positionSizeMultiplier *= 0.7;
      baseAdjustments.entryThreshold = Math.min(1, baseAdjustments.entryThreshold + 0.1);
    }
    
    // Apply duration-based modifications
    if (state.duration > 4 * 60 * 60 * 1000) {
      // Long-running regime = possible transition coming
      baseAdjustments.exitAggressiveness = Math.min(1, baseAdjustments.exitAggressiveness + 0.1);
    }
    
    // Cache and return
    this.adjustmentCache.set(symbol, baseAdjustments);
    return baseAdjustments;
  }

  /**
   * Get risk level recommendation
   */
  getRecommendedRiskLevel(symbol: string): RiskLevel {
    const state = this.regimeStates.get(symbol);
    if (!state) return 'moderate';
    
    switch (state.current) {
      case 'trending_up':
      case 'low_volatility':
        return 'aggressive';
        
      case 'ranging':
      case 'recovery':
        return 'moderate';
        
      case 'trending_down':
      case 'volatile':
      case 'unknown':
        return 'conservative';
        
      case 'crash':
        return 'conservative'; // Or could have 'defensive' level
    }
  }

  /**
   * Check if trading is recommended
   */
  isTradingRecommended(symbol: string): { 
    recommended: boolean; 
    reason: string;
    restrictionLevel: 'none' | 'reduced' | 'minimal' | 'halt';
  } {
    const state = this.regimeStates.get(symbol);
    if (!state) {
      return {
        recommended: true,
        reason: 'Regime não determinado - operar com cautela',
        restrictionLevel: 'reduced',
      };
    }
    
    switch (state.current) {
      case 'crash':
        return {
          recommended: false,
          reason: 'Regime de crash detectado - apenas fechar posições',
          restrictionLevel: 'halt',
        };
        
      case 'volatile':
        if (state.confidence > 0.7) {
          return {
            recommended: false,
            reason: 'Alta volatilidade - aguardar estabilização',
            restrictionLevel: 'minimal',
          };
        }
        return {
          recommended: true,
          reason: 'Volatilidade elevada - reduzir tamanho das posições',
          restrictionLevel: 'reduced',
        };
        
      case 'unknown':
        return {
          recommended: true,
          reason: 'Regime incerto - operar com tamanho reduzido',
          restrictionLevel: 'reduced',
        };
        
      default:
        return {
          recommended: true,
          reason: `Regime ${state.current} - condições favoráveis`,
          restrictionLevel: 'none',
        };
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private createInitialState(): RegimeState {
    return {
      current: 'unknown',
      previous: 'unknown',
      confidence: 0.3,
      duration: 0,
      changedAt: Date.now(),
      transitionProbability: {
        toTrendingUp: 0.2,
        toTrendingDown: 0.2,
        toRanging: 0.3,
        toVolatile: 0.15,
        toCrash: 0.05,
        toRecovery: 0.1,
      },
    };
  }

  private calculatePriceChange(candles: OHLCV[], periods: number): number {
    if (candles.length < periods) return 0;
    
    const current = candles[candles.length - 1].close;
    const past = candles[candles.length - Math.min(periods, candles.length)].close;
    
    return (current - past) / past;
  }

  private calculateVolumeRatio(candles: OHLCV[]): number {
    if (candles.length < 20) return 1;
    
    const recentVolume = candles.slice(-5).reduce((s, c) => s + c.volume, 0) / 5;
    const avgVolume = candles.slice(-20).reduce((s, c) => s + c.volume, 0) / 20;
    
    return avgVolume > 0 ? recentVolume / avgVolume : 1;
  }

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * Get current regime state
   */
  getRegimeState(symbol: string): RegimeState | undefined {
    return this.regimeStates.get(symbol);
  }

  /**
   * Get transition history
   */
  getTransitionHistory(symbol: string, limit: number = 20): RegimeTransition[] {
    const history = this.transitionHistory.get(symbol) || [];
    return history.slice(-limit);
  }

  /**
   * Get all monitored symbols
   */
  getMonitoredSymbols(): string[] {
    return Array.from(this.regimeStates.keys());
  }

  /**
   * Remove symbol from monitoring
   */
  removeSymbol(symbol: string): void {
    this.regimeStates.delete(symbol);
    this.transitionHistory.delete(symbol);
    this.priceHistory.delete(symbol);
    this.adjustmentCache.delete(symbol);
    this.lastUpdate.delete(symbol);
  }
}

// Factory function
export function createMarketRegimeAdapter(
  indicatorsEngine: TechnicalIndicatorsEngine
): MarketRegimeAdapter {
  return new MarketRegimeAdapter(indicatorsEngine);
}
