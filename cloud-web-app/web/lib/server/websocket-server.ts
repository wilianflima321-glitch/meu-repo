/** Hybrid WebSocket runtime for modern channels plus legacy Yjs/export endpoints. */

import { WebSocketServer, WebSocket } from 'ws';
import type { RawData } from 'ws';
import { EventEmitter } from 'events';
import { IncomingMessage, Server as HttpServer } from 'http';
import * as Y from 'yjs';

import { createComponentLogger } from '../observability/logger.ts';
import { getTerminalPtyManager, type TerminalPtyManager } from './terminal-pty-runtime.ts';
import {
  parseWebSocketRequestUrl,
  resolveHost,
  resolvePort,
  type ParsedWebSocketUrl,
} from './websocket-runtime-codecs.ts';
import {
  WS_MESSAGE_TYPES,
  type ConnectionInfo,
  type WsChannel,
  type WsClient,
  type WsMessage,
} from './websocket-runtime-contracts.ts';
import { isHttpOnlyPath, isModernRuntimePath } from './websocket-runtime-routing.ts';
import { ensureUserIdentity, handleClientAuth } from './websocket/auth.ts';
import { eventBus } from './websocket/event-bus.ts';
import { handleLegacyCollaborationSocket } from './websocket/legacy-collaboration-handler.ts';
import { handleLegacyExportConnection } from './websocket/legacy-export-handler.ts';
import {
  handleLegacyAiSocket,
  handleLegacyDapSocket,
  handleLegacyGeneralSocket,
  handleLegacyLspSocket,
  handleLegacyTerminalSocket,
} from './websocket/legacy-simple-handlers.ts';
import { startHeartbeat } from './websocket/presence.ts';
import {
  broadcastToAll as broadcastToAllChannels,
  broadcastToChannel as broadcastToRoomChannel,
  broadcastToLegacyRoom as broadcastToLegacyRoomClients,
  removeSocketFromLegacyRooms,
  subscribeToChannel as subscribeClientToChannel,
  unsubscribeFromChannel as unsubscribeClientFromChannel,
} from './websocket/rooms.ts';
import {
  handleTerminalCreate,
  handleTerminalInput,
  handleTerminalKill,
  handleTerminalResize,
  setupTerminalEvents,
} from './websocket/terminal-handlers.ts';
import {
  sendError as sendTransportError,
  sendRaw as sendRawTransport,
  sendToClient as sendTransportToClient,
} from './websocket/transport.ts';
import { initYWebsocket } from './websocket-yjs-bootstrap.ts';
import { handleCollabChat, handleCollabJoin, handleCollabOperation } from './websocket-server-collaboration.ts';
import { createFileChangeMessage, type FileChangeEvent } from './websocket-server-file-events.ts';
import { startWebSocketRuntime, stopWebSocketRuntime } from './websocket-server-lifecycle.ts';
import {
  authenticateModernQuery,
  createModernMessageHandlers,
  createModernWebSocketClient,
  routeModernMessage,
  sendModernWelcome,
} from './websocket-server-modern.ts';
import { createWebSocketConnectionInfo, routeLegacyWebSocketConnection } from './websocket-server-routing.ts';
import {
  getWebSocketHealthPayload,
  getWebSocketMetricsPayload,
  getWebSocketRuntimeStats,
  getWebSocketStatsPayload,
} from './websocket-server-snapshots.ts';

const log = createComponentLogger('server/websocket-server');

