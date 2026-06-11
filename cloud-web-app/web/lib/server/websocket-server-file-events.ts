import type { WsMessage } from './websocket-runtime-contracts';
import { WS_MESSAGE_TYPES } from './websocket-runtime-contracts';

export type FileChangeEvent = {
  type: 'changed' | 'created' | 'deleted' | 'renamed';
  path: string;
  oldPath?: string;
};

export function createFileChangeMessage(channelName: string, event: FileChangeEvent): WsMessage {
  const messageType =
    event.type === 'changed'
      ? WS_MESSAGE_TYPES.FILE_CHANGED
      : event.type === 'created'
        ? WS_MESSAGE_TYPES.FILE_CREATED
        : event.type === 'deleted'
          ? WS_MESSAGE_TYPES.FILE_DELETED
          : WS_MESSAGE_TYPES.FILE_RENAMED;

  return {
    type: messageType,
    channel: channelName,
    payload: event,
  };
}
