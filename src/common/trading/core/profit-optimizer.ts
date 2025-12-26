/**
 * Profit Optimizer
 * Sistema de otimização de lucro autônomo
 * Busca sempre a melhor oportunidade quando vantajoso
 */

import { EventEmitter } from 'events';
import { 
  Position, 
  Order, 
  Quote,
  OHLCV,
  TradeDecision,
  RiskLevel,
} from './trading-types';
import { OpportunityAssessment, MarketSnapshot } from './ai-market-vision';
import { StrategyAdjustments } from './market-regime-adapter';

// ============================================
// OPTIMIZER TYPES
// ============================================

export interface OptimizationConfig {
  // Risk settings
  maxRiskPerTrade: number; // % of capital
  maxDailyDrawdown: number;
  maxTotalExposure: number; // % of capital
  
  // Profit targets
  minRiskReward: number;
  targetDailyReturn: number;
  targetWeeklyReturn: number;
  
  // Position management
  maxPositions: number;
  maxCorrelatedPositions: number;
  maxPositionDuration: number; // ms
  
  // Opportunity selection
  minOpportunityScore: number; // 0-100
  preferHigherRR: boolean;
  preferLowerRisk: boolean;
  
  // Scaling
  enableScaling: boolean;
  maxScaleIns: number;
  scaleInThreshold: number; // % move in favor
  
  // Exit optimization
  usePartialTakeProfit: boolean;
  partialProfitLevels: number[];
  dynamicStopLoss: boolean;
  trailAfterProfit: number; // % profit to start trailing
}

export interface RankedOpportunity {
  symbol: string;
  assessment: OpportunityAssessment;
  snapshot: MarketSnapshot;
  
  // Ranking factors
  score: number; // 0-100 overall
  riskScore: number; // Lower is better
  rewardScore: number; // Higher is better
  timingScore: number;
  alignmentScore: number;
  
  // Expected value
  expectedReturn: number; // Expected % return
  expectedRisk: number; // Expected % loss if wrong
  expectedValue: number; // Probability-weighted return
  
  // Recommendation
  rank: number;
  action: 'strong_buy' | 'buy' | 'watch' | 'avoid' | 'strong_sell' | 'sell';
  priority: 'high' | 'medium' | 'low';
  
  // Context
  reasoning: string[];
  warnings: string[];
}

export interface PositionOptimization {
  position: Position;
  
  // Current status
  currentPnL: number;
  currentPnLPercent: number;
  holdingDuration: number;
  
  // Recommendation
  action: 'hold' | 'scale_in' | 'scale_out' | 'close' | 'adjust_stops';
  urgency: 'immediate' | 'soon' | 'patient';
  
  // Parameters
  newStopLoss?: number;
  newTakeProfit?: number;
  scaleQuantity?: number;
  
  // Reasoning
  reasoning: string[];
}

export interface PortfolioOptimization {
  timestamp: number;
  
  // Current state
  totalValue: number;
  totalExposure: number;
  exposurePercent: number;
  unrealizedPnL: number;
  realizedPnLToday: number;
  
  // Risk metrics
  currentRisk: number;
  maxRisk: number;
  riskUtilization: number;
  
  // Opportunities
  rankedOpportunities: RankedOpportunity[];
  topOpportunity: RankedOpportunity | null;
  
  // Position optimizations
  positionActions: PositionOptimization[];
  
  // Overall recommendation
  recommendation: {
    canOpenNew: boolean;
    suggestedAction: 'add_exposure' | 'reduce_exposure' | 'hold' | 'exit_all';
    maxNewPositionSize: number;
    reasoning: string[];
  };
  
  // Performance tracking
  dailyPerformance: {
    trades: number;
    wins: number;
    losses: number;
    winRate: number;
    avgWin: number;
    avgLoss: number;
    profitFactor: number;
    sharpeToday: number;
  };
}

export interface TradeOptimization {
  decision: TradeDecision;
  
  // Optimized parameters
  optimizedQuantity: number;
  optimizedEntry: number;
  optimizedStop: number;
  optimizedTarget: number;
  
  // Partial take profits
  partialTakeProfits: Array<{
    price: number;
    quantity: number; // % of position
    reason: string;
  }>;
  
  // Expected outcome
  expectedReturn: number;
  expectedRisk: number;
  adjustedRiskReward: number;
  
  // Timing
  entryTiming: 'now' | 'limit' | 'wait';
  maxWaitTime: number; // ms
  
  // Exit strategy
  exitStrategy: 'fixed_targets' | 'trailing_stop' | 'time_based' | 'hybrid';
  trailingStopConfig?: {
    activationPercent: number;
    trailPercent: number;
    tightenOnProfit: boolean;
  };
}

// ============================================
// PROFIT OPTIMIZER ENGINE
// ============================================

export class ProfitOptimizer extends EventEmitter {
  private config: OptimizationConfig;
  
