export interface Collaborator {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  color: string;
  cursor?: {
    line: number;
    column: number;
  };
  selection?: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
  activeFile?: string;
  lastSeen: number;
  isOnline: boolean;
}

export interface CollaborationSession {
  id: string;
  name: string;
  projectId: string;
  createdAt: string;
  createdBy: string;
  collaborators: Collaborator[];
  settings: SessionSettings;
}

export interface SessionSettings {
  allowAnonymous: boolean;
  maxCollaborators: number;
  autoFollow: boolean;
  showCursors: boolean;
  showSelections: boolean;
  chatEnabled: boolean;
  voiceEnabled: boolean;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: number;
  type: 'text' | 'system' | 'code';
  codeSnippet?: {
    language: string;
    code: string;
    file?: string;
    line?: number;
  };
}

export interface CollaborationEvents {
  connected: () => void;
  disconnected: () => void;
  sessionJoined: (session: CollaborationSession) => void;
  sessionLeft: () => void;
  collaboratorJoined: (collaborator: Collaborator) => void;
  collaboratorLeft: (collaborator: Collaborator) => void;
  collaboratorUpdated: (collaborator: Collaborator) => void;
  cursorMoved: (userId: string, cursor: { line: number; column: number }) => void;
  selectionChanged: (userId: string, selection: { startLine: number; startColumn: number; endLine: number; endColumn: number } | null) => void;
  chatMessage: (message: ChatMessage) => void;
  documentSynced: (uri: string) => void;
  error: (error: Error) => void;
}

export interface MonacoBindingLike {
  destroy: () => void;
}
