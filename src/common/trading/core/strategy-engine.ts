/**
 * Strategy Engine - Sistema de Estratégias de Trading
 * Múltiplas estratégias com evolução adaptativa
 */

import { injectable } from 'inversify';
import { EventEmitter } from 'events';
import {
  Strategy,
  StrategySignal,
  StrategyType,
  TechnicalAnalysis,
  FundamentalAnalysis,
  SentimentAnalysis,
  Quote,
  OHLCV,
  Asset,
} from './trading-types';

/**
 * Interface para uma estratégia individual
 */
export interface IStrategy {
  readonly id: string;
  readonly name: string;
  readonly type: StrategyType;
  readonly timeframe: string;
  
  analyze(data: StrategyInput): Promise<StrategySignal>;
  getParameters(): Record<string, any>;
  updateParameters(params: Record<string, any>): void;
  getPerformance(): StrategyPerformance;
}

export interface StrategyInput {
  asset: Asset;
  quotes: Quote[];
  candles: OHLCV[];
  technical?: TechnicalAnalysis;
  fundamental?: FundamentalAnalysis;
  sentiment?: SentimentAnalysis;
}

export interface StrategyPerformance {
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  maxDrawdown: number;
  sharpeRatio: number;
  totalTrades: number;
  lastUpdated: Date;
}

/**
 * Strategy Engine - Gerencia múltiplas estratégias
 */
@injectable()
export class StrategyEngine extends EventEmitter {
  private strategies: Map<string, IStrategy> = new Map();
  private activeStrategies: Set<string> = new Set();
  private signalHistory: Map<string, StrategySignal[]> = new Map();
  private performanceHistory: Map<string, StrategyPerformance[]> = new Map();

  constructor() {
    super();
    this.initializeDefaultStrategies();
  }

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * Register a new strategy
   */
  registerStrategy(strategy: IStrategy): void {
    this.strategies.set(strategy.id, strategy);
    this.signalHistory.set(strategy.id, []);
    this.performanceHistory.set(strategy.id, []);
    this.emit('strategyRegistered', strategy.id);
  }

  /**
   * Activate a strategy
   */
  activateStrategy(strategyId: string): boolean {
    if (!this.strategies.has(strategyId)) return false;
    this.activeStrategies.add(strategyId);
    this.emit('strategyActivated', strategyId);
    return true;
  }

  /**
   * Deactivate a strategy
   */
  deactivateStrategy(strategyId: string): boolean {
    if (!this.activeStrategies.has(strategyId)) return false;
    this.activeStrategies.delete(strategyId);
    this.emit('strategyDeactivated', strategyId);
    return true;
  }

  /**
   * Run all active strategies and collect signals
   */
  async generateSignals(input: StrategyInput): Promise<StrategySignal[]> {
    const signals: StrategySignal[] = [];

    const activeStrategyIds = Array.from(this.activeStrategies);
    for (const strategyId of activeStrategyIds) {
      const strategy = this.strategies.get(strategyId);
      if (!strategy) continue;

      try {
        const signal = await strategy.analyze(input);
        signals.push(signal);

        // Record signal
        this.recordSignal(strategyId, signal);
      } catch (error) {
        this.emit('strategyError', { strategyId, error });
      }
    }

    // Emit signals event
    this.emit('signalsGenerated', signals);

    return signals;
  }

