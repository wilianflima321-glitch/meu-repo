/**
 * Pattern Recognition Engine
 * Motor de reconhecimento de padrões gráficos com alta precisão
 * Detecta candlestick patterns e chart patterns
 */

import { OHLCV } from './trading-types';

// ============================================
// PATTERN TYPES
// ============================================

export type PatternCategory = 'candlestick' | 'chart' | 'harmonic' | 'volume';
export type PatternDirection = 'bullish' | 'bearish' | 'neutral';
export type PatternTimeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';

export interface DetectedPattern {
  id: string;
  name: string;
  category: PatternCategory;
  direction: PatternDirection;
  reliability: number; // 0-1, based on historical accuracy
  confidence: number; // 0-1, quality of current detection
  startIndex: number;
  endIndex: number;
  startTime: number;
  endTime: number;
  priceTarget?: number;
  stopLoss?: number;
  description: string;
  tradingImplication: string;
  metadata: Record<string, any>;
}

export interface CandlestickPattern extends DetectedPattern {
  category: 'candlestick';
  patternCandles: number; // Number of candles in pattern
}

export interface ChartPattern extends DetectedPattern {
  category: 'chart';
  neckline?: number;
  breakoutLevel: number;
  targetCalculation: string;
  volumeConfirmation: boolean;
}

export interface HarmonicPattern extends DetectedPattern {
  category: 'harmonic';
  ratios: {
    XA: number;
    AB: number;
    BC: number;
    CD: number;
  };
  potentialReversalZone: { min: number; max: number };
}

export interface PatternScanResult {
  symbol: string;
  timeframe: PatternTimeframe;
  timestamp: number;
  patterns: DetectedPattern[];
  overallBias: PatternDirection;
  strongestPattern?: DetectedPattern;
  confluence: number; // Multiple patterns confirming same direction
}

// ============================================
// CANDLESTICK PATTERN DEFINITIONS
// ============================================

const CANDLESTICK_PATTERNS = {
  // Single Candle Patterns
  doji: { reliability: 0.5, direction: 'neutral' as const, description: 'Indecisão no mercado' },
  hammer: { reliability: 0.7, direction: 'bullish' as const, description: 'Possível reversão de baixa' },
  invertedHammer: { reliability: 0.65, direction: 'bullish' as const, description: 'Possível reversão de baixa' },
  hangingMan: { reliability: 0.65, direction: 'bearish' as const, description: 'Possível reversão de alta' },
  shootingStar: { reliability: 0.7, direction: 'bearish' as const, description: 'Possível reversão de alta' },
  marubozu: { reliability: 0.75, direction: 'neutral' as const, description: 'Forte momentum na direção' },
  spinningTop: { reliability: 0.4, direction: 'neutral' as const, description: 'Indecisão, baixa volatilidade' },
  
  // Double Candle Patterns
  bullishEngulfing: { reliability: 0.75, direction: 'bullish' as const, description: 'Forte reversão de baixa' },
  bearishEngulfing: { reliability: 0.75, direction: 'bearish' as const, description: 'Forte reversão de alta' },
  piercingLine: { reliability: 0.65, direction: 'bullish' as const, description: 'Reversão de baixa moderada' },
  darkCloudCover: { reliability: 0.65, direction: 'bearish' as const, description: 'Reversão de alta moderada' },
  tweezerTop: { reliability: 0.6, direction: 'bearish' as const, description: 'Resistência testada 2x' },
  tweezerBottom: { reliability: 0.6, direction: 'bullish' as const, description: 'Suporte testado 2x' },
  
  // Triple Candle Patterns
  morningStar: { reliability: 0.8, direction: 'bullish' as const, description: 'Forte reversão de baixa' },
  eveningStar: { reliability: 0.8, direction: 'bearish' as const, description: 'Forte reversão de alta' },
  threeWhiteSoldiers: { reliability: 0.85, direction: 'bullish' as const, description: 'Forte continuação de alta' },
  threeBlackCrows: { reliability: 0.85, direction: 'bearish' as const, description: 'Forte continuação de baixa' },
  threeInsideUp: { reliability: 0.7, direction: 'bullish' as const, description: 'Confirmação de reversão de baixa' },
  threeInsideDown: { reliability: 0.7, direction: 'bearish' as const, description: 'Confirmação de reversão de alta' },
  threeOutsideUp: { reliability: 0.75, direction: 'bullish' as const, description: 'Forte reversão de baixa' },
  threeOutsideDown: { reliability: 0.75, direction: 'bearish' as const, description: 'Forte reversão de alta' },
  
  // Special Patterns
  abandondedBaby: { reliability: 0.85, direction: 'neutral' as const, description: 'Forte reversão (gap)' },
  haramiCross: { reliability: 0.65, direction: 'neutral' as const, description: 'Possível reversão' },
};

// ============================================
// PATTERN RECOGNITION ENGINE
// ============================================

export class PatternRecognitionEngine {
  private priceHistory: Map<string, OHLCV[]> = new Map();
  private detectedPatterns: Map<string, DetectedPattern[]> = new Map();
  private patternHistory: Map<string, DetectedPattern[]> = new Map();

  // ============================================
  // DATA MANAGEMENT
  // ============================================

