'use client';

export type ActiveFileState = {
  path: string;
  content: string;
  language: string;
};

export type EditorPane = 'primary' | 'secondary';

export type EditorCursorStatus = {
  pane: EditorPane;
  line: number;
  column: number;
};

export type EditorSelectionStatus = {
  pane: EditorPane;
  lines: number;
  characters: number;
};

export type SidebarTab = 'explorer' | 'git';

export type PreviewMode = 'runtime' | 'device' | 'console' | 'viewport3d' | 'canvas';

export type CollaborationRoomParticipant = {
  userId: string;
  status: 'online' | 'away' | 'offline' | string;
  lastSeen: string;
  user?: {
    name?: string | null;
    avatar?: string | null;
  } | null;
};

export type CollaborationRoomSummary = {
  id: string;
  name: string;
  updatedAt: string;
  participants: CollaborationRoomParticipant[];
};

export type CollaborationRoomsResponse = {
  success: boolean;
  rooms: CollaborationRoomSummary[];
};

export type InlineApplyResult = {
  runId?: string;
  rollbackToken?: string;
  message?: string;
  filePath?: string;
};
