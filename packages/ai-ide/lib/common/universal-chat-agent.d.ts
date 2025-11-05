import { LanguageModelRequirement, LanguageModel, LanguageModelMessage, LanguageModelResponse } from '@theia/ai-core/lib/common';
import { LlmProviderService } from '../browser/llm-provider-service';
import { AbstractStreamParsingChatAgent } from '@theia/ai-chat/lib/common/chat-agents';
export declare const UniversalChatAgentId = "Universal";
export declare class UniversalChatAgent extends AbstractStreamParsingChatAgent {
    id: string;
    name: string;
    languageModelRequirements: LanguageModelRequirement[];
    protected defaultLanguageModelPurpose: string;
    description: any;
    prompts: {
        id: string;
        defaultVariant: any;
        variants: any[];
    }[];
    protected systemPromptId: string;
    protected llmProviderService: LlmProviderService;
    protected sendLlmRequest(request: any, messages: LanguageModelMessage[], toolRequests: any[], languageModel: LanguageModel): Promise<LanguageModelResponse>;
}
//# sourceMappingURL=universal-chat-agent.d.ts.map