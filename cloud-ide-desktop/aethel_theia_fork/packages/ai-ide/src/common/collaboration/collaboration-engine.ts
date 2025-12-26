import { injectable } from 'inversify';

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

// ============================================================================
// TYPES BASE
// ============================================================================

export type ConnectionState = 
    | 'disconnected'
    | 'connecting'
    | 'connected'
    | 'reconnecting'
    | 'error';

export type UserRole = 
    | 'owner'
    | 'admin'
    | 'editor'
    | 'viewer'
    | 'guest';

export type OperationType = 
    | 'insert'
    | 'delete'
    | 'retain'
    | 'replace'
    | 'move'
    | 'format';

// ============================================================================
// USER & PRESENCE
// ============================================================================

export interface CollaborationUser {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
    color: string;
    
    // Papel
    role: UserRole;
    permissions: Permission[];
    
    // Presença
    presence: UserPresence;
    
    // Cursor e seleção (para colaboração em tempo real)
    cursor?: CursorPosition;
    selection?: SelectionRange;
    
    // Conexão
    connectionId?: string;
    lastSeen: number;
}

export interface UserPresence {
    online: boolean;
    status: 'active' | 'idle' | 'away';
    
    // Localização
    location?: PresenceLocation;
    
    // Cursor
    cursor?: CursorPosition;
    
    // Seleção
    selection?: SelectionRange;
    
    // Atividade
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

export type Permission = 
    | 'read'
    | 'write'
    | 'delete'
    | 'share'
    | 'admin'
    | 'chat'
    | 'voice'
    | 'video';

// ============================================================================
// SESSION
// ============================================================================

export interface CollaborationSession {
    id: string;
    name: string;
    
    // Proprietário
    ownerId: string;
    
    // Participantes
    participants: Map<string, CollaborationUser>;
    
    // Documentos compartilhados
    documents: Map<string, SharedDocument>;
    
    // Configurações
    settings: SessionSettings;
    
    // Estado
    state: ConnectionState;
    
    // Chat
    chat: ChatChannel;
    
    // Timestamps
    created: number;
    lastActivity: number;
}

export interface SessionSettings {
    // Permissões padrão
    defaultRole: UserRole;
    
    // Limites
    maxParticipants: number;
    
    // Funcionalidades
    enableChat: boolean;
    enableVoice: boolean;
    enableVideo: boolean;
    
    // Persistência
    persistent: boolean;
    expiresAt?: number;
    
    // Segurança
    requireAuth: boolean;
    allowAnonymous: boolean;
    password?: string;
}

// ============================================================================
// SHARED DOCUMENT
// ============================================================================

export interface SharedDocument {
    id: string;
    name: string;
    type: DocumentType;
    
    // Conteúdo (CRDT)
    content: CRDTDocument;
    
    // Versão
    version: number;
    
    // Histórico
    history: DocumentOperation[];
    
    // Usuários editando
    editors: Set<string>;
    
    // Locks
    locks: DocumentLock[];
    
    // Comentários
    comments: DocumentComment[];
    
    // Estado
    dirty: boolean;
    lastModified: number;
}

export type DocumentType = 
    | 'text'
    | 'code'
    | 'json'
    | 'binary'
    | 'canvas'
    | 'timeline'
    | '3d-scene';

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

// ============================================================================
// OPERATIONS
// ============================================================================

export interface DocumentOperation {
    id: string;
    type: OperationType;
    userId: string;
    timestamp: number;
    
    // Posição
    position?: number;
    
    // Dados
    data?: unknown;
    
    // Para undo
    inverse?: DocumentOperation;
    
    // Vetor de versão
    vectorClock: VectorClock;
}

export interface TextOperation extends DocumentOperation {
    type: 'insert' | 'delete' | 'retain';
    position: number;
    text?: string;           // Para insert
    length?: number;         // Para delete/retain
}

export interface FormatOperation extends DocumentOperation {
    type: 'format';
    range: { start: number; end: number };
    format: Record<string, unknown>;
}

export type VectorClock = Record<string, number>;

// ============================================================================
// CRDT
// ============================================================================

export interface CRDTDocument {
    type: 'text' | 'json' | 'list';
    
    // Para texto
    text?: CRDTText;
    
    // Para JSON
    json?: CRDTMap;
    
    // Para lista
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

export type CRDTValue = 
    | { type: 'string'; value: string }
    | { type: 'number'; value: number }
    | { type: 'boolean'; value: boolean }
    | { type: 'null' }
    | { type: 'map'; value: CRDTMap }
    | { type: 'list'; value: CRDTList };

// ============================================================================
// CHAT
// ============================================================================

export interface ChatChannel {
    id: string;
    name: string;
    type: 'session' | 'document' | 'thread';
    
