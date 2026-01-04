/**
 * Aethel Engine - Real-time Collaboration Service
 * 
 * Serviço de colaboração em tempo real usando CRDT (Conflict-free Replicated Data Types)
 * para edição colaborativa de código sem conflitos.
 * 
 * Features:
 * - CRDT-based text synchronization (Yjs)
 * - Awareness protocol (cursors, selections, presence)
 * - Document persistence
 * - Room management
 * - User presence tracking
 */

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import { EventEmitter } from 'events';

// ============================================================================
// Types
// ============================================================================

export interface CollaborationUser {
  id: string;
  name: string;
  color: string;
  avatar?: string;
  cursor?: CursorPosition;
  selection?: SelectionRange;
  lastActive: number;
}

export interface CursorPosition {
  line: number;
  column: number;
  file: string;
}

export interface SelectionRange {
  start: { line: number; column: number };
  end: { line: number; column: number };
  file: string;
}

export interface CollaborationRoom {
  id: string;
  name: string;
  documentId: string;
  users: Map<string, CollaborationUser>;
  createdAt: number;
  ownerId: string;
}

export interface DocumentChange {
  type: 'insert' | 'delete' | 'replace';
  position: number;
  text?: string;
  length?: number;
  userId: string;
  timestamp: number;
}

export interface CollaborationOptions {
  serverUrl?: string;
  roomId: string;
  documentId: string;
  userId: string;
  userName: string;
  userColor?: string;
  persistenceEnabled?: boolean;
  autoConnect?: boolean;
}

export interface TextOperation {
  retain?: number;
  insert?: string;
  delete?: number;
  attributes?: Record<string, any>;
}

// ============================================================================
// Color Generator for Users
// ============================================================================

const USER_COLORS = [
  '#f38ba8', // Red
  '#fab387', // Peach
  '#f9e2af', // Yellow
  '#a6e3a1', // Green
  '#94e2d5', // Teal
  '#89dceb', // Sky
  '#89b4fa', // Blue
  '#cba6f7', // Mauve
  '#f5c2e7', // Pink
  '#b4befe', // Lavender
];

function generateUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash |= 0;
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

// ============================================================================
// Collaboration Service
// ============================================================================

export class CollaborationService extends EventEmitter {
  private ydoc: Y.Doc;
  private provider: WebsocketProvider | null = null;
  private persistence: IndexeddbPersistence | null = null;
  private texts: Map<string, Y.YText> = new Map();
  private options: CollaborationOptions;
  private connected: boolean = false;
  private localUser: CollaborationUser;
  private syncTimeout: NodeJS.Timeout | null = null;
  
  constructor(options: CollaborationOptions) {
    super();
    
    this.options = {
      serverUrl: 'ws://localhost:8080',
      persistenceEnabled: true,
      autoConnect: true,
      userColor: generateUserColor(options.userId),
      ...options,
    };
    
    this.ydoc = new Y.Doc();
    
    this.localUser = {
      id: options.userId,
      name: options.userName,
      color: this.options.userColor!,
      lastActive: Date.now(),
    };
    
    this.setupYjsObservers();
    
    if (this.options.persistenceEnabled) {
      this.setupPersistence();
    }
    
    if (this.options.autoConnect) {
      this.connect();
    }
  }
  
  // ==========================================================================
  // Connection Management
  // ==========================================================================
  
  connect(): void {
    if (this.provider) {
      this.disconnect();
    }
    
    this.provider = new WebsocketProvider(
      this.options.serverUrl!,
      this.options.roomId,
      this.ydoc,
      { connect: true }
    );
    
    // Setup awareness
    this.provider.awareness.setLocalStateField('user', {
      id: this.localUser.id,
      name: this.localUser.name,
      color: this.localUser.color,
    });
    
    // Connection events
    this.provider.on('status', (event: { status: string }) => {
      this.connected = event.status === 'connected';
      this.emit('connectionChange', this.connected);
      
      if (this.connected) {
        this.emit('connected');
      } else {
        this.emit('disconnected');
      }
    });
    
    this.provider.on('sync', (synced: boolean) => {
      this.emit('sync', synced);
    });
    
    // Awareness events
    this.provider.awareness.on('change', (changes: any) => {
      this.handleAwarenessChange(changes);
    });
    
    this.emit('connecting');
  }
  
  disconnect(): void {
    if (this.provider) {
      this.provider.disconnect();
      this.provider.destroy();
      this.provider = null;
    }
    
    this.connected = false;
    this.emit('disconnected');
  }
  
  // ==========================================================================
  // Persistence
  // ==========================================================================
  
  private setupPersistence(): void {
    this.persistence = new IndexeddbPersistence(
      `aethel-collab-${this.options.documentId}`,
      this.ydoc
    );
    
    this.persistence.on('synced', () => {
      this.emit('persistenceSynced');
    });
  }
  
  // ==========================================================================
  // Document Operations
  // ==========================================================================
  
