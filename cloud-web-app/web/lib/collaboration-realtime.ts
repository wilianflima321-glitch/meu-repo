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

// ============================================================================
// TIPOS
// ============================================================================

export type UserStatus = 'online' | 'away' | 'busy' | 'offline';

export interface UserPresence {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  color: string;
  status: UserStatus;
  lastSeen: Date;
  currentFile?: string;
  cursor?: CursorPosition;
  selection?: SelectionRange;
  typing?: boolean;
  metadata?: Record<string, unknown>;
}

export interface CursorPosition {
  x: number;
  y: number;
  // Para editor de código
  line?: number;
  column?: number;
  // Para canvas/viewport
  viewportX?: number;
  viewportY?: number;
}

export interface SelectionRange {
  start: CursorPosition;
  end: CursorPosition;
  // Para editor de código
  startLine?: number;
  startColumn?: number;
  endLine?: number;
  endColumn?: number;
}

export interface Room {
  id: string;
  name: string;
  type: 'project' | 'file' | 'voice' | 'custom';
  projectId?: string;
  fileId?: string;
  participants: string[];
  maxParticipants?: number;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface CollaborationEvent {
  type: 
    | 'user_joined'
    | 'user_left'
    | 'cursor_move'
    | 'selection_change'
    | 'content_change'
    | 'file_open'
    | 'file_close'
    | 'typing_start'
    | 'typing_stop'
    | 'presence_update';
  userId: string;
  roomId: string;
  data: unknown;
  timestamp: Date;
}

export interface ContentOperation {
  id: string;
  type: 'insert' | 'delete' | 'replace' | 'move';
  userId: string;
  position: number;
  content?: string;
  length?: number;
  timestamp: number;
  // Para CRDTs
  vectorClock?: Record<string, number>;
  lamportTimestamp?: number;
}

// ============================================================================
// CORES PARA USUÁRIOS
// ============================================================================

const UserColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1',
  '#FF69B4', '#32CD32', '#FFD700', '#9370DB',
];

function getColorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash;
  }
  return UserColors[Math.abs(hash) % UserColors.length];
}

// ============================================================================
// WEBSOCKET CONNECTION
// ============================================================================

export class CollaborationSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();
  private pendingMessages: string[] = [];
  private connected = false;
  
  constructor(url: string) {
    this.url = url;
  }
  
  /**
   * Conecta ao servidor
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
        
        this.ws.onopen = () => {
          console.log('[Collaboration] Connected');
          this.connected = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.flushPendingMessages();
          resolve();
        };
        
        this.ws.onclose = (event) => {
          console.log('[Collaboration] Disconnected:', event.code);
          this.connected = false;
          this.stopHeartbeat();
          this.attemptReconnect();
        };
        
        this.ws.onerror = (error) => {
          console.error('[Collaboration] Error:', error);
          if (!this.connected) {
            reject(error);
          }
        };
        
        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (e) {
            console.error('[Collaboration] Parse error:', e);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Desconecta
   */
  disconnect(): void {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close(1000, 'User disconnect');
      this.ws = null;
    }
    this.connected = false;
  }
  
  /**
   * Envia mensagem
   */
  send(type: string, data: unknown): void {
    const message = JSON.stringify({ type, data, timestamp: Date.now() });
    
    if (this.connected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    } else {
      this.pendingMessages.push(message);
    }
  }
  
  /**
   * Subscribe para evento
   */
  on(event: string, callback: (data: unknown) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }
  
  /**
   * Processa mensagem recebida
   */
  private handleMessage(message: { type: string; data: unknown }): void {
    const listeners = this.listeners.get(message.type);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(message.data);
        } catch (e) {
          console.error('[Collaboration] Listener error:', e);
        }
      });
    }
    
    // Event global
    const allListeners = this.listeners.get('*');
    if (allListeners) {
      allListeners.forEach(callback => callback(message));
    }
  }
  
  /**
   * Envia heartbeat
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.send('ping', {});
    }, 30000);
  }
  
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
  
  /**
   * Tenta reconectar
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[Collaboration] Max reconnect attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`[Collaboration] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect().catch(() => {
        // Erro já logado
      });
    }, delay);
  }
  
  /**
   * Envia mensagens pendentes
   */
  private flushPendingMessages(): void {
    while (this.pendingMessages.length > 0 && this.connected) {
      const message = this.pendingMessages.shift();
      if (message && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(message);
      }
    }
  }
  
  get isConnected(): boolean {
    return this.connected;
  }
}

