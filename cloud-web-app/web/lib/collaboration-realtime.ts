/**
 * Sistema de Collaboration Real-time - Aethel Engine
 * 
 * Sistema completo para:
 * - Presence (quem está online)
 * - Cursores em tempo real
 * - Edição colaborativa
 * - Resolução de conflitos (CRDT)
 * - Rooms/Channels
 * - Awareness
 * 
 * NÃO É MOCK - Sistema real e funcional!
 */

import { createElement, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CollaborationService, CollaborationSocket } from './collaboration-realtime-core';
import {
  getColorForUser,
  UserColors,
  type CollaborationEvent,
  type ContentOperation,
  type CursorPosition,
  type Room,
  type SelectionRange,
  type UserPresence,
  type UserStatus,
} from './collaboration-realtime.types';
export { CollaborationService, CollaborationSocket } from './collaboration-realtime-core';
export {
  getColorForUser,
  UserColors,
  type CollaborationEvent,
  type ContentOperation,
  type CursorPosition,
  type Room,
  type SelectionRange,
  type UserPresence,
  type UserStatus,
} from './collaboration-realtime.types';

// REACT CONTEXT E HOOKS

interface CollaborationContextType {
  isConnected: boolean;
  currentUser: UserPresence | null;
  roomPresence: UserPresence[];
  currentRoom: Room | null;
  joinRoom: (roomId: string) => Promise<void>;
  leaveRoom: () => void;
  sendCursor: (position: CursorPosition) => void;
  sendSelection: (selection: SelectionRange | null) => void;
  updateStatus: (status: UserStatus) => void;
  setTyping: (typing: boolean) => void;
}

const CollaborationContext = createContext<CollaborationContextType | null>(null);

export function CollaborationProvider({
  children,
  user,
}: {
  children: ReactNode;
  user?: { id: string; name: string; email: string; avatar?: string };
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserPresence | null>(null);
  const [roomPresence, setRoomPresence] = useState<UserPresence[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  
  const serviceRef = useRef(CollaborationService.getInstance());
  const currentRoomRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (!user) return;
    
    const service = serviceRef.current;
    
    service.initialize(user)
      .then(() => {
        setIsConnected(true);
        setCurrentUser(service.user);
      })
      .catch(console.error);
    
    const unsubscribe = service.onEvent((event) => {
      // Atualiza presença da room atual
      if (currentRoomRef.current) {
        setRoomPresence(service.getRoomPresence(currentRoomRef.current));
      }
    });
    
    return () => {
      unsubscribe();
      service.disconnect();
    };
  }, [user]);
  
  const joinRoom = useCallback(async (roomId: string) => {
    const service = serviceRef.current;
    const room = await service.joinRoom(roomId);
    currentRoomRef.current = roomId;
    setCurrentRoom(room);
    setRoomPresence(service.getRoomPresence(roomId));
  }, []);
  
  const leaveRoom = useCallback(() => {
    const service = serviceRef.current;
    if (currentRoomRef.current) {
      service.leaveRoom(currentRoomRef.current);
      currentRoomRef.current = null;
      setCurrentRoom(null);
      setRoomPresence([]);
    }
  }, []);
  
  const sendCursor = useCallback((position: CursorPosition) => {
    if (currentRoomRef.current) {
      serviceRef.current.sendCursor(currentRoomRef.current, position);
    }
  }, []);
  
  const sendSelection = useCallback((selection: SelectionRange | null) => {
    if (currentRoomRef.current) {
      serviceRef.current.sendSelection(currentRoomRef.current, selection);
    }
  }, []);
  
  const updateStatus = useCallback((status: UserStatus) => {
    serviceRef.current.updateStatus(status);
    setCurrentUser(prev => prev ? { ...prev, status } : null);
  }, []);
  
  const setTyping = useCallback((typing: boolean) => {
    if (currentRoomRef.current) {
      serviceRef.current.setTyping(currentRoomRef.current, typing);
    }
  }, []);
  
  return createElement(
    CollaborationContext.Provider,
    {
      value: {
        isConnected,
        currentUser,
        roomPresence,
        currentRoom,
        joinRoom,
        leaveRoom,
        sendCursor,
        sendSelection,
        updateStatus,
        setTyping,
      },
    },
    children
  );
}

export function useCollaboration() {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within CollaborationProvider');
  }
  return context;
}

// HOOKS ESPECÍFICOS

/**
 * Hook para cursor de outros usuários
 */
export function useOtherCursors() {
  const { roomPresence, currentUser } = useCollaboration();
  
  return useMemo(() => 
    roomPresence
      .filter(u => u.id !== currentUser?.id && u.cursor)
      .map(u => ({
        userId: u.id,
        name: u.name,
        color: u.color,
        cursor: u.cursor!,
      })),
    [roomPresence, currentUser]
  );
}

