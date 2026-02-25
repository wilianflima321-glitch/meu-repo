export type UserStatus = 'online' | 'away' | 'busy' | 'offline';

export interface UserPresence {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  color: string;
  status: UserStatus;
  lastSeen: Date;
  currentFile?: string;
  cursor?: CursorPosition;
  selection?: SelectionRange;
  typing?: boolean;
  metadata?: Record<string, unknown>;
}

export interface CursorPosition {
  x: number;
  y: number;
  line?: number;
  column?: number;
  viewportX?: number;
  viewportY?: number;
}

export interface SelectionRange {
  start: CursorPosition;
  end: CursorPosition;
  startLine?: number;
  startColumn?: number;
  endLine?: number;
  endColumn?: number;
}

export interface Room {
  id: string;
  name: string;
  type: 'project' | 'file' | 'voice' | 'custom';
  projectId?: string;
  fileId?: string;
  participants: string[];
  maxParticipants?: number;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface CollaborationEvent {
  type:
    | 'user_joined'
    | 'user_left'
    | 'cursor_move'
    | 'selection_change'
    | 'content_change'
    | 'file_open'
    | 'file_close'
    | 'typing_start'
    | 'typing_stop'
    | 'presence_update';
  userId: string;
  roomId: string;
  data: unknown;
  timestamp: Date;
}

export interface ContentOperation {
  id: string;
  type: 'insert' | 'delete' | 'replace' | 'move';
  userId: string;
  position: number;
  content?: string;
  length?: number;
  timestamp: number;
  vectorClock?: Record<string, number>;
  lamportTimestamp?: number;
}

export const UserColors = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E9',
  '#F8B500',
  '#00CED1',
  '#FF69B4',
  '#32CD32',
  '#FFD700',
  '#9370DB',
];

export function getColorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash &= hash;
  }
  return UserColors[Math.abs(hash) % UserColors.length];
}
