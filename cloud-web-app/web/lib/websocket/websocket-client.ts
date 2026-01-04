/**
 * Aethel Engine - WebSocket Client
 * 
 * Cliente WebSocket profissional para conexão com o servidor.
 * Suporta reconexão automática, heartbeat e múltiplos canais.
 */

import { EventEmitter } from 'events';

// ============================================================================
// Types
// ============================================================================

export interface WsClientConfig {
  url: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  pingInterval?: number;
  debug?: boolean;
}

export interface WsMessage {
  type: string;
  channel: string;
  payload: any;
  timestamp?: number;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface TerminalSessionInfo {
  sessionId: string;
  name: string;
  shell: string;
  cwd: string;
}

// ============================================================================
// Message Types (must match server)
// ============================================================================

export const WS_MESSAGE_TYPES = {
  AUTH: 'auth',
  AUTH_SUCCESS: 'auth_success',
  AUTH_ERROR: 'auth_error',
  PING: 'ping',
  PONG: 'pong',
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
  SUBSCRIBED: 'subscribed',
  UNSUBSCRIBED: 'unsubscribed',
  TERMINAL_CREATE: 'terminal:create',
  TERMINAL_CREATED: 'terminal:created',
  TERMINAL_DATA: 'terminal:data',
  TERMINAL_INPUT: 'terminal:input',
  TERMINAL_RESIZE: 'terminal:resize',
  TERMINAL_KILL: 'terminal:kill',
  TERMINAL_EXIT: 'terminal:exit',
  TERMINAL_ERROR: 'terminal:error',
  COLLAB_JOIN: 'collab:join',
  COLLAB_LEAVE: 'collab:leave',
  COLLAB_SYNC: 'collab:sync',
  COLLAB_OPERATION: 'collab:operation',
  COLLAB_CURSOR: 'collab:cursor',
  COLLAB_SELECTION: 'collab:selection',
  COLLAB_AWARENESS: 'collab:awareness',
  COLLAB_CHAT: 'collab:chat',
  FILE_CHANGED: 'file:changed',
  FILE_CREATED: 'file:created',
  FILE_DELETED: 'file:deleted',
  FILE_RENAMED: 'file:renamed',
  ERROR: 'error',
  BROADCAST: 'broadcast',
} as const;

// ============================================================================
// WebSocket Client
// ============================================================================

export class AethelWebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: Required<WsClientConfig>;
  private state: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private subscribedChannels: Set<string> = new Set();
  private pendingMessages: WsMessage[] = [];
  private clientId: string = '';
  private userId: string = '';
  private authenticated = false;
  
  constructor(config: WsClientConfig) {
    super();
    
    this.config = {
      url: config.url,
      autoReconnect: config.autoReconnect ?? true,
      reconnectInterval: config.reconnectInterval ?? 3000,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 10,
      pingInterval: config.pingInterval ?? 25000,
      debug: config.debug ?? false,
    };
  }
  
