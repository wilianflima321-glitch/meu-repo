/**
 * Technical Indicators Engine
 * Sistema completo de indicadores técnicos com precisão matemática
 * Para uso interno da IA - cálculos em tempo real
 */

import { OHLCV, Quote } from './trading-types';

// ============================================
// INDICATOR TYPES
// ============================================

export interface IndicatorResult {
  name: string;
  value: number;
  signal: 'buy' | 'sell' | 'neutral';
  strength: number; // 0-1
  metadata?: Record<string, any>;
}

export interface MovingAverageResult extends IndicatorResult {
  period: number;
  type: 'sma' | 'ema' | 'wma' | 'vwma' | 'hull' | 'dema' | 'tema';
  trend: 'up' | 'down' | 'flat';
}

export interface BollingerBandsResult {
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number;
  percentB: number; // Position within bands (0-1)
  signal: 'overbought' | 'oversold' | 'neutral';
  squeeze: boolean;
}

export interface MACDResult {
  macd: number;
  signal: number;
  histogram: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  crossover: 'bullish_cross' | 'bearish_cross' | 'none';
  divergence: 'bullish' | 'bearish' | 'none';
}

export interface RSIResult {
  value: number;
  signal: 'overbought' | 'oversold' | 'neutral';
  divergence: 'bullish' | 'bearish' | 'none';
  trend: 'strengthening' | 'weakening' | 'stable';
}

export interface StochasticResult {
  k: number;
  d: number;
  signal: 'overbought' | 'oversold' | 'neutral';
  crossover: 'bullish_cross' | 'bearish_cross' | 'none';
}

export interface ATRResult {
  value: number;
  normalized: number; // ATR as % of price
  volatility: 'low' | 'normal' | 'medium' | 'high' | 'extreme';
  expanding: boolean;
}

export interface ADXResult {
  adx: number;
  plusDI: number;
  minusDI: number;
  trendStrength: 'none' | 'weak' | 'strong' | 'very_strong';
  direction: 'bullish' | 'bearish' | 'none';
}

export interface IchimokuResult {
  tenkan: number;
  kijun: number;
  senkouA: number;
  senkouB: number;
  chikou: number;
  cloudColor: 'green' | 'red';
  priceLocation: 'above_cloud' | 'in_cloud' | 'below_cloud';
  tkCross: 'bullish' | 'bearish' | 'none';
  signal: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
}

export interface VolumeAnalysis {
  current: number;
  average: number;
  ratio: number; // current/average
  trend: 'increasing' | 'decreasing' | 'stable';
  obv: number;
  obvTrend: 'bullish' | 'bearish' | 'neutral';
  vwap: number;
  priceVsVwap: 'above' | 'below' | 'at';
  cmf: number; // Chaikin Money Flow
  mfi: number; // Money Flow Index
}

export interface SupportResistanceLevel {
  price: number;
  type: 'support' | 'resistance';
  strength: number; // 0-1 based on touches and recency
  touches: number;
  lastTouched: number;
  broken: boolean;
}

export interface FibonacciLevels {
  high: number;
  low: number;
  direction: 'retracement' | 'extension';
  levels: {
    level: number; // 0.236, 0.382, 0.5, 0.618, 0.786, 1.0, 1.272, 1.618
    price: number;
    label: string;
  }[];
  currentLevel: number; // Nearest Fib level
}

export interface PivotPoints {
  pp: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
  type: 'standard' | 'fibonacci' | 'woodie' | 'camarilla';
}

export interface ComprehensiveIndicators {
  timestamp: number;
  price: Quote;
  
  // Trend Indicators
  sma20: MovingAverageResult;
  sma50: MovingAverageResult;
  sma200: MovingAverageResult;
  ema9: MovingAverageResult;
  ema21: MovingAverageResult;
  ema55: MovingAverageResult;
  
  // Momentum
  rsi14: RSIResult;
  macd: MACDResult;
  stochastic: StochasticResult;
  cci: IndicatorResult;
  williams: IndicatorResult;
  momentum: IndicatorResult;
  
  // Volatility
  atr14: ATRResult;
  bollingerBands: BollingerBandsResult;
  keltnerChannel: { upper: number; middle: number; lower: number };
  
  // Trend Strength
  adx: ADXResult;
  
  // Japanese
  ichimoku: IchimokuResult;
  
  // Volume
  volume: VolumeAnalysis;
  
  // Levels
  supportResistance: SupportResistanceLevel[];
  fibonacci: FibonacciLevels;
  pivotPoints: PivotPoints;
  
  // Overall Assessment
  overallSignal: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
  signalStrength: number;
  confidence: number;
}

// ============================================
// TECHNICAL INDICATORS ENGINE
// ============================================

export class TechnicalIndicatorsEngine {
  private priceHistory: Map<string, OHLCV[]> = new Map();
  private quoteHistory: Map<string, Quote[]> = new Map();
  private indicatorCache: Map<string, Map<string, any>> = new Map();

  // ============================================
  // DATA MANAGEMENT
  // ============================================