    messages: ChatMessage[];
    
    // Para paginação
    hasMore: boolean;
    oldestLoaded?: string;
}

export interface ChatMessage {
    id: string;
    userId: string;
    content: string;
    timestamp: number;
    
    // Tipo
    type: 'text' | 'system' | 'file' | 'link';
    
    // Anexos
    attachments?: MessageAttachment[];
    
    // Reações
    reactions: Map<string, string[]>;
    
    // Thread
    threadId?: string;
    replyCount?: number;
    
    // Edição
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

// ============================================================================
// AWARENESS
// ============================================================================

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

// ============================================================================
// MESSAGE TYPES FOR WEBSOCKET
// ============================================================================

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

// ============================================================================
// SIMPLE EVENT EMITTER
// ============================================================================

class SimpleEmitter<T> {
    private handlers: Array<(value: T) => void> = [];
    
    fire(value: T): void {
        for (const handler of this.handlers) {
            handler(value);
        }
    }
    
    get event(): (handler: (value: T) => void) => { dispose: () => void } {
        return (handler) => {
            this.handlers.push(handler);
            return {
                dispose: () => {
                    const index = this.handlers.indexOf(handler);
                    if (index >= 0) this.handlers.splice(index, 1);
                }
            };
        };
    }
    
    dispose(): void {
        this.handlers = [];
    }
}

// ============================================================================
// COLLABORATION ENGINE
// ============================================================================

@injectable()
export class CollaborationEngine {
    private sessions: Map<string, CollaborationSession> = new Map();
    private activeSession?: CollaborationSession;
    private currentUser?: CollaborationUser;
    private connections: Map<string, WebSocket> = new Map();
    private awareness: AwarenessState = { users: new Map(), documentStates: new Map() };
    private vectorClock: VectorClock = {};
    private operationQueue: DocumentOperation[] = [];
    private pendingOperations: Map<string, DocumentOperation> = new Map();
    private listeners: Map<string, Set<(event: CollaborationEvent) => void>> = new Map();
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private heartbeatInterval?: ReturnType<typeof setInterval>;
    
    // Event emitters for real-time updates
    private onConnectionStateEmitter = new SimpleEmitter<ConnectionState>();
    private onOperationEmitter = new SimpleEmitter<{ sessionId: string; documentId: string; operation: DocumentOperation }>();
    private onCursorEmitter = new SimpleEmitter<{ sessionId: string; userId: string; cursor: CursorPosition }>();
    private onSelectionEmitter = new SimpleEmitter<{ sessionId: string; userId: string; selection: SelectionRange }>();
    private onPresenceEmitter = new SimpleEmitter<{ sessionId: string; userId: string; presence: UserPresence | string }>();
    private onUserJoinedEmitter = new SimpleEmitter<{ sessionId: string; userId: string }>();
    private onUserLeftEmitter = new SimpleEmitter<{ sessionId: string; userId: string }>();
    private onChatEmitter = new SimpleEmitter<{ sessionId: string; userId: string; message: string; timestamp: number }>();
    
    // Public events
    readonly onConnectionState = this.onConnectionStateEmitter.event;
    readonly onOperation = this.onOperationEmitter.event;
    readonly onCursor = this.onCursorEmitter.event;
    readonly onSelection = this.onSelectionEmitter.event;
    readonly onPresence = this.onPresenceEmitter.event;
    readonly onUserJoined = this.onUserJoinedEmitter.event;
    readonly onUserLeft = this.onUserLeftEmitter.event;
    readonly onChat = this.onChatEmitter.event;

    constructor() {
        this.setupHeartbeat();
    }

    // ========================================================================
    // SESSION MANAGEMENT
    // ========================================================================

    /**
     * Cria sessão de colaboração
     */
    async createSession(
        name: string,
        settings: Partial<SessionSettings> = {}
    ): Promise<CollaborationSession> {
        if (!this.currentUser) {
            throw new Error('User not set');
        }

        const session: CollaborationSession = {
            id: this.generateId(),
            name,
            ownerId: this.currentUser.id,
            participants: new Map([[this.currentUser.id, this.currentUser]]),
            documents: new Map(),
            settings: {
                defaultRole: 'editor',
                maxParticipants: 50,
                enableChat: true,
                enableVoice: false,
                enableVideo: false,
                persistent: true,
                requireAuth: true,
                allowAnonymous: false,
                ...settings,
            },
            state: 'disconnected',
            chat: {
                id: this.generateId(),
                name: 'Session Chat',
                type: 'session',
                messages: [],
                hasMore: false,
            },
            created: Date.now(),
            lastActivity: Date.now(),
        };

        this.sessions.set(session.id, session);
        this.emit('sessionCreated', { sessionId: session.id, session });

        return session;
    }

