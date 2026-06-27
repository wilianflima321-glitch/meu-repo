'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type * as monacoEditor from 'monaco-editor';

import type { RemotePeer } from '@/hooks/useCollaborationAwareness';
import {
  collaborationColorForUser,
} from '@/components/ide/fullscreen/workbench-helpers';
import {
  useYjsCollaboration,
  type SelectionRange,
} from '@/lib/yjs-collaboration';
import { createComponentLogger } from '@/lib/observability/logger';

import type {
  EditorPane,
  WorkbenchCollaborationStatus,
} from './types';

const log = createComponentLogger('useWorkbenchRealtimeCollaboration');

type BroadcastCursorArgs = {
  filePath: string;
  pane: EditorPane;
  position: { line: number; column: number };
  editor: monacoEditor.editor.IStandaloneCodeEditor | null;
};

type BroadcastSelectionArgs = {
  filePath: string;
  pane: EditorPane;
  range: monacoEditor.IRange | null;
  editor: monacoEditor.editor.IStandaloneCodeEditor | null;
};

type UseWorkbenchRealtimeCollaborationParams = {
  hasToken: boolean;
  projectId: string;
};

type DecodedWorkbenchUser = {
  id: string;
  name: string;
  avatar?: string;
  color: string;
};

function decodeWorkbenchUser(): DecodedWorkbenchUser | null {
  if (typeof window === 'undefined') return null;
  const rawToken = window.localStorage.getItem('aethel-token');
  if (!rawToken) return null;

  try {
    const payload = JSON.parse(window.atob(rawToken.split('.')[1] ?? ''));
    const id = String(payload.userId ?? payload.sub ?? payload.id ?? '').trim();
    if (!id) return null;

    const nameCandidate = payload.name ?? payload.username ?? payload.email ?? payload.userName;
    const name = String(nameCandidate ?? `User ${id.slice(0, 6)}`).trim();
    const avatar = typeof payload.avatar === 'string' ? payload.avatar : undefined;

    return {
      id,
      name,
      avatar,
      color: collaborationColorForUser(id),
    };
  } catch (error) {
    log.warn('Failed to decode collaboration identity from token', { error });
    return null;
  }
}

function resolveCollaborationServerUrl(): string {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
  }

  const explicit = process.env.NEXT_PUBLIC_WS_URL;
  if (explicit?.trim()) return explicit.trim();

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  if (isLocalhost) {
    return `${protocol}//${window.location.hostname}:3001`;
  }
  return `${protocol}//${window.location.host}`;
}

function collaborationClientId(userId: string): number {
  return Math.abs(
    Array.from(userId).reduce(
      (accumulator, char) => ((accumulator << 5) - accumulator + char.charCodeAt(0)) | 0,
      0,
    ),
  );
}

