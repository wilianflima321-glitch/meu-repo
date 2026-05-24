'use client';

/** Battle-tested Yjs collaboration runtime for documents, scene objects, awareness and Monaco. */
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { Awareness } from 'y-protocols/awareness';
import type { IndexeddbPersistence } from 'y-indexeddb';

import {createComponentLogger, logger} from '@/lib/observability/logger'
import type { CollaborationConfig, CollaborationEventListener, CursorPosition, MonacoBinding, MonacoContentChange, MonacoEditorLike, MonacoModelLike, MonacoPosition, MonacoRangeLike, SceneObject, SelectionRange, UseCollaborationOptions, UseCollaborationResult as BaseUseCollaborationResult, UserInfo, YTextDelta } from './yjs-collaboration-contracts';
export type { CollaborationConfig, CollaborationEventListener, CursorPosition, MonacoBinding, MonacoContentChange, MonacoEditorLike, MonacoModelLike, MonacoPosition, MonacoRangeLike, SceneObject, SelectionRange, UseCollaborationOptions, UserInfo, YTextDelta } from './yjs-collaboration-contracts';

const log = createComponentLogger('yjs-collaboration')

function isVector3(value: unknown): value is SceneObject['position'] {
    return typeof value === 'object' &&
        value !== null &&
        typeof (value as { x?: unknown }).x === 'number' &&
        typeof (value as { y?: unknown }).y === 'number' &&
        typeof (value as { z?: unknown }).z === 'number';
}

function readString(map: Y.Map<unknown>, key: string, fallback = ''): string {
    const value = map.get(key);
    return typeof value === 'string' ? value : fallback;
}

function readBoolean(map: Y.Map<unknown>, key: string, fallback = false): boolean {
    const value = map.get(key);
    return typeof value === 'boolean' ? value : fallback;
}

function readOptionalString(map: Y.Map<unknown>, key: string): string | undefined {
    const value = map.get(key);
    return typeof value === 'string' ? value : undefined;
}

function readStringArray(map: Y.Map<unknown>, key: string): string[] | undefined {
    const value = map.get(key);
    return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
        ? value
        : undefined;
}

function readVector(map: Y.Map<unknown>, key: string): SceneObject['position'] {
    const value = map.get(key);
    return isVector3(value) ? value : { x: 0, y: 0, z: 0 };
}

function readProperties(map: Y.Map<unknown>): Record<string, unknown> {
    const value = map.get('properties');
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
}

function sceneObjectFromMap(objMap: Y.Map<unknown>): SceneObject {
    return {
        id: readString(objMap, 'id'),
        type: readString(objMap, 'type'),
        name: readString(objMap, 'name'),
        position: readVector(objMap, 'position'),
        rotation: readVector(objMap, 'rotation'),
        scale: readVector(objMap, 'scale'),
        visible: readBoolean(objMap, 'visible'),
        locked: readBoolean(objMap, 'locked'),
        lockedBy: readOptionalString(objMap, 'lockedBy'),
        parentId: readOptionalString(objMap, 'parentId'),
        children: readStringArray(objMap, 'children'),
        properties: readProperties(objMap),
    };
}

// ============================================================================
// COLOR GENERATOR
// ============================================================================

const COLORS = [
    '#e63946', '#f4a261', '#2a9d8f', '#264653',
    '#e76f51', '#f1c40f', '#9b59b6', '#3498db',
    '#1abc9c', '#e74c3c', '#2ecc71', '#f39c12'
];

function generateUserColor(userId: string): string {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return COLORS[Math.abs(hash) % COLORS.length];
}

// ============================================================================
// COLLABORATION SESSION
// ============================================================================

export class CollaborationSession {
    private doc: Y.Doc;
    private provider: WebsocketProvider | null = null;
    private awareness: Awareness | null = null;
    private config: CollaborationConfig;
    private listeners: Map<string, Set<CollaborationEventListener>> = new Map();
    private isDestroyed = false;
    private persistence: IndexeddbPersistence | null = null;
    private persistenceSynced = false;
    private connectionTimeout: ReturnType<typeof setTimeout> | null = null;
    
    // Yjs data structures
    private sceneMap: Y.Map<Y.Map<unknown>> | null = null;
    private textMap: Y.Map<Y.Text> | null = null;
    private undoManager: Y.UndoManager | null = null;
    
    constructor(config: CollaborationConfig) {
        this.config = {
            ...config,
            serverUrl: config.serverUrl || process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
            user: {
                ...config.user,
                color: config.user.color || generateUserColor(config.user.id)
            }
        };
        
        // Create Yjs document
        this.doc = new Y.Doc();
        
        // Initialize shared types
        this.initializeSharedTypes();
        this.initializeOfflinePersistence();
        
        log.info(`🔗 CollaborationSession created for document: ${config.documentName}`);
    }
    
