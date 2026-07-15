/**
 * ============================================
 * AETHEL TRADING CORE MODULE
 * ============================================
 * 
 * Módulo central de trading com abstrações para exchanges
 * e gerenciamento de ordens.
 * 
 * @module TradingCore
 * @version 2.0.0
 */

import { EventEmitter } from 'events';

// ============================================
// TYPES
// ============================================

export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit';
export type OrderStatus = 'pending' | 'open' | 'partial' | 'filled' | 'cancelled' | 'rejected';
export type ExchangeId = 'binance' | 'bybit' | 'okx' | 'coinbase' | 'kraken' | 'paper';

export interface Balance {
  asset: string;
  free: number;
  locked: number;
  total: number;
}

export interface Ticker {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  change24h: number;
  timestamp: number;
}

export interface Order {
  id: string;
  clientOrderId?: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  status: OrderStatus;
  price: number;
  quantity: number;
  filledQuantity: number;
  avgPrice: number;
  createdAt: number;
  updatedAt: number;
  fee?: number;
  feeCurrency?: string;
}

export interface Trade {
  id: string;
  orderId: string;
  symbol: string;
  side: OrderSide;
  price: number;
  quantity: number;
  fee: number;
  feeCurrency: string;
  timestamp: number;
}

export interface ExchangeConfig {
  exchangeId: ExchangeId;
  apiKey?: string;
  apiSecret?: string;
  testnet?: boolean;
  rateLimit?: number;
}

export interface ExchangeCapabilities {
  spot: boolean;
  margin: boolean;
  futures: boolean;
  options: boolean;
  websocket: boolean;
  orderTypes: OrderType[];
}

// ============================================
// EXCHANGE INTERFACE
// ============================================

export interface IExchange {
  readonly id: ExchangeId;
  readonly name: string;
  readonly capabilities: ExchangeCapabilities;

  // Connection
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Account
  getBalances(): Promise<Balance[]>;
  getBalance(asset: string): Promise<Balance>;

  // Market Data
  getTicker(symbol: string): Promise<Ticker>;
  getTickers(symbols?: string[]): Promise<Ticker[]>;
  getOrderBook(symbol: string, limit?: number): Promise<OrderBook>;

  // Orders
  createOrder(params: CreateOrderParams): Promise<Order>;
  cancelOrder(orderId: string, symbol: string): Promise<boolean>;
  getOrder(orderId: string, symbol: string): Promise<Order>;
  getOpenOrders(symbol?: string): Promise<Order[]>;
  getOrderHistory(symbol?: string, limit?: number): Promise<Order[]>;

  // Trades
  getTradeHistory(symbol?: string, limit?: number): Promise<Trade[]>;
}

export interface OrderBook {
  symbol: string;
  bids: [number, number][]; // [price, quantity]
  asks: [number, number][];
  timestamp: number;
}

export interface CreateOrderParams {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
  stopPrice?: number;
  clientOrderId?: string;
}

// ============================================
// PAPER EXCHANGE (Simulated Trading)
// ============================================

export class PaperExchange extends EventEmitter implements IExchange {
  readonly id: ExchangeId = 'paper';
  readonly name = 'Paper Trading';
  readonly capabilities: ExchangeCapabilities = {
    spot: true,
    margin: false,
    futures: false,
    options: false,
    websocket: false,
    orderTypes: ['market', 'limit', 'stop'],
  };

  private connected = false;
  private balances: Map<string, Balance> = new Map();
  private orders: Map<string, Order> = new Map();
  private trades: Trade[] = [];
  private prices: Map<string, number> = new Map();

  constructor(initialBalances?: Record<string, number>) {
    super();
    
    // Initialize default balances
    const defaults = { USDT: 10000, BTC: 0.1, ETH: 1 };
    const balanceData = { ...defaults, ...initialBalances };
    
    for (const [asset, amount] of Object.entries(balanceData)) {
      this.balances.set(asset, {
        asset,
        free: amount,
        locked: 0,
        total: amount,
      });
    }

    // Initialize prices
    this.prices.set('BTCUSDT', 45000);
    this.prices.set('ETHUSDT', 3000);
    this.prices.set('SOLUSDT', 120);
  }

  async connect(): Promise<void> {
    this.connected = true;
    this.emit('connected');
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.emit('disconnected');
  }

  isConnected(): boolean {
    return this.connected;
  }

  async getBalances(): Promise<Balance[]> {
    return Array.from(this.balances.values());
  }

  async getBalance(asset: string): Promise<Balance> {
    return this.balances.get(asset) || { asset, free: 0, locked: 0, total: 0 };
  }

  async getTicker(symbol: string): Promise<Ticker> {
    const price = this.prices.get(symbol) || 100;
    const spread = price * 0.001;
    
    return {
      symbol,
      bid: price - spread,
      ask: price + spread,
      last: price,
      volume: 1000000,
      change24h: Math.random() * 10 - 5,
      timestamp: Date.now(),
    };
  }

  async getTickers(symbols?: string[]): Promise<Ticker[]> {
    const syms = symbols || Array.from(this.prices.keys());
    return Promise.all(syms.map(s => this.getTicker(s)));
  }

  async getOrderBook(symbol: string, limit = 10): Promise<OrderBook> {
    const price = this.prices.get(symbol) || 100;
    const spread = price * 0.001;
    
    const bids: [number, number][] = [];
    const asks: [number, number][] = [];
    
    for (let i = 0; i < limit; i++) {
      bids.push([price - spread * (i + 1), Math.random() * 10]);
      asks.push([price + spread * (i + 1), Math.random() * 10]);
    }
    
    return { symbol, bids, asks, timestamp: Date.now() };
  }

