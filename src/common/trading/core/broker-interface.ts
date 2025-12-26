/**
 * Broker Interface - Base abstrata para integração com corretoras
 * Suporta API, FIX Protocol, e Web Automation
 */

import { injectable } from 'inversify';
import { EventEmitter } from 'events';
import {
  OrderRequest,
  Order,
  Position,
  Quote,
  Asset,
  OrderBook,
  OHLCV,
  BrokerConnectionStatus,
  BrokerCapabilities,
} from './trading-types';

/**
 * Interface abstrata para todos os brokers
 */
export interface IBroker {
  readonly id: string;
  readonly name: string;
  readonly type: 'api' | 'fix' | 'web';
  readonly capabilities: BrokerCapabilities;

  // Connection
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getConnectionStatus(): BrokerConnectionStatus;

  // Account
  getAccountInfo(): Promise<AccountInfo>;
  getBalance(): Promise<Balance>;
  getPositions(): Promise<Position[]>;

  // Market Data
  getQuote(assetId: string): Promise<Quote>;
  getQuotes(assetIds: string[]): Promise<Map<string, Quote>>;
  subscribeQuotes(assetIds: string[], callback: (quotes: Map<string, Quote>) => void): void;
  unsubscribeQuotes(assetIds: string[]): void;
  getOrderBook(assetId: string, depth?: number): Promise<OrderBook>;
  getOHLCV(assetId: string, interval: string, limit?: number): Promise<OHLCV[]>;

  // Trading
  placeOrder(order: OrderRequest): Promise<Order>;
  cancelOrder(orderId: string): Promise<boolean>;
  modifyOrder(orderId: string, modifications: Partial<OrderRequest>): Promise<Order>;
  getOrder(orderId: string): Promise<Order>;
  getOrders(status?: string): Promise<Order[]>;

  // Assets
  searchAssets(query: string): Promise<Asset[]>;
  getAsset(assetId: string): Promise<Asset>;
}

export interface AccountInfo {
  accountId: string;
  accountType: 'cash' | 'margin';
  currency: string;
  status: 'active' | 'restricted' | 'suspended';
  permissions: string[];
  marginEnabled: boolean;
  optionsLevel?: number;
}

export interface Balance {
  total: number;
  available: number;
  margin: number;
  unrealizedPnL: number;
  realizedPnL: number;
  currency: string;
}

/**
 * Base class para implementações de broker
 */
@injectable()
export abstract class BaseBroker extends EventEmitter implements IBroker {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly type: 'api' | 'fix' | 'web';
  abstract readonly capabilities: BrokerCapabilities;

  protected connectionStatus: BrokerConnectionStatus = {
    connected: false,
    latency: 0,
    lastUpdate: new Date(),
  };

  protected quoteSubscriptions: Map<string, Set<(quotes: Map<string, Quote>) => void>> = new Map();

  // ============================================
  // Connection Management
  // ============================================

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;

  getConnectionStatus(): BrokerConnectionStatus {
    return { ...this.connectionStatus };
  }

  protected setConnected(connected: boolean): void {
    this.connectionStatus.connected = connected;
    this.connectionStatus.lastUpdate = new Date();
    this.emit(connected ? 'connected' : 'disconnected');
  }

  protected updateLatency(latencyMs: number): void {
    this.connectionStatus.latency = latencyMs;
    this.connectionStatus.lastUpdate = new Date();
  }

  // ============================================
  // Account (Abstract)
  // ============================================

  abstract getAccountInfo(): Promise<AccountInfo>;
  abstract getBalance(): Promise<Balance>;
  abstract getPositions(): Promise<Position[]>;

  // ============================================
  // Market Data (Abstract)
  // ============================================

  abstract getQuote(assetId: string): Promise<Quote>;
  abstract getQuotes(assetIds: string[]): Promise<Map<string, Quote>>;
  abstract getOrderBook(assetId: string, depth?: number): Promise<OrderBook>;
  abstract getOHLCV(assetId: string, interval: string, limit?: number): Promise<OHLCV[]>;

  subscribeQuotes(assetIds: string[], callback: (quotes: Map<string, Quote>) => void): void {
    assetIds.forEach(assetId => {
      if (!this.quoteSubscriptions.has(assetId)) {
        this.quoteSubscriptions.set(assetId, new Set());
      }
      this.quoteSubscriptions.get(assetId)!.add(callback);
    });
  }