  // Performance tracking
  private dailyTrades: Array<{ timestamp: number; pnl: number; symbol: string }> = [];
  private tradeHistory: Array<{ 
    symbol: string;
    entry: number;
    exit: number;
    pnl: number;
    pnlPercent: number;
    duration: number;
    timestamp: number;
  }> = [];

  constructor(config: Partial<OptimizationConfig> = {}) {
    super();
    
    this.config = {
      maxRiskPerTrade: 0.02, // 2%
      maxDailyDrawdown: 0.05, // 5%
      maxTotalExposure: 0.8, // 80%
      minRiskReward: 1.5,
      targetDailyReturn: 0.02, // 2%
      targetWeeklyReturn: 0.1, // 10%
      maxPositions: 5,
      maxCorrelatedPositions: 2,
      maxPositionDuration: 7 * 24 * 60 * 60 * 1000, // 7 days
      minOpportunityScore: 60,
      preferHigherRR: true,
      preferLowerRisk: true,
      enableScaling: true,
      maxScaleIns: 2,
      scaleInThreshold: 0.02, // 2%
      usePartialTakeProfit: true,
      partialProfitLevels: [0.33, 0.33, 0.34], // 3 equal parts
      dynamicStopLoss: true,
      trailAfterProfit: 0.02, // 2%
      ...config,
    };
  }

  // ============================================
  // OPPORTUNITY RANKING
  // ============================================

  /**
   * Rank all opportunities and find the best ones
   */
  rankOpportunities(
    opportunities: Map<string, { assessment: OpportunityAssessment; snapshot: MarketSnapshot }>,
    currentPositions: Position[],
    capital: number
  ): RankedOpportunity[] {
    const ranked: RankedOpportunity[] = [];
    
    // Get symbols we already have positions in
    const existingSymbols = new Set(currentPositions.map(p => p.symbol));
    
    for (const [symbol, data] of opportunities) {
      const { assessment, snapshot } = data;
      
      // Skip if no setup or action is avoid/wait
      if (!assessment.hasSetup || assessment.action === 'avoid' || assessment.action === 'wait') {
        continue;
      }
      
      // Calculate individual scores
      const riskScore = this.calculateRiskScore(assessment, snapshot);
      const rewardScore = this.calculateRewardScore(assessment);
      const timingScore = this.calculateTimingScore(assessment, snapshot);
      const alignmentScore = this.calculateAlignmentScore(snapshot);
      
      // Calculate expected value
      const { expectedReturn, expectedRisk, expectedValue } = this.calculateExpectedValue(
        assessment,
        snapshot
      );
      
      // Calculate overall score (weighted)
      const score = (
        riskScore * 0.25 +
        rewardScore * 0.35 +
        timingScore * 0.2 +
        alignmentScore * 0.2
      );
      
      // Skip if below minimum score
      if (score < this.config.minOpportunityScore) {
        continue;
      }
      
      // Determine action and priority
      const { action, priority } = this.determineActionAndPriority(
        score,
        assessment,
        existingSymbols.has(symbol || '')
      );
      
      // Generate reasoning and warnings
      const { reasoning, warnings } = this.generateReasoningAndWarnings(
        assessment,
        snapshot,
        score,
        expectedValue
      );
      
      ranked.push({
        symbol,
        assessment,
        snapshot,
        score,
        riskScore,
        rewardScore,
        timingScore,
        alignmentScore,
        expectedReturn,
        expectedRisk,
        expectedValue,
        rank: 0, // Will be set after sorting
        action,
        priority,
        reasoning,
        warnings,
      });
    }
    
    // Sort by score (highest first)
    ranked.sort((a, b) => b.score - a.score);
    
    // Assign ranks
    ranked.forEach((opp, index) => {
      opp.rank = index + 1;
    });
    
    return ranked;
  }

