/**
 * Economical Analysis Engine - Motor de Análise Econômica
 * Versão otimizada para baixo consumo de recursos
 * 
 * Funcionalidades:
 * - Análise adaptativa baseada em recursos disponíveis
 * - Cache inteligente de resultados
 * - Modo degradado gracioso
 * - Priorização de operações críticas
 * - Experiência de usuário preservada mesmo com poucos recursos
 */

import { EventEmitter } from 'events';
import {
  ResourceManager,
  getResourceManager,
  AnalysisLevel,
  ADAPTIVE_ANALYSIS_CONFIG,
  ResourceExhaustedError,
  OPERATION_COSTS,
} from './resource-manager';

// ============================================
// TYPES
// ============================================

export interface EconomicalAnalysisResult {
  // Analysis data (whatever was computed)
  data: PartialAnalysisData;
  
  // What was actually computed
  computed: {
    indicators: boolean;
    patterns: boolean;
    aiAnalysis: boolean;
    regime: boolean;
    optimization: boolean;
  };
  
  // Resource usage
  resourceUsage: {
    tokensUsed: number;
    cached: boolean;
    level: AnalysisLevel;
    degraded: boolean;
  };
  
  // User-friendly message
  message: string;
  
  // Recommendations
  recommendations: string[];
}

export interface PartialAnalysisData {
  // Indicators (always present, but may be limited)
  indicators?: {
    sma?: number[];
    ema?: number[];
    rsi?: number;
    macd?: { macd: number; signal: number; histogram: number };
    atr?: number;
    bollinger?: { upper: number; middle: number; lower: number };
    stochastic?: { k: number; d: number };
    adx?: number;
    ichimoku?: unknown;
    vwap?: number;
    obv?: number;
    mfi?: number;
    williamsr?: number;
    cci?: number;
  };
  
  // Patterns (may not be computed)
  patterns?: {
    candlestick?: Array<{ name: string; confidence: number }>;
    chart?: Array<{ name: string; confidence: number }>;
    harmonic?: Array<{ name: string; confidence: number }>;
  };
  
  // Market state (simplified if resources low)
  market?: {
    regime: string;
    bias: 'bullish' | 'bearish' | 'neutral';
    strength: number;
    volatility: 'low' | 'medium' | 'high';
  };
  
  // AI analysis (may be disabled)
  ai?: {
    recommendation: string;
    confidence: number;
    reasoning?: string;
    opportunities?: unknown[];
  };
  
  // Optimization (may be disabled)
  optimization?: {
    optimalSize?: number;
    riskLevel?: string;
    targets?: { entry?: number; stopLoss?: number; takeProfit?: number };
  };
}

export interface EconomicalConfig {
  // Prioritize these operations when resources are low
  priorities: Array<keyof typeof OPERATION_COSTS>;
  
  // Always compute these even at minimal level
  essentials: string[];
  
  // User notification preferences
  notifyOnDegradation: boolean;
  notifyOnExhaustion: boolean;
  
  // Fallback behavior
  useCachedOnExhaustion: boolean;
  gracefulDegradation: boolean;
}

// ============================================
// DEFAULT CONFIG
// ============================================

export const DEFAULT_ECONOMICAL_CONFIG: EconomicalConfig = {
  priorities: ['indicators', 'regime', 'patterns', 'aiAnalysis', 'optimization'],
  essentials: ['rsi', 'sma20', 'bias'],
  notifyOnDegradation: true,
  notifyOnExhaustion: true,
  useCachedOnExhaustion: true,
  gracefulDegradation: true,
};

// ============================================
// ECONOMICAL ANALYSIS ENGINE
// ============================================

export class EconomicalAnalysisEngine extends EventEmitter {
  private resourceManager: ResourceManager;
  private config: EconomicalConfig;
  private lastAnalysis: Map<string, { data: PartialAnalysisData; timestamp: number }> = new Map();
  private fallbackCache: Map<string, PartialAnalysisData> = new Map();

