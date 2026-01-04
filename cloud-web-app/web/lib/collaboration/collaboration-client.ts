/**
 * Aethel Real-Time Collaboration System
 * 
 * Sistema completo de colaboração em tempo real com CRDT,
 * awareness, cursores e chat integrado.
 */

import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

export interface CollaborationUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  color: string;
  cursor?: CursorPosition;
  selection?: SelectionRange;
  lastActivity: number;
  permissions: CollaborationPermission[];
}

export interface CursorPosition {
  line: number;
  column: number;
  fileUri: string;
}

export interface SelectionRange {
  start: { line: number; column: number };
  end: { line: number; column: number };
  fileUri: string;
}

export type CollaborationPermission = 'read' | 'write' | 'admin';

export interface DocumentOperation {
  id: string;
  type: 'insert' | 'delete' | 'replace';
  fileUri: string;
  position: { line: number; column: number };
  text?: string;
  length?: number;
  userId: string;
  timestamp: number;
  version: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  text: string;
  timestamp: number;
  replyTo?: string;
  reactions: Record<string, string[]>;
}

export interface CollaborationSession {
  id: string;
  name: string;
  host: string;
  users: CollaborationUser[];
  createdAt: number;
  settings: SessionSettings;
}

export interface SessionSettings {
  maxUsers: number;
  allowAnonymous: boolean;
  requireApproval: boolean;
  readOnlyMode: boolean;
  chatEnabled: boolean;
  voiceEnabled: boolean;
}

export interface WebSocketMessage {
  type: string;
  payload: any;
  sessionId: string;
  userId: string;
  timestamp: number;
}

// ============================================================================
// CRDT OPERATIONS
// ============================================================================

interface CRDTCharacter {
  id: string;
  value: string;
  visible: boolean;
  position: number[];
  userId: string;
  timestamp: number;
}

export class CRDTDocument {
  private characters: CRDTCharacter[] = [];
  private siteId: string;
  private clock: number = 0;
  
  constructor(siteId: string) {
    this.siteId = siteId;
  }
  
  generatePosition(index: number): number[] {
    const prevPos = index > 0 ? this.characters[index - 1]?.position || [0] : [0];
    const nextPos = this.characters[index]?.position || [prevPos[0] + 2];
    
    // Generate position between prev and next
    const newPos: number[] = [];
    let i = 0;
    
    while (i < prevPos.length || i < nextPos.length) {
      const p = prevPos[i] || 0;
      const n = nextPos[i] || p + 2;
      
      if (n - p > 1) {
        newPos.push(Math.floor((p + n) / 2));
        break;
      } else {
        newPos.push(p);
        i++;
      }
    }
    
    if (newPos.length === 0) {
      newPos.push(Math.floor((prevPos[prevPos.length - 1] || 0 + nextPos[0] || 2) / 2));
    }
    
    return newPos;
  }
  
  localInsert(index: number, char: string): CRDTCharacter {
    const position = this.generatePosition(index);
    const id = `${this.siteId}:${++this.clock}`;
    
    const character: CRDTCharacter = {
      id,
      value: char,
      visible: true,
      position,
      userId: this.siteId,
      timestamp: Date.now(),
    };
    
    this.characters.splice(index, 0, character);
    return character;
  }
  
  localDelete(index: number): CRDTCharacter | null {
    if (index >= this.characters.length) return null;
    
    const char = this.characters[index];
    char.visible = false;
    return char;
  }
  
  remoteInsert(char: CRDTCharacter): void {
    const index = this.findInsertIndex(char.position);
    this.characters.splice(index, 0, char);
  }
  
  remoteDelete(charId: string): void {
    const char = this.characters.find(c => c.id === charId);
    if (char) {
      char.visible = false;
    }
  }
  
  private findInsertIndex(position: number[]): number {
    for (let i = 0; i < this.characters.length; i++) {
      if (this.comparePositions(position, this.characters[i].position) < 0) {
        return i;
      }
    }
    return this.characters.length;
  }
  