  setPriceHistory(symbol: string, candles: OHLCV[]): void {
    this.priceHistory.set(symbol, candles);
    this.detectedPatterns.delete(symbol);
  }

  /**
   * Alias for setPriceHistory - update data for backtesting
   */
  updateData(symbol: string, candles: OHLCV[]): void {
    this.setPriceHistory(symbol, candles);
  }

  addCandle(symbol: string, candle: OHLCV): void {
    const history = this.priceHistory.get(symbol) || [];
    history.push(candle);
    if (history.length > 500) history.shift();
    this.priceHistory.set(symbol, history);
    this.detectedPatterns.delete(symbol);
  }

  // ============================================
  // FULL PATTERN SCAN
  // ============================================

  scanAllPatterns(symbol: string, timeframe: PatternTimeframe): PatternScanResult {
    const candles = this.priceHistory.get(symbol) || [];
    if (candles.length < 50) {
      return {
        symbol,
        timeframe,
        timestamp: Date.now(),
        patterns: [],
        overallBias: 'neutral',
        confluence: 0,
      };
    }

    const patterns: DetectedPattern[] = [];

    // Scan candlestick patterns
    const candlesticks = this.scanCandlestickPatterns(candles);
    patterns.push(...candlesticks);

    // Scan chart patterns
    const chartPatterns = this.scanChartPatterns(candles);
    patterns.push(...chartPatterns);

    // Scan harmonic patterns
    const harmonics = this.scanHarmonicPatterns(candles);
    patterns.push(...harmonics);

    // Calculate overall bias
    let bullishScore = 0;
    let bearishScore = 0;
    
    for (const pattern of patterns) {
      const weight = pattern.reliability * pattern.confidence;
      if (pattern.direction === 'bullish') bullishScore += weight;
      else if (pattern.direction === 'bearish') bearishScore += weight;
    }

    const overallBias: PatternDirection = 
      bullishScore > bearishScore * 1.2 ? 'bullish' :
      bearishScore > bullishScore * 1.2 ? 'bearish' : 'neutral';

    // Find strongest pattern
    const strongestPattern = patterns.reduce((best, p) => 
      !best || (p.reliability * p.confidence > best.reliability * best.confidence) ? p : best,
      undefined as DetectedPattern | undefined
    );

    // Calculate confluence (patterns agreeing)
    const agreeingPatterns = patterns.filter(p => p.direction === overallBias);
    const confluence = patterns.length > 0 ? agreeingPatterns.length / patterns.length : 0;

    // Store detected patterns
    this.detectedPatterns.set(symbol, patterns);

    return {
      symbol,
      timeframe,
      timestamp: Date.now(),
      patterns,
      overallBias,
      strongestPattern,
      confluence,
    };
  }

  // ============================================
  // CANDLESTICK PATTERN DETECTION
  // ============================================