  constructor(
    resourceManager?: ResourceManager,
    config?: Partial<EconomicalConfig>
  ) {
    super();
    this.resourceManager = resourceManager || getResourceManager();
    this.config = { ...DEFAULT_ECONOMICAL_CONFIG, ...config };
    
    // Listen to resource events
    this.resourceManager.on('warning', (report) => {
      if (this.config.notifyOnDegradation) {
        this.emit('degradation', {
          type: 'warning',
          message: 'Uso de recursos em 70%+. Análise sendo simplificada.',
          report,
        });
      }
    });
    
    this.resourceManager.on('critical', (report) => {
      if (this.config.notifyOnDegradation) {
        this.emit('degradation', {
          type: 'critical',
          message: 'Uso de recursos crítico (90%+). Apenas análise essencial.',
          report,
        });
      }
    });
    
    this.resourceManager.on('exhausted', (report) => {
      if (this.config.notifyOnExhaustion) {
        this.emit('exhausted', {
          message: 'Limite de recursos atingido. Usando cache ou aguardando reset.',
          report,
        });
      }
    });
  }

  // ============================================
  // MAIN ANALYSIS METHOD
  // ============================================

  /**
   * Perform economical analysis based on available resources
   */
  async analyze(
    symbol: string,
    prices: number[],
    options?: { force?: boolean; preferCached?: boolean }
  ): Promise<EconomicalAnalysisResult> {
    const level = this.resourceManager.getCurrentLevel();
    const adaptiveConfig = ADAPTIVE_ANALYSIS_CONFIG[level];
    
    // Check if we should use cached data
    if (options?.preferCached || !this.resourceManager.canPerform('indicators')) {
      const cached = this.getLatestCached(symbol);
      if (cached) {
        return this.createCachedResult(cached, level);
      }
      
      // If no cache and resources exhausted
      if (!this.resourceManager.canPerform('indicators')) {
        return this.createExhaustedResult(symbol, level);
      }
    }
    
    // Perform analysis based on level
    const result = await this.performAdaptiveAnalysis(symbol, prices, level, adaptiveConfig);
    
    // Store for future fallback
    this.lastAnalysis.set(symbol, { data: result.data, timestamp: Date.now() });
    this.fallbackCache.set(symbol, result.data);
    
    return result;
  }

  /**
   * Perform adaptive analysis
   */
  private async performAdaptiveAnalysis(
    symbol: string,
    prices: number[],
    level: AnalysisLevel,
    config: typeof ADAPTIVE_ANALYSIS_CONFIG[AnalysisLevel]
  ): Promise<EconomicalAnalysisResult> {
    const data: PartialAnalysisData = {};
    const computed = {
      indicators: false,
      patterns: false,
      aiAnalysis: false,
      regime: false,
      optimization: false,
    };
    let tokensUsed = 0;
    let degraded = level !== this.resourceManager.getCurrentLevel();
    const recommendations: string[] = [];

    // 1. Always compute essential indicators
    try {
      const cacheKey = `indicators:${symbol}:${level}`;
      const result = await this.resourceManager.execute(
        'indicators',
        cacheKey,
        async () => this.computeIndicators(prices, config.indicators)
      );
      
      data.indicators = result.data;
      computed.indicators = true;
      tokensUsed += result.cost.actualCost;
    } catch (error) {
      if (error instanceof ResourceExhaustedError) {
        recommendations.push('Indicadores limitados por falta de recursos');
        data.indicators = this.computeMinimalIndicators(prices);
        degraded = true;
      }
    }

    // 2. Compute regime if enabled
    if (config.regime && this.resourceManager.canPerform('regime')) {
      try {
        const cacheKey = `regime:${symbol}`;
        const result = await this.resourceManager.execute(
          'regime',
          cacheKey,
          async () => this.detectRegime(prices, data.indicators)
        );
        
        data.market = result.data;
        computed.regime = true;
        tokensUsed += result.cost.actualCost;
      } catch {
        degraded = true;
      }
    } else if (config.regime) {
      recommendations.push('Detecção de regime desabilitada para economizar');
    }

    // 3. Compute patterns if enabled
    if (config.patterns && this.resourceManager.canPerform('patterns')) {
      try {
        const cacheKey = `patterns:${symbol}:${level}`;
        const result = await this.resourceManager.execute(
          'patterns',
          cacheKey,
          async () => this.detectPatterns(prices, level)
        );
        
        data.patterns = result.data;
        computed.patterns = true;
        tokensUsed += result.cost.actualCost;
      } catch {
        degraded = true;
      }
    } else if (config.patterns) {
      recommendations.push('Análise de padrões desabilitada para economizar');
    }

    // 4. AI Analysis if enabled
    if (config.aiAnalysis && this.resourceManager.canPerform('aiAnalysis')) {
      try {
        const cacheKey = `ai:${symbol}:${level}`;
        const result = await this.resourceManager.execute(
          'aiAnalysis',
          cacheKey,
          async () => this.performAIAnalysis(data, level)
        );
        
        data.ai = result.data;
        computed.aiAnalysis = true;
        tokensUsed += result.cost.actualCost;
      } catch {
        degraded = true;
      }
    } else if (config.aiAnalysis) {
      recommendations.push('Análise AI desabilitada para economizar');
    }

    // 5. Optimization if enabled
    if (config.optimization && this.resourceManager.canPerform('optimization')) {
      try {
        const cacheKey = `optimization:${symbol}`;
        const result = await this.resourceManager.execute(
          'optimization',
          cacheKey,
          async () => this.computeOptimization(prices, data)
        );
        
        data.optimization = result.data;
        computed.optimization = true;
        tokensUsed += result.cost.actualCost;
      } catch {
        degraded = true;
      }
    }

    // Generate user message
    const message = this.generateUserMessage(level, degraded, computed);
    
    // Add recommendations based on state
    if (degraded) {
      recommendations.push('Considere fazer upgrade do plano para análises completas');
    }
    
    const report = this.resourceManager.getUsageReport();
    if (report.status === 'warning') {
      recommendations.push(`${Math.round(report.tokensRemaining)} tokens restantes hoje`);
    }

    return {
      data,
      computed,
      resourceUsage: {
        tokensUsed,
        cached: false,
        level,
        degraded,
      },
      message,
      recommendations,
    };
  }

