/**
 * Collaboration realtime core runtime (socket + service).
 */

import {
  getColorForUser,
  type CollaborationEvent,
  type ContentOperation,
  type CursorPosition,
  type Room,
  type SelectionRange,
  type UserPresence,
  type UserStatus,
} from './collaboration-realtime.types';

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

// COLLABORATION SERVICE

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
