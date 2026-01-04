/**
 * Aethel Engine - Collaboration Hook
 * 
 * Hook React para integração com serviço de colaboração em tempo real.
 * Provê estado reativo e métodos para edição colaborativa.
 */

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  CollaborationService,
  CollaborationUser,
  CollaborationOptions,
  DocumentChange,
  TextOperation,
  getCollaborationService,
} from '../collaboration/collaboration-service';

// ============================================================================
// Types
// ============================================================================

export interface UseCollaborationOptions extends Omit<CollaborationOptions, 'autoConnect'> {
  autoConnect?: boolean;
  onTextChange?: (fileId: string, changes: DocumentChange[]) => void;
  onUsersChange?: (users: CollaborationUser[]) => void;
  onCursorChange?: (userId: string, cursor: any) => void;
  onSelectionChange?: (userId: string, selection: any) => void;
  onError?: (error: Error) => void;
}

export interface UseCollaborationReturn {
  // Connection
  isConnected: boolean;
  isSynced: boolean;
  connect: () => void;
  disconnect: () => void;
  
  // Users
  users: CollaborationUser[];
  localUser: CollaborationUser;
  userCount: number;
  
  // Document Operations
  getText: (fileId: string) => string;
  insert: (fileId: string, position: number, text: string) => void;
  delete: (fileId: string, position: number, length: number) => void;
  replace: (fileId: string, position: number, length: number, text: string) => void;
  setContent: (fileId: string, content: string) => void;
  applyDelta: (fileId: string, delta: TextOperation[]) => void;
  
  // Cursor & Selection
  setCursor: (file: string, line: number, column: number) => void;
  setSelection: (
    file: string,
    startLine: number,
    startColumn: number,
    endLine: number,
    endColumn: number
  ) => void;
  clearSelection: () => void;
  remoteCursors: Map<string, { cursor: any; user: CollaborationUser }>;
  remoteSelections: Map<string, { selection: any; user: CollaborationUser }>;
  
  // Undo/Redo
  undo: (fileId: string) => void;
  redo: (fileId: string) => void;
  canUndo: (fileId: string) => boolean;
  canRedo: (fileId: string) => boolean;
  
  // Comments
  addComment: (fileId: string, line: number, text: string, parentId?: string) => string;
  resolveComment: (fileId: string, commentId: string) => void;
  getComments: (fileId: string) => any[];
  
  // Snapshots
  createSnapshot: (name: string) => Uint8Array;
  restoreSnapshot: (snapshot: Uint8Array) => void;
  
  // Service instance
  service: CollaborationService | null;
}

// ============================================================================
// Hook
// ============================================================================

