/**
 * Backtesting Engine
 * Sistema completo de backtesting para validação de estratégias
 * Replay histórico, walk-forward optimization, Monte Carlo simulation
 */

import { EventEmitter } from 'events';
import {
  OHLCV,
  Order,
  Position,
  TradeDecision,
  Quote,
} from './trading-types';
import { technicalIndicators, ComprehensiveIndicators } from './technical-indicators';
import { patternRecognition, PatternScanResult, DetectedPattern } from './pattern-recognition';
import { MarketSnapshot } from './ai-market-vision';

// ============================================
// BACKTESTING TYPES
// ============================================

export interface BacktestConfig {
  // Data settings
  startDate: Date;
  endDate: Date;
  timeframe: string;
  symbols: string[];
  
  // Capital settings
  initialCapital: number;
  commission: number; // Per trade in %
  slippage: number; // Estimated slippage in %
  
  // Position settings
  maxPositions: number;
  maxPositionSize: number; // % of capital
  useCompounding: boolean;
  
  // Risk settings
  maxDrawdown: number; // % max drawdown before stopping
  riskPerTrade: number; // % risk per trade
  
  // Simulation settings
  includeWeekends: boolean;
  useFractionalShares: boolean;
  accountForSpread: boolean;
  spreadBps: number; // Spread in basis points
}

export interface BacktestTrade {
  id: string;
  symbol: string;
  
  // Entry
  entryTime: Date;
  entryPrice: number;
  entryReason: string;
  
  // Exit
  exitTime?: Date;
  exitPrice?: number;
  exitReason?: string;
  
  // Position
  side: 'long' | 'short';
  quantity: number;
  stopLoss: number;
  takeProfit: number;
  
  // Results
  pnl?: number;
  pnlPercent?: number;
  holdingPeriod?: number; // in bars
  
  // Analysis
  maxFavorable?: number; // MAE
  maxAdverse?: number; // MFE
  efficiency?: number; // How much of the move was captured
}

export interface BacktestMetrics {
  // Returns
  totalReturn: number;
  totalReturnPercent: number;
  annualizedReturn: number;
  cagr: number;
  
  // Risk
  maxDrawdown: number;
  maxDrawdownPercent: number;
  maxDrawdownDuration: number; // days
  volatility: number; // annualized
  downside_deviation: number;
  
  // Risk-adjusted returns
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  
  // Trade statistics
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  
  // Profit metrics
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  expectancy: number;
  payoffRatio: number;
  
  // Consistency
  bestTrade: number;
  worstTrade: number;
  avgTrade: number;
  stdDevTrades: number;
  
  // Time analysis
  avgHoldingPeriod: number;
  avgWinHoldingPeriod: number;
  avgLossHoldingPeriod: number;
  
  // Streaks
  maxWinStreak: number;
  maxLossStreak: number;
  currentStreak: number;
  
  // Recovery
  avgRecoveryTime: number;
  recoveryFactor: number;
}

export interface EquityCurve {
  timestamp: Date;
  equity: number;
  drawdown: number;
  drawdownPercent: number;
  positionCount: number;
  cashAvailable: number;
}

export interface BacktestResult {
  config: BacktestConfig;
  metrics: BacktestMetrics;
  trades: BacktestTrade[];
  equityCurve: EquityCurve[];
  
  // Period analysis
  monthlyReturns: Map<string, number>;
  yearlyReturns: Map<string, number>;
  
  // Statistical analysis
  confidence: {
    level95: { lower: number; upper: number };
    level99: { lower: number; upper: number };
  };
  
  // Execution info
  executionTime: number;
  barsProcessed: number;
  signalsGenerated: number;
}

export interface WalkForwardResult {
  inSamplePeriods: BacktestResult[];
  outOfSamplePeriods: BacktestResult[];
  
  // Overall performance
  combinedMetrics: BacktestMetrics;
  robustnessScore: number;
  
  // Comparison
  inSampleReturn: number;
  outOfSampleReturn: number;
  degradation: number; // OOS vs IS performance difference
}

export interface MonteCarloResult {
  simulations: number;
  
  // Distribution of returns
  returnDistribution: {
    mean: number;
    median: number;
    std: number;
    percentile5: number;
    percentile25: number;
    percentile75: number;
    percentile95: number;
  };
  
  // Distribution of drawdowns
  drawdownDistribution: {
    mean: number;
    median: number;
    std: number;
    percentile5: number;
    percentile95: number;
  };
  
  // Risk metrics
  probabilityOfRuin: number;
  probabilityOfTarget: number;
  valueAtRisk95: number;
  conditionalVaR95: number;
}

export interface StrategySignal {
  symbol: string;
  timestamp: Date;
  action: 'buy' | 'sell' | 'close_long' | 'close_short' | 'none';
  price: number;
  stopLoss?: number;
  takeProfit?: number;
  confidence: number;
  reason: string;
}

export type StrategyFunction = (
  data: OHLCV[],
  indicators: ComprehensiveIndicators,
  patterns: PatternScanResult,
  currentPosition: Position | null
) => StrategySignal;

// ============================================
// BACKTESTING ENGINE
// ============================================

export class BacktestingEngine extends EventEmitter {
  private config: BacktestConfig;
  private historicalData: Map<string, OHLCV[]> = new Map();
  private currentEquity: number = 0;
  private peakEquity: number = 0;
  private positions: Map<string, Position> = new Map();
  private trades: BacktestTrade[] = [];
  private equityCurve: EquityCurve[] = [];
  private tradeIdCounter: number = 0;