  /**
   * Get ensemble signal (weighted combination)
   */
  getEnsembleSignal(signals: StrategySignal[]): StrategySignal | null {
    if (signals.length === 0) return null;

    const validSignals = signals.filter(s => s.action !== 'hold');
    if (validSignals.length === 0) {
      // All signals are hold - return hold with average confidence
      const avgConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;
      return {
        strategyId: 'ensemble',
        assetId: signals[0].assetId,
        action: 'hold',
        confidence: avgConfidence,
        timestamp: new Date(),
        metadata: { source: 'ensemble', contributingSignals: signals.length },
      };
    }

    // Weight signals by strategy performance
    let buyWeight = 0;
    let sellWeight = 0;
    let totalWeight = 0;

    for (const signal of validSignals) {
      const strategy = this.strategies.get(signal.strategyId);
      if (!strategy) continue;

      const performance = strategy.getPerformance();
      const weight = this.calculateStrategyWeight(performance) * signal.confidence;

      if (signal.action === 'buy') {
        buyWeight += weight;
      } else if (signal.action === 'sell') {
        sellWeight += weight;
      }
      totalWeight += weight;
    }

    // Determine ensemble action
    let action: 'buy' | 'sell' | 'hold';
    let confidence: number;

    if (Math.abs(buyWeight - sellWeight) < totalWeight * 0.2) {
      // Conflicting signals - hold
      action = 'hold';
      confidence = 0.3;
    } else if (buyWeight > sellWeight) {
      action = 'buy';
      confidence = buyWeight / totalWeight;
    } else {
      action = 'sell';
      confidence = sellWeight / totalWeight;
    }

    // Calculate ensemble price targets
    const priceTargets = this.calculateEnsemblePriceTargets(validSignals, action);

    return {
      strategyId: 'ensemble',
      assetId: validSignals[0].assetId,
      action,
      confidence,
      price: priceTargets.entry,
      stopLoss: priceTargets.stopLoss,
      takeProfit: priceTargets.takeProfit,
      timestamp: new Date(),
      metadata: {
        source: 'ensemble',
        contributingSignals: validSignals.length,
        buyWeight,
        sellWeight,
      },
    };
  }

  /**
   * Update strategy performance after trade
   */
  updateStrategyPerformance(strategyId: string, trade: TradeResult): void {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return;

    const history = this.performanceHistory.get(strategyId) || [];
    const currentPerf = strategy.getPerformance();

    // Update performance metrics
    // This would be more sophisticated in production
    history.push(currentPerf);
    this.performanceHistory.set(strategyId, history);

    this.emit('performanceUpdated', { strategyId, performance: currentPerf });
  }

  /**
   * Get all registered strategies
   */
  getStrategies(): IStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Get active strategies
   */
  getActiveStrategies(): IStrategy[] {
    return Array.from(this.activeStrategies)
      .map(id => this.strategies.get(id)!)
      .filter(Boolean);
  }

  /**
   * Get strategy by ID
   */
  getStrategy(strategyId: string): IStrategy | undefined {
    return this.strategies.get(strategyId);
  }

  /**
   * Get signal history for a strategy
   */
  getSignalHistory(strategyId: string, limit: number = 100): StrategySignal[] {
    const history = this.signalHistory.get(strategyId) || [];
    return history.slice(-limit);
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private initializeDefaultStrategies(): void {
    // Register built-in strategies
    this.registerStrategy(new TrendFollowingStrategy());
    this.registerStrategy(new MeanReversionStrategy());
    this.registerStrategy(new MomentumStrategy());
    this.registerStrategy(new BreakoutStrategy());
    this.registerStrategy(new ScalpingStrategy());
  }

  private recordSignal(strategyId: string, signal: StrategySignal): void {
    const history = this.signalHistory.get(strategyId) || [];
    history.push(signal);
    
    // Keep only last 1000 signals per strategy
    if (history.length > 1000) {
      history.shift();
    }
    
    this.signalHistory.set(strategyId, history);
  }

  private calculateStrategyWeight(performance: StrategyPerformance): number {
    // Weight based on profit factor and win rate
    const pfWeight = Math.min(2, performance.profitFactor) / 2;
    const wrWeight = performance.winRate;
    const sharpWeight = Math.min(3, Math.max(0, performance.sharpeRatio)) / 3;

    return (pfWeight * 0.4 + wrWeight * 0.3 + sharpWeight * 0.3);
  }

  private calculateEnsemblePriceTargets(
    signals: StrategySignal[],
    action: 'buy' | 'sell' | 'hold'
  ): { entry?: number; stopLoss?: number; takeProfit?: number } {
    if (action === 'hold') return {};

    const relevantSignals = signals.filter(s => s.action === action);
    if (relevantSignals.length === 0) return {};

    const withPrices = relevantSignals.filter(s => s.price);
    const withStops = relevantSignals.filter(s => s.stopLoss);
    const withTargets = relevantSignals.filter(s => s.takeProfit);

    return {
      entry: withPrices.length > 0 
        ? withPrices.reduce((sum, s) => sum + s.price!, 0) / withPrices.length 
        : undefined,
      stopLoss: withStops.length > 0
        ? withStops.reduce((sum, s) => sum + s.stopLoss!, 0) / withStops.length
        : undefined,
      takeProfit: withTargets.length > 0
        ? withTargets.reduce((sum, s) => sum + s.takeProfit!, 0) / withTargets.length
        : undefined,
    };
  }
}

// ============================================
// BUILT-IN STRATEGIES
// ============================================

interface TradeResult {
  pnl: number;
  won: boolean;
}

/**
 * Base class for strategies
 */
abstract class BaseStrategy implements IStrategy {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly type: StrategyType;
  abstract readonly timeframe: string;

