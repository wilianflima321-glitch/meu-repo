"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollaborationEngine = void 0;
const inversify_1 = require("inversify");
// ============================================================================
// SIMPLE EVENT EMITTER
// ============================================================================
class SimpleEmitter {
    constructor() {
        this.handlers = [];
    }
    fire(value) {
        for (const handler of this.handlers) {
            handler(value);
        }
    }
    get event() {
        return (handler) => {
            this.handlers.push(handler);
            return {
                dispose: () => {
                    const index = this.handlers.indexOf(handler);
                    if (index >= 0)
                        this.handlers.splice(index, 1);
                }
            };
        };
    }
    dispose() {
        this.handlers = [];
    }
}
// ============================================================================
// COLLABORATION ENGINE
// ============================================================================
let CollaborationEngine = class CollaborationEngine {
    constructor() {
        this.sessions = new Map();
        this.connections = new Map();
        this.awareness = { users: new Map(), documentStates: new Map() };
        this.vectorClock = {};
        this.operationQueue = [];
        this.pendingOperations = new Map();
        this.listeners = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        // Event emitters for real-time updates
        this.onConnectionStateEmitter = new SimpleEmitter();
        this.onOperationEmitter = new SimpleEmitter();
        this.onCursorEmitter = new SimpleEmitter();
        this.onSelectionEmitter = new SimpleEmitter();
        this.onPresenceEmitter = new SimpleEmitter();
        this.onUserJoinedEmitter = new SimpleEmitter();
        this.onUserLeftEmitter = new SimpleEmitter();
        this.onChatEmitter = new SimpleEmitter();
        // Public events
        this.onConnectionState = this.onConnectionStateEmitter.event;
        this.onOperation = this.onOperationEmitter.event;
        this.onCursor = this.onCursorEmitter.event;
        this.onSelection = this.onSelectionEmitter.event;
        this.onPresence = this.onPresenceEmitter.event;
        this.onUserJoined = this.onUserJoinedEmitter.event;
        this.onUserLeft = this.onUserLeftEmitter.event;
        this.onChat = this.onChatEmitter.event;
        this.setupHeartbeat();
    }
    // ========================================================================
    // SESSION MANAGEMENT
    // ========================================================================
    /**
     * Cria sessão de colaboração
     */
    async createSession(name, settings = {}) {
        if (!this.currentUser) {
            throw new Error('User not set');
        }
        const session = {
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
    async joinSession(sessionId, inviteCode) {
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
    async leaveSession(sessionId) {
        const id = sessionId || this.activeSession?.id;
        if (!id)
            return;
        const session = this.sessions.get(id);
        if (!session || !this.currentUser)
            return;
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
    async endSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
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
    setCurrentUser(user) {
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
    updatePresence(presence) {
        if (!this.currentUser || !this.activeSession)
            return;
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
    async kickUser(sessionId, userId) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
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
    changeUserRole(sessionId, userId, role) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        const user = session.participants.get(userId);
        if (!user)
            return;
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
    getPermissionsForRole(role) {
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
    shareDocument(sessionId, documentId, name, type, content) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        const doc = {
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
    applyOperation(sessionId, documentId, operation) {
        if (!this.currentUser)
            return;
        const session = this.sessions.get(sessionId);
        const doc = session?.documents.get(documentId);
        if (!doc)
            return;
        // Incrementar clock
        this.vectorClock[this.currentUser.id]++;
        const fullOp = {
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
    receiveOperation(sessionId, documentId, operation) {
        const session = this.sessions.get(sessionId);
        const doc = session?.documents.get(documentId);
        if (!doc)
            return;
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
    applyOperationToDocument(doc, op) {
        if (!doc.content.text)
            return;
        switch (op.type) {
            case 'insert':
                this.insertText(doc.content.text, op);
                break;
            case 'delete':
                this.deleteText(doc.content.text, op);
                break;
            case 'format':
                this.formatText(doc.content.text, op);
                break;
        }
    }
    insertText(text, op) {
        if (!op.text || op.position === undefined)
            return;
        const newChars = [];
        for (let i = 0; i < op.text.length; i++) {
            newChars.push({
                id: { site: op.userId, clock: this.vectorClock[op.userId] + i },
                value: op.text[i],
                deleted: false,
            });
        }
        text.chars.splice(op.position, 0, ...newChars);
    }
    deleteText(text, op) {
        if (op.position === undefined || !op.length)
            return;
        for (let i = 0; i < op.length; i++) {
            const idx = op.position + i;
            if (idx < text.chars.length) {
                text.chars[idx].deleted = true;
            }
        }
    }
    formatText(text, op) {
        for (let i = op.range.start; i < op.range.end && i < text.chars.length; i++) {
            text.chars[i].format = { ...text.chars[i].format, ...op.format };
        }
    }
    // ========================================================================
    // OPERATIONAL TRANSFORMATION
    // ========================================================================
    transformOperation(op, history) {
        let transformed = op;
        for (const historyOp of history) {
            if (this.isConcurrent(op, historyOp)) {
                transformed = this.transformAgainst(transformed, historyOp);
            }
        }
        return transformed;
    }
    isConcurrent(op1, op2) {
        const vc1 = op1.vectorClock;
        const vc2 = op2.vectorClock;
        let less = false;
        let greater = false;
        for (const site of new Set([...Object.keys(vc1), ...Object.keys(vc2)])) {
            const v1 = vc1[site] || 0;
            const v2 = vc2[site] || 0;
            if (v1 < v2)
                less = true;
            if (v1 > v2)
                greater = true;
        }
        return less && greater;
    }
    transformAgainst(op, against) {
        if (op.type === 'insert' && against.type === 'insert') {
            const opText = op;
            const againstText = against;
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
            const opText = op;
            const againstText = against;
            if (againstText.position !== undefined && opText.position !== undefined) {
                if (againstText.position < opText.position) {
                    return {
                        ...op,
                        position: Math.max(againstText.position, opText.position - (againstText.length || 0)),
                    };
                }
            }
        }
        if (op.type === 'delete' && against.type === 'insert') {
            const opText = op;
            const againstText = against;
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
    initializeCRDT(type, content) {
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
    getCRDTText(doc) {
        if (!doc.content.text)
            return '';
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
    acquireLock(sessionId, documentId, range, type = 'soft') {
        if (!this.currentUser)
            return null;
        const session = this.sessions.get(sessionId);
        const doc = session?.documents.get(documentId);
        if (!doc)
            return null;
        // Verificar conflitos para hard lock
        if (type === 'hard' && range) {
            for (const lock of doc.locks) {
                if (lock.type === 'hard' && this.rangesOverlap(lock.range, range)) {
                    return null;
                }
            }
        }
        const lock = {
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
    releaseLock(sessionId, documentId, lockId) {
        const session = this.sessions.get(sessionId);
        const doc = session?.documents.get(documentId);
        if (!doc)
            return;
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
    rangesOverlap(range1, range2) {
        if (!range1 || !range2)
            return false;
        const start1 = this.positionToOffset(range1.anchor);
        const end1 = this.positionToOffset(range1.head);
        const start2 = this.positionToOffset(range2.anchor);
        const end2 = this.positionToOffset(range2.head);
        return start1 < end2 && start2 < end1;
    }
    positionToOffset(pos) {
        return pos.offset || (pos.line * 10000 + pos.column);
    }
    // ========================================================================
    // COMMENTS
    // ========================================================================
    /**
     * Adiciona comentário
     */
    addComment(sessionId, documentId, content, position, range) {
        if (!this.currentUser) {
            throw new Error('User not set');
        }
        const session = this.sessions.get(sessionId);
        const doc = session?.documents.get(documentId);
        if (!doc) {
            throw new Error('Document not found');
        }
        const comment = {
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
    replyToComment(sessionId, documentId, commentId, content) {
        if (!this.currentUser) {
            throw new Error('User not set');
        }
        const session = this.sessions.get(sessionId);
        const doc = session?.documents.get(documentId);
        const comment = doc?.comments.find(c => c.id === commentId);
        if (!comment) {
            throw new Error('Comment not found');
        }
        const reply = {
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
    resolveComment(sessionId, documentId, commentId) {
        const session = this.sessions.get(sessionId);
        const doc = session?.documents.get(documentId);
        const comment = doc?.comments.find(c => c.id === commentId);
        if (!comment)
            return;
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
    sendMessage(sessionId, content, attachments) {
        if (!this.currentUser) {
            throw new Error('User not set');
        }
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        const message = {
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
    addReaction(sessionId, messageId, emoji) {
        if (!this.currentUser)
            return;
        const session = this.sessions.get(sessionId);
        const message = session?.chat.messages.find(m => m.id === messageId);
        if (!message)
            return;
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
    async connect(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
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
                        const message = JSON.parse(event.data);
                        this.handleIncomingMessage(sessionId, message);
                    }
                    catch (error) {
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
            }
            catch (error) {
                console.warn('[Collaboration] WebSocket connection failed:', error);
                session.state = 'disconnected';
            }
        }
        else {
            // Fallback: mark as connected for local-only mode
            session.state = 'connected';
            console.info('[Collaboration] Running in local mode (no WebSocket URL configured)');
        }
    }
    getWebSocketUrl(sessionId) {
        // Check for environment variable or config
        const baseUrl = (typeof process !== 'undefined' && process.env?.COLLAB_WS_URL) ||
            (typeof window !== 'undefined' && window.COLLAB_WS_URL) ||
            null;
        if (baseUrl) {
            return `${baseUrl}/session/${sessionId}`;
        }
        return null;
    }
    handleIncomingMessage(sessionId, message) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        switch (message.type) {
            case 'operation':
                this.handleRemoteOperation(sessionId, message);
                break;
            case 'cursor':
                this.handleCursorUpdate(sessionId, message);
                break;
            case 'selection':
                this.handleSelectionUpdate(sessionId, message);
                break;
            case 'presence':
                this.handlePresenceUpdate(sessionId, message);
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
                    userId: message.userId || '',
                    message: message.content || '',
                    timestamp: Date.now(),
                });
                break;
        }
    }
    handleRemoteOperation(sessionId, message) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
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
    handleCursorUpdate(sessionId, message) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
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
    handleSelectionUpdate(sessionId, message) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
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
    handlePresenceUpdate(sessionId, message) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        const participant = session.participants.get(message.userId);
        if (participant) {
            if (typeof message.presence === 'string') {
                participant.presence = { online: message.presence === 'online', status: 'active' };
            }
            else {
                participant.presence = message.presence;
            }
            this.onPresenceEmitter.fire({
                sessionId,
                userId: message.userId,
                presence: message.presence,
            });
        }
    }
    handleUserJoined(sessionId, message) {
        const session = this.sessions.get(sessionId);
        const userId = message.userId;
        if (!session || !userId)
            return;
        // Add user to session if not exists
        if (!session.participants.has(userId)) {
            const userData = message.user;
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
    handleUserLeft(sessionId, message) {
        const session = this.sessions.get(sessionId);
        const userId = message.userId;
        if (!session || !userId)
            return;
        session.participants.delete(userId);
        this.onUserLeftEmitter.fire({
            sessionId,
            userId,
        });
    }
    handleSyncMessage(sessionId, message) {
        // Handle full state sync
        const syncData = message;
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
    generateUserColor() {
        const colors = ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f1c40f', '#e67e22', '#1abc9c'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    async disconnect(sessionId) {
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
    async syncInitialState(session) {
        const connection = this.connections.get(session.id);
        if (connection && connection.readyState === WebSocket.OPEN) {
            connection.send(JSON.stringify({
                type: 'sync-request',
                sessionId: session.id,
                userId: this.currentUser?.id,
            }));
        }
    }
    broadcast(sessionId, message, exclude = []) {
        const connection = this.connections.get(sessionId);
        if (connection && connection.readyState === WebSocket.OPEN) {
            // Send via WebSocket - server will broadcast
            connection.send(JSON.stringify({
                ...message,
                sessionId,
                exclude,
            }));
        }
        else {
            // Local-only mode: emit directly for local subscribers
            const session = this.sessions.get(sessionId);
            if (!session)
                return;
            const excludeSet = new Set([...exclude, this.currentUser?.id]);
            for (const [userId] of session.participants) {
                if (!excludeSet.has(userId)) {
                    this.sendToUser(sessionId, userId, message);
                }
            }
        }
    }
    sendToUser(_sessionId, _userId, message) {
        // In local mode, just emit events directly
        // The WebSocket broadcast handles remote users
        if (message.type === 'operation') {
            const opMsg = message;
            this.onOperationEmitter.fire({
                sessionId: _sessionId,
                documentId: opMsg.documentId,
                operation: opMsg.operation,
            });
        }
    }
    broadcastPresence() {
        if (!this.activeSession || !this.currentUser)
            return;
        this.broadcast(this.activeSession.id, {
            type: 'presence',
            userId: this.currentUser.id,
            presence: this.currentUser.presence,
        });
    }
    setupHeartbeat() {
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
    generateId() {
        return `collab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Obtém sessão ativa
     */
    getActiveSession() {
        return this.activeSession;
    }
    /**
     * Obtém usuário atual
     */
    getCurrentUser() {
        return this.currentUser;
    }
    /**
     * Obtém awareness
     */
    getAwareness() {
        return this.awareness;
    }
    // ========================================================================
    // EVENTS
    // ========================================================================
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }
    off(event, callback) {
        this.listeners.get(event)?.delete(callback);
    }
    emit(event, data) {
        this.listeners.get(event)?.forEach(cb => cb(data));
    }
    /**
     * Cleanup
     */
    dispose() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        for (const [sessionId] of this.sessions) {
            this.disconnect(sessionId);
        }
    }
};
exports.CollaborationEngine = CollaborationEngine;
exports.CollaborationEngine = CollaborationEngine = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], CollaborationEngine);
