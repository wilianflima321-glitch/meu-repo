import { WebSocket } from 'ws';
import { createRequire } from 'module';

import type { WsChannel, WsClient, WsMessage } from '../websocket-runtime-contracts';

const require = createRequire(import.meta.url);
const { WS_MESSAGE_TYPES } = require('../websocket-runtime-contracts.ts') as typeof import('../websocket-runtime-contracts');
const { asWsRecord } = require('../websocket-runtime-codecs.ts') as typeof import('../websocket-runtime-codecs');
const { sendRaw, sendToClient } = require('./transport.ts') as typeof import('./transport');

export interface WsRoomContext {
  clients: Map<string, WsClient>;
  channels: Map<string, WsChannel>;
  legacyRooms: Map<string, Set<WebSocket>>;
  emit: (eventName: string, payload: unknown) => void;
}

export function subscribeToChannel(
  context: WsRoomContext,
  client: WsClient,
  channelName: string,
  options?: unknown
): void {
  if (!channelName) {
    sendToClient(client, {
      type: WS_MESSAGE_TYPES.ERROR,
      channel: 'system',
      payload: { error: 'Channel name is required' },
    });
    return;
  }

  let channel = context.channels.get(channelName);
  if (!channel) {
    let type: WsChannel['type'] = 'general';
    if (channelName.startsWith('terminal:')) type = 'terminal';
    else if (channelName.startsWith('collab:')) type = 'collaboration';
    else if (channelName.startsWith('files:')) type = 'filewatcher';

    channel = {
      name: channelName,
      clients: new Set(),
      type,
      metadata: asWsRecord(asWsRecord(options).metadata),
    };
    context.channels.set(channelName, channel);
  }

  channel.clients.add(client.id);
  client.channels.add(channelName);

  sendToClient(client, {
    type: WS_MESSAGE_TYPES.SUBSCRIBED,
    channel: channelName,
    payload: {
      clients: channel.clients.size,
      metadata: channel.metadata,
    },
  });

  context.emit('subscribed', { clientId: client.id, channel: channelName });
}

export function unsubscribeFromChannel(
  context: WsRoomContext,
  client: WsClient,
  channelName: string,
  notifyClient = true
): void {
  const channel = context.channels.get(channelName);
  if (!channel) {
    return;
  }

  channel.clients.delete(client.id);
  client.channels.delete(channelName);

  if (channel.clients.size === 0) {
    context.channels.delete(channelName);
  }

  if (notifyClient) {
    sendToClient(client, {
      type: WS_MESSAGE_TYPES.UNSUBSCRIBED,
      channel: channelName,
      payload: {},
    });
  }

  context.emit('unsubscribed', { clientId: client.id, channel: channelName });
}

export function broadcastToChannel(
  context: WsRoomContext,
  channelName: string,
  message: WsMessage,
  excludeClientId?: string
): void {
  const channel = context.channels.get(channelName);
  if (!channel) {
    return;
  }

  for (const clientId of channel.clients) {
    if (clientId === excludeClientId) {
      continue;
    }

    const client = context.clients.get(clientId);
    if (client) {
      sendToClient(client, message);
    }
  }
}

export function broadcastToAll(context: WsRoomContext, message: WsMessage, excludeClientId?: string): void {
  for (const client of context.clients.values()) {
    if (client.id === excludeClientId) {
      continue;
    }
    sendToClient(client, message);
  }
}

export function addLegacyRoomClient(
  legacyRooms: Map<string, Set<WebSocket>>,
  roomName: string,
  ws: WebSocket
): Set<WebSocket> {
  const room = legacyRooms.get(roomName) || new Set<WebSocket>();
  room.add(ws);
  legacyRooms.set(roomName, room);
  return room;
}

export function removeLegacyRoomClient(
  legacyRooms: Map<string, Set<WebSocket>>,
  roomName: string,
  ws: WebSocket
): void {
  const room = legacyRooms.get(roomName);
  room?.delete(ws);
  if (room?.size === 0) {
    legacyRooms.delete(roomName);
  }
}

export function removeSocketFromLegacyRooms(legacyRooms: Map<string, Set<WebSocket>>, ws: WebSocket): void {
  for (const [roomName, clients] of legacyRooms.entries()) {
    clients.delete(ws);
    if (clients.size === 0) {
      legacyRooms.delete(roomName);
    }
  }
}

export function broadcastToLegacyRoom(
  legacyRooms: Map<string, Set<WebSocket>>,
  roomName: string,
  message: unknown,
  exclude?: WebSocket
): void {
  const room = legacyRooms.get(roomName);
  if (!room) {
    return;
  }

  for (const client of room) {
    if (client === exclude || client.readyState !== WebSocket.OPEN) {
      continue;
    }
    sendRaw(client, message);
  }
}