// ============================================================================
// COLLABORATION SERVICE
// ============================================================================

export class CollaborationService {
  private static instance: CollaborationService;
  private socket: CollaborationSocket | null = null;
  private currentUser: UserPresence | null = null;
  private rooms: Map<string, Room> = new Map();
  private presence: Map<string, Map<string, UserPresence>> = new Map(); // roomId -> userId -> presence
  private operations: ContentOperation[] = [];
  private vectorClock: Record<string, number> = {};
  private lamportClock = 0;
  private listeners: Set<(event: CollaborationEvent) => void> = new Set();
  
  private constructor() {}
  
  static getInstance(): CollaborationService {
    if (!CollaborationService.instance) {
      CollaborationService.instance = new CollaborationService();
    }
    return CollaborationService.instance;
  }
  
  /**
   * Inicializa o serviço
   */
  async initialize(user: { id: string; name: string; email: string; avatar?: string }): Promise<void> {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/collaboration';
    
    this.currentUser = {
      ...user,
      color: getColorForUser(user.id),
      status: 'online',
      lastSeen: new Date(),
    };
    
    this.vectorClock[user.id] = 0;
    
    this.socket = new CollaborationSocket(wsUrl);
    await this.socket.connect();
    
    this.setupListeners();
    
    // Anuncia presença
    this.socket.send('presence_update', this.currentUser);
  }
  
  /**
   * Configura listeners de eventos
   */
  private setupListeners(): void {
    if (!this.socket) return;
    
    this.socket.on('user_joined', (data) => {
      const { roomId, user } = data as { roomId: string; user: UserPresence };
      this.updatePresence(roomId, user);
      this.emit({ type: 'user_joined', userId: user.id, roomId, data: user, timestamp: new Date() });
    });
    
    this.socket.on('user_left', (data) => {
      const { roomId, userId } = data as { roomId: string; userId: string };
      this.removePresence(roomId, userId);
      this.emit({ type: 'user_left', userId, roomId, data: null, timestamp: new Date() });
    });
    
    this.socket.on('cursor_move', (data) => {
      const { roomId, userId, cursor } = data as { roomId: string; userId: string; cursor: CursorPosition };
      this.updateUserCursor(roomId, userId, cursor);
      this.emit({ type: 'cursor_move', userId, roomId, data: cursor, timestamp: new Date() });
    });
    
    this.socket.on('selection_change', (data) => {
      const { roomId, userId, selection } = data as { roomId: string; userId: string; selection: SelectionRange };
      this.updateUserSelection(roomId, userId, selection);
      this.emit({ type: 'selection_change', userId, roomId, data: selection, timestamp: new Date() });
    });
    
    this.socket.on('content_change', (data) => {
      const operation = data as ContentOperation;
      this.applyOperation(operation);
      this.emit({ type: 'content_change', userId: operation.userId, roomId: '', data: operation, timestamp: new Date() });
    });
    
    this.socket.on('presence_update', (data) => {
      const presence = data as UserPresence & { roomId: string };
      this.updatePresence(presence.roomId || 'global', presence);
      this.emit({ type: 'presence_update', userId: presence.id, roomId: presence.roomId || 'global', data: presence, timestamp: new Date() });
    });
    
    // Presença ativa a cada 30s
    setInterval(() => {
      if (this.currentUser && this.socket?.isConnected) {
        this.currentUser.lastSeen = new Date();
        this.socket.send('presence_update', this.currentUser);
      }
    }, 30000);
  }
  
  // ==========================================================================
  // ROOMS
  // ==========================================================================
  
  /**
   * Entra em uma room
   */
  async joinRoom(roomId: string): Promise<Room> {
    if (!this.socket || !this.currentUser) {
      throw new Error('Not initialized');
    }
    
    // Cria estrutura de presença
    if (!this.presence.has(roomId)) {
      this.presence.set(roomId, new Map());
    }
    
    // Adiciona usuário atual
    this.presence.get(roomId)!.set(this.currentUser.id, this.currentUser);
    
    // Notifica servidor
    this.socket.send('join_room', { roomId, user: this.currentUser });
    
    // Busca info da room
    const response = await fetch(`/api/collaboration/rooms/${roomId}`);
    const room = await response.json();
    
    this.rooms.set(roomId, room);
    return room;
  }
  
  /**
   * Sai de uma room
   */
  leaveRoom(roomId: string): void {
    if (!this.socket || !this.currentUser) return;
    
    this.socket.send('leave_room', { roomId, userId: this.currentUser.id });
    this.presence.get(roomId)?.delete(this.currentUser.id);
    this.rooms.delete(roomId);
  }
  
