import { AIVariableResolutionRequest, AIVariableService } from '@theia/ai-core';
import { Emitter, ILogger, URI } from '@theia/core';
import { Event } from '@theia/core/shared/vscode-languageserver-protocol';
import { ChatAgentService } from './chat-agent-service';
import { ChatAgent, ChatAgentLocation, ChatSessionContext } from './chat-agents';
import { ChatContext, ChatModel, ChatRequest, ChatRequestModel, ChatResponseModel, MutableChatModel, MutableChatRequestModel } from './chat-model';
import { ChatRequestParser } from './chat-request-parser';
import { ChatSessionNamingService } from './chat-session-naming-service';
import { ParsedChatRequest, ParsedChatRequestAgentPart } from './parsed-chat-request';
export interface ChatRequestInvocation {
    /**
     * Promise which completes once the request preprocessing is complete.
     */
    requestCompleted: Promise<ChatRequestModel>;
    /**
     * Promise which completes once a response is expected to arrive.
     */
    responseCreated: Promise<ChatResponseModel>;
    /**
     * Promise which completes once the response is complete.
     */
    responseCompleted: Promise<ChatResponseModel>;
}
export interface ChatSession {
    id: string;
    title?: string;
    lastInteraction?: Date;
    model: ChatModel;
    isActive: boolean;
    pinnedAgent?: ChatAgent;
}
export interface ActiveSessionChangedEvent {
    type: 'activeChange';
    sessionId: string | undefined;
    focus?: boolean;
}
export declare function isActiveSessionChangedEvent(obj: unknown): obj is ActiveSessionChangedEvent;
export interface SessionCreatedEvent {
    type: 'created';
    sessionId: string;
}
export declare function isSessionCreatedEvent(obj: unknown): obj is SessionCreatedEvent;
export interface SessionDeletedEvent {
    type: 'deleted';
    sessionId: string;
}
export declare function isSessionDeletedEvent(obj: unknown): obj is SessionDeletedEvent;
export interface SessionOptions {
    focus?: boolean;
}
/**
 * The default chat agent to invoke
 */
export declare const DefaultChatAgentId: unique symbol;
export interface DefaultChatAgentId {
    id: string;
}
/**
 * In case no fitting chat agent is available, this one will be used (if it is itself available)
 */
export declare const FallbackChatAgentId: unique symbol;
export interface FallbackChatAgentId {
    id: string;
}
export declare const PinChatAgent: unique symbol;
export type PinChatAgent = boolean;
export declare const ChatService: unique symbol;
export declare const ChatServiceFactory: unique symbol;
export interface ChatService {
    onSessionEvent: Event<ActiveSessionChangedEvent | SessionCreatedEvent | SessionDeletedEvent>;
    getSession(id: string): ChatSession | undefined;
    getSessions(): ChatSession[];
    createSession(location?: ChatAgentLocation, options?: SessionOptions, pinnedAgent?: ChatAgent): ChatSession;
    deleteSession(sessionId: string): void;
    getActiveSession(): ChatSession | undefined;
    setActiveSession(sessionId: string, options?: SessionOptions): void;
    sendRequest(sessionId: string, request: ChatRequest): Promise<ChatRequestInvocation | undefined>;
    deleteChangeSet(sessionId: string): void;
    deleteChangeSetElement(sessionId: string, uri: URI): void;
    cancelRequest(sessionId: string, requestId: string): Promise<void>;
}
interface ChatSessionInternal extends ChatSession {
    model: MutableChatModel;
}
export declare class ChatServiceImpl implements ChatService {
    protected readonly onSessionEventEmitter: Emitter<ActiveSessionChangedEvent | SessionCreatedEvent | SessionDeletedEvent>;
    onSessionEvent: import("@theia/core").Event<ActiveSessionChangedEvent | SessionCreatedEvent | SessionDeletedEvent>;
    protected chatAgentService: ChatAgentService;
    protected defaultChatAgentId: DefaultChatAgentId | undefined;
    protected fallbackChatAgentId: FallbackChatAgentId | undefined;
    protected chatSessionNamingService: ChatSessionNamingService | undefined;
    protected pinChatAgent: boolean | undefined;
    protected chatRequestParser: ChatRequestParser;
    protected variableService: AIVariableService;
    protected logger: ILogger;
    protected _sessions: ChatSessionInternal[];
    getSessions(): ChatSessionInternal[];
    getSession(id: string): ChatSessionInternal | undefined;
    createSession(location?: ChatAgentLocation, options?: SessionOptions, pinnedAgent?: ChatAgent): ChatSession;
    deleteSession(sessionId: string): void;
    getActiveSession(): ChatSession | undefined;
    setActiveSession(sessionId: string | undefined, options?: SessionOptions): void;
    sendRequest(sessionId: string, request: ChatRequest): Promise<ChatRequestInvocation | undefined>;
    protected cancelIncompleteRequests(session: ChatSessionInternal): void;
    protected updateSessionMetadata(session: ChatSessionInternal, request: MutableChatRequestModel): void;
    protected resolveChatContext(resolutionRequests: readonly AIVariableResolutionRequest[], context: ChatSessionContext): Promise<ChatContext>;
    cancelRequest(sessionId: string, requestId: string): Promise<void>;
    protected getAgent(parsedRequest: ParsedChatRequest, session: ChatSession): ChatAgent | undefined;
    /**
     * Determines if chat agent pinning is enabled.
     * Can be overridden by subclasses to provide different logic (e.g., using preferences).
     */
    protected isPinChatAgentEnabled(): boolean;
    /**
     * Handle pinned agent by:
     * - checking if an agent is pinned, and use it if no other agent is mentioned
     * - pinning the current agent
     */
    protected handlePinnedAgent(parsedRequest: ParsedChatRequest, session: ChatSession, agent: ChatAgent | undefined): ChatAgent | undefined;
    protected initialAgentSelection(parsedRequest: ParsedChatRequest): ChatAgent | undefined;
    protected getMentionedAgent(parsedRequest: ParsedChatRequest): ParsedChatRequestAgentPart | undefined;
    deleteChangeSet(sessionId: string): void;
    deleteChangeSetElement(sessionId: string, uri: URI): void;
}
export {};
//# sourceMappingURL=chat-service.d.ts.map