import type { RawData } from 'ws';

import { asWsRecord, normalizeMessageType } from '../websocket-runtime-codecs';
import { WS_MESSAGE_TYPES } from '../websocket-runtime-contracts';
import type { WsClient, WsMessage, WsRecord } from '../websocket-runtime-contracts';

export interface ModernMessageRouterHandlers {
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
  unhandled: (client: WsClient, message: WsMessage, rawMessage: WsRecord) => void;
}

export function routeModernWebSocketMessage(
  client: WsClient,
  data: RawData,
  handlers: ModernMessageRouterHandlers
): void {
  let rawMessage: WsRecord;

  try {
    rawMessage = asWsRecord(JSON.parse(data.toString()));
  } catch {
    handlers.sendError(client, 'Invalid JSON message');
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
      handlers.authenticate(client, payload);
      break;
    case WS_MESSAGE_TYPES.PING:
      client.lastPing = Date.now();
      client.isAlive = true;
      handlers.sendToClient(client, {
        type: WS_MESSAGE_TYPES.PONG,
        channel: 'system',
        payload: {},
      });
      break;
    case WS_MESSAGE_TYPES.SUBSCRIBE:
      handlers.subscribe(client, channel, payload);
      break;
    case WS_MESSAGE_TYPES.UNSUBSCRIBE:
      handlers.unsubscribe(client, channel);
      break;
    case WS_MESSAGE_TYPES.TERMINAL_CREATE:
      handlers.terminalCreate(client, payload);
      break;
    case WS_MESSAGE_TYPES.TERMINAL_INPUT:
      handlers.terminalInput(client, payload);
      break;
    case WS_MESSAGE_TYPES.TERMINAL_RESIZE:
      handlers.terminalResize(client, payload);
      break;
    case WS_MESSAGE_TYPES.TERMINAL_KILL:
      handlers.terminalKill(client, payload);
      break;
    case WS_MESSAGE_TYPES.COLLAB_JOIN:
      handlers.collabJoin(client, payload);
      break;
    case WS_MESSAGE_TYPES.COLLAB_OPERATION:
      handlers.collabOperation(client, channel, payload);
      break;
    case WS_MESSAGE_TYPES.COLLAB_CURSOR:
    case WS_MESSAGE_TYPES.COLLAB_SELECTION:
    case WS_MESSAGE_TYPES.COLLAB_AWARENESS:
      handlers.broadcastToChannel(channel, { type, channel, payload }, client.id);
      break;
    case WS_MESSAGE_TYPES.COLLAB_CHAT:
      handlers.collabChat(client, channel, payload);
      break;
    case 'join-room':
      if (typeof rawMessage.room === 'string') handlers.subscribe(client, rawMessage.room, payload);
      break;
    case 'leave-room':
      if (typeof rawMessage.room === 'string') handlers.unsubscribe(client, rawMessage.room);
      break;
    case WS_MESSAGE_TYPES.BROADCAST:
    case 'broadcast':
      if (channel && channel !== 'system') {
        handlers.broadcastToChannel(channel, { type: WS_MESSAGE_TYPES.BROADCAST, channel, payload }, client.id);
      } else {
        handlers.broadcastToAll({ type: WS_MESSAGE_TYPES.BROADCAST, channel: 'system', payload }, client.id);
      }
      break;
    default:
      handlers.unhandled(client, { type, channel, payload } as WsMessage, rawMessage);
  }
}
