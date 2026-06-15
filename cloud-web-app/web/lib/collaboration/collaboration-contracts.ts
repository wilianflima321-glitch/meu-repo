export interface CollaborationUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  color: string;
  cursor?: CursorPosition;
  selection?: SelectionRange;
  lastActivity: number;
  permissions: CollaborationPermission[];
}

export interface CursorPosition {
  line: number;
  column: number;
  fileUri: string;
}

export interface SelectionRange {
  start: { line: number; column: number };
  end: { line: number; column: number };
  fileUri: string;
}

export type CollaborationPermission = 'read' | 'write' | 'admin';

export interface DocumentOperation {
  id: string;
  type: 'insert' | 'delete' | 'replace';
  fileUri: string;
  position: { line: number; column: number };
  text?: string;
  length?: number;
  userId: string;
  timestamp: number;
  version: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  text: string;
  timestamp: number;
  replyTo?: string;
  reactions: Record<string, string[]>;
}

export interface CollaborationSession {
  id: string;
  name: string;
  host: string;
  users: CollaborationUser[];
  createdAt: number;
  settings: SessionSettings;
}

export interface SessionSettings {
  maxUsers: number;
  allowAnonymous: boolean;
  requireApproval: boolean;
  readOnlyMode: boolean;
  chatEnabled: boolean;
  voiceEnabled: boolean;
}

export interface WebSocketMessage {
  type: string;
  payload: unknown;
  sessionId: string;
  userId: string;
  timestamp: number;
}

export interface CRDTCharacter {
  id: string;
  value: string;
  visible: boolean;
  position: number[];
  userId: string;
  timestamp: number;
}