  /**
   * Calculate risk score (higher = lower risk = better)
   */
  private calculateRiskScore(assessment: OpportunityAssessment, snapshot: MarketSnapshot): number {
    let score = 50;
    
    // Risk/Reward contribution
    if (assessment.riskReward) {
      const rr = assessment.riskReward.ratio;
      if (rr >= 3) score += 30;
      else if (rr >= 2) score += 20;
      else if (rr >= 1.5) score += 10;
      else if (rr < 1) score -= 30;
    }
    
    // Risk percent contribution
    if (assessment.riskReward?.riskPercent) {
      const riskPct = assessment.riskReward.riskPercent;
      if (riskPct <= 1) score += 20;
      else if (riskPct <= 2) score += 10;
      else if (riskPct > 3) score -= 20;
    }
    
    // Risk factors penalty
    score -= assessment.riskFactors.length * 10;
    
    // Volatility penalty
    if (snapshot.volatility.regime === 'extreme') score -= 20;
    else if (snapshot.volatility.regime === 'high') score -= 10;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate reward score (higher = more potential reward)
   */
  private calculateRewardScore(assessment: OpportunityAssessment): number {
    let score = 50;
    
    // Setup quality
    score += (assessment.setupQuality - 50) * 0.5;
    
    // Risk/Reward contribution
    if (assessment.riskReward) {
      score += (assessment.riskReward.ratio - 1.5) * 20;
      score += (assessment.riskReward.rewardPercent - 2) * 5;
    }
    
    // Confidence
    score += (assessment.confidenceFactors.overall - 0.5) * 40;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate timing score (is this the right moment?)
   */
  private calculateTimingScore(assessment: OpportunityAssessment, snapshot: MarketSnapshot): number {
    let score = 50;
    
    // Entry timing
    if (assessment.entry?.timing === 'now') score += 25;
    else if (assessment.entry?.timing === 'wait') score += 10;
    else if (assessment.entry?.timing === 'missed') score -= 20;
    
    // Urgency
    if (assessment.urgency === 'immediate') score += 15;
    else if (assessment.urgency === 'soon') score += 5;
    
    // Volume confirmation
    if (snapshot.volume.ratio > 1.5) score += 15;
    else if (snapshot.volume.ratio < 0.7) score -= 15;
    
    // Trading conditions
    if (snapshot.tradingConditions === 'excellent') score += 10;
    else if (snapshot.tradingConditions === 'poor') score -= 20;
    else if (snapshot.tradingConditions === 'avoid') score -= 40;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate alignment score (how aligned are all signals?)
   */
  private calculateAlignmentScore(snapshot: MarketSnapshot): number {
    let score = 50;
    
    // Indicator alignment
    score += snapshot.confidence * 30;
    
    // Pattern confluence
    if (snapshot.patterns?.confluence) {
      score += snapshot.patterns.confluence * 20;
    }
    
    // Trend alignment
    if (
      snapshot.trend.shortTerm === snapshot.trend.mediumTerm &&
      snapshot.trend.mediumTerm === snapshot.trend.longTerm
    ) {
      score += 15;
    } else if (snapshot.trend.shortTerm !== snapshot.trend.mediumTerm) {
      score -= 10;
    }
    
    // Regime clarity
    score += (snapshot.regimeConfidence - 0.5) * 20;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate expected value
   */
  private calculateExpectedValue(
    assessment: OpportunityAssessment,
    snapshot: MarketSnapshot
  ): { expectedReturn: number; expectedRisk: number; expectedValue: number } {
    if (!assessment.riskReward) {
      return { expectedReturn: 0, expectedRisk: 0, expectedValue: 0 };
    }
    
    // Estimate win probability based on confidence and historical data
    const winProbability = assessment.confidenceFactors.overall * 0.8 + 0.1; // Base 10-90%
    
    const expectedReturn = assessment.riskReward.rewardPercent;
    const expectedRisk = assessment.riskReward.riskPercent;
    
    // Expected value = (win prob * reward) - (loss prob * risk)
    const expectedValue = (winProbability * expectedReturn) - ((1 - winProbability) * expectedRisk);
    
    return { expectedReturn, expectedRisk, expectedValue };
  }

  /**
   * Determine action and priority
   */
  private determineActionAndPriority(
    score: number,
    assessment: OpportunityAssessment,
    hasExistingPosition: boolean
  ): { action: RankedOpportunity['action']; priority: RankedOpportunity['priority'] } {
    const isBuyish = assessment.action === 'buy';
    
    let action: RankedOpportunity['action'] = 'watch';
    let priority: RankedOpportunity['priority'] = 'low';
    
    if (score >= 80) {
      action = isBuyish ? 'strong_buy' : 'strong_sell';
      priority = 'high';
    } else if (score >= 65) {
      action = isBuyish ? 'buy' : 'sell';
      priority = hasExistingPosition ? 'medium' : 'high';
    } else if (score >= 50) {
      action = 'watch';
      priority = 'medium';
    } else {
      action = 'avoid';
      priority = 'low';
    }
    
    return { action, priority };
  }

  /**
   * Generate reasoning and warnings
   */
  private generateReasoningAndWarnings(
    assessment: OpportunityAssessment,
    snapshot: MarketSnapshot,
    score: number,
    expectedValue: number
  ): { reasoning: string[]; warnings: string[] } {
    const reasoning: string[] = [];
    const warnings: string[] = [];
    
    // Score reasoning
    reasoning.push(`Score: ${score.toFixed(0)}/100`);
    
    // Setup reasoning
    if (assessment.setupType) {
      reasoning.push(`Setup: ${assessment.setupType} (${assessment.setupQuality.toFixed(0)}%)`);
    }
    
    // Risk/Reward reasoning
    if (assessment.riskReward) {
      reasoning.push(`R/R: ${assessment.riskReward.ratio.toFixed(2)}`);
      reasoning.push(`Risco: ${assessment.riskReward.riskPercent.toFixed(1)}%`);
      reasoning.push(`Alvo: ${assessment.riskReward.rewardPercent.toFixed(1)}%`);
    }
    
    // Expected value
    if (expectedValue > 0) {
      reasoning.push(`Valor esperado: +${expectedValue.toFixed(2)}%`);
    } else {
      warnings.push(`Valor esperado negativo: ${expectedValue.toFixed(2)}%`);
    }
    
    // Bias reasoning
    reasoning.push(`Viés: ${snapshot.bias}`);
    
    // Trend reasoning
    const trendDesc = `${snapshot.trend.shortTerm}/${snapshot.trend.mediumTerm}/${snapshot.trend.longTerm}`;
    reasoning.push(`Tendência: ${trendDesc}`);
    
    // Warnings from assessment
    warnings.push(...assessment.riskFactors);
    
    // Additional warnings
    if (snapshot.volatility.regime === 'high' || snapshot.volatility.regime === 'extreme') {
      warnings.push('Volatilidade elevada');
    }
    
    if (snapshot.tradingConditions === 'poor') {
      warnings.push('Condições de trading desfavoráveis');
    }
    
    return { reasoning, warnings };
  }

  // ============================================
  // POSITION OPTIMIZATION
  // ============================================

  /**
   * Optimize existing positions
   */
  optimizePositions(
    positions: Position[],
    snapshots: Map<string, MarketSnapshot>,
    adjustments: Map<string, StrategyAdjustments>
  ): PositionOptimization[] {
    const optimizations: PositionOptimization[] = [];
    
    for (const position of positions) {
      const symbol = position.symbol || position.assetId;
      const snapshot = snapshots.get(symbol);
      const strategyAdj = adjustments.get(symbol);
      
      if (!snapshot) continue;
      
      const optimization = this.optimizePosition(position, snapshot, strategyAdj);
      optimizations.push(optimization);
    }
    
    return optimizations;
  }

  /**
   * Optimize a single position
   */
  private optimizePosition(
    position: Position,
    snapshot: MarketSnapshot,
    adjustments?: StrategyAdjustments
  ): PositionOptimization {
    const currentPrice = snapshot.currentPrice;
    const entryPrice = position.averageEntryPrice || position.averagePrice;
    const isLong = position.side === 'long';
    
    // Calculate current P&L
    const pnlPercent = isLong 
      ? ((currentPrice - entryPrice) / entryPrice) * 100
      : ((entryPrice - currentPrice) / entryPrice) * 100;
    
    const pnl = position.marketValue * (pnlPercent / 100);
    const holdingDuration = Date.now() - (position.openedAt instanceof Date 
      ? position.openedAt.getTime() 
      : position.openedAt);
    
    // Determine action
    let action: PositionOptimization['action'] = 'hold';
    let urgency: PositionOptimization['urgency'] = 'patient';
    const reasoning: string[] = [];
    
    let newStopLoss: number | undefined;
    let newTakeProfit: number | undefined;
    let scaleQuantity: number | undefined;
    
    // Check for exit signals
    if (this.shouldClosePosition(position, snapshot, pnlPercent, holdingDuration)) {
      action = 'close';
      urgency = 'immediate';
      reasoning.push('Sinais de saída detectados');
    }
    // Check for scaling opportunity
    else if (this.shouldScaleIn(position, snapshot, pnlPercent) && this.config.enableScaling) {
      action = 'scale_in';
      urgency = 'soon';
      scaleQuantity = position.quantity * 0.5; // Scale in 50%
      reasoning.push('Oportunidade de aumentar posição');
    }
    // Check for partial take profit
    else if (this.shouldTakePartialProfit(position, pnlPercent)) {
      action = 'scale_out';
      urgency = 'soon';
      scaleQuantity = position.quantity * this.config.partialProfitLevels[0];
      reasoning.push(`Realizar lucro parcial (${pnlPercent.toFixed(1)}%)`);
    }
    // Check for stop adjustment
    else if (this.shouldAdjustStops(position, snapshot, pnlPercent)) {
      action = 'adjust_stops';
      urgency = 'soon';
      
      const newStop = this.calculateTrailingStop(
        position,
        currentPrice,
        pnlPercent,
        snapshot
      );
      newStopLoss = newStop;
      reasoning.push('Ajustar stop loss para proteger lucro');
    }
    
    // Add status reasoning
    reasoning.push(`P&L: ${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%`);
    reasoning.push(`Duração: ${this.formatDuration(holdingDuration)}`);
    
    if (position.stopLoss) {
      const stopDistance = isLong 
        ? ((currentPrice - position.stopLoss) / currentPrice) * 100
        : ((position.stopLoss - currentPrice) / currentPrice) * 100;
      reasoning.push(`Stop atual: ${stopDistance.toFixed(1)}% de distância`);
    }
    
    return {
      position,
      currentPnL: pnl,
      currentPnLPercent: pnlPercent,
      holdingDuration,
      action,
      urgency,
      newStopLoss,
      newTakeProfit,
      scaleQuantity,
      reasoning,
    };
  }

  /**
   * Check if position should be closed
   */
  private shouldClosePosition(
    position: Position,
    snapshot: MarketSnapshot,
    pnlPercent: number,
    duration: number
  ): boolean {
    // Max loss hit
    if (pnlPercent < -this.config.maxRiskPerTrade * 100) {
      return true;
    }
    
    // Max duration exceeded
    if (duration > this.config.maxPositionDuration) {
      return true;
    }
    
    // Trend reversal
    const isLong = position.side === 'long';
    if (isLong && snapshot.bias === 'strong_bearish') {
      return true;
    }
    if (!isLong && snapshot.bias === 'strong_bullish') {
      return true;
    }
    
    // Crash regime
    if (snapshot.regime === 'crash') {
      return true;
    }
    
    return false;
  }

  /**
   * Check if should scale into position
   */
  private shouldScaleIn(
    position: Position,
    snapshot: MarketSnapshot,
    pnlPercent: number
  ): boolean {
    // Only scale if in profit
    if (pnlPercent < this.config.scaleInThreshold * 100) {
      return false;
    }
    
    // Check if direction still favorable
    const isLong = position.side === 'long';
    if (isLong && !snapshot.bias.includes('bullish')) {
      return false;
    }
    if (!isLong && !snapshot.bias.includes('bearish')) {
      return false;
    }
    
    // Check trading conditions
    if (snapshot.tradingConditions === 'poor' || snapshot.tradingConditions === 'avoid') {
      return false;
    }
    
    return true;
  }

  /**
   * Check if should take partial profit
   */
  private shouldTakePartialProfit(position: Position, pnlPercent: number): boolean {
    if (!this.config.usePartialTakeProfit) return false;
    
    // Check if reached first profit target
    const firstTarget = (position.takeProfit && position.averagePrice)
      ? ((position.takeProfit - position.averagePrice) / position.averagePrice) * 100
      : 5; // Default 5%
    
    return pnlPercent >= firstTarget * 0.5; // Take at 50% of target
  }

  /**
   * Check if should adjust stops
   */
  private shouldAdjustStops(
    position: Position,
    snapshot: MarketSnapshot,
    pnlPercent: number
  ): boolean {
    if (!this.config.dynamicStopLoss) return false;
    
    // Only trail after minimum profit
    if (pnlPercent < this.config.trailAfterProfit * 100) {
      return false;
    }
    
    // Calculate current stop distance
    if (!position.stopLoss) return true; // No stop, should add
    
    const currentPrice = snapshot.currentPrice;
    const isLong = position.side === 'long';
    
    if (isLong) {
      // For longs, check if we can move stop higher
      const breakEven = position.averageEntryPrice || position.averagePrice;
      if (position.stopLoss < breakEven && currentPrice > breakEven * 1.02) {
        return true; // Move to break-even
      }
    } else {
      // For shorts, check if we can move stop lower
      const breakEven = position.averageEntryPrice || position.averagePrice;
      if (position.stopLoss > breakEven && currentPrice < breakEven * 0.98) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Calculate trailing stop
   */
  private calculateTrailingStop(
    position: Position,
    currentPrice: number,
    pnlPercent: number,
    snapshot: MarketSnapshot
  ): number {
    const isLong = position.side === 'long';
    const atr = snapshot.indicators?.atr14.value || currentPrice * 0.02;
    
    // Base trail distance on ATR and profit level
    let trailDistance = atr * 2;
    
    // Tighten stop as profit increases
    if (pnlPercent > 5) trailDistance = atr * 1.5;
    if (pnlPercent > 10) trailDistance = atr * 1;
    
    if (isLong) {
      return currentPrice - trailDistance;
    } else {
      return currentPrice + trailDistance;
    }
  }

  // ============================================
  // TRADE OPTIMIZATION
  // ============================================

  /**
   * Optimize a trade decision before execution
   */
  optimizeTrade(
    decision: TradeDecision,
    snapshot: MarketSnapshot,
    capital: number,
    existingPositions: Position[]
  ): TradeOptimization {
    const currentExposure = existingPositions.reduce((sum, p) => sum + p.marketValue, 0);
    const availableCapital = capital - currentExposure;
    const maxPosition = Math.min(
      capital * this.config.maxRiskPerTrade * 10, // Max position based on risk
      availableCapital * 0.5 // Max 50% of available capital
    );
    
    // Optimize quantity
    const optimizedQuantity = this.optimizeQuantity(
      decision,
      snapshot,
      maxPosition
    );
    
    // Optimize entry
    const optimizedEntry = this.optimizeEntry(decision, snapshot);
    
    // Optimize stop loss
    const optimizedStop = this.optimizeStopLoss(decision, snapshot, optimizedEntry);
    
    // Optimize take profit
    const optimizedTarget = this.optimizeTakeProfit(
      decision,
      snapshot,
      optimizedEntry,
      optimizedStop
    );
    
    // Calculate partial take profits
    const partialTakeProfits = this.calculatePartialTakeProfits(
      optimizedEntry,
      optimizedTarget,
      decision.action === 'buy'
    );
    
    // Calculate expected outcome
    const entryToStop = Math.abs(optimizedEntry - optimizedStop);
    const entryToTarget = Math.abs(optimizedTarget - optimizedEntry);
    const expectedRisk = (entryToStop / optimizedEntry) * 100;
    const expectedReturn = (entryToTarget / optimizedEntry) * 100;
    const adjustedRiskReward = expectedReturn / expectedRisk;
    
    // Determine entry timing
    const { entryTiming, maxWaitTime } = this.determineEntryTiming(
      decision,
      snapshot,
      optimizedEntry
    );
    
    // Determine exit strategy
    const exitStrategy = this.determineExitStrategy(snapshot, adjustedRiskReward);
    
    return {
      decision,
      optimizedQuantity,
      optimizedEntry,
      optimizedStop,
      optimizedTarget,
      partialTakeProfits,
      expectedReturn,
      expectedRisk,
      adjustedRiskReward,
      entryTiming,
      maxWaitTime,
      exitStrategy,
      trailingStopConfig: exitStrategy === 'trailing_stop' || exitStrategy === 'hybrid' ? {
        activationPercent: this.config.trailAfterProfit * 100,
        trailPercent: 2, // 2% trail
        tightenOnProfit: true,
      } : undefined,
    };
  }

  /**
   * Optimize position quantity
   */
  private optimizeQuantity(
    decision: TradeDecision,
    snapshot: MarketSnapshot,
    maxPosition: number
  ): number {
    const entryPrice = decision.entryPrice || decision.price || snapshot.currentPrice;
    const stopLoss = decision.stopLoss;
    
    if (!stopLoss) {
      // No stop loss - use conservative sizing
      return maxPosition * 0.3 / entryPrice;
    }
    
    // Position size based on risk
    const riskAmount = maxPosition * this.config.maxRiskPerTrade;
    const riskPerShare = Math.abs(entryPrice - stopLoss);
    
    let quantity = riskAmount / riskPerShare;
    
    // Adjust for volatility
    if (snapshot.volatility.regime === 'high') quantity *= 0.7;
    if (snapshot.volatility.regime === 'extreme') quantity *= 0.5;
    
    // Adjust for confidence
    quantity *= Math.min(1, snapshot.confidence + 0.2);
    
    return Math.max(0, quantity);
  }

  /**
   * Optimize entry price
   */
  private optimizeEntry(decision: TradeDecision, snapshot: MarketSnapshot): number {
    const suggestedEntry = decision.entryPrice || decision.price || snapshot.currentPrice;
    const isBuy = decision.action === 'buy';
    
    // Try to get better entry near support/resistance
    const keyLevels = snapshot.keyLevels;
    
    if (isBuy) {
      // For buys, try to enter near support
      if (keyLevels.immediateSupport && keyLevels.immediateSupport > suggestedEntry * 0.98) {
        return (suggestedEntry + keyLevels.immediateSupport) / 2;
      }
    } else {
      // For sells, try to enter near resistance
      if (keyLevels.immediateResistance && keyLevels.immediateResistance < suggestedEntry * 1.02) {
        return (suggestedEntry + keyLevels.immediateResistance) / 2;
      }
    }
    
    return suggestedEntry;
  }

  /**
   * Optimize stop loss
   */
  private optimizeStopLoss(
    decision: TradeDecision,
    snapshot: MarketSnapshot,
    entry: number
  ): number {
    const atr = snapshot.indicators?.atr14.value || entry * 0.02;
    const isBuy = decision.action === 'buy';
    const keyLevels = snapshot.keyLevels;
    
    let stop: number;
    
    if (decision.stopLoss) {
      stop = decision.stopLoss;
    } else {
      // Calculate stop based on ATR
      stop = isBuy ? entry - (atr * 2) : entry + (atr * 2);
    }
    
    // Adjust stop to be just beyond key level
    if (isBuy && keyLevels.immediateSupport) {
      stop = Math.min(stop, keyLevels.immediateSupport * 0.995);
    } else if (!isBuy && keyLevels.immediateResistance) {
      stop = Math.max(stop, keyLevels.immediateResistance * 1.005);
    }
    
    // Ensure minimum stop distance
    const minDistance = entry * 0.005; // 0.5% minimum
    if (Math.abs(entry - stop) < minDistance) {
      stop = isBuy ? entry - minDistance : entry + minDistance;
    }
    
    return stop;
  }

  /**
   * Optimize take profit
   */
  private optimizeTakeProfit(
    decision: TradeDecision,
    snapshot: MarketSnapshot,
    entry: number,
    stop: number
  ): number {
    const risk = Math.abs(entry - stop);
    const isBuy = decision.action === 'buy';
    const keyLevels = snapshot.keyLevels;
    
    // Calculate target based on minimum R:R
    let target = isBuy 
      ? entry + (risk * this.config.minRiskReward)
      : entry - (risk * this.config.minRiskReward);
    
    // Adjust to key levels if better
    if (isBuy && keyLevels.immediateResistance && keyLevels.immediateResistance > target) {
      target = keyLevels.immediateResistance * 0.995;
    } else if (!isBuy && keyLevels.immediateSupport && keyLevels.immediateSupport < target) {
      target = keyLevels.immediateSupport * 1.005;
    }
    
    // If we have a suggested target, use the better one
    if (decision.takeProfit) {
      const suggestedRR = Math.abs(decision.takeProfit - entry) / risk;
      const calculatedRR = Math.abs(target - entry) / risk;
      
      if (suggestedRR > calculatedRR) {
        target = decision.takeProfit;
      }
    }
    
    return target;
  }

  /**
   * Calculate partial take profit levels
   */
  private calculatePartialTakeProfits(
    entry: number,
    target: number,
    isBuy: boolean
  ): TradeOptimization['partialTakeProfits'] {
    if (!this.config.usePartialTakeProfit) {
      return [{ price: target, quantity: 100, reason: 'Target completo' }];
    }
    
    const range = Math.abs(target - entry);
    const levels = this.config.partialProfitLevels;
    
    return levels.map((pct, index) => {
      const distance = range * ((index + 1) / levels.length);
      const price = isBuy ? entry + distance : entry - distance;
      
      return {
        price,
        quantity: pct * 100,
        reason: `Nível ${index + 1}/${levels.length}`,
      };
    });
  }

  /**
   * Determine entry timing
   */
  private determineEntryTiming(
    decision: TradeDecision,
    snapshot: MarketSnapshot,
    optimizedEntry: number
  ): { entryTiming: TradeOptimization['entryTiming']; maxWaitTime: number } {
    const currentPrice = snapshot.currentPrice;
    const entryDiff = Math.abs(currentPrice - optimizedEntry) / currentPrice;
    
    if (entryDiff < 0.002) {
      // Within 0.2% - enter now
      return { entryTiming: 'now', maxWaitTime: 0 };
    }
    
    if (entryDiff < 0.01) {
      // Within 1% - use limit order
      return { entryTiming: 'limit', maxWaitTime: 30 * 60 * 1000 }; // 30 minutes
    }
    
    // Too far - wait
    return { entryTiming: 'wait', maxWaitTime: 2 * 60 * 60 * 1000 }; // 2 hours
  }

  /**
   * Determine exit strategy
   */
  private determineExitStrategy(
    snapshot: MarketSnapshot,
    riskReward: number
  ): TradeOptimization['exitStrategy'] {
    // In trending markets, use trailing stops
    if (snapshot.regime === 'trending_up' || snapshot.regime === 'trending_down') {
      return riskReward > 2 ? 'trailing_stop' : 'hybrid';
    }
    
    // In ranging markets, use fixed targets
    if (snapshot.regime === 'ranging' || snapshot.regime === 'low_volatility') {
      return 'fixed_targets';
    }
    
    // In volatile markets, use hybrid
    return 'hybrid';
  }

  // ============================================
  // PORTFOLIO OPTIMIZATION
  // ============================================

  /**
   * Generate full portfolio optimization
   */
  optimizePortfolio(
    positions: Position[],
    opportunities: Map<string, { assessment: OpportunityAssessment; snapshot: MarketSnapshot }>,
    capital: number,
    todayPnL: number,
    todayTrades: number
  ): PortfolioOptimization {
    // Calculate current state
    const totalValue = capital;
    const totalExposure = positions.reduce((sum, p) => sum + p.marketValue, 0);
    const exposurePercent = (totalExposure / capital) * 100;
    const unrealizedPnL = positions.reduce((sum, p) => sum + (p.unrealizedPnL || 0), 0);
    
    // Calculate risk metrics
    const currentRisk = this.calculateCurrentRisk(positions, capital);
    const maxRisk = this.config.maxDailyDrawdown * capital;
    const riskUtilization = currentRisk / maxRisk;
    
    // Rank opportunities
    const rankedOpportunities = this.rankOpportunities(opportunities, positions, capital);
    
    // Get top opportunity
    const topOpportunity = rankedOpportunities.length > 0 ? rankedOpportunities[0] : null;
    
    // Optimize positions
    const snapshots = new Map<string, MarketSnapshot>();
    for (const [symbol, data] of opportunities) {
      snapshots.set(symbol, data.snapshot);
    }
    const positionActions = this.optimizePositions(positions, snapshots, new Map());
    
    // Generate recommendation
    const recommendation = this.generatePortfolioRecommendation(
      positions,
      rankedOpportunities,
      capital,
      exposurePercent,
      riskUtilization,
      todayPnL
    );
    
    // Calculate daily performance
    const dailyPerformance = this.calculateDailyPerformance();
    
    return {
      timestamp: Date.now(),
      totalValue,
      totalExposure,
      exposurePercent,
      unrealizedPnL,
      realizedPnLToday: todayPnL,
      currentRisk,
      maxRisk,
      riskUtilization,
      rankedOpportunities,
      topOpportunity,
      positionActions,
      recommendation,
      dailyPerformance,
    };
  }

  /**
   * Calculate current portfolio risk
   */
  private calculateCurrentRisk(positions: Position[], capital: number): number {
    let totalRisk = 0;
    
    for (const position of positions) {
      if (!position.stopLoss) {
        // No stop = estimate 5% risk
        totalRisk += position.marketValue * 0.05;
      } else {
        const entryPrice = position.averageEntryPrice || position.averagePrice;
        const riskPercentage = Math.abs(entryPrice - position.stopLoss) / entryPrice;
        totalRisk += position.marketValue * riskPercentage;
      }
    }
    
    return totalRisk;
  }

  /**
   * Generate portfolio recommendation
   */
  private generatePortfolioRecommendation(
    positions: Position[],
    opportunities: RankedOpportunity[],
    capital: number,
    exposurePercent: number,
    riskUtilization: number,
    todayPnL: number
  ): PortfolioOptimization['recommendation'] {
    const reasoning: string[] = [];
    let suggestedAction: PortfolioOptimization['recommendation']['suggestedAction'] = 'hold';
    let canOpenNew = true;
    let maxNewPositionSize = 0;
    
    // Check exposure limits
    if (exposurePercent >= this.config.maxTotalExposure * 100) {
      canOpenNew = false;
      reasoning.push(`Exposição máxima atingida (${exposurePercent.toFixed(1)}%)`);
      suggestedAction = 'reduce_exposure';
    }
    
    // Check position limits
    if (positions.length >= this.config.maxPositions) {
      canOpenNew = false;
      reasoning.push(`Máximo de posições atingido (${positions.length})`);
    }
    
    // Check daily P&L
    if (todayPnL < -this.config.maxDailyDrawdown * capital) {
      canOpenNew = false;
      suggestedAction = 'exit_all';
      reasoning.push('Limite de perda diária atingido');
    }
    
    // Check risk utilization
    if (riskUtilization > 0.9) {
      canOpenNew = false;
      reasoning.push('Risco máximo quase atingido');
    }
    
    // Check for good opportunities
    if (canOpenNew && opportunities.length > 0) {
      const topOpp = opportunities[0];
      if (topOpp.score >= 70) {
        suggestedAction = 'add_exposure';
        maxNewPositionSize = capital * this.config.maxRiskPerTrade * 5;
        reasoning.push(`Oportunidade de alta qualidade disponível: ${topOpp.symbol}`);
      }
    }
    
    // Default reasoning
    if (reasoning.length === 0) {
      reasoning.push('Portfólio equilibrado');
      suggestedAction = 'hold';
    }
    
    if (canOpenNew) {
      maxNewPositionSize = Math.min(
        capital * (this.config.maxTotalExposure - exposurePercent / 100),
        capital * this.config.maxRiskPerTrade * 10
      );
    }
    
    return {
      canOpenNew,
      suggestedAction,
      maxNewPositionSize,
      reasoning,
    };
  }

  /**
   * Calculate daily performance metrics
   */
  private calculateDailyPerformance(): PortfolioOptimization['dailyPerformance'] {
    const now = Date.now();
    const dayStart = new Date().setHours(0, 0, 0, 0);
    
    const todayTrades = this.dailyTrades.filter(t => t.timestamp >= dayStart);
    const wins = todayTrades.filter(t => t.pnl > 0);
    const losses = todayTrades.filter(t => t.pnl < 0);
    
    const winRate = todayTrades.length > 0 ? wins.length / todayTrades.length : 0;
    const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0;
    const profitFactor = avgLoss > 0 ? (avgWin * wins.length) / (avgLoss * losses.length) : 0;
    
    return {
      trades: todayTrades.length,
      wins: wins.length,
      losses: losses.length,
      winRate,
      avgWin,
      avgLoss,
      profitFactor,
      sharpeToday: 0, // Would need returns series
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private formatDuration(ms: number): string {
    const hours = Math.floor(ms / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    
    return `${hours}h ${minutes}m`;
  }

  /**
   * Record trade result for performance tracking
   */
  recordTrade(symbol: string, pnl: number): void {
    this.dailyTrades.push({
      timestamp: Date.now(),
      pnl,
      symbol,
    });
    
    // Clean old trades (keep last 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    this.dailyTrades = this.dailyTrades.filter(t => t.timestamp > thirtyDaysAgo);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<OptimizationConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('configUpdated', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): OptimizationConfig {
    return { ...this.config };
  }
}

// Factory function
export function createProfitOptimizer(
  config?: Partial<OptimizationConfig>
): ProfitOptimizer {
  return new ProfitOptimizer(config);
}