    private initializeSharedTypes(): void {
        // Scene objects (3D scenes, levels, blueprints)
        this.sceneMap = this.doc.getMap('scene');
        
        // Text content (scripts, notes)
        this.textMap = this.doc.getMap('text');
        
        // Setup undo manager for scene
        this.undoManager = new Y.UndoManager(this.sceneMap, {
            captureTimeout: 500
        });
    }

    private getPersistenceName(): string {
        const rawName = this.config.persistenceName || this.config.documentName;
        return `aethel-yjs-${rawName.replace(/[^a-zA-Z0-9:_-]/g, '-')}`;
    }

    private markPersistenceSynced(): void {
        if (this.isDestroyed) return;
        if (this.persistenceSynced) return;
        this.persistenceSynced = true;
        this.config.onPersistenceSync?.();
        this.emit('persistence-synced', { name: this.getPersistenceName() });
    }

    private initializeOfflinePersistence(): void {
        if (this.config.persistenceEnabled === false || typeof window === 'undefined') {
            return;
        }

        void import('y-indexeddb')
            .then(({ IndexeddbPersistence }) => {
                if (this.isDestroyed) return;
                const persistence = new IndexeddbPersistence(this.getPersistenceName(), this.doc);
                this.persistence = persistence;
                persistence.on('synced', () => this.markPersistenceSynced());
                void persistence.whenSynced.then(() => this.markPersistenceSynced());
            })
            .catch((error) => {
                log.warn('Offline collaboration persistence unavailable', { error });
            });
    }

    private clearConnectionTimeout(): void {
        if (!this.connectionTimeout) return;
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
    }
    
    /**
     * Connect to collaboration server
     */
    async connect(): Promise<void> {
        if (this.isDestroyed) {
            throw new Error('Session has been destroyed');
        }
        
        return new Promise((resolve, reject) => {
            try {
                this.config.onStatusChange?.('connecting');
                
                // Create WebSocket provider
                this.provider = new WebsocketProvider(
                    this.config.serverUrl!,
                    this.config.documentName,
                    this.doc,
                    { connect: true }
                );
                
                this.awareness = this.provider.awareness;
                
                // Set local user state
                if (this.awareness) {
                    this.awareness.setLocalStateField('user', {
                        id: this.config.user.id,
                        name: this.config.user.name,
                        color: this.config.user.color
                    });
                }
                
                // Handle sync
                this.provider.on('sync', (isSynced: boolean) => {
                    if (isSynced) {
                        this.clearConnectionTimeout();
                        this.config.onSync?.();
                        this.emit('sync', {});
                        resolve();
                    }
                });
                
                // Handle status changes
                this.provider.on('status', (event: { status: string }) => {
                    const status = event.status === 'connected' ? 'connected' : 'disconnected';
                    this.config.onStatusChange?.(status);
                    this.emit('status', { status });
                });
                
                // Handle awareness changes
                this.awareness?.on('change', () => {
                    const users = this.getConnectedUsers();
                    this.config.onAwarenessChange?.(users);
                    this.emit('awareness', { users: Array.from(users.values()) });
                });
                
                // Set timeout for connection
                this.clearConnectionTimeout();
                this.connectionTimeout = setTimeout(() => {
                    if (this.provider?.wsconnected === false) {
                        this.connectionTimeout = null;
                        reject(new Error('Connection timeout'));
                    }
                }, 10000);
                
            } catch (err) {
                reject(err);
            }
        });
    }
    
    /**
     * Disconnect from server
     */
    disconnect(): void {
        this.clearConnectionTimeout();
        if (this.provider) {
            this.provider.disconnect();
        }
        this.config.onStatusChange?.('disconnected');
    }
    
    /**
     * Destroy session and cleanup
     */
    destroy(): void {
        this.isDestroyed = true;
        this.disconnect();
        this.provider?.destroy();
        void this.persistence?.destroy();
        this.persistence = null;
        this.doc.destroy();
        this.listeners.clear();
        log.info(`🔗 CollaborationSession destroyed: ${this.config.documentName}`);
    }
    
    // ========================================================================
    // USER AWARENESS
    // ========================================================================
    
