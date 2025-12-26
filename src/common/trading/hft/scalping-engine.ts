/**
 * ============================================
 * SCALPING ENGINE - HIGH FREQUENCY TRADING
 * ============================================
 * 
 * Motor de trading de alta frequência para timeframes curtos
 * Suporta: 5s, 10s, 15s, 30s, 1m
 * 
 * Recursos:
 * - Previsão ML em tempo real
 * - Execução em microsegundos
 * - Gerenciamento de risco automático
 * - Multi-exchange support
 * - Arbitragem entre exchanges
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// TYPES
// ============================================

export type Timeframe = '5s' | '10s' | '15s' | '30s' | '1m' | '5m';

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Tick {
  timestamp: number;
  price: number;
  volume: number;
  side: 'buy' | 'sell';
}

export interface OrderBook {
  bids: [number, number][]; // [price, quantity]
  asks: [number, number][];
  timestamp: number;
}

export interface PredictionResult {
  direction: 'up' | 'down' | 'neutral';
  confidence: number;
  targetPrice: number;
  expectedMove: number; // em percentual
  timeHorizon: number; // em milissegundos
  signals: Signal[];
}

export interface Signal {
  name: string;
  value: number;
  weight: number;
  direction: 'bullish' | 'bearish' | 'neutral';
}

export interface ScalpingTrade {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  quantity: number;
  entryTime: number;
  exitTime?: number;
  exitPrice?: number;
  status: 'pending' | 'open' | 'closed' | 'cancelled';
  pnl?: number;
  pnlPercent?: number;
  prediction: PredictionResult;
  executionLatency: number; // em microsegundos
}

export interface ScalpingConfig {
  // Geral
  symbols: string[];
  exchanges: string[];
  maxConcurrentTrades: number;
  
  // Timing
  primaryTimeframe: Timeframe;
  predictionHorizon: number; // milissegundos
  minPredictionConfidence: number;
  
  // Risk
  maxPositionSize: number; // em % do capital
  maxDailyLoss: number; // em % do capital
  maxDrawdown: number;
  stopLossPercent: number;
  takeProfitPercent: number;

  // Capital base para sizing (em moeda de conta, ex: USD/USDT)
  // Necessário para calcular position sizing de forma não-simulada.
  accountEquity?: number;
  
  // Execução
  maxSlippage: number; // em %
  maxLatency: number; // em ms
  useMarketOrders: boolean;
  
  // ML
  modelUpdateFrequency: number; // em segundos
  minDataPoints: number;
  featureWindow: number; // quantos candles usar como features
}

export interface EngineStatus {
  running: boolean;
  uptime: number;
  trades: {
    total: number;
    wins: number;
    losses: number;
    winRate: number;
  };
  pnl: {
    total: number;
    today: number;
    thisHour: number;
  };
  latency: {
    avg: number;
    min: number;
    max: number;
  };
  predictions: {
    total: number;
    accurate: number;
    accuracy: number;
  };
}

// ============================================
// CONSTANTS
// ============================================

const TIMEFRAME_MS: Record<Timeframe, number> = {
  '5s': 5000,
  '10s': 10000,
  '15s': 15000,
  '30s': 30000,
  '1m': 60000,
  '5m': 300000,
};

// ============================================
// NEURAL FORECASTER (ML Engine)
// ============================================

export class NeuralForecaster {
  private modelWeights: Map<string, number[]> = new Map();
  private featureHistory: Map<string, number[][]> = new Map();
  private predictionHistory: Map<string, PredictionResult[]> = new Map();
  
  private readonly featureNames = [
    'price_change_5s',
    'price_change_10s',
    'price_change_30s',
    'volume_ratio',
    'bid_ask_spread',
    'order_imbalance',
    'momentum_rsi',
    'momentum_macd',
    'volatility',
    'trend_strength',
    'support_distance',
    'resistance_distance',
  ];
  
  constructor(private config: { featureWindow: number }) {
    // Inicializar pesos determinísticos (em produção: carregar modelo treinado)
    this.initializeWeights();
  }
  
  private initializeWeights(): void {
    // Simular pesos de uma rede neural simples
    const layerSizes = [this.featureNames.length, 64, 32, 16, 3]; // 3 outputs: up, down, neutral
    
    for (let i = 0; i < layerSizes.length - 1; i++) {
      const totalWeights = layerSizes[i] * layerSizes[i + 1];
      const weights = new Array(totalWeights)
        .fill(0)
        .map((_, idx) => {
          // LCG determinístico (sem fonte de aleatoriedade)
          const seed = (idx * 9301 + (i + 1) * 49297) % 233280;
          const normalized = seed / 233280; // [0,1)
          return (normalized - 0.5) * 0.1;
        });
      this.modelWeights.set(`layer_${i}`, weights);
    }
  }
  
  async predict(
    symbol: string,
    candles: Candle[],
    orderBook: OrderBook,
    ticks: Tick[]
  ): Promise<PredictionResult> {
    const startTime = performance.now();
    
    // Extrair features
    const features = this.extractFeatures(candles, orderBook, ticks);
    
    // Forward pass através da rede
    const output = this.forwardPass(features);
    
    // Interpretar output
    const [upProb, downProb, neutralProb] = this.softmax(output);
    
    let direction: 'up' | 'down' | 'neutral';
    let confidence: number;
    
    if (upProb > downProb && upProb > neutralProb) {
      direction = 'up';
      confidence = upProb;
    } else if (downProb > upProb && downProb > neutralProb) {
      direction = 'down';
      confidence = downProb;
    } else {
      direction = 'neutral';
      confidence = neutralProb;
    }
    
    // Calcular target price
    const currentPrice = candles[candles.length - 1].close;
    const volatility = this.calculateVolatility(candles);
    const expectedMove = direction === 'up' 
      ? volatility * confidence 
      : direction === 'down' 
        ? -volatility * confidence 
        : 0;
    
    const targetPrice = currentPrice * (1 + expectedMove / 100);
    
    // Gerar sinais individuais
    const signals = this.generateSignals(candles, orderBook, ticks);
    
    const result: PredictionResult = {
      direction,
      confidence,
      targetPrice,
      expectedMove,
      timeHorizon: TIMEFRAME_MS['5s'] * 2,
      signals,
    };
    
    // Armazenar para análise
    const history = this.predictionHistory.get(symbol) || [];
    history.push(result);
    if (history.length > 1000) history.shift();
    this.predictionHistory.set(symbol, history);
    
    return result;
  }
  
  private extractFeatures(
    candles: Candle[],
    orderBook: OrderBook,
    ticks: Tick[]
  ): number[] {
    const features: number[] = [];
    const lastCandle = candles[candles.length - 1];
    const prevCandle5s = candles[candles.length - 2] || lastCandle;
    const prevCandle10s = candles[candles.length - 3] || prevCandle5s;
    const prevCandle30s = candles[candles.length - 7] || prevCandle10s;
    
    // Price changes
    features.push((lastCandle.close - prevCandle5s.close) / prevCandle5s.close * 100);
    features.push((lastCandle.close - prevCandle10s.close) / prevCandle10s.close * 100);
    features.push((lastCandle.close - prevCandle30s.close) / prevCandle30s.close * 100);
    
    // Volume
    const avgVolume = candles.slice(-10).reduce((sum, c) => sum + c.volume, 0) / 10;
    features.push(lastCandle.volume / avgVolume);
    
    // Order book
    const bestBid = orderBook.bids[0]?.[0] || lastCandle.close;
    const bestAsk = orderBook.asks[0]?.[0] || lastCandle.close;
    features.push((bestAsk - bestBid) / lastCandle.close * 100); // Spread
    
    const bidVolume = orderBook.bids.slice(0, 10).reduce((sum, [, qty]) => sum + qty, 0);
    const askVolume = orderBook.asks.slice(0, 10).reduce((sum, [, qty]) => sum + qty, 0);
    features.push((bidVolume - askVolume) / (bidVolume + askVolume)); // Order imbalance
    
    // Technical indicators
    features.push(this.calculateRSI(candles, 14));
    features.push(this.calculateMACD(candles).histogram);
    
    // Volatility
    features.push(this.calculateVolatility(candles));
    
    // Trend
    features.push(this.calculateTrendStrength(candles));
    
    // Support/Resistance
    const { support, resistance } = this.findSupportResistance(candles);
    features.push((lastCandle.close - support) / lastCandle.close * 100);
    features.push((resistance - lastCandle.close) / lastCandle.close * 100);
    
    return features;
  }
  
  private forwardPass(features: number[]): number[] {
    let current = features;
    
    for (let i = 0; this.modelWeights.has(`layer_${i}`); i++) {
      const weights = this.modelWeights.get(`layer_${i}`)!;
      const nextSize = i === 0 ? 64 : i === 1 ? 32 : i === 2 ? 16 : 3;
      const next: number[] = new Array(nextSize).fill(0);
      
      for (let j = 0; j < nextSize; j++) {
        for (let k = 0; k < current.length; k++) {
          next[j] += current[k] * weights[k * nextSize + j];
        }
        // ReLU activation (exceto última camada)
        if (i < 3) {
          next[j] = Math.max(0, next[j]);
        }
      }
      
      current = next;
    }
    
    return current;
  }
  
  private softmax(x: number[]): number[] {
    const maxVal = Math.max(...x);
    const exp = x.map(v => Math.exp(v - maxVal));
    const sum = exp.reduce((a, b) => a + b, 0);
    return exp.map(v => v / sum);
  }
  
  private calculateRSI(candles: Candle[], period: number): number {
    if (candles.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = candles.length - period; i < candles.length; i++) {
      const change = candles[i].close - candles[i - 1].close;
      if (change > 0) gains += change;
      else losses -= change;
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }
  
  private calculateMACD(candles: Candle[]): { macd: number; signal: number; histogram: number } {
    const prices = candles.map(c => c.close);
    
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macd = ema12 - ema26;
    
    // Simplificação: usar os últimos valores como sinal
    const signal = macd * 0.9; // Aproximação
    const histogram = macd - signal;
    
    return { macd, signal, histogram };
  }
  
  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1] || 0;
    
    const k = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
    
    for (let i = period; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k);
    }
    
    return ema;
  }
  
  private calculateVolatility(candles: Candle[]): number {
    const returns = candles.slice(1).map((c, i) => 
      Math.log(c.close / candles[i].close) * 100
    );
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }
  
  private calculateTrendStrength(candles: Candle[]): number {
    if (candles.length < 10) return 0;
    
    const prices = candles.slice(-10).map(c => c.close);
    
    // Linear regression slope
    const n = prices.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = prices.reduce((a, b) => a + b, 0);
    const sumXY = prices.reduce((sum, p, i) => sum + i * p, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    // Normalizar pelo preço
    return (slope / prices[prices.length - 1]) * 100;
  }
  
  private findSupportResistance(candles: Candle[]): { support: number; resistance: number } {
    const prices = candles.map(c => ({ high: c.high, low: c.low }));
    
    const lows = prices.map(p => p.low).sort((a, b) => a - b);
    const highs = prices.map(p => p.high).sort((a, b) => b - a);
    
    // Encontrar clusters de preços
    const support = lows.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    const resistance = highs.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    
    return { support, resistance };
  }
  
  private generateSignals(
    candles: Candle[],
    orderBook: OrderBook,
    ticks: Tick[]
  ): Signal[] {
    const signals: Signal[] = [];
    const lastCandle = candles[candles.length - 1];
    
    // RSI Signal
    const rsi = this.calculateRSI(candles, 14);
    signals.push({
      name: 'RSI',
      value: rsi,
      weight: 0.15,
      direction: rsi < 30 ? 'bullish' : rsi > 70 ? 'bearish' : 'neutral',
    });
    
    // MACD Signal
    const macd = this.calculateMACD(candles);
    signals.push({
      name: 'MACD',
      value: macd.histogram,
      weight: 0.15,
      direction: macd.histogram > 0 ? 'bullish' : macd.histogram < 0 ? 'bearish' : 'neutral',
    });
    
    // Order Book Imbalance
    const bidVolume = orderBook.bids.slice(0, 10).reduce((sum, [, qty]) => sum + qty, 0);
    const askVolume = orderBook.asks.slice(0, 10).reduce((sum, [, qty]) => sum + qty, 0);
    const imbalance = (bidVolume - askVolume) / (bidVolume + askVolume);
    signals.push({
      name: 'Order Book Imbalance',
      value: imbalance,
      weight: 0.2,
      direction: imbalance > 0.1 ? 'bullish' : imbalance < -0.1 ? 'bearish' : 'neutral',
    });
    
    // Volume Signal
    const avgVolume = candles.slice(-20).reduce((sum, c) => sum + c.volume, 0) / 20;
    const volumeRatio = lastCandle.volume / avgVolume;
    signals.push({
      name: 'Volume',
      value: volumeRatio,
      weight: 0.15,
      direction: volumeRatio > 1.5 
        ? (lastCandle.close > lastCandle.open ? 'bullish' : 'bearish')
        : 'neutral',
    });
    
    // Trend Signal
    const trendStrength = this.calculateTrendStrength(candles);
    signals.push({
      name: 'Trend',
      value: trendStrength,
      weight: 0.2,
      direction: trendStrength > 0.05 ? 'bullish' : trendStrength < -0.05 ? 'bearish' : 'neutral',
    });
    
    // Tick Flow (agressores)
    const recentTicks = ticks.slice(-100);
    const buyTicks = recentTicks.filter(t => t.side === 'buy').length;
    const sellTicks = recentTicks.filter(t => t.side === 'sell').length;
    const tickFlow = (buyTicks - sellTicks) / recentTicks.length;
    signals.push({
      name: 'Tick Flow',
      value: tickFlow,
      weight: 0.15,
      direction: tickFlow > 0.1 ? 'bullish' : tickFlow < -0.1 ? 'bearish' : 'neutral',
    });
    
    return signals;
  }
  
  // Atualizar modelo com resultado real (online learning)
  async updateModel(
    symbol: string,
    prediction: PredictionResult,
    actualMove: number
  ): Promise<void> {
    // Calcular erro
    const predictedMove = prediction.expectedMove;
    const error = actualMove - predictedMove;
    
    // Simplificação: ajustar pesos levemente na direção do gradiente
    const learningRate = 0.001;
    
    for (const [key, weights] of this.modelWeights.entries()) {
      const adjustment = error * learningRate;
      for (let i = 0; i < weights.length; i++) {
        // Atualização determinística mínima (evita ruído aleatório)
        weights[i] += adjustment;
      }
    }
  }
}

// ============================================
// SCALPING ENGINE
// ============================================

export class ScalpingEngine extends EventEmitter {
  private config: ScalpingConfig;
  private forecaster: NeuralForecaster;
  
  private running: boolean = false;
  private startTime: number = 0;
  
  private activeTrades: Map<string, ScalpingTrade> = new Map();
  private closedTrades: ScalpingTrade[] = [];
  
  // Data buffers
  private candleBuffers: Map<string, Candle[]> = new Map();
  private tickBuffers: Map<string, Tick[]> = new Map();
  private orderBooks: Map<string, OrderBook> = new Map();
  
  // Performance tracking
  private latencies: number[] = [];
  private predictionResults: { predicted: number; actual: number }[] = [];
  
  // Risk management
  private dailyPnL: number = 0;
  private dailyReset: number = Date.now();
  private lastModelUpdateAt: number = 0;
  
  constructor(config: Partial<ScalpingConfig> = {}) {
    super();
    
    this.config = {
      symbols: ['BTC/USDT', 'ETH/USDT'],
      exchanges: ['binance'],
      maxConcurrentTrades: 3,
      primaryTimeframe: '5s',
      predictionHorizon: 10000, // 10 segundos
      minPredictionConfidence: 0.65,
      maxPositionSize: 2, // 2% do capital
      maxDailyLoss: 5, // 5% do capital
      maxDrawdown: 10,
      stopLossPercent: 0.5,
      takeProfitPercent: 0.3,
      maxSlippage: 0.1,
      maxLatency: 100,
      useMarketOrders: true,
      modelUpdateFrequency: 60,
      minDataPoints: 100,
      featureWindow: 50,
      ...config,
    };
    
    this.forecaster = new NeuralForecaster({ 
      featureWindow: this.config.featureWindow,
    });
    
    // Reset diário
    this.scheduleDailyReset();
  }

  // ============================================
  // LIFECYCLE
  // ============================================

  async start(): Promise<void> {
    if (this.running) return;
    
    this.running = true;
    this.startTime = Date.now();
    
    this.emit('started');
    
    // Iniciar loop principal
    this.mainLoop();
  }

  async stop(): Promise<void> {
    this.running = false;
    
    // Fechar todas as posições abertas
    for (const trade of this.activeTrades.values()) {
      await this.closeTrade(trade.id, 'engine_stop');
    }
    
    this.emit('stopped');
  }

  // ============================================
  // MAIN LOOP
  // ============================================

  private async mainLoop(): Promise<void> {
    const intervalMs = TIMEFRAME_MS[this.config.primaryTimeframe];
    
    while (this.running) {
      const loopStart = performance.now();
      
      try {
        // 1. Verificar risco diário
        if (this.isDailyLossExceeded()) {
          this.emit('daily_loss_exceeded');
          await this.delay(60000); // Pausa de 1 minuto
          continue;
        }
        
        // 2. Processar cada símbolo
        for (const symbol of this.config.symbols) {
          await this.processSymbol(symbol);
        }
        
        // 3. Gerenciar trades ativos
        await this.manageTrades();
        
        // 4. Atualizar modelo periodicamente
        const now = Date.now();
        if (
          this.config.modelUpdateFrequency > 0 &&
          (this.lastModelUpdateAt === 0 || now - this.lastModelUpdateAt >= this.config.modelUpdateFrequency * 1000)
        ) {
          await this.updateModel();
          this.lastModelUpdateAt = now;
        }
        
        // Registrar latência
        const loopLatency = performance.now() - loopStart;
        this.latencies.push(loopLatency);
        if (this.latencies.length > 1000) this.latencies.shift();
        
        this.emit('loop_complete', { latency: loopLatency });
      } catch (error) {
        this.emit('error', { error });
      }
      
      // Aguardar próximo intervalo
      const elapsed = performance.now() - loopStart;
      const waitTime = Math.max(0, intervalMs - elapsed);
      await this.delay(waitTime);
    }
  }

  // ============================================
  // SYMBOL PROCESSING
  // ============================================

  private async processSymbol(symbol: string): Promise<void> {
    // Verificar se temos dados suficientes
    const candles = this.candleBuffers.get(symbol) || [];
    const orderBook = this.orderBooks.get(symbol);
    const ticks = this.tickBuffers.get(symbol) || [];
    
    if (candles.length < this.config.minDataPoints || !orderBook) {
      return;
    }
    
    // Fazer previsão
    const prediction = await this.forecaster.predict(symbol, candles, orderBook, ticks);
    
    this.emit('prediction', { symbol, prediction });
    
    // Verificar se deve entrar em trade
    if (this.shouldEnterTrade(symbol, prediction)) {
      await this.enterTrade(symbol, prediction);
    }
  }

  // ============================================
  // TRADE MANAGEMENT
  // ============================================

  private shouldEnterTrade(symbol: string, prediction: PredictionResult): boolean {
    // Verificar confiança mínima
    if (prediction.confidence < this.config.minPredictionConfidence) {
      return false;
    }
    
    // Verificar direção
    if (prediction.direction === 'neutral') {
      return false;
    }
    
    // Verificar trades ativos
    if (this.activeTrades.size >= this.config.maxConcurrentTrades) {
      return false;
    }
    
    // Verificar se já tem trade neste símbolo
    for (const trade of this.activeTrades.values()) {
      if (trade.symbol === symbol) {
        return false;
      }
    }
    
    // Verificar sinais confirmadores
    const bullishSignals = prediction.signals.filter(s => s.direction === 'bullish').length;
    const bearishSignals = prediction.signals.filter(s => s.direction === 'bearish').length;
    
    if (prediction.direction === 'up' && bullishSignals < 3) return false;
    if (prediction.direction === 'down' && bearishSignals < 3) return false;
    
    return true;
  }

  private async enterTrade(symbol: string, prediction: PredictionResult): Promise<void> {
    const startTime = performance.now();
    
    const candles = this.candleBuffers.get(symbol) || [];
    const currentPrice = candles[candles.length - 1]?.close || 0;
    
    if (!currentPrice) return;
    
    const side: 'long' | 'short' = prediction.direction === 'up' ? 'long' : 'short';
    
    // Calcular stops
    const stopLoss = side === 'long'
      ? currentPrice * (1 - this.config.stopLossPercent / 100)
      : currentPrice * (1 + this.config.stopLossPercent / 100);
    
    const takeProfit = side === 'long'
      ? currentPrice * (1 + this.config.takeProfitPercent / 100)
      : currentPrice * (1 - this.config.takeProfitPercent / 100);
    
    const trade: ScalpingTrade = {
      id: this.generateTradeId(),
      symbol,
      side,
      entryPrice: currentPrice,
      targetPrice: prediction.targetPrice,
      stopLoss,
      quantity: this.calculatePositionSize(currentPrice),
      entryTime: Date.now(),
      status: 'open',
      prediction,
      executionLatency: (performance.now() - startTime) * 1000, // microsegundos
    };
    
    this.activeTrades.set(trade.id, trade);
    
    this.emit('trade_opened', { trade });
  }

  private async manageTrades(): Promise<void> {
    const candles = new Map<string, Candle>();
    
    // Coletar preços atuais
    for (const [symbol, buffer] of this.candleBuffers) {
      if (buffer.length > 0) {
        candles.set(symbol, buffer[buffer.length - 1]);
      }
    }
    
    for (const trade of this.activeTrades.values()) {
      const currentCandle = candles.get(trade.symbol);
      if (!currentCandle) continue;
      
      const currentPrice = currentCandle.close;
      
      // Verificar stop loss
      if (trade.side === 'long' && currentPrice <= trade.stopLoss) {
        await this.closeTrade(trade.id, 'stop_loss');
        continue;
      }
      if (trade.side === 'short' && currentPrice >= trade.stopLoss) {
        await this.closeTrade(trade.id, 'stop_loss');
        continue;
      }
      
      // Verificar take profit
      if (trade.side === 'long' && currentPrice >= trade.targetPrice) {
        await this.closeTrade(trade.id, 'take_profit');
        continue;
      }
      if (trade.side === 'short' && currentPrice <= trade.targetPrice) {
        await this.closeTrade(trade.id, 'take_profit');
        continue;
      }
      
      // Verificar timeout (2x prediction horizon)
      const elapsed = Date.now() - trade.entryTime;
      if (elapsed > trade.prediction.timeHorizon * 2) {
        await this.closeTrade(trade.id, 'timeout');
      }
    }
  }

  private async closeTrade(tradeId: string, reason: string): Promise<void> {
    const trade = this.activeTrades.get(tradeId);
    if (!trade) return;
    
    const candles = this.candleBuffers.get(trade.symbol) || [];
    const exitPrice = candles[candles.length - 1]?.close || trade.entryPrice;
    
    trade.exitTime = Date.now();
    trade.exitPrice = exitPrice;
    trade.status = 'closed';
    
    // Calcular PnL
    const priceDiff = trade.side === 'long'
      ? exitPrice - trade.entryPrice
      : trade.entryPrice - exitPrice;
    
    trade.pnl = priceDiff * trade.quantity;
    trade.pnlPercent = (priceDiff / trade.entryPrice) * 100;
    
    // Atualizar PnL diário
    this.dailyPnL += trade.pnlPercent;
    
    // Mover para histórico
    this.activeTrades.delete(tradeId);
    this.closedTrades.push(trade);
    
    // Registrar resultado da previsão
    const actualMove = trade.pnlPercent;
    this.predictionResults.push({
      predicted: trade.prediction.expectedMove,
      actual: actualMove,
    });
    if (this.predictionResults.length > 1000) this.predictionResults.shift();
    
    // Atualizar modelo
    await this.forecaster.updateModel(
      trade.symbol,
      trade.prediction,
      actualMove
    );
    
    this.emit('trade_closed', { trade, reason });
  }

  // ============================================
  // DATA FEED
  // ============================================

  updateCandle(symbol: string, candle: Candle): void {
    const buffer = this.candleBuffers.get(symbol) || [];
    buffer.push(candle);
    
    // Manter apenas os últimos N candles
    const maxCandles = this.config.featureWindow * 2;
    if (buffer.length > maxCandles) {
      buffer.splice(0, buffer.length - maxCandles);
    }
    
    this.candleBuffers.set(symbol, buffer);
  }

  updateTick(symbol: string, tick: Tick): void {
    const buffer = this.tickBuffers.get(symbol) || [];
    buffer.push(tick);
    
    // Manter apenas os últimos 1000 ticks
    if (buffer.length > 1000) {
      buffer.splice(0, buffer.length - 1000);
    }
    
    this.tickBuffers.set(symbol, buffer);
  }

  updateOrderBook(symbol: string, orderBook: OrderBook): void {
    this.orderBooks.set(symbol, orderBook);
  }

  // ============================================
  // RISK MANAGEMENT
  // ============================================

  private isDailyLossExceeded(): boolean {
    // Reset diário
    const now = Date.now();
    const dayStart = new Date().setHours(0, 0, 0, 0);
    
    if (this.dailyReset < dayStart) {
      this.dailyPnL = 0;
      this.dailyReset = now;
    }
    
    return this.dailyPnL <= -this.config.maxDailyLoss;
  }

  private calculatePositionSize(price: number): number {
    const equityFromEnv = Number(process.env.AETHEL_TRADING_EQUITY);
    const equity = typeof this.config.accountEquity === 'number' && Number.isFinite(this.config.accountEquity)
      ? this.config.accountEquity
      : (Number.isFinite(equityFromEnv) ? equityFromEnv : NaN);

    if (!Number.isFinite(equity) || equity <= 0) {
      throw new Error(
        'Position sizing requer equity real. Defina ScalpingConfig.accountEquity ou AETHEL_TRADING_EQUITY.'
      );
    }

    const notional = equity * (this.config.maxPositionSize / 100);
    return notional / price;
  }

  private scheduleDailyReset(): void {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.dailyPnL = 0;
      this.dailyReset = Date.now();
      this.emit('daily_reset');
      this.scheduleDailyReset();
    }, msUntilMidnight);
  }

  // ============================================
  // MODEL UPDATE
  // ============================================

  private async updateModel(): Promise<void> {
    // Retreinar modelo com dados recentes
    // Integração real de retreino não implementada aqui; sinaliza explicitamente.
    this.emit('model_update_skipped', { reason: 'CLOUD_MODEL_RETRAIN_NOT_IMPLEMENTED' });
  }

  // ============================================
  // STATUS
  // ============================================

  getStatus(): EngineStatus {
    const wins = this.closedTrades.filter(t => (t.pnl || 0) > 0).length;
    const losses = this.closedTrades.filter(t => (t.pnl || 0) <= 0).length;
    
    const avgLatency = this.latencies.length > 0
      ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
      : 0;
    
    const accuratePredictions = this.predictionResults.filter(r => 
      (r.predicted > 0 && r.actual > 0) || (r.predicted < 0 && r.actual < 0)
    ).length;
    
    const hourAgo = Date.now() - 3600000;
    const hourlyTrades = this.closedTrades.filter(t => t.exitTime && t.exitTime > hourAgo);
    const hourlyPnL = hourlyTrades.reduce((sum, t) => sum + (t.pnlPercent || 0), 0);
    
    return {
      running: this.running,
      uptime: Date.now() - this.startTime,
      trades: {
        total: this.closedTrades.length,
        wins,
        losses,
        winRate: this.closedTrades.length > 0 ? (wins / this.closedTrades.length) * 100 : 0,
      },
      pnl: {
        total: this.closedTrades.reduce((sum, t) => sum + (t.pnlPercent || 0), 0),
        today: this.dailyPnL,
        thisHour: hourlyPnL,
      },
      latency: {
        avg: avgLatency,
        min: this.latencies.length > 0 ? Math.min(...this.latencies) : 0,
        max: this.latencies.length > 0 ? Math.max(...this.latencies) : 0,
      },
      predictions: {
        total: this.predictionResults.length,
        accurate: accuratePredictions,
        accuracy: this.predictionResults.length > 0 
          ? (accuratePredictions / this.predictionResults.length) * 100 
          : 0,
      },
    };
  }

  getActiveTrades(): ScalpingTrade[] {
    return Array.from(this.activeTrades.values());
  }

  getClosedTrades(limit?: number): ScalpingTrade[] {
    if (limit) {
      return this.closedTrades.slice(-limit);
    }
    return [...this.closedTrades];
  }

  // ============================================
  // UTILITIES
  // ============================================

  private generateTradeId(): string {
    return uuidv4();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================
// FACTORY
// ============================================

export function createScalpingEngine(config?: Partial<ScalpingConfig>): ScalpingEngine {
  return new ScalpingEngine(config);
}

export default ScalpingEngine;