  getText(fileId: string): Y.YText {
    if (!this.texts.has(fileId)) {
      const text = this.ydoc.getText(fileId);
      this.texts.set(fileId, text);
      
      // Observe text changes
      text.observe((event: Y.YTextEvent) => {
        this.handleTextChange(fileId, event);
      });
    }
    
    return this.texts.get(fileId)!;
  }
  
  getTextContent(fileId: string): string {
    return this.getText(fileId).toString();
  }
  
  insert(fileId: string, position: number, text: string): void {
    this.getText(fileId).insert(position, text);
    this.updateLastActive();
  }
  
  delete(fileId: string, position: number, length: number): void {
    this.getText(fileId).delete(position, length);
    this.updateLastActive();
  }
  
  replace(fileId: string, position: number, length: number, text: string): void {
    const ytext = this.getText(fileId);
    this.ydoc.transact(() => {
      ytext.delete(position, length);
      ytext.insert(position, text);
    });
    this.updateLastActive();
  }
  
  setContent(fileId: string, content: string): void {
    const ytext = this.getText(fileId);
    this.ydoc.transact(() => {
      ytext.delete(0, ytext.length);
      ytext.insert(0, content);
    });
    this.updateLastActive();
  }
  
  applyDelta(fileId: string, delta: TextOperation[]): void {
    const ytext = this.getText(fileId);
    
    this.ydoc.transact(() => {
      let index = 0;
      
      for (const op of delta) {
        if (op.retain !== undefined) {
          index += op.retain;
        } else if (op.insert !== undefined) {
          ytext.insert(index, op.insert, op.attributes);
          index += op.insert.length;
        } else if (op.delete !== undefined) {
          ytext.delete(index, op.delete);
        }
      }
    });
    
    this.updateLastActive();
  }
  
  // ==========================================================================
  // Cursor & Selection
  // ==========================================================================
  
  setCursor(file: string, line: number, column: number): void {
    if (!this.provider) return;
    
    this.localUser.cursor = { file, line, column };
    
    this.provider.awareness.setLocalStateField('cursor', {
      file,
      line,
      column,
      timestamp: Date.now(),
    });
    
    this.updateLastActive();
  }
  
  setSelection(
    file: string,
    startLine: number,
    startColumn: number,
    endLine: number,
    endColumn: number
  ): void {
    if (!this.provider) return;
    
    this.localUser.selection = {
      file,
      start: { line: startLine, column: startColumn },
      end: { line: endLine, column: endColumn },
    };
    
    this.provider.awareness.setLocalStateField('selection', {
      file,
      start: { line: startLine, column: startColumn },
      end: { line: endLine, column: endColumn },
      timestamp: Date.now(),
    });
    
    this.updateLastActive();
  }
  
  clearSelection(): void {
    if (!this.provider) return;
    
    this.localUser.selection = undefined;
    this.provider.awareness.setLocalStateField('selection', null);
  }
  
  // ==========================================================================
  // User Presence
  // ==========================================================================
  
  getUsers(): CollaborationUser[] {
    if (!this.provider) return [this.localUser];
    
    const users: CollaborationUser[] = [];
    
    this.provider.awareness.getStates().forEach((state: any, clientId: number) => {
      if (state.user) {
        users.push({
          id: state.user.id,
          name: state.user.name,
          color: state.user.color,
          avatar: state.user.avatar,
          cursor: state.cursor,
          selection: state.selection,
          lastActive: state.lastActive || Date.now(),
        });
      }
    });
    
    return users;
  }
  
  getUser(userId: string): CollaborationUser | undefined {
    return this.getUsers().find(u => u.id === userId);
  }
  
  getUserCount(): number {
    return this.provider?.awareness.getStates().size || 1;
  }
  
  setUserStatus(status: 'online' | 'away' | 'busy'): void {
    if (!this.provider) return;
    
    this.provider.awareness.setLocalStateField('status', status);
  }
  
  private updateLastActive(): void {
    if (!this.provider) return;
    
    // Debounce updates
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
    
    this.syncTimeout = setTimeout(() => {
      this.localUser.lastActive = Date.now();
      this.provider?.awareness.setLocalStateField('lastActive', this.localUser.lastActive);
    }, 100);
  }
  
  // ==========================================================================
  // Event Handlers
  // ==========================================================================
  
  private setupYjsObservers(): void {
    this.ydoc.on('update', (update: Uint8Array, origin: any) => {
      this.emit('update', update, origin);
    });
    
    this.ydoc.on('beforeAllTransactions', () => {
      this.emit('beforeTransactions');
    });
    
    this.ydoc.on('afterAllTransactions', () => {
      this.emit('afterTransactions');
    });
  }
  
  private handleTextChange(fileId: string, event: Y.YTextEvent): void {
    const changes: DocumentChange[] = [];
    let position = 0;
    
    event.delta.forEach((op: any) => {
      if (op.retain !== undefined) {
        position += op.retain;
      } else if (op.insert !== undefined) {
        changes.push({
          type: 'insert',
          position,
          text: op.insert,
          userId: this.localUser.id, // Note: in real impl, get from origin
          timestamp: Date.now(),
        });
        position += op.insert.length;
      } else if (op.delete !== undefined) {
        changes.push({
          type: 'delete',
          position,
          length: op.delete,
          userId: this.localUser.id,
          timestamp: Date.now(),
        });
      }
    });
    
    this.emit('textChange', {
      fileId,
      changes,
    });
  }
  
