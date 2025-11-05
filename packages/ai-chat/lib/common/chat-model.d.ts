import { AIVariableResolutionRequest, LanguageModelMessage, ResolvedAIContextVariable, TextMessage, ThinkingMessage, ToolCallResult, ToolResultMessage, ToolUseMessage } from '@theia/ai-core';
import { CancellationToken, CancellationTokenSource, Command, Disposable, DisposableCollection, Emitter, Event, URI } from '@theia/core';
import { MarkdownString, MarkdownStringImpl } from '@theia/core/lib/common/markdown-rendering';
import { Position } from '@theia/core/shared/vscode-languageserver-protocol';
import { ChangeSet, ChangeSetElement, ChangeSetImpl, ChatUpdateChangeSetEvent } from './change-set';
import { ChatAgentLocation } from './chat-agents';
import { ParsedChatRequest } from './parsed-chat-request';
export { ChangeSet, ChangeSetElement, ChangeSetImpl };
/**********************
 * INTERFACES AND TYPE GUARDS
 **********************/
export type ChatChangeEvent = ChatAddRequestEvent | ChatAddResponseEvent | ChatAddVariableEvent | ChatRemoveVariableEvent | ChatSetVariablesEvent | ChatRemoveRequestEvent | ChatSuggestionsChangedEvent | ChatUpdateChangeSetEvent | ChatEditRequestEvent | ChatEditCancelEvent | ChatEditSubmitEvent | ChatChangeHierarchyBranchEvent;
export interface ChatAddRequestEvent {
    kind: 'addRequest';
    request: ChatRequestModel;
}
export interface ChatEditRequestEvent {
    kind: 'enableEdit';
    request: EditableChatRequestModel;
    branch: ChatHierarchyBranch<ChatRequestModel>;
}
export interface ChatEditCancelEvent {
    kind: 'cancelEdit';
    request: EditableChatRequestModel;
    branch: ChatHierarchyBranch<ChatRequestModel>;
}
export interface ChatEditSubmitEvent {
    kind: 'submitEdit';
    request: EditableChatRequestModel;
    branch: ChatHierarchyBranch<ChatRequestModel>;
    newRequest: ChatRequest;
}
export interface ChatChangeHierarchyBranchEvent {
    kind: 'changeHierarchyBranch';
    branch: ChatHierarchyBranch<ChatRequestModel>;
}
export interface ChatAddResponseEvent {
    kind: 'addResponse';
    response: ChatResponseModel;
}
export interface ChatAddVariableEvent {
    kind: 'addVariable';
}
export interface ChatRemoveVariableEvent {
    kind: 'removeVariable';
}
export interface ChatSetVariablesEvent {
    kind: 'setVariables';
}
export interface ChatSuggestionsChangedEvent {
    kind: 'suggestionsChanged';
    suggestions: ChatSuggestion[];
}
export declare namespace ChatChangeEvent {
    function isChangeSetEvent(event: ChatChangeEvent): event is ChatUpdateChangeSetEvent;
}
export type ChatRequestRemovalReason = 'removal' | 'resend' | 'adoption';
export interface ChatRemoveRequestEvent {
    kind: 'removeRequest';
    requestId: string;
    responseId?: string;
    reason: ChatRequestRemovalReason;
}
/**
 * A model that contains information about a chat request that may branch off.
 *
 * The hierarchy of requests is represented by a tree structure.
 * - The root of the tree is the initial request
 * - Within each branch, the requests are stored in a list. Those requests are the alternatives to the original request.
 *   Each of those items can have a next branch, which is the next request in the hierarchy.
 */
