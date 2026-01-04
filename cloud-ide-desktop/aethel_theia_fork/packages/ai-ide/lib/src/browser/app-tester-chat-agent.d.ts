import { AbstractStreamParsingChatAgent } from '@theia/ai-chat/lib/common/chat-agents';
import { MutableChatRequestModel } from '@theia/ai-chat/lib/common/chat-model';
import { LanguageModelRequirement, LanguageModelResponse } from '@theia/ai-core/lib/common';
import { MCPFrontendService, MCPServerDescription } from '@theia/ai-mcp/lib/common/mcp-server-manager';
import { LlmProviderService } from '../browser/llm-provider-service';
import { PreferenceService } from '@theia/core/lib/common';
export declare const AppTesterChatAgentId = "AppTester";
export declare class AppTesterChatAgent extends AbstractStreamParsingChatAgent {
    private _mcpService?;
    protected set mcpService(v: MCPFrontendService);
    protected get mcpService(): MCPFrontendService;
    private _preferenceService?;
    protected set preferenceService(v: PreferenceService);
    protected get preferenceService(): PreferenceService;
    private _llmProviderService?;
    protected set llmProviderService(v: LlmProviderService);
    protected get llmProviderService(): LlmProviderService;
    id: string;
    name: string;
    languageModelRequirements: LanguageModelRequirement[];
    protected defaultLanguageModelPurpose: string;
    description: string;
    iconClass: string;
    protected systemPromptId: string;
    prompts: {
        id: string;
        defaultVariant: any;
        variants: any[];
    }[];
    /**
     * Override invoke to check if the Playwright MCP server is running, and if not, ask the user if it should be started.
     */
    invoke(request: MutableChatRequestModel): Promise<void>;
    protected requiresStartingServers(): Promise<boolean>;
    protected startServers(): Promise<void>;
    /**
     * Starts the Playwright MCP server if it doesn't exist or isn't running.
     *
     * @returns A promise that resolves when the server is started
     */
    ensureServersStarted(...servers: MCPServerDescription[]): Promise<void>;
    protected sendLlmRequest(request: MutableChatRequestModel, messages: any[], toolRequests: any[], languageModel: any): Promise<LanguageModelResponse>;
}