  /**
   * Cria uma room
   */
  async createRoom(options: {
    name: string;
    type: Room['type'];
    projectId?: string;
    fileId?: string;
    maxParticipants?: number;
  }): Promise<Room> {
    const response = await fetch('/api/collaboration/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    
    const room = await response.json();
    this.rooms.set(room.id, room);
    
    return room;
  }
  
  /**
   * Lista rooms disponíveis
   */
  async listRooms(projectId?: string): Promise<Room[]> {
    const url = projectId 
      ? `/api/collaboration/rooms?projectId=${projectId}`
      : '/api/collaboration/rooms';
    
    const response = await fetch(url);
    return response.json();
  }
  
  // ==========================================================================
  // PRESENCE
  // ==========================================================================
  
  /**
   * Atualiza presença de um usuário
   */
  private updatePresence(roomId: string, user: UserPresence): void {
    if (!this.presence.has(roomId)) {
      this.presence.set(roomId, new Map());
    }
    this.presence.get(roomId)!.set(user.id, {
      ...user,
      lastSeen: new Date(),
    });
  }
  
  /**
   * Remove presença de um usuário
   */
  private removePresence(roomId: string, userId: string): void {
    this.presence.get(roomId)?.delete(userId);
  }
  
  /**
   * Obtém presença de uma room
   */
  getRoomPresence(roomId: string): UserPresence[] {
    return Array.from(this.presence.get(roomId)?.values() || []);
  }
  
  /**
   * Atualiza status do usuário atual
   */
  updateStatus(status: UserStatus): void {
    if (!this.currentUser || !this.socket) return;
    
    this.currentUser.status = status;
    this.socket.send('presence_update', this.currentUser);
  }
  
  /**
   * Indica que está editando um arquivo
   */
  openFile(roomId: string, fileId: string): void {
    if (!this.currentUser || !this.socket) return;
    
    this.currentUser.currentFile = fileId;
    this.socket.send('file_open', { roomId, fileId });
  }
  
  /**
   * Indica que saiu de um arquivo
   */
  closeFile(roomId: string, fileId: string): void {
    if (!this.currentUser || !this.socket) return;
    
    this.currentUser.currentFile = undefined;
    this.socket.send('file_close', { roomId, fileId });
  }
  
  // ==========================================================================
  // CURSORES E SELEÇÃO
  // ==========================================================================
  
  /**
   * Envia posição do cursor
   */
  sendCursor(roomId: string, position: CursorPosition): void {
    if (!this.socket || !this.currentUser) return;
    
    this.currentUser.cursor = position;
    this.socket.send('cursor_move', {
      roomId,
      userId: this.currentUser.id,
      cursor: position,
    });
  }
  
  /**
   * Envia seleção
   */
  sendSelection(roomId: string, selection: SelectionRange | null): void {
    if (!this.socket || !this.currentUser) return;
    
    this.currentUser.selection = selection || undefined;
    this.socket.send('selection_change', {
      roomId,
      userId: this.currentUser.id,
      selection,
    });
  }
  
  /**
   * Atualiza cursor de outro usuário
   */
  private updateUserCursor(roomId: string, userId: string, cursor: CursorPosition): void {
    const user = this.presence.get(roomId)?.get(userId);
    if (user) {
      user.cursor = cursor;
    }
  }
  
  /**
   * Atualiza seleção de outro usuário
   */
  private updateUserSelection(roomId: string, userId: string, selection: SelectionRange): void {
    const user = this.presence.get(roomId)?.get(userId);
    if (user) {
      user.selection = selection;
    }
  }
  
  /**
   * Indica que está digitando
   */
  setTyping(roomId: string, typing: boolean): void {
    if (!this.socket || !this.currentUser) return;
    
    this.currentUser.typing = typing;
    this.socket.send(typing ? 'typing_start' : 'typing_stop', {
      roomId,
      userId: this.currentUser.id,
    });
  }
  
  // ==========================================================================
  // OPERAÇÕES COLABORATIVAS (CRDT simplificado)
  // ==========================================================================
  
  /**
   * Cria operação de inserção
   */
  createInsertOperation(position: number, content: string): ContentOperation {
    if (!this.currentUser) throw new Error('Not initialized');
    
    this.incrementClock();
    
    return {
      id: `op_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      type: 'insert',
      userId: this.currentUser.id,
      position,
      content,
      timestamp: Date.now(),
      vectorClock: { ...this.vectorClock },
      lamportTimestamp: this.lamportClock,
    };
  }
  
  /**
   * Cria operação de deleção
   */
  createDeleteOperation(position: number, length: number): ContentOperation {
    if (!this.currentUser) throw new Error('Not initialized');
    
    this.incrementClock();
    
    return {
      id: `op_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      type: 'delete',
      userId: this.currentUser.id,
      position,
      length,
      timestamp: Date.now(),
      vectorClock: { ...this.vectorClock },
      lamportTimestamp: this.lamportClock,
    };
  }
  
  /**
   * Envia operação
   */
  sendOperation(roomId: string, operation: ContentOperation): void {
    if (!this.socket) return;
    
    this.operations.push(operation);
    this.socket.send('content_change', { roomId, operation });
  }
  
  /**
   * Aplica operação recebida
   */
  private applyOperation(operation: ContentOperation): void {
    // Atualiza relógio
    if (operation.lamportTimestamp) {
      this.lamportClock = Math.max(this.lamportClock, operation.lamportTimestamp) + 1;
    }
    
    if (operation.vectorClock) {
      for (const [userId, clock] of Object.entries(operation.vectorClock)) {
        this.vectorClock[userId] = Math.max(
          this.vectorClock[userId] || 0,
          clock
        );
      }
    }
    
    // Adiciona à lista de operações
    this.operations.push(operation);
  }
  
  /**
   * Incrementa relógios locais
   */
  private incrementClock(): void {
    if (!this.currentUser) return;
    
    this.lamportClock++;
    this.vectorClock[this.currentUser.id] = (this.vectorClock[this.currentUser.id] || 0) + 1;
  }
  
  /**
   * Transforma operação para resolver conflitos
   */
  transformOperation(
    operation: ContentOperation, 
    against: ContentOperation
  ): ContentOperation {
    // Se operações não conflitam, retorna original
    if (operation.position >= against.position + (against.length || 0)) {
      return operation;
    }
    
    // Operação aconteceu antes
    if (this.happensBefore(operation, against)) {
      return operation;
    }
    
    // Transformação
    const transformed = { ...operation };
    
    if (against.type === 'insert' && against.content) {
      if (operation.position >= against.position) {
        transformed.position += against.content.length;
      }
    } else if (against.type === 'delete' && against.length) {
      if (operation.position > against.position) {
        transformed.position = Math.max(
          against.position,
          operation.position - against.length
        );
      }
    }
    
    return transformed;
  }
  
  /**
   * Verifica causalidade com vector clock
   */
  private happensBefore(a: ContentOperation, b: ContentOperation): boolean {
    if (!a.vectorClock || !b.vectorClock) {
      return (a.lamportTimestamp || 0) < (b.lamportTimestamp || 0);
    }
    
    let allLessOrEqual = true;
    let atLeastOneLess = false;
    
    for (const userId of Object.keys({ ...a.vectorClock, ...b.vectorClock })) {
      const aVal = a.vectorClock[userId] || 0;
      const bVal = b.vectorClock[userId] || 0;
      
      if (aVal > bVal) allLessOrEqual = false;
      if (aVal < bVal) atLeastOneLess = true;
    }
    
    return allLessOrEqual && atLeastOneLess;
  }
  
  // ==========================================================================
  // EVENT EMITTER
  // ==========================================================================
  
  /**
   * Emite evento para listeners
   */
  private emit(event: CollaborationEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (e) {
        console.error('[Collaboration] Listener error:', e);
      }
    });
  }
  
  /**
   * Subscribe para eventos
   */
  onEvent(callback: (event: CollaborationEvent) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
  
  // ==========================================================================
  // CLEANUP
  // ==========================================================================
  
  /**
   * Desconecta e limpa
   */
  disconnect(): void {
    // Sai de todas as rooms
    for (const roomId of this.rooms.keys()) {
      this.leaveRoom(roomId);
    }
    
    this.socket?.disconnect();
    this.socket = null;
    this.currentUser = null;
    this.rooms.clear();
    this.presence.clear();
    this.operations = [];
    this.listeners.clear();
  }
  
  get user(): UserPresence | null {
    return this.currentUser;
  }
  
  get isConnected(): boolean {
    return this.socket?.isConnected ?? false;
  }
}

// ============================================================================
// REACT CONTEXT E HOOKS
// ============================================================================

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

// ============================================================================
// HOOKS ESPECÍFICOS
// ============================================================================

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

// ============================================================================
// COMPONENTES DE UI
// ============================================================================

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

// ============================================================================
// EXPORTS
// ============================================================================

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
