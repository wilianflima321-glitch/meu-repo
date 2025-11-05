import { AbstractStreamParsingChatAgent, ChatRequestModel, ChatService, ChatSession, MutableChatRequestModel } from '@theia/ai-chat/lib/common';
import { LanguageModelRequirement } from '@theia/ai-core';
export declare class ArchitectAgent extends AbstractStreamParsingChatAgent {
    protected readonly chatService: ChatService;
    name: string;
    id: string;
    languageModelRequirements: LanguageModelRequirement[];
    protected defaultLanguageModelPurpose: string;
    description: any;
    prompts: any[];
    functions: string[];
    protected systemPromptId: string | undefined;
    invoke(request: MutableChatRequestModel): Promise<void>;
    suggest(context: ChatSession | ChatRequestModel): Promise<void>;
}
//# sourceMappingURL=architect-agent.d.ts.map