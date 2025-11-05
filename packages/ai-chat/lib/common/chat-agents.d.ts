import { AgentSpecificVariables, AIVariableContext, AIVariableResolutionRequest, LanguageModel, LanguageModelMessage, LanguageModelRequirement, LanguageModelResponse, LanguageModelService, LanguageModelStreamResponse, PromptService, ResolvedPromptFragment, PromptVariantSet, ToolCall, ToolRequest } from '@theia/ai-core';
import { Agent, LanguageModelRegistry, LanguageModelStreamResponsePart } from '@theia/ai-core/lib/common';
import { ContributionProvider, ILogger } from '@theia/core';
import { ChatAgentService } from './chat-agent-service';
import { ChatModel, ChatRequestModel, ChatResponseContent, MutableChatRequestModel } from './chat-model';
import { ChatToolRequest, ChatToolRequestService } from './chat-tool-request-service';
import { DefaultResponseContentFactory, ResponseContentMatcher, ResponseContentMatcherProvider } from './response-content-matcher';
/**
 * System message content, enriched with function descriptions.
 */
export interface SystemMessageDescription {
    text: string;
    /** All functions references in the system message. */
    functionDescriptions?: Map<string, ToolRequest>;
}
export declare namespace SystemMessageDescription {
    function fromResolvedPromptFragment(resolvedPrompt: ResolvedPromptFragment): SystemMessageDescription;
}
export interface ChatSessionContext extends AIVariableContext {
    request?: ChatRequestModel;
    model: ChatModel;
}
export declare namespace ChatSessionContext {
    function is(candidate: unknown): candidate is ChatSessionContext;
    function getVariables(context: ChatSessionContext): readonly AIVariableResolutionRequest[];
}
/**
 * The location from where an chat agent may be invoked.
 * Based on the location, a different context may be available.
 */
export declare enum ChatAgentLocation {
    Panel = "panel",
    Terminal = "terminal",
    Notebook = "notebook",
    Editor = "editor"
}
export declare namespace ChatAgentLocation {
    const ALL: ChatAgentLocation[];
    function fromRaw(value: string): ChatAgentLocation;
}
export declare const ChatAgent: unique symbol;
/**
 * A chat agent is a specialized agent with a common interface for its invocation.
 */
export interface ChatAgent extends Agent {
    locations: ChatAgentLocation[];
    iconClass?: string;
    invoke(request: MutableChatRequestModel, chatAgentService?: ChatAgentService): Promise<void>;
}
export declare abstract class AbstractChatAgent implements ChatAgent {
    protected languageModelRegistry: LanguageModelRegistry;
    protected logger: ILogger;
    protected chatToolRequestService: ChatToolRequestService;
    protected languageModelService: LanguageModelService;
    protected promptService: PromptService;
    protected contentMatcherProviders: ContributionProvider<ResponseContentMatcherProvider>;
    protected defaultContentFactory: DefaultResponseContentFactory;
    readonly abstract id: string;
    readonly abstract name: string;
    readonly abstract languageModelRequirements: LanguageModelRequirement[];
    iconClass: string;
    locations: ChatAgentLocation[];
    tags: string[];
    description: string;
    variables: string[];
    prompts: PromptVariantSet[];
    agentSpecificVariables: AgentSpecificVariables[];
    functions: string[];
    protected readonly abstract defaultLanguageModelPurpose: string;
    protected systemPromptId: string | undefined;
    protected additionalToolRequests: ToolRequest[];
    protected contentMatchers: ResponseContentMatcher[];
    init(): void;
    protected initializeContentMatchers(): void;
    invoke(request: MutableChatRequestModel): Promise<void>;
    protected parseContents(text: string, request: MutableChatRequestModel): ChatResponseContent[];
    protected handleError(request: MutableChatRequestModel, error: Error): void;
    protected getLanguageModelSelector(languageModelPurpose: string): LanguageModelRequirement;
    protected getLanguageModel(languageModelPurpose: string): Promise<LanguageModel>;
    protected selectLanguageModel(selector: LanguageModelRequirement): Promise<LanguageModel>;
    protected getSystemMessageDescription(context: AIVariableContext): Promise<SystemMessageDescription | undefined>;
    protected getMessages(model: ChatModel, includeResponseInProgress?: boolean): Promise<LanguageModelMessage[]>;
    /**
     * Deduplicate tools by name (falling back to id) while preserving the first occurrence and order.
     */
    protected deduplicateTools(toolRequests: ChatToolRequest[]): ChatToolRequest[];
    protected sendLlmRequest(request: MutableChatRequestModel, messages: LanguageModelMessage[], toolRequests: ChatToolRequest[], languageModel: LanguageModel): Promise<LanguageModelResponse>;
    /**
     * @returns the settings, such as `temperature`, to be used in all language model requests. Returns `undefined` by default.
     */
    protected getLlmSettings(): {
        [key: string]: unknown;
    } | undefined;
    /**
     * Invoked after the response by the LLM completed successfully.
     *
     * The default implementation sets the state of the response to `complete`.
     * Subclasses may override this method to perform additional actions or keep the response open for processing further requests.
     */
    protected onResponseComplete(request: MutableChatRequestModel): Promise<void>;
    protected abstract addContentsToResponse(languageModelResponse: LanguageModelResponse, request: MutableChatRequestModel): Promise<void>;
}
export declare abstract class AbstractTextToModelParsingChatAgent<T> extends AbstractChatAgent {
    protected addContentsToResponse(languageModelResponse: LanguageModelResponse, request: MutableChatRequestModel): Promise<void>;
    protected abstract parseTextResponse(text: string): Promise<T>;
    protected abstract createResponseContent(parsedModel: T, request: MutableChatRequestModel): ChatResponseContent;
}
/**
 * Factory for creating ToolCallChatResponseContent instances.
 */
export declare class ToolCallChatResponseContentFactory {
    create(toolCall: ToolCall): ChatResponseContent;
}
export declare abstract class AbstractStreamParsingChatAgent extends AbstractChatAgent {
    protected toolCallResponseContentFactory: ToolCallChatResponseContentFactory;
    protected addContentsToResponse(languageModelResponse: LanguageModelResponse, request: MutableChatRequestModel): Promise<void>;
    protected addStreamResponse(languageModelResponse: LanguageModelStreamResponse, request: MutableChatRequestModel): Promise<void>;
    protected parse(token: LanguageModelStreamResponsePart, request: MutableChatRequestModel): ChatResponseContent | ChatResponseContent[];
    /**
     * Creates a ToolCallChatResponseContent instance from the provided tool call data.
     *
     * This method is called when parsing stream response tokens that contain tool call data.
     * Subclasses can override this method to customize the creation of tool call response contents.
     *
     * @param toolCall The ToolCall.
     * @returns A ChatResponseContent representing the tool call.
     */
    protected createToolCallResponseContent(toolCall: ToolCall): ChatResponseContent;
}
//# sourceMappingURL=chat-agents.d.ts.map