  // ============================================
  // COMPUTATION METHODS (SIMPLIFIED)
  // ============================================

  /**
   * Compute indicators based on level
   */
  private computeIndicators(
    prices: number[],
    indicatorList: string[]
  ): PartialAnalysisData['indicators'] {
    const result: PartialAnalysisData['indicators'] = {};
    
    // SMA
    if (indicatorList.includes('sma20') || indicatorList.includes('all')) {
      result.sma = [this.calculateSMA(prices, 20)];
    }
    
    // RSI
    if (indicatorList.includes('rsi14') || indicatorList.includes('all')) {
      result.rsi = this.calculateRSI(prices, 14);
    }
    
    // MACD
    if (indicatorList.includes('macd') || indicatorList.includes('all')) {
      result.macd = this.calculateMACD(prices);
    }
    
    // ATR
    if (indicatorList.includes('atr14') || indicatorList.includes('all')) {
      result.atr = this.calculateATR(prices, 14);
    }
    
    // Bollinger
    if (indicatorList.includes('bollinger') || indicatorList.includes('all')) {
      result.bollinger = this.calculateBollinger(prices, 20, 2);
    }
    
    // Stochastic
    if (indicatorList.includes('stochastic') || indicatorList.includes('all')) {
      result.stochastic = this.calculateStochastic(prices, 14, 3, 3);
    }
    
    return result;
  }

  /**
   * Compute minimal indicators (always available)
   */
  private computeMinimalIndicators(prices: number[]): PartialAnalysisData['indicators'] {
    return {
      sma: [this.calculateSMA(prices, 20)],
      rsi: this.calculateRSI(prices, 14),
    };
  }

  /**
   * Detect market regime
   */
  private detectRegime(
    prices: number[],
    indicators?: PartialAnalysisData['indicators']
  ): PartialAnalysisData['market'] {
    const rsi = indicators?.rsi || this.calculateRSI(prices, 14);
    const sma20 = indicators?.sma?.[0] || this.calculateSMA(prices, 20);
    const currentPrice = prices[prices.length - 1];
    
    // Simple regime detection
    let regime = 'ranging';
    let bias: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    
    if (currentPrice > sma20 * 1.02) {
      regime = 'trending_up';
      bias = 'bullish';
    } else if (currentPrice < sma20 * 0.98) {
      regime = 'trending_down';
      bias = 'bearish';
    }
    
    // RSI-based strength
    const strength = Math.abs(rsi - 50) / 50;
    
    // Volatility estimation
    const returns = prices.slice(-20).map((p, i, arr) => 
      i > 0 ? (p - arr[i-1]) / arr[i-1] : 0
    ).slice(1);
    const volatility = Math.sqrt(
      returns.reduce((sum, r) => sum + r * r, 0) / returns.length
    );
    
    return {
      regime,
      bias,
      strength,
      volatility: volatility > 0.03 ? 'high' : volatility > 0.01 ? 'medium' : 'low',
    };
  }

