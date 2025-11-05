import { Disposable, Emitter, Event, URI } from '@theia/core';
export interface ChangeSetElement {
    readonly uri: URI;
    onDidChange?: Event<void>;
    readonly name?: string;
    readonly icon?: string;
    readonly additionalInfo?: string;
    readonly state?: 'pending' | 'applied' | 'stale';
    readonly type?: 'add' | 'modify' | 'delete';
    readonly data?: {
        [key: string]: unknown;
    };
    /** Called when an element is shown in the UI */
    onShow?(): void;
    /** Called when an element is hidden in the UI */
    onHide?(): void;
    open?(): Promise<void>;
    openChange?(): Promise<void>;
    apply?(): Promise<void>;
    revert?(): Promise<void>;
    dispose?(): void;
}
export interface ChatUpdateChangeSetEvent {
    kind: 'updateChangeSet';
    elements?: ChangeSetElement[];
    title?: string;
}
export interface ChangeSetChangeEvent {
    title?: string;
    added?: URI[];
    removed?: URI[];
    modified?: URI[];
    /** Fired when only the state of a given element changes, not its contents */
    state?: URI[];
}
export interface ChangeSet extends Disposable {
    onDidChange: Event<ChatUpdateChangeSetEvent>;
    readonly title: string;
    setTitle(title: string): void;
    getElements(): ChangeSetElement[];
    /**
     * Find an element by URI.
     * @param uri The URI to look for.
     * @returns The element with the given URI, or undefined if not found.
     */
    getElementByURI(uri: URI): ChangeSetElement | undefined;
    /** @returns true if addition produces a change; false otherwise. */
    addElements(...elements: ChangeSetElement[]): boolean;
    setElements(...elements: ChangeSetElement[]): void;
    /** @returns true if deletion produces a change; false otherwise. */
    removeElements(...uris: URI[]): boolean;
    dispose(): void;
}
export declare class ChangeSetImpl implements ChangeSet {
    /** @param changeSets ordered from tip to root. */
    static combine(changeSets: Iterable<ChangeSetImpl>): Map<string, ChangeSetElement | undefined>;
    protected readonly _onDidChangeEmitter: Emitter<ChatUpdateChangeSetEvent>;
    onDidChange: Event<ChatUpdateChangeSetEvent>;
    protected readonly _onDidChangeContentsEmitter: Emitter<ChangeSetChangeEvent>;
    onDidChangeContents: Event<ChangeSetChangeEvent>;
    protected hasBeenSet: boolean;
    protected _elements: Map<string, ChangeSetElement | undefined>;
    protected _title: string;
    get title(): string;
    constructor(elements?: ChangeSetElement[]);
    getElements(): ChangeSetElement[];
    /** Will replace any element that is already present, using URI as identity criterion. */
    addElements(...elements: ChangeSetElement[]): boolean;
    setTitle(title: string): void;
    protected doAdd(element: ChangeSetElement): boolean;
    setElements(...elements: ChangeSetElement[]): void;
    removeElements(...uris: URI[]): boolean;
    getElementByURI(uri: URI): ChangeSetElement | undefined;
    protected doDelete(uri: URI): boolean;
    protected notifyChange(change: ChangeSetChangeEvent): void;
    dispose(): void;
}
//# sourceMappingURL=change-set.d.ts.map