  private comparePositions(a: number[], b: number[]): number {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const av = a[i] || 0;
      const bv = b[i] || 0;
      if (av !== bv) return av - bv;
    }
    return 0;
  }
  
  toString(): string {
    return this.characters
      .filter(c => c.visible)
      .map(c => c.value)
      .join('');
  }
  
  getVersion(): number {
    return this.clock;
  }
}

// ============================================================================
// COLLABORATION CLIENT
// ============================================================================

export class CollaborationClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private userId: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private pendingOperations: DocumentOperation[] = [];
  private documents: Map<string, CRDTDocument> = new Map();
  private users: Map<string, CollaborationUser> = new Map();
  private chatMessages: ChatMessage[] = [];
  
  constructor(userId: string) {
    super();
    this.userId = userId;
  }
  
  // ==========================================================================
  // CONNECTION
  // ==========================================================================
  
  async connect(serverUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(serverUrl);
        
        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          this.emit('connected');
          this.flushPendingOperations();
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          this.handleMessage(JSON.parse(event.data));
        };
        
        this.ws.onerror = (error) => {
          this.emit('error', error);
          reject(error);
        };
        
        this.ws.onclose = () => {
          this.emit('disconnected');
          this.attemptReconnect(serverUrl);
        };
        
      } catch (error) {
        reject(error);
      }
    });
  }
  
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.sessionId = null;
  }
  
  private attemptReconnect(serverUrl: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('reconnectFailed');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    this.emit('reconnecting', { attempt: this.reconnectAttempts, delay });
    
    setTimeout(() => {
      this.connect(serverUrl).catch(() => {});
    }, delay);
  }
  
  // ==========================================================================
  // SESSION
  // ==========================================================================
  
  async createSession(name: string, settings: Partial<SessionSettings> = {}): Promise<string> {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    this.send({
      type: 'session:create',
      payload: { name, settings },
      sessionId,
      userId: this.userId,
      timestamp: Date.now(),
    });
    
    this.sessionId = sessionId;
    return sessionId;
  }
  
  async joinSession(sessionId: string, user: Partial<CollaborationUser> = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Join session timeout'));
      }, 10000);
      
      this.once('session:joined', () => {
        clearTimeout(timeout);
        resolve();
      });
      
      this.send({
        type: 'session:join',
        payload: { user },
        sessionId,
        userId: this.userId,
        timestamp: Date.now(),
      });
      
      this.sessionId = sessionId;
    });
  }
  
  async leaveSession(): Promise<void> {
    if (!this.sessionId) return;
    
    this.send({
      type: 'session:leave',
      payload: {},
      sessionId: this.sessionId,
      userId: this.userId,
      timestamp: Date.now(),
    });
    
    this.sessionId = null;
    this.users.clear();
    this.documents.clear();
    this.chatMessages = [];
  }
  
  // ==========================================================================
  // DOCUMENT OPERATIONS
  // ==========================================================================
  
  openDocument(fileUri: string): void {
    if (!this.documents.has(fileUri)) {
      this.documents.set(fileUri, new CRDTDocument(this.userId));
    }
    
    this.send({
      type: 'document:open',
      payload: { fileUri },
      sessionId: this.sessionId!,
      userId: this.userId,
      timestamp: Date.now(),
    });
  }
  
  closeDocument(fileUri: string): void {
    this.send({
      type: 'document:close',
      payload: { fileUri },
      sessionId: this.sessionId!,
      userId: this.userId,
      timestamp: Date.now(),
    });
  }
  
  insert(fileUri: string, position: { line: number; column: number }, text: string): void {
    const doc = this.documents.get(fileUri);
    if (!doc) return;
    
    const index = this.positionToIndex(fileUri, position);
    
    // Insert each character
    for (let i = 0; i < text.length; i++) {
      const char = doc.localInsert(index + i, text[i]);
      
      this.send({
        type: 'document:insert',
        payload: { fileUri, char },
        sessionId: this.sessionId!,
        userId: this.userId,
        timestamp: Date.now(),
      });
    }
    
    this.emit('localChange', { fileUri, type: 'insert', position, text });
  }
  
  delete(fileUri: string, position: { line: number; column: number }, length: number): void {
    const doc = this.documents.get(fileUri);
    if (!doc) return;
    
    const index = this.positionToIndex(fileUri, position);
    
    for (let i = 0; i < length; i++) {
      const char = doc.localDelete(index);
      if (char) {
        this.send({
          type: 'document:delete',
          payload: { fileUri, charId: char.id },
          sessionId: this.sessionId!,
          userId: this.userId,
          timestamp: Date.now(),
        });
      }
    }
    
    this.emit('localChange', { fileUri, type: 'delete', position, length });
  }
  
  private positionToIndex(fileUri: string, position: { line: number; column: number }): number {
    const doc = this.documents.get(fileUri);
    if (!doc) return 0;
    
    const content = doc.toString();
    const lines = content.split('\n');
    
    let index = 0;
    for (let i = 0; i < position.line; i++) {
      index += (lines[i]?.length || 0) + 1;
    }
    index += position.column;
    
    return index;
  }
  
  // ==========================================================================
  // AWARENESS
  // ==========================================================================
  
  updateCursor(cursor: CursorPosition): void {
    this.send({
      type: 'awareness:cursor',
      payload: { cursor },
      sessionId: this.sessionId!,
      userId: this.userId,
      timestamp: Date.now(),
    });
  }
  
  updateSelection(selection: SelectionRange | null): void {
    this.send({
      type: 'awareness:selection',
      payload: { selection },
      sessionId: this.sessionId!,
      userId: this.userId,
      timestamp: Date.now(),
    });
  }
  
  getUsers(): CollaborationUser[] {
    return Array.from(this.users.values());
  }
  
  // ==========================================================================
  // CHAT
  // ==========================================================================
  
  sendMessage(text: string, replyTo?: string): void {
    const message: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      userId: this.userId,
      text,
      timestamp: Date.now(),
      replyTo,
      reactions: {},
    };
    
    this.send({
      type: 'chat:message',
      payload: { message },
      sessionId: this.sessionId!,
      userId: this.userId,
      timestamp: Date.now(),
    });
    
    this.chatMessages.push(message);
    this.emit('chat:message', message);
  }
  
  addReaction(messageId: string, emoji: string): void {
    this.send({
      type: 'chat:reaction',
      payload: { messageId, emoji },
      sessionId: this.sessionId!,
      userId: this.userId,
      timestamp: Date.now(),
    });
  }
  
  getChatMessages(): ChatMessage[] {
    return [...this.chatMessages];
  }
  
  // ==========================================================================
  // MESSAGE HANDLING
  // ==========================================================================
  
  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'session:joined':
        this.handleSessionJoined(message.payload);
        break;
      case 'session:userJoined':
        this.handleUserJoined(message.payload);
        break;
      case 'session:userLeft':
        this.handleUserLeft(message.payload);
        break;
      case 'document:insert':
        this.handleRemoteInsert(message.payload);
        break;
      case 'document:delete':
        this.handleRemoteDelete(message.payload);
        break;
      case 'document:sync':
        this.handleDocumentSync(message.payload);
        break;
      case 'awareness:cursor':
        this.handleRemoteCursor(message.payload, message.userId);
        break;
      case 'awareness:selection':
        this.handleRemoteSelection(message.payload, message.userId);
        break;
      case 'chat:message':
        this.handleChatMessage(message.payload);
        break;
      case 'chat:reaction':
        this.handleChatReaction(message.payload);
        break;
      default:
        this.emit('message', message);
    }
  }
  
  private handleSessionJoined(payload: any): void {
    // Load existing users
    for (const user of payload.users || []) {
      this.users.set(user.id, user);
    }
    
    // Load chat history
    this.chatMessages = payload.chatHistory || [];
    
    this.emit('session:joined', payload);
  }
  
  private handleUserJoined(payload: { user: CollaborationUser }): void {
    this.users.set(payload.user.id, payload.user);
    this.emit('user:joined', payload.user);
  }
  
  private handleUserLeft(payload: { userId: string }): void {
    const user = this.users.get(payload.userId);
    this.users.delete(payload.userId);
    this.emit('user:left', user);
  }
  
  private handleRemoteInsert(payload: { fileUri: string; char: CRDTCharacter }): void {
    const doc = this.documents.get(payload.fileUri);
    if (doc) {
      doc.remoteInsert(payload.char);
      this.emit('remoteChange', {
        fileUri: payload.fileUri,
        type: 'insert',
        char: payload.char,
        content: doc.toString(),
      });
    }
  }
  
  private handleRemoteDelete(payload: { fileUri: string; charId: string }): void {
    const doc = this.documents.get(payload.fileUri);
    if (doc) {
      doc.remoteDelete(payload.charId);
      this.emit('remoteChange', {
        fileUri: payload.fileUri,
        type: 'delete',
        charId: payload.charId,
        content: doc.toString(),
      });
    }
  }
  
  private handleDocumentSync(payload: { fileUri: string; characters: CRDTCharacter[] }): void {
    const doc = new CRDTDocument(this.userId);
    for (const char of payload.characters) {
      doc.remoteInsert(char);
    }
    this.documents.set(payload.fileUri, doc);
    this.emit('document:synced', { fileUri: payload.fileUri, content: doc.toString() });
  }
  
  private handleRemoteCursor(payload: { cursor: CursorPosition }, userId: string): void {
    const user = this.users.get(userId);
    if (user) {
      user.cursor = payload.cursor;
      user.lastActivity = Date.now();
      this.emit('cursor:updated', { userId, cursor: payload.cursor });
    }
  }
  
  private handleRemoteSelection(payload: { selection: SelectionRange | null }, userId: string): void {
    const user = this.users.get(userId);
    if (user) {
      user.selection = payload.selection || undefined;
      this.emit('selection:updated', { userId, selection: payload.selection });
    }
  }
  
  private handleChatMessage(payload: { message: ChatMessage }): void {
    this.chatMessages.push(payload.message);
    this.emit('chat:message', payload.message);
  }
  
  private handleChatReaction(payload: { messageId: string; emoji: string; userId: string }): void {
    const message = this.chatMessages.find(m => m.id === payload.messageId);
    if (message) {
      if (!message.reactions[payload.emoji]) {
        message.reactions[payload.emoji] = [];
      }
      message.reactions[payload.emoji].push(payload.userId);
      this.emit('chat:reaction', payload);
    }
  }
  
  // ==========================================================================
  // HELPERS
  // ==========================================================================
  
  private send(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.pendingOperations.push(message as any);
    }
  }
  
  private flushPendingOperations(): void {
    while (this.pendingOperations.length > 0) {
      const op = this.pendingOperations.shift()!;
      this.send(op as any);
    }
  }
  
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
  
  getSessionId(): string | null {
    return this.sessionId;
  }
}

// ============================================================================
// USER COLORS
// ============================================================================

const USER_COLORS = [
  '#f38ba8', // Red
  '#fab387', // Peach
  '#f9e2af', // Yellow
  '#a6e3a1', // Green
  '#94e2d5', // Teal
  '#89b4fa', // Blue
  '#cba6f7', // Mauve
  '#f5c2e7', // Pink
];

export function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash;
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

// ============================================================================
// SINGLETON
// ============================================================================

let collaborationClient: CollaborationClient | null = null;

export function getCollaborationClient(userId: string): CollaborationClient {
  if (!collaborationClient) {
    collaborationClient = new CollaborationClient(userId);
  }
  return collaborationClient;
}

export default CollaborationClient;
