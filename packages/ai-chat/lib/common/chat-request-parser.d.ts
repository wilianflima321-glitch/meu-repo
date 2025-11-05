import { ChatAgentService } from './chat-agent-service';
import { ChatAgentLocation } from './chat-agents';
import { ChatContext, ChatRequest } from './chat-model';
import { ParsedChatRequest, ParsedChatRequestPart } from './parsed-chat-request';
import { AIVariable, AIVariableService, ToolInvocationRegistry, ToolRequest } from '@theia/ai-core';
import { ILogger } from '@theia/core';
export declare const ChatRequestParser: unique symbol;
export interface ChatRequestParser {
    parseChatRequest(request: ChatRequest, location: ChatAgentLocation, context: ChatContext): Promise<ParsedChatRequest>;
}
export declare class ChatRequestParserImpl implements ChatRequestParser {
    private readonly agentService;
    private readonly variableService;
    private readonly toolInvocationRegistry;
    private readonly logger;
    constructor(agentService: ChatAgentService, variableService: AIVariableService, toolInvocationRegistry: ToolInvocationRegistry, logger: ILogger);
    parseChatRequest(request: ChatRequest, location: ChatAgentLocation, context: ChatContext): Promise<ParsedChatRequest>;
    protected parseParts(request: ChatRequest, location: ChatAgentLocation): {
        parts: ParsedChatRequestPart[];
        toolRequests: Map<string, ToolRequest>;
        variables: Map<string, AIVariable>;
    };
    /**
     * Parse text for tool requests and add them to the given map
     */
    private parseFunctionsFromVariableText;
    private tryToParseAgent;
    private tryToParseVariable;
    private tryToParseFunction;
}
//# sourceMappingURL=chat-request-parser.d.ts.map