/**
 * Aethel Engine - WebSocket Server Runtime
 *
 * Hybrid WebSocket runtime used by both the modern channel-based transport
 * and the legacy Yjs/export endpoints that existing scripts still rely on.
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { RawData } from 'ws';
import { EventEmitter } from 'events';
import { createServer, IncomingMessage, Server as HttpServer } from 'http';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import type { ParsedUrlQuery } from 'querystring';
import { parse as parseUrl } from 'url';
import jwt from 'jsonwebtoken';
import * as Y from 'yjs';

import type { TerminalPtyManager, TerminalSessionConfig } from './terminal-pty-runtime';

const require = createRequire(import.meta.url);
const { getQueueRedis } = require('../redis-queue.ts') as typeof import('../redis-queue');
const { createComponentLogger } = require('../observability/logger.ts') as typeof import('../observability/logger');
const { getTerminalPtyManager } = require('./terminal-pty-runtime.ts') as typeof import('./terminal-pty-runtime');

const log = createComponentLogger('server/websocket-server');

// ============================================================================
// Legacy collaboration bootstrap
// ============================================================================

let setupWSConnection: ((conn: WebSocket, req: IncomingMessage, options?: any) => void) | null = null;
let yWebsocketInitPromise: Promise<void> | null = null;

async function initYWebsocket(): Promise<void> {
  if (yWebsocketInitPromise) {
    await yWebsocketInitPromise;
    return;
  }

  yWebsocketInitPromise = (async () => {
    try {
      const utilsPath = join(dirname(require.resolve('y-websocket/package.json')), 'bin', 'utils.cjs');
      const utils = require(utilsPath) as { setupWSConnection?: typeof setupWSConnection; default?: { setupWSConnection?: typeof setupWSConnection } };
      const setup = utils?.setupWSConnection || utils?.default?.setupWSConnection;
      if (setup) {
        setupWSConnection = setup as typeof setupWSConnection;
        log.info('[Y-WebSocket] Loaded y-websocket/bin/utils.cjs');
        return;
      }

      const yWebsocketModule = await import('y-websocket').catch(() => null);
      if (yWebsocketModule) {
        log.info('[Y-WebSocket] Loaded y-websocket module without direct setup helper');
        return;
      }

      log.warn('[Y-WebSocket] Unable to load y-websocket helpers, using fallback sync');
    } catch (error) {
      log.warn('[Y-WebSocket] Init error', error);
    }
  })();

  await yWebsocketInitPromise;
}

// ============================================================================
// Compatibility event bus
// ============================================================================

class ServiceEventBus extends EventEmitter {
  private static instance: ServiceEventBus;

  private constructor() {
    super();
    this.setMaxListeners(100);
  }

  static getInstance(): ServiceEventBus {
    if (!ServiceEventBus.instance) {
      ServiceEventBus.instance = new ServiceEventBus();
    }
    return ServiceEventBus.instance;
  }
}

export const eventBus = ServiceEventBus.getInstance();

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

type ConnectionType = 'collaboration' | 'terminal' | 'lsp' | 'ai' | 'dap' | 'export' | 'general';

interface ConnectionInfo {
  id: string;
  type: ConnectionType;
  path: string;
  mode: 'modern' | 'legacy';
  userId?: string;
  sessionId?: string;
  createdAt: number;
  clientId?: string;
}

interface DecodedAuthPayload {
  userId: string;
  email?: string;
  role?: string;
}

interface LegacyExportState {
  raw: string | null;
  pollMs: number;
}

// ============================================================================
// Message types
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

const HTTP_ONLY_PATHS = new Set(['/health', '/stats', '/metrics']);
const MODERN_RUNTIME_PATHS = new Set(['/', '/ws']);
const RESERVED_WS_PREFIXES = ['/export', '/terminal', '/lsp', '/ai', '/dap'];
const COLLAB_PREFIXES = ['/collaboration/', '/ws/'];

function resolvePort(explicit?: number): number {
  if (typeof explicit === 'number' && Number.isFinite(explicit)) {
    return explicit;
  }

  const rawPort =
    process.env.WS_PORT ||
    process.env.AETHEL_WS_PORT ||
    process.env.RUNTIME_PORT ||
    '3001';
  const parsed = Number.parseInt(rawPort, 10);
  return Number.isFinite(parsed) ? parsed : 3001;
}

function resolveHost(): string {
  return process.env.WS_HOST || process.env.AETHEL_WS_HOST || '0.0.0.0';
}

function normalizePath(pathname?: string | null): string {
  if (!pathname || pathname.trim() === '') {
    return '/';
  }

  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

function asParsedQuery(query: ReturnType<typeof parseUrl>['query']): ParsedUrlQuery {
  return query && typeof query === 'object' ? query : {};
}

function normalizeMessageType(type: unknown): string {
  if (typeof type !== 'string') {
    return '';
  }

  switch (type.trim().toUpperCase()) {
    case 'AUTH':
      return WS_MESSAGE_TYPES.AUTH;
    case 'PING':
      return WS_MESSAGE_TYPES.PING;
    case 'PONG':
      return WS_MESSAGE_TYPES.PONG;
    case 'SUBSCRIBE':
      return WS_MESSAGE_TYPES.SUBSCRIBE;
    case 'UNSUBSCRIBE':
      return WS_MESSAGE_TYPES.UNSUBSCRIBE;
    case 'REQUEST':
      return 'request';
    default:
      return type.trim();
  }
}

function toUint8Array(data: RawData): Uint8Array | null {
  if (typeof data === 'string') {
    return Uint8Array.from(Buffer.from(data));
  }

  if (Array.isArray(data)) {
    return Uint8Array.from(Buffer.concat(data));
  }

  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }

  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }

  return null;
}

function isBufferLike(data: unknown): data is Buffer | Uint8Array | ArrayBuffer {
  return Buffer.isBuffer(data) || data instanceof Uint8Array || data instanceof ArrayBuffer;
}

// ============================================================================
// WebSocket server manager
// ============================================================================

export class AethelWebSocketServer extends EventEmitter {
  private wss: WebSocketServer | null = null;
  private httpServer: HttpServer | null = null;
  private clients: Map<string, WsClient> = new Map();
  private channels: Map<string, WsChannel> = new Map();
  private connections: Map<WebSocket, ConnectionInfo> = new Map();
  private legacyRooms: Map<string, Set<WebSocket>> = new Map();
  private collaborationDocs: Map<string, Y.Doc> = new Map();
  private terminalManager: TerminalPtyManager;
  private pingInterval: NodeJS.Timeout | null = null;

  private readonly port: number;
  private readonly host: string;
  private readonly pingIntervalMs = 30000;
  private readonly clientTimeout = 60000;

  constructor(port: number = resolvePort()) {
    super();
    this.port = resolvePort(port);
    this.host = resolveHost();
    this.terminalManager = getTerminalPtyManager();
    this.setupTerminalEvents();
  }

  // ==========================================================================
  // Server lifecycle
  // ==========================================================================

  async start(): Promise<void> {
    if (this.wss) {
      throw new Error('WebSocket server already running');
    }

    await initYWebsocket();

    return new Promise((resolve, reject) => {
      this.httpServer = createServer((req, res) => {
        const url = parseUrl(req.url || '/', true);
        const pathname = normalizePath(url.pathname);

        if (pathname === '/' || pathname === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(this.getHealthPayload()));
          return;
        }

        if (pathname === '/stats') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(this.getStatsPayload()));
          return;
        }

        if (pathname === '/metrics') {
          res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4' });
          res.end(this.getMetricsPayload());
          return;
        }

        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      });

      this.wss = new WebSocketServer({ server: this.httpServer });
      this.wss.on('connection', (ws, request) => this.handleConnection(ws, request));
      this.wss.on('error', (error) => this.emit('error', error));

      this.httpServer.on('error', reject);
      this.httpServer.listen(this.port, this.host, () => {
        log.info(`Aethel WebSocket server listening on ws://${this.host}:${this.port}`);
        this.startPingInterval();
        this.emit('started', { port: this.port, host: this.host });
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    this.stopPingInterval();

    for (const ws of this.connections.keys()) {
      try {
        ws.close(1001, 'Server shutting down');
      } catch {
        // Ignore close races during shutdown.
      }
    }

    this.clients.clear();
    this.channels.clear();
    this.connections.clear();
    this.legacyRooms.clear();
    this.collaborationDocs.clear();

    if (this.wss) {
      await new Promise<void>((resolve) => {
        this.wss!.close(() => resolve());
      });
      this.wss = null;
    }

    if (this.httpServer) {
      await new Promise<void>((resolve) => {
        this.httpServer!.close(() => resolve());
      });
      this.httpServer = null;
    }

    this.emit('stopped');
  }

  // ==========================================================================
  // Connection routing
  // ==========================================================================

  private handleConnection(ws: WebSocket, request: IncomingMessage): void {
    const parsedUrl = parseUrl(request.url || '/', true);
    const pathname = normalizePath(parsedUrl.pathname);
    const query = asParsedQuery(parsedUrl.query);

    if (HTTP_ONLY_PATHS.has(pathname)) {
      this.sendRaw(ws, { type: 'error', error: 'Use HTTP for this path.' });
      ws.close(1008, 'Unsupported WebSocket path');
      return;
    }

    const info: ConnectionInfo = {
      id: this.generateConnectionId(),
      type: this.resolveConnectionType(pathname),
      path: pathname,
      mode: this.isModernRuntimePath(pathname) ? 'modern' : 'legacy',
      userId: typeof query.userId === 'string' ? query.userId : undefined,
      sessionId: typeof query.sessionId === 'string' ? query.sessionId : undefined,
      createdAt: Date.now(),
    };

    this.connections.set(ws, info);

    ws.on('close', () => this.handleSocketClose(ws));
    ws.on('error', (error) => this.handleSocketError(ws, error));

    log.info(
      `[WebSocket] New ${info.mode} ${info.type} connection: ${info.id}`,
      {
        action: 'connect',
        userId: info.userId,
        sessionId: info.sessionId,
      }
    );

    if (this.isModernRuntimePath(pathname)) {
      this.handleModernConnection(ws, request, parsedUrl, info);
      return;
    }

    if (this.isLegacyExportPath(pathname)) {
      void this.handleExportConnection(ws, pathname);
      return;
    }

    if (this.isLegacyTerminalPath(pathname)) {
      this.handleLegacyTerminalConnection(ws, info);
      return;
    }

    if (this.isLegacyLspPath(pathname)) {
      this.handleLegacyLspConnection(ws, info);
      return;
    }

    if (this.isLegacyAiPath(pathname)) {
      this.handleLegacyAiConnection(ws);
      return;
    }

    if (this.isLegacyDapPath(pathname)) {
      this.handleLegacyDapConnection(ws);
      return;
    }

    if (this.isLegacyCollaborationPath(pathname)) {
      this.handleLegacyCollaborationConnection(ws, request, pathname);
      return;
    }

    this.handleLegacyGeneralConnection(ws, info);
  }

  private handleSocketClose(ws: WebSocket): void {
    const info = this.connections.get(ws);
    if (!info) {
      return;
    }

    if (info.clientId) {
      const client = this.clients.get(info.clientId);
      if (client) {
        this.handleDisconnect(client);
      }
    }

    for (const [roomName, clients] of this.legacyRooms.entries()) {
      clients.delete(ws);
      if (clients.size === 0) {
        this.legacyRooms.delete(roomName);
      }
    }

    this.connections.delete(ws);
    this.emit('connectionClosed', { id: info.id, type: info.type, mode: info.mode });
  }

  private handleSocketError(ws: WebSocket, error: Error): void {
    const info = this.connections.get(ws);
    log.error(
      `[WebSocket] Connection error${info ? ` (${info.id})` : ''}`,
      error,
      { action: 'connection-error' }
    );
    this.emit('clientError', { connectionId: info?.id, clientId: info?.clientId, error });
  }

  private isModernRuntimePath(pathname: string): boolean {
    return MODERN_RUNTIME_PATHS.has(pathname);
  }

  private isLegacyExportPath(pathname: string): boolean {
    return pathname === '/export' || pathname.startsWith('/export/');
  }

  private isLegacyTerminalPath(pathname: string): boolean {
    return pathname === '/terminal' || pathname.startsWith('/terminal/');
  }

  private isLegacyLspPath(pathname: string): boolean {
    return pathname === '/lsp' || pathname.startsWith('/lsp/');
  }

  private isLegacyAiPath(pathname: string): boolean {
    return pathname === '/ai' || pathname.startsWith('/ai/');
  }

  private isLegacyDapPath(pathname: string): boolean {
    return pathname === '/dap' || pathname.startsWith('/dap/');
  }

  private isLegacyCollaborationPath(pathname: string): boolean {
    if (pathname === '/collaboration' || pathname === '/ws') {
      return true;
    }

    if (COLLAB_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      return true;
    }

    if (pathname === '/') {
      return false;
    }

    if (RESERVED_WS_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
      return false;
    }

    return !HTTP_ONLY_PATHS.has(pathname);
  }

  private resolveConnectionType(pathname: string): ConnectionType {
    if (this.isLegacyExportPath(pathname)) return 'export';
    if (this.isLegacyTerminalPath(pathname)) return 'terminal';
    if (this.isLegacyLspPath(pathname)) return 'lsp';
    if (this.isLegacyAiPath(pathname)) return 'ai';
    if (this.isLegacyDapPath(pathname)) return 'dap';
    if (this.isLegacyCollaborationPath(pathname) && !this.isModernRuntimePath(pathname)) return 'collaboration';
    return 'general';
  }

  private resolveCollaborationRoomName(pathname: string): string {
    if (pathname === '/collaboration' || pathname === '/ws') {
      return 'default';
    }

    if (pathname.startsWith('/collaboration/')) {
      return decodeURIComponent(pathname.slice('/collaboration/'.length)) || 'default';
    }

    if (pathname.startsWith('/ws/')) {
      return decodeURIComponent(pathname.slice('/ws/'.length)) || 'default';
    }

    return decodeURIComponent(pathname.replace(/^\/+/, '')) || 'default';
  }

  // ==========================================================================
  // Modern runtime protocol
  // ==========================================================================

  private handleModernConnection(
    ws: WebSocket,
    request: IncomingMessage,
    parsedUrl: ReturnType<typeof parseUrl>,
    info: ConnectionInfo
  ): void {
    const clientId = this.generateClientId();
    const query = asParsedQuery(parsedUrl.query);
    const client: WsClient = {
      id: clientId,
      userId: info.userId || '',
      ws,
      channels: new Set(),
      connectedAt: Date.now(),
      lastPing: Date.now(),
      isAlive: true,
      metadata: {
        ip: request.socket.remoteAddress,
        userAgent: request.headers['user-agent'],
        query,
        path: info.path,
      },
    };

    info.clientId = clientId;
    this.clients.set(clientId, client);

    ws.on('message', (data) => this.handleModernMessage(client, data));
    ws.on('pong', () => {
      client.lastPing = Date.now();
      client.isAlive = true;
    });

    this.sendToClient(client, {
      type: 'welcome',
      channel: 'system',
      payload: {
        clientId,
        serverTime: Date.now(),
        version: '2.1.0',
      },
    });

    const queryToken = typeof query.token === 'string' ? query.token : undefined;
    const queryUserId = typeof query.userId === 'string' ? query.userId : undefined;
    if (queryToken || queryUserId) {
      this.handleAuth(client, { token: queryToken, userId: queryUserId }, false);
    }

    this.emit('connection', { clientId, connectionId: info.id });
  }

  private handleModernMessage(client: WsClient, data: RawData): void {
    let rawMessage: Record<string, any>;

    try {
      rawMessage = JSON.parse(data.toString());
    } catch {
      this.sendError(client, 'Invalid JSON message');
      return;
    }

    const type = normalizeMessageType(rawMessage.type);
    const channel =
      typeof rawMessage.channel === 'string'
        ? rawMessage.channel
        : typeof rawMessage.room === 'string'
          ? rawMessage.room
          : 'system';
    const payload = rawMessage.payload ?? rawMessage.data ?? {};

    switch (type) {
      case WS_MESSAGE_TYPES.AUTH:
        this.handleAuth(client, payload, true);
        break;

      case WS_MESSAGE_TYPES.PING:
        client.lastPing = Date.now();
        client.isAlive = true;
        this.sendToClient(client, {
          type: WS_MESSAGE_TYPES.PONG,
          channel: 'system',
          payload: {},
        });
        break;

      case WS_MESSAGE_TYPES.SUBSCRIBE:
        this.subscribeToChannel(client, channel, payload);
        break;

      case WS_MESSAGE_TYPES.UNSUBSCRIBE:
        this.unsubscribeFromChannel(client, channel);
        break;

      case WS_MESSAGE_TYPES.TERMINAL_CREATE:
        void this.handleTerminalCreate(client, payload);
        break;

      case WS_MESSAGE_TYPES.TERMINAL_INPUT:
        this.handleTerminalInput(client, payload);
        break;

      case WS_MESSAGE_TYPES.TERMINAL_RESIZE:
        this.handleTerminalResize(client, payload);
        break;

      case WS_MESSAGE_TYPES.TERMINAL_KILL:
        void this.handleTerminalKill(client, payload);
        break;

      case WS_MESSAGE_TYPES.COLLAB_JOIN:
        this.handleCollabJoin(client, payload);
        break;

      case WS_MESSAGE_TYPES.COLLAB_OPERATION:
        this.handleCollabOperation(client, channel, payload);
        break;

      case WS_MESSAGE_TYPES.COLLAB_CURSOR:
      case WS_MESSAGE_TYPES.COLLAB_SELECTION:
      case WS_MESSAGE_TYPES.COLLAB_AWARENESS:
        this.broadcastToChannel(channel, {
          type,
          channel,
          payload,
        }, client.id);
        break;

      case WS_MESSAGE_TYPES.COLLAB_CHAT:
        this.handleCollabChat(client, channel, payload);
        break;

      case 'join-room':
        if (typeof rawMessage.room === 'string') {
          this.subscribeToChannel(client, rawMessage.room, payload);
        }
        break;

      case 'leave-room':
        if (typeof rawMessage.room === 'string') {
          this.unsubscribeFromChannel(client, rawMessage.room);
        }
        break;

      case WS_MESSAGE_TYPES.BROADCAST:
      case 'broadcast':
        if (channel && channel !== 'system') {
          this.broadcastToChannel(channel, {
            type: WS_MESSAGE_TYPES.BROADCAST,
            channel,
            payload,
          }, client.id);
        } else {
          this.broadcastToAll({
            type: WS_MESSAGE_TYPES.BROADCAST,
            channel: 'system',
            payload,
          }, client.id);
        }
        break;

      default:
        this.emit('message', { client, message: { type, channel, payload } as WsMessage, rawMessage });
    }
  }

  private handleDisconnect(client: WsClient): void {
    for (const channelName of Array.from(client.channels)) {
      this.unsubscribeFromChannel(client, channelName, false);
    }

    this.clients.delete(client.id);
    this.emit('disconnect', { clientId: client.id, userId: client.userId });
  }

  // ==========================================================================
  // Authentication
  // ==========================================================================

  private isGuestAuthAllowed(): boolean {
    const override = process.env.AETHEL_ALLOW_INSECURE_WS_AUTH;
    if (override === 'true') {
      return true;
    }
    if (override === 'false') {
      return false;
    }
    return process.env.NODE_ENV !== 'production';
  }

  private getJwtSecret(): string | null {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret === 'your-secret-key-change-in-production') {
      return null;
    }
    return secret;
  }

  private verifyJwtToken(token: string): DecodedAuthPayload | null {
    const secret = this.getJwtSecret();
    if (!secret) {
      return null;
    }

    try {
      const decoded = jwt.verify(token, secret) as jwt.JwtPayload & DecodedAuthPayload;
      if (!decoded.userId) {
        return null;
      }

      return {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      };
    } catch (error) {
      log.warn('[WebSocket] JWT verification failed', error);
      return null;
    }
  }

  private handleAuth(client: WsClient, payload: any, closeOnFailure: boolean): void {
    const token = typeof payload?.token === 'string' ? payload.token.trim() : '';
    const requestedUserId = typeof payload?.userId === 'string' ? payload.userId.trim() : '';

    if (token) {
      const decoded = this.verifyJwtToken(token);
      if (!decoded) {
        this.sendToClient(client, {
          type: WS_MESSAGE_TYPES.AUTH_ERROR,
          channel: 'system',
          payload: { error: 'Invalid or expired token' },
        });
        if (closeOnFailure) {
          setTimeout(() => client.ws.close(4001, 'Invalid token'), 100);
        }
        return;
      }

      this.setClientIdentity(client, decoded.userId, {
        email: decoded.email,
        role: decoded.role,
        authMode: 'jwt',
      });
      this.sendToClient(client, {
        type: WS_MESSAGE_TYPES.AUTH_SUCCESS,
        channel: 'system',
        payload: {
          userId: decoded.userId,
          role: decoded.role,
        },
      });
      this.emit('authenticated', { clientId: client.id, userId: decoded.userId });
      return;
    }

    const fallbackUserId = this.ensureUserIdentity(client, requestedUserId || undefined);
    if (!fallbackUserId) {
      this.sendToClient(client, {
        type: WS_MESSAGE_TYPES.AUTH_ERROR,
        channel: 'system',
        payload: { error: 'Authentication required' },
      });
      if (closeOnFailure) {
        setTimeout(() => client.ws.close(4001, 'Authentication required'), 100);
      }
      return;
    }

    this.sendToClient(client, {
      type: WS_MESSAGE_TYPES.AUTH_SUCCESS,
      channel: 'system',
      payload: {
        userId: fallbackUserId,
        role: 'guest',
        insecure: true,
      },
    });
    this.emit('authenticated', { clientId: client.id, userId: fallbackUserId });
  }

  private ensureUserIdentity(client: WsClient, requestedUserId?: string): string | null {
    if (client.userId) {
      return client.userId;
    }

    if (!this.isGuestAuthAllowed()) {
      return null;
    }

    const userId = requestedUserId || `guest_${client.id}`;
    this.setClientIdentity(client, userId, { authMode: 'guest' });
    return userId;
  }

  private setClientIdentity(client: WsClient, userId: string, metadata: Record<string, any>): void {
    client.userId = userId;
    client.metadata = {
      ...client.metadata,
      ...metadata,
      authenticatedAt: Date.now(),
    };
  }

  // ==========================================================================
  // Channel management
  // ==========================================================================

  private subscribeToChannel(client: WsClient, channelName: string, options?: any): void {
    if (!channelName) {
      this.sendError(client, 'Channel name is required');
      return;
    }

    let channel = this.channels.get(channelName);
    if (!channel) {
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

  private unsubscribeFromChannel(client: WsClient, channelName: string, notifyClient: boolean = true): void {
    const channel = this.channels.get(channelName);
    if (!channel) {
      return;
    }

    channel.clients.delete(client.id);
    client.channels.delete(channelName);

    if (channel.clients.size === 0) {
      this.channels.delete(channelName);
    }

    if (notifyClient) {
      this.sendToClient(client, {
        type: WS_MESSAGE_TYPES.UNSUBSCRIBED,
        channel: channelName,
        payload: {},
      });
    }

    this.emit('unsubscribed', { clientId: client.id, channel: channelName });
  }

  // ==========================================================================
  // Terminal handlers
  // ==========================================================================

  private async handleTerminalCreate(client: WsClient, payload: any): Promise<void> {
    const userId = this.ensureUserIdentity(client, typeof payload?.userId === 'string' ? payload.userId : undefined);
    if (!userId) {
      this.sendToClient(client, {
        type: WS_MESSAGE_TYPES.TERMINAL_ERROR,
        channel: 'terminal',
        payload: { error: 'Authentication required for terminal creation' },
      });
      return;
    }

    try {
      const config: TerminalSessionConfig = {
        id: payload?.sessionId || this.generateClientId(),
        userId,
        name: payload?.name || 'Terminal',
        cwd: payload?.cwd || process.cwd(),
        shell: payload?.shell,
        args: payload?.args,
        env: payload?.env,
        cols: payload?.cols,
        rows: payload?.rows,
      };

      const session = await this.terminalManager.createSession(config);
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
    const sessionId = payload?.sessionId;
    const data = payload?.data;
    if (typeof sessionId !== 'string' || typeof data !== 'string') {
      this.sendError(client, 'Terminal input requires sessionId and data');
      return;
    }

    if (!this.terminalManager.write(sessionId, data)) {
      this.sendToClient(client, {
        type: WS_MESSAGE_TYPES.TERMINAL_ERROR,
        channel: `terminal:${sessionId}`,
        payload: { error: 'Terminal session is not available' },
      });
    }
  }

  private handleTerminalResize(client: WsClient, payload: any): void {
    const sessionId = payload?.sessionId;
    const cols = payload?.cols;
    const rows = payload?.rows;
    if (typeof sessionId !== 'string' || typeof cols !== 'number' || typeof rows !== 'number') {
      this.sendError(client, 'Terminal resize requires sessionId, cols and rows');
      return;
    }

    if (!this.terminalManager.resize(sessionId, cols, rows)) {
      this.sendToClient(client, {
        type: WS_MESSAGE_TYPES.TERMINAL_ERROR,
        channel: `terminal:${sessionId}`,
        payload: { error: 'Failed to resize terminal session' },
      });
    }
  }

  private async handleTerminalKill(client: WsClient, payload: any): Promise<void> {
    const sessionId = payload?.sessionId;
    if (typeof sessionId !== 'string') {
      this.sendError(client, 'Terminal kill requires sessionId');
      return;
    }

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
  // Collaboration handlers (modern protocol)
  // ==========================================================================

  private handleCollabJoin(client: WsClient, payload: any): void {
    const documentId = typeof payload?.documentId === 'string' ? payload.documentId : 'default';
    const userId = this.ensureUserIdentity(client, typeof payload?.userId === 'string' ? payload.userId : undefined);
    const channelName = `collab:${documentId}`;

    this.subscribeToChannel(client, channelName, {
      metadata: { documentId },
    });

    this.broadcastToChannel(
      channelName,
      {
        type: WS_MESSAGE_TYPES.COLLAB_AWARENESS,
        channel: channelName,
        payload: {
          type: 'join',
          userId: userId || client.id,
          userName: payload?.userName,
          color: payload?.color,
          clientId: client.id,
        },
      },
      client.id
    );
  }

  private handleCollabOperation(client: WsClient, channel: string, payload: any): void {
    this.broadcastToChannel(
      channel,
      {
        type: WS_MESSAGE_TYPES.COLLAB_OPERATION,
        channel,
        payload: {
          ...payload,
          clientId: client.id,
          timestamp: Date.now(),
        },
      },
      client.id
    );
  }

  private handleCollabChat(client: WsClient, channel: string, payload: any): void {
    const userId = this.ensureUserIdentity(client, typeof payload?.userId === 'string' ? payload.userId : undefined);
    this.broadcastToChannel(channel, {
      type: WS_MESSAGE_TYPES.COLLAB_CHAT,
      channel,
      payload: {
        ...payload,
        userId: userId || client.id,
        timestamp: Date.now(),
      },
    });
  }

  // ==========================================================================
  // Legacy handlers
  // ==========================================================================

  private async handleExportConnection(ws: WebSocket, pathname: string): Promise<void> {
    const exportId = pathname.split('/').filter(Boolean)[1];
    if (!exportId) {
      this.sendRaw(ws, { type: 'error', error: 'Missing exportId in path (/export/:exportId)' });
      ws.close(1008, 'Missing exportId');
      return;
    }

    const pollMs = Number.parseInt(process.env.EXPORT_WS_POLL_MS || '1000', 10);
    let stopped = false;
    let timer: NodeJS.Timeout | null = null;
    const state: LegacyExportState = {
      raw: null,
      pollMs: Number.isFinite(pollMs) ? Math.max(250, pollMs) : 1000,
    };

    const stop = () => {
      stopped = true;
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    ws.on('close', stop);
    ws.on('error', stop);

    this.sendRaw(ws, { type: 'ready', exportId, pollMs: state.pollMs });

    try {
      const redis = await getQueueRedis();
      const key = `export:${exportId}`;

      const sendState = (raw: string | null) => {
        if (stopped || ws.readyState !== WebSocket.OPEN) {
          return;
        }

        if (raw === state.raw) {
          return;
        }

        state.raw = raw;
        if (raw === null) {
          this.sendRaw(ws, { type: 'export-status', exportId, state: null });
          return;
        }

        try {
          const parsed = JSON.parse(raw);
          this.sendRaw(ws, { type: 'export-status', exportId, state: parsed });
          if (['completed', 'failed', 'canceled'].includes(parsed?.status)) {
            stop();
          }
        } catch {
          this.sendRaw(ws, { type: 'export-status', exportId, state: raw });
        }
      };

      sendState(await redis.get(key));
      timer = setInterval(async () => {
        if (stopped) {
          return;
        }
        try {
          sendState(await redis.get(key));
        } catch (error: any) {
          if (!stopped && ws.readyState === WebSocket.OPEN) {
            this.sendRaw(ws, {
              type: 'error',
              error: error?.message || 'Failed to read export state',
            });
          }
        }
      }, state.pollMs);
    } catch (error: any) {
      if (!stopped && ws.readyState === WebSocket.OPEN) {
        this.sendRaw(ws, {
          type: 'error',
          error: error?.message || 'Failed to init Redis for export status',
        });
        ws.close(1011, 'Export status unavailable');
      }
    }
  }

  private handleLegacyCollaborationConnection(ws: WebSocket, request: IncomingMessage, pathname: string): void {
    const roomName = this.resolveCollaborationRoomName(pathname);
    log.info(`[Collaboration] Client joining room: ${roomName}`);

    if (setupWSConnection) {
      setupWSConnection(ws, request, {
        docName: roomName,
        gc: true,
      });
    } else {
      log.warn('[Collaboration] Using fallback Yjs handler');
      if (!this.collaborationDocs.has(roomName)) {
        this.collaborationDocs.set(roomName, new Y.Doc());
      }

      const doc = this.collaborationDocs.get(roomName)!;
      ws.on('message', (data) => {
        const update = toUint8Array(data);
        if (!update) {
          return;
        }
        this.broadcastToLegacyRoom(roomName, update, ws);
      });

      const state = Y.encodeStateAsUpdate(doc);
      ws.send(state);
    }

    const room = this.legacyRooms.get(roomName) || new Set<WebSocket>();
    room.add(ws);
    this.legacyRooms.set(roomName, room);

    this.broadcastToLegacyRoom(
      roomName,
      {
        type: 'user-joined',
        roomName,
        userCount: room.size,
      },
      ws
    );
  }

  private handleLegacyTerminalConnection(ws: WebSocket, info: ConnectionInfo): void {
    const terminalId = info.sessionId || `term_${Date.now().toString(36)}`;

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        switch (message.type) {
          case 'input':
            eventBus.emit('terminal:input', { terminalId, data: message.data });
            break;
          case 'resize':
            eventBus.emit('terminal:resize', {
              terminalId,
              cols: message.cols,
              rows: message.rows,
            });
            break;
          case 'ping':
            this.sendRaw(ws, { type: 'pong', timestamp: Date.now() });
            break;
        }
      } catch (error) {
        log.error('[Terminal] Message parse error', error);
      }
    });

    this.sendRaw(ws, { type: 'ready', terminalId });
  }

  private handleLegacyLspConnection(ws: WebSocket, info: ConnectionInfo): void {
    const language = info.sessionId || 'typescript';

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        eventBus.emit('lsp:message', {
          language,
          message,
          respond: (response: any) => {
            this.sendRaw(ws, response);
          },
        });
      } catch (error) {
        log.error('[LSP] Message parse error', error);
      }
    });

    this.sendRaw(ws, { type: 'ready', language });
  }

  private handleLegacyAiConnection(ws: WebSocket): void {
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        eventBus.emit('ai:stream', {
          ...message,
          stream: (chunk: string) => {
            this.sendRaw(ws, { type: 'chunk', content: chunk });
          },
          done: () => {
            this.sendRaw(ws, { type: 'done' });
          },
          error: (err: string) => {
            this.sendRaw(ws, { type: 'error', error: err });
          },
        });
      } catch (error) {
        log.error('[AI] Message parse error', error);
      }
    });

    this.sendRaw(ws, { type: 'ready' });
  }

  private handleLegacyDapConnection(ws: WebSocket): void {
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        eventBus.emit('dap:message', {
          message,
          respond: (response: any) => {
            this.sendRaw(ws, response);
          },
        });
      } catch (error) {
        log.error('[DAP] Message parse error', error);
      }
    });

    this.sendRaw(ws, { type: 'ready' });
  }

  private handleLegacyGeneralConnection(ws: WebSocket, info: ConnectionInfo): void {
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'join-room') {
          const roomName = String(message.room || 'default');
          const room = this.legacyRooms.get(roomName) || new Set<WebSocket>();
          room.add(ws);
          this.legacyRooms.set(roomName, room);
          this.sendRaw(ws, { type: 'room-joined', room: roomName });
          return;
        }

        if (message.type === 'leave-room') {
          const room = this.legacyRooms.get(String(message.room || ''));
          room?.delete(ws);
          return;
        }

        if (message.type === 'broadcast') {
          this.broadcastToLegacyRoom(String(message.room || ''), message.data, ws);
          return;
        }

        if (message.type === 'ping') {
          this.sendRaw(ws, { type: 'pong', timestamp: Date.now() });
        }
      } catch (error) {
        log.error('[General] Message parse error', error);
      }
    });

    this.sendRaw(ws, { type: 'connected', connectionId: info.id });
  }

  // ==========================================================================
  // Messaging utilities
  // ==========================================================================

  private sendToClient(client: WsClient, message: WsMessage): void {
    if (client.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    client.ws.send(
      JSON.stringify({
        ...message,
        timestamp: message.timestamp || Date.now(),
      })
    );
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
    if (!channel) {
      return;
    }

    for (const clientId of channel.clients) {
      if (clientId === excludeClientId) {
        continue;
      }

      const client = this.clients.get(clientId);
      if (client) {
        this.sendToClient(client, message);
      }
    }
  }

  broadcastToAll(message: WsMessage, excludeClientId?: string): void {
    for (const client of this.clients.values()) {
      if (client.id === excludeClientId) {
        continue;
      }
      this.sendToClient(client, message);
    }
  }

  broadcastToLegacyRoom(roomName: string, message: unknown, exclude?: WebSocket): void {
    const room = this.legacyRooms.get(roomName);
    if (!room) {
      return;
    }

    for (const client of room) {
      if (client === exclude || client.readyState !== WebSocket.OPEN) {
        continue;
      }
      this.sendRaw(client, message);
    }
  }

  broadcastRawToAll(message: unknown, exclude?: WebSocket): void {
    for (const client of this.connections.keys()) {
      if (client === exclude || client.readyState !== WebSocket.OPEN) {
        continue;
      }
      this.sendRaw(client, message);
    }
  }

  private sendRaw(ws: WebSocket, message: unknown): void {
    if (ws.readyState !== WebSocket.OPEN) {
      return;
    }

    if (typeof message === 'string') {
      ws.send(message);
      return;
    }

    if (Array.isArray(message)) {
      ws.send(Buffer.from(message as any));
      return;
    }

    if (isBufferLike(message)) {
      ws.send(message as any);
      return;
    }

    if (ArrayBuffer.isView(message)) {
      ws.send(Buffer.from(message.buffer, message.byteOffset, message.byteLength));
      return;
    }

    ws.send(JSON.stringify(message));
  }

  notifyFileChange(
    workspaceId: string,
    event: {
      type: 'changed' | 'created' | 'deleted' | 'renamed';
      path: string;
      oldPath?: string;
    }
  ): void {
    const channelName = `files:${workspaceId}`;
    const messageType =
      event.type === 'changed'
        ? WS_MESSAGE_TYPES.FILE_CHANGED
        : event.type === 'created'
          ? WS_MESSAGE_TYPES.FILE_CREATED
          : event.type === 'deleted'
            ? WS_MESSAGE_TYPES.FILE_DELETED
            : WS_MESSAGE_TYPES.FILE_RENAMED;

    this.broadcastToChannel(channelName, {
      type: messageType,
      channel: channelName,
      payload: event,
    });
  }

  // ==========================================================================
  // Ping/pong & cleanup
  // ==========================================================================

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      const now = Date.now();

      for (const [clientId, client] of this.clients) {
        if (!client.isAlive || now - client.lastPing > this.clientTimeout) {
          log.info(`Terminating inactive client: ${clientId}`);
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
  // Metrics & stats
  // ==========================================================================

  private getConnectionCounts(): Record<ConnectionType, number> {
    const counts: Record<ConnectionType, number> = {
      collaboration: 0,
      terminal: 0,
      lsp: 0,
      ai: 0,
      dap: 0,
      export: 0,
      general: 0,
    };

    for (const info of this.connections.values()) {
      counts[info.type] += 1;
    }

    return counts;
  }

  private getHealthPayload() {
    return {
      status: 'ok',
      service: 'aethel-websocket-server',
      connections: this.connections.size,
      modernClients: this.clients.size,
      channels: this.channels.size,
      rooms: this.legacyRooms.size,
      uptime: process.uptime(),
    };
  }

  private getStatsPayload() {
    return {
      totalConnections: this.connections.size,
      modernClients: this.clients.size,
      channels: Array.from(this.channels.entries()).map(([name, channel]) => ({
        name,
        clients: channel.clients.size,
        type: channel.type,
      })),
      legacyRooms: Array.from(this.legacyRooms.entries()).map(([name, clients]) => ({
        name,
        clients: clients.size,
      })),
      connectionsByType: this.getConnectionCounts(),
      memory: process.memoryUsage(),
    };
  }

  private getMetricsPayload(): string {
    const lines = [
      '# HELP aethel_ws_connections Current active WebSocket connections',
      '# TYPE aethel_ws_connections gauge',
      `aethel_ws_connections ${this.connections.size}`,
      '# HELP aethel_ws_clients Current active modern WebSocket clients',
      '# TYPE aethel_ws_clients gauge',
      `aethel_ws_clients ${this.clients.size}`,
      '# HELP aethel_ws_channels Current active runtime channels',
      '# TYPE aethel_ws_channels gauge',
      `aethel_ws_channels ${this.channels.size}`,
      '# HELP aethel_ws_rooms Current active collaboration rooms',
      '# TYPE aethel_ws_rooms gauge',
      `aethel_ws_rooms ${this.legacyRooms.size}`,
    ];

    for (const [type, count] of Object.entries(this.getConnectionCounts())) {
      lines.push(`aethel_ws_connections_by_type{type="${type}"} ${count}`);
    }

    return lines.join('\n');
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  private generateConnectionId(): string {
    return `conn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }

  private generateClientId(): string {
    return `client_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }

  getStats(): {
    clients: number;
    channels: number;
    legacyRooms: number;
    connections: number;
    uptime: number;
  } {
    return {
      clients: this.clients.size,
      channels: this.channels.size,
      legacyRooms: this.legacyRooms.size,
      connections: this.connections.size,
      uptime: process.uptime(),
    };
  }
}

// ============================================================================
// Singleton export
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

export function broadcastToRoom(roomName: string, message: unknown, exclude?: WebSocket): void {
  _server?.broadcastToLegacyRoom(roomName, message, exclude);
}

export function broadcastAll(message: unknown, exclude?: WebSocket): void {
  _server?.broadcastRawToAll(message, exclude);
}

export default getWebSocketServer;