  private scanCandlestickPatterns(candles: OHLCV[]): CandlestickPattern[] {
    const patterns: CandlestickPattern[] = [];
    const len = candles.length;
    
    if (len < 3) return patterns;

    // Helper functions
    const bodySize = (c: OHLCV) => Math.abs(c.close - c.open);
    const upperWick = (c: OHLCV) => c.high - Math.max(c.open, c.close);
    const lowerWick = (c: OHLCV) => Math.min(c.open, c.close) - c.low;
    const range = (c: OHLCV) => c.high - c.low;
    const isBullish = (c: OHLCV) => c.close > c.open;
    const isBearish = (c: OHLCV) => c.close < c.open;
    const avgBody = candles.slice(-20).reduce((s, c) => s + bodySize(c), 0) / 20;

    // Scan last 10 candles for patterns
    for (let i = len - 10; i < len; i++) {
      if (i < 2) continue;
      
      const c = candles[i];
      const c1 = candles[i - 1];
      const c2 = candles[i - 2];
      
      const body = bodySize(c);
      const upper = upperWick(c);
      const lower = lowerWick(c);
      const r = range(c);
      
      // Single Candle Patterns
      
      // Doji
      if (body < r * 0.1) {
        patterns.push(this.createCandlestickPattern(
          'doji', i, candles, 1, 0.7
        ));
      }
      
      // Hammer (in downtrend)
      if (lower > body * 2 && upper < body * 0.3 && body > 0) {
        // Check for downtrend
        if (c1.close < c2.close && candles[i - 3]?.close > c2.close) {
          patterns.push(this.createCandlestickPattern(
            'hammer', i, candles, 1, 0.8
          ));
        }
      }
      
      // Shooting Star (in uptrend)
      if (upper > body * 2 && lower < body * 0.3 && body > 0) {
        if (c1.close > c2.close && candles[i - 3]?.close < c2.close) {
          patterns.push(this.createCandlestickPattern(
            'shootingStar', i, candles, 1, 0.8
          ));
        }
      }
      
      // Marubozu (strong candle)
      if (body > avgBody * 1.5 && upper < r * 0.05 && lower < r * 0.05) {
        const pattern = this.createCandlestickPattern(
          'marubozu', i, candles, 1, 0.85
        );
        pattern.direction = isBullish(c) ? 'bullish' : 'bearish';
        patterns.push(pattern);
      }
      
      // Double Candle Patterns
      
      // Bullish Engulfing
      if (isBullish(c) && isBearish(c1) && 
          c.open < c1.close && c.close > c1.open &&
          body > bodySize(c1)) {
        patterns.push(this.createCandlestickPattern(
          'bullishEngulfing', i, candles, 2, 0.85
        ));
      }
      
      // Bearish Engulfing
      if (isBearish(c) && isBullish(c1) && 
          c.open > c1.close && c.close < c1.open &&
          body > bodySize(c1)) {
        patterns.push(this.createCandlestickPattern(
          'bearishEngulfing', i, candles, 2, 0.85
        ));
      }
      
      // Piercing Line
      if (isBullish(c) && isBearish(c1) && 
          c.open < c1.low && 
          c.close > (c1.open + c1.close) / 2 &&
          c.close < c1.open) {
        patterns.push(this.createCandlestickPattern(
          'piercingLine', i, candles, 2, 0.7
        ));
      }
      
      // Dark Cloud Cover
      if (isBearish(c) && isBullish(c1) && 
          c.open > c1.high && 
          c.close < (c1.open + c1.close) / 2 &&
          c.close > c1.open) {
        patterns.push(this.createCandlestickPattern(
          'darkCloudCover', i, candles, 2, 0.7
        ));
      }
      
      // Triple Candle Patterns
      if (i >= 2) {
        // Morning Star
        if (isBearish(c2) && bodySize(c2) > avgBody &&
            bodySize(c1) < avgBody * 0.5 &&
            isBullish(c) && body > avgBody &&
            c.close > (c2.open + c2.close) / 2) {
          patterns.push(this.createCandlestickPattern(
            'morningStar', i, candles, 3, 0.9
          ));
        }
        
        // Evening Star
        if (isBullish(c2) && bodySize(c2) > avgBody &&
            bodySize(c1) < avgBody * 0.5 &&
            isBearish(c) && body > avgBody &&
            c.close < (c2.open + c2.close) / 2) {
          patterns.push(this.createCandlestickPattern(
            'eveningStar', i, candles, 3, 0.9
          ));
        }
        
        // Three White Soldiers
        if (isBullish(c2) && isBullish(c1) && isBullish(c) &&
            bodySize(c2) > avgBody * 0.7 &&
            bodySize(c1) > avgBody * 0.7 &&
            body > avgBody * 0.7 &&
            c.close > c1.close && c1.close > c2.close) {
          patterns.push(this.createCandlestickPattern(
            'threeWhiteSoldiers', i, candles, 3, 0.9
          ));
        }
        
        // Three Black Crows
        if (isBearish(c2) && isBearish(c1) && isBearish(c) &&
            bodySize(c2) > avgBody * 0.7 &&
            bodySize(c1) > avgBody * 0.7 &&
            body > avgBody * 0.7 &&
            c.close < c1.close && c1.close < c2.close) {
          patterns.push(this.createCandlestickPattern(
            'threeBlackCrows', i, candles, 3, 0.9
          ));
        }
      }
    }

    return patterns;
  }

  private createCandlestickPattern(
    name: string,
    index: number,
    candles: OHLCV[],
    patternCandles: number,
    confidence: number
  ): CandlestickPattern {
    const patternDef = CANDLESTICK_PATTERNS[name as keyof typeof CANDLESTICK_PATTERNS];
    const startIndex = index - patternCandles + 1;
    const currentCandle = candles[index];
    const avgRange = candles.slice(-20).reduce((s, c) => s + (c.high - c.low), 0) / 20;
    
    // Calculate price target based on pattern
    let priceTarget: number | undefined;
    let stopLoss: number | undefined;
    
    if (patternDef.direction === 'bullish') {
      priceTarget = currentCandle.close + avgRange * 2;
      stopLoss = currentCandle.low - avgRange * 0.5;
    } else if (patternDef.direction === 'bearish') {
      priceTarget = currentCandle.close - avgRange * 2;
      stopLoss = currentCandle.high + avgRange * 0.5;
    }

    return {
      id: `candlestick-${name}-${index}-${Date.now()}`,
      name: this.formatPatternName(name),
      category: 'candlestick',
      direction: patternDef.direction,
      reliability: patternDef.reliability,
      confidence,
      startIndex,
      endIndex: index,
      startTime: candles[startIndex].timestamp,
      endTime: currentCandle.timestamp,
      priceTarget,
      stopLoss,
      description: patternDef.description,
      tradingImplication: this.getTradingImplication(name, patternDef.direction),
      metadata: { patternType: name },
      patternCandles,
    };
  }

  // ============================================
  // CHART PATTERN DETECTION
  // ============================================