    /**
     * Entra em sessão existente
     */
    async joinSession(
        sessionId: string,
        inviteCode?: string
    ): Promise<CollaborationSession> {
        if (!this.currentUser) {
            throw new Error('User not set');
        }

        // Conectar ao servidor de colaboração
        await this.connect(sessionId);

        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        // Adicionar usuário
        session.participants.set(this.currentUser.id, this.currentUser);
        this.activeSession = session;

        // Sincronizar estado inicial
        await this.syncInitialState(session);

        this.emit('sessionJoined', { sessionId, userId: this.currentUser.id });

        return session;
    }

    /**
     * Sai da sessão
     */
    async leaveSession(sessionId?: string): Promise<void> {
        const id = sessionId || this.activeSession?.id;
        if (!id) return;

        const session = this.sessions.get(id);
        if (!session || !this.currentUser) return;

        // Notificar outros
        this.broadcast(session.id, {
            type: 'user-left',
            userId: this.currentUser.id,
        });

        // Remover participante
        session.participants.delete(this.currentUser.id);

        // Desconectar
        await this.disconnect(id);

        if (this.activeSession?.id === id) {
            this.activeSession = undefined;
        }

        this.emit('sessionLeft', { sessionId: id, userId: this.currentUser.id });
    }

    /**
     * Encerra sessão
     */
    async endSession(sessionId: string): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        // Verificar permissão
        if (session.ownerId !== this.currentUser?.id) {
            throw new Error('Only owner can end session');
        }

        // Notificar todos
        this.broadcast(sessionId, { type: 'session-ended' });

        // Desconectar todos
        for (const [userId] of session.participants) {
            await this.kickUser(sessionId, userId);
        }

        this.sessions.delete(sessionId);
        this.emit('sessionEnded', { sessionId });
    }

    // ========================================================================
    // USER MANAGEMENT
    // ========================================================================

    /**
     * Define usuário atual
     */
    setCurrentUser(user: Omit<CollaborationUser, 'presence'>): void {
        this.currentUser = {
            ...user,
            presence: {
                online: true,
                status: 'active',
            },
        };

        this.vectorClock[user.id] = 0;
    }

    /**
     * Atualiza presença
     */
    updatePresence(presence: Partial<UserPresence>): void {
        if (!this.currentUser || !this.activeSession) return;

        this.currentUser.presence = { ...this.currentUser.presence, ...presence };
        this.awareness.users.set(this.currentUser.id, {
            userId: this.currentUser.id,
            cursor: presence.cursor,
            selection: presence.selection,
            lastUpdate: Date.now(),
        });

        this.broadcastPresence();
    }

    /**
     * Remove usuário da sessão
     */
    async kickUser(sessionId: string, userId: string): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        // Verificar permissão
        const currentRole = session.participants.get(this.currentUser?.id || '')?.role;
        if (currentRole !== 'owner' && currentRole !== 'admin') {
            throw new Error('Insufficient permissions');
        }

        session.participants.delete(userId);

        // Notificar
        this.sendToUser(sessionId, userId, { type: 'kicked' });
        this.broadcast(sessionId, { type: 'user-kicked', userId }, [userId]);

        this.emit('userKicked', { sessionId, userId });
    }

    /**
     * Altera papel do usuário
     */
    changeUserRole(sessionId: string, userId: string, role: UserRole): void {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        const user = session.participants.get(userId);
        if (!user) return;

        // Verificar permissão
        const currentRole = session.participants.get(this.currentUser?.id || '')?.role;
        if (currentRole !== 'owner' && currentRole !== 'admin') {
            throw new Error('Insufficient permissions');
        }

        user.role = role;
        user.permissions = this.getPermissionsForRole(role);

        this.broadcast(sessionId, { type: 'role-changed', userId, role });
        this.emit('roleChanged', { sessionId, userId, role });
    }

    private getPermissionsForRole(role: UserRole): Permission[] {
        switch (role) {
            case 'owner':
                return ['read', 'write', 'delete', 'share', 'admin', 'chat', 'voice', 'video'];
            case 'admin':
                return ['read', 'write', 'delete', 'share', 'chat', 'voice', 'video'];
            case 'editor':
                return ['read', 'write', 'chat'];
            case 'viewer':
                return ['read', 'chat'];
            case 'guest':
                return ['read'];
            default:
                return [];
        }
    }

    // ========================================================================
    // DOCUMENT OPERATIONS
    // ========================================================================

