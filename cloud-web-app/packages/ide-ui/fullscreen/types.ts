'use client';

import type { DocumentSymbol } from '../../../web/components/outline/OutlinePanel';

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

export type SidebarTab = 'explorer' | 'git' | 'research';

export type PreviewMode = 'runtime' | 'device' | 'console' | 'viewport3d' | 'canvas';

export type WorkbenchCollaborationState =
  | 'disabled'
  | 'connecting'
  | 'syncing'
  | 'live'
  | 'reconnecting'
  | 'error';

export type WorkbenchCollaborationTone = 'neutral' | 'success' | 'warning' | 'danger';

export type WorkbenchCollaborationStatus = {
  state: WorkbenchCollaborationState;
  tone: WorkbenchCollaborationTone;
  label: string;
  detail: string;
  peerCount: number;
  liveCursorCount: number;
  errorMessage?: string;
};

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

export type EditorDocumentSymbolState = {
  path: string;
  symbols: DocumentSymbol[];
  authoritative: boolean;
};
