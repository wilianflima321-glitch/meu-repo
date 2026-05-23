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
import * as Y from 'yjs';

import type { TerminalPtyManager, TerminalSessionConfig } from './terminal-pty-runtime';
import { eventBus } from './websocket/event-bus';
import type { ParsedWebSocketUrl } from './websocket-runtime-codecs';
import type {
  ConnectionInfo,
  LegacyExportState,
  WsChannel,
  WsClient,
  WsMessage,
  WsRecord,
} from './websocket-runtime-contracts';

const require = createRequire(import.meta.url);
const { ensureUserIdentity, handleClientAuth } = require('./websocket/auth.ts') as typeof import('./websocket/auth');
const {
  buildHealthPayload,
  buildMetricsPayload,
  buildStatsPayload,
  startHeartbeat,
} = require('./websocket/presence.ts') as typeof import('./websocket/presence');
const {
  addLegacyRoomClient,
  broadcastToAll: broadcastToAllChannels,
  broadcastToChannel: broadcastToRoomChannel,
  broadcastToLegacyRoom: broadcastToLegacyRoomClients,
  removeLegacyRoomClient,
  removeSocketFromLegacyRooms,
  subscribeToChannel: subscribeClientToChannel,
  unsubscribeFromChannel: unsubscribeClientFromChannel,
} = require('./websocket/rooms.ts') as typeof import('./websocket/rooms');
const {
  sendError: sendTransportError,
  sendRaw: sendRawTransport,
  sendToClient: sendTransportToClient,
} = require('./websocket/transport.ts') as typeof import('./websocket/transport');
const { getQueueRedis } = require('../redis-queue.ts') as typeof import('../redis-queue');
const { createComponentLogger } = require('../observability/logger.ts') as typeof import('../observability/logger');
const { getTerminalPtyManager } = require('./terminal-pty-runtime.ts') as typeof import('./terminal-pty-runtime');
const { WS_MESSAGE_TYPES } = require('./websocket-runtime-contracts.ts') as typeof import('./websocket-runtime-contracts');
const {
  asTerminalPayload,
  asWsRecord,
  normalizeMessageType,
  normalizePath,
  parseWebSocketRequestUrl,
  readNumber,
  readString,
  readStringArray,
  readStringMap,
  resolveHost,
  resolvePort,
  toUint8Array,
} = require('./websocket-runtime-codecs.ts') as typeof import('./websocket-runtime-codecs');
const {
  isHttpOnlyPath,
  isLegacyAiPath,
  isLegacyCollaborationPath,
  isLegacyDapPath,
  isLegacyExportPath,
  isLegacyLspPath,
  isLegacyTerminalPath,
  isModernRuntimePath,
  resolveCollaborationRoomName,
  resolveConnectionType,
} = require('./websocket-runtime-routing.ts') as typeof import('./websocket-runtime-routing');
const { getYWebsocketSetup, initYWebsocket } = require('./websocket-yjs-bootstrap.ts') as typeof import('./websocket-yjs-bootstrap');

const log = createComponentLogger('server/websocket-server');

