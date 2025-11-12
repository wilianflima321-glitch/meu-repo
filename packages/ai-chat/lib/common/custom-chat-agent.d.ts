import { LanguageModelRequirement } from '@theia/ai-core';
import { AbstractStreamParsingChatAgent } from './chat-agents';
export declare class CustomChatAgent extends AbstractStreamParsingChatAgent {
    id: string;
    name: string;
    languageModelRequirements: LanguageModelRequirement[];
    protected defaultLanguageModelPurpose: string;
    set prompt(prompt: string);
}
//# sourceMappingURL=custom-chat-agent.d.ts.map