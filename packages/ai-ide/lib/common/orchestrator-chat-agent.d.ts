import { LanguageModel, LanguageModelMessage, LanguageModelRequirement, LanguageModelResponse } from '@theia/ai-core';
import { ChatAgentService } from '@theia/ai-chat/lib/common/chat-agent-service';
import { LlmProviderService } from '../browser/llm-provider-service';
import { ChatToolRequest } from '@theia/ai-chat/lib/common/chat-tool-request-service';
import { AbstractStreamParsingChatAgent } from '@theia/ai-chat/lib/common/chat-agents';
import { MutableChatRequestModel } from '@theia/ai-chat/lib/common/chat-model';
export declare const OrchestratorChatAgentId = "Orchestrator";
export declare class OrchestratorChatAgent extends AbstractStreamParsingChatAgent {
    id: string;
    name: string;
    languageModelRequirements: LanguageModelRequirement[];
    protected defaultLanguageModelPurpose: string;
    variables: string[];
    prompts: any[];
    description: any;
    iconClass: string;
    protected systemPromptId: string;
    private fallBackChatAgentId;
    protected chatAgentService: ChatAgentService;
    protected llmProviderService: LlmProviderService;
    invoke(request: MutableChatRequestModel): Promise<void>;
    protected sendLlmRequest(request: MutableChatRequestModel, messages: LanguageModelMessage[], toolRequests: ChatToolRequest[], languageModel: LanguageModel): Promise<LanguageModelResponse>;
    protected addContentsToResponse(response: LanguageModelResponse, request: MutableChatRequestModel): Promise<void>;
}
//# sourceMappingURL=orchestrator-chat-agent.d.ts.map