export { WS_MESSAGE_TYPES };
export { eventBus } from './websocket/event-bus';
export type { WsClient, WsChannel, WsMessage } from './websocket-runtime-contracts';
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
        const url = parseWebSocketRequestUrl(req.url || '/');
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
    const parsedUrl = parseWebSocketRequestUrl(request.url || '/');
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;

    if (isHttpOnlyPath(pathname)) {
      this.sendRaw(ws, { type: 'error', error: 'Use HTTP for this path.' });
      ws.close(1008, 'Unsupported WebSocket path');
      return;
    }

    const info: ConnectionInfo = {
      id: this.generateConnectionId(),
      type: resolveConnectionType(pathname),
      path: pathname,
      mode: isModernRuntimePath(pathname) ? 'modern' : 'legacy',
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

    if (isModernRuntimePath(pathname)) {
      this.handleModernConnection(ws, request, parsedUrl, info);
      return;
    }

    if (isLegacyExportPath(pathname)) {
      void this.handleExportConnection(ws, pathname);
      return;
    }

    if (isLegacyTerminalPath(pathname)) {
      this.handleLegacyTerminalConnection(ws, info);
      return;
    }

    if (isLegacyLspPath(pathname)) {
      this.handleLegacyLspConnection(ws, info);
      return;
    }

    if (isLegacyAiPath(pathname)) {
      this.handleLegacyAiConnection(ws);
      return;
    }

    if (isLegacyDapPath(pathname)) {
      this.handleLegacyDapConnection(ws);
      return;
    }

    if (isLegacyCollaborationPath(pathname)) {
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

    removeSocketFromLegacyRooms(this.legacyRooms, ws);

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


  // ==========================================================================
  // Modern runtime protocol
  // ==========================================================================

  private handleModernConnection(
    ws: WebSocket,
    request: IncomingMessage,
    parsedUrl: ParsedWebSocketUrl,
    info: ConnectionInfo
  ): void {
    const clientId = this.generateClientId();
    const query = parsedUrl.query;
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
      handleClientAuth(client, { token: queryToken, userId: queryUserId }, false, (event) =>
        this.emit('authenticated', event)
      );
    }

    this.emit('connection', { clientId, connectionId: info.id });
  }

  private handleModernMessage(client: WsClient, data: RawData): void {
    let rawMessage: WsRecord;

    try {
      rawMessage = asWsRecord(JSON.parse(data.toString()));
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
        handleClientAuth(client, payload, true, (event) => this.emit('authenticated', event));
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
  // Channel management
  // ==========================================================================

  private subscribeToChannel(client: WsClient, channelName: string, options?: unknown): void {
    subscribeClientToChannel(this.getRoomContext(), client, channelName, options);
  }

  private unsubscribeFromChannel(client: WsClient, channelName: string, notifyClient: boolean = true): void {
    unsubscribeClientFromChannel(this.getRoomContext(), client, channelName, notifyClient);
  }

  // ==========================================================================
  // Terminal handlers
  // ==========================================================================

  private async handleTerminalCreate(client: WsClient, payload: unknown): Promise<void> {
    const data = asWsRecord(payload);
    const userId = ensureUserIdentity(client, readString(data.userId));
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
        id: readString(data.sessionId) || this.generateClientId(),
        userId,
        name: readString(data.name) || 'Terminal',
        cwd: readString(data.cwd) || process.cwd(),
        shell: readString(data.shell),
        args: readStringArray(data.args),
        env: readStringMap(data.env),
        cols: readNumber(data.cols),
        rows: readNumber(data.rows),
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

  private handleTerminalInput(client: WsClient, payload: unknown): void {
    const dataRecord = asWsRecord(payload);
    const sessionId = dataRecord.sessionId;
    const data = dataRecord.data;
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

  private handleTerminalResize(client: WsClient, payload: unknown): void {
    const data = asWsRecord(payload);
    const sessionId = data.sessionId;
    const cols = data.cols;
    const rows = data.rows;
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

  private async handleTerminalKill(client: WsClient, payload: unknown): Promise<void> {
    const sessionId = asWsRecord(payload).sessionId;
    if (typeof sessionId !== 'string') {
      this.sendError(client, 'Terminal kill requires sessionId');
      return;
    }

    await this.terminalManager.killSession(sessionId);
  }

  private setupTerminalEvents(): void {
    this.terminalManager.on('data', (output: unknown) => {
      const terminalOutput = asTerminalPayload(output);
      if (!terminalOutput) {
        log.warn('[Terminal] Ignoring malformed output event', output);
        return;
      }

      const channelName = `terminal:${terminalOutput.sessionId}`;
      this.broadcastToChannel(channelName, {
        type: WS_MESSAGE_TYPES.TERMINAL_DATA,
        channel: channelName,
        payload: terminalOutput,
      });
    });

    this.terminalManager.on('exit', (info: unknown) => {
      const terminalInfo = asTerminalPayload(info);
      if (!terminalInfo) {
        log.warn('[Terminal] Ignoring malformed exit event', info);
        return;
      }

      const channelName = `terminal:${terminalInfo.sessionId}`;
      this.broadcastToChannel(channelName, {
        type: WS_MESSAGE_TYPES.TERMINAL_EXIT,
        channel: channelName,
        payload: terminalInfo,
      });
    });
  }

  // ==========================================================================
  // Collaboration handlers (modern protocol)
  // ==========================================================================

  private handleCollabJoin(client: WsClient, payload: unknown): void {
    const data = asWsRecord(payload);
    const documentId = readString(data.documentId) || 'default';
    const userId = ensureUserIdentity(client, readString(data.userId));
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
          userName: data.userName,
          color: data.color,
          clientId: client.id,
        },
      },
      client.id
    );
  }

  private handleCollabOperation(client: WsClient, channel: string, payload: unknown): void {
    const data = asWsRecord(payload);
    this.broadcastToChannel(
      channel,
      {
        type: WS_MESSAGE_TYPES.COLLAB_OPERATION,
        channel,
        payload: {
          ...data,
          clientId: client.id,
          timestamp: Date.now(),
        },
      },
      client.id
    );
  }

  private handleCollabChat(client: WsClient, channel: string, payload: unknown): void {
    const data = asWsRecord(payload);
    const userId = ensureUserIdentity(client, readString(data.userId));
    this.broadcastToChannel(channel, {
      type: WS_MESSAGE_TYPES.COLLAB_CHAT,
      channel,
      payload: {
        ...data,
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
          const parsed = asWsRecord(JSON.parse(raw));
          this.sendRaw(ws, { type: 'export-status', exportId, state: parsed });
          if (['completed', 'failed', 'canceled'].includes(readString(parsed.status) || '')) {
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
        } catch (error) {
          if (!stopped && ws.readyState === WebSocket.OPEN) {
            this.sendRaw(ws, {
              type: 'error',
              error: error instanceof Error ? error.message : 'Failed to read export state',
            });
          }
        }
      }, state.pollMs);
    } catch (error) {
      if (!stopped && ws.readyState === WebSocket.OPEN) {
        this.sendRaw(ws, {
          type: 'error',
          error: error instanceof Error ? error.message : 'Failed to init Redis for export status',
        });
        ws.close(1011, 'Export status unavailable');
      }
    }
  }

  private handleLegacyCollaborationConnection(ws: WebSocket, request: IncomingMessage, pathname: string): void {
    const roomName = resolveCollaborationRoomName(pathname);
    log.info(`[Collaboration] Client joining room: ${roomName}`);

    const yjsSetupConnection = getYWebsocketSetup();
    if (yjsSetupConnection) {
      yjsSetupConnection(ws, request, {
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

    const room = addLegacyRoomClient(this.legacyRooms, roomName, ws);

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
        const message = asWsRecord(JSON.parse(data.toString()));
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
        const message = asWsRecord(JSON.parse(data.toString()));
        eventBus.emit('lsp:message', {
          language,
          message,
          respond: (response: unknown) => {
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
        const message = asWsRecord(JSON.parse(data.toString()));
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
        const message = asWsRecord(JSON.parse(data.toString()));
        eventBus.emit('dap:message', {
          message,
          respond: (response: unknown) => {
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
        const message = asWsRecord(JSON.parse(data.toString()));
        if (message.type === 'join-room') {
          const roomName = String(message.room || 'default');
          addLegacyRoomClient(this.legacyRooms, roomName, ws);
          this.sendRaw(ws, { type: 'room-joined', room: roomName });
          return;
        }

        if (message.type === 'leave-room') {
          removeLegacyRoomClient(this.legacyRooms, String(message.room || ''), ws);
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
    sendTransportToClient(client, message);
  }

  private sendError(client: WsClient, error: string): void {
    sendTransportError(client, error, WS_MESSAGE_TYPES.ERROR);
  }

  broadcastToChannel(channelName: string, message: WsMessage, excludeClientId?: string): void {
    broadcastToRoomChannel(this.getRoomContext(), channelName, message, excludeClientId);
  }

  broadcastToAll(message: WsMessage, excludeClientId?: string): void {
    broadcastToAllChannels(this.getRoomContext(), message, excludeClientId);
  }

  broadcastToLegacyRoom(roomName: string, message: unknown, exclude?: WebSocket): void {
    broadcastToLegacyRoomClients(this.legacyRooms, roomName, message, exclude);
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
    sendRawTransport(ws, message);
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
    this.pingInterval = startHeartbeat({
      clients: this.clients,
      clientTimeoutMs: this.clientTimeout,
      intervalMs: this.pingIntervalMs,
      onInactive: (client, clientId) => {
        log.info(`Terminating inactive client: ${clientId}`);
        client.ws.terminate();
        this.handleDisconnect(client);
      },
    });
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

  private getHealthPayload() {
    return buildHealthPayload(this.getPresenceSnapshot());
  }

  private getStatsPayload() {
    return buildStatsPayload(this.getPresenceSnapshot());
  }

  private getMetricsPayload(): string {
    return buildMetricsPayload(this.getPresenceSnapshot());
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  private getRoomContext() {
    return {
      clients: this.clients,
      channels: this.channels,
      legacyRooms: this.legacyRooms,
      emit: (eventName: string, payload: unknown) => this.emit(eventName, payload),
    };
  }

  private getPresenceSnapshot() {
    return {
      connections: this.connections,
      clients: this.clients,
      channels: this.channels,
      legacyRooms: this.legacyRooms,
    };
  }

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