  protected parameters: Record<string, any> = {};
  protected performance: StrategyPerformance = {
    winRate: 0.5,
    profitFactor: 1.0,
    avgWin: 0,
    avgLoss: 0,
    maxDrawdown: 0,
    sharpeRatio: 0,
    totalTrades: 0,
    lastUpdated: new Date(),
  };

  abstract analyze(data: StrategyInput): Promise<StrategySignal>;

  getParameters(): Record<string, any> {
    return { ...this.parameters };
  }

  updateParameters(params: Record<string, any>): void {
    this.parameters = { ...this.parameters, ...params };
  }

  getPerformance(): StrategyPerformance {
    return { ...this.performance };
  }

  protected calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];
    const slice = prices.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  }

  protected calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return this.calculateSMA(prices, prices.length);
    
    const multiplier = 2 / (period + 1);
    let ema = this.calculateSMA(prices.slice(0, period), period);
    
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }
    
    return ema;
  }

  protected calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;

    const changes = prices.slice(1).map((price, i) => price - prices[i]);
    const gains = changes.map(c => c > 0 ? c : 0);
    const losses = changes.map(c => c < 0 ? -c : 0);

    const avgGain = this.calculateSMA(gains.slice(-period), period);
    const avgLoss = this.calculateSMA(losses.slice(-period), period);

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  protected calculateATR(candles: OHLCV[], period: number = 14): number {
    if (candles.length < period) return 0;

    const trs: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      const tr = Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - candles[i - 1].close),
        Math.abs(candles[i].low - candles[i - 1].close)
      );
      trs.push(tr);
    }

    return this.calculateSMA(trs.slice(-period), period);
  }

  protected calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): {
    upper: number;
    middle: number;
    lower: number;
  } {
    const sma = this.calculateSMA(prices, period);
    const slice = prices.slice(-period);
    const variance = slice.reduce((sum, p) => sum + Math.pow(p - sma, 2), 0) / period;
    const std = Math.sqrt(variance);

    return {
      upper: sma + std * stdDev,
      middle: sma,
      lower: sma - std * stdDev,
    };
  }
}

/**
 * Trend Following Strategy
 */
class TrendFollowingStrategy extends BaseStrategy {
  readonly id = 'trend_following';
  readonly name = 'Trend Following';
  readonly type: StrategyType = 'trend_following';
  readonly timeframe = '4h';

  constructor() {
    super();
    this.parameters = {
      fastMA: 10,
      slowMA: 20,
      atrMultiplier: 2,
    };
  }

  async analyze(data: StrategyInput): Promise<StrategySignal> {
    const prices = data.candles.map(c => c.close);
    const { fastMA, slowMA, atrMultiplier } = this.parameters;

    const fastEMA = this.calculateEMA(prices, fastMA);
    const slowEMA = this.calculateEMA(prices, slowMA);
    const atr = this.calculateATR(data.candles);
    const currentPrice = prices[prices.length - 1];

    let action: 'buy' | 'sell' | 'hold' = 'hold';
    let confidence = 0.5;

    // Trend determination
    const trend = fastEMA > slowEMA ? 'up' : 'down';
    const trendStrength = Math.abs(fastEMA - slowEMA) / slowEMA;

    if (trend === 'up' && trendStrength > 0.01) {
      action = 'buy';
      confidence = Math.min(0.9, 0.5 + trendStrength * 10);
    } else if (trend === 'down' && trendStrength > 0.01) {
      action = 'sell';
      confidence = Math.min(0.9, 0.5 + trendStrength * 10);
    }

    // Calculate stops
    const stopLoss = action === 'buy' 
      ? currentPrice - atr * atrMultiplier
      : action === 'sell' 
        ? currentPrice + atr * atrMultiplier
        : undefined;

    const takeProfit = action === 'buy'
      ? currentPrice + atr * atrMultiplier * 2
      : action === 'sell'
        ? currentPrice - atr * atrMultiplier * 2
        : undefined;

    return {
      strategyId: this.id,
      assetId: data.asset.id,
      action,
      confidence,
      price: currentPrice,
      stopLoss,
      takeProfit,
      timestamp: new Date(),
      metadata: { fastEMA, slowEMA, trend, trendStrength, atr },
    };
  }
}