    /**
     * Compartilha documento
     */
    shareDocument(
        sessionId: string,
        documentId: string,
        name: string,
        type: DocumentType,
        content?: string
    ): SharedDocument {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        const doc: SharedDocument = {
            id: documentId,
            name,
            type,
            content: this.initializeCRDT(type, content),
            version: 0,
            history: [],
            editors: new Set(),
            locks: [],
            comments: [],
            dirty: false,
            lastModified: Date.now(),
        };

        session.documents.set(documentId, doc);

        this.broadcast(sessionId, {
            type: 'document-shared',
            documentId,
            name,
            docType: type,
        });

        this.emit('documentShared', { sessionId, documentId });

        return doc;
    }

    /**
     * Aplica operação em documento
     */
    applyOperation(
        sessionId: string,
        documentId: string,
        operation: Omit<DocumentOperation, 'id' | 'userId' | 'timestamp' | 'vectorClock'>
    ): void {
        if (!this.currentUser) return;

        const session = this.sessions.get(sessionId);
        const doc = session?.documents.get(documentId);
        if (!doc) return;

        // Incrementar clock
        this.vectorClock[this.currentUser.id]++;

        const fullOp: DocumentOperation = {
            id: this.generateId(),
            ...operation,
            userId: this.currentUser.id,
            timestamp: Date.now(),
            vectorClock: { ...this.vectorClock },
        };

        // Aplicar localmente
        this.applyOperationToDocument(doc, fullOp);

        // Adicionar ao histórico
        doc.history.push(fullOp);
        doc.version++;
        doc.dirty = true;
        doc.lastModified = Date.now();

        // Enviar para outros
        this.broadcast(sessionId, {
            type: 'operation',
            documentId,
            operation: fullOp,
        });

        this.emit('operationApplied', { sessionId, documentId, operation: fullOp });
    }

    /**
     * Recebe operação remota
     */
    receiveOperation(
        sessionId: string,
        documentId: string,
        operation: DocumentOperation
    ): void {
        const session = this.sessions.get(sessionId);
        const doc = session?.documents.get(documentId);
        if (!doc) return;

        // Verificar se já foi aplicada
        if (doc.history.some(op => op.id === operation.id)) {
            return;
        }

        // Transformar contra operações concorrentes
        const transformed = this.transformOperation(operation, doc.history);

        // Aplicar
        this.applyOperationToDocument(doc, transformed);

        // Atualizar estado
        doc.history.push(transformed);
        doc.version++;
        doc.lastModified = Date.now();

        // Atualizar vector clock
        for (const [site, clock] of Object.entries(operation.vectorClock)) {
            this.vectorClock[site] = Math.max(this.vectorClock[site] || 0, clock);
        }

        this.emit('operationReceived', { sessionId, documentId, operation: transformed });
    }

    private applyOperationToDocument(doc: SharedDocument, op: DocumentOperation): void {
        if (!doc.content.text) return;

        switch (op.type) {
            case 'insert':
                this.insertText(doc.content.text, op as TextOperation);
                break;
            case 'delete':
                this.deleteText(doc.content.text, op as TextOperation);
                break;
            case 'format':
                this.formatText(doc.content.text, op as FormatOperation);
                break;
        }
    }

    private insertText(text: CRDTText, op: TextOperation): void {
        if (!op.text || op.position === undefined) return;

        const newChars: CRDTChar[] = [];
        for (let i = 0; i < op.text.length; i++) {
            newChars.push({
                id: { site: op.userId, clock: this.vectorClock[op.userId] + i },
                value: op.text[i],
                deleted: false,
            });
        }

        text.chars.splice(op.position, 0, ...newChars);
    }

    private deleteText(text: CRDTText, op: TextOperation): void {
        if (op.position === undefined || !op.length) return;

        for (let i = 0; i < op.length; i++) {
            const idx = op.position + i;
            if (idx < text.chars.length) {
                text.chars[idx].deleted = true;
            }
        }
    }

    private formatText(text: CRDTText, op: FormatOperation): void {
        for (let i = op.range.start; i < op.range.end && i < text.chars.length; i++) {
            text.chars[i].format = { ...text.chars[i].format, ...op.format };
        }
    }

    // ========================================================================
    // OPERATIONAL TRANSFORMATION
    // ========================================================================

    private transformOperation(
        op: DocumentOperation,
        history: DocumentOperation[]
    ): DocumentOperation {
        let transformed = op;

        for (const historyOp of history) {
            if (this.isConcurrent(op, historyOp)) {
                transformed = this.transformAgainst(transformed, historyOp);
            }
        }

        return transformed;
    }