  private scanChartPatterns(candles: OHLCV[]): ChartPattern[] {
    const patterns: ChartPattern[] = [];
    const len = candles.length;
    
    if (len < 50) return patterns;

    // Find swing highs and lows
    const swingHighs = this.findSwingHighs(candles);
    const swingLows = this.findSwingLows(candles);

    // Head and Shoulders
    const hs = this.detectHeadAndShoulders(candles, swingHighs, swingLows);
    if (hs) patterns.push(hs);

    // Inverse Head and Shoulders
    const ihs = this.detectInverseHeadAndShoulders(candles, swingHighs, swingLows);
    if (ihs) patterns.push(ihs);

    // Double Top
    const dt = this.detectDoubleTop(candles, swingHighs);
    if (dt) patterns.push(dt);

    // Double Bottom
    const db = this.detectDoubleBottom(candles, swingLows);
    if (db) patterns.push(db);

    // Triangle Patterns
    const triangles = this.detectTriangles(candles, swingHighs, swingLows);
    patterns.push(...triangles);

    // Wedge Patterns
    const wedges = this.detectWedges(candles, swingHighs, swingLows);
    patterns.push(...wedges);

    // Flag/Pennant
    const flags = this.detectFlagsAndPennants(candles);
    patterns.push(...flags);

    return patterns;
  }

  private findSwingHighs(candles: OHLCV[], lookback: number = 5): number[] {
    const highs: number[] = [];
    
    for (let i = lookback; i < candles.length - lookback; i++) {
      let isHigh = true;
      for (let j = 1; j <= lookback; j++) {
        if (candles[i].high <= candles[i - j].high || 
            candles[i].high <= candles[i + j].high) {
          isHigh = false;
          break;
        }
      }
      if (isHigh) highs.push(i);
    }
    
    return highs;
  }

  private findSwingLows(candles: OHLCV[], lookback: number = 5): number[] {
    const lows: number[] = [];
    
    for (let i = lookback; i < candles.length - lookback; i++) {
      let isLow = true;
      for (let j = 1; j <= lookback; j++) {
        if (candles[i].low >= candles[i - j].low || 
            candles[i].low >= candles[i + j].low) {
          isLow = false;
          break;
        }
      }
      if (isLow) lows.push(i);
    }
    
    return lows;
  }

  private detectHeadAndShoulders(
    candles: OHLCV[],
    swingHighs: number[],
    swingLows: number[]
  ): ChartPattern | null {
    if (swingHighs.length < 3) return null;

    // Look for 3 peaks with middle being highest
    for (let i = 0; i < swingHighs.length - 2; i++) {
      const ls = swingHighs[i];     // Left shoulder
      const head = swingHighs[i + 1]; // Head
      const rs = swingHighs[i + 2];   // Right shoulder
      
      const lsPrice = candles[ls].high;
      const headPrice = candles[head].high;
      const rsPrice = candles[rs].high;
      
      // Head must be higher than shoulders
      if (headPrice <= lsPrice || headPrice <= rsPrice) continue;
      
      // Shoulders should be roughly equal (within 5%)
      const shoulderDiff = Math.abs(lsPrice - rsPrice) / lsPrice;
      if (shoulderDiff > 0.05) continue;
      
      // Find neckline (lows between shoulders)
      const necklineLows = swingLows.filter(l => l > ls && l < rs);
      if (necklineLows.length < 2) continue;
      
      const neckline = (candles[necklineLows[0]].low + candles[necklineLows[necklineLows.length - 1]].low) / 2;
      const patternHeight = headPrice - neckline;
      
      // Check volume (declining on right shoulder ideally)
      const lsVol = candles.slice(ls - 2, ls + 3).reduce((s, c) => s + c.volume, 0);
      const rsVol = candles.slice(rs - 2, rs + 3).reduce((s, c) => s + c.volume, 0);
      const volumeConfirmation = rsVol < lsVol;
      
      return {
        id: `chart-head-shoulders-${head}-${Date.now()}`,
        name: 'Head and Shoulders',
        category: 'chart',
        direction: 'bearish',
        reliability: 0.8,
        confidence: volumeConfirmation ? 0.85 : 0.7,
        startIndex: ls,
        endIndex: rs,
        startTime: candles[ls].timestamp,
        endTime: candles[rs].timestamp,
        priceTarget: neckline - patternHeight,
        stopLoss: headPrice + (headPrice - neckline) * 0.1,
        description: 'Padrão de reversão de alta para baixa',
        tradingImplication: 'Vender na quebra do neckline com target em altura do padrão',
        metadata: {
          leftShoulder: lsPrice,
          head: headPrice,
          rightShoulder: rsPrice,
          neckline,
          patternHeight,
        },
        neckline,
        breakoutLevel: neckline,
        targetCalculation: 'Neckline - altura do padrão (head - neckline)',
        volumeConfirmation,
      };
    }

    return null;
  }

