/**
 * Aethel Engine - WebSocket Server Runtime
 * 
 * Servidor WebSocket central para terminal, colaboração e file watching.
 * Implementação real com suporte a múltiplas conexões e rooms.
 */

import { WebSocketServer, WebSocket, RawData } from 'ws';
import { EventEmitter } from 'events';
import { createServer, IncomingMessage, Server as HttpServer } from 'http';
import { parse as parseUrl } from 'url';
import { 
  getTerminalPtyManager, 
  TerminalPtyManager,
  TerminalSessionConfig 
} from './terminal-pty-runtime';

// ============================================================================
// Types
// ============================================================================

export interface WsMessage {
  type: string;
  channel: string;
  payload: any;
  timestamp?: number;
}

export interface WsClient {
  id: string;
  userId: string;
  ws: WebSocket;
  channels: Set<string>;
  connectedAt: number;
  lastPing: number;
  isAlive: boolean;
  metadata: Record<string, any>;
}

export interface WsChannel {
  name: string;
  clients: Set<string>;
  type: 'terminal' | 'collaboration' | 'filewatcher' | 'general';
  metadata: Record<string, any>;
}

// ============================================================================
// Message Types
// ============================================================================

export const WS_MESSAGE_TYPES = {
  // Connection
  AUTH: 'auth',
  AUTH_SUCCESS: 'auth_success',
  AUTH_ERROR: 'auth_error',
  PING: 'ping',
  PONG: 'pong',
  
  // Channel
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
  SUBSCRIBED: 'subscribed',
  UNSUBSCRIBED: 'unsubscribed',
  
  // Terminal
  TERMINAL_CREATE: 'terminal:create',
  TERMINAL_CREATED: 'terminal:created',
  TERMINAL_DATA: 'terminal:data',
  TERMINAL_INPUT: 'terminal:input',
  TERMINAL_RESIZE: 'terminal:resize',
  TERMINAL_KILL: 'terminal:kill',
  TERMINAL_EXIT: 'terminal:exit',
  TERMINAL_ERROR: 'terminal:error',
  
  // Collaboration
  COLLAB_JOIN: 'collab:join',
  COLLAB_LEAVE: 'collab:leave',
  COLLAB_SYNC: 'collab:sync',
  COLLAB_OPERATION: 'collab:operation',
  COLLAB_CURSOR: 'collab:cursor',
  COLLAB_SELECTION: 'collab:selection',
  COLLAB_AWARENESS: 'collab:awareness',
  COLLAB_CHAT: 'collab:chat',
  
  // File Watcher
  FILE_CHANGED: 'file:changed',
  FILE_CREATED: 'file:created',
  FILE_DELETED: 'file:deleted',
  FILE_RENAMED: 'file:renamed',
  
  // General
  ERROR: 'error',
  BROADCAST: 'broadcast',
} as const;

// ============================================================================
// WebSocket Server Manager
// ============================================================================

export class AethelWebSocketServer extends EventEmitter {
  private wss: WebSocketServer | null = null;
  private httpServer: HttpServer | null = null;
  private clients: Map<string, WsClient> = new Map();
  private channels: Map<string, WsChannel> = new Map();
  private terminalManager: TerminalPtyManager;
  private pingInterval: NodeJS.Timeout | null = null;
  
  private readonly port: number;
  private readonly pingIntervalMs = 30000;
  private readonly clientTimeout = 60000;
  
  constructor(port: number = 3001) {
    super();
    this.port = port;
    this.terminalManager = getTerminalPtyManager();
    this.setupTerminalEvents();
  }
  
  // ==========================================================================
  // Server Lifecycle
  // ==========================================================================
  
  async start(): Promise<void> {
    if (this.wss) {
      throw new Error('WebSocket server already running');
    }
    
    return new Promise((resolve, reject) => {
      this.httpServer = createServer((req, res) => {
        // Health check endpoint
        if (req.url === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'ok',
            clients: this.clients.size,
            channels: this.channels.size,
            uptime: process.uptime(),
          }));
          return;
        }
        
        res.writeHead(426, { 'Content-Type': 'text/plain' });
        res.end('WebSocket connection required');
      });
      
      this.wss = new WebSocketServer({ server: this.httpServer });
      
      this.wss.on('connection', (ws, request) => this.handleConnection(ws, request));
      this.wss.on('error', (error) => this.emit('error', error));
      
      this.httpServer.listen(this.port, () => {
        console.log(`Aethel WebSocket server listening on port ${this.port}`);
        this.startPingInterval();
        this.emit('started', { port: this.port });
        resolve();
      });
      