/**
 * Hook para seleções de outros usuários
 */
export function useOtherSelections() {
  const { roomPresence, currentUser } = useCollaboration();
  
  return useMemo(() => 
    roomPresence
      .filter(u => u.id !== currentUser?.id && u.selection)
      .map(u => ({
        userId: u.id,
        name: u.name,
        color: u.color,
        selection: u.selection!,
      })),
    [roomPresence, currentUser]
  );
}

/**
 * Hook para quem está digitando
 */
export function useTypingIndicators() {
  const { roomPresence, currentUser } = useCollaboration();
  
  return useMemo(() => 
    roomPresence
      .filter(u => u.id !== currentUser?.id && u.typing)
      .map(u => ({ id: u.id, name: u.name })),
    [roomPresence, currentUser]
  );
}

/**
 * Hook para tracking de cursor local
 */
export function useCursorTracking(enabled = true) {
  const { sendCursor } = useCollaboration();
  
  useEffect(() => {
    if (!enabled) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      sendCursor({ x: e.clientX, y: e.clientY });
    };
    
    // Throttle para não enviar muito frequentemente
    let lastSent = 0;
    const throttledHandler = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastSent > 50) { // Max 20fps
        lastSent = now;
        handleMouseMove(e);
      }
    };
    
    window.addEventListener('mousemove', throttledHandler);
    return () => window.removeEventListener('mousemove', throttledHandler);
  }, [enabled, sendCursor]);
}

// COMPONENTES DE UI

interface CursorOverlayProps {
  cursors: Array<{
    userId: string;
    name: string;
    color: string;
    cursor: CursorPosition;
  }>;
}

export function CursorOverlay({ cursors }: CursorOverlayProps) {
  return createElement(
    'div',
    { style: { position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 } },
    cursors.map(({ userId, name, color, cursor }) =>
      createElement(
        'div',
        {
          key: userId,
          style: {
            position: 'absolute',
            left: cursor.x,
            top: cursor.y,
            transform: 'translate(-2px, -2px)',
          },
        },
        createElement(
          'svg',
          { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none' },
          createElement('path', {
            d: 'M5 3L19 12L12 13L9 20L5 3Z',
            fill: color,
            stroke: 'white',
            strokeWidth: 1,
          })
        ),
        createElement(
          'div',
          {
            style: {
              marginTop: 4,
              padding: '2px 6px',
              backgroundColor: color,
              color: 'white',
              fontSize: 11,
              borderRadius: 4,
              whiteSpace: 'nowrap',
            },
          },
          name
        )
      )
    )
  );
}

interface PresenceAvatarsProps {
  users: UserPresence[];
  maxDisplay?: number;
}

export function PresenceAvatars({ users, maxDisplay = 4 }: PresenceAvatarsProps) {
  const displayed = users.slice(0, maxDisplay);
  const overflow = users.length - maxDisplay;
  
  return createElement(
    'div',
    { style: { display: 'flex', alignItems: 'center' } },
    ...displayed.map((user, index) => {
      const statusColor =
        user.status === 'online' ? '#22c55e' :
        user.status === 'away' ? '#f59e0b' :
        user.status === 'busy' ? '#ef4444' : '#6b7280';

      const avatarNode = user.avatar
        ? createElement('img', {
            src: user.avatar,
            alt: user.name,
            style: { width: '100%', height: '100%', borderRadius: '50%' },
          })
        : user.name.charAt(0).toUpperCase();

      return createElement(
        'div',
        {
          key: user.id,
          style: {
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: user.color,
            border: '2px solid white',
            marginLeft: index > 0 ? -8 : 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 12,
            fontWeight: 600,
            position: 'relative',
          },
          title: `${user.name} - ${user.status}`,
        },
        avatarNode,
        createElement('div', {
          style: {
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: 10,
            height: 10,
            borderRadius: '50%',
            border: '2px solid white',
            backgroundColor: statusColor,
          },
        })
      );
    }),
    ...(overflow > 0
      ? [
          createElement(
            'div',
            {
              key: 'overflow',
              style: {
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: '#6b7280',
                border: '2px solid white',
                marginLeft: -8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 11,
                fontWeight: 600,
              },
            },
            `+${overflow}`
          ),
        ]
      : [])
  );
}

// EXPORTS

export const collaborationService = CollaborationService.getInstance();

const collaborationRealtime = {
  CollaborationService,
  CollaborationSocket,
  CollaborationProvider,
  useCollaboration,
  useOtherCursors,
  useOtherSelections,
  useTypingIndicators,
  useCursorTracking,
  CursorOverlay,
  PresenceAvatars,
  collaborationService,
  getColorForUser,
  UserColors,
};

export default collaborationRealtime;