export interface ChatRequestHierarchy<TRequest extends ChatRequestModel = ChatRequestModel> extends Disposable {
    readonly branch: ChatHierarchyBranch<TRequest>;
    onDidChange: Event<ChangeActiveBranchEvent<TRequest>>;
    append(request: TRequest): ChatHierarchyBranch<TRequest>;
    activeRequests(): TRequest[];
    activeBranches(): ChatHierarchyBranch<TRequest>[];
    findRequest(requestId: string): TRequest | undefined;
    findBranch(requestId: string): ChatHierarchyBranch<TRequest> | undefined;
    notifyChange(event: ChangeActiveBranchEvent<TRequest>): void;
}
export interface ChangeActiveBranchEvent<TRequest extends ChatRequestModel = ChatRequestModel> {
    branch: ChatHierarchyBranch<TRequest>;
    item: ChatHierarchyBranchItem<TRequest>;
}
/**
 * A branch of the chat request hierarchy.
 * It contains a list of items, each representing a request.
 * Those items can have a next branch, which is the next request in the hierarchy.
 */
export interface ChatHierarchyBranch<TRequest extends ChatRequestModel = ChatRequestModel> extends Disposable {
    readonly id: string;
    readonly hierarchy: ChatRequestHierarchy<TRequest>;
    readonly previous?: ChatHierarchyBranch<TRequest>;
    readonly items: ChatHierarchyBranchItem<TRequest>[];
    readonly activeBranchIndex: number;
    next(): ChatHierarchyBranch<TRequest> | undefined;
    get(): TRequest;
    add(request: TRequest): void;
    remove(request: TRequest | string): void;
    /**
     * Create a new branch by inserting it as the next branch of the active item.
     */
    continue(request: TRequest): ChatHierarchyBranch<TRequest>;
    enable(request: TRequest): ChatHierarchyBranchItem<TRequest>;
    enablePrevious(): ChatHierarchyBranchItem<TRequest>;
    enableNext(): ChatHierarchyBranchItem<TRequest>;
    succeedingBranches(): ChatHierarchyBranch<TRequest>[];
}
export interface ChatHierarchyBranchItem<TRequest extends ChatRequestModel = ChatRequestModel> {
    readonly element: TRequest;
    readonly next?: ChatHierarchyBranch<TRequest>;
}
export interface ChatModel {
    readonly onDidChange: Event<ChatChangeEvent>;
    readonly id: string;
    readonly location: ChatAgentLocation;
    readonly context: ChatContextManager;
    readonly suggestions: readonly ChatSuggestion[];
    readonly settings?: {
        [key: string]: unknown;
    };
    readonly changeSet: ChangeSet;
    getRequests(): ChatRequestModel[];
    getBranches(): ChatHierarchyBranch<ChatRequestModel>[];
    isEmpty(): boolean;
}
export interface ChatSuggestionCallback {
    kind: 'callback';
    callback: () => unknown;
    content: string | MarkdownString;
}
export declare namespace ChatSuggestionCallback {
    function is(candidate: ChatSuggestion): candidate is ChatSuggestionCallback;
    function containsCallbackLink(candidate: ChatSuggestion): candidate is ChatSuggestionCallback;
}
export type ChatSuggestion = string | MarkdownString | ChatSuggestionCallback;
export interface ChatContextManager {
    onDidChange: Event<ChatAddVariableEvent | ChatRemoveVariableEvent | ChatSetVariablesEvent>;
    getVariables(): readonly AIVariableResolutionRequest[];
    addVariables(...variables: AIVariableResolutionRequest[]): void;
    deleteVariables(...indices: number[]): void;
    clear(): void;
}
export interface ChangeSetDecoration {
    readonly priority?: number;
    readonly additionalInfoSuffixIcon?: string[];
}
export interface ChatRequest {
    readonly text: string;
    readonly displayText?: string;
    /**
     * If the request has been triggered in the context of
     * an existing request, this id will be set to the id of the
     * referenced request.
     */
    readonly referencedRequestId?: string;
    readonly variables?: readonly AIVariableResolutionRequest[];
}
export interface ChatContext {
    variables: ResolvedAIContextVariable[];
}
export interface ChatRequestModel {
    readonly id: string;
    readonly session: ChatModel;
    readonly request: ChatRequest;
    readonly response: ChatResponseModel;
    readonly message: ParsedChatRequest;
    readonly context: ChatContext;
    readonly agentId?: string;
    readonly data?: {
        [key: string]: unknown;
    };
}
export declare namespace ChatRequestModel {
    function is(request: unknown): request is ChatRequestModel;
    function isInProgress(request: ChatRequestModel | undefined): boolean;
}
export interface EditableChatRequestModel extends ChatRequestModel {
    readonly isEditing: boolean;
    editContextManager: ChatContextManagerImpl;
    enableEdit(): void;
    cancelEdit(): void;
    submitEdit(newRequest: ChatRequest): void;
}
export declare namespace EditableChatRequestModel {
    function is(request: unknown): request is EditableChatRequestModel;
    function isEditing(request: unknown): request is EditableChatRequestModel;
}
export interface ChatProgressMessage {
    kind: 'progressMessage';
    id: string;
    status: 'inProgress' | 'completed' | 'failed';
    show: 'untilFirstContent' | 'whileIncomplete' | 'forever';
    content: string;
}
export interface ChatResponseContent {
    kind: string;
    /**
     * Represents the content as a string. Returns `undefined` if the content
     * is purely informational and/or visual and should not be included in the overall
     * representation of the response.
     */
    asString?(): string | undefined;
    asDisplayString?(): string | undefined;
    merge?(nextChatResponseContent: ChatResponseContent): boolean;
    toLanguageModelMessage?(): LanguageModelMessage | LanguageModelMessage[];
}
export declare namespace ChatResponseContent {
    function is(obj: unknown): obj is ChatResponseContent;
    function hasAsString(obj: ChatResponseContent): obj is Required<Pick<ChatResponseContent, 'asString'>> & ChatResponseContent;
    function hasDisplayString(obj: ChatResponseContent): obj is Required<Pick<ChatResponseContent, 'asDisplayString'>> & ChatResponseContent;
    function hasMerge(obj: ChatResponseContent): obj is Required<Pick<ChatResponseContent, 'merge'>> & ChatResponseContent;
    function hasToLanguageModelMessage(obj: ChatResponseContent): obj is Required<Pick<ChatResponseContent, 'toLanguageModelMessage'>> & ChatResponseContent;
}
export interface TextChatResponseContent extends Required<ChatResponseContent> {
    kind: 'text';
    content: string;
}
export interface ErrorChatResponseContent extends ChatResponseContent {
    kind: 'error';
    error: Error;
}
export interface MarkdownChatResponseContent extends Required<ChatResponseContent> {
    kind: 'markdownContent';
    content: MarkdownString;
}
export interface CodeChatResponseContent extends ChatResponseContent {
    kind: 'code';
    code: string;
    language?: string;
    location?: Location;
}
export interface HorizontalLayoutChatResponseContent extends ChatResponseContent {
    kind: 'horizontal';
    content: ChatResponseContent[];
}
export interface ToolCallChatResponseContent extends Required<ChatResponseContent> {
    kind: 'toolCall';
    id?: string;
    name?: string;
    arguments?: string;
    finished: boolean;
    result?: ToolCallResult;
    confirmed: Promise<boolean>;
    confirm(): void;
    deny(): void;
    cancelConfirmation(reason?: unknown): void;
}
export interface ThinkingChatResponseContent extends Required<ChatResponseContent> {
    kind: 'thinking';
    content: string;
    signature: string;
}
export interface ProgressChatResponseContent extends Required<ChatResponseContent> {
    kind: 'progress';
    message: string;
}
export interface Location {
    uri: URI;
    position: Position;
}
export declare namespace Location {
    function is(obj: unknown): obj is Location;
}
export interface CustomCallback {
    label: string;
    callback: () => Promise<void>;
}
/**
 * A command chat response content represents a command that is offered to the user for execution.
 * It either refers to an already registered Theia command or provides a custom callback.
 * If both are given, the custom callback will be preferred.
 */
