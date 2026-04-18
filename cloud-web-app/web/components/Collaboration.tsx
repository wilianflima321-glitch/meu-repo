'use client';

/**
 * Collaboration Components - Aethel Engine
 *
 * Componentes para colaboracao em tempo real:
 * - Avatares de presenca
 * - Cursores remotos
 * - Indicador de digitacao
 * - Status de usuario
 */

import { useState, useEffect, createContext, useContext, ReactNode, useRef } from 'react';
import { Users, Circle, MessageCircle, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';

// ============================================================================
// TIPOS
// ============================================================================

interface UserPresence {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  color: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  cursor?: { x: number; y: number };
  currentFile?: string;
  typing?: boolean;
}

interface CollaborationContextType {
  isConnected: boolean;
  roomUsers: UserPresence[];
  currentUser: UserPresence | null;
  joinRoom: (roomId: string) => void;
  leaveRoom: () => void;
  sendCursor: (position: { x: number; y: number }) => void;
  updateStatus: (status: UserPresence['status']) => void;
}

// ============================================================================
// COLORS
// ============================================================================

const USER_COLORS = [
  'var(--aethel-primary)',
  'var(--aethel-secondary)',
  'var(--aethel-accent)',
  'var(--aethel-info)',
  'var(--aethel-success)',
  'var(--aethel-warning)',
  'var(--aethel-error)',
  'var(--aethel-primary-light)',
  'var(--aethel-secondary-light)',
  'var(--aethel-accent-light)',
  'var(--aethel-info-light)',
  'var(--aethel-success-light)',
];

function getColorForUser(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

// ============================================================================
// CONTEXT
// ============================================================================

const CollaborationContext = createContext<CollaborationContextType>({
  isConnected: false,
  roomUsers: [],
  currentUser: null,
  joinRoom: () => {},
  leaveRoom: () => {},
  sendCursor: () => {},
  updateStatus: () => {},
});

export function CollaborationProvider({
  children,
  user
}: {
  children: ReactNode;
  user?: { id: string; name: string; email: string; avatar?: string };
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [roomUsers, setRoomUsers] = useState<UserPresence[]>([]);
  const [currentUser, setCurrentUser] = useState<UserPresence | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const roomIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (user) {
      setCurrentUser({
        ...user,
        color: getColorForUser(user.id),
        status: 'online',
      });
    }
  }, [user]);

  const connect = (roomId: string) => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || `ws://localhost:3001/collaboration`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        ws.send(JSON.stringify({
          type: 'join_room',
          data: { roomId, user: currentUser }
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
        } catch (e) {
          console.error('Failed to parse message:', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setRoomUsers([]);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  const handleMessage = (message: { type: string; data: unknown }) => {
    switch (message.type) {
      case 'room_users':
        setRoomUsers(message.data as UserPresence[]);
        break;
      case 'user_joined':
        setRoomUsers(prev => [...prev, message.data as UserPresence]);
        break;
      case 'user_left':
        const { userId } = message.data as { userId: string };
        setRoomUsers(prev => prev.filter(u => u.id !== userId));
        break;
      case 'cursor_move':
        const cursor = message.data as { userId: string; position: { x: number; y: number } };
        setRoomUsers(prev =>
          prev.map(u => u.id === cursor.userId
            ? { ...u, cursor: cursor.position }
            : u
          )
        );
        break;
      case 'presence_update':
        const presence = message.data as UserPresence;
        setRoomUsers(prev =>
          prev.map(u => u.id === presence.id ? { ...u, ...presence } : u)
        );
        break;
    }
  };

  const joinRoom = (roomId: string) => {
    roomIdRef.current = roomId;
    connect(roomId);
  };

  const leaveRoom = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'leave_room',
        data: { roomId: roomIdRef.current }
      }));
      wsRef.current.close();
      wsRef.current = null;
    }
    roomIdRef.current = null;
    setRoomUsers([]);
    setIsConnected(false);
  };

  const sendCursor = (position: { x: number; y: number }) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'cursor_move',
        data: { position },
      }));
    }
  };

  const updateStatus = (status: UserPresence['status']) => {
    if (currentUser) {
      setCurrentUser({ ...currentUser, status });
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'presence_update',
          data: { status },
        }));
      }
    }
  };

  useEffect(() => {
    return () => {
      leaveRoom();
    };
  }, []);

  return (
    <CollaborationContext.Provider value={{
      isConnected,
      roomUsers,
      currentUser,
      joinRoom,
      leaveRoom,
      sendCursor,
      updateStatus,
    }}>
      {children}
    </CollaborationContext.Provider>
  );
}

