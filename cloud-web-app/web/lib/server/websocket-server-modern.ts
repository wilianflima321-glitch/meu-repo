import type { IncomingMessage } from 'http';
import type { RawData, WebSocket } from 'ws';
import { createClientId } from './websocket/ids';
import { routeModernWebSocketMessage } from './websocket/modern-message-router';
import type { ParsedWebSocketUrl } from './websocket-runtime-codecs';
import type { ConnectionInfo, WsClient, WsMessage } from './websocket-runtime-contracts';

export function createModernWebSocketClient(input: {
  ws: WebSocket;
  request: IncomingMessage;
  parsedUrl: ParsedWebSocketUrl;
  info: ConnectionInfo;
}): WsClient {
  return {
    id: createClientId(),
    userId: input.info.userId || '',
    ws: input.ws,
    channels: new Set(),
    connectedAt: Date.now(),
    lastPing: Date.now(),
    isAlive: true,
    metadata: {
      ip: input.request.socket.remoteAddress,
      userAgent: input.request.headers['user-agent'],
      query: input.parsedUrl.query,
      path: input.info.path,
    },
  };
}

export function sendModernWelcome(input: {
  client: WsClient;
  sendToClient: (client: WsClient, message: WsMessage) => void;
}): void {
  input.sendToClient(input.client, {
    type: 'welcome',
    channel: 'system',
    payload: {
      clientId: input.client.id,
      serverTime: Date.now(),
      version: '2.1.0',
    },
  });
}

export function authenticateModernQuery(input: {
  client: WsClient;
  query: ParsedWebSocketUrl['query'];
  authenticate: (client: WsClient, payload: { token?: string; userId?: string }, emitEvent: boolean) => void;
}): void {
  const queryToken = typeof input.query.token === 'string' ? input.query.token : undefined;
  const queryUserId = typeof input.query.userId === 'string' ? input.query.userId : undefined;
  if (queryToken || queryUserId) {
    input.authenticate(input.client, { token: queryToken, userId: queryUserId }, false);
  }
}

export function routeModernMessage(input: {
  client: WsClient;
  data: RawData;
  handlers: Parameters<typeof routeModernWebSocketMessage>[2];
}): void {
  routeModernWebSocketMessage(input.client, input.data, input.handlers);
}

export function createModernMessageHandlers(input: {
  sendError: (client: WsClient, error: string) => void;
  sendToClient: (client: WsClient, message: WsMessage) => void;
  authenticate: (client: WsClient, payload: unknown) => void;
  subscribe: (client: WsClient, channel: string, payload?: unknown) => void;
  unsubscribe: (client: WsClient, channel: string) => void;
  terminalCreate: (client: WsClient, payload: unknown) => void;
  terminalInput: (client: WsClient, payload: unknown) => void;
  terminalResize: (client: WsClient, payload: unknown) => void;
  terminalKill: (client: WsClient, payload: unknown) => void;
  collabJoin: (client: WsClient, payload: unknown) => void;
  collabOperation: (client: WsClient, channel: string, payload: unknown) => void;
  collabChat: (client: WsClient, channel: string, payload: unknown) => void;
  broadcastToChannel: (channel: string, message: WsMessage, excludeClientId?: string) => void;
  broadcastToAll: (message: WsMessage, excludeClientId?: string) => void;
  unhandled: (client: WsClient, message: unknown, rawMessage: unknown) => void;
}): Parameters<typeof routeModernWebSocketMessage>[2] {
  return {
    sendError: input.sendError,
    sendToClient: input.sendToClient,
    authenticate: input.authenticate,
    subscribe: input.subscribe,
    unsubscribe: input.unsubscribe,
    terminalCreate: input.terminalCreate,
    terminalInput: input.terminalInput,
    terminalResize: input.terminalResize,
    terminalKill: input.terminalKill,
    collabJoin: input.collabJoin,
    collabOperation: input.collabOperation,
    collabChat: input.collabChat,
    broadcastToChannel: input.broadcastToChannel,
    broadcastToAll: input.broadcastToAll,
    unhandled: input.unhandled,
  };
}
