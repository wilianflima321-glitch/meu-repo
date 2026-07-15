'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { CollaborationSession } from './yjs-collaboration';
import type {
  CursorPosition,
  SelectionRange,
  UseCollaborationOptions,
  UseCollaborationResult as BaseUseCollaborationResult,
  UserInfo,
} from './yjs-collaboration-contracts';

export type UseCollaborationResult = BaseUseCollaborationResult<CollaborationSession>;

export function useYjsCollaboration(options: UseCollaborationOptions): UseCollaborationResult {
  const [session, setSession] = useState<CollaborationSession | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [isPersistenceSynced, setIsPersistenceSynced] = useState(false);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const sessionRef = useRef<CollaborationSession | null>(null);

  useEffect(() => {
    const nextSession = new CollaborationSession({
      documentName: options.documentName,
      serverUrl: options.serverUrl,
      persistenceEnabled: options.persistenceEnabled,
      persistenceName: options.persistenceName,
      user: {
        id: options.userId,
        name: options.userName,
        color: options.userColor,
      },
      onSync: () => setIsSynced(true),
      onPersistenceSync: () => setIsPersistenceSynced(true),
      onStatusChange: (status) => {
        setIsConnected(status === 'connected');
      },
      onAwarenessChange: (userMap) => {
        setUsers(Array.from(userMap.values()));
      },
    });

    sessionRef.current = nextSession;
    setSession(nextSession);

    return () => {
      sessionRef.current?.destroy();
      sessionRef.current = null;
      setSession(null);
      setIsPersistenceSynced(false);
    };
  }, [options.documentName, options.persistenceEnabled, options.persistenceName, options.serverUrl, options.userId, options.userName, options.userColor]);

  const connect = useCallback(async () => {
    try {
      setError(null);
      await sessionRef.current?.connect();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  const disconnect = useCallback(() => {
    sessionRef.current?.disconnect();
    setIsConnected(false);
    setIsSynced(false);
  }, []);

  const updateCursor = useCallback((position: CursorPosition) => {
    sessionRef.current?.updateCursor(position);
  }, []);

  const updateSelection = useCallback((selection: SelectionRange | null) => {
    sessionRef.current?.updateSelection(selection);
  }, []);

  return {
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
  };
}