  // ==========================================================================
  // Connection
  // ==========================================================================
  
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }
      
      this.setState('connecting');
      this.log('Connecting to', this.config.url);
      
      try {
        this.ws = new WebSocket(this.config.url);
        
        this.ws.onopen = () => {
          this.log('Connected');
          this.setState('connected');
          this.reconnectAttempts = 0;
          this.startPing();
          this.flushPendingMessages();
          this.resubscribeChannels();
          this.emit('connected');
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
        
        this.ws.onerror = (error) => {
          this.log('WebSocket error:', error);
          this.emit('error', error);
        };
        
        this.ws.onclose = (event) => {
          this.log('Disconnected:', event.code, event.reason);
          this.handleDisconnect();
          
          if (this.state === 'connecting') {
            reject(new Error('Connection failed'));
          }
        };
      } catch (error) {
        this.setState('disconnected');
        reject(error);
      }
    });
  }
  
  disconnect(): void {
    this.config.autoReconnect = false;
    this.stopReconnect();
    this.stopPing();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.setState('disconnected');
    this.authenticated = false;
    this.emit('disconnected');
  }
  
  private handleDisconnect(): void {
    this.stopPing();
    this.ws = null;
    this.authenticated = false;
    
    this.emit('disconnected');
    
    if (this.config.autoReconnect) {
      this.scheduleReconnect();
    } else {
      this.setState('disconnected');
    }
  }
  
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.log('Max reconnect attempts reached');
      this.setState('disconnected');
      this.emit('maxReconnectAttempts');
      return;
    }
    
    this.setState('reconnecting');
    this.reconnectAttempts++;
    
    const delay = this.config.reconnectInterval * Math.min(this.reconnectAttempts, 5);
    this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {
        // Will retry via onclose handler
      });
    }, delay);
  }
  
  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
  
  // ==========================================================================
  // Authentication
  // ==========================================================================
  
  authenticate(userId: string, token?: string): void {
    this.userId = userId;
    this.send({
      type: WS_MESSAGE_TYPES.AUTH,
      channel: 'system',
      payload: { userId, token },
    });
  }
  
  // ==========================================================================
  // Messaging
  // ==========================================================================
  
  send(message: WsMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      if (this.config.autoReconnect) {
        this.pendingMessages.push(message);
      }
      return false;
    }
    
    try {
      this.ws.send(JSON.stringify({
        ...message,
        timestamp: Date.now(),
      }));
      return true;
    } catch (error) {
      this.log('Send error:', error);
      return false;
    }
  }
  
  private handleMessage(data: string): void {
    let message: WsMessage;
    
    try {
      message = JSON.parse(data);
    } catch {
      this.log('Invalid message:', data);
      return;
    }
    
    this.log('Received:', message.type, message.channel);
    
    // Handle system messages
    switch (message.type) {
      case 'welcome':
        this.clientId = message.payload.clientId;
        this.emit('welcome', message.payload);
        break;
        
      case WS_MESSAGE_TYPES.AUTH_SUCCESS:
        this.authenticated = true;
        this.emit('authenticated', message.payload);
        break;
        
      case WS_MESSAGE_TYPES.AUTH_ERROR:
        this.authenticated = false;
        this.emit('authError', message.payload);
        break;
        
      case WS_MESSAGE_TYPES.PONG:
        // Heartbeat response
        break;
        
      case WS_MESSAGE_TYPES.SUBSCRIBED:
        this.subscribedChannels.add(message.channel);
        this.emit('subscribed', { channel: message.channel, ...message.payload });
        break;
        
      case WS_MESSAGE_TYPES.UNSUBSCRIBED:
        this.subscribedChannels.delete(message.channel);
        this.emit('unsubscribed', { channel: message.channel });
        break;
        
      case WS_MESSAGE_TYPES.ERROR:
        this.emit('serverError', message.payload);
        break;
        
      default:
        // Emit specific event
        this.emit(message.type, message.payload);
        
        // Also emit channel-specific event
        if (message.channel) {
          this.emit(`channel:${message.channel}`, message);
        }
    }
  }
  
  private flushPendingMessages(): void {
    while (this.pendingMessages.length > 0) {
      const message = this.pendingMessages.shift();
      if (message) {
        this.send(message);
      }
    }
  }
  
  // ==========================================================================
  // Channels
  // ==========================================================================
  
  subscribe(channel: string, options?: any): void {
    this.subscribedChannels.add(channel);
    this.send({
      type: WS_MESSAGE_TYPES.SUBSCRIBE,
      channel,
      payload: options || {},
    });
  }
  
  unsubscribe(channel: string): void {
    this.subscribedChannels.delete(channel);
    this.send({
      type: WS_MESSAGE_TYPES.UNSUBSCRIBE,
      channel,
      payload: {},
    });
  }
  
  private resubscribeChannels(): void {
    for (const channel of this.subscribedChannels) {
      this.send({
        type: WS_MESSAGE_TYPES.SUBSCRIBE,
        channel,
        payload: {},
      });
    }
  }
  
  // ==========================================================================
  // Terminal Methods
  // ==========================================================================
  
  createTerminal(options: {
    sessionId?: string;
    name?: string;
    cwd?: string;
    shell?: string;
    cols?: number;
    rows?: number;
  }): void {
    this.send({
      type: WS_MESSAGE_TYPES.TERMINAL_CREATE,
      channel: 'terminal',
      payload: options,
    });
  }
  
  writeTerminal(sessionId: string, data: string): void {
    this.send({
      type: WS_MESSAGE_TYPES.TERMINAL_INPUT,
      channel: `terminal:${sessionId}`,
      payload: { sessionId, data },
    });
  }
  
  resizeTerminal(sessionId: string, cols: number, rows: number): void {
    this.send({
      type: WS_MESSAGE_TYPES.TERMINAL_RESIZE,
      channel: `terminal:${sessionId}`,
      payload: { sessionId, cols, rows },
    });
  }
  
  killTerminal(sessionId: string): void {
    this.send({
      type: WS_MESSAGE_TYPES.TERMINAL_KILL,
      channel: `terminal:${sessionId}`,
      payload: { sessionId },
    });
  }
  
  // ==========================================================================
  // Collaboration Methods
  // ==========================================================================
  
  joinDocument(documentId: string, user: {
    userId: string;
    userName: string;
    color?: string;
  }): void {
    this.send({
      type: WS_MESSAGE_TYPES.COLLAB_JOIN,
      channel: `collab:${documentId}`,
      payload: {
        documentId,
        ...user,
      },
    });
  }
  
  sendOperation(documentId: string, operation: any): void {
    this.send({
      type: WS_MESSAGE_TYPES.COLLAB_OPERATION,
      channel: `collab:${documentId}`,
      payload: operation,
    });
  }
  
  sendCursor(documentId: string, cursor: { line: number; column: number }): void {
    this.send({
      type: WS_MESSAGE_TYPES.COLLAB_CURSOR,
      channel: `collab:${documentId}`,
      payload: cursor,
    });
  }
  
  sendSelection(documentId: string, selection: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  }): void {
    this.send({
      type: WS_MESSAGE_TYPES.COLLAB_SELECTION,
      channel: `collab:${documentId}`,
      payload: selection,
    });
  }
  
  sendChatMessage(documentId: string, message: string): void {
    this.send({
      type: WS_MESSAGE_TYPES.COLLAB_CHAT,
      channel: `collab:${documentId}`,
      payload: { message },
    });
  }
  
  // ==========================================================================
  // File Watching
  // ==========================================================================
  
  watchWorkspace(workspaceId: string): void {
    this.subscribe(`files:${workspaceId}`);
  }
  
  unwatchWorkspace(workspaceId: string): void {
    this.unsubscribe(`files:${workspaceId}`);
  }
  
  // ==========================================================================
  // Heartbeat
  // ==========================================================================
  
  private startPing(): void {
    this.stopPing();
    
    this.pingTimer = setInterval(() => {
      this.send({
        type: WS_MESSAGE_TYPES.PING,
        channel: 'system',
        payload: {},
      });
    }, this.config.pingInterval);
  }
  
  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }
  
  // ==========================================================================
  // State
  // ==========================================================================
  
  private setState(state: ConnectionState): void {
    const prevState = this.state;
    this.state = state;
    
    if (prevState !== state) {
      this.emit('stateChange', { prevState, state });
    }
  }
  
  getState(): ConnectionState {
    return this.state;
  }
  
  isConnected(): boolean {
    return this.state === 'connected';
  }
  
  isAuthenticated(): boolean {
    return this.authenticated;
  }
  
  getClientId(): string {
    return this.clientId;
  }
  
  getSubscribedChannels(): string[] {
    return Array.from(this.subscribedChannels);
  }
  
  // ==========================================================================
  // Utils
  // ==========================================================================
  
  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[AethelWS]', ...args);
    }
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let _client: AethelWebSocketClient | null = null;

export function getWebSocketClient(url?: string): AethelWebSocketClient {
  if (!_client) {
    const wsUrl = url || 
      process.env.NEXT_PUBLIC_WS_URL || 
      (typeof window !== 'undefined' 
        ? `ws://${window.location.hostname}:3001` 
        : 'ws://localhost:3001');
    
    _client = new AethelWebSocketClient({
      url: wsUrl,
      autoReconnect: true,
      debug: process.env.NODE_ENV === 'development',
    });
  }
  return _client;
}

export async function connectWebSocket(userId?: string): Promise<AethelWebSocketClient> {
  const client = getWebSocketClient();
  await client.connect();
  
  if (userId) {
    client.authenticate(userId);
  }
  
  return client;
}

export default getWebSocketClient;