/**
 * Mean Reversion Strategy
 */
class MeanReversionStrategy extends BaseStrategy {
  readonly id = 'mean_reversion';
  readonly name = 'Mean Reversion';
  readonly type: StrategyType = 'mean_reversion';
  readonly timeframe = '1h';

  constructor() {
    super();
    this.parameters = {
      bbPeriod: 20,
      bbStdDev: 2,
      rsiPeriod: 14,
      rsiOversold: 30,
      rsiOverbought: 70,
    };
  }

  async analyze(data: StrategyInput): Promise<StrategySignal> {
    const prices = data.candles.map(c => c.close);
    const { bbPeriod, bbStdDev, rsiPeriod, rsiOversold, rsiOverbought } = this.parameters;

    const bb = this.calculateBollingerBands(prices, bbPeriod, bbStdDev);
    const rsi = this.calculateRSI(prices, rsiPeriod);
    const currentPrice = prices[prices.length - 1];

    let action: 'buy' | 'sell' | 'hold' = 'hold';
    let confidence = 0.5;

    // Oversold - potential buy
    if (currentPrice < bb.lower && rsi < rsiOversold) {
      action = 'buy';
      confidence = Math.min(0.9, 0.6 + (rsiOversold - rsi) / 100);
    }
    // Overbought - potential sell
    else if (currentPrice > bb.upper && rsi > rsiOverbought) {
      action = 'sell';
      confidence = Math.min(0.9, 0.6 + (rsi - rsiOverbought) / 100);
    }

    // Targets are the mean
    const stopLoss = action === 'buy'
      ? currentPrice * 0.98 // 2% stop
      : action === 'sell'
        ? currentPrice * 1.02
        : undefined;

    const takeProfit = action !== 'hold' ? bb.middle : undefined;

    return {
      strategyId: this.id,
      assetId: data.asset.id,
      action,
      confidence,
      price: currentPrice,
      stopLoss,
      takeProfit,
      timestamp: new Date(),
      metadata: { bb, rsi },
    };
  }
}

/**
 * Momentum Strategy
 */
class MomentumStrategy extends BaseStrategy {
  readonly id = 'momentum';
  readonly name = 'Momentum';
  readonly type: StrategyType = 'momentum';
  readonly timeframe = '1d';

  constructor() {
    super();
    this.parameters = {
      lookbackPeriod: 14,
      rsiPeriod: 14,
      momentumThreshold: 0.05,
    };
  }

  async analyze(data: StrategyInput): Promise<StrategySignal> {
    const prices = data.candles.map(c => c.close);
    const { lookbackPeriod, rsiPeriod, momentumThreshold } = this.parameters;

    const currentPrice = prices[prices.length - 1];
    const pastPrice = prices[prices.length - lookbackPeriod] || prices[0];
    const momentum = (currentPrice - pastPrice) / pastPrice;
    const rsi = this.calculateRSI(prices, rsiPeriod);

    let action: 'buy' | 'sell' | 'hold' = 'hold';
    let confidence = 0.5;

    // Strong positive momentum
    if (momentum > momentumThreshold && rsi > 50 && rsi < 80) {
      action = 'buy';
      confidence = Math.min(0.9, 0.5 + momentum * 5);
    }
    // Strong negative momentum
    else if (momentum < -momentumThreshold && rsi < 50 && rsi > 20) {
      action = 'sell';
      confidence = Math.min(0.9, 0.5 + Math.abs(momentum) * 5);
    }

    const atr = this.calculateATR(data.candles);
    const stopLoss = action === 'buy'
      ? currentPrice - atr * 2
      : action === 'sell'
        ? currentPrice + atr * 2
        : undefined;

    return {
      strategyId: this.id,
      assetId: data.asset.id,
      action,
      confidence,
      price: currentPrice,
      stopLoss,
      timestamp: new Date(),
      metadata: { momentum, rsi, lookback: lookbackPeriod },
    };
  }
}

/**
 * Breakout Strategy
 */