export function useCollaboration(options: UseCollaborationOptions): UseCollaborationReturn {
  const {
    serverUrl,
    roomId,
    documentId,
    userId,
    userName,
    userColor,
    persistenceEnabled,
    autoConnect = true,
    onTextChange,
    onUsersChange,
    onCursorChange,
    onSelectionChange,
    onError,
  } = options;
  
  const serviceRef = useRef<CollaborationService | null>(null);
  
  const [isConnected, setIsConnected] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [users, setUsers] = useState<CollaborationUser[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Map<string, { cursor: any; user: CollaborationUser }>>(new Map());
  const [remoteSelections, setRemoteSelections] = useState<Map<string, { selection: any; user: CollaborationUser }>>(new Map());
  
  // ==========================================================================
  // Initialize Service
  // ==========================================================================
  
  useEffect(() => {
    const service = getCollaborationService({
      serverUrl,
      roomId,
      documentId,
      userId,
      userName,
      userColor,
      persistenceEnabled,
      autoConnect,
    });
    
    serviceRef.current = service;
    
    // Connection events
    const handleConnected = () => {
      setIsConnected(true);
    };
    
    const handleDisconnected = () => {
      setIsConnected(false);
      setIsSynced(false);
    };
    
    const handleSync = (synced: boolean) => {
      setIsSynced(synced);
    };
    
    // User events
    const handleAwarenessChange = ({ users }: { users: CollaborationUser[] }) => {
      setUsers(users);
      onUsersChange?.(users);
      
      // Update remote cursors and selections
      const newCursors = new Map<string, { cursor: any; user: CollaborationUser }>();
      const newSelections = new Map<string, { selection: any; user: CollaborationUser }>();
      
      users.forEach(user => {
        if (user.id !== userId) {
          if (user.cursor) {
            newCursors.set(user.id, { cursor: user.cursor, user });
            onCursorChange?.(user.id, user.cursor);
          }
          if (user.selection) {
            newSelections.set(user.id, { selection: user.selection, user });
            onSelectionChange?.(user.id, user.selection);
          }
        }
      });
      
      setRemoteCursors(newCursors);
      setRemoteSelections(newSelections);
    };
    
    // Text change events
    const handleTextChange = (data: { fileId: string; changes: DocumentChange[] }) => {
      onTextChange?.(data.fileId, data.changes);
    };
    
    // Subscribe to events
    service.on('connected', handleConnected);
    service.on('disconnected', handleDisconnected);
    service.on('sync', handleSync);
    service.on('awarenessChange', handleAwarenessChange);
    service.on('textChange', handleTextChange);
    
    // Initial state
    setIsConnected(service.isConnected());
    setUsers(service.getUsers());
    
    // Cleanup
    return () => {
      service.off('connected', handleConnected);
      service.off('disconnected', handleDisconnected);
      service.off('sync', handleSync);
      service.off('awarenessChange', handleAwarenessChange);
      service.off('textChange', handleTextChange);
    };
  }, [
    serverUrl,
    roomId,
    documentId,
    userId,
    userName,
    userColor,
    persistenceEnabled,
    autoConnect,
    onTextChange,
    onUsersChange,
    onCursorChange,
    onSelectionChange,
  ]);
  
  // ==========================================================================
  // Connection Methods
  // ==========================================================================
  
  const connect = useCallback(() => {
    serviceRef.current?.connect();
  }, []);
  
  const disconnect = useCallback(() => {
    serviceRef.current?.disconnect();
  }, []);
  
  // ==========================================================================
  // Document Operations
  // ==========================================================================
  
  const getText = useCallback((fileId: string): string => {
    return serviceRef.current?.getTextContent(fileId) || '';
  }, []);
  
  const insert = useCallback((fileId: string, position: number, text: string) => {
    serviceRef.current?.insert(fileId, position, text);
  }, []);
  
  const deleteText = useCallback((fileId: string, position: number, length: number) => {
    serviceRef.current?.delete(fileId, position, length);
  }, []);
  
  const replace = useCallback((fileId: string, position: number, length: number, text: string) => {
    serviceRef.current?.replace(fileId, position, length, text);
  }, []);
  
  const setContent = useCallback((fileId: string, content: string) => {
    serviceRef.current?.setContent(fileId, content);
  }, []);
  
  const applyDelta = useCallback((fileId: string, delta: TextOperation[]) => {
    serviceRef.current?.applyDelta(fileId, delta);
  }, []);
  
  // ==========================================================================
  // Cursor & Selection
  // ==========================================================================
  
  const setCursor = useCallback((file: string, line: number, column: number) => {
    serviceRef.current?.setCursor(file, line, column);
  }, []);
  
  const setSelection = useCallback((
    file: string,
    startLine: number,
    startColumn: number,
    endLine: number,
    endColumn: number
  ) => {
    serviceRef.current?.setSelection(file, startLine, startColumn, endLine, endColumn);
  }, []);
  
  const clearSelection = useCallback(() => {
    serviceRef.current?.clearSelection();
  }, []);
  
  // ==========================================================================
  // Undo/Redo
  // ==========================================================================
  
  const undo = useCallback((fileId: string) => {
    serviceRef.current?.undo(fileId);
  }, []);
  
  const redo = useCallback((fileId: string) => {
    serviceRef.current?.redo(fileId);
  }, []);
  
  const canUndo = useCallback((fileId: string): boolean => {
    return serviceRef.current?.canUndo(fileId) || false;
  }, []);
  
  const canRedo = useCallback((fileId: string): boolean => {
    return serviceRef.current?.canRedo(fileId) || false;
  }, []);
  
  // ==========================================================================
  // Comments
  // ==========================================================================
  
  const addComment = useCallback((
    fileId: string,
    line: number,
    text: string,
    parentId?: string
  ): string => {
    return serviceRef.current?.addComment(fileId, line, text, parentId) || '';
  }, []);
  
  const resolveComment = useCallback((fileId: string, commentId: string) => {
    serviceRef.current?.resolveComment(fileId, commentId);
  }, []);
  
  const getComments = useCallback((fileId: string): any[] => {
    return serviceRef.current?.getFileComments(fileId) || [];
  }, []);
  
  // ==========================================================================
  // Snapshots
  // ==========================================================================
  
  const createSnapshot = useCallback((name: string): Uint8Array => {
    return serviceRef.current?.createSnapshot(name) || new Uint8Array();
  }, []);
  
  const restoreSnapshot = useCallback((snapshot: Uint8Array) => {
    serviceRef.current?.restoreSnapshot(snapshot);
  }, []);
  
  // ==========================================================================
  // Computed Values
  // ==========================================================================
  
  const localUser = useMemo((): CollaborationUser => {
    return serviceRef.current?.getLocalUser() || {
      id: userId,
      name: userName,
      color: userColor || '#89b4fa',
      lastActive: Date.now(),
    };
  }, [userId, userName, userColor]);
  
  const userCount = useMemo(() => users.length, [users]);
  
  // ==========================================================================
  // Return
  // ==========================================================================
  
  return {
    // Connection
    isConnected,
    isSynced,
    connect,
    disconnect,
    
    // Users
    users,
    localUser,
    userCount,
    
    // Document Operations
    getText,
    insert,
    delete: deleteText,
    replace,
    setContent,
    applyDelta,
    
    // Cursor & Selection
    setCursor,
    setSelection,
    clearSelection,
    remoteCursors,
    remoteSelections,
    
    // Undo/Redo
    undo,
    redo,
    canUndo,
    canRedo,
    
    // Comments
    addComment,
    resolveComment,
    getComments,
    
    // Snapshots
    createSnapshot,
    restoreSnapshot,
    
    // Service instance
    service: serviceRef.current,
  };
}

export default useCollaboration;
