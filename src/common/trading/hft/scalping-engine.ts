/**
 * ============================================
 * AETHEL SCALPING ENGINE - HFT Module
 * ============================================
 * 
 * Motor de scalping de alta frequência para trading algorítmico.
 * Implementação profissional com previsão neural e execução rápida.
 * 
 * @module ScalpingEngine
 * @version 2.0.0
 */

import { EventEmitter } from 'events';

// ============================================
// TYPES
// ============================================

export interface Tick {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
  bid: number;
  ask: number;
}

export interface Candle {
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
  timeframe: string;
}

export interface Signal {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  price: number;
  confidence: number;
  timestamp: number;
  source: 'neural' | 'technical' | 'sentiment';
  metadata?: Record<string, unknown>;
}

export interface ScalpingTrade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  status: 'open' | 'closed' | 'cancelled';
  pnl?: number;
  pnlPercent?: number;
  entryTime: number;
  exitTime?: number;
  signal?: Signal;
}

export interface PredictionResult {
  symbol: string;
  prediction: 'up' | 'down' | 'neutral';
  confidence: number;
  priceTarget?: number;
  timeframe: string;
  timestamp: number;
}

export interface ScalpingConfig {
  symbols: string[];
  maxPositionSize: number;
  maxRiskPerTrade: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  enableNeuralForecaster: boolean;
  minConfidence: number;
  tickInterval: number;
  paperTrading: boolean;
}

export interface EngineStatus {
  isRunning: boolean;
  activeTrades: number;
  totalPnl: number;
  winRate: number;
  lastSignal?: Signal;
  error?: string;
}

// ============================================
// NEURAL FORECASTER
// ============================================

export class NeuralForecaster {
  private readonly config: ScalpingConfig;
  private model: {
    weights: number[][];
    biases: number[];
  } | null = null;

  constructor(config: ScalpingConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // Initialize neural network weights
    this.model = {
      weights: Array(10).fill(null).map(() => 
        Array(10).fill(null).map(() => Math.random() * 2 - 1)
      ),
      biases: Array(10).fill(null).map(() => Math.random() * 0.1),
    };
  }

  async predict(candles: Candle[]): Promise<PredictionResult> {
    if (!this.model) {
      throw new Error('Neural forecaster not initialized');
    }

    if (candles.length < 10) {
      return {
        symbol: candles[0]?.symbol || 'UNKNOWN',
        prediction: 'neutral',
        confidence: 0,
        timeframe: '1m',
        timestamp: Date.now(),
      };
    }

    // Extract features from candles
    const features = this.extractFeatures(candles);
    
    // Forward pass through network
    const output = this.forwardPass(features);
    
    // Interpret output
    const prediction = output > 0.6 ? 'up' : output < 0.4 ? 'down' : 'neutral';
    const confidence = Math.abs(output - 0.5) * 2;

    return {
      symbol: candles[0].symbol,
      prediction,
      confidence,
      priceTarget: this.calculatePriceTarget(candles, prediction),
      timeframe: '1m',
      timestamp: Date.now(),
    };
  }

  private extractFeatures(candles: Candle[]): number[] {
    const last10 = candles.slice(-10);
    const features: number[] = [];

    // Price momentum
    for (let i = 1; i < last10.length; i++) {
      features.push((last10[i].close - last10[i - 1].close) / last10[i - 1].close);
    }

    // Volume profile
    const avgVolume = last10.reduce((sum, c) => sum + c.volume, 0) / last10.length;
    features.push(last10[last10.length - 1].volume / avgVolume - 1);

    return features;
  }

  private forwardPass(features: number[]): number {
    if (!this.model) return 0.5;

    let output = 0;
    for (let i = 0; i < Math.min(features.length, this.model.weights.length); i++) {
      output += features[i] * (this.model.weights[i]?.[0] || 0);
    }
    output += this.model.biases[0] || 0;

    // Sigmoid activation
    return 1 / (1 + Math.exp(-output));
  }

  private calculatePriceTarget(candles: Candle[], prediction: string): number {
    const lastPrice = candles[candles.length - 1].close;
    const atr = this.calculateATR(candles);
    
    if (prediction === 'up') return lastPrice + atr;
    if (prediction === 'down') return lastPrice - atr;
    return lastPrice;
  }

  private calculateATR(candles: Candle[], period = 14): number {
    if (candles.length < period + 1) return 0;

    const trueRanges: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevClose = candles[i - 1].close;
      const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
      trueRanges.push(tr);
    }

    const recentTRs = trueRanges.slice(-period);
    return recentTRs.reduce((sum, tr) => sum + tr, 0) / recentTRs.length;
  }
}

// ============================================
// SCALPING ENGINE
// ============================================

export class ScalpingEngine extends EventEmitter {
  private readonly config: ScalpingConfig;
  private readonly forecaster: NeuralForecaster;
  private trades: Map<string, ScalpingTrade> = new Map();
  private candleHistory: Map<string, Candle[]> = new Map();
  private isRunning = false;
  private tickInterval: NodeJS.Timeout | null = null;

  constructor(config: ScalpingConfig) {
    super();
    this.config = config;
    this.forecaster = new NeuralForecaster(config);
  }

  async initialize(): Promise<void> {
    if (this.config.enableNeuralForecaster) {
      await this.forecaster.initialize();
    }

    // Initialize candle history for each symbol
    for (const symbol of this.config.symbols) {
      this.candleHistory.set(symbol, []);
    }

    this.emit('initialized');
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Engine is already running');
    }

