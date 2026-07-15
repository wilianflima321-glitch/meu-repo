import type { WebSocket } from 'ws';

export type WsRecord = Record<string, unknown>;
export type WsMetadata = Record<string, unknown>;

export interface WsMessage {
  type: string;
  channel: string;
  payload: unknown;
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
  metadata: WsMetadata;
}

export interface WsChannel {
  name: string;
  clients: Set<string>;
  type: 'terminal' | 'collaboration' | 'filewatcher' | 'general';
  metadata: WsMetadata;
}

export type ConnectionType = 'collaboration' | 'terminal' | 'lsp' | 'ai' | 'dap' | 'export' | 'general';

export interface ConnectionInfo {
  id: string;
  type: ConnectionType;
  path: string;
  mode: 'modern' | 'legacy';
  userId?: string;
  sessionId?: string;
  createdAt: number;
  clientId?: string;
}

export interface DecodedAuthPayload {
  userId: string;
  email?: string;
  role?: string;
}

export interface LegacyExportState {
  raw: string | null;
  pollMs: number;
}

export interface TerminalRuntimePayload {
  sessionId: string;
  [key: string]: unknown;
}

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
