/**
 * Redis Pub/Sub Adapter for WebSocket Server
 * 
 * Enables horizontal scaling of WebSocket connections across multiple
 * server instances. All instances subscribe to the same Redis channels,
 * allowing broadcasts to reach all connected clients regardless of which
 * server they're connected to.
 * 
 * Architecture:
 * - Each WS server instance has its own in-memory client map
 * - When broadcasting, messages go through Redis Pub/Sub
 * - All instances receive the message and relay to their local clients
 * 
 * Usage:
 * const adapter = new RedisPubSubAdapter();
 * await adapter.connect();
 * websocketServer.setAdapter(adapter);
 */

import { EventEmitter } from 'events';
import { createClient, RedisClientType } from 'redis';

// ============================================================================
// TYPES
// ============================================================================

export interface PubSubMessage {
  type: string;
  channel: string;
  payload: unknown;
  sourceServerId: string;
  timestamp: number;
}

export interface AdapterOptions {
  redisUrl?: string;
  prefix?: string;
  serverId?: string;
}

// ============================================================================
// REDIS ADAPTER
// ============================================================================

export class RedisPubSubAdapter extends EventEmitter {
  private publisher: RedisClientType | null = null;
  private subscriber: RedisClientType | null = null;
  private readonly redisUrl: string;
  private readonly prefix: string;
  private readonly serverId: string;
  private subscribedChannels: Set<string> = new Set();
  private isConnected = false;

  constructor(options: AdapterOptions = {}) {
    super();
    this.redisUrl = options.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
    this.prefix = options.prefix || 'aethel:ws:';
    this.serverId = options.serverId || `server-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  // ==========================================================================
  // CONNECTION
  // ==========================================================================

  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      // Create publisher client
      this.publisher = createClient({ url: this.redisUrl });
      this.publisher.on('error', (err) => this.emit('error', err));
      await this.publisher.connect();

      // Create subscriber client (separate connection required for pub/sub)
      this.subscriber = createClient({ url: this.redisUrl });
      this.subscriber.on('error', (err) => this.emit('error', err));
      await this.subscriber.connect();

      this.isConnected = true;
      console.log(`[RedisPubSub] Connected to ${this.redisUrl} as ${this.serverId}`);
      this.emit('connected');
    } catch (error) {
      console.error('[RedisPubSub] Connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) return;

    // Unsubscribe from all channels
    for (const channel of this.subscribedChannels) {
      await this.unsubscribeFromChannel(channel);
    }

    await this.publisher?.quit();
    await this.subscriber?.quit();
    
    this.publisher = null;
    this.subscriber = null;
    this.isConnected = false;
    
    console.log('[RedisPubSub] Disconnected');
    this.emit('disconnected');
  }

  // ==========================================================================
  // CHANNEL MANAGEMENT
  // ==========================================================================

  async subscribeToChannel(channel: string): Promise<void> {
    if (!this.subscriber || this.subscribedChannels.has(channel)) return;

    const redisChannel = `${this.prefix}${channel}`;
    
    await this.subscriber.subscribe(redisChannel, (message) => {
      try {
        const parsed: PubSubMessage = JSON.parse(message);
        
        // Ignore messages from self
        if (parsed.sourceServerId === this.serverId) return;
        
        this.emit('message', {
          channel,
          type: parsed.type,
          payload: parsed.payload,
          timestamp: parsed.timestamp,
        });
      } catch (error) {
        console.error('[RedisPubSub] Failed to parse message:', error);
      }
    });

    this.subscribedChannels.add(channel);
    console.log(`[RedisPubSub] Subscribed to channel: ${channel}`);
  }

  async unsubscribeFromChannel(channel: string): Promise<void> {
    if (!this.subscriber || !this.subscribedChannels.has(channel)) return;

    const redisChannel = `${this.prefix}${channel}`;
    await this.subscriber.unsubscribe(redisChannel);
    
    this.subscribedChannels.delete(channel);
    console.log(`[RedisPubSub] Unsubscribed from channel: ${channel}`);
  }

  // ==========================================================================
  // PUBLISHING
  // ==========================================================================

  async publish(channel: string, type: string, payload: unknown): Promise<void> {
    if (!this.publisher || !this.isConnected) {
      throw new Error('[RedisPubSub] Not connected');
    }

    const redisChannel = `${this.prefix}${channel}`;
    const message: PubSubMessage = {
      type,
      channel,
      payload,
      sourceServerId: this.serverId,
      timestamp: Date.now(),
    };

    await this.publisher.publish(redisChannel, JSON.stringify(message));
  }

  async broadcast(type: string, payload: unknown): Promise<void> {
    await this.publish('broadcast', type, payload);
  }

  // ==========================================================================
  // PRESENCE (Optional - for user presence across servers)
  // ==========================================================================

  async setUserPresence(userId: string, data: object): Promise<void> {
    if (!this.publisher) return;
    
    const key = `${this.prefix}presence:${userId}`;
    await this.publisher.hSet(key, {
      serverId: this.serverId,
      data: JSON.stringify(data),
      lastSeen: Date.now().toString(),
    });
    await this.publisher.expire(key, 300); // 5 minute TTL
  }

  async getUserPresence(userId: string): Promise<object | null> {
    if (!this.publisher) return null;
    
    const key = `${this.prefix}presence:${userId}`;
    const result = await this.publisher.hGetAll(key);
    
    if (!result.data) return null;
    
    return {
      serverId: result.serverId,
      data: JSON.parse(result.data),
      lastSeen: parseInt(result.lastSeen, 10),
    };
  }

  async removeUserPresence(userId: string): Promise<void> {
    if (!this.publisher) return;
    
    const key = `${this.prefix}presence:${userId}`;
    await this.publisher.del(key);
  }

  // ==========================================================================
  // ROOM MANAGEMENT (for collaboration rooms)
  // ==========================================================================

  async joinRoom(roomId: string, userId: string, metadata?: object): Promise<void> {
    if (!this.publisher) return;

    const roomKey = `${this.prefix}room:${roomId}:members`;
    await this.publisher.hSet(roomKey, userId, JSON.stringify({
      serverId: this.serverId,
      joinedAt: Date.now(),
      metadata,
    }));

    // Notify others in the room
    await this.publish(`room:${roomId}`, 'user:joined', {
      userId,
      metadata,
    });
  }

  async leaveRoom(roomId: string, userId: string): Promise<void> {
    if (!this.publisher) return;

    const roomKey = `${this.prefix}room:${roomId}:members`;
    await this.publisher.hDel(roomKey, userId);

    // Notify others in the room
    await this.publish(`room:${roomId}`, 'user:left', { userId });
  }

  async getRoomMembers(roomId: string): Promise<Map<string, object>> {
    if (!this.publisher) return new Map();

    const roomKey = `${this.prefix}room:${roomId}:members`;
    const members = await this.publisher.hGetAll(roomKey);
    
    const result = new Map<string, object>();
    for (const [userId, data] of Object.entries(members)) {
      result.set(userId, JSON.parse(data));
    }
    
    return result;
  }

  // ==========================================================================
  // STATS
  // ==========================================================================

  getStats() {
    return {
      serverId: this.serverId,
      isConnected: this.isConnected,
      subscribedChannels: Array.from(this.subscribedChannels),
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let globalAdapter: RedisPubSubAdapter | null = null;

export function getRedisPubSubAdapter(): RedisPubSubAdapter {
  if (!globalAdapter) {
    globalAdapter = new RedisPubSubAdapter();
  }
  return globalAdapter;
}

export default RedisPubSubAdapter;
