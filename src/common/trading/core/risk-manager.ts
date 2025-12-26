/**
 * Risk Manager - Sistema de Gestão de Risco em 5 Camadas
 * Proteção de patrimônio como prioridade absoluta
 */

import { injectable, inject } from 'inversify';
import { EventEmitter } from 'events';
import {
  RiskParameters,
  RiskAssessment,
  Position,
  TradeDecision,
  Quote,
  PortfolioMetrics,
  CircuitBreaker,
  RiskEvent,
} from './trading-types';

/**
 * Risk Manager - 5 Layer Protection System
 */
@injectable()
export class RiskManager extends EventEmitter {
  private parameters: RiskParameters;
  private currentRisk: RiskAssessment;
  private dailyPnL: number = 0;
  private weeklyPnL: number = 0;
  private monthlyPnL: number = 0;
  private peakEquity: number = 0;
  private currentEquity: number = 0;
  private returnSamples: number[] = [];
  private readonly maxReturnSamples: number = 500;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private riskEvents: RiskEvent[] = [];

  constructor() {
    super();
    this.parameters = this.getDefaultParameters();
    this.currentRisk = this.getDefaultRiskAssessment();
    this.initializeCircuitBreakers();
  }

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * Assess risk for a potential trade
   */
  assessTradeRisk(decision: TradeDecision, portfolio: Position[]): RiskAssessment {
    const assessment: RiskAssessment = {
      overallRisk: 'low',
      score: 0,
      warnings: [],
      blocks: [],
      recommendations: [],
    };

    // Layer 1: Per-Trade Risk
    const tradeRisk = this.assessPerTradeRisk(decision);
    this.mergeRiskAssessment(assessment, tradeRisk);

    // Layer 2: Daily Risk
    const dailyRisk = this.assessDailyRisk();
    this.mergeRiskAssessment(assessment, dailyRisk);

    // Layer 3: Period Risk (weekly/monthly)
    const periodRisk = this.assessPeriodRisk();
    this.mergeRiskAssessment(assessment, periodRisk);

    // Layer 4: Portfolio/Systemic Risk
    const systemicRisk = this.assessSystemicRisk(decision, portfolio);
    this.mergeRiskAssessment(assessment, systemicRisk);

    // Layer 5: Circuit Breakers
    const circuitBreaker = this.checkCircuitBreakers(decision);
    this.mergeRiskAssessment(assessment, circuitBreaker);

    // Calculate overall risk level
    assessment.overallRisk = this.calculateOverallRiskLevel(assessment.score);

    // Store current assessment
    this.currentRisk = assessment;

    // Emit event
    this.emit('riskAssessed', assessment);

    return assessment;
  }

  /**
   * Calculate position size using Kelly Criterion
   */
  calculatePositionSize(
    winRate: number,
    avgWin: number,
    avgLoss: number,
    accountSize: number
  ): { size: number; kellyFraction: number; adjustedFraction: number } {
    // Kelly Criterion: f* = (p * b - q) / b
    // where p = win rate, q = 1 - p, b = avg win / avg loss
    const p = Math.min(0.99, Math.max(0.01, winRate));
    const q = 1 - p;
    const b = avgWin / Math.max(avgLoss, 0.01);

    let kellyFraction = (p * b - q) / b;
    kellyFraction = Math.max(0, kellyFraction);

    // Apply conservative adjustment (half-Kelly or quarter-Kelly)
    const adjustedFraction = kellyFraction * this.parameters.kellyMultiplier;

    // Cap at maximum position size
    const cappedFraction = Math.min(adjustedFraction, this.parameters.perTrade.maxPositionSize);

    // Calculate actual size
    const size = accountSize * cappedFraction;

    return {
      size,
      kellyFraction,
      adjustedFraction: cappedFraction,
    };
  }