      this.httpServer.on('error', reject);
    });
  }
  
  async stop(): Promise<void> {
    this.stopPingInterval();
    
    // Close all client connections
    for (const client of this.clients.values()) {
      client.ws.close(1001, 'Server shutting down');
    }
    this.clients.clear();
    this.channels.clear();
    
    // Close WebSocket server
    if (this.wss) {
      await new Promise<void>((resolve) => {
        this.wss!.close(() => resolve());
      });
      this.wss = null;
    }
    
    // Close HTTP server
    if (this.httpServer) {
      await new Promise<void>((resolve) => {
        this.httpServer!.close(() => resolve());
      });
      this.httpServer = null;
    }
    
    this.emit('stopped');
  }
  
  // ==========================================================================
  // Connection Handling
  // ==========================================================================
  
  private handleConnection(ws: WebSocket, request: IncomingMessage): void {
    const clientId = this.generateClientId();
    const url = parseUrl(request.url || '', true);
    
    const client: WsClient = {
      id: clientId,
      userId: '',
      ws,
      channels: new Set(),
      connectedAt: Date.now(),
      lastPing: Date.now(),
      isAlive: true,
      metadata: {
        ip: request.socket.remoteAddress,
        userAgent: request.headers['user-agent'],
        query: url.query,
      },
    };
    
    this.clients.set(clientId, client);
    
    ws.on('message', (data) => this.handleMessage(client, data));
    ws.on('close', () => this.handleDisconnect(client));
    ws.on('error', (error) => this.handleError(client, error));
    ws.on('pong', () => {
      client.lastPing = Date.now();
      client.isAlive = true;
    });
    
    // Send welcome message
    this.sendToClient(client, {
      type: 'welcome',
      channel: 'system',
      payload: {
        clientId,
        serverTime: Date.now(),
        version: '2.0.0',
      },
    });
    
    this.emit('connection', { clientId });
  }
  
  private handleDisconnect(client: WsClient): void {
    // Unsubscribe from all channels
    for (const channelName of client.channels) {
      this.unsubscribeFromChannel(client, channelName);
    }
    
    this.clients.delete(client.id);
    this.emit('disconnect', { clientId: client.id, userId: client.userId });
  }
  
  private handleError(client: WsClient, error: Error): void {
    console.error(`WebSocket error for client ${client.id}:`, error);
    this.emit('clientError', { clientId: client.id, error });
  }
  
  // ==========================================================================
  // Message Handling
  // ==========================================================================
  
  private handleMessage(client: WsClient, data: RawData): void {
    let message: WsMessage;
    
    try {
      message = JSON.parse(data.toString());
    } catch (error) {
      this.sendError(client, 'Invalid JSON message');
      return;
    }
    
    const { type, channel, payload } = message;
    
    switch (type) {
      case WS_MESSAGE_TYPES.AUTH:
        this.handleAuth(client, payload);
        break;
        
      case WS_MESSAGE_TYPES.PING:
        this.sendToClient(client, { type: WS_MESSAGE_TYPES.PONG, channel: 'system', payload: {} });
        break;
        
      case WS_MESSAGE_TYPES.SUBSCRIBE:
        this.subscribeToChannel(client, channel, payload);
        break;
        
      case WS_MESSAGE_TYPES.UNSUBSCRIBE:
        this.unsubscribeFromChannel(client, channel);
        break;
        
      // Terminal messages
      case WS_MESSAGE_TYPES.TERMINAL_CREATE:
        this.handleTerminalCreate(client, payload);
        break;
        
      case WS_MESSAGE_TYPES.TERMINAL_INPUT:
        this.handleTerminalInput(client, payload);
        break;
        
      case WS_MESSAGE_TYPES.TERMINAL_RESIZE:
        this.handleTerminalResize(client, payload);
        break;
        
      case WS_MESSAGE_TYPES.TERMINAL_KILL:
        this.handleTerminalKill(client, payload);
        break;
        
      // Collaboration messages
      case WS_MESSAGE_TYPES.COLLAB_JOIN:
        this.handleCollabJoin(client, payload);
        break;
        
      case WS_MESSAGE_TYPES.COLLAB_OPERATION:
        this.handleCollabOperation(client, channel, payload);
        break;
        
      case WS_MESSAGE_TYPES.COLLAB_CURSOR:
      case WS_MESSAGE_TYPES.COLLAB_SELECTION:
      case WS_MESSAGE_TYPES.COLLAB_AWARENESS:
        this.broadcastToChannel(channel, message, client.id);
        break;
        
      case WS_MESSAGE_TYPES.COLLAB_CHAT:
        this.handleCollabChat(client, channel, payload);
        break;
        
      default:
        // Emit for external handlers
        this.emit('message', { client, message });
    }
  }
  
  // ==========================================================================
  // Authentication
  // ==========================================================================
  
  private handleAuth(client: WsClient, payload: any): void {
    const { token, userId } = payload;
    
    // TODO: Validate token with auth service
    // For now, accept any userId
    if (userId) {
      client.userId = userId;
      this.sendToClient(client, {
        type: WS_MESSAGE_TYPES.AUTH_SUCCESS,
        channel: 'system',
        payload: { userId },
      });
    } else {
      this.sendToClient(client, {
        type: WS_MESSAGE_TYPES.AUTH_ERROR,
        channel: 'system',
        payload: { error: 'Invalid credentials' },
      });
    }
  }
  
  // ==========================================================================
  // Channel Management
  // ==========================================================================
  
  private subscribeToChannel(client: WsClient, channelName: string, options?: any): void {
    let channel = this.channels.get(channelName);
    
    if (!channel) {
      // Determine channel type from name
      let type: WsChannel['type'] = 'general';
      if (channelName.startsWith('terminal:')) type = 'terminal';
      else if (channelName.startsWith('collab:')) type = 'collaboration';
      else if (channelName.startsWith('files:')) type = 'filewatcher';
      
      channel = {
        name: channelName,
        clients: new Set(),
        type,
        metadata: options?.metadata || {},
      };
      this.channels.set(channelName, channel);
    }
    
    channel.clients.add(client.id);
    client.channels.add(channelName);
    
    this.sendToClient(client, {
      type: WS_MESSAGE_TYPES.SUBSCRIBED,
      channel: channelName,
      payload: {
        clients: channel.clients.size,
        metadata: channel.metadata,
      },
    });
    
    this.emit('subscribed', { clientId: client.id, channel: channelName });
  }
  
  private unsubscribeFromChannel(client: WsClient, channelName: string): void {
    const channel = this.channels.get(channelName);
    if (!channel) return;
    
    channel.clients.delete(client.id);
    client.channels.delete(channelName);
    
    // Remove empty channels
    if (channel.clients.size === 0) {
      this.channels.delete(channelName);
    }
    
    this.sendToClient(client, {
      type: WS_MESSAGE_TYPES.UNSUBSCRIBED,
      channel: channelName,
      payload: {},
    });
    
    this.emit('unsubscribed', { clientId: client.id, channel: channelName });
  }
  
  // ==========================================================================
  // Terminal Handlers
  // ==========================================================================
  
  private async handleTerminalCreate(client: WsClient, payload: any): Promise<void> {
    if (!client.userId) {
      this.sendError(client, 'Authentication required');
      return;
    }
    
    try {
      const config: TerminalSessionConfig = {
        id: payload.sessionId || this.generateClientId(),
        userId: client.userId,
        name: payload.name || 'Terminal',
        cwd: payload.cwd || process.cwd(),
        shell: payload.shell,
        args: payload.args,
        env: payload.env,
        cols: payload.cols,
        rows: payload.rows,
      };
      
      const session = await this.terminalManager.createSession(config);
      
      // Subscribe client to terminal channel
      const channelName = `terminal:${session.id}`;
      this.subscribeToChannel(client, channelName);
      
      this.sendToClient(client, {
        type: WS_MESSAGE_TYPES.TERMINAL_CREATED,
        channel: channelName,
        payload: {
          sessionId: session.id,
          name: session.name,
          shell: session.shell,
          cwd: session.cwd,
        },
      });
    } catch (error) {
      this.sendToClient(client, {
        type: WS_MESSAGE_TYPES.TERMINAL_ERROR,
        channel: 'terminal',
        payload: {
          error: error instanceof Error ? error.message : 'Failed to create terminal',
        },
      });
    }
  }
  
  private handleTerminalInput(client: WsClient, payload: any): void {
    const { sessionId, data } = payload;
    this.terminalManager.write(sessionId, data);
  }
  
  private handleTerminalResize(client: WsClient, payload: any): void {
    const { sessionId, cols, rows } = payload;
    this.terminalManager.resize(sessionId, cols, rows);
  }
  
  private async handleTerminalKill(client: WsClient, payload: any): Promise<void> {
    const { sessionId } = payload;
    await this.terminalManager.killSession(sessionId);
  }
  
  private setupTerminalEvents(): void {
    this.terminalManager.on('data', (output: any) => {
      const channelName = `terminal:${output.sessionId}`;
      this.broadcastToChannel(channelName, {
        type: WS_MESSAGE_TYPES.TERMINAL_DATA,
        channel: channelName,
        payload: output,
      });
    });
    
    this.terminalManager.on('exit', (info: any) => {
      const channelName = `terminal:${info.sessionId}`;
      this.broadcastToChannel(channelName, {
        type: WS_MESSAGE_TYPES.TERMINAL_EXIT,
        channel: channelName,
        payload: info,
      });
    });
  }
  
  // ==========================================================================
  // Collaboration Handlers
  // ==========================================================================
  
  private handleCollabJoin(client: WsClient, payload: any): void {
    const { documentId, userId, userName, color } = payload;
    const channelName = `collab:${documentId}`;
    
    this.subscribeToChannel(client, channelName, {
      metadata: { documentId },
    });
    
    // Broadcast join to others
    this.broadcastToChannel(channelName, {
      type: WS_MESSAGE_TYPES.COLLAB_AWARENESS,
      channel: channelName,
      payload: {
        type: 'join',
        userId: userId || client.userId,
        userName,
        color,
        clientId: client.id,
      },
    }, client.id);
  }
  
  private handleCollabOperation(client: WsClient, channel: string, payload: any): void {
    // Broadcast operation to all other clients in the channel
    this.broadcastToChannel(channel, {
      type: WS_MESSAGE_TYPES.COLLAB_OPERATION,
      channel,
      payload: {
        ...payload,
        clientId: client.id,
        timestamp: Date.now(),
      },
    }, client.id);
  }
  
  private handleCollabChat(client: WsClient, channel: string, payload: any): void {
    this.broadcastToChannel(channel, {
      type: WS_MESSAGE_TYPES.COLLAB_CHAT,
      channel,
      payload: {
        ...payload,
        userId: client.userId,
        timestamp: Date.now(),
      },
    });
  }
  
  // ==========================================================================
  // Messaging Utilities
  // ==========================================================================
  
  private sendToClient(client: WsClient, message: WsMessage): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({
        ...message,
        timestamp: message.timestamp || Date.now(),
      }));
    }
  }
  
  private sendError(client: WsClient, error: string): void {
    this.sendToClient(client, {
      type: WS_MESSAGE_TYPES.ERROR,
      channel: 'system',
      payload: { error },
    });
  }
  
  broadcastToChannel(channelName: string, message: WsMessage, excludeClientId?: string): void {
    const channel = this.channels.get(channelName);
    if (!channel) return;
    
    for (const clientId of channel.clients) {
      if (clientId === excludeClientId) continue;
      
      const client = this.clients.get(clientId);
      if (client) {
        this.sendToClient(client, message);
      }
    }
  }
  
  broadcastToAll(message: WsMessage, excludeClientId?: string): void {
    for (const client of this.clients.values()) {
      if (client.id === excludeClientId) continue;
      this.sendToClient(client, message);
    }
  }
  
  // ==========================================================================
  // File Watcher Integration
  // ==========================================================================
  
  notifyFileChange(workspaceId: string, event: {
    type: 'changed' | 'created' | 'deleted' | 'renamed';
    path: string;
    oldPath?: string;
  }): void {
    const channelName = `files:${workspaceId}`;
    const messageType = event.type === 'changed' ? WS_MESSAGE_TYPES.FILE_CHANGED
      : event.type === 'created' ? WS_MESSAGE_TYPES.FILE_CREATED
      : event.type === 'deleted' ? WS_MESSAGE_TYPES.FILE_DELETED
      : WS_MESSAGE_TYPES.FILE_RENAMED;
    
    this.broadcastToChannel(channelName, {
      type: messageType,
      channel: channelName,
      payload: event,
    });
  }
  
  // ==========================================================================
  // Ping/Pong & Cleanup
  // ==========================================================================
  
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      const now = Date.now();
      
      for (const [clientId, client] of this.clients) {
        if (!client.isAlive) {
          console.log(`Terminating inactive client: ${clientId}`);
          client.ws.terminate();
          this.handleDisconnect(client);
          continue;
        }
        
        // Check for timeout
        if (now - client.lastPing > this.clientTimeout) {
          console.log(`Client timeout: ${clientId}`);
          client.ws.terminate();
          this.handleDisconnect(client);
          continue;
        }
        
        client.isAlive = false;
        client.ws.ping();
      }
    }, this.pingIntervalMs);
  }
  
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
  
  // ==========================================================================
  // Utilities
  // ==========================================================================
  
  private generateClientId(): string {
    return `client_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
  
  getStats(): {
    clients: number;
    channels: number;
    uptime: number;
  } {
    return {
      clients: this.clients.size,
      channels: this.channels.size,
      uptime: process.uptime(),
    };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let _server: AethelWebSocketServer | null = null;

export function getWebSocketServer(port?: number): AethelWebSocketServer {
  if (!_server) {
    _server = new AethelWebSocketServer(port);
  }
  return _server;
}

export async function startWebSocketServer(port?: number): Promise<AethelWebSocketServer> {
  const server = getWebSocketServer(port);
  await server.start();
  return server;
}

export default getWebSocketServer;