  /**
   * Add price data to history
   */
  addPriceData(symbol: string, candle: OHLCV): void {
    const history = this.priceHistory.get(symbol) || [];
    history.push(candle);
    
    // Keep last 500 candles
    if (history.length > 500) {
      history.shift();
    }
    
    this.priceHistory.set(symbol, history);
    this.invalidateCache(symbol);
  }

  /**
   * Set price history for a symbol
   */
  setPriceHistory(symbol: string, candles: OHLCV[]): void {
    this.priceHistory.set(symbol, candles.slice(-500));
    this.invalidateCache(symbol);
  }

  /**
   * Alias for setPriceHistory - update data for backtesting
   */
  updateData(symbol: string, candles: OHLCV[]): void {
    this.setPriceHistory(symbol, candles);
  }

  /**
   * Add quote to history
   */
  addQuote(symbol: string, quote: Quote): void {
    const history = this.quoteHistory.get(symbol) || [];
    history.push(quote);
    
    if (history.length > 1000) {
      history.shift();
    }
    
    this.quoteHistory.set(symbol, history);
  }

  private invalidateCache(symbol: string): void {
    this.indicatorCache.delete(symbol);
  }

  // ============================================
  // MOVING AVERAGES
  // ============================================

  /**
   * Simple Moving Average
   */
  calculateSMA(closes: number[], period: number): number[] {
    const result: number[] = [];
    
    for (let i = 0; i < closes.length; i++) {
      if (i < period - 1) {
        result.push(NaN);
        continue;
      }
      
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += closes[i - j];
      }
      result.push(sum / period);
    }
    
