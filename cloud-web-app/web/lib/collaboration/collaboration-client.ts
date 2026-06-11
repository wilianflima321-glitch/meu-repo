/**
 * Aethel Real-Time Collaboration System
 *
 * Canonical collaboration client entrypoint. Contracts, CRDT document logic and
 * user color helpers live in sibling modules to keep this runtime maintainable.
 */

import { EventEmitter } from 'events';
import type {
  CRDTCharacter,
  ChatMessage,
  CollaborationUser,
  CursorPosition,
  SelectionRange,
  SessionSettings,
  WebSocketMessage,
} from './collaboration-contracts';
import { CRDTDocument } from './crdt-document';
import { getUserColor } from './collaboration-user-colors';

export type {
  CRDTCharacter,
  ChatMessage,
  CollaborationPermission,
  CollaborationSession,
  CollaborationUser,
  CursorPosition,
  DocumentOperation,
  SelectionRange,
  SessionSettings,
  WebSocketMessage,
} from './collaboration-contracts';
export { CRDTDocument } from './crdt-document';
export { getUserColor } from './collaboration-user-colors';

export class CollaborationClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private userId: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private pendingOperations: WebSocketMessage[] = [];
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
        this.handleSessionJoined(message.payload as { users?: CollaborationUser[]; chatHistory?: ChatMessage[] });
        break;
      case 'session:userJoined':
        this.handleUserJoined(message.payload as { user: CollaborationUser });
        break;
      case 'session:userLeft':
        this.handleUserLeft(message.payload as { userId: string });
        break;
      case 'document:insert':
        this.handleRemoteInsert(message.payload as { fileUri: string; char: CRDTCharacter });
        break;
      case 'document:delete':
        this.handleRemoteDelete(message.payload as { fileUri: string; charId: string });
        break;
      case 'document:sync':
        this.handleDocumentSync(message.payload as { fileUri: string; characters: CRDTCharacter[] });
        break;
      case 'awareness:cursor':
        this.handleRemoteCursor(message.payload as { cursor: CursorPosition }, message.userId);
        break;
      case 'awareness:selection':
        this.handleRemoteSelection(message.payload as { selection: SelectionRange | null }, message.userId);
        break;
      case 'chat:message':
        this.handleChatMessage(message.payload as { message: ChatMessage });
        break;
      case 'chat:reaction':
        this.handleChatReaction(message.payload as { messageId: string; emoji: string; userId: string });
        break;
      default:
        this.emit('message', message);
    }
  }
  
  private handleSessionJoined(payload: { users?: CollaborationUser[]; chatHistory?: ChatMessage[] }): void {
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
      this.pendingOperations.push(message);
    }
  }
  
  private flushPendingOperations(): void {
    while (this.pendingOperations.length > 0) {
      const op = this.pendingOperations.shift()!;
      this.send(op);
    }
  }
  
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
  
  getSessionId(): string | null {
    return this.sessionId;
  }
}

let collaborationClient: CollaborationClient | null = null;

export function getCollaborationClient(userId: string): CollaborationClient {
  if (!collaborationClient) {
    collaborationClient = new CollaborationClient(userId);
  }
  return collaborationClient;
}

export default CollaborationClient;
