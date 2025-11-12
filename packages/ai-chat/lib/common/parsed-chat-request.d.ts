import { ResolvedAIVariable, ToolRequest } from '@theia/ai-core';
import { ChatRequest } from './chat-model';
export declare const chatVariableLeader = "#";
export declare const chatAgentLeader = "@";
export declare const chatFunctionLeader = "~";
export declare const chatSubcommandLeader = "/";
/**********************
 * INTERFACES AND TYPE GUARDS
 **********************/
export interface OffsetRange {
    readonly start: number;
    readonly endExclusive: number;
}
export interface ParsedChatRequest {
    readonly request: ChatRequest;
    readonly parts: ParsedChatRequestPart[];
    readonly toolRequests: Map<string, ToolRequest>;
    readonly variables: ResolvedAIVariable[];
}
export interface ParsedChatRequestPart {
    readonly kind: string;
    /**
     * The text as represented in the ChatRequest
     */
    readonly text: string;
    /**
     * The text as will be sent to the LLM
     */
    readonly promptText: string;
    readonly range: OffsetRange;
}
export declare class ParsedChatRequestTextPart implements ParsedChatRequestPart {
    readonly range: OffsetRange;
    readonly text: string;
    readonly kind: 'text';
    constructor(range: OffsetRange, text: string);
    get promptText(): string;
}
export declare class ParsedChatRequestVariablePart implements ParsedChatRequestPart {
    readonly range: OffsetRange;
    readonly variableName: string;
    readonly variableArg: string | undefined;
    readonly kind: 'var';
    resolution: ResolvedAIVariable;
    constructor(range: OffsetRange, variableName: string, variableArg: string | undefined);
    get text(): string;
    get promptText(): string;
}
export declare class ParsedChatRequestFunctionPart implements ParsedChatRequestPart {
    readonly range: OffsetRange;
    readonly toolRequest: ToolRequest;
    readonly kind: 'function';
    constructor(range: OffsetRange, toolRequest: ToolRequest);
    get text(): string;
    get promptText(): string;
}
export declare class ParsedChatRequestAgentPart implements ParsedChatRequestPart {
    readonly range: OffsetRange;
    readonly agentId: string;
    readonly agentName: string;
    readonly kind: 'agent';
    constructor(range: OffsetRange, agentId: string, agentName: string);
    get text(): string;
    get promptText(): string;
}
//# sourceMappingURL=parsed-chat-request.d.ts.map