    /**
     * Get all connected users
     */
    getConnectedUsers(): Map<number, UserInfo> {
        const users = new Map<number, UserInfo>();
        
        if (this.awareness) {
            this.awareness.getStates().forEach((state, clientId) => {
                const rawState = state as {
                    user?: Partial<UserInfo>;
                    cursor?: CursorPosition;
                    selection?: SelectionRange;
                };

                if (!rawState.user) {
                    return;
                }

                users.set(clientId, {
                    id: String(rawState.user.id ?? clientId),
                    name: String(rawState.user.name ?? 'Guest'),
                    color: String(rawState.user.color ?? generateUserColor(String(rawState.user.id ?? clientId))),
                    avatar: rawState.user.avatar,
                    cursor: rawState.cursor,
                    selection: rawState.selection,
                });
            });
        }
        
        return users;
    }
    
    /**
     * Update local cursor position
     */
    updateCursor(position: CursorPosition): void {
        this.awareness?.setLocalStateField('cursor', position);
    }
    
    /**
     * Update local selection
     */
    updateSelection(selection: SelectionRange | null): void {
        this.awareness?.setLocalStateField('selection', selection);
    }

    /**
     * Expose awareness for native editor bindings such as y-monaco.
     */
    getAwareness(): Awareness | null {
        return this.awareness;
    }

    /**
     * Expose a named Y.Map for collaborative side-channel data such as inline
     * review comments. Callers must own their map key namespace.
     */
    getSharedMap<T = unknown>(name: string): Y.Map<T> {
        return this.doc.getMap<T>(name);
    }

    /**
     * Return the local user metadata for features that need author attribution.
     */
    getLocalUser(): { id: string; name: string } {
        return {
            id: this.config.user.id,
            name: this.config.user.name,
        };
    }
    
    /**
     * Get local client ID
     */
    getLocalClientId(): number {
        return this.doc.clientID;
    }

    /**
     * Whether IndexedDB has loaded local Yjs state for this document.
     */
    isOfflinePersistenceSynced(): boolean {
        return this.persistenceSynced;
    }

    /**
     * Clear this document's offline cache. Useful for support/debug flows.
     */
    async clearOfflineData(): Promise<void> {
        await this.persistence?.clearData();
        this.persistenceSynced = false;
    }
    
    // ========================================================================
    // SCENE OPERATIONS
    // ========================================================================
    
    /**
     * Add object to scene
     */
    addSceneObject(object: SceneObject): void {
        if (!this.sceneMap) return;
        
        const objMap = new Y.Map<any>();
        objMap.set('id', object.id);
        objMap.set('type', object.type);
        objMap.set('name', object.name);
        objMap.set('position', object.position);
        objMap.set('rotation', object.rotation);
        objMap.set('scale', object.scale);
        objMap.set('visible', object.visible);
        objMap.set('locked', object.locked);
        objMap.set('lockedBy', object.lockedBy || null);
        objMap.set('parentId', object.parentId || null);
        objMap.set('children', object.children || []);
        objMap.set('properties', object.properties);
        
        this.sceneMap.set(object.id, objMap);
        
        this.emit('object-added', object);
    }
    
    /**
     * Update scene object
     */
    updateSceneObject(objectId: string, updates: Partial<SceneObject>): void {
        if (!this.sceneMap) return;
        
        const objMap = this.sceneMap.get(objectId);
        if (!objMap) {
            logger.warn(`Object not found: ${objectId}`);
            return;
        }
        
        // Check if object is locked by another user
        const lockedBy = objMap.get('lockedBy');
        if (lockedBy && lockedBy !== this.config.user.id) {
            logger.warn(`Object ${objectId} is locked by ${lockedBy}`);
            return;
        }
        
        // Apply updates
        Object.entries(updates).forEach(([key, value]) => {
            objMap.set(key, value);
        });
        
        this.emit('object-updated', { id: objectId, updates });
    }
    
    /**
     * Remove object from scene
     */
    removeSceneObject(objectId: string): void {
        if (!this.sceneMap) return;
        
        const objMap = this.sceneMap.get(objectId);
        if (!objMap) return;
        
        // Check if object is locked
        const lockedBy = objMap.get('lockedBy');
        if (lockedBy && lockedBy !== this.config.user.id) {
            logger.warn(`Object ${objectId} is locked by ${lockedBy}`);
            return;
        }
        
        this.sceneMap.delete(objectId);
        
        this.emit('object-removed', { id: objectId });
    }
    
    /**
     * Get scene object
     */
    getSceneObject(objectId: string): SceneObject | undefined {
        if (!this.sceneMap) return undefined;
        
        const objMap = this.sceneMap.get(objectId);
        if (!objMap) return undefined;
        
        return sceneObjectFromMap(objMap);
    }
    
