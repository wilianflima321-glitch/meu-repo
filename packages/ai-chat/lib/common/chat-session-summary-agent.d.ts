import { LanguageModelRequirement, PromptVariantSet } from '@theia/ai-core';
import { AbstractStreamParsingChatAgent, ChatAgent } from './chat-agents';
export declare class ChatSessionSummaryAgent extends AbstractStreamParsingChatAgent implements ChatAgent {
    static ID: string;
    id: string;
    name: string;
    description: string;
    variables: never[];
    prompts: PromptVariantSet[];
    protected readonly defaultLanguageModelPurpose = "chat-session-summary";
    languageModelRequirements: LanguageModelRequirement[];
    agentSpecificVariables: never[];
    functions: never[];
    locations: never[];
    tags: never[];
}
//# sourceMappingURL=chat-session-summary-agent.d.ts.map