  /**
   * Detect patterns based on level
   */
  private detectPatterns(
    prices: number[],
    level: AnalysisLevel
  ): PartialAnalysisData['patterns'] {
    const patterns: PartialAnalysisData['patterns'] = {
      candlestick: [],
      chart: [],
      harmonic: [],
    };
    
    // Basic candlestick patterns
    const lastPrices = prices.slice(-5);
    
    // Doji detection (simplified)
    const open = lastPrices[lastPrices.length - 2];
    const close = lastPrices[lastPrices.length - 1];
    if (Math.abs(close - open) / open < 0.001) {
      patterns.candlestick!.push({ name: 'doji', confidence: 0.8 });
    }
    
    // Hammer detection (simplified)
    const low = Math.min(...lastPrices.slice(-4));
    const high = Math.max(...lastPrices.slice(-4));
    if (close > open && (open - low) > 2 * (close - open)) {
      patterns.candlestick!.push({ name: 'hammer', confidence: 0.7 });
    }
    
    // More patterns only for standard+ levels
    if (level !== 'minimal' && level !== 'basic') {
      // Engulfing pattern
      const prevOpen = lastPrices[lastPrices.length - 3];
      const prevClose = lastPrices[lastPrices.length - 2];
      if (open < prevClose && close > prevOpen && close > open) {
        patterns.candlestick!.push({ name: 'bullish_engulfing', confidence: 0.75 });
      }
    }
    
    return patterns;
  }

  /**
   * Perform AI analysis
   */
  private performAIAnalysis(
    data: PartialAnalysisData,
    level: AnalysisLevel
  ): PartialAnalysisData['ai'] {
    const rsi = data.indicators?.rsi || 50;
    const bias = data.market?.bias || 'neutral';
    
    // Simple AI recommendation
    let recommendation = 'HOLD';
    let confidence = 0.5;
    let reasoning = '';
    
    if (rsi < 30 && bias !== 'bearish') {
      recommendation = 'BUY';
      confidence = 0.7;
      reasoning = 'RSI indica sobrevenda';
    } else if (rsi > 70 && bias !== 'bullish') {
      recommendation = 'SELL';
      confidence = 0.7;
      reasoning = 'RSI indica sobrecompra';
    } else if (bias === 'bullish' && rsi > 40 && rsi < 60) {
      recommendation = 'BUY';
      confidence = 0.6;
      reasoning = 'Tendência de alta com RSI neutro';
    } else if (bias === 'bearish' && rsi > 40 && rsi < 60) {
      recommendation = 'SELL';
      confidence = 0.6;
      reasoning = 'Tendência de baixa com RSI neutro';
    }
    
    // Full analysis only for higher levels
    const result: PartialAnalysisData['ai'] = {
      recommendation,
      confidence,
    };
    
    if (level !== 'minimal') {
      result.reasoning = reasoning;
    }
    
    return result;
  }

  /**
   * Compute optimization
   */
  private computeOptimization(
    prices: number[],
    data: PartialAnalysisData
  ): PartialAnalysisData['optimization'] {
    const atr = data.indicators?.atr || this.calculateATR(prices, 14);
    const currentPrice = prices[prices.length - 1];
    
    // Simple optimization
    return {
      optimalSize: 0.02, // 2% of portfolio
      riskLevel: data.market?.volatility === 'high' ? 'conservative' : 'moderate',
      targets: {
        entry: currentPrice,
        stopLoss: currentPrice - atr * 2,
        takeProfit: currentPrice + atr * 3,
      },
    };
  }

  // ============================================
  // INDICATOR CALCULATIONS (SIMPLIFIED)
  // ============================================

