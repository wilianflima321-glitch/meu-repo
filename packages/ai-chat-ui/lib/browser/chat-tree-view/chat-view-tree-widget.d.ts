import { ChatAgent, ChatAgentService, ChatModel, ChatRequestModel, ChatResponseContent, ChatResponseModel, ChatService, EditableChatRequestModel, type ChatRequest, type ChatHierarchyBranch } from '@theia/ai-chat';
import { AIVariableService } from '@theia/ai-core';
import { AIActivationService } from '@theia/ai-core/lib/browser';
import { CommandRegistry, ContributionProvider, DisposableCollection, Emitter } from '@theia/core';
import { ContextMenuRenderer, HoverService, NodeProps, OpenerService, TreeModel, TreeNode, TreeProps, TreeWidget } from '@theia/core/lib/browser';
import * as React from '@theia/core/shared/react';
import { ChatNodeToolbarActionContribution } from '../chat-node-toolbar-action-contribution';
import { ChatResponsePartRenderer } from '../chat-response-part-renderer';
import { AIChatTreeInputFactory, type AIChatTreeInputWidget } from './chat-view-tree-input-widget';
export interface RequestNode extends TreeNode {
    request: ChatRequestModel;
    branch: ChatHierarchyBranch;
    sessionId: string;
}
export declare const isRequestNode: (node: TreeNode) => node is RequestNode;
export interface EditableRequestNode extends RequestNode {
    request: EditableChatRequestModel;
}
export declare const isEditableRequestNode: (node: TreeNode) => node is EditableRequestNode;
export interface ResponseNode extends TreeNode {
    response: ChatResponseModel;
    sessionId: string;
}
export declare const isResponseNode: (node: TreeNode) => node is ResponseNode;
export declare function isEnterKey(e: React.KeyboardEvent): boolean;
export declare const ChatWelcomeMessageProvider: unique symbol;
export interface ChatWelcomeMessageProvider {
    renderWelcomeMessage?(): React.ReactNode;
    renderDisabledMessage?(): React.ReactNode;
}
export declare class ChatViewTreeWidget extends TreeWidget {
    static readonly ID = "chat-tree-widget";
    static readonly CONTEXT_MENU: string[];
    protected readonly chatResponsePartRenderers: ContributionProvider<ChatResponsePartRenderer<ChatResponseContent>>;
    protected readonly chatNodeToolbarActionContributions: ContributionProvider<ChatNodeToolbarActionContribution>;
    protected chatAgentService: ChatAgentService;
    protected readonly variableService: AIVariableService;
    protected commandRegistry: CommandRegistry;
    protected readonly openerService: OpenerService;
    protected hoverService: HoverService;
    protected welcomeMessageProvider?: ChatWelcomeMessageProvider;
    protected inputWidgetFactory: AIChatTreeInputFactory;
    protected readonly activationService: AIActivationService;
    protected readonly chatService: ChatService;
    protected readonly onDidSubmitEditEmitter: Emitter<ChatRequest>;
    onDidSubmitEdit: import("@theia/core").Event<ChatRequest>;
    protected readonly chatInputs: Map<string, AIChatTreeInputWidget>;
    protected _shouldScrollToEnd: boolean;
    protected isEnabled: boolean;
    protected chatModelId: string;
    /** Tracks if we are at the bottom for showing the scroll-to-bottom button. */
    protected atBottom: boolean;
    /**
     * Track the visibility of the scroll button with debounce logic. Used to prevent flickering when streaming tokens.
     */
    protected _showScrollButton: boolean;
    /**
     * Timer for debouncing the scroll button activation (prevents flicker on auto-scroll).
     * If user scrolls up, this delays showing the button in case auto-scroll-to-bottom kicks in.
     */
    protected _scrollButtonDebounceTimer?: number;
    /**
     * Debounce period in ms before showing scroll-to-bottom button after scrolling up.
     * Avoids flickering of the button during LLM token streaming.
     */
    protected static readonly SCROLL_BUTTON_GRACE_PERIOD = 100;
    onScrollLockChange?: (temporaryLocked: boolean) => void;
    protected lastScrollTop: number;
    set shouldScrollToEnd(shouldScrollToEnd: boolean);
    get shouldScrollToEnd(): boolean;
    constructor(props: TreeProps, model: TreeModel, contextMenuRenderer: ContextMenuRenderer);
    protected init(): void;
    setEnabled(enabled: boolean): void;
    protected handleScrollEvent(scrollEvent: unknown): void;
    /** Updates the scroll-to-bottom button state and handles debounce. */
    protected updateScrollToBottomButtonState(isAtBottom: boolean): void;
    protected setTemporaryScrollLock(enabled: boolean): void;
    protected getCurrentScrollTop(scrollEvent: unknown): number;
    /**
     * Returns true if the scroll position is at the absolute (1px tolerance) bottom of the scroll container.
     * Handles both virtualized and non-virtualized scroll containers.
     * Allows for a tiny floating point epsilon (1px).
     */
    protected isAtAbsoluteBottom(): boolean;
    protected renderTree(model: TreeModel): React.ReactNode;
    /** Shows the scroll to bottom button if not at the bottom (debounced). */
    protected renderScrollToBottomButton(): React.ReactNode;
    /** Scrolls to the bottom row and updates atBottom state. */
    protected handleScrollToBottomButtonClick(): void;
    protected renderDisabledMessage(): React.ReactNode;
    protected renderWelcomeMessage(): React.ReactNode;
    protected mapRequestToNode(branch: ChatHierarchyBranch): RequestNode;
    protected mapResponseToNode(response: ChatResponseModel): ResponseNode;
    protected readonly toDisposeOnChatModelChange: DisposableCollection;
    /**
     * Tracks the ChatModel handed over.
     * Tracking multiple chat models will result in a weird UI
     */
    trackChatModel(chatModel: ChatModel): void;
    protected disposeChatInputWidget(request: ChatRequestModel): void;
    protected getScrollToRow(): number | undefined;
    protected recreateModelTree(chatModel: ChatModel): Promise<void>;
    protected renderNode(node: TreeNode, props: NodeProps): React.ReactNode;
    protected renderAgent(node: RequestNode | ResponseNode): React.ReactNode;
    protected getAgentLabel(node: RequestNode | ResponseNode): string;
    protected getAgent(node: RequestNode | ResponseNode): ChatAgent | undefined;
    protected getAgentIconClassName(node: RequestNode | ResponseNode): string | undefined;
    protected renderDetail(node: RequestNode | ResponseNode): React.ReactNode;
    protected renderChatRequest(node: RequestNode): React.ReactNode;
    protected renderChatResponse(node: ResponseNode): React.ReactNode;
    protected getChatResponsePartRenderer(content: ChatResponseContent, node: ResponseNode): React.ReactNode;
    protected handleContextMenu(node: TreeNode | undefined, event: React.MouseEvent<HTMLElement>): void;
    protected handleSpace(event: KeyboardEvent): boolean;
    /**
     * Ensure atBottom state is correct when content grows (e.g., LLM streaming while scroll lock is enabled).
     */
    protected updateScrollToRow(): void;
}
//# sourceMappingURL=chat-view-tree-widget.d.ts.map