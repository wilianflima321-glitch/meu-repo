/// <reference types="@theia/plugin/src/theia.proposed.debugVisualization" />
/// <reference types="@theia/plugin/lib/theia.proposed.multiDocumentHighlightProvider" />
/// <reference types="@theia/plugin/src/theia.proposed.notebookCellExecutionState" />
/// <reference types="@theia/plugin/src/theia.proposed.notebookKernelSource" />
/// <reference types="@theia/plugin/src/theia.proposed.notebookMessaging" />
/// <reference types="@theia/plugin/src/theia.proposed.portsAttributes" />
/// <reference types="@theia/plugin/src/theia.proposed.terminalCompletionProvider" />
/// <reference types="@theia/plugin/src/theia-extra" />
/// <reference types="@theia/plugin/src/theia.proposed.canonicalUriProvider" />
/// <reference types="@theia/plugin/src/theia.proposed.customEditorMove" />
/// <reference types="@theia/plugin/src/theia.proposed.diffCommand" />
/// <reference types="@theia/plugin/src/theia.proposed.editSessionIdentityProvider" />
/// <reference types="@theia/plugin/src/theia.proposed.extensionsAny" />
/// <reference types="@theia/plugin/src/theia.proposed.externalUriOpener" />
/// <reference types="@theia/plugin/src/theia.proposed.findTextInFiles" />
/// <reference types="@theia/plugin/src/theia.proposed.fsChunks" />
/// <reference types="@theia/plugin/src/theia.proposed.interactiveWindow" />
/// <reference types="@theia/plugin/src/theia.proposed.mappedEditsProvider" />
/// <reference types="@theia/plugin/src/theia.proposed.profileContentHandlers" />
/// <reference types="@theia/plugin/src/theia.proposed.resolvers" />
/// <reference types="@theia/plugin/src/theia.proposed.scmValidation" />
/// <reference types="@theia/plugin/src/theia.proposed.shareProvider" />
/// <reference types="@theia/plugin/src/theia.proposed.terminalQuickFixProvider" />
/// <reference types="@theia/plugin/src/theia.proposed.textSearchProvider" />
/// <reference types="@theia/plugin/src/theia.proposed.timeline" />
import { Range, Comment, CommentInput, CommentOptions, CommentThread, CommentThreadChangedEvent } from '../../../common/plugin-api-rpc-model';
import { Event } from '@theia/core/lib/common/event';
import { CommentThreadCollapsibleState, CommentThreadState } from '../../../plugin/types-impl';
import { CommentProviderFeatures, CommentsExt, CommentsMain, CommentThreadChanges } from '../../../common/plugin-api-rpc';
import { Disposable } from '@theia/core/lib/common/disposable';
import { CommentsService, CommentInfoMain } from './comments-service';
import { UriComponents } from '../../../common/uri-components';
import { URI } from '@theia/core/shared/vscode-uri';
import { CancellationToken } from '@theia/core/lib/common';
import { RPCProtocol } from '../../../common/rpc-protocol';
import { interfaces } from '@theia/core/shared/inversify';
import { CommentAuthorInformation } from '@theia/plugin';
export declare class CommentThreadImpl implements CommentThread, Disposable {
    commentThreadHandle: number;
    controllerHandle: number;
    extensionId: string;
    threadId: string;
    resource: string;
    private _range;
    private _input?;
    get input(): CommentInput | undefined;
    set input(value: CommentInput | undefined);
    private readonly onDidChangeInputEmitter;
    get onDidChangeInput(): Event<CommentInput | undefined>;
    private _label;
    get label(): string | undefined;
    set label(label: string | undefined);
    private readonly onDidChangeLabelEmitter;
    readonly onDidChangeLabel: Event<string | undefined>;
    private _contextValue;
    get contextValue(): string | undefined;
    set contextValue(context: string | undefined);
    private _comments;
    get comments(): Comment[] | undefined;
    set comments(newComments: Comment[] | undefined);
    private readonly onDidChangeCommentsEmitter;
    get onDidChangeComments(): Event<Comment[] | undefined>;
    set range(range: Range | undefined);
    get range(): Range | undefined;
    private readonly onDidChangeRangeEmitter;
    onDidChangeRange: Event<Range | undefined>;
    private _collapsibleState;
    get collapsibleState(): CommentThreadCollapsibleState | undefined;
    set collapsibleState(newState: CommentThreadCollapsibleState | undefined);
    private readonly onDidChangeCollapsibleStateEmitter;
    readonly onDidChangeCollapsibleState: Event<CommentThreadCollapsibleState | undefined>;
    private _state;
    get state(): CommentThreadState | undefined;
    set state(newState: CommentThreadState | undefined);
    private readonly onDidChangeStateEmitter;
    readonly onDidChangeState: Event<CommentThreadState | undefined>;
    private readonly onDidChangeCanReplyEmitter;
    readonly onDidChangeCanReply: Event<boolean | CommentAuthorInformation>;
    private _isDisposed;
    get isDisposed(): boolean;
    private _canReply;
    get canReply(): boolean | CommentAuthorInformation;
    set canReply(canReply: boolean | CommentAuthorInformation);
    constructor(commentThreadHandle: number, controllerHandle: number, extensionId: string, threadId: string, resource: string, _range: Range | undefined);
    batchUpdate(changes: CommentThreadChanges): void;
    dispose(): void;
}
export declare class CommentController {
    private readonly _proxy;
    private readonly _commentService;
    private readonly _handle;
    private readonly _uniqueId;
    private readonly _id;
    private readonly _label;
    private _features;
    get handle(): number;
    get id(): string;
    get contextValue(): string;
    get proxy(): CommentsExt;
    get label(): string;
    get options(): CommentOptions | undefined;
    private readonly threads;
    activeCommentThread?: CommentThread;
    get features(): CommentProviderFeatures;
    constructor(_proxy: CommentsExt, _commentService: CommentsService, _handle: number, _uniqueId: string, _id: string, _label: string, _features: CommentProviderFeatures);
    updateFeatures(features: CommentProviderFeatures): void;
    createCommentThread(extensionId: string, commentThreadHandle: number, threadId: string, resource: UriComponents, range: Range | undefined): CommentThread;
    updateCommentThread(commentThreadHandle: number, threadId: string, resource: UriComponents, changes: CommentThreadChanges): void;
    deleteCommentThread(commentThreadHandle: number): void;
    deleteCommentThreadMain(commentThreadId: string): void;
    updateInput(input: string): void;
    private getKnownThread;
    getDocumentComments(resource: URI, token: CancellationToken): Promise<CommentInfoMain>;
    getCommentingRanges(resource: URI, token: CancellationToken): Promise<{
        ranges: Range[];
        fileComments: boolean;
    } | undefined>;
    getAllComments(): CommentThread[];
    createCommentThreadTemplate(resource: UriComponents, range: Range): void;
    updateCommentThreadTemplate(threadHandle: number, range: Range): Promise<void>;
}
export declare class CommentsMainImp implements CommentsMain {
    private readonly proxy;
    private documentProviders;
    private workspaceProviders;
    private handlers;
    private commentControllers;
    private activeCommentThread?;
    private readonly commentService;
    constructor(rpc: RPCProtocol, container: interfaces.Container);
    $registerCommentController(handle: number, id: string, label: string): void;
    $unregisterCommentController(handle: number): void;
    $updateCommentControllerFeatures(handle: number, features: CommentProviderFeatures): void;
    $createCommentThread(handle: number, commentThreadHandle: number, threadId: string, resource: UriComponents, range: Range | undefined, extensionId: string): CommentThread | undefined;
    $updateCommentThread(handle: number, commentThreadHandle: number, threadId: string, resource: UriComponents, changes: CommentThreadChanges): void;
    $deleteCommentThread(handle: number, commentThreadHandle: number): void;
    private getHandler;
    $onDidCommentThreadsChange(handle: number, event: CommentThreadChangedEvent): void;
    dispose(): void;
}
//# sourceMappingURL=comments-main.d.ts.map