  private handleAwarenessChange(changes: {
    added: number[];
    updated: number[];
    removed: number[];
  }): void {
    const users = this.getUsers();
    
    if (changes.added.length > 0) {
      this.emit('usersJoined', changes.added.map(id => {
        const state = this.provider?.awareness.getStates().get(id);
        return state?.user;
      }).filter(Boolean));
    }
    
    if (changes.removed.length > 0) {
      this.emit('usersLeft', changes.removed);
    }
    
    if (changes.updated.length > 0) {
      this.emit('usersUpdated', users);
    }
    
    this.emit('awarenessChange', { users, changes });
  }
  
  // ==========================================================================
  // Undo/Redo
  // ==========================================================================
  
  private undoManagers: Map<string, Y.UndoManager> = new Map();
  
  getUndoManager(fileId: string): Y.UndoManager {
    if (!this.undoManagers.has(fileId)) {
      const text = this.getText(fileId);
      const undoManager = new Y.UndoManager(text, {
        trackedOrigins: new Set([null, this.localUser.id]),
      });
      this.undoManagers.set(fileId, undoManager);
    }
    
    return this.undoManagers.get(fileId)!;
  }
  
  undo(fileId: string): void {
    this.getUndoManager(fileId).undo();
  }
  
  redo(fileId: string): void {
    this.getUndoManager(fileId).redo();
  }
  
  canUndo(fileId: string): boolean {
    return this.getUndoManager(fileId).canUndo();
  }
  
  canRedo(fileId: string): boolean {
    return this.getUndoManager(fileId).canRedo();
  }
  
  // ==========================================================================
  // Comments & Annotations
  // ==========================================================================
  
  private getComments(fileId: string): Y.YArray<any> {
    return this.ydoc.getArray(`comments:${fileId}`);
  }
  
  addComment(
    fileId: string,
    line: number,
    text: string,
    parentId?: string
  ): string {
    const comments = this.getComments(fileId);
    const id = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    comments.push([{
      id,
      fileId,
      line,
      text,
      userId: this.localUser.id,
      userName: this.localUser.name,
      userColor: this.localUser.color,
      parentId,
      createdAt: Date.now(),
      resolved: false,
    }]);
    
    this.emit('commentAdded', { id, fileId, line, text });
    
    return id;
  }
  
  resolveComment(fileId: string, commentId: string): void {
    const comments = this.getComments(fileId);
    
    for (let i = 0; i < comments.length; i++) {
      const comment = comments.get(i);
      if (comment.id === commentId) {
        const updated = { ...comment, resolved: true, resolvedAt: Date.now() };
        comments.delete(i, 1);
        comments.insert(i, [updated]);
        
        this.emit('commentResolved', { id: commentId, fileId });
        break;
      }
    }
  }
  
  getFileComments(fileId: string): any[] {
    return this.getComments(fileId).toArray();
  }
  
  // ==========================================================================
  // Versioning & History
  // ==========================================================================
  
  createSnapshot(name: string): Uint8Array {
    const snapshot = Y.encodeStateAsUpdate(this.ydoc);
    
    this.emit('snapshotCreated', { name, size: snapshot.byteLength });
    
    return snapshot;
  }
  
  restoreSnapshot(snapshot: Uint8Array): void {
    Y.applyUpdate(this.ydoc, snapshot);
    
    this.emit('snapshotRestored');
  }
  
  getStateVector(): Uint8Array {
    return Y.encodeStateVector(this.ydoc);
  }
  
  // ==========================================================================
  // Utility
  // ==========================================================================
  
  isConnected(): boolean {
    return this.connected;
  }
  
  getDocumentId(): string {
    return this.options.documentId;
  }
  
  getRoomId(): string {
    return this.options.roomId;
  }
  
  getLocalUser(): CollaborationUser {
    return { ...this.localUser };
  }
  
  destroy(): void {
    this.disconnect();
    
    if (this.persistence) {
      this.persistence.destroy();
    }
    
    this.ydoc.destroy();
    this.texts.clear();
    this.undoManagers.clear();
    this.removeAllListeners();
  }
}

// ============================================================================
// Factory
// ============================================================================

let collaborationInstances: Map<string, CollaborationService> = new Map();

export function getCollaborationService(options: CollaborationOptions): CollaborationService {
  const key = `${options.roomId}:${options.documentId}`;
  
  if (!collaborationInstances.has(key)) {
    const service = new CollaborationService(options);
    collaborationInstances.set(key, service);
    
    service.on('destroy', () => {
      collaborationInstances.delete(key);
    });
  }
  
  return collaborationInstances.get(key)!;
}

export function destroyAllCollaborationServices(): void {
  collaborationInstances.forEach(service => service.destroy());
  collaborationInstances.clear();
}

export default CollaborationService;
