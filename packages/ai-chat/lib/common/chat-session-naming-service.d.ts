import { Agent, AgentService, LanguageModelRegistry, LanguageModelRequirement, LanguageModelService, PromptService } from '@theia/ai-core';
import { ChatSession } from './chat-service';
export declare class ChatSessionNamingService {
    protected agentService: AgentService;
    generateChatSessionName(chatSession: ChatSession, otherNames: string[]): Promise<string | undefined>;
}
export declare class ChatSessionNamingAgent implements Agent {
    static ID: string;
    id: string;
    name: string;
    description: string;
    variables: never[];
    prompts: import("@theia/ai-core").PromptVariantSet[];
    languageModelRequirements: LanguageModelRequirement[];
    agentSpecificVariables: {
        name: string;
        usedInPrompt: boolean;
        description: string;
    }[];
    functions: never[];
    protected readonly lmRegistry: LanguageModelRegistry;
    protected readonly languageModelService: LanguageModelService;
    protected promptService: PromptService;
    generateChatSessionName(chatSession: ChatSession, otherNames: string[]): Promise<string>;
}
//# sourceMappingURL=chat-session-naming-service.d.ts.map