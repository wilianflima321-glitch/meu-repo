/**
 * ═══════════════════════════════════════════════════════════════
 * REAL EXCHANGE CLIENT - CONEXÃO REAL COM EXCHANGES
 * ═══════════════════════════════════════════════════════════════
 * 
 * Este cliente conecta com exchanges REAIS:
 * - Binance (Spot, Futures, Testnet)
 * - Bybit (Derivatives, Testnet)
 * 
 * USA A BIBLIOTECA CCXT - A mais confiável do mercado
 * 
 * ⚠️ SEMPRE USE TESTNET PRIMEIRO!
 */

import * as ccxt from 'ccxt';
import { EventEmitter } from 'events';

// ═══════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════

export type ExchangeId = 'binance' | 'binanceusdm' | 'bybit';

export interface ExchangeConfig {
  exchangeId: ExchangeId;
  apiKey: string;
  secret: string;
  testnet?: boolean;
  enableRateLimit?: boolean;
}

export interface Ticker {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  high: number;
  low: number;
  volume: number;
  timestamp: number;
}

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderBook {
  bids: [number, number][]; // [price, amount]
  asks: [number, number][];
  timestamp: number;
  nonce?: number;
}

export interface Balance {
  currency: string;
  free: number;
  used: number;
  total: number;
}

export interface Order {
  id: string;
  symbol: string;
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  side: 'buy' | 'sell';
  amount: number;
  price?: number;
  stopPrice?: number;
  status: 'open' | 'closed' | 'canceled' | 'expired';
  filled: number;
  remaining: number;
  cost: number;
  fee?: {
    currency: string;
    cost: number;
  };
  timestamp: number;
}

export interface Trade {
  id: string;
  order: string;
  symbol: string;
  side: 'buy' | 'sell';
  price: number;
  amount: number;
  cost: number;
  fee?: {
    currency: string;
    cost: number;
  };
  timestamp: number;
}

export interface Position {
  symbol: string;
  side: 'long' | 'short';
  contracts: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  leverage: number;
  liquidationPrice: number;
  marginType: 'cross' | 'isolated';
}

// ═══════════════════════════════════════════════════════════════
// REAL EXCHANGE CLIENT
// ═══════════════════════════════════════════════════════════════

export class RealExchangeClient extends EventEmitter {
  private exchange: ccxt.Exchange;
  private exchangeId: ExchangeId;
  private isTestnet: boolean;
  private connected = false;
  
  constructor(config: ExchangeConfig) {
    super();
    this.exchangeId = config.exchangeId;
    this.isTestnet = config.testnet ?? true;
    
    // Criar instância do exchange via CCXT
    const ExchangeClass = ccxt[config.exchangeId] as any;
    
    if (!ExchangeClass) {
      throw new Error(`Exchange ${config.exchangeId} not supported by CCXT`);
    }
    
    const options: Record<string, any> = {
      apiKey: config.apiKey,
      secret: config.secret,
      enableRateLimit: config.enableRateLimit ?? true,
      options: {},
    };
    
    // Configurar testnet
    if (this.isTestnet) {
      if (config.exchangeId === 'binance' || config.exchangeId === 'binanceusdm') {
        options.options = {
          ...options.options,
          defaultType: config.exchangeId === 'binanceusdm' ? 'future' : 'spot',
          sandboxMode: true,
        };
      } else if (config.exchangeId === 'bybit') {
        options.options = {
          ...options.options,
          testnet: true,
        };
      }
    }
    
    this.exchange = new ExchangeClass(options);
    
    console.log(`✅ Exchange ${config.exchangeId} initialized (testnet: ${this.isTestnet})`);
  }
  
