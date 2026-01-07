/**
 * Collaboration Manager
 * 
 * Central manager for real-time collaboration features including:
 * - Document synchronization via CRDT
 * - Cursor and selection sharing
 * - Presence (who's online, where they are)
 * - Session management (create, join, leave)
 * 
 * Dependencies:
 * - yjs: CRDT implementation
 * - y-websocket: WebSocket provider for Yjs
 * - y-monaco: Monaco editor binding (optional, with fallback)
 */

import { EventEmitter } from 'events';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import * as monaco from 'monaco-editor';

// Dynamic import for y-monaco (optional dependency)
let MonacoBinding: typeof import('y-monaco').MonacoBinding | null = null;

// Try to load y-monaco if available
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const yMonaco = require('y-monaco');
  MonacoBinding = yMonaco.MonacoBinding;
  console.log('[Collaboration] y-monaco loaded successfully');
} catch {
  console.log('[Collaboration] y-monaco not available, using fallback sync');
}

// Types
export interface Collaborator {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  color: string;
  cursor?: {
    line: number;
    column: number;
  };
  selection?: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
  activeFile?: string;
  lastSeen: number;
  isOnline: boolean;
}

export interface CollaborationSession {
  id: string;
  name: string;
  projectId: string;
  createdAt: string;
  createdBy: string;
  collaborators: Collaborator[];
  settings: SessionSettings;
}

export interface SessionSettings {
  allowAnonymous: boolean;
  maxCollaborators: number;
  autoFollow: boolean;
  showCursors: boolean;
  showSelections: boolean;
  chatEnabled: boolean;
  voiceEnabled: boolean;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: number;
  type: 'text' | 'system' | 'code';
  codeSnippet?: {
    language: string;
    code: string;
    file?: string;
    line?: number;
  };
}

export interface CollaborationEvents {
  connected: () => void;
  disconnected: () => void;
  sessionJoined: (session: CollaborationSession) => void;
  sessionLeft: () => void;
  collaboratorJoined: (collaborator: Collaborator) => void;
  collaboratorLeft: (collaborator: Collaborator) => void;
  collaboratorUpdated: (collaborator: Collaborator) => void;
  cursorMoved: (userId: string, cursor: { line: number; column: number }) => void;
  selectionChanged: (userId: string, selection: { startLine: number; startColumn: number; endLine: number; endColumn: number } | null) => void;
  chatMessage: (message: ChatMessage) => void;
  documentSynced: (uri: string) => void;
  error: (error: Error) => void;
}

// Color palette for collaborators
const COLLABORATOR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8B500', '#00CED1', '#FF69B4', '#32CD32', '#FFD700',
];

// Type for Monaco binding (simplified until y-monaco is installed)
interface MonacoBindingLike {
  destroy: () => void;
}

/**
 * Collaboration Manager - handles all real-time collaboration
 */
export class CollaborationManager extends EventEmitter {
  private wsUrl: string;
  private userId: string;
  private userName: string;
  private userColor: string;
  
  private ydoc: Y.Doc | null = null;
  private wsProvider: WebsocketProvider | null = null;
  private monacoBindings = new Map<string, MonacoBindingLike>();
  
  private currentSession: CollaborationSession | null = null;
  private collaborators = new Map<string, Collaborator>();
  private chatHistory: ChatMessage[] = [];
  
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  constructor(options: {
    wsUrl?: string;
    userId: string;
    userName: string;
    userEmail?: string;
    userAvatar?: string;
  }) {
    super();
    this.wsUrl = options.wsUrl || 'ws://localhost:3001/collaboration';
    this.userId = options.userId;
    this.userName = options.userName;
    this.userColor = this.getColorForUser(options.userId);
  }