  constructor(config: BacktestConfig) {
    super();
    this.config = config;
    this.currentEquity = config.initialCapital;
    this.peakEquity = config.initialCapital;
  }

  // ============================================
  // DATA LOADING
  // ============================================

  /**
   * Load historical data for backtesting
   */
  loadData(symbol: string, data: OHLCV[]): void {
    // Filter data by date range
    const filtered = data.filter(candle => {
      const candleTime = new Date(candle.timestamp);
      return candleTime >= this.config.startDate && candleTime <= this.config.endDate;
    });
    
    // Sort by timestamp
    filtered.sort((a, b) => a.timestamp - b.timestamp);
    
    this.historicalData.set(symbol, filtered);
    this.emit('dataLoaded', { symbol, bars: filtered.length });
  }

  /**
   * Generate synthetic data for testing
   */
  generateSyntheticData(
    symbol: string,
    startPrice: number,
    volatility: number,
    trend: number,
    bars: number
  ): OHLCV[] {
    const data: OHLCV[] = [];
    let price = startPrice;
    let timestamp = this.config.startDate.getTime();
    const msPerBar = this.getBarDurationMs();
    
    for (let i = 0; i < bars; i++) {
      // Random walk with drift
      const change = (Math.random() - 0.5) * 2 * volatility + trend;
      price = price * (1 + change);
      
      // Generate OHLC
      const open = price;
      const high = price * (1 + Math.random() * volatility);
      const low = price * (1 - Math.random() * volatility);
      const close = low + Math.random() * (high - low);
      const volume = Math.floor(Math.random() * 1000000 + 100000);
      
      data.push({
        timestamp: timestamp,
        open,
        high,
        low,
        close,
        volume,
      });
      
      price = close;
      timestamp += msPerBar;
    }
    
    this.loadData(symbol, data);
    return data;
  }

  /**
   * Get bar duration in milliseconds
   */
  private getBarDurationMs(): number {
    const timeframe = this.config.timeframe;
    
    if (timeframe.includes('m')) {
      return parseInt(timeframe) * 60 * 1000;
    } else if (timeframe.includes('h')) {
      return parseInt(timeframe) * 60 * 60 * 1000;
    } else if (timeframe.includes('d')) {
      return parseInt(timeframe) * 24 * 60 * 60 * 1000;
    }
    
    return 60 * 60 * 1000; // Default 1 hour
  }

  // ============================================
  // MAIN BACKTEST EXECUTION
  // ============================================

  /**
   * Run backtest with a strategy function
   */
  async runBacktest(strategy: StrategyFunction): Promise<BacktestResult> {
    const startTime = Date.now();
    
    // Reset state
    this.reset();
    
    let barsProcessed = 0;
    let signalsGenerated = 0;
    
    // Get all bars sorted by timestamp
    const allBars = this.getAllBarsSorted();
    
    for (let i = 50; i < allBars.length; i++) {
      const bar = allBars[i];
      const symbol = bar.symbol;
      const symbolData = this.historicalData.get(symbol);
      
      if (!symbolData) continue;
      
      // Get data up to current bar
      const currentData = symbolData.slice(0, i + 1);
      
      // Update internal caches with current data
      technicalIndicators.updateData(symbol, currentData);
      patternRecognition.updateData(symbol, currentData);
      
      // Calculate indicators (using cached data)
      const indicators = technicalIndicators.generateComprehensiveAnalysis(symbol, {
        symbol,
        bid: bar.close * 0.9999,
        ask: bar.close * 1.0001,
        bidSize: 100,
        askSize: 100,
        last: bar.close,
        lastSize: 100,
        volume: bar.volume,
        timestamp: bar.timestamp,
      });
      
      // Detect patterns
      const patterns = patternRecognition.scanAllPatterns(symbol, this.config.timeframe as any);
      
      // Get current position for this symbol
      const currentPosition = this.positions.get(symbol) || null;
      
      // Get strategy signal (handle null indicators)
      if (!indicators) continue;
      const signal = strategy(currentData, indicators, patterns, currentPosition);
      
      if (signal.action !== 'none') {
        signalsGenerated++;
        this.processSignal(signal, bar);
      }
      
      // Update open positions (check stops)
      this.updatePositions(bar);
      
      // Record equity curve
      this.recordEquityCurve(bar);
      
      barsProcessed++;
      
      // Emit progress
      if (barsProcessed % 1000 === 0) {
        this.emit('progress', { processed: barsProcessed, total: allBars.length });
      }
      
      // Check max drawdown
      const drawdownPercent = (this.peakEquity - this.currentEquity) / this.peakEquity;
      if (drawdownPercent > this.config.maxDrawdown) {
        this.emit('maxDrawdownReached', { drawdown: drawdownPercent });
        break;
      }
    }
    
    // Close all remaining positions
    this.closeAllPositions(allBars[allBars.length - 1]);
    
    // Calculate metrics
    const metrics = this.calculateMetrics();
    
    // Build result
    const result: BacktestResult = {
      config: this.config,
      metrics,
      trades: this.trades,
      equityCurve: this.equityCurve,
      monthlyReturns: this.calculateMonthlyReturns(),
      yearlyReturns: this.calculateYearlyReturns(),
      confidence: this.calculateConfidenceIntervals(),
      executionTime: Date.now() - startTime,
      barsProcessed,
      signalsGenerated,
    };
    
    this.emit('backtestComplete', result);
    return result;
  }

