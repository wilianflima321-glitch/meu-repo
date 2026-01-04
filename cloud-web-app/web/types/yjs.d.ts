/**
 * Type declarations for Yjs (Y.js) CRDT library
 * @see https://docs.yjs.dev/
 */

declare module 'yjs' {
  export class Doc {
    constructor(opts?: { guid?: string; gc?: boolean; gcFilter?: (item: any) => boolean });
    
    guid: string;
    clientID: number;
    
    /** Get a shared type */
    get<T extends AbstractType<any>>(name: string, TypeConstructor?: new () => T): T;
    getMap<T = any>(name?: string): YMap<T>;
    getArray<T = any>(name?: string): YArray<T>;
    getText(name?: string): YText;
    getXmlFragment(name?: string): YXmlFragment;
    
    /** Subscribe to updates */
    on(event: 'update', callback: (update: Uint8Array, origin: any, doc: Doc) => void): void;
    on(event: 'updateV2', callback: (update: Uint8Array, origin: any, doc: Doc) => void): void;
    on(event: 'beforeTransaction', callback: (transaction: Transaction, doc: Doc) => void): void;
    on(event: 'afterTransaction', callback: (transaction: Transaction, doc: Doc) => void): void;
    on(event: 'beforeAllTransactions', callback: (doc: Doc) => void): void;
    on(event: 'afterAllTransactions', callback: (doc: Doc, transactions: Transaction[]) => void): void;
    on(event: 'destroy', callback: (doc: Doc) => void): void;
    
    off(event: string, callback: Function): void;
    once(event: string, callback: Function): void;
    
    /** Transaction handling */
    transact<T>(fn: (transaction: Transaction) => T, origin?: any): T;
    
    /** Encoding */
    toJSON(): any;
    
    /** Cleanup */
    destroy(): void;
  }

  export class Transaction {
    doc: Doc;
    origin: any;
    local: boolean;
    changed: Map<AbstractType<any>, Set<string | null>>;
    changedParentTypes: Map<AbstractType<any>, any[]>;
  }

  export abstract class AbstractType<EventType> {
    doc: Doc | null;
    parent: AbstractType<any> | null;
    
    toJSON(): any;
    
    observe(f: (event: EventType, transaction: Transaction) => void): void;
    observeDeep(f: (events: any[], transaction: Transaction) => void): void;
    unobserve(f: Function): void;
    unobserveDeep(f: Function): void;
  }

  export interface YMapEvent<T> {
    target: YMap<T>;
    keysChanged: Set<string>;
    changes: {
      keys: Map<string, { action: 'add' | 'update' | 'delete'; oldValue?: T }>;
    };
  }

  export class YMap<T = any> extends AbstractType<YMapEvent<T>> {
    constructor(entries?: Iterable<[string, T]>);
    
    get size(): number;
    get(key: string): T | undefined;
    set(key: string, value: T): T;
    delete(key: string): void;
    has(key: string): boolean;
    clear(): void;
    
    keys(): IterableIterator<string>;
    values(): IterableIterator<T>;
    entries(): IterableIterator<[string, T]>;
    forEach(callback: (value: T, key: string, map: YMap<T>) => void): void;
    
    toJSON(): { [key: string]: any };
    clone(): YMap<T>;
  }

  export interface YArrayEvent<T> {
    target: YArray<T>;
    changes: {
      added: Set<any>;
      deleted: Set<any>;
      delta: { insert?: T[]; delete?: number; retain?: number }[];
    };
  }

  export class YArray<T = any> extends AbstractType<YArrayEvent<T>> {
    constructor(content?: T[]);
    
    get length(): number;
    get(index: number): T;
    
    insert(index: number, content: T[]): void;
    push(content: T[]): void;
    unshift(content: T[]): void;
    delete(index: number, length?: number): void;
    
    slice(start?: number, end?: number): T[];
    map<U>(callback: (value: T, index: number, array: YArray<T>) => U): U[];
    forEach(callback: (value: T, index: number, array: YArray<T>) => void): void;
    
    toArray(): T[];
    toJSON(): any[];
    clone(): YArray<T>;
  }

  export interface YTextEvent {
    target: YText;
    delta: { insert?: string; delete?: number; retain?: number; attributes?: object }[];
    changes: {
      added: Set<any>;
      deleted: Set<any>;
      delta: any[];
    };
  }

  export class YText extends AbstractType<YTextEvent> {
    constructor(text?: string);
    
    get length(): number;
    
    insert(index: number, text: string, attributes?: object): void;
    insertEmbed(index: number, embed: object, attributes?: object): void;
    delete(index: number, length: number): void;
    format(index: number, length: number, attributes: object): void;
    
    applyDelta(delta: any[]): void;
    toDelta(snapshot?: any, prevSnapshot?: any, computeYChange?: Function): any[];
    
    toString(): string;
    toJSON(): string;
    clone(): YText;
  }

  export interface YXmlEvent {
    target: YXmlElement | YXmlFragment;
  }

  export class YXmlFragment extends AbstractType<YXmlEvent> {
    constructor();
    
    get length(): number;
    get firstChild(): YXmlElement | YXmlText | null;
    
    insert(index: number, content: (YXmlElement | YXmlText)[]): void;
    delete(index: number, length?: number): void;
    get(index: number): YXmlElement | YXmlText;
    
    toArray(): (YXmlElement | YXmlText)[];
    createTreeWalker(filter: (type: any) => boolean): any;
    querySelector(query: string): YXmlElement | YXmlText | null;
    querySelectorAll(query: string): (YXmlElement | YXmlText)[];
    
    toString(): string;
    toJSON(): string;
    toDOM(): DocumentFragment;
  }

  export class YXmlElement extends YXmlFragment {
    constructor(nodeName?: string);
    