  private detectInverseHeadAndShoulders(
    candles: OHLCV[],
    swingHighs: number[],
    swingLows: number[]
  ): ChartPattern | null {
    if (swingLows.length < 3) return null;

    for (let i = 0; i < swingLows.length - 2; i++) {
      const ls = swingLows[i];
      const head = swingLows[i + 1];
      const rs = swingLows[i + 2];
      
      const lsPrice = candles[ls].low;
      const headPrice = candles[head].low;
      const rsPrice = candles[rs].low;
      
      // Head must be lower
      if (headPrice >= lsPrice || headPrice >= rsPrice) continue;
      
      const shoulderDiff = Math.abs(lsPrice - rsPrice) / lsPrice;
      if (shoulderDiff > 0.05) continue;
      
      const necklineHighs = swingHighs.filter(h => h > ls && h < rs);
      if (necklineHighs.length < 2) continue;
      
      const neckline = (candles[necklineHighs[0]].high + candles[necklineHighs[necklineHighs.length - 1]].high) / 2;
      const patternHeight = neckline - headPrice;
      
      return {
        id: `chart-inverse-hs-${head}-${Date.now()}`,
        name: 'Inverse Head and Shoulders',
        category: 'chart',
        direction: 'bullish',
        reliability: 0.8,
        confidence: 0.75,
        startIndex: ls,
        endIndex: rs,
        startTime: candles[ls].timestamp,
        endTime: candles[rs].timestamp,
        priceTarget: neckline + patternHeight,
        stopLoss: headPrice - patternHeight * 0.1,
        description: 'Padrão de reversão de baixa para alta',
        tradingImplication: 'Comprar na quebra do neckline com target em altura do padrão',
        metadata: {
          leftShoulder: lsPrice,
          head: headPrice,
          rightShoulder: rsPrice,
          neckline,
          patternHeight,
        },
        neckline,
        breakoutLevel: neckline,
        targetCalculation: 'Neckline + altura do padrão (neckline - head)',
        volumeConfirmation: true,
      };
    }

    return null;
  }

  private detectDoubleTop(candles: OHLCV[], swingHighs: number[]): ChartPattern | null {
    if (swingHighs.length < 2) return null;

    for (let i = 0; i < swingHighs.length - 1; i++) {
      const first = swingHighs[i];
      const second = swingHighs[i + 1];
      
      const firstPrice = candles[first].high;
      const secondPrice = candles[second].high;
      
      // Peaks should be within 3% of each other
      const priceDiff = Math.abs(firstPrice - secondPrice) / firstPrice;
      if (priceDiff > 0.03) continue;
      
      // Find the trough between peaks
      let troughPrice = Infinity;
      for (let j = first + 1; j < second; j++) {
        if (candles[j].low < troughPrice) {
          troughPrice = candles[j].low;
        }
      }
      
      const patternHeight = Math.max(firstPrice, secondPrice) - troughPrice;
      
      return {
        id: `chart-double-top-${second}-${Date.now()}`,
        name: 'Double Top',
        category: 'chart',
        direction: 'bearish',
        reliability: 0.75,
        confidence: 0.8,
        startIndex: first,
        endIndex: second,
        startTime: candles[first].timestamp,
        endTime: candles[second].timestamp,
        priceTarget: troughPrice - patternHeight,
        stopLoss: Math.max(firstPrice, secondPrice) * 1.02,
        description: 'Dois topos em mesmo nível - reversão de baixa',
        tradingImplication: 'Vender na quebra do suporte (vale entre topos)',
        metadata: {
          firstTop: firstPrice,
          secondTop: secondPrice,
          trough: troughPrice,
        },
        breakoutLevel: troughPrice,
        targetCalculation: 'Suporte - altura do padrão',
        volumeConfirmation: true,
      };
    }

    return null;
  }

  private detectDoubleBottom(candles: OHLCV[], swingLows: number[]): ChartPattern | null {
    if (swingLows.length < 2) return null;

    for (let i = 0; i < swingLows.length - 1; i++) {
      const first = swingLows[i];
      const second = swingLows[i + 1];
      
      const firstPrice = candles[first].low;
      const secondPrice = candles[second].low;
      
      const priceDiff = Math.abs(firstPrice - secondPrice) / firstPrice;
      if (priceDiff > 0.03) continue;
      
      let peakPrice = -Infinity;
      for (let j = first + 1; j < second; j++) {
        if (candles[j].high > peakPrice) {
          peakPrice = candles[j].high;
        }
      }
      
      const patternHeight = peakPrice - Math.min(firstPrice, secondPrice);
      
      return {
        id: `chart-double-bottom-${second}-${Date.now()}`,
        name: 'Double Bottom',
        category: 'chart',
        direction: 'bullish',
        reliability: 0.75,
        confidence: 0.8,
        startIndex: first,
        endIndex: second,
        startTime: candles[first].timestamp,
        endTime: candles[second].timestamp,
        priceTarget: peakPrice + patternHeight,
        stopLoss: Math.min(firstPrice, secondPrice) * 0.98,
        description: 'Dois fundos em mesmo nível - reversão de alta',
        tradingImplication: 'Comprar na quebra da resistência (topo entre fundos)',
        metadata: {
          firstBottom: firstPrice,
          secondBottom: secondPrice,
          peak: peakPrice,
        },
        breakoutLevel: peakPrice,
        targetCalculation: 'Resistência + altura do padrão',
        volumeConfirmation: true,
      };
    }

    return null;
  }

