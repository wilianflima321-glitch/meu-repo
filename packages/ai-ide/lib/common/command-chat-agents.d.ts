import { AbstractTextToModelParsingChatAgent, SystemMessageDescription } from '@theia/ai-chat/lib/common/chat-agents';
import { AIVariableContext, LanguageModelRequirement } from '@theia/ai-core';
import { MutableChatRequestModel, ChatResponseContent } from '@theia/ai-chat/lib/common/chat-model';
import { CommandRegistry, MessageService } from '@theia/core';
import { LlmProviderService } from '../browser/llm-provider-service';
interface ParsedCommand {
    type: 'theia-command' | 'custom-handler' | 'no-command';
    commandId: string;
    arguments?: string[];
    message?: string;
}
export declare class CommandChatAgent extends AbstractTextToModelParsingChatAgent<ParsedCommand> {
    protected commandRegistry: CommandRegistry;
    protected messageService: MessageService;
    protected llmProviderService: LlmProviderService;
    id: string;
    name: string;
    languageModelRequirements: LanguageModelRequirement[];
    protected defaultLanguageModelPurpose: string;
    description: string;
    prompts: any[];
    agentSpecificVariables: {
        name: string;
        description: string;
        usedInPrompt: boolean;
    }[];
    protected getSystemMessageDescription(context: AIVariableContext): Promise<SystemMessageDescription | undefined>;
    /**
     * @param text the text received from the language model
     * @returns the parsed command if the text contained a valid command.
     * If there was no json in the text, return a no-command response.
     */
    protected parseTextResponse(text: string): Promise<ParsedCommand>;
    protected sendLlmRequest(request: MutableChatRequestModel, messages: any[], toolRequests: any[], languageModel: any): Promise<any>;
    protected createResponseContent(parsedCommand: ParsedCommand, request: MutableChatRequestModel): ChatResponseContent;
    protected commandCallback(...commandArgs: unknown[]): Promise<void>;
}
export {};
//# sourceMappingURL=command-chat-agents.d.ts.map