    private isConcurrent(op1: DocumentOperation, op2: DocumentOperation): boolean {
        const vc1 = op1.vectorClock;
        const vc2 = op2.vectorClock;

        let less = false;
        let greater = false;

        for (const site of new Set([...Object.keys(vc1), ...Object.keys(vc2)])) {
            const v1 = vc1[site] || 0;
            const v2 = vc2[site] || 0;

            if (v1 < v2) less = true;
            if (v1 > v2) greater = true;
        }

        return less && greater;
    }

    private transformAgainst(
        op: DocumentOperation,
        against: DocumentOperation
    ): DocumentOperation {
        if (op.type === 'insert' && against.type === 'insert') {
            const opText = op as TextOperation;
            const againstText = against as TextOperation;

            if (againstText.position !== undefined && opText.position !== undefined) {
                if (againstText.position <= opText.position) {
                    return {
                        ...op,
                        position: opText.position + (againstText.text?.length || 0),
                    };
                }
            }
        }

        if (op.type === 'insert' && against.type === 'delete') {
            const opText = op as TextOperation;
            const againstText = against as TextOperation;

            if (againstText.position !== undefined && opText.position !== undefined) {
                if (againstText.position < opText.position) {
                    return {
                        ...op,
                        position: Math.max(
                            againstText.position,
                            opText.position - (againstText.length || 0)
                        ),
                    };
                }
            }
        }

        if (op.type === 'delete' && against.type === 'insert') {
            const opText = op as TextOperation;
            const againstText = against as TextOperation;

            if (againstText.position !== undefined && opText.position !== undefined) {
                if (againstText.position <= opText.position) {
                    return {
                        ...op,
                        position: opText.position + (againstText.text?.length || 0),
                    };
                }
            }
        }

        return op;
    }

    // ========================================================================
    // CRDT INITIALIZATION
    // ========================================================================

    private initializeCRDT(type: DocumentType, content?: string): CRDTDocument {
        if (type === 'text' || type === 'code') {
            return {
                type: 'text',
                text: {
                    chars: content
                        ? content.split('').map((c, i) => ({
                            id: { site: 'initial', clock: i },
                            value: c,
                            deleted: false,
                        }))
                        : [],
                },
            };
        }

        if (type === 'json') {
            return {
                type: 'json',
                json: { entries: new Map() },
            };
        }

        return {
            type: 'list',
            list: { items: [] },
        };
    }

    /**
     * Obtém texto do CRDT
     */
    getCRDTText(doc: SharedDocument): string {
        if (!doc.content.text) return '';
        
        return doc.content.text.chars
            .filter(c => !c.deleted)
            .map(c => c.value)
            .join('');
    }

    // ========================================================================
    // LOCKS
    // ========================================================================

    /**
     * Adquire lock em range
     */
    acquireLock(
        sessionId: string,
        documentId: string,
        range?: SelectionRange,
        type: 'soft' | 'hard' = 'soft'
    ): DocumentLock | null {
        if (!this.currentUser) return null;

        const session = this.sessions.get(sessionId);
        const doc = session?.documents.get(documentId);
        if (!doc) return null;

        // Verificar conflitos para hard lock
        if (type === 'hard' && range) {
            for (const lock of doc.locks) {
                if (lock.type === 'hard' && this.rangesOverlap(lock.range, range)) {
                    return null;
                }
            }
        }

        const lock: DocumentLock = {
            id: this.generateId(),
            userId: this.currentUser.id,
            range,
            type,
            timestamp: Date.now(),
            expires: Date.now() + 30000, // 30 segundos
        };

        doc.locks.push(lock);

        this.broadcast(sessionId, {
            type: 'lock-acquired',
            documentId,
            lock,
        });

        return lock;
    }

    /**
     * Libera lock
     */
    releaseLock(sessionId: string, documentId: string, lockId: string): void {
        const session = this.sessions.get(sessionId);
        const doc = session?.documents.get(documentId);
        if (!doc) return;

        const index = doc.locks.findIndex(l => l.id === lockId);
        if (index >= 0) {
            doc.locks.splice(index, 1);

            this.broadcast(sessionId, {
                type: 'lock-released',
                documentId,
                lockId,
            });
        }
    }

    private rangesOverlap(
        range1?: SelectionRange,
        range2?: SelectionRange
    ): boolean {
        if (!range1 || !range2) return false;

        const start1 = this.positionToOffset(range1.anchor);
        const end1 = this.positionToOffset(range1.head);
        const start2 = this.positionToOffset(range2.anchor);
        const end2 = this.positionToOffset(range2.head);

        return start1 < end2 && start2 < end1;
    }