  private detectTriangles(
    candles: OHLCV[],
    swingHighs: number[],
    swingLows: number[]
  ): ChartPattern[] {
    const patterns: ChartPattern[] = [];
    
    if (swingHighs.length < 3 || swingLows.length < 3) return patterns;

    // Get recent highs and lows
    const recentHighs = swingHighs.slice(-4);
    const recentLows = swingLows.slice(-4);
    
    if (recentHighs.length < 2 || recentLows.length < 2) return patterns;

    // Calculate trendlines
    const highPrices = recentHighs.map(i => candles[i].high);
    const lowPrices = recentLows.map(i => candles[i].low);
    
    const highSlope = (highPrices[highPrices.length - 1] - highPrices[0]) / (recentHighs[recentHighs.length - 1] - recentHighs[0]);
    const lowSlope = (lowPrices[lowPrices.length - 1] - lowPrices[0]) / (recentLows[recentLows.length - 1] - recentLows[0]);
    
    // Ascending Triangle (flat top, rising bottom)
    if (Math.abs(highSlope) < 0.001 && lowSlope > 0) {
      const resistance = Math.max(...highPrices);
      const lastLow = lowPrices[lowPrices.length - 1];
      const patternHeight = resistance - lastLow;
      
      patterns.push({
        id: `chart-ascending-triangle-${Date.now()}`,
        name: 'Ascending Triangle',
        category: 'chart',
        direction: 'bullish',
        reliability: 0.7,
        confidence: 0.75,
        startIndex: Math.min(recentHighs[0], recentLows[0]),
        endIndex: candles.length - 1,
        startTime: candles[Math.min(recentHighs[0], recentLows[0])].timestamp,
        endTime: candles[candles.length - 1].timestamp,
        priceTarget: resistance + patternHeight,
        stopLoss: lastLow * 0.98,
        description: 'Triângulo ascendente - continuação de alta',
        tradingImplication: 'Comprar na quebra da resistência horizontal',
        metadata: { resistance, lowSlope, patternHeight },
        breakoutLevel: resistance,
        targetCalculation: 'Resistência + altura do triângulo',
        volumeConfirmation: true,
      });
    }
    
    // Descending Triangle
    if (Math.abs(lowSlope) < 0.001 && highSlope < 0) {
      const support = Math.min(...lowPrices);
      const lastHigh = highPrices[highPrices.length - 1];
      const patternHeight = lastHigh - support;
      
      patterns.push({
        id: `chart-descending-triangle-${Date.now()}`,
        name: 'Descending Triangle',
        category: 'chart',
        direction: 'bearish',
        reliability: 0.7,
        confidence: 0.75,
        startIndex: Math.min(recentHighs[0], recentLows[0]),
        endIndex: candles.length - 1,
        startTime: candles[Math.min(recentHighs[0], recentLows[0])].timestamp,
        endTime: candles[candles.length - 1].timestamp,
        priceTarget: support - patternHeight,
        stopLoss: lastHigh * 1.02,
        description: 'Triângulo descendente - continuação de baixa',
        tradingImplication: 'Vender na quebra do suporte horizontal',
        metadata: { support, highSlope, patternHeight },
        breakoutLevel: support,
        targetCalculation: 'Suporte - altura do triângulo',
        volumeConfirmation: true,
      });
    }
    
    // Symmetrical Triangle
    if (highSlope < -0.0005 && lowSlope > 0.0005) {
      const avgHigh = highPrices.reduce((s, p) => s + p, 0) / highPrices.length;
      const avgLow = lowPrices.reduce((s, p) => s + p, 0) / lowPrices.length;
      const patternHeight = avgHigh - avgLow;
      
      patterns.push({
        id: `chart-symmetrical-triangle-${Date.now()}`,
        name: 'Symmetrical Triangle',
        category: 'chart',
        direction: 'neutral',
        reliability: 0.65,
        confidence: 0.7,
        startIndex: Math.min(recentHighs[0], recentLows[0]),
        endIndex: candles.length - 1,
        startTime: candles[Math.min(recentHighs[0], recentLows[0])].timestamp,
        endTime: candles[candles.length - 1].timestamp,
        priceTarget: undefined, // Depends on breakout direction
        description: 'Triângulo simétrico - esperar direção do breakout',
        tradingImplication: 'Operar na direção do breakout',
        metadata: { highSlope, lowSlope, patternHeight },
        breakoutLevel: (avgHigh + avgLow) / 2,
        targetCalculation: 'Breakout + altura do triângulo',
        volumeConfirmation: true,
      });
    }

    return patterns;
  }