  async createOrder(params: CreateOrderParams): Promise<Order> {
    const orderId = `paper_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const now = Date.now();
    const price = params.price || this.prices.get(params.symbol) || 100;
    
    const order: Order = {
      id: orderId,
      clientOrderId: params.clientOrderId,
      symbol: params.symbol,
      side: params.side,
      type: params.type,
      status: 'filled', // Paper trading instantly fills
      price,
      quantity: params.quantity,
      filledQuantity: params.quantity,
      avgPrice: price,
      createdAt: now,
      updatedAt: now,
      fee: price * params.quantity * 0.001,
      feeCurrency: 'USDT',
    };

    this.orders.set(orderId, order);
    
    // Update balances
    this.updateBalances(order);

    // Create trade record
    const trade: Trade = {
      id: `trade_${orderId}`,
      orderId,
      symbol: params.symbol,
      side: params.side,
      price,
      quantity: params.quantity,
      fee: order.fee || 0,
      feeCurrency: 'USDT',
      timestamp: now,
    };
    this.trades.push(trade);

    this.emit('order:filled', order);
    return order;
  }

  async cancelOrder(orderId: string, _symbol: string): Promise<boolean> {
    const order = this.orders.get(orderId);
    if (order && order.status === 'open') {
      order.status = 'cancelled';
      order.updatedAt = Date.now();
      this.emit('order:cancelled', order);
      return true;
    }
    return false;
  }

  async getOrder(orderId: string, _symbol: string): Promise<Order> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }
    return order;
  }

  async getOpenOrders(_symbol?: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(o => o.status === 'open');
  }

  async getOrderHistory(_symbol?: string, limit = 100): Promise<Order[]> {
    return Array.from(this.orders.values()).slice(-limit);
  }

  async getTradeHistory(_symbol?: string, limit = 100): Promise<Trade[]> {
    return this.trades.slice(-limit);
  }

  setPrice(symbol: string, price: number): void {
    this.prices.set(symbol, price);
    this.emit('price:update', { symbol, price });
  }

  private updateBalances(order: Order): void {
    const [base, quote] = this.parseSymbol(order.symbol);
    const baseBalance = this.balances.get(base) || { asset: base, free: 0, locked: 0, total: 0 };
    const quoteBalance = this.balances.get(quote) || { asset: quote, free: 0, locked: 0, total: 0 };

    const cost = order.avgPrice * order.filledQuantity;
    const fee = order.fee || 0;

    if (order.side === 'buy') {
      baseBalance.free += order.filledQuantity;
      baseBalance.total = baseBalance.free + baseBalance.locked;
      quoteBalance.free -= cost + fee;
      quoteBalance.total = quoteBalance.free + quoteBalance.locked;
    } else {
      baseBalance.free -= order.filledQuantity;
      baseBalance.total = baseBalance.free + baseBalance.locked;
      quoteBalance.free += cost - fee;
      quoteBalance.total = quoteBalance.free + quoteBalance.locked;
    }

    this.balances.set(base, baseBalance);
    this.balances.set(quote, quoteBalance);
  }

  private parseSymbol(symbol: string): [string, string] {
    // Simple parsing for common pairs
    const quotes = ['USDT', 'USD', 'BUSD', 'BTC', 'ETH'];
    for (const quote of quotes) {
      if (symbol.endsWith(quote)) {
        return [symbol.slice(0, -quote.length), quote];
      }
    }
    return [symbol.slice(0, 3), symbol.slice(3)];
  }
}

// ============================================
// TRADING MANAGER
// ============================================

export class TradingManager extends EventEmitter {
  private exchanges: Map<ExchangeId, IExchange> = new Map();
  private defaultExchange: ExchangeId = 'paper';

  constructor() {
    super();
    // Initialize paper exchange by default
    this.exchanges.set('paper', new PaperExchange());
  }

  async addExchange(config: ExchangeConfig): Promise<IExchange> {
    let exchange: IExchange;

    switch (config.exchangeId) {
      case 'paper':
        exchange = new PaperExchange();
        break;
      // Add other exchanges here as needed
      default:
        throw new Error(`Exchange ${config.exchangeId} not supported yet`);
    }

    await exchange.connect();
    this.exchanges.set(config.exchangeId, exchange);
    return exchange;
  }

  getExchange(exchangeId?: ExchangeId): IExchange {
    const id = exchangeId || this.defaultExchange;
    const exchange = this.exchanges.get(id);
    if (!exchange) {
      throw new Error(`Exchange ${id} not found`);
    }
    return exchange;
  }

  setDefaultExchange(exchangeId: ExchangeId): void {
    if (!this.exchanges.has(exchangeId)) {
      throw new Error(`Exchange ${exchangeId} not registered`);
    }
    this.defaultExchange = exchangeId;
  }

  async createOrder(params: CreateOrderParams, exchangeId?: ExchangeId): Promise<Order> {
    return this.getExchange(exchangeId).createOrder(params);
  }

  async getBalances(exchangeId?: ExchangeId): Promise<Balance[]> {
    return this.getExchange(exchangeId).getBalances();
  }

  async getTicker(symbol: string, exchangeId?: ExchangeId): Promise<Ticker> {
    return this.getExchange(exchangeId).getTicker(symbol);
  }
}

// ============================================
// FACTORY FUNCTIONS
// ============================================

export function createTradingManager(): TradingManager {
  return new TradingManager();
}

export function createPaperExchange(initialBalances?: Record<string, number>): PaperExchange {
  return new PaperExchange(initialBalances);
}

// ============================================
// EXPORTS
// ============================================

export * from './hft/scalping-engine';