export interface CommandChatResponseContent extends ChatResponseContent {
    kind: 'command';
    command?: Command;
    customCallback?: CustomCallback;
    arguments?: unknown[];
}
/**
 * An informational chat response content represents a message that is purely informational and should not be included in the overall representation of the response.
 */
export interface InformationalChatResponseContent extends ChatResponseContent {
    kind: 'informational';
    content: MarkdownString;
}
export declare namespace TextChatResponseContent {
    function is(obj: unknown): obj is TextChatResponseContent;
}
export declare namespace MarkdownChatResponseContent {
    function is(obj: unknown): obj is MarkdownChatResponseContent;
}
export declare namespace InformationalChatResponseContent {
    function is(obj: unknown): obj is InformationalChatResponseContent;
}
export declare namespace CommandChatResponseContent {
    function is(obj: unknown): obj is CommandChatResponseContent;
}
export declare namespace CodeChatResponseContent {
    function is(obj: unknown): obj is CodeChatResponseContent;
}
export declare namespace HorizontalLayoutChatResponseContent {
    function is(obj: unknown): obj is HorizontalLayoutChatResponseContent;
}
export declare namespace ToolCallChatResponseContent {
    function is(obj: unknown): obj is ToolCallChatResponseContent;
}
export declare namespace ErrorChatResponseContent {
    function is(obj: unknown): obj is ErrorChatResponseContent;
}
export declare namespace ThinkingChatResponseContent {
    function is(obj: unknown): obj is ThinkingChatResponseContent;
}
export declare namespace ProgressChatResponseContent {
    function is(obj: unknown): obj is ProgressChatResponseContent;
}
export type QuestionResponseHandler = (selectedOption: {
    text: string;
    value?: string;
}) => void;
export interface QuestionResponseContent extends ChatResponseContent {
    kind: 'question';
    question: string;
    options: {
        text: string;
        value?: string;
    }[];
    selectedOption?: {
        text: string;
        value?: string;
    };
    handler: QuestionResponseHandler;
    request: MutableChatRequestModel;
}
export declare namespace QuestionResponseContent {
    function is(obj: unknown): obj is QuestionResponseContent;
}
export interface ChatResponse {
    readonly content: ChatResponseContent[];
    asString(): string;
    asDisplayString(): string;
}
/**
 * The ChatResponseModel wraps the actual ChatResponse with additional information like the current state, progress messages, a unique id etc.
 */
