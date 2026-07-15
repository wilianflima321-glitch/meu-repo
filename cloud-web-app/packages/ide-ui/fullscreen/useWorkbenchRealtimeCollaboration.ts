'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type * as monacoEditor from 'monaco-editor';

import type { RemotePeer } from '../../../web/hooks/useCollaborationAwareness';
import {
  collaborationColorForUser,
} from './workbench-helpers';
import {
  useYjsCollaboration,
  type SelectionRange,
} from '../../../web/lib/yjs-collaboration';
import { createComponentLogger } from '../../../web/lib/observability/logger';

import type {
  EditorPane,
  WorkbenchCollaborationStatus,
} from './types'
import {
  resolveCollabDocumentName,
  resolveCollabPersistenceName,
} from '../../../web/lib/collaboration/collab-channel'
import { resolveCollabSyncLed } from '../../../web/lib/collaboration/collab-sync-state'
import { listPendingEmergencyUpdates } from '../../../web/lib/collaboration/collab-emergency-buffer';

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
  hasToken: boolean
  projectId: string
  /** Git branch name or head SHA — Block 2A.2 channel isolation */
  branchId?: string
}

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
  branchId = 'main',
}: UseWorkbenchRealtimeCollaborationParams) {
  const [currentUser, setCurrentUser] = useState<DecodedWorkbenchUser | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [collabRole, setCollabRole] = useState<'write' | 'spectator'>('write')

  useEffect(() => {
    setCurrentUser(hasToken ? decodeWorkbenchUser() : null)
  }, [hasToken])

  const collaborationEnabled = Boolean(hasToken && currentUser?.id && projectId && projectId !== 'default')
  const documentName = collaborationEnabled
    ? resolveCollabDocumentName({
        projectId,
        branchId: branchId || 'main',
        scope: 'workbench',
      })
    : 'disabled'
  const persistenceName = collaborationEnabled
    ? resolveCollabPersistenceName({
        projectId,
        branchId: branchId || 'main',
        scope: 'workbench',
      })
    : 'disabled'

  useEffect(() => {
    if (!collaborationEnabled || !projectId) return
    let cancelled = false
    void fetch('/api/collaboration/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        branchId: branchId || 'main',
        scope: 'workbench',
        roomWriteCount: 0,
      }),
    })
      .then(async (res) => {
        if (!res.ok || cancelled) return
        const data = (await res.json()) as { role?: 'write' | 'spectator' }
        if (data.role === 'spectator' || data.role === 'write') {
          setCollabRole(data.role)
        }
      })
      .catch((error) => {
        log.warn('collab_join_handshake_failed', { projectId, error })
      })
    return () => {
      cancelled = true
    }
  }, [branchId, collaborationEnabled, projectId])

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
    persistenceName,
    userId: currentUser?.id ?? 'anonymous',
    userName: currentUser?.name ?? 'Guest',
    userColor: currentUser?.color,
  })

  useEffect(() => {
    if (!collaborationEnabled) {
      setIsConnecting(false)
      disconnect()
      return
    }

    setIsConnecting(true)
    void connect()
      .catch((connectError) => {
        log.warn('Workbench collaboration connection failed', {
          projectId,
          branchId,
          documentName,
          error: connectError,
        })
      })
      .finally(() => {
        setIsConnecting(false)
      })

    return () => {
      setIsConnecting(false)
      disconnect()
    }
  }, [branchId, collaborationEnabled, connect, disconnect, documentName, projectId])

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

  const syncLed = useMemo(() => {
    return resolveCollabSyncLed({
      collaborationEnabled,
      isConnected,
      isSynced,
      isPersistenceSynced,
      isConnecting,
      errorMessage: error?.message,
      pendingEmergencyUpdates: collaborationEnabled
        ? listPendingEmergencyUpdates(documentName).length
        : 0,
    })
  }, [
    collaborationEnabled,
    documentName,
    error?.message,
    isConnected,
    isConnecting,
    isPersistenceSynced,
    isSynced,
  ])

  const collaborationStatus = useMemo<WorkbenchCollaborationStatus>(() => {
    const peerCount = editorPeers.length
    const liveCursorCount = editorPeers.filter((peer) => peer.cursor).length
    const roleSuffix = collabRole === 'spectator' ? ' · Spectating' : ''

    if (!collaborationEnabled) {
      const detail = !hasToken
        ? 'Sign in to sync cursors and presence.'
        : currentUser?.id
          ? 'Open a real project to activate the shared session.'
          : 'Collaboration identity is unavailable right now.'

      return {
        state: 'disabled',
        tone: 'neutral',
        label: syncLed.label,
        detail,
        peerCount,
        liveCursorCount,
      }
    }

    const stateMap = {
      local_only: 'disabled',
      buffering: 'reconnecting',
      syncing: isConnecting ? 'connecting' : 'syncing',
      synced: 'live',
      error: 'error',
    } as const

    return {
      state: stateMap[syncLed.state],
      tone: syncLed.tone,
      label: `${syncLed.label}${roleSuffix}`,
      detail:
        peerCount > 0
          ? `${syncLed.detail} · ${peerCount} peer${peerCount === 1 ? '' : 's'}${liveCursorCount > 0 ? ` · ${liveCursorCount} cursors` : ''}`
          : syncLed.detail,
      peerCount,
      liveCursorCount,
      errorMessage: syncLed.state === 'error' ? syncLed.detail : undefined,
    }
  }, [
    collaborationEnabled,
    collabRole,
    currentUser?.id,
    editorPeers,
    hasToken,
    isConnecting,
    syncLed,
  ])

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
    collaborationNativeBindingEnabled: Boolean(
      collaborationEnabled && isConnected && isSynced && session && collabRole === 'write',
    ),
    collaborationError: error,
    collaborationStatus,
    collaborationSyncLed: syncLed,
    collaborationRole: collabRole,
    collaborationReadOnly: collabRole === 'spectator',
    collaborationDocumentName: documentName,
    editorPeers,
    broadcastCursor,
    broadcastSelection,
  }
}

export default useWorkbenchRealtimeCollaboration;