    private positionToOffset(pos: CursorPosition): number {
        return pos.offset || (pos.line * 10000 + pos.column);
    }

    // ========================================================================
    // COMMENTS
    // ========================================================================

    /**
     * Adiciona comentário
     */
    addComment(
        sessionId: string,
        documentId: string,
        content: string,
        position: CursorPosition,
        range?: SelectionRange
    ): DocumentComment {
        if (!this.currentUser) {
            throw new Error('User not set');
        }

        const session = this.sessions.get(sessionId);
        const doc = session?.documents.get(documentId);
        if (!doc) {
            throw new Error('Document not found');
        }

        const comment: DocumentComment = {
            id: this.generateId(),
            userId: this.currentUser.id,
            content,
            position,
            range,
            timestamp: Date.now(),
            resolved: false,
            replies: [],
        };

        doc.comments.push(comment);

        this.broadcast(sessionId, {
            type: 'comment-added',
            documentId,
            comment,
        });

        return comment;
    }

    /**
     * Responde a comentário
     */
    replyToComment(
        sessionId: string,
        documentId: string,
        commentId: string,
        content: string
    ): CommentReply {
        if (!this.currentUser) {
            throw new Error('User not set');
        }

        const session = this.sessions.get(sessionId);
        const doc = session?.documents.get(documentId);
        const comment = doc?.comments.find(c => c.id === commentId);
        if (!comment) {
            throw new Error('Comment not found');
        }

        const reply: CommentReply = {
            id: this.generateId(),
            userId: this.currentUser.id,
            content,
            timestamp: Date.now(),
        };

        comment.replies.push(reply);

        this.broadcast(sessionId, {
            type: 'comment-reply',
            documentId,
            commentId,
            reply,
        });

        return reply;
    }

    /**
     * Resolve comentário
     */
    resolveComment(
        sessionId: string,
        documentId: string,
        commentId: string
    ): void {
        const session = this.sessions.get(sessionId);
        const doc = session?.documents.get(documentId);
        const comment = doc?.comments.find(c => c.id === commentId);
        if (!comment) return;

        comment.resolved = true;

        this.broadcast(sessionId, {
            type: 'comment-resolved',
            documentId,
            commentId,
        });
    }

    // ========================================================================
    // CHAT
    // ========================================================================

    /**
     * Envia mensagem no chat
     */
    sendMessage(
        sessionId: string,
        content: string,
        attachments?: MessageAttachment[]
    ): ChatMessage {
        if (!this.currentUser) {
            throw new Error('User not set');
        }

        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        const message: ChatMessage = {
            id: this.generateId(),
            userId: this.currentUser.id,
            content,
            timestamp: Date.now(),
            type: 'text',
            attachments,
            reactions: new Map(),
            edited: false,
        };

        session.chat.messages.push(message);

        this.broadcast(sessionId, {
            type: 'chat-message',
            message,
        });

        return message;
    }

    /**
     * Adiciona reação a mensagem
     */
    addReaction(
        sessionId: string,
        messageId: string,
        emoji: string
    ): void {
        if (!this.currentUser) return;

        const session = this.sessions.get(sessionId);
        const message = session?.chat.messages.find(m => m.id === messageId);
        if (!message) return;

        const reactions = message.reactions.get(emoji) || [];
        if (!reactions.includes(this.currentUser.id)) {
            reactions.push(this.currentUser.id);
            message.reactions.set(emoji, reactions);
        }

        this.broadcast(sessionId, {
            type: 'reaction-added',
            messageId,
            emoji,
            userId: this.currentUser.id,
        });
    }

    // ========================================================================
    // CONNECTION - Real WebSocket Implementation
    // ========================================================================

    private async connect(sessionId: string): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        // Get WebSocket URL from environment or config
        const wsUrl = this.getWebSocketUrl(sessionId);
        
        if (wsUrl) {
            try {
                const ws = new WebSocket(wsUrl);
                
                ws.onopen = () => {
                    session.state = 'connected';
                    this.connections.set(sessionId, ws);
                    
                    // Send join message
                    ws.send(JSON.stringify({
                        type: 'join',
                        sessionId,
                        userId: this.currentUser?.id,
                        user: this.currentUser,
                    }));
                    
                    this.onConnectionStateEmitter.fire('connected');
                };
                
                ws.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data) as CollaborationMessage;
                        this.handleIncomingMessage(sessionId, message);
                    } catch (error) {
                        console.error('[Collaboration] Failed to parse message:', error);
                    }
                };
                
                ws.onerror = (error) => {
                    console.error('[Collaboration] WebSocket error:', error);
                    session.state = 'error';
                    this.onConnectionStateEmitter.fire('error');
                };
                