export interface ChatResponseModel {
    /**
     * Use this to be notified for any change in the response model
     */
    readonly onDidChange: Event<void>;
    /**
     * The unique identifier of the response model
     */
    readonly id: string;
    /**
     * The unique identifier of the request model this response is associated with
     */
    readonly requestId: string;
    /**
     * In case there are progress messages, then they will be stored here
     */
    readonly progressMessages: ChatProgressMessage[];
    /**
     * The actual response content
     */
    readonly response: ChatResponse;
    /**
     * Indicates whether this response is complete. No further changes are expected if 'true'.
     */
    readonly isComplete: boolean;
    /**
     * Indicates whether this response is canceled. No further changes are expected if 'true'.
     */
    readonly isCanceled: boolean;
    /**
     * Some agents might need to wait for user input to continue. This flag indicates that.
     */
    readonly isWaitingForInput: boolean;
    /**
     * Indicates whether an error occurred when processing the response. No further changes are expected if 'true'.
     */
    readonly isError: boolean;
    /**
     * The agent who produced the response content, if there is one.
     */
    readonly agentId?: string;
    /**
     * An optional error object that caused the response to be in an error state.
     */
    readonly errorObject?: Error;
    /**
     * Some functionality might want to store some data associated with the response.
     * This can be used to store and retrieve such data.
     */
    readonly data: {
        [key: string]: unknown;
    };
}
/**********************
 * Implementations
 **********************/
