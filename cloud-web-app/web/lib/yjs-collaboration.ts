'use client';

/** Battle-tested Yjs collaboration runtime for documents, scene objects, awareness and Monaco. */
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { Awareness } from 'y-protocols/awareness';
import type { IndexeddbPersistence } from 'y-indexeddb';

import {createComponentLogger, logger} from '@/lib/observability/logger'
import { generateYjsUserColor, sceneObjectFromYMap } from './yjs-collaboration-helpers';
import type { CollaborationConfig, CollaborationEventListener, CursorPosition, SceneObject, SelectionRange, UserInfo } from './yjs-collaboration-contracts';
export type { CollaborationConfig, CollaborationEventListener, CursorPosition, MonacoBinding, MonacoContentChange, MonacoEditorLike, MonacoModelLike, MonacoPosition, MonacoRangeLike, SceneObject, SelectionRange, UseCollaborationOptions, UserInfo, YTextDelta } from './yjs-collaboration-contracts';

const log = createComponentLogger('yjs-collaboration')

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
                color: config.user.color || generateYjsUserColor(config.user.id)
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

    disconnect(): void {
        this.clearConnectionTimeout();
        if (this.provider) {
            this.provider.disconnect();
        }
        this.config.onStatusChange?.('disconnected');
    }

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
                    color: String(rawState.user.color ?? generateYjsUserColor(String(rawState.user.id ?? clientId))),
                    avatar: rawState.user.avatar,
                    cursor: rawState.cursor,
                    selection: rawState.selection,
                });
            });
        }

        return users;
    }

    updateCursor(position: CursorPosition): void {
        this.awareness?.setLocalStateField('cursor', position);
    }

    updateSelection(selection: SelectionRange | null): void {
        this.awareness?.setLocalStateField('selection', selection);
    }

    getAwareness(): Awareness | null {
        return this.awareness;
    }

    getSharedMap<T = unknown>(name: string): Y.Map<T> {
        return this.doc.getMap<T>(name);
    }

    getLocalUser(): { id: string; name: string } {
        return {
            id: this.config.user.id,
            name: this.config.user.name,
        };
    }

    getLocalClientId(): number {
        return this.doc.clientID;
    }

    isOfflinePersistenceSynced(): boolean {
        return this.persistenceSynced;
    }

    async clearOfflineData(): Promise<void> {
        await this.persistence?.clearData();
        this.persistenceSynced = false;
    }

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

    getSceneObject(objectId: string): SceneObject | undefined {
        if (!this.sceneMap) return undefined;

        const objMap = this.sceneMap.get(objectId);
        if (!objMap) return undefined;

        return sceneObjectFromYMap(objMap);
    }

    getAllSceneObjects(): SceneObject[] {
        if (!this.sceneMap) return [];

        const objects: SceneObject[] = [];
        this.sceneMap.forEach((objMap) => {
            objects.push(sceneObjectFromYMap(objMap));
        });

        return objects;
    }

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

    observeScene(callback: (event: Y.YMapEvent<any>) => void): () => void {
        if (!this.sceneMap) return () => {};

        this.sceneMap.observeDeep(callback as any);
        return () => this.sceneMap?.unobserveDeep(callback as any);
    }

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

    getTextContent(name: string): string {
        return this.getText(name).toString();
    }

    setTextContent(name: string, content: string): void {
        const text = this.getText(name);
        text.delete(0, text.length);
        text.insert(0, content);
    }

    insertText(name: string, position: number, content: string): void {
        this.getText(name).insert(position, content);
    }

    deleteText(name: string, position: number, length: number): void {
        this.getText(name).delete(position, length);
    }

    undo(): void {
        this.undoManager?.undo();
    }

    redo(): void {
        this.undoManager?.redo();
    }

    canUndo(): boolean {
        return (this.undoManager?.undoStack.length ?? 0) > 0;
    }

    canRedo(): boolean {
        return (this.undoManager?.redoStack.length ?? 0) > 0;
    }

    transaction(fn: () => void): void {
        this.doc.transact(fn);
    }

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

    exportState(): Uint8Array {
        return Y.encodeStateAsUpdate(this.doc);
    }

    importState(state: Uint8Array): void {
        Y.applyUpdate(this.doc, state);
    }

    getStateVector(): Uint8Array {
        return Y.encodeStateVector(this.doc);
    }
}

export type { UseCollaborationResult } from './yjs-collaboration-react';
export { useYjsCollaboration } from './yjs-collaboration-react';
export { bindMonaco } from './yjs-collaboration-monaco';

export { Y };
export default CollaborationSession;