  /**
   * Calculate optimal stop loss
   */
  calculateStopLoss(
    entry: number,
    direction: 'long' | 'short',
    volatility: number,
    atr?: number
  ): { price: number; percentage: number; type: 'fixed' | 'atr' | 'volatility' } {
    const { stopLoss } = this.parameters.perTrade;
    let stopPrice: number;
    let stopType: 'fixed' | 'atr' | 'volatility';

    if (atr && stopLoss.useATR) {
      // ATR-based stop loss
      const atrMultiplier = stopLoss.atrMultiplier;
      const stopDistance = atr * atrMultiplier;
      
      if (direction === 'long') {
        stopPrice = entry - stopDistance;
      } else {
        stopPrice = entry + stopDistance;
      }
      stopType = 'atr';
    } else if (stopLoss.useVolatility && volatility > 0) {
      // Volatility-based stop loss
      const stopDistance = entry * volatility * 2; // 2 standard deviations
      
      if (direction === 'long') {
        stopPrice = entry - stopDistance;
      } else {
        stopPrice = entry + stopDistance;
      }
      stopType = 'volatility';
    } else {
      // Fixed percentage stop loss
      const stopPct = stopLoss.defaultPct;
      
      if (direction === 'long') {
        stopPrice = entry * (1 - stopPct);
      } else {
        stopPrice = entry * (1 + stopPct);
      }
      stopType = 'fixed';
    }

    // Ensure minimum stop distance
    const minDistance = entry * 0.001; // 0.1% minimum
    if (Math.abs(stopPrice - entry) < minDistance) {
      stopPrice = direction === 'long' ? entry - minDistance : entry + minDistance;
    }

    const percentage = Math.abs(stopPrice - entry) / entry;

    return {
      price: stopPrice,
      percentage,
      type: stopType,
    };
  }

  /**
   * Update PnL tracking
   */
  updatePnL(pnl: number): void {
    const prevEquity = this.currentEquity;

    this.dailyPnL += pnl;
    this.weeklyPnL += pnl;
    this.monthlyPnL += pnl;
    this.currentEquity += pnl;

    if (prevEquity > 0 && Number.isFinite(prevEquity) && Number.isFinite(pnl)) {
      const r = pnl / prevEquity;
      if (Number.isFinite(r)) {
        this.returnSamples.push(r);
        if (this.returnSamples.length > this.maxReturnSamples) {
          this.returnSamples.splice(0, this.returnSamples.length - this.maxReturnSamples);
        }
      }
    }

    // Update peak equity
    if (this.currentEquity > this.peakEquity) {
      this.peakEquity = this.currentEquity;
    }

    // Check for limit violations
    this.checkPnLLimits();

    // Emit update event
    this.emit('pnlUpdated', {
      daily: this.dailyPnL,
      weekly: this.weeklyPnL,
      monthly: this.monthlyPnL,
      drawdown: this.getCurrentDrawdown(),
    });
  }

  /**
   * Get current drawdown
   */
  getCurrentDrawdown(): number {
    if (this.peakEquity === 0) return 0;
    return (this.peakEquity - this.currentEquity) / this.peakEquity;
  }

  /**
   * Get portfolio metrics
   */
  getPortfolioMetrics(positions: Position[]): PortfolioMetrics {
    const totalValue = positions.reduce((sum, p) => sum + p.marketValue, 0);
    const totalPnL = positions.reduce((sum, p) => sum + (p.unrealizedPnL || 0), 0);
    const realizedPnL = positions.reduce((sum, p) => sum + (p.realizedPnL ?? 0), 0);

    // Calculate concentration risk
    const assetValues = new Map<string, number>();
    positions.forEach(p => {
      const current = assetValues.get(p.assetId) || 0;
      assetValues.set(p.assetId, current + p.marketValue);
    });

    const maxConcentration = totalValue > 0
      ? Math.max(...Array.from(assetValues.values())) / totalValue
      : 0;

    // Calculate correlation risk (simplified)
    const correlationRisk = this.estimateCorrelationRisk(positions);

    const cashValue = this.currentEquity - totalValue;
    const cashRatio = this.currentEquity > 0
      ? Math.min(1, Math.max(0, cashValue / this.currentEquity))
      : 0;

    const sharpeRatio = this.calculateSharpeRatio(this.returnSamples);

    return {
      totalValue,
      totalPnL,
      unrealizedPnL: totalPnL,
      realizedPnL,
      drawdown: this.getCurrentDrawdown(),
      maxDrawdown: this.parameters.period.maxMonthlyDrawdown,
      sharpeRatio,
      concentration: maxConcentration,
      correlationRisk,
      positionCount: positions.length,
      cashRatio,
    };
  }