    /**
     * Get all scene objects
     */
    getAllSceneObjects(): SceneObject[] {
        if (!this.sceneMap) return [];
        
        const objects: SceneObject[] = [];
        this.sceneMap.forEach((objMap) => {
            objects.push(sceneObjectFromMap(objMap));
        });
        
        return objects;
    }
    
    /**
     * Lock object for editing
     */
    lockObject(objectId: string): boolean {
        if (!this.sceneMap) return false;
        
        const objMap = this.sceneMap.get(objectId);
        if (!objMap) return false;
        
        const currentLock = objMap.get('lockedBy');
        if (currentLock && currentLock !== this.config.user.id) {
            return false; // Already locked by another user
        }
        
        objMap.set('locked', true);
        objMap.set('lockedBy', this.config.user.id);
        
        return true;
    }
    
    /**
     * Unlock object
     */
    unlockObject(objectId: string): boolean {
        if (!this.sceneMap) return false;
        
        const objMap = this.sceneMap.get(objectId);
        if (!objMap) return false;
        
        const currentLock = objMap.get('lockedBy');
        if (currentLock && currentLock !== this.config.user.id) {
            return false; // Can't unlock another user's lock
        }
        
        objMap.set('locked', false);
        objMap.set('lockedBy', null);
        
        return true;
    }
    
    /**
     * Observe scene changes
     */
    observeScene(callback: (event: Y.YMapEvent<any>) => void): () => void {
        if (!this.sceneMap) return () => {};
        
        this.sceneMap.observeDeep(callback as any);
        return () => this.sceneMap?.unobserveDeep(callback as any);
    }
    
    // ========================================================================
    // TEXT OPERATIONS
    // ========================================================================
    
    /**
     * Get or create a text document
     */
    getText(name: string): Y.Text {
        if (!this.textMap) {
            throw new Error('Collaboration session not initialized');
        }
        
        let text = this.textMap.get(name);
        if (!text) {
            text = new Y.Text();
            this.textMap.set(name, text);
        }
        
        return text;
    }
    
    /**
     * Get text content as string
     */
    getTextContent(name: string): string {
        return this.getText(name).toString();
    }
    
    /**
     * Set text content
     */
    setTextContent(name: string, content: string): void {
        const text = this.getText(name);
        text.delete(0, text.length);
        text.insert(0, content);
    }
    
    /**
     * Insert text at position
     */
    insertText(name: string, position: number, content: string): void {
        this.getText(name).insert(position, content);
    }
    
    /**
     * Delete text range
     */
    deleteText(name: string, position: number, length: number): void {
        this.getText(name).delete(position, length);
    }
    
    // ========================================================================
    // UNDO/REDO
    // ========================================================================
    
    /**
     * Undo last change
     */
    undo(): void {
        this.undoManager?.undo();
    }
    
    /**
     * Redo last undone change
     */
    redo(): void {
        this.undoManager?.redo();
    }
    
    /**
     * Check if can undo
     */
    canUndo(): boolean {
        return (this.undoManager?.undoStack.length ?? 0) > 0;
    }
    
    /**
     * Check if can redo
     */
    canRedo(): boolean {
        return (this.undoManager?.redoStack.length ?? 0) > 0;
    }
    
    // ========================================================================
    // TRANSACTIONS
    // ========================================================================
    
    /**
     * Execute operations in a single transaction
     */
    transaction(fn: () => void): void {
        this.doc.transact(fn);
    }
    
    // ========================================================================
    // EVENTS
    // ========================================================================
    
    on(event: string, callback: CollaborationEventListener): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
        
        return () => {
            this.listeners.get(event)?.delete(callback);
        };
    }
    
    private emit(event: string, data: unknown): void {
        this.listeners.get(event)?.forEach(cb => cb(data));
    }
    
    // ========================================================================
    // EXPORT/IMPORT
    // ========================================================================
    
    /**
     * Export document state
     */
    exportState(): Uint8Array {
        return Y.encodeStateAsUpdate(this.doc);
    }
    
    /**
     * Import document state
     */
    importState(state: Uint8Array): void {
        Y.applyUpdate(this.doc, state);
    }
    
    /**
     * Get state vector (for syncing)
     */
    getStateVector(): Uint8Array {
        return Y.encodeStateVector(this.doc);
    }
}

// ============================================================================
// REACT HOOK
// ============================================================================

import { useState, useEffect, useRef, useCallback } from 'react';

export type UseCollaborationResult = BaseUseCollaborationResult<CollaborationSession>;

