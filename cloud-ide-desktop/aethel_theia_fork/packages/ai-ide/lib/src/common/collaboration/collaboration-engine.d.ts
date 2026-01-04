/**
 * COLLABORATION ENGINE - Sistema de Colaboração em Tempo Real
 *
 * Sistema completo para:
 * - Edição colaborativa em tempo real
 * - Presença e cursores
 * - Sincronização de estado
 * - Resolução de conflitos (CRDT)
 * - Chat e comunicação
 * - Controle de permissões
 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
export type UserRole = 'owner' | 'admin' | 'editor' | 'viewer' | 'guest';
export type OperationType = 'insert' | 'delete' | 'retain' | 'replace' | 'move' | 'format';
export interface CollaborationUser {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
    color: string;
    role: UserRole;
    permissions: Permission[];
    presence: UserPresence;
    cursor?: CursorPosition;
    selection?: SelectionRange;
    connectionId?: string;
    lastSeen: number;
}
export interface UserPresence {
    online: boolean;
    status: 'active' | 'idle' | 'away';
    location?: PresenceLocation;
    cursor?: CursorPosition;
    selection?: SelectionRange;
    currentAction?: string;
}
export interface PresenceLocation {
    documentId?: string;
    viewId?: string;
    path?: string;
}
export interface CursorPosition {
    line: number;
    column: number;
    offset?: number;
}
export interface SelectionRange {
    anchor: CursorPosition;
    head: CursorPosition;
}
export type Permission = 'read' | 'write' | 'delete' | 'share' | 'admin' | 'chat' | 'voice' | 'video';
export interface CollaborationSession {
    id: string;
    name: string;
    ownerId: string;
    participants: Map<string, CollaborationUser>;
    documents: Map<string, SharedDocument>;
    settings: SessionSettings;
    state: ConnectionState;
    chat: ChatChannel;
    created: number;
    lastActivity: number;
}
export interface SessionSettings {
    defaultRole: UserRole;
    maxParticipants: number;
    enableChat: boolean;
    enableVoice: boolean;
    enableVideo: boolean;
    persistent: boolean;
    expiresAt?: number;
    requireAuth: boolean;
    allowAnonymous: boolean;
    password?: string;
}
export interface SharedDocument {
    id: string;
    name: string;
    type: DocumentType;
    content: CRDTDocument;
    version: number;
    history: DocumentOperation[];
    editors: Set<string>;
    locks: DocumentLock[];
    comments: DocumentComment[];
    dirty: boolean;
    lastModified: number;
}
export type DocumentType = 'text' | 'code' | 'json' | 'binary' | 'canvas' | 'timeline' | '3d-scene';
export interface DocumentLock {
    id: string;
    userId: string;
    range?: SelectionRange;
    type: 'soft' | 'hard';
    timestamp: number;
    expires?: number;
}
export interface DocumentComment {
    id: string;
    userId: string;
    content: string;
    position: CursorPosition;
    range?: SelectionRange;
    timestamp: number;
    resolved: boolean;
    replies: CommentReply[];
}
export interface CommentReply {
    id: string;
    userId: string;
    content: string;
    timestamp: number;
}
export interface DocumentOperation {
    id: string;
    type: OperationType;
    userId: string;
    timestamp: number;
    position?: number;
    data?: unknown;
    inverse?: DocumentOperation;
    vectorClock: VectorClock;
}
export interface TextOperation extends DocumentOperation {
    type: 'insert' | 'delete' | 'retain';
    position: number;
    text?: string;
    length?: number;
}
export interface FormatOperation extends DocumentOperation {
    type: 'format';
    range: {
        start: number;
        end: number;
    };
    format: Record<string, unknown>;
}
export type VectorClock = Record<string, number>;
export interface CRDTDocument {
    type: 'text' | 'json' | 'list';
    text?: CRDTText;
    json?: CRDTMap;
    list?: CRDTList;
}
export interface CRDTText {
    chars: CRDTChar[];
}
export interface CRDTChar {
    id: CRDTId;
    value: string;
    deleted: boolean;
    format?: Record<string, unknown>;
}
export interface CRDTId {
    site: string;
    clock: number;
}
export interface CRDTMap {
    entries: Map<string, CRDTValue>;
}
export interface CRDTList {
    items: CRDTItem[];
}
export interface CRDTItem {
    id: CRDTId;
    value: CRDTValue;
    deleted: boolean;
}
export type CRDTValue = {
    type: 'string';
    value: string;
} | {
    type: 'number';
    value: number;
} | {
    type: 'boolean';
    value: boolean;
} | {
    type: 'null';
} | {
    type: 'map';
    value: CRDTMap;
} | {
    type: 'list';
    value: CRDTList;
};
export interface ChatChannel {
    id: string;
    name: string;
    type: 'session' | 'document' | 'thread';
    messages: ChatMessage[];
    hasMore: boolean;
    oldestLoaded?: string;
}
export interface ChatMessage {
    id: string;
    userId: string;
    content: string;
    timestamp: number;
    type: 'text' | 'system' | 'file' | 'link';
    attachments?: MessageAttachment[];
    reactions: Map<string, string[]>;
    threadId?: string;
    replyCount?: number;
    edited: boolean;
    editedAt?: number;
}
export interface MessageAttachment {
    id: string;
    type: 'file' | 'image' | 'link';
    name: string;
    url?: string;
    size?: number;
    mimeType?: string;
    thumbnail?: string;
}
export interface AwarenessState {
    users: Map<string, UserAwareness>;
    documentStates: Map<string, DocumentAwareness>;
}
export interface UserAwareness {
    userId: string;
    cursor?: CursorPosition;
    selection?: SelectionRange;
    viewState?: Record<string, unknown>;
    lastUpdate: number;
}
export interface DocumentAwareness {
    documentId: string;
    activeUsers: string[];
    lockedRanges: Array<{
        userId: string;
        range: SelectionRange;
    }>;
}
export interface OperationMessage {
    type: 'operation';
    userId: string;
    documentId: string;
    operation: DocumentOperation;
}
export interface CursorUpdateMessage {
    type: 'cursor';
    userId: string;
    cursor: CursorPosition;
}
export interface SelectionUpdateMessage {
    type: 'selection';
    userId: string;
    selection: SelectionRange;
}
export interface PresenceMessage {
    type: 'presence';
    userId: string;
    presence: UserPresence | string;
}
export declare class CollaborationEngine {
    private sessions;
    private activeSession?;
    private currentUser?;
    private connections;
    private awareness;
    private vectorClock;
    private operationQueue;
    private pendingOperations;
    private listeners;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private heartbeatInterval?;
    private onConnectionStateEmitter;
    private onOperationEmitter;
    private onCursorEmitter;
    private onSelectionEmitter;
    private onPresenceEmitter;
    private onUserJoinedEmitter;
    private onUserLeftEmitter;
    private onChatEmitter;
    readonly onConnectionState: (handler: (value: ConnectionState) => void) => {
        dispose: () => void;
    };
    readonly onOperation: (handler: (value: {
        sessionId: string;
        documentId: string;
        operation: DocumentOperation;
    }) => void) => {
        dispose: () => void;
    };
    readonly onCursor: (handler: (value: {
        sessionId: string;
        userId: string;
        cursor: CursorPosition;
    }) => void) => {
        dispose: () => void;
    };
    readonly onSelection: (handler: (value: {
        sessionId: string;
        userId: string;
        selection: SelectionRange;
    }) => void) => {
        dispose: () => void;
    };
    readonly onPresence: (handler: (value: {
        sessionId: string;
        userId: string;
        presence: UserPresence | string;
    }) => void) => {
        dispose: () => void;
    };
    readonly onUserJoined: (handler: (value: {
        sessionId: string;
        userId: string;
    }) => void) => {
        dispose: () => void;
    };
    readonly onUserLeft: (handler: (value: {
        sessionId: string;
        userId: string;
    }) => void) => {
        dispose: () => void;
    };
    readonly onChat: (handler: (value: {
        sessionId: string;
        userId: string;
        message: string;
        timestamp: number;
    }) => void) => {
        dispose: () => void;
    };
    constructor();
    /**
     * Cria sessão de colaboração
     */
    createSession(name: string, settings?: Partial<SessionSettings>): Promise<CollaborationSession>;
    /**
     * Entra em sessão existente
     */
    joinSession(sessionId: string, inviteCode?: string): Promise<CollaborationSession>;
    /**
     * Sai da sessão
     */
    leaveSession(sessionId?: string): Promise<void>;
    /**
     * Encerra sessão
     */
    endSession(sessionId: string): Promise<void>;
    /**
     * Define usuário atual
     */
    setCurrentUser(user: Omit<CollaborationUser, 'presence'>): void;
    /**
     * Atualiza presença
     */
    updatePresence(presence: Partial<UserPresence>): void;
    /**
     * Remove usuário da sessão
     */
    kickUser(sessionId: string, userId: string): Promise<void>;
    /**
     * Altera papel do usuário
     */
    changeUserRole(sessionId: string, userId: string, role: UserRole): void;
    private getPermissionsForRole;
    /**
     * Compartilha documento
     */
    shareDocument(sessionId: string, documentId: string, name: string, type: DocumentType, content?: string): SharedDocument;
    /**
     * Aplica operação em documento
     */
    applyOperation(sessionId: string, documentId: string, operation: Omit<DocumentOperation, 'id' | 'userId' | 'timestamp' | 'vectorClock'>): void;
    /**
     * Recebe operação remota
     */
    receiveOperation(sessionId: string, documentId: string, operation: DocumentOperation): void;
    private applyOperationToDocument;
    private insertText;
    private deleteText;
    private formatText;
    private transformOperation;
    private isConcurrent;
    private transformAgainst;
    private initializeCRDT;
    /**
     * Obtém texto do CRDT
     */
    getCRDTText(doc: SharedDocument): string;
    /**
     * Adquire lock em range
     */
    acquireLock(sessionId: string, documentId: string, range?: SelectionRange, type?: 'soft' | 'hard'): DocumentLock | null;
    /**
     * Libera lock
     */
    releaseLock(sessionId: string, documentId: string, lockId: string): void;
    private rangesOverlap;
    private positionToOffset;
    /**
     * Adiciona comentário
     */
    addComment(sessionId: string, documentId: string, content: string, position: CursorPosition, range?: SelectionRange): DocumentComment;
    /**
     * Responde a comentário
     */
    replyToComment(sessionId: string, documentId: string, commentId: string, content: string): CommentReply;
    /**
     * Resolve comentário
     */
    resolveComment(sessionId: string, documentId: string, commentId: string): void;
    /**
     * Envia mensagem no chat
     */
    sendMessage(sessionId: string, content: string, attachments?: MessageAttachment[]): ChatMessage;
    /**
     * Adiciona reação a mensagem
     */
    addReaction(sessionId: string, messageId: string, emoji: string): void;
    private connect;
    private getWebSocketUrl;
    private handleIncomingMessage;
    private handleRemoteOperation;
    private handleCursorUpdate;
    private handleSelectionUpdate;
    private handlePresenceUpdate;
    private handleUserJoined;
    private handleUserLeft;
    private handleSyncMessage;
    private generateUserColor;
    private disconnect;
    private syncInitialState;
    private broadcast;
    private sendToUser;
    private broadcastPresence;
    private setupHeartbeat;
    private generateId;
    /**
     * Obtém sessão ativa
     */
    getActiveSession(): CollaborationSession | undefined;
    /**
     * Obtém usuário atual
     */
    getCurrentUser(): CollaborationUser | undefined;
    /**
     * Obtém awareness
     */
    getAwareness(): AwarenessState;
    on(event: string, callback: (event: CollaborationEvent) => void): void;
    off(event: string, callback: (event: CollaborationEvent) => void): void;
    private emit;
    /**
     * Cleanup
     */
    dispose(): void;
}
export interface CollaborationMessage {
    type: string;
    [key: string]: unknown;
}
export interface CollaborationEvent {
    sessionId?: string;
    session?: CollaborationSession;
    userId?: string;
    documentId?: string;
    operation?: DocumentOperation;
    role?: UserRole;
}