export function useCollaboration() {
  return useContext(CollaborationContext);
}

// ============================================================================
// PRESENCE AVATARS
// ============================================================================

interface PresenceAvatarsProps {
  maxDisplay?: number;
  showStatus?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function PresenceAvatars({
  maxDisplay = 4,
  showStatus = true,
  size = 'md'
}: PresenceAvatarsProps) {
  const { roomUsers, currentUser } = useCollaboration();

  // Filtra usuario atual
  const otherUsers = roomUsers.filter(u => u.id !== currentUser?.id);
  const displayed = otherUsers.slice(0, maxDisplay);
  const overflow = otherUsers.length - maxDisplay;

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  const imageSizes = {
    sm: '24px',
    md: '32px',
    lg: '40px',
  };

  const statusColors = {
    online: 'bg-[var(--aethel-success)]',
    away: 'bg-[var(--aethel-warning)]',
    busy: 'bg-[var(--aethel-error)]',
    offline: 'bg-[var(--aethel-text-quaternary)]',
  };

  if (otherUsers.length === 0) {
    return (
      <div className="flex items-center gap-2 text-[var(--aethel-text-tertiary)] text-sm">
        <Users className="w-4 h-4" />
        <span>So voce aqui</span>
      </div>
    );
  }

  return (
    <div className="flex items-center">
      {displayed.map((user, index) => (
        <div
          key={user.id}
          className={`relative rounded-full border-2 border-[var(--aethel-border-primary)] ${sizeClasses[size]}`}
          style={{
            marginLeft: index > 0 ? -8 : 0,
            backgroundColor: user.color,
            zIndex: displayed.length - index,
          }}
          title={`${user.name} - ${user.status}`}
        >
          {user.avatar ? (
            <Image
              src={user.avatar}
              alt={user.name}
              fill
              sizes={imageSizes[size]}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--aethel-text-primary)] font-medium">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}

          {showStatus && (
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--aethel-border-primary)] ${statusColors[user.status]}`}
            />
          )}
        </div>
      ))}

      {overflow > 0 && (
        <div
          className={`rounded-full bg-[var(--aethel-surface-quaternary)] border-2 border-[var(--aethel-border-primary)] flex items-center justify-center text-[var(--aethel-text-primary)] font-medium ${sizeClasses[size]}`}
          style={{ marginLeft: -8 }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CURSOR OVERLAY
// ============================================================================

export function CursorOverlay() {
  const { roomUsers, currentUser } = useCollaboration();

  const cursors = roomUsers
    .filter(u => u.id !== currentUser?.id && u.cursor)
    .map(u => ({
      id: u.id,
      name: u.name,
      color: u.color,
      cursor: u.cursor!,
    }));

  if (cursors.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {cursors.map(({ id, name, color, cursor }) => (
        <div
          key={id}
          className="absolute transition-all duration-75"
          style={{
            left: cursor.x,
            top: cursor.y,
            transform: 'translate(-2px, -2px)',
          }}
        >
          {/* Cursor SVG */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 3L19 12L12 13L9 20L5 3Z"
              fill={color}
              stroke="white"
              strokeWidth="1.5"
            />
          </svg>

          {/* Name label */}
          <div
            className="absolute top-5 left-2 px-2 py-0.5 rounded text-xs text-[var(--aethel-text-primary)] whitespace-nowrap"
            style={{ backgroundColor: color }}
          >
            {name}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// TYPING INDICATOR
// ============================================================================

export function TypingIndicator() {
  const { roomUsers, currentUser } = useCollaboration();

  const typingUsers = roomUsers.filter(u => u.id !== currentUser?.id && u.typing);

  if (typingUsers.length === 0) return null;

  const names = typingUsers.map(u => u.name);
  let text = '';

  if (names.length === 1) {
    text = `${names[0]} esta digitando...`;
  } else if (names.length === 2) {
    text = `${names.join(' e ')} estao digitando...`;
  } else {
    text = `${names.length} pessoas estao digitando...`;
  }

  return (
    <div className="flex items-center gap-2 text-[var(--aethel-text-tertiary)] text-sm">
      <MessageCircle className="w-4 h-4" />
      <span>{text}</span>
      <span className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-[var(--aethel-text-tertiary)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-[var(--aethel-text-tertiary)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-[var(--aethel-text-tertiary)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </span>
    </div>
  );
}

// ============================================================================
// STATUS SELECTOR
// ============================================================================

export function StatusSelector() {
  const { currentUser, updateStatus } = useCollaboration();
  const [isOpen, setIsOpen] = useState(false);

  if (!currentUser) return null;

  const statuses = [
    { value: 'online', label: 'Online', color: 'bg-[var(--aethel-success)]' },
    { value: 'away', label: 'Ausente', color: 'bg-[var(--aethel-warning)]' },
    { value: 'busy', label: 'Ocupado', color: 'bg-[var(--aethel-error)]' },
    { value: 'offline', label: 'Invisivel', color: 'bg-[var(--aethel-text-quaternary)]' },
  ] as const;

  const current = statuses.find(s => s.value === currentUser.status) || statuses[0];

  return (
    <div className="relative">
      <button type="button" aria-label="Alterar status de colaboracao"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-[var(--aethel-surface-tertiary)] rounded-lg hover:bg-[var(--aethel-surface-quaternary)] transition-colors"
      >
        <div className={`w-2.5 h-2.5 rounded-full ${current.color}`} />
        <span className="text-sm text-[var(--aethel-text-primary)]">{current.label}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 right-0 w-40 bg-[var(--aethel-surface-tertiary)] rounded-lg shadow-xl border border-[var(--aethel-border-primary)] overflow-hidden z-50">
          {statuses.map(status => (
            <button type="button" aria-label={`Definir status como ${status.label}`}
              key={status.value}
              onClick={() => {
                updateStatus(status.value);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--aethel-surface-quaternary)] transition-colors ${
 status.value === currentUser.status ? 'bg-[var(--aethel-surface-quaternary)]' : ''
 }`}
            >
              <div className={`w-2.5 h-2.5 rounded-full ${status.color}`} />
              <span className="text-sm text-[var(--aethel-text-primary)]">{status.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// USER LIST PANEL
// ============================================================================

export function UserListPanel() {
  const { roomUsers, currentUser, isConnected } = useCollaboration();

  if (!isConnected) {
    return (
      <div className="p-4 text-[var(--aethel-text-tertiary)] text-sm">
        Nao conectado a sala
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[var(--aethel-text-primary)] flex items-center gap-2">
          <Users className="w-4 h-4" />
          Na Sala ({roomUsers.length})
        </h3>
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[var(--aethel-success)]' : 'bg-[var(--aethel-error)]'}`} />
      </div>

      <div className="space-y-2">
        {roomUsers.map(user => (
          <div
            key={user.id}
            className={`flex items-center gap-3 p-2 rounded-lg ${
 user.id === currentUser?.id ? 'bg-[var(--aethel-surface-tertiary)]' : ''
 }`}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--aethel-text-primary)] font-medium relative"
              style={{ backgroundColor: user.color }}
            >
              {user.avatar ? (
                <Image
                  src={user.avatar}
                  alt={user.name}
                  fill
                  sizes="32px"
                  className="rounded-full object-cover"
                />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--aethel-border-primary)] ${
 user.status === 'online' ? 'bg-[var(--aethel-success)]' :
 user.status === 'away' ? 'bg-[var(--aethel-warning)]' :
 user.status === 'busy' ? 'bg-[var(--aethel-error)]' : 'bg-[var(--aethel-text-quaternary)]'
 }`} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-sm text-[var(--aethel-text-primary)] truncate">
                {user.name}
                {user.id === currentUser?.id && (
                  <span className="text-[var(--aethel-text-tertiary)] ml-1">(voce)</span>
                )}
              </div>
              {user.currentFile && (
                <div className="text-xs text-[var(--aethel-text-tertiary)] truncate flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {user.currentFile}
                </div>
              )}
            </div>

            {user.typing && (
              <MessageCircle className="w-4 h-4 text-[var(--aethel-primary-light)] animate-pulse" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