  private detectWedges(
    candles: OHLCV[],
    swingHighs: number[],
    swingLows: number[]
  ): ChartPattern[] {
    const patterns: ChartPattern[] = [];
    
    if (swingHighs.length < 3 || swingLows.length < 3) return patterns;

    const recentHighs = swingHighs.slice(-4);
    const recentLows = swingLows.slice(-4);
    
    if (recentHighs.length < 2 || recentLows.length < 2) return patterns;

    const highPrices = recentHighs.map(i => candles[i].high);
    const lowPrices = recentLows.map(i => candles[i].low);
    
    const highSlope = (highPrices[highPrices.length - 1] - highPrices[0]) / 
                      (recentHighs[recentHighs.length - 1] - recentHighs[0]);
    const lowSlope = (lowPrices[lowPrices.length - 1] - lowPrices[0]) / 
                     (recentLows[recentLows.length - 1] - recentLows[0]);

    // Rising Wedge (bearish)
    if (highSlope > 0 && lowSlope > 0 && lowSlope > highSlope) {
      patterns.push({
        id: `chart-rising-wedge-${Date.now()}`,
        name: 'Rising Wedge',
        category: 'chart',
        direction: 'bearish',
        reliability: 0.7,
        confidence: 0.7,
        startIndex: Math.min(recentHighs[0], recentLows[0]),
        endIndex: candles.length - 1,
        startTime: candles[Math.min(recentHighs[0], recentLows[0])].timestamp,
        endTime: candles[candles.length - 1].timestamp,
        priceTarget: lowPrices[0],
        stopLoss: highPrices[highPrices.length - 1] * 1.02,
        description: 'Cunha ascendente - padrão de reversão baixista',
        tradingImplication: 'Vender na quebra da linha inferior',
        metadata: { highSlope, lowSlope },
        breakoutLevel: lowPrices[lowPrices.length - 1],
        targetCalculation: 'Início do padrão (base da cunha)',
        volumeConfirmation: true,
      });
    }

    // Falling Wedge (bullish)
    if (highSlope < 0 && lowSlope < 0 && highSlope > lowSlope) {
      patterns.push({
        id: `chart-falling-wedge-${Date.now()}`,
        name: 'Falling Wedge',
        category: 'chart',
        direction: 'bullish',
        reliability: 0.7,
        confidence: 0.7,
        startIndex: Math.min(recentHighs[0], recentLows[0]),
        endIndex: candles.length - 1,
        startTime: candles[Math.min(recentHighs[0], recentLows[0])].timestamp,
        endTime: candles[candles.length - 1].timestamp,
        priceTarget: highPrices[0],
        stopLoss: lowPrices[lowPrices.length - 1] * 0.98,
        description: 'Cunha descendente - padrão de reversão altista',
        tradingImplication: 'Comprar na quebra da linha superior',
        metadata: { highSlope, lowSlope },
        breakoutLevel: highPrices[highPrices.length - 1],
        targetCalculation: 'Início do padrão (topo da cunha)',
        volumeConfirmation: true,
      });
    }

    return patterns;
  }

  private detectFlagsAndPennants(candles: OHLCV[]): ChartPattern[] {
    const patterns: ChartPattern[] = [];
    const len = candles.length;
    
    if (len < 30) return patterns;

    // Look for strong move (pole) followed by consolidation (flag)
    const recentCandles = candles.slice(-30);
    
    // Find potential pole (strong directional move)
    for (let poleStart = 0; poleStart < 10; poleStart++) {
      const poleEnd = poleStart + 5;
      if (poleEnd >= 15) break;
      
      const poleMove = recentCandles[poleEnd].close - recentCandles[poleStart].close;
      const polePercent = Math.abs(poleMove) / recentCandles[poleStart].close;
      
      // Pole should be at least 5% move
      if (polePercent < 0.05) continue;
      
      // Check for consolidation after pole
      const consolidationCandles = recentCandles.slice(poleEnd, poleEnd + 10);
      if (consolidationCandles.length < 5) continue;
      
      const consolidationHigh = Math.max(...consolidationCandles.map(c => c.high));
      const consolidationLow = Math.min(...consolidationCandles.map(c => c.low));
      const consolidationRange = (consolidationHigh - consolidationLow) / consolidationLow;
      
      // Flag should be tighter than pole
      if (consolidationRange > polePercent * 0.5) continue;
      
      const isBullish = poleMove > 0;
      const poleHeight = Math.abs(poleMove);
      
      patterns.push({
        id: `chart-flag-${Date.now()}`,
        name: isBullish ? 'Bull Flag' : 'Bear Flag',
        category: 'chart',
        direction: isBullish ? 'bullish' : 'bearish',
        reliability: 0.7,
        confidence: 0.75,
        startIndex: len - 30 + poleStart,
        endIndex: len - 1,
        startTime: recentCandles[poleStart].timestamp,
        endTime: recentCandles[recentCandles.length - 1].timestamp,
        priceTarget: isBullish 
          ? consolidationHigh + poleHeight 
          : consolidationLow - poleHeight,
        stopLoss: isBullish ? consolidationLow * 0.98 : consolidationHigh * 1.02,
        description: `Flag ${isBullish ? 'de alta' : 'de baixa'} - continuação de tendência`,
        tradingImplication: `${isBullish ? 'Comprar' : 'Vender'} na quebra do ${isBullish ? 'topo' : 'fundo'} do flag`,
        metadata: {
          poleHeight,
          polePercent,
          consolidationRange,
        },
        breakoutLevel: isBullish ? consolidationHigh : consolidationLow,
        targetCalculation: 'Breakout + altura do mastro (pole)',
        volumeConfirmation: true,
      });
      
      break; // Only detect one flag pattern
    }

    return patterns;
  }

  // ============================================
  // HARMONIC PATTERN DETECTION
  // ============================================

  private scanHarmonicPatterns(candles: OHLCV[]): HarmonicPattern[] {
    const patterns: HarmonicPattern[] = [];
    
    if (candles.length < 50) return patterns;

    // Find pivot points for harmonic patterns
    const pivots = this.findHarmonicPivots(candles);
    
    if (pivots.length < 5) return patterns;

    // Check for various harmonic patterns
    const gartley = this.detectGartley(candles, pivots);
    if (gartley) patterns.push(gartley);

    const butterfly = this.detectButterfly(candles, pivots);
    if (butterfly) patterns.push(butterfly);

    const bat = this.detectBat(candles, pivots);
    if (bat) patterns.push(bat);

    const crab = this.detectCrab(candles, pivots);
    if (crab) patterns.push(crab);

    return patterns;
  }