  private calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];
    const slice = prices.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];
    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }
    return ema;
  }

  private calculateRSI(prices: number[], period: number): number {
    if (prices.length < period + 1) return 50;
    
    const changes = prices.slice(-period - 1).map((p, i, arr) => 
      i > 0 ? p - arr[i-1] : 0
    ).slice(1);
    
    const gains = changes.filter(c => c > 0);
    const losses = changes.filter(c => c < 0).map(l => -l);
    
    const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / period : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / period : 0;
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macd = ema12 - ema26;
    const signal = macd * 0.2; // Simplified
    return { macd, signal, histogram: macd - signal };
  }

  private calculateATR(prices: number[], period: number): number {
    if (prices.length < 2) return 0;
    const ranges = prices.slice(-period).map((p, i, arr) => 
      i > 0 ? Math.abs(p - arr[i-1]) : 0
    ).slice(1);
    return ranges.reduce((a, b) => a + b, 0) / ranges.length;
  }

  private calculateBollinger(prices: number[], period: number, stdDev: number): { upper: number; middle: number; lower: number } {
    const middle = this.calculateSMA(prices, period);
    const slice = prices.slice(-period);
    const variance = slice.reduce((sum, p) => sum + Math.pow(p - middle, 2), 0) / period;
    const std = Math.sqrt(variance);
    return {
      upper: middle + std * stdDev,
      middle,
      lower: middle - std * stdDev,
    };
  }

  private calculateStochastic(prices: number[], kPeriod: number, _kSmooth: number, _dPeriod: number): { k: number; d: number } {
    const slice = prices.slice(-kPeriod);
    const high = Math.max(...slice);
    const low = Math.min(...slice);
    const current = prices[prices.length - 1];
    
    const k = ((current - low) / (high - low || 1)) * 100;
    return { k, d: k }; // Simplified
  }

  // ============================================
  // CACHE & FALLBACK METHODS
  // ============================================

  private getLatestCached(symbol: string): PartialAnalysisData | null {
    const cached = this.lastAnalysis.get(symbol);
    if (cached && Date.now() - cached.timestamp < 60000) { // 1 minute
      return cached.data;
    }
    return this.fallbackCache.get(symbol) || null;
  }

  private createCachedResult(
    data: PartialAnalysisData,
    level: AnalysisLevel
  ): EconomicalAnalysisResult {
    return {
      data,
      computed: {
        indicators: !!data.indicators,
        patterns: !!data.patterns,
        aiAnalysis: !!data.ai,
        regime: !!data.market,
        optimization: !!data.optimization,
      },
      resourceUsage: {
        tokensUsed: 0,
        cached: true,
        level,
        degraded: true,
      },
      message: '📊 Usando análise em cache para economizar recursos',
      recommendations: ['Dados do cache (até 1 minuto atrás)'],
    };
  }

  private createExhaustedResult(
    _symbol: string,
    level: AnalysisLevel
  ): EconomicalAnalysisResult {
    return {
      data: {},
      computed: {
        indicators: false,
        patterns: false,
        aiAnalysis: false,
        regime: false,
        optimization: false,
      },
      resourceUsage: {
        tokensUsed: 0,
        cached: false,
        level,
        degraded: true,
      },
      message: '⚠️ Limite de recursos atingido. Aguarde o reset ou faça upgrade.',
      recommendations: [
        'Limite diário atingido',
        'Reset automático à meia-noite',
        'Considere upgrade de plano',
      ],
    };
  }

  private generateUserMessage(
    level: AnalysisLevel,
    degraded: boolean,
    computed: Record<string, boolean>
  ): string {
    const computedCount = Object.values(computed).filter(Boolean).length;
    const totalCount = Object.keys(computed).length;
    
    if (degraded) {
      if (level === 'minimal') {
        return `⚡ Análise mínima (${computedCount}/${totalCount}) - economizando recursos`;
      }
      return `📉 Análise reduzida (${computedCount}/${totalCount}) para economizar tokens`;
    }
    
    const levelEmoji = {
      minimal: '⚡',
      basic: '📊',
      standard: '📈',
      full: '🎯',
      premium: '🏆',
    };
    
    return `${levelEmoji[level]} Análise ${level} completa (${computedCount}/${totalCount})`;
  }

  // ============================================
  // USER EXPERIENCE METHODS
  // ============================================

  /**
   * Get friendly status for UI
   */
  getStatusForUI(): {
    level: string;
    levelEmoji: string;
    tokensUsed: number;
    tokensRemaining: number;
    percentUsed: number;
    statusColor: string;
    statusMessage: string;
    tips: string[];
  } {
    const report = this.resourceManager.getUsageReport();
    const quota = this.resourceManager.getQuotaSummary();
    
    const levelEmoji = {
      minimal: '⚡',
      basic: '📊',
      standard: '📈',
      full: '🎯',
      premium: '🏆',
    };
    
    const statusColors = {
      healthy: 'green',
      warning: 'yellow',
      critical: 'orange',
      exhausted: 'red',
    };
    
    const tips: string[] = [];
    if (report.status === 'warning') {
      tips.push('Reduza a frequência de análises para economizar');
    }
    if (report.status === 'critical') {
      tips.push('Modo econômico ativado automaticamente');
      tips.push('Apenas análises essenciais disponíveis');
    }
    if (report.status === 'exhausted') {
      tips.push('Usando dados em cache quando disponíveis');
      tips.push('Reset automático em algumas horas');
    }
    
    return {
      level: quota.level,
      levelEmoji: levelEmoji[quota.level],
      tokensUsed: quota.used,
      tokensRemaining: report.tokensRemaining,
      percentUsed: quota.percent,
      statusColor: statusColors[report.status],
      statusMessage: this.getStatusMessage(report.status),
      tips,
    };
  }

  private getStatusMessage(status: string): string {
    switch (status) {
      case 'healthy': return 'Recursos disponíveis ✅';
      case 'warning': return 'Uso moderado - economizando 🟡';
      case 'critical': return 'Recursos baixos - modo econômico 🟠';
      case 'exhausted': return 'Limite atingido - usando cache 🔴';
      default: return 'Status desconhecido';
    }
  }

  /**
   * Estimate cost before analysis
   */
  estimateCost(level?: AnalysisLevel): {
    estimated: number;
    breakdown: Record<string, number>;
    canAfford: boolean;
    alternativeLevel?: AnalysisLevel;
  } {
    const actualLevel = level || this.resourceManager.getCurrentLevel();
    const config = ADAPTIVE_ANALYSIS_CONFIG[actualLevel];
    
    let total = 0;
    const breakdown: Record<string, number> = {};
    
    // Calculate costs
    breakdown.indicators = OPERATION_COSTS.indicators[actualLevel];
    total += breakdown.indicators;
    
    if (config.regime) {
      breakdown.regime = OPERATION_COSTS.regime[actualLevel];
      total += breakdown.regime;
    }
    
    if (config.patterns) {
      breakdown.patterns = OPERATION_COSTS.patterns[actualLevel];
      total += breakdown.patterns;
    }
    
    if (config.aiAnalysis) {
      breakdown.aiAnalysis = OPERATION_COSTS.aiAnalysis[actualLevel];
      total += breakdown.aiAnalysis;
    }
    
    if (config.optimization) {
      breakdown.optimization = OPERATION_COSTS.optimization[actualLevel];
      total += breakdown.optimization;
    }
    
    const report = this.resourceManager.getUsageReport();
    const canAfford = report.tokensRemaining >= total;
    
    // Suggest alternative if can't afford
    let alternativeLevel: AnalysisLevel | undefined;
    if (!canAfford) {
      const levels: AnalysisLevel[] = ['minimal', 'basic', 'standard', 'full', 'premium'];
      for (const lvl of levels) {
        const altCost = this.calculateLevelCost(lvl);
        if (report.tokensRemaining >= altCost) {
          alternativeLevel = lvl;
        }
      }
    }
    
    return { estimated: total, breakdown, canAfford, alternativeLevel };
  }

  private calculateLevelCost(level: AnalysisLevel): number {
    const config = ADAPTIVE_ANALYSIS_CONFIG[level];
    let total = OPERATION_COSTS.indicators[level];
    if (config.regime) total += OPERATION_COSTS.regime[level];
    if (config.patterns) total += OPERATION_COSTS.patterns[level];
    if (config.aiAnalysis) total += OPERATION_COSTS.aiAnalysis[level];
    if (config.optimization) total += OPERATION_COSTS.optimization[level];
    return total;
  }
}

// ============================================
// FACTORY & SINGLETON
// ============================================

let economicalEngineInstance: EconomicalAnalysisEngine | null = null;

export function getEconomicalEngine(): EconomicalAnalysisEngine {
  if (!economicalEngineInstance) {
    economicalEngineInstance = new EconomicalAnalysisEngine();
  }
  return economicalEngineInstance;
}

export function createEconomicalEngine(
  resourceManager?: ResourceManager,
  config?: Partial<EconomicalConfig>
): EconomicalAnalysisEngine {
  return new EconomicalAnalysisEngine(resourceManager, config);
}