export declare class MutableChatModel implements ChatModel, Disposable {
    readonly location: ChatAgentLocation;
    protected readonly _onDidChangeEmitter: Emitter<ChatChangeEvent>;
    onDidChange: Event<ChatChangeEvent>;
    protected readonly toDispose: DisposableCollection;
    protected _hierarchy: ChatRequestHierarchy<MutableChatRequestModel>;
    protected _id: string;
    protected _suggestions: readonly ChatSuggestion[];
    protected readonly _contextManager: ChatContextManagerImpl;
    protected readonly _changeSet: ChatTreeChangeSet;
    protected _settings: {
        [key: string]: unknown;
    };
    constructor(location?: ChatAgentLocation);
    get id(): string;
    get changeSet(): ChangeSet;
    getBranches(): ChatHierarchyBranch<ChatRequestModel>[];
    getBranch(requestId: string): ChatHierarchyBranch<ChatRequestModel> | undefined;
    getRequests(): MutableChatRequestModel[];
    getRequest(id: string): MutableChatRequestModel | undefined;
    get suggestions(): readonly ChatSuggestion[];
    get context(): ChatContextManager;
    get settings(): {
        [key: string]: unknown;
    };
    setSettings(settings: {
        [key: string]: unknown;
    }): void;
    addRequest(parsedChatRequest: ParsedChatRequest, agentId?: string, context?: ChatContext): MutableChatRequestModel;
    protected getTargetForRequestAddition(request: ParsedChatRequest): (addendum: MutableChatRequestModel) => void;
    setSuggestions(suggestions: ChatSuggestion[]): void;
    isEmpty(): boolean;
    dispose(): void;
}
export declare class ChatTreeChangeSet implements Omit<ChangeSet, 'onDidChange'> {
    protected readonly hierarchy: ChatRequestHierarchy<MutableChatRequestModel>;
    protected readonly onDidChangeEmitter: Emitter<ChatUpdateChangeSetEvent>;
    get onDidChange(): Event<ChatUpdateChangeSetEvent>;
    protected readonly toDispose: DisposableCollection;
    constructor(hierarchy: ChatRequestHierarchy<MutableChatRequestModel>);
    get title(): string;
    removeElements(...uris: URI[]): boolean;
    addElements(...elements: ChangeSetElement[]): boolean;
    setElements(...elements: ChangeSetElement[]): void;
    setTitle(title: string): void;
    getElementByURI(uri: URI): ChangeSetElement | undefined;
    protected currentElements: ChangeSetElement[];
    protected handleChangeSetChange: import("lodash").DebouncedFunc<any>;
    protected doHandleChangeSetChange(): void;
    getElements(): ChangeSetElement[];
    protected computeChangeSetElements(): ChangeSetElement[];
    protected handleElementChange(newElements: ChangeSetElement[]): void;
    protected toDisposeOnRequestAdded: DisposableCollection;
    registerRequest(request: MutableChatRequestModel): void;
    protected localChangeSet?: ChangeSetImpl;
    protected getMutableChangeSet(): ChangeSetImpl;
    protected getCurrentChangeSet(): ChangeSet | undefined;
    /** Returns the lowest node among active nodes that satisfies {@link criterion} */
    getBranchParent(criterion: (branch: ChatHierarchyBranch<MutableChatRequestModel>) => boolean): ChatHierarchyBranch<MutableChatRequestModel> | undefined;
    dispose(): void;
}
export declare class ChatRequestHierarchyImpl<TRequest extends ChatRequestModel = ChatRequestModel> implements ChatRequestHierarchy<TRequest> {
    protected readonly onDidChangeActiveBranchEmitter: Emitter<ChangeActiveBranchEvent<TRequest>>;
    readonly onDidChange: Event<ChangeActiveBranchEvent<TRequest>>;
    readonly branch: ChatHierarchyBranch<TRequest>;
    append(request: TRequest): ChatHierarchyBranch<TRequest>;
    activeRequests(): TRequest[];
    activeBranches(): ChatHierarchyBranch<TRequest>[];
    protected iterateBranches(): Generator<ChatHierarchyBranch<TRequest>>;
    findRequest(requestId: string): TRequest | undefined;
    findBranch(requestId: string): ChatHierarchyBranch<TRequest> | undefined;
    protected findInBranch(branch: ChatHierarchyBranch<TRequest>, requestId: string): ChatHierarchyBranch<TRequest> | undefined;
    notifyChange(event: ChangeActiveBranchEvent<TRequest>): void;
    dispose(): void;
}
export declare class ChatRequestHierarchyBranchImpl<TRequest extends ChatRequestModel> implements ChatHierarchyBranch<TRequest> {
    readonly hierarchy: ChatRequestHierarchy<TRequest>;
    readonly previous?: ChatHierarchyBranch<TRequest> | undefined;
    readonly items: ChatHierarchyBranchItem<TRequest>[];
    protected _activeIndex: number;
    readonly id: string;
    constructor(hierarchy: ChatRequestHierarchy<TRequest>, previous?: ChatHierarchyBranch<TRequest> | undefined, items?: ChatHierarchyBranchItem<TRequest>[], _activeIndex?: number);
    get activeBranchIndex(): number;
    protected set activeBranchIndex(value: number);
    next(): ChatHierarchyBranch<TRequest> | undefined;
    get(): TRequest;
    add(request: TRequest): void;
    remove(request: TRequest | string): void;
    continue(request: TRequest): ChatHierarchyBranch<TRequest>;
    enable(request: TRequest): ChatHierarchyBranchItem<TRequest>;
    enablePrevious(): ChatHierarchyBranchItem<TRequest>;
    enableNext(): ChatHierarchyBranchItem<TRequest>;
    succeedingBranches(): ChatHierarchyBranch<TRequest>[];
    dispose(): void;
}
export declare class ChatContextManagerImpl implements ChatContextManager {
    protected readonly variables: AIVariableResolutionRequest[];
    protected readonly onDidChangeEmitter: Emitter<ChatAddVariableEvent | ChatRemoveVariableEvent | ChatSetVariablesEvent>;
    get onDidChange(): Event<ChatAddVariableEvent | ChatRemoveVariableEvent | ChatSetVariablesEvent>;
    constructor(context?: ChatContext);
    getVariables(): readonly AIVariableResolutionRequest[];
    addVariables(...variables: AIVariableResolutionRequest[]): void;
    deleteVariables(...indices: number[]): void;
    setVariables(variables: AIVariableResolutionRequest[]): void;
    clear(): void;
}
export declare class MutableChatRequestModel implements ChatRequestModel, EditableChatRequestModel, Disposable {
    readonly message: ParsedChatRequest;
    protected readonly _onDidChangeEmitter: Emitter<ChatChangeEvent>;
    onDidChange: Event<ChatChangeEvent>;
    protected readonly _id: string;
    protected _session: MutableChatModel;
    protected _request: ChatRequest;
    protected _response: MutableChatResponseModel;
    protected _changeSet?: ChangeSetImpl;
    protected _context: ChatContext;
    protected _agentId?: string;
    protected _data: {
        [key: string]: unknown;
    };
    protected _isEditing: boolean;
    protected readonly toDispose: DisposableCollection;
    readonly editContextManager: ChatContextManagerImpl;
    constructor(session: MutableChatModel, message: ParsedChatRequest, agentId?: string, context?: ChatContext, data?: {
        [key: string]: unknown;
    });
    get changeSet(): ChangeSetImpl | undefined;
    set changeSet(changeSet: ChangeSetImpl);
    get isEditing(): boolean;
    enableEdit(): void;
    get data(): {
        [key: string]: unknown;
    } | undefined;
    addData(key: string, value: unknown): void;
    getDataByKey<T = unknown>(key: string): T;
    removeData(key: string): void;
    get id(): string;
    get session(): MutableChatModel;
    get request(): ChatRequest;
    get response(): MutableChatResponseModel;
    get context(): ChatContext;
    get agentId(): string | undefined;
    cancelEdit(): void;
    submitEdit(newRequest: ChatRequest): void;
    cancel(): void;
    dispose(): void;
    protected clearEditContext(): void;
    protected emitEditRequest(request: MutableChatRequestModel): void;
    protected emitCancelEdit(request: MutableChatRequestModel): void;
    protected emitSubmitEdit(request: MutableChatRequestModel, newRequest: ChatRequest): void;
}
export declare class ErrorChatResponseContentImpl implements ErrorChatResponseContent {
    readonly kind = "error";
    protected _error: Error;
    constructor(error: Error);
    get error(): Error;
    asString(): string | undefined;
}
export declare class TextChatResponseContentImpl implements TextChatResponseContent {
    readonly kind = "text";
    protected _content: string;
    constructor(content: string);
    get content(): string;
    asString(): string;
    asDisplayString(): string | undefined;
    merge(nextChatResponseContent: TextChatResponseContent): boolean;
    toLanguageModelMessage(): TextMessage;
}
export declare class ThinkingChatResponseContentImpl implements ThinkingChatResponseContent {
    readonly kind = "thinking";
    protected _content: string;
    protected _signature: string;
    constructor(content: string, signature: string);
    get content(): string;
    get signature(): string;
    asString(): string;
    asDisplayString(): string | undefined;
    merge(nextChatResponseContent: ThinkingChatResponseContent): boolean;
    toLanguageModelMessage(): ThinkingMessage;
}
export declare class MarkdownChatResponseContentImpl implements MarkdownChatResponseContent {
    readonly kind = "markdownContent";
    protected _content: MarkdownStringImpl;
    constructor(content: string);
    get content(): MarkdownString;
    asString(): string;
    asDisplayString(): string | undefined;
    merge(nextChatResponseContent: MarkdownChatResponseContent): boolean;
    toLanguageModelMessage(): TextMessage;
}
export declare class InformationalChatResponseContentImpl implements InformationalChatResponseContent {
    readonly kind = "informational";
    protected _content: MarkdownStringImpl;
    constructor(content: string);
    get content(): MarkdownString;
    asString(): string | undefined;
    merge(nextChatResponseContent: InformationalChatResponseContent): boolean;
}
export declare class CodeChatResponseContentImpl implements CodeChatResponseContent {
    readonly kind = "code";
    protected _code: string;
    protected _language?: string;
    protected _location?: Location;
    constructor(code: string, language?: string, location?: Location);
    get code(): string;
    get language(): string | undefined;
    get location(): Location | undefined;
    asString(): string;
    merge(nextChatResponseContent: CodeChatResponseContent): boolean;
}
export declare class ToolCallChatResponseContentImpl implements ToolCallChatResponseContent {
    readonly kind = "toolCall";
    protected _id?: string;
    protected _name?: string;
    protected _arguments?: string;
    protected _finished?: boolean;
    protected _result?: ToolCallResult;
    protected _confirmed: Promise<boolean>;
    protected _confirmationResolver?: (value: boolean) => void;
    protected _confirmationRejecter?: (reason?: unknown) => void;
    constructor(id?: string, name?: string, arg_string?: string, finished?: boolean, result?: ToolCallResult);
    get id(): string | undefined;
    get name(): string | undefined;
    get arguments(): string | undefined;
    get finished(): boolean;
    get result(): ToolCallResult | undefined;
    get confirmed(): Promise<boolean>;
    /**
     * Create a confirmation promise that can be resolved/rejected later
     */
    createConfirmationPromise(): Promise<boolean>;
    /**
     * Confirm the tool execution
     */
    confirm(): void;
    /**
     * Deny the tool execution
     */
    deny(): void;
    /**
     * Cancel the confirmation (reject the promise)
     */
    cancelConfirmation(reason?: unknown): void;
    asString(): string;
    asDisplayString(): string;
    merge(nextChatResponseContent: ToolCallChatResponseContent): boolean;
    toLanguageModelMessage(): [ToolUseMessage, ToolResultMessage];
}
export declare const COMMAND_CHAT_RESPONSE_COMMAND: Command;
export declare class CommandChatResponseContentImpl implements CommandChatResponseContent {
    command?: Command | undefined;
    customCallback?: CustomCallback | undefined;
    protected args?: unknown[] | undefined;
    readonly kind = "command";
    constructor(command?: Command | undefined, customCallback?: CustomCallback | undefined, args?: unknown[] | undefined);
    get arguments(): unknown[];
    asString(): string;
}
export declare class HorizontalLayoutChatResponseContentImpl implements HorizontalLayoutChatResponseContent {
    readonly kind = "horizontal";
    protected _content: ChatResponseContent[];
    constructor(content?: ChatResponseContent[]);
    get content(): ChatResponseContent[];
    asString(): string;
    asDisplayString(): string | undefined;
    merge(nextChatResponseContent: ChatResponseContent): boolean;
}
/**
 * Default implementation for the QuestionResponseContent.
 */
