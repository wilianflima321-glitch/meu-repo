import { ConfigurableInMemoryResources, ConfigurableMutableReferenceResource } from '@theia/ai-core';
import { DisposableCollection, Emitter, URI } from '@theia/core';
import { Replacement } from '@theia/core/lib/common/content-replacer';
import { EditorPreferences } from '@theia/editor/lib/common/editor-preferences';
import { FileSystemPreferences } from '@theia/filesystem/lib/common';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { MonacoTextModelService } from '@theia/monaco/lib/browser/monaco-text-model-service';
import { MonacoEditorModel } from '@theia/monaco/lib/browser/monaco-editor-model';
import { ChangeSetElement } from '../common';
import { ChangeSetFileService } from './change-set-file-service';
import { Deferred } from '@theia/core/lib/common/promise-util';
import { MonacoCodeActionService } from '@theia/monaco/lib/browser';
export declare const ChangeSetFileElementFactory: unique symbol;
export type ChangeSetFileElementFactory = (elementProps: ChangeSetElementArgs) => ChangeSetFileElement;
type ChangeSetElementState = ChangeSetElement['state'];
export declare const ChangeSetElementArgs: unique symbol;
export interface ChangeSetElementArgs extends Partial<ChangeSetElement> {
    /** The URI of the element, expected to be unique within the same change set. */
    uri: URI;
    /** The id of the chat session containing this change set element. */
    chatSessionId: string;
    /** The id of the request with which this change set element is associated. */
    requestId: string;
    /**
     * The state of the file after the changes have been applied.
     * If `undefined`, there is no change.
     */
    targetState?: string;
    /**
     * The state before the change has been applied. If it is specified, we don't care
     * about the state of the original file on disk but just use the specified `originalState`.
     * If it isn't specified, we'll derived and observe the state from the file system.
     */
    originalState?: string;
    /**
     * An array of replacements used to create the new content for the targetState.
     * This is only available if the agent was able to provide replacements and we were able to apply them.
     */
    replacements?: Replacement[];
}
export declare class ChangeSetFileElement implements ChangeSetElement {
    static toReadOnlyUri(baseUri: URI, sessionId: string): URI;
    protected readonly elementProps: ChangeSetElementArgs;
    protected readonly changeSetFileService: ChangeSetFileService;
    protected readonly fileService: FileService;
    protected readonly inMemoryResources: ConfigurableInMemoryResources;
    protected readonly monacoTextModelService: MonacoTextModelService;
    protected readonly editorPreferences: EditorPreferences;
    protected readonly fileSystemPreferences: FileSystemPreferences;
    protected readonly codeActionService: MonacoCodeActionService;
    protected readonly toDispose: DisposableCollection;
    protected _state: ChangeSetElementState;
    private _originalContent;
    protected _initialized: boolean;
    protected _initializationPromise: Promise<void> | undefined;
    protected _targetStateWithCodeActions: string | undefined;
    protected codeActionDeferred?: Deferred<string>;
    protected readonly onDidChangeEmitter: Emitter<void>;
    readonly onDidChange: import("@theia/core").Event<void>;
    protected _readOnlyResource?: ConfigurableMutableReferenceResource;
    protected _changeResource?: ConfigurableMutableReferenceResource;
    init(): void;
    protected initializeAsync(): Promise<void>;
    /**
     * Ensures that the element is fully initialized before proceeding.
     * This includes loading the original content from the file system.
     */
    ensureInitialized(): Promise<void>;
    /**
     * Returns true if the element has been fully initialized.
     */
    get isInitialized(): boolean;
    protected obtainOriginalContent(): Promise<void>;
    protected getInMemoryUri(uri: URI): ConfigurableMutableReferenceResource;
    protected listenForOriginalFileChanges(): void;
    get uri(): URI;
    protected get readOnlyResource(): ConfigurableMutableReferenceResource;
    get readOnlyUri(): URI;
    protected get changeResource(): ConfigurableMutableReferenceResource;
    get changedUri(): URI;
    get name(): string;
    get icon(): string | undefined;
    get additionalInfo(): string | undefined;
    get state(): ChangeSetElementState;
    protected set state(value: ChangeSetElementState);
    get replacements(): Replacement[] | undefined;
    get type(): 'add' | 'modify' | 'delete' | undefined;
    get data(): {
        [key: string]: unknown;
    } | undefined;
    get originalContent(): string | undefined;
    /**
     * Gets the original content of the file asynchronously.
     * Ensures initialization is complete before returning the content.
     */
    getOriginalContent(): Promise<string | undefined>;
    get targetState(): string;
    get originalTargetState(): string;
    open(): Promise<void>;
    openChange(): Promise<void>;
    apply(contents?: string): Promise<void>;
    writeChanges(contents?: string): Promise<void>;
    /**
     * Applies changes using Monaco utilities, including loading the model for the base file URI,
     * setting the value to the intended state, and running code actions on save.
     */
    protected applyChangesWithMonaco(contents?: string): Promise<void>;
    protected applyCodeActionsToTargetState(): Promise<string>;
    protected doApplyCodeActionsToTargetState(): Promise<string>;
    /**
     * Applies formatting preferences like format on save, trim trailing whitespace, and insert final newline.
     */
    protected applyFormatting(model: MonacoEditorModel, languageId: string, uriStr: string): Promise<void>;
    onShow(): void;
    revert(): Promise<void>;
    confirm(verb: string): Promise<boolean>;
    dispose(): void;
}
export {};
//# sourceMappingURL=change-set-file-element.d.ts.map