  /**
   * Get consistent color for a user
   */
  private getColorForUser(userId: string): string {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash = hash & hash;
    }
    return COLLABORATOR_COLORS[Math.abs(hash) % COLLABORATOR_COLORS.length];
  }

  /**
   * Create a new collaboration session
   */
  async createSession(projectId: string, name: string, settings?: Partial<SessionSettings>): Promise<CollaborationSession> {
    const sessionId = this.generateSessionId();
    
    const session: CollaborationSession = {
      id: sessionId,
      name,
      projectId,
      createdAt: new Date().toISOString(),
      createdBy: this.userId,
      collaborators: [],
      settings: {
        allowAnonymous: false,
        maxCollaborators: 10,
        autoFollow: false,
        showCursors: true,
        showSelections: true,
        chatEnabled: true,
        voiceEnabled: false,
        ...settings,
      },
    };

    await this.joinSession(session);
    return session;
  }

  /**
   * Join an existing collaboration session
   */
  async joinSession(session: CollaborationSession): Promise<void> {
    // Leave current session if any
    if (this.currentSession) {
      await this.leaveSession();
    }

    // Initialize Yjs document
    this.ydoc = new Y.Doc();

    // Connect to WebSocket provider
    this.wsProvider = new WebsocketProvider(
      this.wsUrl,
      session.id,
      this.ydoc,
      { connect: true }
    );

    // Set up awareness (presence)
    const awareness = this.wsProvider.awareness;
    
    // Set local user state
    awareness.setLocalState({
      user: {
        id: this.userId,
        name: this.userName,
        color: this.userColor,
      },
      cursor: null,
      selection: null,
      activeFile: null,
    });

    // Listen for awareness changes
    awareness.on('change', () => {
      this.handleAwarenessChange(awareness);
    });

    // Connection event handlers
    this.wsProvider.on('status', ({ status }: { status: string }) => {
      if (status === 'connected') {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('connected');
      } else if (status === 'disconnected') {
        this.isConnected = false;
        this.emit('disconnected');
        this.attemptReconnect();
      }
    });

    // Set current session
    this.currentSession = session;

    // Add self as collaborator
    this.collaborators.set(this.userId, {
      id: this.userId,
      name: this.userName,
      color: this.userColor,
      lastSeen: Date.now(),
      isOnline: true,
    });

    this.emit('sessionJoined', session);
  }

  /**
   * Leave the current session
   */
  async leaveSession(): Promise<void> {
    if (!this.currentSession) return;

    // Clean up Monaco bindings
    for (const binding of this.monacoBindings.values()) {
      binding.destroy();
    }
    this.monacoBindings.clear();

    // Disconnect WebSocket
    if (this.wsProvider) {
      this.wsProvider.disconnect();
      this.wsProvider.destroy();
      this.wsProvider = null;
    }

    // Destroy Yjs document
    if (this.ydoc) {
      this.ydoc.destroy();
      this.ydoc = null;
    }

    this.collaborators.clear();
    this.chatHistory = [];
    
    const session = this.currentSession;
    this.currentSession = null;
    
    this.emit('sessionLeft');
  }

  /**
   * Bind a Monaco editor to the collaboration
   */
  bindMonacoEditor(editor: monaco.editor.IStandaloneCodeEditor, uri: string): void {
    if (!this.ydoc || !this.wsProvider) {
      throw new Error('Not connected to a session');
    }

    // Get or create Y.Text for this file
    const yText = this.ydoc.getText(uri);

    // Use real MonacoBinding if y-monaco is available
    if (MonacoBinding) {
      const binding = new MonacoBinding(
        yText,
        editor.getModel()!,
        new Set([editor]),
        this.wsProvider.awareness
      );

      this.monacoBindings.set(uri, {
        destroy: () => binding.destroy()
      });

      console.log(`[Collaboration] Monaco binding created for ${uri} (y-monaco)`);
    } else {
      // Fallback: Manual sync without y-monaco
      const disposables: monaco.IDisposable[] = [];

      // Sync initial content
      const model = editor.getModel();
      if (model && yText.toString() === '') {
        yText.insert(0, model.getValue());
      }

      // Listen for local changes
      const localChangeHandler = model?.onDidChangeContent((e) => {
        this.ydoc?.transact(() => {
          e.changes.forEach(change => {
            const offset = model.getOffsetAt({
              lineNumber: change.range.startLineNumber,
              column: change.range.startColumn
            });
            
            if (change.rangeLength > 0) {
              yText.delete(offset, change.rangeLength);
            }
            if (change.text) {
              yText.insert(offset, change.text);
            }
          });
        }, this);
      });

      if (localChangeHandler) {
        disposables.push(localChangeHandler);
      }

      // Listen for remote changes
      const remoteChangeHandler = () => {
        const currentContent = yText.toString();
        if (model && model.getValue() !== currentContent) {
          model.setValue(currentContent);
        }
      };
      yText.observe(remoteChangeHandler);

      this.monacoBindings.set(uri, {
        destroy: () => {
          disposables.forEach(d => d.dispose());
          yText.unobserve(remoteChangeHandler);
        }
      });

      console.log(`[Collaboration] Monaco binding created for ${uri} (fallback sync)`);
    }

    // Track cursor/selection changes
    editor.onDidChangeCursorPosition((e) => {
      this.updateCursor(uri, e.position.lineNumber, e.position.column);
    });

    editor.onDidChangeCursorSelection((e) => {
      this.updateSelection(uri, e.selection);
    });

    this.emit('documentSynced', uri);
  }

  /**
   * Unbind a Monaco editor
   */
  unbindMonacoEditor(uri: string): void {
    const binding = this.monacoBindings.get(uri);
    if (binding) {
      binding.destroy();
      this.monacoBindings.delete(uri);
    }
  }

  /**
   * Update cursor position
   */
  updateCursor(file: string, line: number, column: number): void {
    if (!this.wsProvider) return;

    const awareness = this.wsProvider.awareness;
    const state = awareness.getLocalState() || {};
    
    awareness.setLocalState({
      ...state,
      cursor: { line, column },
      activeFile: file,
    });
  }

  /**
   * Update selection
   */
  updateSelection(file: string, selection: monaco.Selection | null): void {
    if (!this.wsProvider) return;

    const awareness = this.wsProvider.awareness;
    const state = awareness.getLocalState() || {};
    
    awareness.setLocalState({
      ...state,
      selection: selection ? {
        startLine: selection.startLineNumber,
        startColumn: selection.startColumn,
        endLine: selection.endLineNumber,
        endColumn: selection.endColumn,
      } : null,
      activeFile: file,
    });
  }

  /**
   * Send a chat message
   */
  sendChatMessage(message: string, codeSnippet?: ChatMessage['codeSnippet']): void {
    if (!this.ydoc) return;

    const chatArray = this.ydoc.getArray<ChatMessage>('chat');
    
    const chatMessage: ChatMessage = {
      id: this.generateMessageId(),
      userId: this.userId,
      userName: this.userName,
      message,
      timestamp: Date.now(),
      type: codeSnippet ? 'code' : 'text',
      codeSnippet,
    };

    chatArray.push([chatMessage]);
    this.chatHistory.push(chatMessage);
    this.emit('chatMessage', chatMessage);
  }

  /**
   * Get chat history
   */
  getChatHistory(): ChatMessage[] {
    return [...this.chatHistory];
  }

  /**
   * Get all collaborators
   */
  getCollaborators(): Collaborator[] {
    return Array.from(this.collaborators.values());
  }

  /**
   * Get a specific collaborator
   */
  getCollaborator(userId: string): Collaborator | undefined {
    return this.collaborators.get(userId);
  }

  /**
   * Follow a collaborator (sync cursor/viewport)
   */
  followCollaborator(userId: string): void {
    const collaborator = this.collaborators.get(userId);
    if (!collaborator || !collaborator.cursor || !collaborator.activeFile) {
      return;
    }

    // Emit event to let UI handle the follow
    this.emit('collaboratorUpdated', collaborator);
  }

  /**
   * Handle awareness changes
   */
  private handleAwarenessChange(awareness: WebsocketProvider['awareness']): void {
    const states = awareness.getStates();
    
    const onlineUsers = new Set<string>();

    states.forEach((state: unknown, clientId: number) => {
      const typedState = state as { user?: { id: string; name: string; color: string }; cursor?: { line: number; column: number }; selection?: { startLine: number; startColumn: number; endLine: number; endColumn: number }; activeFile?: string };
      if (!typedState.user) return;

      const userId = typedState.user.id;
      onlineUsers.add(userId);

      const existing = this.collaborators.get(userId);
      const collaborator: Collaborator = {
        id: userId,
        name: typedState.user.name,
        color: typedState.user.color,
        cursor: typedState.cursor,
        selection: typedState.selection,
        activeFile: typedState.activeFile,
        lastSeen: Date.now(),
        isOnline: true,
      };

      if (!existing) {
        // New collaborator joined
        this.collaborators.set(userId, collaborator);
        if (userId !== this.userId) {
          this.emit('collaboratorJoined', collaborator);
        }
      } else {
        // Update existing collaborator
        this.collaborators.set(userId, collaborator);
        
        // Emit cursor/selection events
        if (existing.cursor?.line !== collaborator.cursor?.line || 
            existing.cursor?.column !== collaborator.cursor?.column) {
          this.emit('cursorMoved', userId, collaborator.cursor!);
        }
        
        if (JSON.stringify(existing.selection) !== JSON.stringify(collaborator.selection)) {
          this.emit('selectionChanged', userId, collaborator.selection || null);
        }

        this.emit('collaboratorUpdated', collaborator);
      }
    });

    // Check for collaborators who left
    for (const [userId, collaborator] of this.collaborators) {
      if (!onlineUsers.has(userId)) {
        collaborator.isOnline = false;
        this.emit('collaboratorLeft', collaborator);
      }
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('error', new Error('Max reconnection attempts reached'));
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);

    setTimeout(() => {
      if (!this.isConnected && this.wsProvider) {
        this.wsProvider.connect();
      }
    }, delay);
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current session
   */
  getSession(): CollaborationSession | null {
    return this.currentSession;
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Get local user info
   */
  getLocalUser(): Collaborator {
    return {
      id: this.userId,
      name: this.userName,
      color: this.userColor,
      lastSeen: Date.now(),
      isOnline: true,
    };
  }

  /**
   * Destroy manager
   */
  destroy(): void {
    this.leaveSession();
    this.removeAllListeners();
  }
}

// Singleton instance
let managerInstance: CollaborationManager | null = null;

/**
 * Get or create collaboration manager
 */
export function getCollaborationManager(options?: {
  wsUrl?: string;
  userId: string;
  userName: string;
}): CollaborationManager {
  if (!managerInstance && options) {
    managerInstance = new CollaborationManager(options);
  }
  if (!managerInstance) {
    throw new Error('Collaboration manager not initialized');
  }
  return managerInstance;
}

/**
 * Initialize collaboration manager
 */
export function initializeCollaborationManager(options: {
  wsUrl?: string;
  userId: string;
  userName: string;
}): CollaborationManager {
  if (managerInstance) {
    managerInstance.destroy();
  }
  managerInstance = new CollaborationManager(options);
  return managerInstance;
}

export default CollaborationManager;
