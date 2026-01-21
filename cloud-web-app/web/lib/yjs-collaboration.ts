/**
 * AETHEL ENGINE - YJS COLLABORATION MODULE
 * ========================================
 * 
 * Módulo de colaboração em tempo real padronizado usando Yjs.
 * Substitui qualquer implementação CRDT customizada.
 * 
 * Yjs é battle-tested e suporta:
 * - Monaco Editor nativamente
 * - Quill, ProseMirror, etc.
 * - WebSocket e WebRTC providers
 * - Awareness (cursores, seleção, etc.)
 */

'use client';

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { Awareness } from 'y-protocols/awareness';

// ============================================================================
// TYPES
// ============================================================================

export interface UserInfo {
    id: string;
    name: string;
    color: string;
    cursor?: CursorPosition;
    selection?: SelectionRange;
}

export interface CursorPosition {
    x: number;
    y: number;
    z?: number;
}

export interface SelectionRange {
    start: { index: number; length: number };
    end: { index: number; length: number };
}

export interface CollaborationConfig {
    documentName: string;
    serverUrl?: string;
    user: {
        id: string;
        name: string;
        color?: string;
    };
    onSync?: () => void;
    onStatusChange?: (status: 'connecting' | 'connected' | 'disconnected') => void;
    onAwarenessChange?: (users: Map<number, UserInfo>) => void;
}

export interface SceneObject {
    id: string;
    type: string;
    name: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
    visible: boolean;
    locked: boolean;
    lockedBy?: string;
    parentId?: string;
    children?: string[];
    properties: Record<string, any>;
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
    private listeners: Map<string, Set<(data: any) => void>> = new Map();
    private isDestroyed = false;
    
    // Yjs data structures
    private sceneMap: Y.Map<Y.Map<any>> | null = null;
    private textMap: Y.Map<Y.Text> | null = null;
    private undoManager: Y.UndoManager | null = null;
    
    constructor(config: CollaborationConfig) {
        this.config = {
            ...config,
            serverUrl: config.serverUrl || 'ws://localhost:4000',
            user: {
                ...config.user,
                color: config.user.color || generateUserColor(config.user.id)
            }
        };
        
        // Create Yjs document
        this.doc = new Y.Doc();
        
        // Initialize shared types
        this.initializeSharedTypes();
        
        console.log(`🔗 CollaborationSession created for document: ${config.documentName}`);
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
                setTimeout(() => {
                    if (this.provider?.wsconnected === false) {
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
        this.doc.destroy();
        this.listeners.clear();
        console.log(`🔗 CollaborationSession destroyed: ${this.config.documentName}`);
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
                if (state.user) {
                    users.set(clientId, state.user as UserInfo);
                }
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
     * Get local client ID
     */
    getLocalClientId(): number {
        return this.doc.clientID;
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
            console.warn(`Object not found: ${objectId}`);
            return;
        }
        
        // Check if object is locked by another user
        const lockedBy = objMap.get('lockedBy');
        if (lockedBy && lockedBy !== this.config.user.id) {
            console.warn(`Object ${objectId} is locked by ${lockedBy}`);
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
            console.warn(`Object ${objectId} is locked by ${lockedBy}`);
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
        
        return {
            id: objMap.get('id'),
            type: objMap.get('type'),
            name: objMap.get('name'),
            position: objMap.get('position'),
            rotation: objMap.get('rotation'),
            scale: objMap.get('scale'),
            visible: objMap.get('visible'),
            locked: objMap.get('locked'),
            lockedBy: objMap.get('lockedBy'),
            parentId: objMap.get('parentId'),
            children: objMap.get('children'),
            properties: objMap.get('properties')
        };
    }
    
    /**
     * Get all scene objects
     */
    getAllSceneObjects(): SceneObject[] {
        if (!this.sceneMap) return [];
        
        const objects: SceneObject[] = [];
        this.sceneMap.forEach((objMap) => {
            objects.push({
                id: objMap.get('id'),
                type: objMap.get('type'),
                name: objMap.get('name'),
                position: objMap.get('position'),
                rotation: objMap.get('rotation'),
                scale: objMap.get('scale'),
                visible: objMap.get('visible'),
                locked: objMap.get('locked'),
                lockedBy: objMap.get('lockedBy'),
                parentId: objMap.get('parentId'),
                children: objMap.get('children'),
                properties: objMap.get('properties')
            });
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
    
    on(event: string, callback: (data: any) => void): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
        
        return () => {
            this.listeners.get(event)?.delete(callback);
        };
    }
    
    private emit(event: string, data: any): void {
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

export interface UseCollaborationOptions {
    documentName: string;
    serverUrl?: string;
    userId: string;
    userName: string;
    userColor?: string;
}

export interface UseCollaborationResult {
    session: CollaborationSession | null;
    isConnected: boolean;
    isSynced: boolean;
    users: UserInfo[];
    error: Error | null;
    connect: () => Promise<void>;
    disconnect: () => void;
}

export function useYjsCollaboration(options: UseCollaborationOptions): UseCollaborationResult {
    const [isConnected, setIsConnected] = useState(false);
    const [isSynced, setIsSynced] = useState(false);
    const [users, setUsers] = useState<UserInfo[]>([]);
    const [error, setError] = useState<Error | null>(null);
    const sessionRef = useRef<CollaborationSession | null>(null);
    
    useEffect(() => {
        // Create session
        sessionRef.current = new CollaborationSession({
            documentName: options.documentName,
            serverUrl: options.serverUrl,
            user: {
                id: options.userId,
                name: options.userName,
                color: options.userColor
            },
            onSync: () => setIsSynced(true),
            onStatusChange: (status) => {
                setIsConnected(status === 'connected');
            },
            onAwarenessChange: (userMap) => {
                setUsers(Array.from(userMap.values()));
            }
        });
        
        return () => {
            sessionRef.current?.destroy();
            sessionRef.current = null;
        };
    }, [options.documentName, options.serverUrl, options.userId, options.userName, options.userColor]);
    
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
    
    return {
        session: sessionRef.current,
        isConnected,
        isSynced,
        users,
        error,
        connect,
        disconnect
    };
}

// ============================================================================
// MONACO EDITOR BINDING
// ============================================================================

export interface MonacoBinding {
    destroy: () => void;
}

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
    editor: any // Monaco editor instance
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
        event.delta.forEach((delta: any) => {
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
    const disposable = model.onDidChangeContent((event: any) => {
        if (isUpdating) return;
        
        isUpdating = true;
        
        event.changes.forEach((change: any) => {
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
