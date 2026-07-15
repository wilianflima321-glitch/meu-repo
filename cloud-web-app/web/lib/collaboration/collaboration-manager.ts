// @aethel-heavy-async-boundary IDE/Monaco runtime module; never import from public/dashboard/admin route shells.
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

import { createComponentLogger } from '@/lib/observability/logger'
import { bindCollaborativeMonacoEditor } from './collaboration-monaco-binding';
import type { ChatMessage, CollaborationSession, Collaborator, MonacoBindingLike, SessionSettings } from './collaboration-types';
import { calculateReconnectDelay, createCollaborationMessageId, createCollaborationSessionId, getColorForCollaborator } from './collaboration-utils';

const log = createComponentLogger('collaboration/collaboration-manager')

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
    this.userColor = getColorForCollaborator(options.userId);
  }

  /**
   * Create a new collaboration session
   */
  async createSession(projectId: string, name: string, settings?: Partial<SessionSettings>): Promise<CollaborationSession> {
    const sessionId = createCollaborationSessionId();

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

    const binding = bindCollaborativeMonacoEditor({
      ydoc: this.ydoc,
      wsProvider: this.wsProvider,
      editor,
      uri,
      source: this,
      updateCursor: (file, line, column) => this.updateCursor(file, line, column),
      updateSelection: (file, selection) => this.updateSelection(file, selection),
    });

    this.monacoBindings.set(uri, binding);
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
      id: createCollaborationMessageId(),
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
    const delay = calculateReconnectDelay(this.reconnectAttempts);

    setTimeout(() => {
      if (!this.isConnected && this.wsProvider) {
        this.wsProvider.connect();
      }
    }, delay);
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