    nodeName: string;
    nextSibling: YXmlElement | YXmlText | null;
    prevSibling: YXmlElement | YXmlText | null;
    
    getAttribute(name: string): string | undefined;
    setAttribute(name: string, value: string): void;
    removeAttribute(name: string): void;
    hasAttribute(name: string): boolean;
    getAttributes(): { [key: string]: string };
  }

  export class YXmlText extends AbstractType<any> {
    constructor(text?: string);
    
    get length(): number;
    nextSibling: YXmlElement | YXmlText | null;
    prevSibling: YXmlElement | YXmlText | null;
    
    insert(index: number, text: string, attributes?: object): void;
    delete(index: number, length: number): void;
    format(index: number, length: number, attributes: object): void;
    
    toString(): string;
    toJSON(): string;
    toDelta(): any[];
  }

  /** Encoding functions */
  export function encodeStateAsUpdate(doc: Doc, encodedTargetStateVector?: Uint8Array): Uint8Array;
  export function encodeStateAsUpdateV2(doc: Doc, encodedTargetStateVector?: Uint8Array): Uint8Array;
  export function applyUpdate(doc: Doc, update: Uint8Array, origin?: any): void;
  export function applyUpdateV2(doc: Doc, update: Uint8Array, origin?: any): void;
  export function encodeStateVector(doc: Doc): Uint8Array;
  export function decodeStateVector(encodedStateVector: Uint8Array): Map<number, number>;
  
  /** Awareness */
  export class Awareness {
    constructor(doc: Doc);
    
    clientID: number;
    doc: Doc;
    
    getLocalState(): any;
    setLocalState(state: any): void;
    setLocalStateField(field: string, value: any): void;
    getStates(): Map<number, any>;
    
    on(event: 'change', callback: (changes: { added: number[]; updated: number[]; removed: number[] }, origin: any) => void): void;
    on(event: 'update', callback: (changes: { added: number[]; updated: number[]; removed: number[] }, origin: any) => void): void;
    off(event: string, callback: Function): void;
    
    destroy(): void;
  }

  /** Undo Manager */
  export class UndoManager {
    constructor(
      typeScope: AbstractType<any> | AbstractType<any>[],
      options?: {
        captureTimeout?: number;
        deleteFilter?: (item: any) => boolean;
        trackedOrigins?: Set<any>;
      }
    );
    
    undo(): any;
    redo(): any;
    
    canUndo(): boolean;
    canRedo(): boolean;
    
    clear(): void;
    stopCapturing(): void;
    
    on(event: 'stack-item-added', callback: (event: { stackItem: any; origin: any; type: 'undo' | 'redo' }) => void): void;
    on(event: 'stack-item-popped', callback: (event: { stackItem: any; origin: any; type: 'undo' | 'redo' }) => void): void;
    off(event: string, callback: Function): void;
    
    destroy(): void;
  }

  /** Relative positions */
  export function createRelativePositionFromTypeIndex(type: AbstractType<any>, index: number, assoc?: number): any;
  export function createAbsolutePositionFromRelativePosition(rpos: any, doc: Doc): { type: AbstractType<any>; index: number } | null;
  export function encodeRelativePosition(rpos: any): Uint8Array;
  export function decodeRelativePosition(encodedRpos: Uint8Array): any;
}

declare module 'y-websocket' {
  import { Doc, Awareness } from 'yjs';

  export interface WebsocketProviderOptions {
    awareness?: Awareness;
    params?: { [key: string]: string };
    WebSocketPolyfill?: typeof WebSocket;
    resyncInterval?: number;
    maxBackoffTime?: number;
    connect?: boolean;
    disableBc?: boolean;
  }

  export class WebsocketProvider {
    constructor(
      serverUrl: string,
      roomname: string,
      doc: Doc,
      options?: WebsocketProviderOptions
    );

    awareness: Awareness;
    roomname: string;
    doc: Doc;
    wsconnected: boolean;
    wsconnecting: boolean;
    synced: boolean;
    ws: WebSocket | null;
    shouldConnect: boolean;

    connect(): void;
    disconnect(): void;
    destroy(): void;

    on(event: 'status', callback: (status: { status: 'connecting' | 'connected' | 'disconnected' }) => void): void;
    on(event: 'sync', callback: (synced: boolean) => void): void;
    on(event: 'connection-close', callback: (event: CloseEvent, provider: WebsocketProvider) => void): void;
    on(event: 'connection-error', callback: (event: Event, provider: WebsocketProvider) => void): void;
    off(event: string, callback: Function): void;
  }

  export class WebrtcProvider {
    constructor(roomname: string, doc: Doc, options?: {
      signaling?: string[];
      password?: string | null;
      awareness?: Awareness;
      maxConns?: number;
      filterBcConns?: boolean;
      peerOpts?: any;
    });

    awareness: Awareness;
    roomname: string;
    doc: Doc;
    connected: boolean;

    connect(): void;
    disconnect(): void;
    destroy(): void;

    on(event: 'synced', callback: (synced: { synced: boolean }) => void): void;
    on(event: 'peers', callback: (peers: { webrtcPeers: any[]; bcPeers: any[] }) => void): void;
    off(event: string, callback: Function): void;
  }
}

declare module 'y-indexeddb' {
  import { Doc } from 'yjs';

  export class IndexeddbPersistence {
    constructor(name: string, doc: Doc);

    name: string;
    doc: Doc;
    synced: boolean;
    db: IDBDatabase | null;

    whenSynced: Promise<IndexeddbPersistence>;

    destroy(): Promise<void>;
    clearData(): Promise<void>;

    on(event: 'synced', callback: (provider: IndexeddbPersistence) => void): void;
    off(event: string, callback: Function): void;
  }
}
