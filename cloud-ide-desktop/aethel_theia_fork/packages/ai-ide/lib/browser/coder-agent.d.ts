import { AbstractStreamParsingChatAgent, ChatRequestModel, ChatService, ChatSession, MutableChatRequestModel } from '@theia/ai-chat/lib/common';
import { LanguageModelRequirement, PromptVariantSet } from '@theia/ai-core';
export declare class CoderAgent extends AbstractStreamParsingChatAgent {
    protected readonly chatService: ChatService;
    id: string;
    name: string;
    languageModelRequirements: LanguageModelRequirement[];
    protected defaultLanguageModelPurpose: string;
    description: any;
    prompts: PromptVariantSet[];
    functions: string[];
    protected systemPromptId: string | undefined;
    invoke(request: MutableChatRequestModel): Promise<void>;
    suggest(context: ChatSession | ChatRequestModel): Promise<void>;
}
//# sourceMappingURL=coder-agent.d.ts.map