  /**
   * Get all bars from all symbols sorted by timestamp
   */
  private getAllBarsSorted(): Array<OHLCV & { symbol: string }> {
    const allBars: Array<OHLCV & { symbol: string }> = [];
    
    for (const [symbol, data] of this.historicalData) {
      for (const bar of data) {
        allBars.push({ ...bar, symbol });
      }
    }
    
    return allBars.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Process a strategy signal
   */
  private processSignal(signal: StrategySignal, bar: OHLCV & { symbol: string }): void {
    const symbol = signal.symbol;
    const existingPosition = this.positions.get(symbol);
    
    // Apply slippage and commission
    const executionPrice = this.applySlippage(
      signal.price,
      signal.action === 'buy' ? 'buy' : 'sell'
    );
    
    if (signal.action === 'buy' && !existingPosition) {
      this.openPosition(signal, bar, executionPrice, 'long');
    } else if (signal.action === 'sell' && !existingPosition) {
      this.openPosition(signal, bar, executionPrice, 'short');
    } else if (signal.action === 'close_long' && existingPosition?.side === 'long') {
      this.closePosition(existingPosition, bar, executionPrice, signal.reason);
    } else if (signal.action === 'close_short' && existingPosition?.side === 'short') {
      this.closePosition(existingPosition, bar, executionPrice, signal.reason);
    }
  }

  /**
   * Open a new position
   */
  private openPosition(
    signal: StrategySignal,
    bar: OHLCV & { symbol: string },
    price: number,
    side: 'long' | 'short'
  ): void {
    // Check position limits
    if (this.positions.size >= this.config.maxPositions) {
      return;
    }
    
    // Calculate position size
    const positionValue = this.calculatePositionSize(price, signal.stopLoss);
    const quantity = this.config.useFractionalShares 
      ? positionValue / price 
      : Math.floor(positionValue / price);
    
    if (quantity <= 0) return;
    
    // Check if we have enough capital
    const cost = quantity * price * (1 + this.config.commission);
    if (cost > this.currentEquity * 0.95) {
      return;
    }
    
    // Create position
    const position: Position = {
      id: `pos_${++this.tradeIdCounter}`,
      symbol: signal.symbol,
      assetId: signal.symbol,
      side,
      quantity,
      averagePrice: price,
      averageEntryPrice: price,
      marketValue: quantity * price,
      costBasis: quantity * price,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      currentPrice: price,
      stopLoss: signal.stopLoss,
      takeProfit: signal.takeProfit,
      openedAt: bar.timestamp,
    };
    
    this.positions.set(signal.symbol, position);
    
    // Deduct cost from equity
    this.currentEquity -= cost;
    
    // Create trade record
    const trade: BacktestTrade = {
      id: position.id,
      symbol: signal.symbol,
      entryTime: new Date(bar.timestamp),
      entryPrice: price,
      entryReason: signal.reason,
      side,
      quantity,
      stopLoss: signal.stopLoss || 0,
      takeProfit: signal.takeProfit || 0,
      maxFavorable: 0,
      maxAdverse: 0,
    };
    
    this.trades.push(trade);
    
    this.emit('positionOpened', { position, trade });
  }

  /**
   * Close a position
   */
  private closePosition(
    position: Position,
    bar: OHLCV & { symbol: string },
    price: number,
    reason: string
  ): void {
    const symbol = position.symbol || position.assetId;
    
    // Calculate P&L
    const pnl = position.side === 'long'
      ? (price - position.averagePrice) * position.quantity
      : (position.averagePrice - price) * position.quantity;
    
    // Deduct commission
    const commission = position.quantity * price * this.config.commission;
    const netPnl = pnl - commission;
    
    // Update equity
    this.currentEquity += position.marketValue + netPnl;
    
    // Update peak equity
    if (this.currentEquity > this.peakEquity) {
      this.peakEquity = this.currentEquity;
    }
    
    // Update trade record
    const trade = this.trades.find(t => t.id === position.id);
    if (trade) {
      trade.exitTime = new Date(bar.timestamp);
      trade.exitPrice = price;
      trade.exitReason = reason;
      trade.pnl = netPnl;
      trade.pnlPercent = position.costBasis ? (netPnl / position.costBasis) * 100 : 0;
      trade.holdingPeriod = this.calculateHoldingPeriod(trade.entryTime, trade.exitTime);
      trade.efficiency = this.calculateTradeEfficiency(trade);
    }
    
    // Remove position
    this.positions.delete(symbol);
    
    this.emit('positionClosed', { position, pnl: netPnl, reason });
  }

  /**
   * Update all open positions
   */
  private updatePositions(bar: OHLCV & { symbol: string }): void {
    const position = this.positions.get(bar.symbol);
    if (!position) return;
    
    const currentPrice = bar.close;
    const isLong = position.side === 'long';
    
    // Update position values
    position.currentPrice = currentPrice;
    position.marketValue = position.quantity * currentPrice;
    position.unrealizedPnL = isLong
      ? (currentPrice - position.averagePrice) * position.quantity
      : (position.averagePrice - currentPrice) * position.quantity;
    position.unrealizedPnLPercent = position.costBasis ? (position.unrealizedPnL / position.costBasis) * 100 : 0;
    
    // Update trade MAE/MFE
    const trade = this.trades.find(t => t.id === position.id && !t.exitTime);
    if (trade) {
      const favorableMove = isLong ? bar.high - trade.entryPrice : trade.entryPrice - bar.low;
      const adverseMove = isLong ? trade.entryPrice - bar.low : bar.high - trade.entryPrice;
      
      trade.maxFavorable = Math.max(trade.maxFavorable || 0, favorableMove);
      trade.maxAdverse = Math.max(trade.maxAdverse || 0, adverseMove);
    }
    
    // Check stop loss
    if (position.stopLoss) {
      const stopHit = isLong ? bar.low <= position.stopLoss : bar.high >= position.stopLoss;
      if (stopHit) {
        this.closePosition(position, bar, position.stopLoss, 'Stop Loss');
        return;
      }
    }
    
    // Check take profit
    if (position.takeProfit) {
      const tpHit = isLong ? bar.high >= position.takeProfit : bar.low <= position.takeProfit;
      if (tpHit) {
        this.closePosition(position, bar, position.takeProfit, 'Take Profit');
        return;
      }
    }
  }

  /**
   * Close all remaining positions at end of backtest
   */
  private closeAllPositions(lastBar: OHLCV & { symbol: string }): void {
    for (const [symbol, position] of this.positions) {
      const symbolData = this.historicalData.get(symbol);
      const lastSymbolBar = symbolData?.[symbolData.length - 1];
      
      if (lastSymbolBar) {
        this.closePosition(
          position,
          { ...lastSymbolBar, symbol },
          lastSymbolBar.close,
          'End of Backtest'
        );
      }
    }
  }

  /**
   * Record current equity state
   */
  private recordEquityCurve(bar: OHLCV & { symbol: string }): void {
    // Calculate total equity including open positions
    let totalEquity = this.currentEquity;
    for (const position of this.positions.values()) {
      totalEquity += position.unrealizedPnL || 0;
    }
    
    const drawdown = this.peakEquity - totalEquity;
    const drawdownPercent = drawdown / this.peakEquity;
    
    this.equityCurve.push({
      timestamp: new Date(bar.timestamp),
      equity: totalEquity,
      drawdown,
      drawdownPercent,
      positionCount: this.positions.size,
      cashAvailable: this.currentEquity,
    });
  }

  // ============================================
  // METRICS CALCULATION
  // ============================================

  /**
   * Calculate all performance metrics
   */
  private calculateMetrics(): BacktestMetrics {
    const completedTrades = this.trades.filter(t => t.exitTime);
    const wins = completedTrades.filter(t => (t.pnl || 0) > 0);
    const losses = completedTrades.filter(t => (t.pnl || 0) <= 0);
    
    // Returns
    const totalReturn = this.currentEquity - this.config.initialCapital;
    const totalReturnPercent = (totalReturn / this.config.initialCapital) * 100;
    const tradingDays = this.getTradingDays();
    const annualizedReturn = this.calculateAnnualizedReturn(totalReturnPercent, tradingDays);
    
    // Drawdown
    const { maxDrawdown, maxDrawdownPercent, maxDrawdownDuration } = this.calculateDrawdownMetrics();
    
    // Volatility
    const { volatility, downsideDeviation } = this.calculateVolatilityMetrics();
    
    // Trade statistics
    const winRate = completedTrades.length > 0 ? wins.length / completedTrades.length : 0;
    const avgWin = wins.length > 0 
      ? wins.reduce((s, t) => s + (t.pnlPercent || 0), 0) / wins.length 
      : 0;
    const avgLoss = losses.length > 0 
      ? Math.abs(losses.reduce((s, t) => s + (t.pnlPercent || 0), 0) / losses.length)
      : 0;
    
    const profitFactor = avgLoss > 0 
      ? (avgWin * wins.length) / (avgLoss * losses.length || 1)
      : avgWin > 0 ? Infinity : 0;
    
    const expectancy = winRate * avgWin - (1 - winRate) * avgLoss;
    const payoffRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;
    
    // Risk-adjusted returns
    const sharpeRatio = volatility > 0 ? (annualizedReturn - 2) / volatility : 0; // 2% risk-free rate
    const sortinoRatio = downsideDeviation > 0 ? (annualizedReturn - 2) / downsideDeviation : 0;
    const calmarRatio = maxDrawdownPercent > 0 ? annualizedReturn / (maxDrawdownPercent * 100) : 0;
    
    // Trade metrics
    const tradeReturns = completedTrades.map(t => t.pnlPercent || 0);
    const avgTrade = tradeReturns.length > 0 
      ? tradeReturns.reduce((s, r) => s + r, 0) / tradeReturns.length 
      : 0;
    const stdDevTrades = this.calculateStdDev(tradeReturns);
    
    // Streaks
    const { maxWinStreak, maxLossStreak, currentStreak } = this.calculateStreaks(completedTrades);
    
    // Holding periods
    const avgHoldingPeriod = completedTrades.length > 0
      ? completedTrades.reduce((s, t) => s + (t.holdingPeriod || 0), 0) / completedTrades.length
      : 0;
    const avgWinHoldingPeriod = wins.length > 0
      ? wins.reduce((s, t) => s + (t.holdingPeriod || 0), 0) / wins.length
      : 0;
    const avgLossHoldingPeriod = losses.length > 0
      ? losses.reduce((s, t) => s + (t.holdingPeriod || 0), 0) / losses.length
      : 0;
    
    // Recovery
    const avgRecoveryTime = this.calculateAverageRecoveryTime();
    const recoveryFactor = maxDrawdown > 0 ? totalReturn / maxDrawdown : 0;
    
    return {
      totalReturn,
      totalReturnPercent,
      annualizedReturn,
      cagr: annualizedReturn, // Simplified
      maxDrawdown,
      maxDrawdownPercent,
      maxDrawdownDuration,
      volatility,
      downside_deviation: downsideDeviation,
      sharpeRatio,
      sortinoRatio,
      calmarRatio,
      totalTrades: completedTrades.length,
      winningTrades: wins.length,
      losingTrades: losses.length,
      winRate,
      avgWin,
      avgLoss,
      profitFactor,
      expectancy,
      payoffRatio,
      bestTrade: Math.max(...tradeReturns, 0),
      worstTrade: Math.min(...tradeReturns, 0),
      avgTrade,
      stdDevTrades,
      avgHoldingPeriod,
      avgWinHoldingPeriod,
      avgLossHoldingPeriod,
      maxWinStreak,
      maxLossStreak,
      currentStreak,
      avgRecoveryTime,
      recoveryFactor,
    };
  }

  /**
   * Calculate drawdown metrics
   */
  private calculateDrawdownMetrics(): { 
    maxDrawdown: number; 
    maxDrawdownPercent: number; 
    maxDrawdownDuration: number 
  } {
    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;
    let maxDrawdownDuration = 0;
    let currentDrawdownStart: Date | null = null;
    
    for (const point of this.equityCurve) {
      if (point.drawdown > maxDrawdown) {
        maxDrawdown = point.drawdown;
        maxDrawdownPercent = point.drawdownPercent;
      }
      
      if (point.drawdownPercent > 0.001) {
        if (!currentDrawdownStart) {
          currentDrawdownStart = point.timestamp;
        }
      } else {
        if (currentDrawdownStart) {
          const duration = (point.timestamp.getTime() - currentDrawdownStart.getTime()) / (24 * 60 * 60 * 1000);
          maxDrawdownDuration = Math.max(maxDrawdownDuration, duration);
          currentDrawdownStart = null;
        }
      }
    }
    
    return { maxDrawdown, maxDrawdownPercent, maxDrawdownDuration };
  }

  /**
   * Calculate volatility metrics
   */
  private calculateVolatilityMetrics(): { volatility: number; downsideDeviation: number } {
    if (this.equityCurve.length < 2) {
      return { volatility: 0, downsideDeviation: 0 };
    }
    
    const returns: number[] = [];
    for (let i = 1; i < this.equityCurve.length; i++) {
      const ret = (this.equityCurve[i].equity - this.equityCurve[i - 1].equity) / 
                  this.equityCurve[i - 1].equity;
      returns.push(ret);
    }
    
    const volatility = this.calculateStdDev(returns) * Math.sqrt(252); // Annualized
    
    const negativeReturns = returns.filter(r => r < 0);
    const downsideDeviation = this.calculateStdDev(negativeReturns) * Math.sqrt(252);
    
    return { volatility, downsideDeviation };
  }

  /**
   * Calculate win/loss streaks
   */
  private calculateStreaks(trades: BacktestTrade[]): {
    maxWinStreak: number;
    maxLossStreak: number;
    currentStreak: number;
  } {
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    
    for (const trade of trades) {
      if ((trade.pnl || 0) > 0) {
        currentWinStreak++;
        currentLossStreak = 0;
        maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
      } else {
        currentLossStreak++;
        currentWinStreak = 0;
        maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
      }
    }
    
    return {
      maxWinStreak,
      maxLossStreak,
      currentStreak: currentWinStreak > 0 ? currentWinStreak : -currentLossStreak,
    };
  }

  /**
   * Calculate average recovery time from drawdowns
   */
  private calculateAverageRecoveryTime(): number {
    const recoveries: number[] = [];
    let inDrawdown = false;
    let drawdownStart: Date | null = null;
    
    for (const point of this.equityCurve) {
      if (point.drawdownPercent > 0.01 && !inDrawdown) {
        inDrawdown = true;
        drawdownStart = point.timestamp;
      } else if (point.drawdownPercent < 0.001 && inDrawdown && drawdownStart) {
        const recovery = (point.timestamp.getTime() - drawdownStart.getTime()) / (24 * 60 * 60 * 1000);
        recoveries.push(recovery);
        inDrawdown = false;
        drawdownStart = null;
      }
    }
    
    return recoveries.length > 0 
      ? recoveries.reduce((s, r) => s + r, 0) / recoveries.length 
      : 0;
  }

  /**
   * Calculate monthly returns
   */
  private calculateMonthlyReturns(): Map<string, number> {
    const monthly = new Map<string, number>();
    
    if (this.equityCurve.length < 2) return monthly;
    
    let lastMonthEnd = this.equityCurve[0].equity;
    let currentMonth = this.formatMonth(this.equityCurve[0].timestamp);
    
    for (const point of this.equityCurve) {
      const month = this.formatMonth(point.timestamp);
      
      if (month !== currentMonth) {
        const ret = ((point.equity - lastMonthEnd) / lastMonthEnd) * 100;
        monthly.set(currentMonth, ret);
        lastMonthEnd = point.equity;
        currentMonth = month;
      }
    }
    
    return monthly;
  }

  /**
   * Calculate yearly returns
   */
  private calculateYearlyReturns(): Map<string, number> {
    const yearly = new Map<string, number>();
    
    if (this.equityCurve.length < 2) return yearly;
    
    let lastYearEnd = this.equityCurve[0].equity;
    let currentYear = this.equityCurve[0].timestamp.getFullYear().toString();
    
    for (const point of this.equityCurve) {
      const year = point.timestamp.getFullYear().toString();
      
      if (year !== currentYear) {
        const ret = ((point.equity - lastYearEnd) / lastYearEnd) * 100;
        yearly.set(currentYear, ret);
        lastYearEnd = point.equity;
        currentYear = year;
      }
    }
    
    return yearly;
  }

  /**
   * Calculate confidence intervals using bootstrap
   */
  private calculateConfidenceIntervals(): BacktestResult['confidence'] {
    const returns = this.trades
      .filter(t => t.exitTime)
      .map(t => t.pnlPercent || 0);
    
    if (returns.length < 30) {
      return {
        level95: { lower: 0, upper: 0 },
        level99: { lower: 0, upper: 0 },
      };
    }
    
    // Bootstrap simulation
    const simulations = 1000;
    const simulatedMeans: number[] = [];
    
    for (let i = 0; i < simulations; i++) {
      const sample: number[] = [];
      for (let j = 0; j < returns.length; j++) {
        sample.push(returns[Math.floor(Math.random() * returns.length)]);
      }
      simulatedMeans.push(sample.reduce((s, r) => s + r, 0) / sample.length);
    }
    
    simulatedMeans.sort((a, b) => a - b);
    
    return {
      level95: {
        lower: simulatedMeans[Math.floor(simulations * 0.025)],
        upper: simulatedMeans[Math.floor(simulations * 0.975)],
      },
      level99: {
        lower: simulatedMeans[Math.floor(simulations * 0.005)],
        upper: simulatedMeans[Math.floor(simulations * 0.995)],
      },
    };
  }

  // ============================================
  // WALK-FORWARD ANALYSIS
  // ============================================

  /**
   * Run walk-forward optimization
   */
  async runWalkForward(
    strategy: StrategyFunction,
    inSampleRatio: number = 0.7,
    periods: number = 4
  ): Promise<WalkForwardResult> {
    const totalBars = this.getAllBarsSorted().length;
    const periodSize = Math.floor(totalBars / periods);
    const inSampleSize = Math.floor(periodSize * inSampleRatio);
    
    const inSamplePeriods: BacktestResult[] = [];
    const outOfSamplePeriods: BacktestResult[] = [];
    
    for (let i = 0; i < periods; i++) {
      const periodStart = i * periodSize;
      const inSampleEnd = periodStart + inSampleSize;
      const outOfSampleEnd = periodStart + periodSize;
      
      // Create in-sample backtest
      const isConfig = { ...this.config };
      // Would need to filter data by index range here
      
      const isEngine = new BacktestingEngine(isConfig);
      // Copy filtered data
      for (const [symbol, data] of this.historicalData) {
        isEngine.loadData(symbol, data.slice(periodStart, inSampleEnd));
      }
      
      const isResult = await isEngine.runBacktest(strategy);
      inSamplePeriods.push(isResult);
      
      // Create out-of-sample backtest
      const oosEngine = new BacktestingEngine(this.config);
      for (const [symbol, data] of this.historicalData) {
        oosEngine.loadData(symbol, data.slice(inSampleEnd, outOfSampleEnd));
      }
      
      const oosResult = await oosEngine.runBacktest(strategy);
      outOfSamplePeriods.push(oosResult);
    }
    
    // Calculate combined metrics
    const combinedMetrics = this.combineMetrics(outOfSamplePeriods);
    
    // Calculate degradation
    const inSampleReturn = inSamplePeriods.reduce((s, r) => s + r.metrics.totalReturnPercent, 0) / periods;
    const outOfSampleReturn = outOfSamplePeriods.reduce((s, r) => s + r.metrics.totalReturnPercent, 0) / periods;
    const degradation = inSampleReturn > 0 ? (inSampleReturn - outOfSampleReturn) / inSampleReturn : 0;
    
    // Calculate robustness score
    const robustnessScore = this.calculateRobustnessScore(inSamplePeriods, outOfSamplePeriods);
    
    return {
      inSamplePeriods,
      outOfSamplePeriods,
      combinedMetrics,
      robustnessScore,
      inSampleReturn,
      outOfSampleReturn,
      degradation,
    };
  }

  /**
   * Combine metrics from multiple periods
   */
  private combineMetrics(results: BacktestResult[]): BacktestMetrics {
    if (results.length === 0) {
      return this.calculateMetrics();
    }
    
    const combined = results[0].metrics;
    
    for (let i = 1; i < results.length; i++) {
      const m = results[i].metrics;
      combined.totalTrades += m.totalTrades;
      combined.winningTrades += m.winningTrades;
      combined.losingTrades += m.losingTrades;
    }
    
    combined.winRate = combined.totalTrades > 0 
      ? combined.winningTrades / combined.totalTrades 
      : 0;
    
    return combined;
  }

  /**
   * Calculate robustness score
   */
  private calculateRobustnessScore(
    inSample: BacktestResult[],
    outOfSample: BacktestResult[]
  ): number {
    let score = 100;
    
    // Penalize for IS/OOS difference
    for (let i = 0; i < inSample.length; i++) {
      const isReturn = inSample[i].metrics.totalReturnPercent;
      const oosReturn = outOfSample[i]?.metrics.totalReturnPercent || 0;
      
      if (isReturn > 0 && oosReturn < 0) {
        score -= 20; // Big penalty for sign flip
      } else if (isReturn > 0) {
        const diff = Math.abs(isReturn - oosReturn) / isReturn;
        score -= diff * 10;
      }
    }
    
    // Penalize for inconsistent OOS
    const oosReturns = outOfSample.map(r => r.metrics.totalReturnPercent);
    const oosStdDev = this.calculateStdDev(oosReturns);
    score -= oosStdDev;
    
    // Bonus for profitable OOS periods
    const profitableOOS = outOfSample.filter(r => r.metrics.totalReturnPercent > 0).length;
    score += (profitableOOS / outOfSample.length) * 20;
    
    return Math.max(0, Math.min(100, score));
  }

  // ============================================
  // MONTE CARLO SIMULATION
  // ============================================

  /**
   * Run Monte Carlo simulation
   */
  runMonteCarlo(
    iterations: number = 1000,
    targetReturn: number = 50
  ): MonteCarloResult {
    const tradeReturns = this.trades
      .filter(t => t.exitTime)
      .map(t => t.pnlPercent || 0);
    
    if (tradeReturns.length < 10) {
      throw new Error('Not enough trades for Monte Carlo simulation');
    }
    
    const simulatedReturns: number[] = [];
    const simulatedDrawdowns: number[] = [];
    let ruinCount = 0;
    let targetHitCount = 0;
    
    for (let i = 0; i < iterations; i++) {
      let equity = 100; // Normalized start
      let peak = 100;
      let maxDrawdown = 0;
      
      // Randomly shuffle and replay trades
      const shuffled = [...tradeReturns].sort(() => Math.random() - 0.5);
      
      for (const ret of shuffled) {
        equity *= (1 + ret / 100);
        
        if (equity > peak) {
          peak = equity;
        }
        
        const drawdown = (peak - equity) / peak;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
        
        // Check for ruin (>50% drawdown)
        if (drawdown > 0.5) {
          ruinCount++;
          break;
        }
      }
      
      simulatedReturns.push((equity - 100));
      simulatedDrawdowns.push(maxDrawdown * 100);
      
      if (equity >= 100 + targetReturn) {
        targetHitCount++;
      }
    }
    
    // Sort for percentile calculations
    simulatedReturns.sort((a, b) => a - b);
    simulatedDrawdowns.sort((a, b) => a - b);
    
    return {
      simulations: iterations,
      returnDistribution: {
        mean: simulatedReturns.reduce((s, r) => s + r, 0) / iterations,
        median: simulatedReturns[Math.floor(iterations / 2)],
        std: this.calculateStdDev(simulatedReturns),
        percentile5: simulatedReturns[Math.floor(iterations * 0.05)],
        percentile25: simulatedReturns[Math.floor(iterations * 0.25)],
        percentile75: simulatedReturns[Math.floor(iterations * 0.75)],
        percentile95: simulatedReturns[Math.floor(iterations * 0.95)],
      },
      drawdownDistribution: {
        mean: simulatedDrawdowns.reduce((s, d) => s + d, 0) / iterations,
        median: simulatedDrawdowns[Math.floor(iterations / 2)],
        std: this.calculateStdDev(simulatedDrawdowns),
        percentile5: simulatedDrawdowns[Math.floor(iterations * 0.05)],
        percentile95: simulatedDrawdowns[Math.floor(iterations * 0.95)],
      },
      probabilityOfRuin: ruinCount / iterations,
      probabilityOfTarget: targetHitCount / iterations,
      valueAtRisk95: -simulatedReturns[Math.floor(iterations * 0.05)],
      conditionalVaR95: this.calculateCVaR(simulatedReturns, 0.05),
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private reset(): void {
    this.currentEquity = this.config.initialCapital;
    this.peakEquity = this.config.initialCapital;
    this.positions.clear();
    this.trades = [];
    this.equityCurve = [];
    this.tradeIdCounter = 0;
  }

  private applySlippage(price: number, side: 'buy' | 'sell'): number {
    const slippage = this.config.slippage;
    const spread = this.config.accountForSpread ? this.config.spreadBps / 10000 : 0;
    
    if (side === 'buy') {
      return price * (1 + slippage + spread);
    } else {
      return price * (1 - slippage - spread);
    }
  }

  private calculatePositionSize(price: number, stopLoss?: number): number {
    const capital = this.config.useCompounding ? this.currentEquity : this.config.initialCapital;
    const maxPosition = capital * this.config.maxPositionSize;
    
    if (stopLoss) {
      const riskPerShare = Math.abs(price - stopLoss);
      const riskAmount = capital * this.config.riskPerTrade;
      const riskBasedSize = (riskAmount / riskPerShare) * price;
      return Math.min(maxPosition, riskBasedSize);
    }
    
    return maxPosition * 0.5; // Conservative if no stop
  }

  private calculateHoldingPeriod(entry: Date, exit: Date): number {
    const msPerBar = this.getBarDurationMs();
    return Math.round((exit.getTime() - entry.getTime()) / msPerBar);
  }

  private calculateTradeEfficiency(trade: BacktestTrade): number {
    if (!trade.maxFavorable) return 0;
    const actualGain = trade.exitPrice 
      ? Math.abs(trade.exitPrice - trade.entryPrice)
      : 0;
    return actualGain / trade.maxFavorable;
  }

  private getTradingDays(): number {
    if (this.equityCurve.length < 2) return 1;
    
    const start = this.equityCurve[0].timestamp.getTime();
    const end = this.equityCurve[this.equityCurve.length - 1].timestamp.getTime();
    
    return Math.max(1, (end - start) / (24 * 60 * 60 * 1000));
  }

  private calculateAnnualizedReturn(totalReturn: number, days: number): number {
    if (days <= 0) return 0;
    return (Math.pow(1 + totalReturn / 100, 365 / days) - 1) * 100;
  }

  private calculateStdDev(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((s, d) => s + d, 0) / (values.length - 1));
  }

  private calculateCVaR(returns: number[], alpha: number): number {
    const cutoff = Math.floor(returns.length * alpha);
    const tailReturns = returns.slice(0, cutoff);
    return tailReturns.length > 0 
      ? -tailReturns.reduce((s, r) => s + r, 0) / tailReturns.length
      : 0;
  }

  private formatMonth(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
}

// Factory function
export function createBacktestingEngine(config: BacktestConfig): BacktestingEngine {
  return new BacktestingEngine(config);
}

// Example strategy functions for testing
export const exampleStrategies = {
  /**
   * Simple Moving Average Crossover
   */
  smaCrossover: (
    data: OHLCV[],
    indicators: ComprehensiveIndicators,
    patterns: PatternScanResult,
    currentPosition: Position | null
  ): StrategySignal => {
    const sma20 = indicators.sma20;
    const sma50 = indicators.sma50;
    const currentPrice = data[data.length - 1].close;
    
    // Fast MA crosses above slow MA (sma20 is up, price above both)
    if (sma20.trend === 'up' && sma20.value > sma50.value && !currentPosition) {
      return {
        symbol: '',
        timestamp: new Date(),
        action: 'buy',
        price: currentPrice,
        stopLoss: currentPrice * 0.98,
        takeProfit: currentPrice * 1.06,
        confidence: 0.6,
        reason: 'SMA Crossover Bullish',
      };
    }
    
    // Fast MA crosses below slow MA
    if (sma20.trend === 'down' && sma20.value < sma50.value && currentPosition?.side === 'long') {
      return {
        symbol: '',
        timestamp: new Date(),
        action: 'close_long',
        price: currentPrice,
        confidence: 0.6,
        reason: 'SMA Crossover Bearish',
      };
    }
    
    return {
      symbol: '',
      timestamp: new Date(),
      action: 'none',
      price: currentPrice,
      confidence: 0,
      reason: 'No signal',
    };
  },

  /**
   * RSI Overbought/Oversold
   */
  rsiStrategy: (
    data: OHLCV[],
    indicators: ComprehensiveIndicators,
    patterns: PatternScanResult,
    currentPosition: Position | null
  ): StrategySignal => {
    const rsi = indicators.rsi14.value;
    const currentPrice = data[data.length - 1].close;
    
    // RSI oversold - buy
    if (rsi < 30 && !currentPosition) {
      return {
        symbol: '',
        timestamp: new Date(),
        action: 'buy',
        price: currentPrice,
        stopLoss: currentPrice * 0.97,
        takeProfit: currentPrice * 1.05,
        confidence: 0.65,
        reason: `RSI Oversold (${rsi.toFixed(1)})`,
      };
    }
    
    // RSI overbought - close
    if (rsi > 70 && currentPosition?.side === 'long') {
      return {
        symbol: '',
        timestamp: new Date(),
        action: 'close_long',
        price: currentPrice,
        confidence: 0.65,
        reason: `RSI Overbought (${rsi.toFixed(1)})`,
      };
    }
    
    return {
      symbol: '',
      timestamp: new Date(),
      action: 'none',
      price: currentPrice,
      confidence: 0,
      reason: 'No signal',
    };
  },

  /**
   * Pattern-based strategy
   */
  patternStrategy: (
    data: OHLCV[],
    indicators: ComprehensiveIndicators,
    patterns: PatternScanResult,
    currentPosition: Position | null
  ): StrategySignal => {
    const currentPrice = data[data.length - 1].close;
    
    // Look for bullish patterns
    const bullishPatterns = patterns.patterns.filter((p: DetectedPattern) => p.direction === 'bullish' && p.reliability > 0.6);
    
    if (bullishPatterns.length > 0 && !currentPosition) {
      const best = bullishPatterns.reduce((a: DetectedPattern, b: DetectedPattern) => a.reliability > b.reliability ? a : b);
      return {
        symbol: '',
        timestamp: new Date(),
        action: 'buy',
        price: currentPrice,
        stopLoss: currentPrice * 0.97,
        takeProfit: currentPrice * 1.06,
        confidence: best.reliability,
        reason: `Bullish Pattern: ${best.name}`,
      };
    }
    
    // Look for bearish patterns to exit
    const bearishPatterns = patterns.patterns.filter((p: DetectedPattern) => p.direction === 'bearish' && p.reliability > 0.6);
    
    if (bearishPatterns.length > 0 && currentPosition?.side === 'long') {
      const best = bearishPatterns.reduce((a: DetectedPattern, b: DetectedPattern) => a.reliability > b.reliability ? a : b);
      return {
        symbol: '',
        timestamp: new Date(),
        action: 'close_long',
        price: currentPrice,
        confidence: best.reliability,
        reason: `Bearish Pattern: ${best.name}`,
      };
    }
    
    return {
      symbol: '',
      timestamp: new Date(),
      action: 'none',
      price: currentPrice,
      confidence: 0,
      reason: 'No pattern signal',
    };
  },
};