                ws.onclose = () => {
                    session.state = 'disconnected';
                    this.connections.delete(sessionId);
                    this.onConnectionStateEmitter.fire('disconnected');
                    
                    // Attempt reconnection after delay
                    setTimeout(() => {
                        if (session.state === 'disconnected') {
                            this.connect(sessionId);
                        }
                    }, 3000);
                };
                
            } catch (error) {
                console.warn('[Collaboration] WebSocket connection failed:', error);
                session.state = 'disconnected';
            }
        } else {
            // Fallback: mark as connected for local-only mode
            session.state = 'connected';
            console.info('[Collaboration] Running in local mode (no WebSocket URL configured)');
        }
    }

    private getWebSocketUrl(sessionId: string): string | null {
        // Check for environment variable or config
        const baseUrl = (typeof process !== 'undefined' && process.env?.COLLAB_WS_URL) ||
                       (typeof window !== 'undefined' && (window as unknown as { COLLAB_WS_URL?: string }).COLLAB_WS_URL) ||
                       null;
        
        if (baseUrl) {
            return `${baseUrl}/session/${sessionId}`;
        }
        return null;
    }

    private handleIncomingMessage(sessionId: string, message: CollaborationMessage): void {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        switch (message.type) {
            case 'operation':
                this.handleRemoteOperation(sessionId, message as unknown as OperationMessage);
                break;
            case 'cursor':
                this.handleCursorUpdate(sessionId, message as unknown as CursorUpdateMessage);
                break;
            case 'selection':
                this.handleSelectionUpdate(sessionId, message as unknown as SelectionUpdateMessage);
                break;
            case 'presence':
                this.handlePresenceUpdate(sessionId, message as unknown as PresenceMessage);
                break;
            case 'join':
                this.handleUserJoined(sessionId, message);
                break;
            case 'leave':
                this.handleUserLeft(sessionId, message);
                break;
            case 'sync':
                this.handleSyncMessage(sessionId, message);
                break;
            case 'chat':
                this.onChatEmitter.fire({
                    sessionId,
                    userId: (message.userId as string) || '',
                    message: (message.content as string) || '',
                    timestamp: Date.now(),
                });
                break;
        }
    }

    private handleRemoteOperation(sessionId: string, message: OperationMessage): void {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        const doc = session.documents.get(message.documentId);
        if (doc) {
            // Apply operation with conflict resolution
            this.applyOperationToDocument(doc, message.operation);
            this.onOperationEmitter.fire({
                sessionId,
                documentId: message.documentId,
                operation: message.operation,
            });
        }
    }

    private handleCursorUpdate(sessionId: string, message: CursorUpdateMessage): void {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        const participant = session.participants.get(message.userId);
        if (participant) {
            participant.cursor = message.cursor;
            this.onCursorEmitter.fire({
                sessionId,
                userId: message.userId,
                cursor: message.cursor,
            });
        }
    }

    private handleSelectionUpdate(sessionId: string, message: SelectionUpdateMessage): void {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        const participant = session.participants.get(message.userId);
        if (participant) {
            participant.selection = message.selection;
            this.onSelectionEmitter.fire({
                sessionId,
                userId: message.userId,
                selection: message.selection,
            });
        }
    }

    private handlePresenceUpdate(sessionId: string, message: PresenceMessage): void {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        const participant = session.participants.get(message.userId);
        if (participant) {
            if (typeof message.presence === 'string') {
                participant.presence = { online: message.presence === 'online', status: 'active' };
            } else {
                participant.presence = message.presence;
            }
            this.onPresenceEmitter.fire({
                sessionId,
                userId: message.userId,
                presence: message.presence,
            });
        }
    }

    private handleUserJoined(sessionId: string, message: CollaborationMessage): void {
        const session = this.sessions.get(sessionId);
        const userId = message.userId as string | undefined;
        if (!session || !userId) return;

        // Add user to session if not exists
        if (!session.participants.has(userId)) {
            const userData = (message as { user?: CollaborationUser }).user;
            session.participants.set(userId, userData || {
                id: userId,
                name: 'User',
                color: this.generateUserColor(),
                role: 'viewer',
                permissions: ['read'],
                presence: { online: true, status: 'active' },
                lastSeen: Date.now(),
            });
            
            this.onUserJoinedEmitter.fire({
                sessionId,
                userId,
            });
        }
    }

    private handleUserLeft(sessionId: string, message: CollaborationMessage): void {
        const session = this.sessions.get(sessionId);
        const userId = message.userId as string | undefined;
        if (!session || !userId) return;

        session.participants.delete(userId);
        this.onUserLeftEmitter.fire({
            sessionId,
            userId,
        });
    }

    private handleSyncMessage(sessionId: string, message: CollaborationMessage): void {
        // Handle full state sync
        const syncData = message as { documents?: Array<{ id: string; content: CRDTDocument }> };
        if (syncData.documents) {
            const session = this.sessions.get(sessionId);
            if (session) {
                for (const docData of syncData.documents) {
                    const doc = session.documents.get(docData.id);
                    if (doc) {
                        doc.content = docData.content;
                    }
                }
            }
        }
    }

    private generateUserColor(): string {
        const colors = ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f1c40f', '#e67e22', '#1abc9c'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    private async disconnect(sessionId: string): Promise<void> {
        const connection = this.connections.get(sessionId);
        if (connection) {
            // Send leave message before closing
            if (connection.readyState === WebSocket.OPEN) {
                connection.send(JSON.stringify({
                    type: 'leave',
                    sessionId,
                    userId: this.currentUser?.id,
                }));
            }
            connection.close();
            this.connections.delete(sessionId);
        }

        const session = this.sessions.get(sessionId);
        if (session) {
            session.state = 'disconnected';
        }
    }

    private async syncInitialState(session: CollaborationSession): Promise<void> {
        const connection = this.connections.get(session.id);
        if (connection && connection.readyState === WebSocket.OPEN) {
            connection.send(JSON.stringify({
                type: 'sync-request',
                sessionId: session.id,
                userId: this.currentUser?.id,
            }));
        }
    }

    private broadcast(
        sessionId: string,
        message: CollaborationMessage,
        exclude: string[] = []
    ): void {
        const connection = this.connections.get(sessionId);
        
        if (connection && connection.readyState === WebSocket.OPEN) {
            // Send via WebSocket - server will broadcast
            connection.send(JSON.stringify({
                ...message,
                sessionId,
                exclude,
            }));
        } else {
            // Local-only mode: emit directly for local subscribers
            const session = this.sessions.get(sessionId);
            if (!session) return;

            const excludeSet = new Set([...exclude, this.currentUser?.id]);

            for (const [userId] of session.participants) {
                if (!excludeSet.has(userId)) {
                    this.sendToUser(sessionId, userId, message);
                }
            }
        }
    }

    private sendToUser(
        _sessionId: string,
        _userId: string,
        message: CollaborationMessage
    ): void {
        // In local mode, just emit events directly
        // The WebSocket broadcast handles remote users
        if (message.type === 'operation') {
            const opMsg = message as unknown as OperationMessage;
            this.onOperationEmitter.fire({
                sessionId: _sessionId,
                documentId: opMsg.documentId,
                operation: opMsg.operation,
            });
        }
    }

    private broadcastPresence(): void {
        if (!this.activeSession || !this.currentUser) return;

        this.broadcast(this.activeSession.id, {
            type: 'presence',
            userId: this.currentUser.id,
            presence: this.currentUser.presence,
        });
    }

    private setupHeartbeat(): void {
        this.heartbeatInterval = setInterval(() => {
            if (this.activeSession && this.currentUser) {
                this.broadcast(this.activeSession.id, {
                    type: 'heartbeat',
                    userId: this.currentUser.id,
                    timestamp: Date.now(),
                });

                // Limpar locks expirados
                for (const [, doc] of this.activeSession.documents) {
                    doc.locks = doc.locks.filter(l => !l.expires || l.expires > Date.now());
                }
            }
        }, 5000);
    }

    // ========================================================================
    // UTILITIES
    // ========================================================================

    private generateId(): string {
        return `collab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Obtém sessão ativa
     */
    getActiveSession(): CollaborationSession | undefined {
        return this.activeSession;
    }

    /**
     * Obtém usuário atual
     */
    getCurrentUser(): CollaborationUser | undefined {
        return this.currentUser;
    }

    /**
     * Obtém awareness
     */
    getAwareness(): AwarenessState {
        return this.awareness;
    }

    // ========================================================================
    // EVENTS
    // ========================================================================

    on(event: string, callback: (event: CollaborationEvent) => void): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
    }

    off(event: string, callback: (event: CollaborationEvent) => void): void {
        this.listeners.get(event)?.delete(callback);
    }

    private emit(event: string, data: CollaborationEvent): void {
        this.listeners.get(event)?.forEach(cb => cb(data));
    }

    /**
     * Cleanup
     */
    dispose(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        for (const [sessionId] of this.sessions) {
            this.disconnect(sessionId);
        }
    }
}

// ============================================================================
// TIPOS AUXILIARES
// ============================================================================

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