  unsubscribeQuotes(assetIds: string[]): void {
    assetIds.forEach(assetId => {
      this.quoteSubscriptions.delete(assetId);
    });
  }

  protected notifyQuoteUpdate(quotes: Map<string, Quote>): void {
    quotes.forEach((quote, assetId) => {
      const callbacks = this.quoteSubscriptions.get(assetId);
      if (callbacks) {
        const singleQuote = new Map([[assetId, quote]]);
        callbacks.forEach(cb => cb(singleQuote));
      }
    });

    // Also notify with full map to subscribers of any asset
    this.emit('quotes', quotes);
  }

  // ============================================
  // Trading (Abstract)
  // ============================================

  abstract placeOrder(order: OrderRequest): Promise<Order>;
  abstract cancelOrder(orderId: string): Promise<boolean>;
  abstract modifyOrder(orderId: string, modifications: Partial<OrderRequest>): Promise<Order>;
  abstract getOrder(orderId: string): Promise<Order>;
  abstract getOrders(status?: string): Promise<Order[]>;

  // ============================================
  // Assets (Abstract)
  // ============================================

  abstract searchAssets(query: string): Promise<Asset[]>;
  abstract getAsset(assetId: string): Promise<Asset>;

  // ============================================
  // Utility Methods
  // ============================================