  private calculateSharpeRatio(returns: number[]): number {
    if (!returns || returns.length < 20) return 0;

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => {
      const d = r - mean;
      return sum + d * d;
    }, 0) / (returns.length - 1);
    const std = Math.sqrt(Math.max(0, variance));
    if (std === 0) return 0;

    return (mean / std) * Math.sqrt(returns.length);
  }

  /**
   * Reset daily counters (call at market open)
   */
  resetDaily(): void {
    this.dailyPnL = 0;
    this.emit('dailyReset');
  }

  /**
   * Reset weekly counters
   */
  resetWeekly(): void {
    this.weeklyPnL = 0;
    this.emit('weeklyReset');
  }

  /**
   * Reset monthly counters
   */
  resetMonthly(): void {
    this.monthlyPnL = 0;
    this.emit('monthlyReset');
  }

  /**
   * Set account equity
   */
  setEquity(equity: number): void {
    this.currentEquity = equity;
    if (equity > this.peakEquity) {
      this.peakEquity = equity;
    }
  }

  /**
   * Trigger circuit breaker manually
   */
  triggerCircuitBreaker(type: string, reason: string): void {
    const breaker = this.circuitBreakers.get(type);
    if (breaker) {
      breaker.triggered = true;
      breaker.reason = reason;
      breaker.triggeredAt = new Date();
      breaker.cooldownEndsAt = new Date(Date.now() + breaker.cooldownPeriod);

      this.emit('circuitBreakerTriggered', { type, reason });
      this.recordRiskEvent('circuit_breaker', 'critical', reason);
    }
  }

  /**
   * Check if trading is allowed
   */
  isTradingAllowed(): { allowed: boolean; reason?: string } {
    // Check circuit breakers
    const breakerEntries = Array.from(this.circuitBreakers.entries());
    for (const [type, breaker] of breakerEntries) {
      if (breaker.triggered) {
        if (breaker.cooldownEndsAt && new Date() < breaker.cooldownEndsAt) {
          const remaining = Math.ceil((breaker.cooldownEndsAt.getTime() - Date.now()) / 60000);
          return {
            allowed: false,
            reason: `Circuit breaker ativo: ${type} (${remaining} min restantes)`,
          };
        } else {
          // Cooldown ended, reset breaker
          breaker.triggered = false;
          breaker.reason = undefined;
          breaker.triggeredAt = undefined;
          breaker.cooldownEndsAt = undefined;
        }
      }
    }

    // Check daily loss limit
    const dailyLossLimit = this.currentEquity * this.parameters.daily.maxDailyLoss;
    if (Math.abs(this.dailyPnL) > dailyLossLimit && this.dailyPnL < 0) {
      return {
        allowed: false,
        reason: `Limite diário de perda atingido (${(this.parameters.daily.maxDailyLoss * 100).toFixed(1)}%)`,
      };
    }

    // Check drawdown limit
    const currentDrawdown = this.getCurrentDrawdown();
    if (currentDrawdown > this.parameters.period.maxMonthlyDrawdown) {
      return {
        allowed: false,
        reason: `Drawdown máximo atingido (${(currentDrawdown * 100).toFixed(1)}%)`,
      };
    }

    return { allowed: true };
  }

  /**
   * Get risk events history
   */
  getRiskEvents(limit: number = 100): RiskEvent[] {
    return this.riskEvents.slice(-limit);
  }

  /**
   * Update risk parameters
   */
  updateParameters(params: Partial<RiskParameters>): void {
    this.parameters = { ...this.parameters, ...params };
    this.emit('parametersUpdated', this.parameters);
  }

  /**
   * Get current risk parameters (snapshot)
   */
  getParameters(): RiskParameters {
    return { ...this.parameters };
  }

  /**
   * Get current PnL/equity snapshot
   */
  getPnLSummary(): { dailyPnL: number; weeklyPnL: number; monthlyPnL: number; currentEquity: number; peakEquity: number; drawdown: number } {
    return {
      dailyPnL: this.dailyPnL,
      weeklyPnL: this.weeklyPnL,
      monthlyPnL: this.monthlyPnL,
      currentEquity: this.currentEquity,
      peakEquity: this.peakEquity,
      drawdown: this.getCurrentDrawdown(),
    };
  }

  /**
   * Get circuit breaker status list (snapshot)
   */
  getCircuitBreakerStatus(): Array<{ type: string; triggered: boolean; cooldownEndsAt?: Date; reason?: string }> {
    return Array.from(this.circuitBreakers.entries()).map(([type, breaker]) => ({
      type,
      triggered: breaker.triggered,
      cooldownEndsAt: breaker.cooldownEndsAt,
      reason: breaker.reason,
    }));
  }

  // ============================================
  // PRIVATE METHODS - Layer Assessments
  // ============================================

  private assessPerTradeRisk(decision: TradeDecision): Partial<RiskAssessment> {
    const warnings: string[] = [];
    const blocks: string[] = [];
    let score = 0;

    // Check position size
    const maxSize = this.parameters.perTrade.maxPositionSize;
    if (decision.size && decision.size > maxSize) {
      blocks.push(`Tamanho da posição (${(decision.size * 100).toFixed(1)}%) excede limite (${(maxSize * 100).toFixed(1)}%)`);
      score += 50;
    } else if (decision.size && decision.size > maxSize * 0.8) {
      warnings.push(`Tamanho da posição próximo do limite`);
      score += 20;
    }

    // Check stop loss
    const decisionPrice = decision.price ?? 0;
    if (!decision.stopLoss) {
      warnings.push('Operação sem stop loss definido');
      score += 30;
    } else if (decisionPrice > 0) {
      const maxLoss = this.parameters.perTrade.maxLossPerTrade;
      const potentialLoss = Math.abs(decisionPrice - decision.stopLoss) / decisionPrice;
      if (potentialLoss > maxLoss) {
        blocks.push(`Perda potencial (${(potentialLoss * 100).toFixed(1)}%) excede limite (${(maxLoss * 100).toFixed(1)}%)`);
        score += 40;
      }
    }

    // Check risk/reward ratio
    if (decision.takeProfit && decision.stopLoss && decisionPrice > 0) {
      const risk = Math.abs(decisionPrice - decision.stopLoss);
      const reward = Math.abs(decision.takeProfit - decisionPrice);
      const ratio = reward / risk;

      const minRatio = this.parameters.perTrade.minRiskRewardRatio;
      if (ratio < minRatio) {
        warnings.push(`Razão risco/retorno (${ratio.toFixed(2)}) abaixo do mínimo (${minRatio})`);
        score += 15;
      }
    }

    return { warnings, blocks, score };
  }

  private assessDailyRisk(): Partial<RiskAssessment> {
    const warnings: string[] = [];
    const blocks: string[] = [];
    let score = 0;

    const dailyLossLimit = this.currentEquity * this.parameters.daily.maxDailyLoss;
    const dailyLossPct = Math.abs(this.dailyPnL) / this.currentEquity;

    if (this.dailyPnL < 0) {
      if (dailyLossPct > this.parameters.daily.maxDailyLoss) {
        blocks.push(`Limite diário de perda atingido`);
        score += 100;
      } else if (dailyLossPct > this.parameters.daily.maxDailyLoss * 0.8) {
        warnings.push(`Perda diária próxima do limite (${(dailyLossPct * 100).toFixed(1)}%)`);
        score += 30;
      } else if (dailyLossPct > this.parameters.daily.maxDailyLoss * 0.5) {
        warnings.push(`Perda diária moderada (${(dailyLossPct * 100).toFixed(1)}%)`);
        score += 15;
      }
    }

    return { warnings, blocks, score };
  }

  private assessPeriodRisk(): Partial<RiskAssessment> {
    const warnings: string[] = [];
    const blocks: string[] = [];
    let score = 0;

    // Weekly drawdown
    const weeklyDrawdown = Math.abs(this.weeklyPnL) / this.currentEquity;
    if (this.weeklyPnL < 0 && weeklyDrawdown > this.parameters.period.maxWeeklyDrawdown) {
      blocks.push(`Drawdown semanal máximo atingido (${(weeklyDrawdown * 100).toFixed(1)}%)`);
      score += 80;
    }

    // Monthly drawdown
    const monthlyDrawdown = Math.abs(this.monthlyPnL) / this.currentEquity;
    if (this.monthlyPnL < 0 && monthlyDrawdown > this.parameters.period.maxMonthlyDrawdown) {
      blocks.push(`Drawdown mensal máximo atingido (${(monthlyDrawdown * 100).toFixed(1)}%)`);
      score += 100;
    }

    // Overall drawdown from peak
    const drawdownFromPeak = this.getCurrentDrawdown();
    if (drawdownFromPeak > this.parameters.period.maxMonthlyDrawdown) {
      blocks.push(`Drawdown do pico máximo atingido (${(drawdownFromPeak * 100).toFixed(1)}%)`);
      score += 100;
    }

    return { warnings, blocks, score };
  }

  private assessSystemicRisk(decision: TradeDecision, portfolio: Position[]): Partial<RiskAssessment> {
    const warnings: string[] = [];
    const blocks: string[] = [];
    const recommendations: string[] = [];
    let score = 0;

    // Check concentration
    const { maxConcentrationPerAsset, maxSectorConcentration } = this.parameters.systemic;
    
    // Calculate current concentration
    const totalValue = portfolio.reduce((sum, p) => sum + p.marketValue, 0);
    const assetConcentration = new Map<string, number>();
    
    portfolio.forEach(p => {
      const current = assetConcentration.get(p.assetId) || 0;
      assetConcentration.set(p.assetId, current + p.marketValue / totalValue);
    });

    // Check if new position would exceed concentration
    if (decision.assetId) {
      const currentConcentration = assetConcentration.get(decision.assetId) || 0;
      const newConcentration = currentConcentration + (decision.size || 0);
      
      if (newConcentration > maxConcentrationPerAsset) {
        warnings.push(`Concentração no ativo excederia limite (${(newConcentration * 100).toFixed(1)}%)`);
        score += 25;
        recommendations.push(`Considere reduzir o tamanho da posição para ${((maxConcentrationPerAsset - currentConcentration) * 100).toFixed(1)}%`);
      }
    }

    // Check minimum cash reserve
    const cashRatio = 1 - (totalValue / this.currentEquity);
    if (cashRatio < this.parameters.systemic.minCashReserve) {
      warnings.push(`Reserva de caixa abaixo do mínimo (${(cashRatio * 100).toFixed(1)}%)`);
      score += 20;
    }

    // Correlation risk
    const correlationRisk = this.estimateCorrelationRisk(portfolio);
    if (correlationRisk > 0.7) {
      warnings.push(`Alta correlação entre posições (${(correlationRisk * 100).toFixed(0)}%)`);
      score += 15;
      recommendations.push('Considere diversificar para ativos menos correlacionados');
    }

    return { warnings, blocks, score, recommendations };
  }

  private checkCircuitBreakers(decision: TradeDecision): Partial<RiskAssessment> {
    const warnings: string[] = [];
    const blocks: string[] = [];
    let score = 0;

    // Check each circuit breaker
    const breakerEntries = Array.from(this.circuitBreakers.entries());
    for (const [type, breaker] of breakerEntries) {
      if (breaker.triggered) {
        if (breaker.cooldownEndsAt && new Date() < breaker.cooldownEndsAt) {
          blocks.push(`Circuit breaker ${type} ativo: ${breaker.reason}`);
          score += 100;
        }
      }

      // Check thresholds
      if (type === 'flash_crash' && decision.price) {
        // Would need market data to check for flash crash
      }

      if (type === 'volatility_spike') {
        // Would check VIX or asset volatility
      }

      if (type === 'daily_loss') {
        const dailyLossPct = Math.abs(this.dailyPnL) / this.currentEquity;
        if (this.dailyPnL < 0 && dailyLossPct > breaker.threshold) {
          if (!breaker.triggered) {
            this.triggerCircuitBreaker(type, `Perda diária de ${(dailyLossPct * 100).toFixed(1)}%`);
          }
          blocks.push(`Circuit breaker de perda diária ativado`);
          score += 100;
        }
      }
    }

    return { warnings, blocks, score };
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  private mergeRiskAssessment(target: RiskAssessment, source: Partial<RiskAssessment>): void {
    if (source.warnings) target.warnings.push(...source.warnings);
    if (source.blocks) target.blocks.push(...source.blocks);
    if (source.recommendations) target.recommendations.push(...source.recommendations);
    if (source.score) target.score += source.score;
  }

  private calculateOverallRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 80) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
  }

  private estimateCorrelationRisk(positions: Position[]): number {
    // Simplified correlation estimation
    // In production, would use actual correlation matrix
    if (positions.length < 2) return 0;

    // Count positions in same market/sector
    const markets = new Map<string, number>();
    positions.forEach(p => {
      const market = p.metadata?.market || 'unknown';
      markets.set(market, (markets.get(market) || 0) + 1);
    });

    // Highest concentration in single market = higher correlation risk
    const maxInMarket = Math.max(...Array.from(markets.values()));
    return maxInMarket / positions.length;
  }

  private checkPnLLimits(): void {
    const dailyLossPct = Math.abs(this.dailyPnL) / this.currentEquity;
    
    // Record risk events
    if (this.dailyPnL < 0 && dailyLossPct > this.parameters.daily.maxDailyLoss * 0.5) {
      this.recordRiskEvent('daily_loss_warning', 'warning', 
        `Perda diária em ${(dailyLossPct * 100).toFixed(1)}%`);
    }

    if (this.dailyPnL < 0 && dailyLossPct > this.parameters.daily.maxDailyLoss) {
      this.recordRiskEvent('daily_loss_limit', 'critical',
        `Limite de perda diária atingido`);
      this.triggerCircuitBreaker('daily_loss', 'Limite de perda diária atingido');
    }
  }

  private recordRiskEvent(type: string, severity: 'info' | 'warning' | 'critical', message: string): void {
    this.riskEvents.push({
      type,
      severity,
      message,
      timestamp: new Date(),
      data: {
        dailyPnL: this.dailyPnL,
        weeklyPnL: this.weeklyPnL,
        monthlyPnL: this.monthlyPnL,
        drawdown: this.getCurrentDrawdown(),
      },
    });

    // Keep only last 1000 events
    if (this.riskEvents.length > 1000) {
      this.riskEvents = this.riskEvents.slice(-1000);
    }

    this.emit('riskEvent', this.riskEvents[this.riskEvents.length - 1]);
  }

  private initializeCircuitBreakers(): void {
    this.circuitBreakers.set('flash_crash', {
      type: 'flash_crash',
      threshold: 0.05, // 5% move in short period
      cooldownPeriod: 30 * 60 * 1000, // 30 minutes
      triggered: false,
    });

    this.circuitBreakers.set('volatility_spike', {
      type: 'volatility_spike',
      threshold: 0.03, // 3x normal volatility
      cooldownPeriod: 60 * 60 * 1000, // 1 hour
      triggered: false,
    });

    this.circuitBreakers.set('daily_loss', {
      type: 'daily_loss',
      threshold: 0.05, // 5% daily loss
      cooldownPeriod: 24 * 60 * 60 * 1000, // 24 hours
      triggered: false,
    });

    this.circuitBreakers.set('consecutive_losses', {
      type: 'consecutive_losses',
      threshold: 5, // 5 consecutive losses
      cooldownPeriod: 2 * 60 * 60 * 1000, // 2 hours
      triggered: false,
    });

    this.circuitBreakers.set('error_rate', {
      type: 'error_rate',
      threshold: 0.1, // 10% error rate
      cooldownPeriod: 15 * 60 * 1000, // 15 minutes
      triggered: false,
    });
  }

  private getDefaultParameters(): RiskParameters {
    return {
      perTrade: {
        maxPositionSize: 0.05, // 5% of portfolio
        maxLossPerTrade: 0.02, // 2% of portfolio
        minRiskRewardRatio: 1.5,
        requireStopLoss: true,
        stopLoss: {
          defaultPct: 0.02,
          useATR: true,
          atrMultiplier: 2.0,
          useVolatility: true,
        },
      },
      daily: {
        maxDailyLoss: 0.05, // 5%
        maxTradesPerDay: 20,
        coolingPeriodAfterLoss: 30 * 60 * 1000, // 30 minutes
      },
      period: {
        maxWeeklyDrawdown: 0.10, // 10%
        maxMonthlyDrawdown: 0.15, // 15%
      },
      systemic: {
        maxConcentrationPerAsset: 0.20, // 20%
        maxSectorConcentration: 0.40, // 40%
        maxCorrelation: 0.70,
        minCashReserve: 0.10, // 10%
      },
      kellyMultiplier: 0.25, // Quarter-Kelly for safety
    };
  }

  private getDefaultRiskAssessment(): RiskAssessment {
    return {
      overallRisk: 'low',
      score: 0,
      warnings: [],
      blocks: [],
      recommendations: [],
    };
  }
}