export { WS_MESSAGE_TYPES };
export { eventBus };
export type { WsClient, WsChannel, WsMessage } from './websocket-runtime-contracts.ts';

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

  async start(): Promise<void> {
    if (this.wss) {
      throw new Error('WebSocket server already running');
    }

    await initYWebsocket();

    const runtime = await startWebSocketRuntime({
      port: this.port,
      host: this.host,
      health: () => this.getHealthPayload(),
      stats: () => this.getStatsPayload(),
      metrics: () => this.getMetricsPayload(),
      onConnection: (ws, request) => this.handleConnection(ws, request),
      onError: (error) => this.emit('error', error),
      onListening: () => {
        log.info(`Aethel WebSocket server listening on ws://${this.host}:${this.port}`);
        this.startPingInterval();
        this.emit('started', { port: this.port, host: this.host });
      },
    });

    this.httpServer = runtime.httpServer;
    this.wss = runtime.wss;
  }

  async stop(): Promise<void> {
    this.stopPingInterval();

    await stopWebSocketRuntime({
      connections: this.connections,
      clients: this.clients,
      channels: this.channels,
      legacyRooms: this.legacyRooms,
      collaborationDocs: this.collaborationDocs,
      wss: this.wss,
      httpServer: this.httpServer,
    });

    this.wss = null;
    this.httpServer = null;
    this.emit('stopped');
  }

  private handleConnection(ws: WebSocket, request: IncomingMessage): void {
    const parsedUrl = parseWebSocketRequestUrl(request.url || '/');
    const pathname = parsedUrl.pathname;
    if (isHttpOnlyPath(pathname)) {
      this.sendRaw(ws, { type: 'error', error: 'Use HTTP for this path.' });
      ws.close(1008, 'Unsupported WebSocket path');
      return;
    }

    const info = createWebSocketConnectionInfo({ pathname, parsedUrl });
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

    routeLegacyWebSocketConnection({
      ws,
      request,
      pathname,
      info,
      handleExportConnection: (socket, pathName) => void handleLegacyExportConnection({
        ws: socket,
        pathname: pathName,
        sendRaw: (targetSocket, message) => this.sendRaw(targetSocket, message),
      }),
      handleLegacyTerminalConnection: (socket, connectionInfo) =>
        handleLegacyTerminalSocket(socket, connectionInfo, (targetSocket, message) => this.sendRaw(targetSocket, message)),
      handleLegacyLspConnection: (socket, connectionInfo) =>
        handleLegacyLspSocket(socket, connectionInfo, (targetSocket, message) => this.sendRaw(targetSocket, message)),
      handleLegacyAiConnection: (socket) =>
        handleLegacyAiSocket(socket, (targetSocket, message) => this.sendRaw(targetSocket, message)),
      handleLegacyDapConnection: (socket) =>
        handleLegacyDapSocket(socket, (targetSocket, message) => this.sendRaw(targetSocket, message)),
      handleLegacyCollaborationConnection: (socket, req, pathName) => handleLegacyCollaborationSocket({
        ws: socket,
        request: req,
        pathname: pathName,
        docs: this.collaborationDocs,
        legacyRooms: this.legacyRooms,
        broadcastToLegacyRoom: (roomName, message, exclude) => this.broadcastToLegacyRoom(roomName, message, exclude),
      }),
      handleLegacyGeneralConnection: (socket, connectionInfo) => handleLegacyGeneralSocket({
        ws: socket,
        info: connectionInfo,
        legacyRooms: this.legacyRooms,
        sendRaw: (targetSocket, message) => this.sendRaw(targetSocket, message),
        broadcastToLegacyRoom: (roomName, message, exclude) => this.broadcastToLegacyRoom(roomName, message, exclude),
      }),
    });
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

  private handleModernConnection(
    ws: WebSocket,
    request: IncomingMessage,
    parsedUrl: ParsedWebSocketUrl,
    info: ConnectionInfo
  ): void {
    const query = parsedUrl.query;
    const client = createModernWebSocketClient({ ws, request, parsedUrl, info });

    info.clientId = client.id;
    this.clients.set(client.id, client);

    ws.on('message', (data) => this.handleModernMessage(client, data));
    ws.on('pong', () => {
      client.lastPing = Date.now();
      client.isAlive = true;
    });

    sendModernWelcome({ client, sendToClient: (targetClient, message) => this.sendToClient(targetClient, message) });
    authenticateModernQuery({
      client,
      query,
      authenticate: (targetClient, payload, emitEvent) =>
        handleClientAuth(targetClient, payload, emitEvent, (event) => this.emit('authenticated', event)),
    });

    this.emit('connection', { clientId: client.id, connectionId: info.id });
  }

  private handleModernMessage(client: WsClient, data: RawData): void {
    routeModernMessage({
      client,
      data,
      handlers: createModernMessageHandlers({
        sendError: (targetClient, error) => this.sendError(targetClient, error),
        sendToClient: (targetClient, message) => this.sendToClient(targetClient, message),
        authenticate: (targetClient, payload) =>
          handleClientAuth(targetClient, payload, true, (event) => this.emit('authenticated', event)),
        subscribe: (targetClient, channel, payload) => this.subscribeToChannel(targetClient, channel, payload),
        unsubscribe: (targetClient, channel) => this.unsubscribeFromChannel(targetClient, channel),
        terminalCreate: (targetClient, payload) => void this.handleTerminalCreate(targetClient, payload),
        terminalInput: (targetClient, payload) => this.handleTerminalInput(targetClient, payload),
        terminalResize: (targetClient, payload) => this.handleTerminalResize(targetClient, payload),
        terminalKill: (targetClient, payload) => void this.handleTerminalKill(targetClient, payload),
        collabJoin: (targetClient, payload) => this.handleCollabJoin(targetClient, payload),
        collabOperation: (targetClient, channel, payload) => this.handleCollabOperation(targetClient, channel, payload),
        collabChat: (targetClient, channel, payload) => this.handleCollabChat(targetClient, channel, payload),
        broadcastToChannel: (channel, message, excludeClientId) =>
          this.broadcastToChannel(channel, message, excludeClientId),
        broadcastToAll: (message, excludeClientId) => this.broadcastToAll(message, excludeClientId),
        unhandled: (targetClient, message, rawMessage) =>
          this.emit('message', { client: targetClient, message, rawMessage }),
      }),
    });
  }

  private handleDisconnect(client: WsClient): void {
    for (const channelName of Array.from(client.channels)) {
      this.unsubscribeFromChannel(client, channelName, false);
    }

    this.clients.delete(client.id);
    this.emit('disconnect', { clientId: client.id, userId: client.userId });
  }

  private subscribeToChannel(client: WsClient, channelName: string, options?: unknown): void {
    subscribeClientToChannel(this.getRoomContext(), client, channelName, options);
  }

  private unsubscribeFromChannel(client: WsClient, channelName: string, notifyClient: boolean = true): void {
    unsubscribeClientFromChannel(this.getRoomContext(), client, channelName, notifyClient);
  }

  private getTerminalHandlerContext() {
    return {
      terminalManager: this.terminalManager,
      ensureUserIdentity,
      sendToClient: (client: WsClient, message: WsMessage) => this.sendToClient(client, message),
      sendError: (client: WsClient, error: string) => this.sendError(client, error),
      subscribeToChannel: (client: WsClient, channelName: string) => this.subscribeToChannel(client, channelName),
      broadcastToChannel: (channelName: string, message: WsMessage) => this.broadcastToChannel(channelName, message),
      log,
    };
  }

  private async handleTerminalCreate(client: WsClient, payload: unknown): Promise<void> {
    return handleTerminalCreate(this.getTerminalHandlerContext(), client, payload);
  }

  private handleTerminalInput(client: WsClient, payload: unknown): void {
    handleTerminalInput(this.getTerminalHandlerContext(), client, payload);
  }

  private handleTerminalResize(client: WsClient, payload: unknown): void {
    handleTerminalResize(this.getTerminalHandlerContext(), client, payload);
  }

  private async handleTerminalKill(client: WsClient, payload: unknown): Promise<void> {
    return handleTerminalKill(this.getTerminalHandlerContext(), client, payload);
  }

  private setupTerminalEvents(): void {
    setupTerminalEvents(this.getTerminalHandlerContext());
  }

  private handleCollabJoin(client: WsClient, payload: unknown): void {
    handleCollabJoin({
      client,
      payload,
      ensureUserIdentity,
      subscribeToChannel: (targetClient, channelName, options) =>
        this.subscribeToChannel(targetClient, channelName, options),
      broadcastToChannel: (channelName, message, excludeClientId) =>
        this.broadcastToChannel(channelName, message, excludeClientId),
    });
  }

  private handleCollabOperation(client: WsClient, channel: string, payload: unknown): void {
    handleCollabOperation({
      client,
      channel,
      payload,
      broadcastToChannel: (channelName, message, excludeClientId) =>
        this.broadcastToChannel(channelName, message, excludeClientId),
    });
  }

  private handleCollabChat(client: WsClient, channel: string, payload: unknown): void {
    handleCollabChat({
      client,
      channel,
      payload,
      ensureUserIdentity,
      broadcastToChannel: (channelName, message, excludeClientId) =>
        this.broadcastToChannel(channelName, message, excludeClientId),
    });
  }

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
    event: FileChangeEvent
  ): void {
    const channelName = `files:${workspaceId}`;
    this.broadcastToChannel(channelName, createFileChangeMessage(channelName, event));
  }

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

  private getHealthPayload() {
    return getWebSocketHealthPayload(this.getSnapshotSource());
  }

  private getStatsPayload() {
    return getWebSocketStatsPayload(this.getSnapshotSource());
  }

  private getMetricsPayload(): string {
    return getWebSocketMetricsPayload(this.getSnapshotSource());
  }

  private getRoomContext() {
    return {
      clients: this.clients,
      channels: this.channels,
      legacyRooms: this.legacyRooms,
      emit: (eventName: string, payload: unknown) => this.emit(eventName, payload),
    };
  }

  private getSnapshotSource() {
    return {
      connections: this.connections,
      clients: this.clients,
      channels: this.channels,
      legacyRooms: this.legacyRooms,
    };
  }

  getStats() {
    return getWebSocketRuntimeStats(this.getSnapshotSource());
  }
}

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
