import { LanguageModelRequirement, LanguageModel, LanguageModelMessage, LanguageModelResponse } from '@theia/ai-core/lib/common';
import { LlmProviderService } from './llm-provider-service';
import { AbstractStreamParsingChatAgent } from '@theia/ai-chat/lib/common/chat-agents';
export declare const UniversalChatAgentId = "Universal";
export declare class UniversalChatAgent extends AbstractStreamParsingChatAgent {
    id: string;
    name: string;
    languageModelRequirements: LanguageModelRequirement[];
    protected defaultLanguageModelPurpose: string;
    description: string;
    prompts: {
        id: string;
        defaultVariant: any;
        variants: any[];
    }[];
    protected systemPromptId: string;
    private _llmProviderService?;
    protected set llmProviderService(v: LlmProviderService);
    protected get llmProviderService(): LlmProviderService;
    protected sendLlmRequest(request: any, messages: LanguageModelMessage[], toolRequests: any[], languageModel: LanguageModel): Promise<LanguageModelResponse>;
}