  /**
   * Conecta e carrega mercados
   */
  async connect(): Promise<void> {
    try {
      await this.exchange.loadMarkets();
      this.connected = true;
      this.emit('connected', { exchange: this.exchangeId });
      console.log(`✅ Connected to ${this.exchangeId} - ${Object.keys(this.exchange.markets).length} markets loaded`);
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }
  
  /**
   * Verifica se está conectado
   */
  isConnected(): boolean {
    return this.connected;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // MARKET DATA
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Obtém ticker atual
   */
  async getTicker(symbol: string): Promise<Ticker> {
    const ticker = await this.exchange.fetchTicker(symbol);
    return {
      symbol: ticker.symbol,
      bid: ticker.bid ?? 0,
      ask: ticker.ask ?? 0,
      last: ticker.last ?? 0,
      high: ticker.high ?? 0,
      low: ticker.low ?? 0,
      volume: ticker.baseVolume ?? 0,
      timestamp: ticker.timestamp ?? Date.now(),
    };
  }
  
  /**
   * Obtém múltiplos tickers
   */
  async getTickers(symbols?: string[]): Promise<Map<string, Ticker>> {
    const tickers = await this.exchange.fetchTickers(symbols);
    const result = new Map<string, Ticker>();
    
    for (const [symbol, ticker] of Object.entries(tickers)) {
      result.set(symbol, {
        symbol: ticker.symbol,
        bid: ticker.bid ?? 0,
        ask: ticker.ask ?? 0,
        last: ticker.last ?? 0,
        high: ticker.high ?? 0,
        low: ticker.low ?? 0,
        volume: ticker.baseVolume ?? 0,
        timestamp: ticker.timestamp ?? Date.now(),
      });
    }
    
    return result;
  }
  
  /**
   * Obtém candles (OHLCV)
   */
  async getOHLCV(
    symbol: string,
    timeframe: string = '1h',
    limit: number = 100
  ): Promise<OHLCV[]> {
    const candles = await this.exchange.fetchOHLCV(symbol, timeframe, undefined, limit);
    
    return candles.map(([timestamp, open, high, low, close, volume]) => ({
      timestamp: timestamp as number,
      open: open as number,
      high: high as number,
      low: low as number,
      close: close as number,
      volume: volume as number,
    }));
  }
  
  /**
   * Obtém order book
   */
  async getOrderBook(symbol: string, limit: number = 20): Promise<OrderBook> {
    const book = await this.exchange.fetchOrderBook(symbol, limit);
    
    return {
      bids: book.bids.map(([price, amount]) => [price, amount] as [number, number]),
      asks: book.asks.map(([price, amount]) => [price, amount] as [number, number]),
      timestamp: book.timestamp ?? Date.now(),
      nonce: book.nonce,
    };
  }
  
  /**
   * Obtém trades recentes
   */
  async getRecentTrades(symbol: string, limit: number = 50): Promise<Trade[]> {
    const trades = await this.exchange.fetchTrades(symbol, undefined, limit);
    
    return trades.map(t => ({
      id: String(t.id ?? ''),
      order: String(t.order ?? ''),
      symbol: String(t.symbol ?? ''),
      side: t.side as 'buy' | 'sell',
      price: Number(t.price ?? 0),
      amount: Number(t.amount ?? 0),
      cost: Number(t.cost ?? 0),
      fee: t.fee ? {
        currency: String(t.fee.currency ?? ''),
        cost: Number(t.fee.cost ?? 0),
      } : undefined,
      timestamp: t.timestamp ?? Date.now(),
    }));
  }
  
  // ═══════════════════════════════════════════════════════════════
  // ACCOUNT DATA
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Obtém balanço da conta
  /**
   * Obtém balanço da conta
   */
  async getBalance(): Promise<Map<string, Balance>> {
    const balance = await this.exchange.fetchBalance();
    const result = new Map<string, Balance>();
    
    for (const [currency, data] of Object.entries(balance.total)) {
      if (data > 0) {
        const balanceData = balance as any;
        result.set(currency, {
          currency,
          free: balanceData.free?.[currency] ?? 0,
          used: balanceData.used?.[currency] ?? 0,
          total: data as number,
        });
      }
    }
    
    return result;
  }
  
  /**
   * Obtém posições abertas (para futures)
   */
  async getPositions(symbols?: string[]): Promise<Position[]> {
    if (!this.exchange.has['fetchPositions']) {
      return [];
    }
    
    const positions = await this.exchange.fetchPositions(symbols);
    
    return positions
      .filter((p: any) => p.contracts > 0)
      .map((p: any) => ({
        symbol: p.symbol,
        side: p.side as 'long' | 'short',
        contracts: p.contracts,
        entryPrice: p.entryPrice ?? 0,
        markPrice: p.markPrice ?? 0,
        unrealizedPnl: p.unrealizedPnl ?? 0,
        leverage: p.leverage ?? 1,
        liquidationPrice: p.liquidationPrice ?? 0,
        marginType: p.marginType ?? 'cross',
      }));
  }
  
  // ═══════════════════════════════════════════════════════════════
  // ORDER MANAGEMENT
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Cria ordem de mercado
   */
  async createMarketOrder(
    symbol: string,
    side: 'buy' | 'sell',
    amount: number
  ): Promise<Order> {
    console.log(`📊 Creating MARKET ${side.toUpperCase()} order: ${amount} ${symbol}`);
    
    const order = await this.exchange.createMarketOrder(symbol, side, amount);
    
    const result = this.mapOrder(order);
    this.emit('order', result);
    
    return result;
  }
  
  /**
   * Cria ordem limitada
   */
  async createLimitOrder(
    symbol: string,
    side: 'buy' | 'sell',
    amount: number,
    price: number
  ): Promise<Order> {
    console.log(`📊 Creating LIMIT ${side.toUpperCase()} order: ${amount} ${symbol} @ ${price}`);
    
    const order = await this.exchange.createLimitOrder(symbol, side, amount, price);
    
    const result = this.mapOrder(order);
    this.emit('order', result);
    
    return result;
  }
  
  /**
   * Cria ordem stop-loss
   */
  async createStopOrder(
    symbol: string,
    side: 'buy' | 'sell',
    amount: number,
    stopPrice: number,
    price?: number
  ): Promise<Order> {
    console.log(`📊 Creating STOP ${side.toUpperCase()} order: ${amount} ${symbol} @ stop ${stopPrice}`);
    
    const orderType = price ? 'stop_limit' : 'stop';
    const params: any = {
      stopPrice,
    };
    
    let order;
    if (price) {
      order = await this.exchange.createOrder(symbol, 'stop_limit', side, amount, price, params);
    } else {
      order = await this.exchange.createOrder(symbol, 'stop', side, amount, undefined, params);
    }
    
    const result = this.mapOrder(order);
    this.emit('order', result);
    
    return result;
  }
  
  /**
   * Cancela ordem
   */
  async cancelOrder(orderId: string, symbol: string): Promise<void> {
    console.log(`❌ Canceling order ${orderId} for ${symbol}`);
    await this.exchange.cancelOrder(orderId, symbol);
    this.emit('orderCanceled', { orderId, symbol });
  }
  
  /**
   * Cancela todas as ordens de um símbolo
   */
  async cancelAllOrders(symbol?: string): Promise<void> {
    console.log(`❌ Canceling all orders${symbol ? ` for ${symbol}` : ''}`);
    await this.exchange.cancelAllOrders(symbol);
    this.emit('allOrdersCanceled', { symbol });
  }
  
  /**
   * Obtém ordens abertas
   */
  async getOpenOrders(symbol?: string): Promise<Order[]> {
    const orders = await this.exchange.fetchOpenOrders(symbol);
    return orders.map(o => this.mapOrder(o));
  }
  
  /**
   * Obtém histórico de ordens
   */
  async getOrderHistory(symbol?: string, limit: number = 50): Promise<Order[]> {
    const orders = await this.exchange.fetchOrders(symbol, undefined, limit);
    return orders.map(o => this.mapOrder(o));
  }
  
  /**
   * Obtém ordem pelo ID
   */
  async getOrder(orderId: string, symbol: string): Promise<Order> {
    const order = await this.exchange.fetchOrder(orderId, symbol);
    return this.mapOrder(order);
  }
  
  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Mapeia ordem do CCXT para nosso tipo
   */
  private mapOrder(order: ccxt.Order): Order {
    return {
      id: String(order.id ?? ''),
      symbol: String(order.symbol ?? ''),
      type: order.type as Order['type'],
      side: order.side as 'buy' | 'sell',
      amount: Number(order.amount ?? 0),
      price: order.price,
      status: order.status as Order['status'],
      filled: Number(order.filled ?? 0),
      remaining: Number(order.remaining ?? 0),
      cost: Number(order.cost ?? 0),
      fee: order.fee ? {
        currency: String(order.fee.currency ?? ''),
        cost: Number(order.fee.cost ?? 0),
      } : undefined,
      timestamp: order.timestamp ?? Date.now(),
    };
  }
  
  /**
   * Lista todos os mercados disponíveis
   */
  getMarkets(): string[] {
    return Object.keys(this.exchange.markets);
  }
  
  /**
   * Obtém info de um mercado
   */
  getMarketInfo(symbol: string): ccxt.Market | undefined {
    return this.exchange.markets[symbol];
  }
  
  /**
   * Calcula tamanho mínimo de ordem
   */
  getMinOrderSize(symbol: string): number {
    const market = this.exchange.markets[symbol];
    return market?.limits?.amount?.min ?? 0;
  }
  
  /**
   * Arredonda quantidade para precisão do mercado
   */
  roundAmount(symbol: string, amount: number): number {
    const market = this.exchange.markets[symbol];
    const precision = market?.precision?.amount ?? 8;
    return Number(amount.toFixed(precision));
  }
  
  /**
   * Arredonda preço para precisão do mercado
   */
  roundPrice(symbol: string, price: number): number {
    const market = this.exchange.markets[symbol];
    const precision = market?.precision?.price ?? 8;
    return Number(price.toFixed(precision));
  }
  
  /**
   * Fecha conexão
   */
  async close(): Promise<void> {
    this.connected = false;
    this.emit('disconnected');
  }
}

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Cria cliente Binance
 */
export function createBinanceClient(options: {
  apiKey?: string;
  secret?: string;
  testnet?: boolean;
  futures?: boolean;
} = {}): RealExchangeClient {
  return new RealExchangeClient({
    exchangeId: options.futures ? 'binanceusdm' : 'binance',
    apiKey: options.apiKey || process.env.BINANCE_API_KEY || '',
    secret: options.secret || process.env.BINANCE_SECRET || '',
    testnet: options.testnet ?? (process.env.BINANCE_TESTNET === 'true'),
  });
}

/**
 * Cria cliente Bybit
 */
export function createBybitClient(options: {
  apiKey?: string;
  secret?: string;
  testnet?: boolean;
} = {}): RealExchangeClient {
  return new RealExchangeClient({
    exchangeId: 'bybit',
    apiKey: options.apiKey || process.env.BYBIT_API_KEY || '',
    secret: options.secret || process.env.BYBIT_SECRET || '',
    testnet: options.testnet ?? (process.env.BYBIT_TESTNET === 'true'),
  });
}

/**
 * Cria cliente genérico (detecta exchange pela config)
 */
export function createExchangeClient(config: ExchangeConfig): RealExchangeClient {
  return new RealExchangeClient(config);
}

// ═══════════════════════════════════════════════════════════════
// WEBSOCKET PARA DADOS EM TEMPO REAL
// ═══════════════════════════════════════════════════════════════

export class ExchangeWebSocket extends EventEmitter {
  private exchange: any = null;
  private exchangeId: ExchangeId;
  private running = false;
  
  constructor(config: ExchangeConfig) {
    super();
    this.exchangeId = config.exchangeId;
    
    // CCXT Pro para WebSocket
    const ccxtPro = (ccxt as any).pro;
    const ExchangeClass = ccxtPro?.[config.exchangeId];
    
    if (!ExchangeClass) {
      console.warn(`WebSocket not available for ${config.exchangeId}, falling back to polling`);
      return;
    }
    
    this.exchange = new ExchangeClass({
      apiKey: config.apiKey,
      secret: config.secret,
      enableRateLimit: true,
      options: config.testnet ? { sandboxMode: true } : {},
    });
  }
  
  /**
   * Inicia stream de tickers
   */
  async watchTickers(symbols: string[]): Promise<void> {
    if (!this.exchange) {
      throw new Error('WebSocket not available');
    }
    
    this.running = true;
    
    while (this.running) {
      try {
        const tickers = await this.exchange.watchTickers(symbols);
        
        for (const [symbol, tickerData] of Object.entries(tickers)) {
          const ticker = tickerData as any;
          this.emit('ticker', {
            symbol,
            bid: ticker.bid,
            ask: ticker.ask,
            last: ticker.last,
            volume: ticker.baseVolume,
            timestamp: ticker.timestamp,
          });
        }
      } catch (error) {
        this.emit('error', error);
        await this.delay(1000);
      }
    }
  }
  
  /**
   * Inicia stream de order book
   */
  async watchOrderBook(symbol: string): Promise<void> {
    if (!this.exchange) {
      throw new Error('WebSocket not available');
    }
    
    this.running = true;
    
    while (this.running) {
      try {
        const book = await this.exchange.watchOrderBook(symbol);
        
        this.emit('orderbook', {
          symbol,
          bids: book.bids.slice(0, 20),
          asks: book.asks.slice(0, 20),
          timestamp: book.timestamp,
        });
      } catch (error) {
        this.emit('error', error);
        await this.delay(1000);
      }
    }
  }
  
  /**
   * Inicia stream de trades
   */
  async watchTrades(symbol: string): Promise<void> {
    if (!this.exchange) {
      throw new Error('WebSocket not available');
    }
    
    this.running = true;
    
    while (this.running) {
      try {
        const trades = await this.exchange.watchTrades(symbol);
        
        for (const trade of trades) {
          this.emit('trade', {
            symbol: trade.symbol,
            side: trade.side,
            price: trade.price,
            amount: trade.amount,
            timestamp: trade.timestamp,
          });
        }
      } catch (error) {
        this.emit('error', error);
        await this.delay(1000);
      }
    }
  }
  
  /**
   * Para todos os streams
   */
  stop(): void {
    this.running = false;
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default RealExchangeClient;
