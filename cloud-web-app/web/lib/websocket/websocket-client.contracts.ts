// ============================================================================
// Types
// ============================================================================

export interface WsClientConfig {
  url: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  pingInterval?: number;
  debug?: boolean;
}

export interface WsMessage {
  type: string;
  channel: string;
  payload: unknown;
  timestamp?: number;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface TerminalSessionInfo {
  sessionId: string;
  name: string;
  shell: string;
  cwd: string;
}

// ============================================================================
// Message Types (must match server)
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

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
