/// <reference types="react" />
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
import { MonacoEditorZoneWidget } from '@theia/monaco/lib/browser/monaco-editor-zone-widget';
import { Comment, CommentThread } from '../../../common/plugin-api-rpc-model';
import { CommentGlyphWidget } from './comment-glyph-widget';
import { BaseWidget } from '@theia/core/lib/browser';
import * as React from '@theia/core/shared/react';
import { CommentsService } from './comments-service';
import { CommandMenu, CommandRegistry, CompoundMenuNode, MenuModelRegistry, MenuPath } from '@theia/core/lib/common';
import { CommentsContext } from './comments-context';
import { RefObject } from '@theia/core/shared/react';
import * as monaco from '@theia/monaco-editor-core';
import { Root } from '@theia/core/shared/react-dom/client';
import { CommentAuthorInformation } from '@theia/plugin';
import { ContextKeyService } from '@theia/core/lib/browser/context-key-service';
export declare const COMMENT_THREAD_CONTEXT: MenuPath;
export declare const COMMENT_CONTEXT: MenuPath;
export declare const COMMENT_TITLE: MenuPath;
export declare class CommentThreadWidget extends BaseWidget {
    private _owner;
    private _commentThread;
    private commentService;
    protected readonly menus: MenuModelRegistry;
    protected readonly commentsContext: CommentsContext;
    protected readonly contextKeyService: ContextKeyService;
    protected readonly commands: CommandRegistry;
    protected readonly zoneWidget: MonacoEditorZoneWidget;
    protected readonly containerNodeRoot: Root;
    protected readonly commentGlyphWidget: CommentGlyphWidget;
    protected readonly commentFormRef: RefObject<CommentForm>;
    protected isExpanded?: boolean;
    constructor(editor: monaco.editor.IStandaloneCodeEditor, _owner: string, _commentThread: CommentThread, commentService: CommentsService, menus: MenuModelRegistry, commentsContext: CommentsContext, contextKeyService: ContextKeyService, commands: CommandRegistry);
    getGlyphPosition(): number;
    collapse(): void;
    private deleteCommentThread;
    dispose(): void;
    toggleExpand(lineNumber: number): void;
    hide(): void;
    display(options: MonacoEditorZoneWidget.Options): void;
    private onEditorMouseDown;
    get owner(): string;
    get commentThread(): CommentThread;
    private getThreadLabel;
    update(): void;
    protected render(): void;
}
declare namespace CommentForm {
    interface Props {
        menus: MenuModelRegistry;
        commentThread: CommentThread;
        commands: CommandRegistry;
        contextKeyService: ContextKeyService;
        commentsContext: CommentsContext;
        widget: CommentThreadWidget;
    }
    interface State {
        expanded: boolean;
    }
}
export declare class CommentForm<P extends CommentForm.Props = CommentForm.Props> extends React.Component<P, CommentForm.State> {
    private inputRef;
    private inputValue;
    private readonly getInput;
    private toDisposeOnUnmount;
    private readonly clearInput;
    update(): void;
    protected expand: () => void;
    protected collapse: () => void;
    componentDidMount(): void;
    componentWillUnmount(): void;
    private readonly onInput;
    constructor(props: P);
    /**
     * Renders the comment form with textarea, actions, and reply button.
     *
     * @returns The rendered comment form
     */
    protected renderCommentForm(): React.ReactNode;
    /**
     * Renders the author information section.
     *
     * @param authorInfo The author information to display
     * @returns The rendered author information section
     */
    protected renderAuthorInfo(authorInfo: CommentAuthorInformation): React.ReactNode;
    render(): React.ReactNode;
}
declare namespace ReviewComment {
    interface Props {
        menus: MenuModelRegistry;
        comment: Comment;
        commentThread: CommentThread;
        contextKeyService: ContextKeyService;
        commentsContext: CommentsContext;
        commands: CommandRegistry;
        commentForm: RefObject<CommentForm>;
    }
    interface State {
        hover: boolean;
    }
}
export declare class ReviewComment<P extends ReviewComment.Props = ReviewComment.Props> extends React.Component<P, ReviewComment.State> {
    constructor(props: P);
    protected detectHover: (element: HTMLElement | null) => void;
    protected showHover: () => void;
    protected hideHover: () => void;
    render(): React.ReactNode;
    protected localeDate(timestamp: string | undefined): string;
}
declare namespace CommentBody {
    interface Props {
        value: string;
        isVisible: boolean;
    }
}
export declare class CommentBody extends React.Component<CommentBody.Props> {
    render(): React.ReactNode;
}
declare namespace CommentEditContainer {
    interface Props {
        contextKeyService: ContextKeyService;
        commentsContext: CommentsContext;
        menus: MenuModelRegistry;
        comment: Comment;
        commentThread: CommentThread;
        commentForm: RefObject<CommentForm>;
        commands: CommandRegistry;
    }
}
export declare class CommentEditContainer extends React.Component<CommentEditContainer.Props> {
    private readonly inputRef;
    private dirtyCommentMode;
    private dirtyCommentFormState;
    componentDidUpdate(prevProps: Readonly<CommentEditContainer.Props>, prevState: Readonly<{}>): void;
    render(): React.ReactNode;
}
declare namespace CommentsInlineAction {
    interface Props {
        nodePath: MenuPath;
        node: CommandMenu;
        commentThread: CommentThread;
        commentUniqueId: number;
        commands: CommandRegistry;
        contextKeyService: ContextKeyService;
        commentsContext: CommentsContext;
    }
}
export declare class CommentsInlineAction extends React.Component<CommentsInlineAction.Props> {
    render(): React.ReactNode;
}
declare namespace CommentActions {
    interface Props {
        contextKeyService: ContextKeyService;
        commentsContext: CommentsContext;
        menuPath: MenuPath;
        menu: CompoundMenuNode | undefined;
        commentThread: CommentThread;
        getInput: () => string;
        clearInput: () => void;
    }
}
export declare class CommentActions extends React.Component<CommentActions.Props> {
    render(): React.ReactNode;
}
declare namespace CommentAction {
    interface Props {
        commentThread: CommentThread;
        contextKeyService: ContextKeyService;
        commentsContext: CommentsContext;
        nodePath: MenuPath;
        node: CommandMenu;
        onClick: () => void;
    }
}
export declare class CommentAction extends React.Component<CommentAction.Props> {
    render(): React.ReactNode;
}
export {};
//# sourceMappingURL=comment-thread-widget.d.ts.map