export function useWorkbenchRealtimeCollaboration({
  hasToken,
  projectId,
}: UseWorkbenchRealtimeCollaborationParams) {
  const [currentUser, setCurrentUser] = useState<DecodedWorkbenchUser | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    setCurrentUser(hasToken ? decodeWorkbenchUser() : null);
  }, [hasToken]);

  const collaborationEnabled = Boolean(hasToken && currentUser?.id && projectId && projectId !== 'default');
  const documentName = collaborationEnabled ? `project:${projectId}:workbench` : 'disabled';

  const {
    session,
    isConnected,
    isSynced,
    isPersistenceSynced,
    users,
    error,
    connect,
    disconnect,
    updateCursor,
    updateSelection,
  } = useYjsCollaboration({
    documentName,
    serverUrl: resolveCollaborationServerUrl(),
    persistenceEnabled: collaborationEnabled,
    persistenceName: collaborationEnabled ? `workbench:${projectId}` : 'disabled',
    userId: currentUser?.id ?? 'anonymous',
    userName: currentUser?.name ?? 'Guest',
    userColor: currentUser?.color,
  });

  useEffect(() => {
    if (!collaborationEnabled) {
      setIsConnecting(false);
      disconnect();
      return;
    }

    setIsConnecting(true);
    void connect()
      .catch((connectError) => {
        log.warn('Workbench collaboration connection failed', {
          projectId,
          error: connectError,
        });
      })
      .finally(() => {
        setIsConnecting(false);
      });

    return () => {
      setIsConnecting(false);
      disconnect();
    };
  }, [collaborationEnabled, connect, disconnect, projectId]);

  const editorPeers = useMemo<RemotePeer[]>(() => {
    if (!collaborationEnabled) return [];
    return users
      .filter((user) => user.id !== currentUser?.id)
      .map((user) => ({
        clientId: collaborationClientId(user.id),
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        color: user.color || collaborationColorForUser(user.id),
        cursor: user.cursor,
        selection: user.selection,
        lastActivity: Date.now(),
      }));
  }, [collaborationEnabled, currentUser?.id, users]);

  const collaborationStatus = useMemo<WorkbenchCollaborationStatus>(() => {
    const peerCount = editorPeers.length;
    const liveCursorCount = editorPeers.filter((peer) => peer.cursor).length;
    const normalizedErrorMessage = error?.message?.trim() || undefined;

    if (!collaborationEnabled) {
      const detail = !hasToken
        ? 'Sign in to sync cursors and presence.'
        : currentUser?.id
          ? 'Open a real project to activate the shared session.'
          : 'Collaboration identity is unavailable right now.';

      return {
        state: 'disabled',
        tone: 'neutral',
        label: 'Solo',
        detail,
        peerCount,
        liveCursorCount,
      };
    }

    if (normalizedErrorMessage) {
      return {
        state: 'error',
        tone: 'danger',
        label: 'Sync error',
        detail: normalizedErrorMessage,
        peerCount,
        liveCursorCount,
        errorMessage: normalizedErrorMessage,
      };
    }

    if (isConnected && isSynced) {
      return {
        state: 'live',
        tone: 'success',
        label: 'Ao vivo',
        detail:
          peerCount > 0
            ? liveCursorCount > 0
              ? `${peerCount} peer${peerCount === 1 ? '' : 's'} connected${peerCount === 1 ? '' : 's'} - ${liveCursorCount} cursor${liveCursorCount === 1 ? '' : 'es'} active${liveCursorCount === 1 ? '' : 's'}`
              : `${peerCount} peer${peerCount === 1 ? '' : 's'} connected${peerCount === 1 ? '' : 's'} - presence synchronized`
            : 'Session synchronized. Invite someone to edit together.',
        peerCount,
        liveCursorCount,
      };
    }

    if (isConnected) {
      return {
        state: 'syncing',
        tone: 'warning',
        label: 'Sincronizando',
        detail:
          peerCount > 0
            ? `Canal connected; aguardando sync do documento com ${peerCount} peer${peerCount === 1 ? '' : 's'}.`
            : 'Canal connected; aguardando confirmacao de sync do documento.',
        peerCount,
        liveCursorCount,
      };
    }

    if (isConnecting) {
      return {
        state: 'connecting',
        tone: 'warning',
        label: 'Conectando',
        detail: 'Joining the shared project session.',
        peerCount,
        liveCursorCount,
      };
    }

    return {
      state: 'reconnecting',
      tone: 'warning',
      label: 'Reconectando',
      detail: isPersistenceSynced
        ? 'No live sync confirmed. Local offline cache is active until the session returns.'
        : 'No sync confirmed. Your changes remain local until the session returns.',
      peerCount,
      liveCursorCount,
    };
  }, [
    collaborationEnabled,
    currentUser?.id,
    editorPeers,
    error,
    hasToken,
    isConnected,
    isConnecting,
    isPersistenceSynced,
    isSynced,
  ]);

  const broadcastCursor = useCallback(({
    filePath,
    pane,
    position,
    editor,
  }: BroadcastCursorArgs) => {
    if (!collaborationEnabled || !editor) return;

    const visiblePosition = editor.getScrolledVisiblePosition({
      lineNumber: position.line,
      column: position.column,
    });

    if (!visiblePosition) return;

    updateCursor({
      x: visiblePosition.left,
      y: visiblePosition.top,
      filePath,
      pane,
      line: position.line,
      column: position.column,
    });
  }, [collaborationEnabled, updateCursor]);

  const broadcastSelection = useCallback(({
    filePath,
    pane,
    range,
    editor,
  }: BroadcastSelectionArgs) => {
    if (!collaborationEnabled || !editor) return;

    const model = editor.getModel();
    if (!range || !model) {
      updateSelection(null);
      return;
    }

    const startOffset = model.getOffsetAt({
      lineNumber: range.startLineNumber,
      column: range.startColumn,
    });
    const endOffset = model.getOffsetAt({
      lineNumber: range.endLineNumber,
      column: range.endColumn,
    });
    const safeEndOffset = Math.max(endOffset, startOffset);

    const selection: SelectionRange = {
      filePath,
      pane,
      start: { index: startOffset, length: safeEndOffset - startOffset },
      end: { index: safeEndOffset, length: 0 },
    };

    updateSelection(selection);
  }, [collaborationEnabled, updateSelection]);

  return {
    collaborationEnabled,
    collaborationSession: session,
    collaborationConnected: isConnected,
    collaborationSynced: isSynced,
    collaborationNativeBindingEnabled: Boolean(collaborationEnabled && isConnected && isSynced && session),
    collaborationError: error,
    collaborationStatus,
    editorPeers,
    broadcastCursor,
    broadcastSelection,
  };
}

export default useWorkbenchRealtimeCollaboration;