    return result;
  }

  /**
   * Exponential Moving Average
   */
  calculateEMA(closes: number[], period: number): number[] {
    const result: number[] = [];
    const multiplier = 2 / (period + 1);
    
    // First EMA is SMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += closes[i];
      result.push(NaN);
    }
    result[period - 1] = sum / period;
    
    // Calculate EMA
    for (let i = period; i < closes.length; i++) {
      const ema = (closes[i] - result[i - 1]) * multiplier + result[i - 1];
      result.push(ema);
    }
    
    return result;
  }

  /**
   * Weighted Moving Average
   */
  calculateWMA(closes: number[], period: number): number[] {
    const result: number[] = [];
    const denominator = (period * (period + 1)) / 2;
    
    for (let i = 0; i < closes.length; i++) {
      if (i < period - 1) {
        result.push(NaN);
        continue;
      }
      
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += closes[i - j] * (period - j);
      }
      result.push(sum / denominator);
    }
    
    return result;
  }

  /**
   * Hull Moving Average (more responsive)
   */
  calculateHMA(closes: number[], period: number): number[] {
    const halfPeriod = Math.floor(period / 2);
    const sqrtPeriod = Math.floor(Math.sqrt(period));
    
    const wma1 = this.calculateWMA(closes, halfPeriod);
    const wma2 = this.calculateWMA(closes, period);
    
    // 2 * WMA(n/2) - WMA(n)
    const rawHull: number[] = [];
    for (let i = 0; i < closes.length; i++) {
      if (isNaN(wma1[i]) || isNaN(wma2[i])) {
        rawHull.push(NaN);
      } else {
        rawHull.push(2 * wma1[i] - wma2[i]);
      }
    }
    
    return this.calculateWMA(rawHull.filter(x => !isNaN(x)), sqrtPeriod);
  }

  /**
   * Volume Weighted Average Price
   */
  calculateVWAP(candles: OHLCV[]): number[] {
    const result: number[] = [];
    let cumulativeTPV = 0;
    let cumulativeVolume = 0;
    
    for (const candle of candles) {
      const typicalPrice = (candle.high + candle.low + candle.close) / 3;
      cumulativeTPV += typicalPrice * candle.volume;
      cumulativeVolume += candle.volume;
      
      result.push(cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : typicalPrice);
    }
    
    return result;
  }

  // ============================================
  // MOMENTUM INDICATORS
  // ============================================

  /**
   * Relative Strength Index
   */
  calculateRSI(closes: number[], period: number = 14): RSIResult[] {
    const results: RSIResult[] = [];
    
    // Calculate gains and losses
    const gains: number[] = [];
    const losses: number[] = [];
    
    for (let i = 1; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    // Calculate average gains and losses using EMA
    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
    
    for (let i = 0; i < period; i++) {
      results.push({
        value: NaN,
        signal: 'neutral',
        divergence: 'none',
        trend: 'stable',
      });
    }
    
    for (let i = period; i < closes.length; i++) {
      avgGain = (avgGain * (period - 1) + gains[i - 1]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i - 1]) / period;
      
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));
      
      // Determine signal
      let signal: 'overbought' | 'oversold' | 'neutral' = 'neutral';
      if (rsi >= 70) signal = 'overbought';
      else if (rsi <= 30) signal = 'oversold';
      
      // Determine trend
      let trend: 'strengthening' | 'weakening' | 'stable' = 'stable';
      if (results.length > 0 && !isNaN(results[results.length - 1].value)) {
        const prevRsi = results[results.length - 1].value;
        if (rsi > prevRsi + 2) trend = 'strengthening';
        else if (rsi < prevRsi - 2) trend = 'weakening';
      }
      
      results.push({
        value: rsi,
        signal,
        divergence: 'none', // TODO: Implement divergence detection
        trend,
      });
    }
    
    return results;
  }

  /**
   * MACD (Moving Average Convergence Divergence)
   */
  calculateMACD(
    closes: number[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
  ): MACDResult[] {
    const fastEMA = this.calculateEMA(closes, fastPeriod);
    const slowEMA = this.calculateEMA(closes, slowPeriod);
    
    const macdLine: number[] = [];
    for (let i = 0; i < closes.length; i++) {
      if (isNaN(fastEMA[i]) || isNaN(slowEMA[i])) {
        macdLine.push(NaN);
      } else {
        macdLine.push(fastEMA[i] - slowEMA[i]);
      }
    }
    
    const validMacd = macdLine.filter(x => !isNaN(x));
    const signalLine = this.calculateEMA(validMacd, signalPeriod);
    
    const results: MACDResult[] = [];
    let signalIndex = 0;
    
    for (let i = 0; i < closes.length; i++) {
      if (isNaN(macdLine[i])) {
        results.push({
          macd: NaN,
          signal: NaN,
          histogram: NaN,
          trend: 'neutral',
          crossover: 'none',
          divergence: 'none',
        });
        continue;
      }
      
      const signal = signalLine[signalIndex] || NaN;
      const histogram = macdLine[i] - signal;
      
      // Determine trend
      let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      if (macdLine[i] > 0 && histogram > 0) trend = 'bullish';
      else if (macdLine[i] < 0 && histogram < 0) trend = 'bearish';
      
      // Detect crossover
      let crossover: 'bullish_cross' | 'bearish_cross' | 'none' = 'none';
      if (results.length > 0) {
        const prev = results[results.length - 1];
        if (!isNaN(prev.macd) && !isNaN(prev.signal)) {
          if (prev.macd < prev.signal && macdLine[i] > signal) {
            crossover = 'bullish_cross';
          } else if (prev.macd > prev.signal && macdLine[i] < signal) {
            crossover = 'bearish_cross';
          }
        }
      }
      
      results.push({
        macd: macdLine[i],
        signal,
        histogram,
        trend,
        crossover,
        divergence: 'none',
      });
      
      signalIndex++;
    }
    
    return results;
  }

  /**
   * Stochastic Oscillator
   */
  calculateStochastic(
    candles: OHLCV[],
    kPeriod: number = 14,
    dPeriod: number = 3
  ): StochasticResult[] {
    const results: StochasticResult[] = [];
    const kValues: number[] = [];
    
    for (let i = 0; i < candles.length; i++) {
      if (i < kPeriod - 1) {
        kValues.push(NaN);
        results.push({
          k: NaN,
          d: NaN,
          signal: 'neutral',
          crossover: 'none',
        });
        continue;
      }
      
      let highest = -Infinity;
      let lowest = Infinity;
      
      for (let j = 0; j < kPeriod; j++) {
        const candle = candles[i - j];
        if (candle.high > highest) highest = candle.high;
        if (candle.low < lowest) lowest = candle.low;
      }
      
      const k = highest === lowest ? 50 : 
        ((candles[i].close - lowest) / (highest - lowest)) * 100;
      kValues.push(k);
      
      // Calculate %D (SMA of %K)
      let d = NaN;
      if (i >= kPeriod + dPeriod - 2) {
        let sum = 0;
        for (let j = 0; j < dPeriod; j++) {
          sum += kValues[kValues.length - 1 - j];
        }
        d = sum / dPeriod;
      }
      
      // Determine signal
      let signal: 'overbought' | 'oversold' | 'neutral' = 'neutral';
      if (k >= 80) signal = 'overbought';
      else if (k <= 20) signal = 'oversold';
      
      // Detect crossover
      let crossover: 'bullish_cross' | 'bearish_cross' | 'none' = 'none';
      if (results.length > 0 && !isNaN(d)) {
        const prev = results[results.length - 1];
        if (!isNaN(prev.k) && !isNaN(prev.d)) {
          if (prev.k < prev.d && k > d) crossover = 'bullish_cross';
          else if (prev.k > prev.d && k < d) crossover = 'bearish_cross';
        }
      }
      
      results.push({ k, d, signal, crossover });
    }
    
    return results;
  }

  /**
   * Commodity Channel Index
   */
  calculateCCI(candles: OHLCV[], period: number = 20): number[] {
    const results: number[] = [];
    const tps: number[] = [];
    
    for (const candle of candles) {
      tps.push((candle.high + candle.low + candle.close) / 3);
    }
    
    for (let i = 0; i < candles.length; i++) {
      if (i < period - 1) {
        results.push(NaN);
        continue;
      }
      
      // Calculate SMA of TP
      let smaSum = 0;
      for (let j = 0; j < period; j++) {
        smaSum += tps[i - j];
      }
      const smaTP = smaSum / period;
      
      // Calculate Mean Deviation
      let mdSum = 0;
      for (let j = 0; j < period; j++) {
        mdSum += Math.abs(tps[i - j] - smaTP);
      }
      const meanDeviation = mdSum / period;
      
      // Calculate CCI
      const cci = meanDeviation === 0 ? 0 : (tps[i] - smaTP) / (0.015 * meanDeviation);
      results.push(cci);
    }
    
    return results;
  }

  /**
   * Williams %R
   */
  calculateWilliamsR(candles: OHLCV[], period: number = 14): number[] {
    const results: number[] = [];
    
    for (let i = 0; i < candles.length; i++) {
      if (i < period - 1) {
        results.push(NaN);
        continue;
      }
      
      let highest = -Infinity;
      let lowest = Infinity;
      
      for (let j = 0; j < period; j++) {
        const candle = candles[i - j];
        if (candle.high > highest) highest = candle.high;
        if (candle.low < lowest) lowest = candle.low;
      }
      
      const wr = highest === lowest ? -50 :
        ((highest - candles[i].close) / (highest - lowest)) * -100;
      results.push(wr);
    }
    
    return results;
  }

  // ============================================
  // VOLATILITY INDICATORS
  // ============================================

  /**
   * Average True Range
   */
  calculateATR(candles: OHLCV[], period: number = 14): ATRResult[] {
    const results: ATRResult[] = [];
    const trs: number[] = [];
    
    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i];
      let tr: number;
      
      if (i === 0) {
        tr = candle.high - candle.low;
      } else {
        const prevClose = candles[i - 1].close;
        tr = Math.max(
          candle.high - candle.low,
          Math.abs(candle.high - prevClose),
          Math.abs(candle.low - prevClose)
        );
      }
      trs.push(tr);
      
      if (i < period - 1) {
        results.push({
          value: NaN,
          normalized: NaN,
          volatility: 'medium',
          expanding: false,
        });
        continue;
      }
      
      // Calculate ATR (using EMA-style smoothing)
      let atr: number;
      if (i === period - 1) {
        atr = trs.reduce((a, b) => a + b, 0) / period;
      } else {
        atr = (results[i - 1].value * (period - 1) + tr) / period;
      }
      
      const normalized = (atr / candle.close) * 100;
      
      // Determine volatility level
      let volatility: 'low' | 'medium' | 'high' | 'extreme' = 'medium';
      if (normalized < 1) volatility = 'low';
      else if (normalized > 3) volatility = 'high';
      else if (normalized > 5) volatility = 'extreme';
      
      // Check if expanding
      const expanding = results.length > 1 && 
        !isNaN(results[results.length - 1].value) &&
        atr > results[results.length - 1].value;
      
      results.push({ value: atr, normalized, volatility, expanding });
    }
    
    return results;
  }

  /**
   * Bollinger Bands
   */
  calculateBollingerBands(
    closes: number[],
    period: number = 20,
    stdDev: number = 2
  ): BollingerBandsResult[] {
    const results: BollingerBandsResult[] = [];
    const sma = this.calculateSMA(closes, period);
    
    for (let i = 0; i < closes.length; i++) {
      if (i < period - 1) {
        results.push({
          upper: NaN,
          middle: NaN,
          lower: NaN,
          bandwidth: NaN,
          percentB: NaN,
          signal: 'neutral',
          squeeze: false,
        });
        continue;
      }
      
      // Calculate standard deviation
      let sumSqDiff = 0;
      for (let j = 0; j < period; j++) {
        sumSqDiff += Math.pow(closes[i - j] - sma[i], 2);
      }
      const sd = Math.sqrt(sumSqDiff / period);
      
      const upper = sma[i] + (sd * stdDev);
      const lower = sma[i] - (sd * stdDev);
      const bandwidth = (upper - lower) / sma[i];
      
      // Percent B: Position within bands
      const percentB = (closes[i] - lower) / (upper - lower);
      
      // Signal
      let signal: 'overbought' | 'oversold' | 'neutral' = 'neutral';
      if (percentB >= 1) signal = 'overbought';
      else if (percentB <= 0) signal = 'oversold';
      
      // Squeeze detection (BB inside Keltner)
      const squeeze = bandwidth < 0.1; // Simplified
      
      results.push({
        upper,
        middle: sma[i],
        lower,
        bandwidth,
        percentB,
        signal,
        squeeze,
      });
    }
    
    return results;
  }

  // ============================================
  // TREND INDICATORS
  // ============================================

  /**
   * Average Directional Index
   */
  calculateADX(candles: OHLCV[], period: number = 14): ADXResult[] {
    const results: ADXResult[] = [];
    const plusDMs: number[] = [];
    const minusDMs: number[] = [];
    const trs: number[] = [];
    
    for (let i = 0; i < candles.length; i++) {
      if (i === 0) {
        plusDMs.push(0);
        minusDMs.push(0);
        trs.push(candles[i].high - candles[i].low);
        results.push({
          adx: NaN,
          plusDI: NaN,
          minusDI: NaN,
          trendStrength: 'none',
          direction: 'none',
        });
        continue;
      }
      
      const current = candles[i];
      const prev = candles[i - 1];
      
      // Calculate +DM and -DM
      const plusDM = Math.max(0, current.high - prev.high);
      const minusDM = Math.max(0, prev.low - current.low);
      
      if (plusDM > minusDM) {
        plusDMs.push(plusDM);
        minusDMs.push(0);
      } else if (minusDM > plusDM) {
        plusDMs.push(0);
        minusDMs.push(minusDM);
      } else {
        plusDMs.push(0);
        minusDMs.push(0);
      }
      
      // Calculate TR
      const tr = Math.max(
        current.high - current.low,
        Math.abs(current.high - prev.close),
        Math.abs(current.low - prev.close)
      );
      trs.push(tr);
      
      if (i < period) {
        results.push({
          adx: NaN,
          plusDI: NaN,
          minusDI: NaN,
          trendStrength: 'none',
          direction: 'none',
        });
        continue;
      }
      
      // Smoothed values
      const smoothPlusDM = plusDMs.slice(-period).reduce((a, b) => a + b, 0) / period;
      const smoothMinusDM = minusDMs.slice(-period).reduce((a, b) => a + b, 0) / period;
      const smoothTR = trs.slice(-period).reduce((a, b) => a + b, 0) / period;
      
      const plusDI = (smoothPlusDM / smoothTR) * 100;
      const minusDI = (smoothMinusDM / smoothTR) * 100;
      const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
      
      // ADX is smoothed DX
      let adx: number;
      if (results.length >= period && !isNaN(results[results.length - 1].adx)) {
        adx = (results[results.length - 1].adx * (period - 1) + dx) / period;
      } else {
        adx = dx;
      }
      
      // Trend strength
      let trendStrength: 'none' | 'weak' | 'strong' | 'very_strong' = 'none';
      if (adx >= 50) trendStrength = 'very_strong';
      else if (adx >= 25) trendStrength = 'strong';
      else if (adx >= 15) trendStrength = 'weak';
      
      // Direction
      let direction: 'bullish' | 'bearish' | 'none' = 'none';
      if (plusDI > minusDI) direction = 'bullish';
      else if (minusDI > plusDI) direction = 'bearish';
      
      results.push({ adx, plusDI, minusDI, trendStrength, direction });
    }
    
    return results;
  }

  /**
   * Ichimoku Cloud
   */
  calculateIchimoku(
    candles: OHLCV[],
    tenkanPeriod: number = 9,
    kijunPeriod: number = 26,
    senkouBPeriod: number = 52
  ): IchimokuResult[] {
    const results: IchimokuResult[] = [];
    
    const getHighLow = (start: number, period: number): { high: number; low: number } => {
      let high = -Infinity;
      let low = Infinity;
      for (let i = start; i > start - period && i >= 0; i--) {
        if (candles[i].high > high) high = candles[i].high;
        if (candles[i].low < low) low = candles[i].low;
      }
      return { high, low };
    };
    
    for (let i = 0; i < candles.length; i++) {
      if (i < senkouBPeriod - 1) {
        results.push({
          tenkan: NaN,
          kijun: NaN,
          senkouA: NaN,
          senkouB: NaN,
          chikou: candles[i].close,
          cloudColor: 'green',
          priceLocation: 'in_cloud',
          tkCross: 'none',
          signal: 'neutral',
        });
        continue;
      }
      
      const tenkanHL = getHighLow(i, tenkanPeriod);
      const tenkan = (tenkanHL.high + tenkanHL.low) / 2;
      
      const kijunHL = getHighLow(i, kijunPeriod);
      const kijun = (kijunHL.high + kijunHL.low) / 2;
      
      const senkouA = (tenkan + kijun) / 2;
      
      const senkouBHL = getHighLow(i, senkouBPeriod);
      const senkouB = (senkouBHL.high + senkouBHL.low) / 2;
      
      const chikou = candles[i].close;
      const currentPrice = candles[i].close;
      
      // Cloud color
      const cloudColor = senkouA >= senkouB ? 'green' : 'red';
      
      // Price location relative to cloud
      const cloudTop = Math.max(senkouA, senkouB);
      const cloudBottom = Math.min(senkouA, senkouB);
      let priceLocation: 'above_cloud' | 'in_cloud' | 'below_cloud' = 'in_cloud';
      if (currentPrice > cloudTop) priceLocation = 'above_cloud';
      else if (currentPrice < cloudBottom) priceLocation = 'below_cloud';
      
      // TK Cross
      let tkCross: 'bullish' | 'bearish' | 'none' = 'none';
      if (results.length > 0 && !isNaN(results[results.length - 1].tenkan)) {
        const prev = results[results.length - 1];
        if (prev.tenkan < prev.kijun && tenkan > kijun) tkCross = 'bullish';
        else if (prev.tenkan > prev.kijun && tenkan < kijun) tkCross = 'bearish';
      }
      
      // Overall signal
      let signal: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell' = 'neutral';
      if (priceLocation === 'above_cloud' && cloudColor === 'green' && tenkan > kijun) {
        signal = 'strong_buy';
      } else if (priceLocation === 'above_cloud') {
        signal = 'buy';
      } else if (priceLocation === 'below_cloud' && cloudColor === 'red' && tenkan < kijun) {
        signal = 'strong_sell';
      } else if (priceLocation === 'below_cloud') {
        signal = 'sell';
      }
      
      results.push({
        tenkan,
        kijun,
        senkouA,
        senkouB,
        chikou,
        cloudColor,
        priceLocation,
        tkCross,
        signal,
      });
    }
    
    return results;
  }

  // ============================================
  // VOLUME ANALYSIS
  // ============================================

  /**
   * On-Balance Volume
   */
  calculateOBV(candles: OHLCV[]): number[] {
    const results: number[] = [];
    let obv = 0;
    
    for (let i = 0; i < candles.length; i++) {
      if (i === 0) {
        results.push(candles[i].volume);
        obv = candles[i].volume;
        continue;
      }
      
      if (candles[i].close > candles[i - 1].close) {
        obv += candles[i].volume;
      } else if (candles[i].close < candles[i - 1].close) {
        obv -= candles[i].volume;
      }
      
      results.push(obv);
    }
    
    return results;
  }

  /**
   * Money Flow Index
   */
  calculateMFI(candles: OHLCV[], period: number = 14): number[] {
    const results: number[] = [];
    const rawMoneyFlows: { positive: number; negative: number }[] = [];
    
    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i];
      const typicalPrice = (candle.high + candle.low + candle.close) / 3;
      const rawMF = typicalPrice * candle.volume;
      
      if (i === 0) {
        rawMoneyFlows.push({ positive: rawMF, negative: 0 });
        results.push(NaN);
        continue;
      }
      
      const prevTP = (candles[i - 1].high + candles[i - 1].low + candles[i - 1].close) / 3;
      
      if (typicalPrice > prevTP) {
        rawMoneyFlows.push({ positive: rawMF, negative: 0 });
      } else {
        rawMoneyFlows.push({ positive: 0, negative: rawMF });
      }
      
      if (i < period) {
        results.push(NaN);
        continue;
      }
      
      let positiveSum = 0;
      let negativeSum = 0;
      for (let j = 0; j < period; j++) {
        positiveSum += rawMoneyFlows[i - j].positive;
        negativeSum += rawMoneyFlows[i - j].negative;
      }
      
      const mfr = negativeSum === 0 ? 100 : positiveSum / negativeSum;
      const mfi = 100 - (100 / (1 + mfr));
      results.push(mfi);
    }
    
    return results;
  }

  /**
   * Chaikin Money Flow
   */
  calculateCMF(candles: OHLCV[], period: number = 20): number[] {
    const results: number[] = [];
    
    for (let i = 0; i < candles.length; i++) {
      if (i < period - 1) {
        results.push(NaN);
        continue;
      }
      
      let mfvSum = 0;
      let volumeSum = 0;
      
      for (let j = 0; j < period; j++) {
        const candle = candles[i - j];
        const hl = candle.high - candle.low;
        const mfm = hl === 0 ? 0 : ((candle.close - candle.low) - (candle.high - candle.close)) / hl;
        mfvSum += mfm * candle.volume;
        volumeSum += candle.volume;
      }
      
      results.push(volumeSum === 0 ? 0 : mfvSum / volumeSum);
    }
    
    return results;
  }

  // ============================================
  // SUPPORT & RESISTANCE
  // ============================================

  /**
   * Find support and resistance levels
   */
  findSupportResistance(candles: OHLCV[], lookback: number = 100): SupportResistanceLevel[] {
    const levels: SupportResistanceLevel[] = [];
    const recentCandles = candles.slice(-lookback);
    
    if (recentCandles.length < 10) return levels;
    
    // Find local highs and lows
    for (let i = 2; i < recentCandles.length - 2; i++) {
      const candle = recentCandles[i];
      
      // Local high
      if (candle.high > recentCandles[i - 1].high &&
          candle.high > recentCandles[i - 2].high &&
          candle.high > recentCandles[i + 1].high &&
          candle.high > recentCandles[i + 2].high) {
        this.addOrUpdateLevel(levels, candle.high, 'resistance', candle.timestamp);
      }
      
      // Local low
      if (candle.low < recentCandles[i - 1].low &&
          candle.low < recentCandles[i - 2].low &&
          candle.low < recentCandles[i + 1].low &&
          candle.low < recentCandles[i + 2].low) {
        this.addOrUpdateLevel(levels, candle.low, 'support', candle.timestamp);
      }
    }
    
    // Sort by strength
    levels.sort((a, b) => b.strength - a.strength);
    
    return levels.slice(0, 10); // Top 10 levels
  }

  private addOrUpdateLevel(
    levels: SupportResistanceLevel[],
    price: number,
    type: 'support' | 'resistance',
    timestamp: number
  ): void {
    const tolerance = price * 0.005; // 0.5% tolerance
    
    const existing = levels.find(l => 
      l.type === type && Math.abs(l.price - price) < tolerance
    );
    
    if (existing) {
      existing.touches++;
      existing.lastTouched = timestamp;
      existing.strength = Math.min(1, existing.strength + 0.1);
    } else {
      levels.push({
        price,
        type,
        strength: 0.3,
        touches: 1,
        lastTouched: timestamp,
        broken: false,
      });
    }
  }

  /**
   * Calculate Fibonacci Retracement Levels
   */
  calculateFibonacci(
    high: number,
    low: number,
    direction: 'retracement' | 'extension',
    currentPrice?: number
  ): FibonacciLevels {
    const range = high - low;
    const fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
    const extLevels = [1.0, 1.272, 1.414, 1.618, 2.0, 2.618];
    
    const levels = direction === 'retracement' ? fibLevels : extLevels;

    const levelsWithPrices = levels.map(level => ({
      level,
      price: direction === 'retracement' ? high - range * level : low + range * level,
      label: `${(level * 100).toFixed(1)}%`,
    }));

    const priceForLevel = typeof currentPrice === 'number' && Number.isFinite(currentPrice)
      ? currentPrice
      : (high + low) / 2;

    const nearest = levelsWithPrices.reduce((best, candidate) => {
      const bestDist = Math.abs(best.price - priceForLevel);
      const candDist = Math.abs(candidate.price - priceForLevel);
      return candDist < bestDist ? candidate : best;
    }, levelsWithPrices[0]);

    return {
      high,
      low,
      direction,
      levels: levelsWithPrices,
      currentLevel: nearest.level,
    };
  }

  /**
   * Calculate Pivot Points
   */
  calculatePivotPoints(
    high: number,
    low: number,
    close: number,
    type: 'standard' | 'fibonacci' | 'woodie' | 'camarilla' = 'standard'
  ): PivotPoints {
    let pp: number, r1: number, r2: number, r3: number, s1: number, s2: number, s3: number;
    
    switch (type) {
      case 'fibonacci':
        pp = (high + low + close) / 3;
        const range = high - low;
        r1 = pp + (range * 0.382);
        r2 = pp + (range * 0.618);
        r3 = pp + range;
        s1 = pp - (range * 0.382);
        s2 = pp - (range * 0.618);
        s3 = pp - range;
        break;
        
      case 'woodie':
        pp = (high + low + 2 * close) / 4;
        r1 = 2 * pp - low;
        r2 = pp + (high - low);
        r3 = r1 + (high - low);
        s1 = 2 * pp - high;
        s2 = pp - (high - low);
        s3 = s1 - (high - low);
        break;
        
      case 'camarilla':
        pp = (high + low + close) / 3;
        const camaRange = high - low;
        r1 = close + (camaRange * 1.1 / 12);
        r2 = close + (camaRange * 1.1 / 6);
        r3 = close + (camaRange * 1.1 / 4);
        s1 = close - (camaRange * 1.1 / 12);
        s2 = close - (camaRange * 1.1 / 6);
        s3 = close - (camaRange * 1.1 / 4);
        break;
        
      default: // standard
        pp = (high + low + close) / 3;
        r1 = 2 * pp - low;
        r2 = pp + (high - low);
        r3 = high + 2 * (pp - low);
        s1 = 2 * pp - high;
        s2 = pp - (high - low);
        s3 = low - 2 * (high - pp);
    }
    
    return { pp, r1, r2, r3, s1, s2, s3, type };
  }

  // ============================================
  // COMPREHENSIVE ANALYSIS
  // ============================================

  /**
   * Generate comprehensive indicator analysis
   */
  generateComprehensiveAnalysis(symbol: string, currentQuote: Quote): ComprehensiveIndicators | null {
    const candles = this.priceHistory.get(symbol);
    if (!candles || candles.length < 200) {
      return null;
    }
    
    const closes = candles.map(c => c.close);
    
    // Calculate all indicators
    const sma20 = this.calculateSMA(closes, 20);
    const sma50 = this.calculateSMA(closes, 50);
    const sma200 = this.calculateSMA(closes, 200);
    const ema9 = this.calculateEMA(closes, 9);
    const ema21 = this.calculateEMA(closes, 21);
    const ema55 = this.calculateEMA(closes, 55);
    
    const rsi14 = this.calculateRSI(closes, 14);
    const macd = this.calculateMACD(closes);
    const stochastic = this.calculateStochastic(candles);
    const cci = this.calculateCCI(candles);
    const williams = this.calculateWilliamsR(candles);
    
    const atr14 = this.calculateATR(candles);
    const bb = this.calculateBollingerBands(closes);
    const adx = this.calculateADX(candles);
    const ichimoku = this.calculateIchimoku(candles);
    
    const obv = this.calculateOBV(candles);
    const mfi = this.calculateMFI(candles);
    const cmf = this.calculateCMF(candles);
    const vwap = this.calculateVWAP(candles);
    
    const sr = this.findSupportResistance(candles);
    const lastCandle = candles[candles.length - 1];
    const fib = this.calculateFibonacci(
      Math.max(...candles.slice(-50).map(c => c.high)),
      Math.min(...candles.slice(-50).map(c => c.low)),
      'retracement',
      currentQuote.last
    );
    const pivots = this.calculatePivotPoints(lastCandle.high, lastCandle.low, lastCandle.close);
    
    const last = candles.length - 1;
    
    // Build moving average results
    const buildMAResult = (
      values: number[],
      period: number,
      type: 'sma' | 'ema'
    ): MovingAverageResult => {
      const value = values[last];
      const prevValue = values[last - 1] || value;
      const trend = value > prevValue ? 'up' : value < prevValue ? 'down' : 'flat';
      const signal = currentQuote.last > value ? 'buy' : currentQuote.last < value ? 'sell' : 'neutral';
      
      return {
        name: `${type.toUpperCase()}${period}`,
        value,
        signal,
        strength: Math.abs(currentQuote.last - value) / value,
        period,
        type,
        trend,
      };
    };
    
    // Calculate overall signal
    let buySignals = 0;
    let sellSignals = 0;
    const totalSignals = 10;
    
    if (rsi14[last].signal === 'oversold') buySignals++;
    if (rsi14[last].signal === 'overbought') sellSignals++;
    if (macd[last].trend === 'bullish') buySignals++;
    if (macd[last].trend === 'bearish') sellSignals++;
    if (stochastic[last].signal === 'oversold') buySignals++;
    if (stochastic[last].signal === 'overbought') sellSignals++;
    if (currentQuote.last > sma200[last]) buySignals++;
    if (currentQuote.last < sma200[last]) sellSignals++;
    if (adx[last].direction === 'bullish') buySignals++;
    if (adx[last].direction === 'bearish') sellSignals++;
    
    let overallSignal: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell' = 'neutral';
    if (buySignals >= 8) overallSignal = 'strong_buy';
    else if (buySignals >= 6) overallSignal = 'buy';
    else if (sellSignals >= 8) overallSignal = 'strong_sell';
    else if (sellSignals >= 6) overallSignal = 'sell';
    
    const avgVolume = candles.slice(-20).reduce((s, c) => s + c.volume, 0) / 20;
    
    return {
      timestamp: Date.now(),
      price: currentQuote,
      
      sma20: buildMAResult(sma20, 20, 'sma'),
      sma50: buildMAResult(sma50, 50, 'sma'),
      sma200: buildMAResult(sma200, 200, 'sma'),
      ema9: buildMAResult(ema9, 9, 'ema'),
      ema21: buildMAResult(ema21, 21, 'ema'),
      ema55: buildMAResult(ema55, 55, 'ema'),
      
      rsi14: rsi14[last],
      macd: macd[last],
      stochastic: stochastic[last],
      cci: {
        name: 'CCI',
        value: cci[last],
        signal: cci[last] > 100 ? 'sell' : cci[last] < -100 ? 'buy' : 'neutral',
        strength: Math.abs(cci[last]) / 200,
      },
      williams: {
        name: 'Williams %R',
        value: williams[last],
        signal: williams[last] < -80 ? 'buy' : williams[last] > -20 ? 'sell' : 'neutral',
        strength: Math.abs(williams[last]) / 100,
      },
      momentum: {
        name: 'Momentum',
        value: closes[last] - closes[last - 10],
        signal: closes[last] > closes[last - 10] ? 'buy' : 'sell',
        strength: Math.abs(closes[last] - closes[last - 10]) / closes[last - 10],
      },
      
      atr14: atr14[last],
      bollingerBands: bb[last],
      keltnerChannel: {
        upper: ema21[last] + (atr14[last].value * 2),
        middle: ema21[last],
        lower: ema21[last] - (atr14[last].value * 2),
      },
      
      adx: adx[last],
      ichimoku: ichimoku[last],
      
      volume: {
        current: lastCandle.volume,
        average: avgVolume,
        ratio: lastCandle.volume / avgVolume,
        trend: lastCandle.volume > avgVolume * 1.2 ? 'increasing' : 
               lastCandle.volume < avgVolume * 0.8 ? 'decreasing' : 'stable',
        obv: obv[last],
        obvTrend: obv[last] > obv[last - 1] ? 'bullish' : 'bearish',
        vwap: vwap[last],
        priceVsVwap: currentQuote.last > vwap[last] ? 'above' : 
                     currentQuote.last < vwap[last] ? 'below' : 'at',
        cmf: cmf[last],
        mfi: mfi[last],
      },
      
      supportResistance: sr,
      fibonacci: fib,
      pivotPoints: pivots,
      
      overallSignal,
      signalStrength: Math.max(buySignals, sellSignals) / totalSignals,
      confidence: adx[last].adx > 25 ? 0.8 : 0.5, // Higher confidence in strong trends
    };
  }
}

// Export singleton
export const technicalIndicators = new TechnicalIndicatorsEngine();