export declare class QuestionResponseContentImpl implements QuestionResponseContent {
    question: string;
    options: {
        text: string;
        value?: string;
    }[];
    request: MutableChatRequestModel;
    handler: QuestionResponseHandler;
    readonly kind = "question";
    protected _selectedOption: {
        text: string;
        value?: string;
    } | undefined;
    constructor(question: string, options: {
        text: string;
        value?: string;
    }[], request: MutableChatRequestModel, handler: QuestionResponseHandler);
    set selectedOption(option: {
        text: string;
        value?: string;
    } | undefined);
    get selectedOption(): {
        text: string;
        value?: string;
    } | undefined;
    asString?(): string | undefined;
    merge?(): boolean;
}
declare class ChatResponseImpl implements ChatResponse {
    protected readonly _onDidChangeEmitter: Emitter<void>;
    onDidChange: Event<void>;
    protected _content: ChatResponseContent[];
    protected _responseRepresentation: string;
    protected _responseRepresentationForDisplay: string;
    constructor();
    get content(): ChatResponseContent[];
    clearContent(): void;
    addContents(contents: ChatResponseContent[]): void;
    addContent(nextContent: ChatResponseContent): void;
    protected doAddContent(nextContent: ChatResponseContent): void;
    responseContentChanged(): void;
    protected _updateResponseRepresentation(): void;
    protected responseRepresentationsToString(content: ChatResponseContent[], collect: 'asString' | 'asDisplayString'): string;
    asString(): string;
    asDisplayString(): string;
}
export declare class MutableChatResponseModel implements ChatResponseModel {
    protected readonly _onDidChangeEmitter: Emitter<void>;
    onDidChange: Event<void>;
    data: {};
    protected _id: string;
    protected _requestId: string;
    protected _progressMessages: ChatProgressMessage[];
    protected _response: ChatResponseImpl;
    protected _isComplete: boolean;
    protected _isWaitingForInput: boolean;
    protected _agentId?: string;
    protected _isError: boolean;
    protected _errorObject: Error | undefined;
    protected _cancellationToken: CancellationTokenSource;
    constructor(requestId: string, agentId?: string);
    get id(): string;
    get requestId(): string;
    get progressMessages(): ChatProgressMessage[];
    addProgressMessage(message: {
        content: string;
    } & Partial<Omit<ChatProgressMessage, 'kind'>>): ChatProgressMessage;
    getProgressMessage(id: string): ChatProgressMessage | undefined;
    updateProgressMessage(message: {
        id: string;
    } & Partial<Omit<ChatProgressMessage, 'kind'>>): void;
    get response(): ChatResponseImpl;
    get isComplete(): boolean;
    get isCanceled(): boolean;
    get isWaitingForInput(): boolean;
    get agentId(): string | undefined;
    overrideAgentId(agentId: string): void;
    complete(): void;
    cancel(): void;
    get cancellationToken(): CancellationToken;
    waitForInput(): void;
    stopWaitingForInput(): void;
    error(error: Error): void;
    get errorObject(): Error | undefined;
    get isError(): boolean;
}
export declare class ErrorChatResponseModel extends MutableChatResponseModel {
    constructor(requestId: string, error: Error, agentId?: string);
}
export declare class ProgressChatResponseContentImpl implements ProgressChatResponseContent {
    readonly kind = "progress";
    protected _message: string;
    constructor(message: string);
    get message(): string;
    asString(): string;
    asDisplayString(): string | undefined;
    merge(nextChatResponseContent: ProgressChatResponseContent): boolean;
    toLanguageModelMessage(): TextMessage;
}
//# sourceMappingURL=chat-model.d.ts.map