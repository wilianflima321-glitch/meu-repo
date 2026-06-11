import type { WsClient, WsMessage } from './websocket-runtime-contracts';
import { WS_MESSAGE_TYPES } from './websocket-runtime-contracts';
import { asWsRecord, readString } from './websocket-runtime-codecs';

export function handleCollabJoin(input: {
  client: WsClient;
  payload: unknown;
  ensureUserIdentity: (client: WsClient, requestedUserId?: string) => string | undefined;
  subscribeToChannel: (client: WsClient, channelName: string, options?: unknown) => void;
  broadcastToChannel: (channelName: string, message: WsMessage, excludeClientId?: string) => void;
}): void {
  const data = asWsRecord(input.payload);
  const documentId = readString(data.documentId) || 'default';
  const userId = input.ensureUserIdentity(input.client, readString(data.userId));
  const channelName = `collab:${documentId}`;

  input.subscribeToChannel(input.client, channelName, {
    metadata: { documentId },
  });

  input.broadcastToChannel(
    channelName,
    {
      type: WS_MESSAGE_TYPES.COLLAB_AWARENESS,
      channel: channelName,
      payload: {
        type: 'join',
        userId: userId || input.client.id,
        userName: data.userName,
        color: data.color,
        clientId: input.client.id,
      },
    },
    input.client.id
  );
}

export function handleCollabOperation(input: {
  client: WsClient;
  channel: string;
  payload: unknown;
  broadcastToChannel: (channelName: string, message: WsMessage, excludeClientId?: string) => void;
}): void {
  const data = asWsRecord(input.payload);
  input.broadcastToChannel(
    input.channel,
    {
      type: WS_MESSAGE_TYPES.COLLAB_OPERATION,
      channel: input.channel,
      payload: {
        ...data,
        clientId: input.client.id,
        timestamp: Date.now(),
      },
    },
    input.client.id
  );
}

export function handleCollabChat(input: {
  client: WsClient;
  channel: string;
  payload: unknown;
  ensureUserIdentity: (client: WsClient, requestedUserId?: string) => string | undefined;
  broadcastToChannel: (channelName: string, message: WsMessage, excludeClientId?: string) => void;
}): void {
  const data = asWsRecord(input.payload);
  const userId = input.ensureUserIdentity(input.client, readString(data.userId));
  input.broadcastToChannel(input.channel, {
    type: WS_MESSAGE_TYPES.COLLAB_CHAT,
    channel: input.channel,
    payload: {
      ...data,
      userId: userId || input.client.id,
      timestamp: Date.now(),
    },
  });
}