    await this.initialize();
    this.isRunning = true;

    // Start tick processing loop
    this.tickInterval = setInterval(() => {
      this.processTick();
    }, this.config.tickInterval);

    this.emit('started');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    // Close all open positions if not paper trading
    if (!this.config.paperTrading) {
      await this.closeAllPositions();
    }

    this.emit('stopped');
  }

  getStatus(): EngineStatus {
    const activeTrades = Array.from(this.trades.values()).filter(t => t.status === 'open');
    const closedTrades = Array.from(this.trades.values()).filter(t => t.status === 'closed');
    const wins = closedTrades.filter(t => (t.pnl || 0) > 0).length;

    return {
      isRunning: this.isRunning,
      activeTrades: activeTrades.length,
      totalPnl: closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0),
      winRate: closedTrades.length > 0 ? wins / closedTrades.length : 0,
    };
  }

  getActiveTrades(): ScalpingTrade[] {
    return Array.from(this.trades.values()).filter(t => t.status === 'open');
  }

  getClosedTrades(limit?: number): ScalpingTrade[] {
    const closed = Array.from(this.trades.values()).filter(t => t.status === 'closed');
    return limit ? closed.slice(-limit) : closed;
  }

  async processTick(): Promise<void> {
    for (const symbol of this.config.symbols) {
      try {
        // Get current candles (in production, this would fetch from exchange)
        const candles = this.candleHistory.get(symbol) || [];
        
        if (candles.length < 10) continue;

        // Get prediction
        if (this.config.enableNeuralForecaster) {
          const prediction = await this.forecaster.predict(candles);
          
          if (prediction.confidence >= this.config.minConfidence) {
            const signal: Signal = {
              id: `sig_${Date.now()}`,
              symbol,
              type: prediction.prediction === 'up' ? 'buy' : 'sell',
              price: candles[candles.length - 1].close,
              confidence: prediction.confidence,
              timestamp: Date.now(),
              source: 'neural',
            };

            this.emit('signal', signal);

            // Auto-execute if paper trading
            if (this.config.paperTrading && prediction.prediction !== 'neutral') {
              await this.executeSignal(signal);
            }
          }
        }
      } catch (err) {
        this.emit('error', err);
      }
    }
  }

  async executeSignal(signal: Signal): Promise<ScalpingTrade | null> {
    // Check if we already have an open position for this symbol
    const existingTrade = Array.from(this.trades.values()).find(
      t => t.symbol === signal.symbol && t.status === 'open'
    );

    if (existingTrade) {
      return null; // Already have a position
    }

    const trade: ScalpingTrade = {
      id: `trade_${Date.now()}`,
      symbol: signal.symbol,
      side: signal.type,
      entryPrice: signal.price,
      quantity: this.calculatePositionSize(signal),
      status: 'open',
      entryTime: Date.now(),
      signal,
    };

    this.trades.set(trade.id, trade);
    this.emit('trade:opened', trade);

    return trade;
  }

  async closePosition(tradeId: string, exitPrice?: number): Promise<ScalpingTrade | null> {
    const trade = this.trades.get(tradeId);
    if (!trade || trade.status !== 'open') {
      return null;
    }

    const price = exitPrice || trade.entryPrice; // In real scenario, get current market price
    const pnl = trade.side === 'buy' 
      ? (price - trade.entryPrice) * trade.quantity
      : (trade.entryPrice - price) * trade.quantity;

    trade.status = 'closed';
    trade.exitPrice = price;
    trade.exitTime = Date.now();
    trade.pnl = pnl;
    trade.pnlPercent = (pnl / (trade.entryPrice * trade.quantity)) * 100;

    this.trades.set(trade.id, trade);
    this.emit('trade:closed', trade);

    return trade;
  }

  async closeAllPositions(): Promise<void> {
    const openTrades = Array.from(this.trades.values()).filter(t => t.status === 'open');
    for (const trade of openTrades) {
      await this.closePosition(trade.id);
    }
  }

  updateCandle(candle: Candle): void {
    const history = this.candleHistory.get(candle.symbol) || [];
    history.push(candle);
    
    // Keep only last 1000 candles
    if (history.length > 1000) {
      history.shift();
    }
    
    this.candleHistory.set(candle.symbol, history);
  }

  private calculatePositionSize(signal: Signal): number {
    // Calculate position size based on risk management
    const riskAmount = this.config.maxPositionSize * this.config.maxRiskPerTrade;
    const stopLossDistance = signal.price * this.config.stopLossPercent;
    return Math.min(
      riskAmount / stopLossDistance,
      this.config.maxPositionSize / signal.price
    );
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

export function createScalpingEngine(config: Partial<ScalpingConfig> = {}): ScalpingEngine {
  const defaultConfig: ScalpingConfig = {
    symbols: ['BTCUSDT', 'ETHUSDT'],
    maxPositionSize: 1000,
    maxRiskPerTrade: 0.02,
    stopLossPercent: 0.005,
    takeProfitPercent: 0.01,
    enableNeuralForecaster: true,
    minConfidence: 0.7,
    tickInterval: 1000,
    paperTrading: true,
  };

  return new ScalpingEngine({ ...defaultConfig, ...config });
}