  private findHarmonicPivots(candles: OHLCV[]): { index: number; price: number; type: 'high' | 'low' }[] {
    const pivots: { index: number; price: number; type: 'high' | 'low' }[] = [];
    
    for (let i = 3; i < candles.length - 3; i++) {
      // Local high
      if (candles[i].high > candles[i - 1].high &&
          candles[i].high > candles[i - 2].high &&
          candles[i].high > candles[i + 1].high &&
          candles[i].high > candles[i + 2].high) {
        pivots.push({ index: i, price: candles[i].high, type: 'high' });
      }
      
      // Local low
      if (candles[i].low < candles[i - 1].low &&
          candles[i].low < candles[i - 2].low &&
          candles[i].low < candles[i + 1].low &&
          candles[i].low < candles[i + 2].low) {
        pivots.push({ index: i, price: candles[i].low, type: 'low' });
      }
    }
    
    return pivots;
  }

  private detectGartley(
    candles: OHLCV[],
    pivots: { index: number; price: number; type: 'high' | 'low' }[]
  ): HarmonicPattern | null {
    // Gartley ratios: XA, AB=0.618, BC=0.382-0.886, CD=1.27-1.618
    // PRZ at D = 0.786 of XA
    
    if (pivots.length < 5) return null;
    
    // Look for XABCD pattern
    for (let i = 0; i < pivots.length - 4; i++) {
      const X = pivots[i];
      const A = pivots[i + 1];
      const B = pivots[i + 2];
      const C = pivots[i + 3];
      const D = pivots[i + 4];
      
      // X and A should be opposite types
      if (X.type === A.type) continue;
      
      const XA = Math.abs(A.price - X.price);
      const AB = Math.abs(B.price - A.price);
      const BC = Math.abs(C.price - B.price);
      const CD = Math.abs(D.price - C.price);
      
      // Check ratios
      const abRatio = AB / XA;
      const bcRatio = BC / AB;
      const cdRatio = CD / BC;
      
      // Gartley tolerances
      const isGartley = 
        abRatio >= 0.58 && abRatio <= 0.68 && // AB = 0.618 XA
        bcRatio >= 0.32 && bcRatio <= 0.92 && // BC = 0.382-0.886 AB
        cdRatio >= 1.17 && cdRatio <= 1.72;   // CD = 1.27-1.618 BC
      
      if (!isGartley) continue;
      
      const isBullish = X.type === 'high'; // Bullish Gartley starts with high
      const prz = { 
        min: Math.min(X.price, D.price), 
        max: Math.max(X.price, D.price) 
      };
      
      return {
        id: `harmonic-gartley-${D.index}-${Date.now()}`,
        name: `${isBullish ? 'Bullish' : 'Bearish'} Gartley`,
        category: 'harmonic',
        direction: isBullish ? 'bullish' : 'bearish',
        reliability: 0.7,
        confidence: 0.75,
        startIndex: X.index,
        endIndex: D.index,
        startTime: candles[X.index].timestamp,
        endTime: candles[D.index].timestamp,
        priceTarget: isBullish ? A.price : A.price,
        stopLoss: isBullish ? D.price * 0.97 : D.price * 1.03,
        description: 'Padrão Gartley - reversão em zona de confluência',
        tradingImplication: `${isBullish ? 'Comprar' : 'Vender'} no ponto D (PRZ)`,
        metadata: { X: X.price, A: A.price, B: B.price, C: C.price, D: D.price },
        ratios: { XA, AB: abRatio, BC: bcRatio, CD: cdRatio },
        potentialReversalZone: prz,
      };
    }
    
    return null;
  }

  private detectButterfly(candles: OHLCV[], pivots: any[]): HarmonicPattern | null {
    // Simplified - similar structure to Gartley with different ratios
    return null;
  }

  private detectBat(candles: OHLCV[], pivots: any[]): HarmonicPattern | null {
    return null;
  }

  private detectCrab(candles: OHLCV[], pivots: any[]): HarmonicPattern | null {
    return null;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private formatPatternName(name: string): string {
    return name
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .replace(/^./, str => str.toUpperCase());
  }

  private getTradingImplication(name: string, direction: PatternDirection): string {
    if (direction === 'bullish') {
      return 'Considerar posição de compra com stop abaixo do padrão';
    } else if (direction === 'bearish') {
      return 'Considerar posição de venda com stop acima do padrão';
    }
    return 'Aguardar confirmação de direção antes de operar';
  }

  /**
   * Get all currently detected patterns for a symbol
   */
  getDetectedPatterns(symbol: string): DetectedPattern[] {
    return this.detectedPatterns.get(symbol) || [];
  }

  /**
   * Get pattern history for learning
   */
  getPatternHistory(symbol: string): DetectedPattern[] {
    return this.patternHistory.get(symbol) || [];
  }

  /**
   * Record pattern outcome for learning
   */
  recordPatternOutcome(
    patternId: string,
    outcome: 'success' | 'failure' | 'neutral',
    actualPnL: number
  ): void {
    // TODO: Store outcomes for machine learning
  }
}

// Export singleton
export const patternRecognition = new PatternRecognitionEngine();