class BreakoutStrategy extends BaseStrategy {
  readonly id = 'breakout';
  readonly name = 'Breakout';
  readonly type: StrategyType = 'breakout';
  readonly timeframe = '1h';

  constructor() {
    super();
    this.parameters = {
      lookbackPeriod: 20,
      volumeMultiplier: 1.5,
    };
  }

  async analyze(data: StrategyInput): Promise<StrategySignal> {
    const prices = data.candles.map(c => c.close);
    const highs = data.candles.map(c => c.high);
    const lows = data.candles.map(c => c.low);
    const volumes = data.candles.map(c => c.volume);
    const { lookbackPeriod, volumeMultiplier } = this.parameters;

    const currentPrice = prices[prices.length - 1];
    const currentVolume = volumes[volumes.length - 1];

    // Calculate resistance and support
    const recentHighs = highs.slice(-lookbackPeriod);
    const recentLows = lows.slice(-lookbackPeriod);
    const resistance = Math.max(...recentHighs);
    const support = Math.min(...recentLows);

    // Average volume
    const avgVolume = this.calculateSMA(volumes.slice(-lookbackPeriod), lookbackPeriod);
    const volumeBreakout = currentVolume > avgVolume * volumeMultiplier;

    let action: 'buy' | 'sell' | 'hold' = 'hold';
    let confidence = 0.5;

    // Bullish breakout
    if (currentPrice > resistance && volumeBreakout) {
      action = 'buy';
      confidence = Math.min(0.9, 0.6 + (currentVolume / avgVolume - volumeMultiplier) * 0.2);
    }
    // Bearish breakdown
    else if (currentPrice < support && volumeBreakout) {
      action = 'sell';
      confidence = Math.min(0.9, 0.6 + (currentVolume / avgVolume - volumeMultiplier) * 0.2);
    }

    const range = resistance - support;
    const stopLoss = action === 'buy'
      ? resistance - range * 0.1 // Just below breakout level
      : action === 'sell'
        ? support + range * 0.1
        : undefined;

    const takeProfit = action === 'buy'
      ? currentPrice + range
      : action === 'sell'
        ? currentPrice - range
        : undefined;

    return {
      strategyId: this.id,
      assetId: data.asset.id,
      action,
      confidence,
      price: currentPrice,
      stopLoss,
      takeProfit,
      timestamp: new Date(),
      metadata: { resistance, support, volumeBreakout, volumeRatio: currentVolume / avgVolume },
    };
  }
}

/**
 * Scalping Strategy
 */
class ScalpingStrategy extends BaseStrategy {
  readonly id = 'scalping';
  readonly name = 'Scalping';
  readonly type: StrategyType = 'scalping';
  readonly timeframe = '1m';

  constructor() {
    super();
    this.parameters = {
      emaPeriod: 9,
      rsiPeriod: 7,
      targetPips: 10,
      stopPips: 5,
    };
  }

  async analyze(data: StrategyInput): Promise<StrategySignal> {
    const prices = data.candles.map(c => c.close);
    const { emaPeriod, rsiPeriod, targetPips, stopPips } = this.parameters;

    const ema = this.calculateEMA(prices, emaPeriod);
    const rsi = this.calculateRSI(prices, rsiPeriod);
    const currentPrice = prices[prices.length - 1];
    const priceAboveEMA = currentPrice > ema;

    let action: 'buy' | 'sell' | 'hold' = 'hold';
    let confidence = 0.5;

    // Quick scalp buy
    if (priceAboveEMA && rsi < 40) {
      action = 'buy';
      confidence = 0.7;
    }
    // Quick scalp sell
    else if (!priceAboveEMA && rsi > 60) {
      action = 'sell';
      confidence = 0.7;
    }

    const pipValue = currentPrice * 0.0001; // Approximate pip value
    const stopLoss = action === 'buy'
      ? currentPrice - pipValue * stopPips
      : action === 'sell'
        ? currentPrice + pipValue * stopPips
        : undefined;

    const takeProfit = action === 'buy'
      ? currentPrice + pipValue * targetPips
      : action === 'sell'
        ? currentPrice - pipValue * targetPips
        : undefined;

    return {
      strategyId: this.id,
      assetId: data.asset.id,
      action,
      confidence,
      price: currentPrice,
      stopLoss,
      takeProfit,
      timestamp: new Date(),
      metadata: { ema, rsi, priceAboveEMA },
    };
  }
}
