import { AIVariableService } from '@theia/ai-core';
import { Command, CommandContribution, CommandRegistry } from '@theia/core';
import { ChatService } from '../common';
export declare const VARIABLE_ADD_CONTEXT_COMMAND: Command;
export declare class AIChatFrontendContribution implements CommandContribution {
    protected readonly variableService: AIVariableService;
    protected readonly chatService: ChatService;
    registerCommands(registry: CommandRegistry): void;
    addContextVariable(variableName: string, arg: string | undefined): Promise<void>;
}
//# sourceMappingURL=ai-chat-frontend-contribution.d.ts.map