import type { IncomingMessage } from 'http';
import type { WebSocket } from 'ws';
import { createConnectionId } from './websocket/ids';
import type { ParsedWebSocketUrl } from './websocket-runtime-codecs';
import type { ConnectionInfo } from './websocket-runtime-contracts';
import {
  isLegacyAiPath,
  isLegacyCollaborationPath,
  isLegacyDapPath,
  isLegacyExportPath,
  isLegacyLspPath,
  isLegacyTerminalPath,
  isModernRuntimePath,
  resolveConnectionType,
} from './websocket-runtime-routing';

export function createWebSocketConnectionInfo(input: {
  pathname: string;
  parsedUrl: ParsedWebSocketUrl;
}): ConnectionInfo {
  const query = input.parsedUrl.query;
  return {
    id: createConnectionId(),
    type: resolveConnectionType(input.pathname),
    path: input.pathname,
    mode: isModernRuntimePath(input.pathname) ? 'modern' : 'legacy',
    userId: typeof query.userId === 'string' ? query.userId : undefined,
    sessionId: typeof query.sessionId === 'string' ? query.sessionId : undefined,
    createdAt: Date.now(),
  };
}

export function routeLegacyWebSocketConnection(input: {
  ws: WebSocket;
  request: IncomingMessage;
  pathname: string;
  info: ConnectionInfo;
  handleExportConnection: (ws: WebSocket, pathname: string) => void;
  handleLegacyTerminalConnection: (ws: WebSocket, info: ConnectionInfo) => void;
  handleLegacyLspConnection: (ws: WebSocket, info: ConnectionInfo) => void;
  handleLegacyAiConnection: (ws: WebSocket) => void;
  handleLegacyDapConnection: (ws: WebSocket) => void;
  handleLegacyCollaborationConnection: (ws: WebSocket, request: IncomingMessage, pathname: string) => void;
  handleLegacyGeneralConnection: (ws: WebSocket, info: ConnectionInfo) => void;
}): void {
  if (isLegacyExportPath(input.pathname)) {
    input.handleExportConnection(input.ws, input.pathname);
    return;
  }

  if (isLegacyTerminalPath(input.pathname)) {
    input.handleLegacyTerminalConnection(input.ws, input.info);
    return;
  }

  if (isLegacyLspPath(input.pathname)) {
    input.handleLegacyLspConnection(input.ws, input.info);
    return;
  }

  if (isLegacyAiPath(input.pathname)) {
    input.handleLegacyAiConnection(input.ws);
    return;
  }

  if (isLegacyDapPath(input.pathname)) {
    input.handleLegacyDapConnection(input.ws);
    return;
  }

  if (isLegacyCollaborationPath(input.pathname)) {
    input.handleLegacyCollaborationConnection(input.ws, input.request, input.pathname);
    return;
  }

  input.handleLegacyGeneralConnection(input.ws, input.info);
}