  protected generateOrderId(): string {
    return `${this.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  protected validateOrder(order: OrderRequest): void {
    if (!order.assetId) throw new Error('Asset ID é obrigatório');
    if (!order.quantity || order.quantity <= 0) throw new Error('Quantidade deve ser positiva');
    if (!order.type) throw new Error('Tipo de ordem é obrigatório');
    if (!order.side) throw new Error('Side (buy/sell) é obrigatório');
    
    if (order.type === 'limit' && !order.price) {
      throw new Error('Preço é obrigatório para ordens limit');
    }
  }
}

/**
 * Paper Broker (simulação/paper trading)
 */
@injectable()
export class PaperBroker extends BaseBroker {
  readonly id = 'paper';
  readonly name = 'Paper Broker (Simulated Trading)';
  readonly type: 'api' = 'api';
  readonly capabilities: BrokerCapabilities = {
    orderTypes: ['market', 'limit', 'stop', 'stop_limit'],
    timeInForce: ['day', 'gtc', 'ioc', 'fok'],
    supportsMarginTrading: true,
    supportsShortSelling: true,
    supportsOptions: false,
    supportsFutures: false,
    supportsCrypto: true,
    maxOrderSize: 1000000,
    minOrderSize: 1,
    supportedMarkets: ['US', 'BR', 'CRYPTO'],
  };

  private paperBalance: Balance = {
    total: 100000,
    available: 100000,
    margin: 0,
    unrealizedPnL: 0,
    realizedPnL: 0,
    currency: 'USD',
  };

  private paperPositions: Position[] = [];
  private paperOrders: Map<string, Order> = new Map();
  private priceFeed: Map<string, number> = new Map();

  async connect(): Promise<void> {
    await this.simulateLatency();
    this.setConnected(true);
    this.initializePriceFeed();
  }

  async disconnect(): Promise<void> {
    await this.simulateLatency();
    this.setConnected(false);
  }

  async getAccountInfo(): Promise<AccountInfo> {
    await this.simulateLatency();
    return {
      accountId: 'PAPER-001',
      accountType: 'margin',
      currency: 'USD',
      status: 'active',
      permissions: ['trading', 'data'],
      marginEnabled: true,
      optionsLevel: 2,
    };
  }

  async getBalance(): Promise<Balance> {
    await this.simulateLatency();
    return { ...this.paperBalance };
  }

  async getPositions(): Promise<Position[]> {
    await this.simulateLatency();
    return [...this.paperPositions];
  }

  async getQuote(assetId: string): Promise<Quote> {
    await this.simulateLatency();
    const price = this.getPrice(assetId);
    const spread = price * 0.001; // 0.1% spread

    return {
      symbol: assetId,
      bid: price - spread / 2,
      ask: price + spread / 2,
      bidSize: Math.floor(Math.random() * 10000),
      askSize: Math.floor(Math.random() * 10000),
      last: price,
      lastSize: Math.floor(Math.random() * 1000),
      volume: Math.floor(Math.random() * 1000000),
      timestamp: Date.now(),
    };
  }

  async getQuotes(assetIds: string[]): Promise<Map<string, Quote>> {
    const quotes = new Map<string, Quote>();
    for (const assetId of assetIds) {
      quotes.set(assetId, await this.getQuote(assetId));
    }
    return quotes;
  }

  async getOrderBook(assetId: string, depth: number = 10): Promise<OrderBook> {
    await this.simulateLatency();
    const price = this.getPrice(assetId);
    const bids: Array<{ price: number; quantity: number }> = [];
    const asks: Array<{ price: number; quantity: number }> = [];

    for (let i = 0; i < depth; i++) {
      bids.push({
        price: price * (1 - 0.001 * (i + 1)),
        quantity: Math.floor(Math.random() * 1000) + 100,
      });
      asks.push({
        price: price * (1 + 0.001 * (i + 1)),
        quantity: Math.floor(Math.random() * 1000) + 100,
      });
    }

    return {
      assetId,
      bids,
      asks,
      timestamp: new Date(),
    };
  }

  async getOHLCV(assetId: string, interval: string, limit: number = 100): Promise<OHLCV[]> {
    await this.simulateLatency();
    const basePrice = this.getPrice(assetId);
    const candles: OHLCV[] = [];
    const intervalMs = this.parseInterval(interval);

    let currentPrice = basePrice;
    const now = Date.now();

    for (let i = limit - 1; i >= 0; i--) {
      const volatility = 0.02; // 2% volatility
      const change = (Math.random() - 0.5) * volatility;
      
      const open = currentPrice;
      const close = currentPrice * (1 + change);
      const high = Math.max(open, close) * (1 + Math.random() * volatility / 2);
      const low = Math.min(open, close) * (1 - Math.random() * volatility / 2);
      
      candles.push({
        timestamp: now - intervalMs * i,
        open,
        high,
        low,
        close,
        volume: Math.floor(Math.random() * 100000) + 10000,
      });

      currentPrice = close;
    }

    return candles;
  }

  async placeOrder(order: OrderRequest): Promise<Order> {
    await this.simulateLatency();
    this.validateOrder(order);

    const orderId = this.generateOrderId();
    const price = order.price || this.getPrice(order.assetId);

    const newOrder: Order = {
      id: orderId,
      assetId: order.assetId,
      type: order.type,
      side: order.side,
      quantity: order.quantity,
      price,
      status: 'pending',
      filledQuantity: 0,
      averagePrice: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.paperOrders.set(orderId, newOrder);

    // Simulate order fill after short delay
    setTimeout(() => this.simulateFill(orderId), 100 + Math.random() * 200);

    return newOrder;
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    await this.simulateLatency();
    const order = this.paperOrders.get(orderId);
    
    if (!order) return false;
    if (order.status === 'filled' || order.status === 'cancelled') return false;

    order.status = 'cancelled';
    order.updatedAt = new Date();
    
    return true;
  }

  async modifyOrder(orderId: string, modifications: Partial<OrderRequest>): Promise<Order> {
    await this.simulateLatency();
    const order = this.paperOrders.get(orderId);
    
    if (!order) throw new Error('Ordem não encontrada');
    if (order.status !== 'pending' && order.status !== 'open') {
      throw new Error('Não é possível modificar ordem neste status');
    }

    if (modifications.price) order.price = modifications.price;
    if (modifications.quantity) order.quantity = modifications.quantity;
    order.updatedAt = new Date();

    return order;
  }

  async getOrder(orderId: string): Promise<Order> {
    await this.simulateLatency();
    const order = this.paperOrders.get(orderId);
    if (!order) throw new Error('Ordem não encontrada');
    return order;
  }

  async getOrders(status?: string): Promise<Order[]> {
    await this.simulateLatency();
    let orders = Array.from(this.paperOrders.values());
    if (status) {
      orders = orders.filter(o => o.status === status);
    }
    return orders;
  }

  async searchAssets(query: string): Promise<Asset[]> {
    await this.simulateLatency();
    const sampleAssets: Asset[] = [
      { id: 'AAPL', symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', exchange: 'NASDAQ', currency: 'USD' },
      { id: 'GOOGL', symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock', exchange: 'NASDAQ', currency: 'USD' },
      { id: 'MSFT', symbol: 'MSFT', name: 'Microsoft Corp.', type: 'stock', exchange: 'NASDAQ', currency: 'USD' },
      { id: 'BTC-USD', symbol: 'BTC', name: 'Bitcoin', type: 'crypto', exchange: 'CRYPTO', currency: 'USD' },
      { id: 'ETH-USD', symbol: 'ETH', name: 'Ethereum', type: 'crypto', exchange: 'CRYPTO', currency: 'USD' },
      { id: 'PETR4', symbol: 'PETR4', name: 'Petrobras PN', type: 'stock', exchange: 'B3', currency: 'BRL' },
      { id: 'VALE3', symbol: 'VALE3', name: 'Vale ON', type: 'stock', exchange: 'B3', currency: 'BRL' },
    ];

    const lowerQuery = query.toLowerCase();
    return sampleAssets.filter(a => 
      a.symbol.toLowerCase().includes(lowerQuery) ||
      a.name.toLowerCase().includes(lowerQuery)
    );
  }

  async getAsset(assetId: string): Promise<Asset> {
    await this.simulateLatency();
    const assets = await this.searchAssets(assetId);
    const asset = assets.find(a => a.id === assetId);
    if (!asset) throw new Error('Ativo não encontrado');
    return asset;
  }

  // Private helper methods
  private async simulateLatency(): Promise<void> {
    const latency = 10 + Math.random() * 50;
    this.updateLatency(latency);
    await new Promise(resolve => setTimeout(resolve, latency));
  }

  private getPrice(assetId: string): number {
    if (!this.priceFeed.has(assetId)) {
      // Generate random price based on asset type
      let basePrice: number;
      if (assetId.includes('BTC')) basePrice = 40000 + Math.random() * 5000;
      else if (assetId.includes('ETH')) basePrice = 2000 + Math.random() * 500;
      else if (assetId.includes('4') || assetId.includes('3')) basePrice = 20 + Math.random() * 30; // BR stocks
      else basePrice = 100 + Math.random() * 200; // US stocks
      
      this.priceFeed.set(assetId, basePrice);
    }

    // Add some random movement
    const currentPrice = this.priceFeed.get(assetId)!;
    const newPrice = currentPrice * (1 + (Math.random() - 0.5) * 0.002);
    this.priceFeed.set(assetId, newPrice);

    return newPrice;
  }

  private initializePriceFeed(): void {
    this.priceFeed.set('AAPL', 175);
    this.priceFeed.set('GOOGL', 140);
    this.priceFeed.set('MSFT', 380);
    this.priceFeed.set('BTC-USD', 42000);
    this.priceFeed.set('ETH-USD', 2500);
    this.priceFeed.set('PETR4', 35);
    this.priceFeed.set('VALE3', 70);
  }

  private simulateFill(orderId: string): void {
    const order = this.paperOrders.get(orderId);
    if (!order || order.status !== 'pending') return;

    // Simulate full fill
    order.status = 'filled';
    order.filledQuantity = order.quantity;
    order.averagePrice = order.price || this.getPrice(order.assetId);
    order.updatedAt = new Date();

    // Update position
    this.updatePaperPosition(order);

    // Emit fill event
    this.emit('orderFilled', order);
  }

  private updatePaperPosition(order: Order): void {
    const existingPosition = this.paperPositions.find(p => p.assetId === order.assetId);
    
    if (existingPosition) {
      if (order.side === 'buy') {
        existingPosition.quantity += order.filledQuantity;
      } else {
        existingPosition.quantity -= order.filledQuantity;
      }
      
      // Remove position if quantity is 0
      if (existingPosition.quantity === 0) {
        const index = this.paperPositions.indexOf(existingPosition);
        this.paperPositions.splice(index, 1);
      }
    } else if (order.side === 'buy') {
      // Create new position
      this.paperPositions.push({
        id: `pos-${order.assetId}`,
        assetId: order.assetId,
        quantity: order.filledQuantity,
        averagePrice: order.averagePrice,
        marketValue: order.filledQuantity * order.averagePrice,
        unrealizedPnL: 0,
        side: 'long',
        openedAt: new Date(),
      });
    }

    // Update balance
    const cost = order.filledQuantity * order.averagePrice;
    if (order.side === 'buy') {
      this.paperBalance.available -= cost;
    } else {
      this.paperBalance.available += cost;
    }
  }

  private parseInterval(interval: string): number {
    const map: Record<string, number> = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000,
    };
    return map[interval] || 60 * 60 * 1000;
  }
}