export function useYjsCollaboration(options: UseCollaborationOptions): UseCollaborationResult {
    const [session, setSession] = useState<CollaborationSession | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isSynced, setIsSynced] = useState(false);
    const [isPersistenceSynced, setIsPersistenceSynced] = useState(false);
    const [users, setUsers] = useState<UserInfo[]>([]);
    const [error, setError] = useState<Error | null>(null);
    const sessionRef = useRef<CollaborationSession | null>(null);
    
    useEffect(() => {
        // Create session
        const nextSession = new CollaborationSession({
            documentName: options.documentName,
            serverUrl: options.serverUrl,
            persistenceEnabled: options.persistenceEnabled,
            persistenceName: options.persistenceName,
            user: {
                id: options.userId,
                name: options.userName,
                color: options.userColor
            },
            onSync: () => setIsSynced(true),
            onPersistenceSync: () => setIsPersistenceSynced(true),
            onStatusChange: (status) => {
                setIsConnected(status === 'connected');
            },
            onAwarenessChange: (userMap) => {
                setUsers(Array.from(userMap.values()));
            }
        });
        sessionRef.current = nextSession;
        setSession(nextSession);
        
        return () => {
            sessionRef.current?.destroy();
            sessionRef.current = null;
            setSession(null);
            setIsPersistenceSynced(false);
        };
    }, [options.documentName, options.persistenceEnabled, options.persistenceName, options.serverUrl, options.userId, options.userName, options.userColor]);
    
    const connect = useCallback(async () => {
        try {
            setError(null);
            await sessionRef.current?.connect();
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    }, []);
    
    const disconnect = useCallback(() => {
        sessionRef.current?.disconnect();
        setIsConnected(false);
        setIsSynced(false);
    }, []);

    const updateCursor = useCallback((position: CursorPosition) => {
        sessionRef.current?.updateCursor(position);
    }, []);

    const updateSelection = useCallback((selection: SelectionRange | null) => {
        sessionRef.current?.updateSelection(selection);
    }, []);
    
    return {
        session,
        isConnected,
        isSynced,
        isPersistenceSynced,
        users,
        error,
        connect,
        disconnect,
        updateCursor,
        updateSelection
    };
}

// ============================================================================
// MONACO EDITOR BINDING
// ============================================================================

/**
 * Bind Yjs to Monaco Editor
 * 
 * Usage:
 *   const binding = bindMonaco(session, 'script.py', editor);
 *   // ... later
 *   binding.destroy();
 */
export function bindMonaco(
    session: CollaborationSession,
    textName: string,
    editor: MonacoEditorLike
): MonacoBinding {
    const text = session.getText(textName);
    const model = editor.getModel();
    
    if (!model) {
        throw new Error('Editor has no model');
    }
    
    let isUpdating = false;
    
    // Sync Yjs -> Monaco
    const observer = (event: Y.YTextEvent) => {
        if (isUpdating) return;
        
        isUpdating = true;
        
        // Apply deltas to Monaco
        event.delta.forEach((delta: YTextDelta) => {
            if (delta.retain) {
                // Skip
            } else if (delta.insert) {
                // Insert
                const position = model.getPositionAt(delta.retain || 0);
                editor.executeEdits('yjs', [{
                    range: {
                        startLineNumber: position.lineNumber,
                        startColumn: position.column,
                        endLineNumber: position.lineNumber,
                        endColumn: position.column
                    },
                    text: delta.insert
                }]);
            } else if (delta.delete) {
                // Delete
                const startPosition = model.getPositionAt(delta.retain || 0);
                const endPosition = model.getPositionAt((delta.retain || 0) + delta.delete);
                editor.executeEdits('yjs', [{
                    range: {
                        startLineNumber: startPosition.lineNumber,
                        startColumn: startPosition.column,
                        endLineNumber: endPosition.lineNumber,
                        endColumn: endPosition.column
                    },
                    text: ''
                }]);
            }
        });
        
        isUpdating = false;
    };
    
    text.observe(observer);
    
    // Sync Monaco -> Yjs
    const disposable = model.onDidChangeContent((event) => {
        if (isUpdating) return;
        
        isUpdating = true;
        
        event.changes.forEach((change) => {
            const startOffset = model.getOffsetAt({
                lineNumber: change.range.startLineNumber,
                column: change.range.startColumn
            });
            
            session.transaction(() => {
                // Delete old text
                if (change.rangeLength > 0) {
                    text.delete(startOffset, change.rangeLength);
                }
                
                // Insert new text
                if (change.text) {
                    text.insert(startOffset, change.text);
                }
            });
        });
        
        isUpdating = false;
    });
    
    // Initial sync
    if (text.length > 0 && model.getValue() !== text.toString()) {
        model.setValue(text.toString());
    }
    
    return {
        destroy: () => {
            text.unobserve(observer);
            disposable.dispose();
        }
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

export { Y };
export default CollaborationSession;
