export interface CollaborationUser {
  id: string;
  name: string;
  color: string;
  avatar?: string;
  cursor?: CursorPosition;
  selection?: SelectionRange;
  lastActive: number;
}

export interface CursorPosition {
  line: number;
  column: number;
  file: string;
}

export interface SelectionRange {
  start: { line: number; column: number };
  end: { line: number; column: number };
  file: string;
}

export interface CollaborationRoom {
  id: string;
  name: string;
  documentId: string;
  users: Map<string, CollaborationUser>;
  createdAt: number;
  ownerId: string;
}

export interface DocumentChange {
  type: 'insert' | 'delete' | 'replace';
  position: number;
  text?: string;
  length?: number;
  userId: string;
  timestamp: number;
}

export interface CollaborationOptions {
  serverUrl?: string;
  roomId: string;
  documentId: string;
  userId: string;
  userName: string;
  userColor?: string;
  persistenceEnabled?: boolean;
  autoConnect?: boolean;
}

export interface TextOperation {
  retain?: number;
  insert?: string;
  delete?: number;
  attributes?: Record<string, unknown>;
}

export interface CollaborationComment {
  id: string;
  fileId: string;
  line: number;
  text: string;
  userId: string;
  userName: string;
  userColor: string;
  parentId?: string;
  createdAt: number;
  resolved: boolean;
  resolvedAt?: number;
}

export interface AwarenessChange {
  added: number[];
  updated: number[];
  removed: number[];
}

export interface AwarenessState {
  user?: Partial<CollaborationUser> & Pick<CollaborationUser, 'id' | 'name' | 'color'>;
  cursor?: CursorPosition;
  selection?: SelectionRange;
  lastActive?: number;
}

export interface YTextDeltaOperation {
  retain?: number;
  insert?: string;
  delete?: number;
}
