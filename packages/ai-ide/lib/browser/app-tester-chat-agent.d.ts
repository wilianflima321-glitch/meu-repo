import { AbstractStreamParsingChatAgent } from '@theia/ai-chat/lib/common/chat-agents';
import { MutableChatRequestModel } from '@theia/ai-chat/lib/common/chat-model';
import { LanguageModelRequirement } from '@theia/ai-core/lib/common';
import { MCPFrontendService, MCPServerDescription } from '@theia/ai-mcp/lib/common/mcp-server-manager';
import { PreferenceService } from '@theia/core/lib/common';
export declare const AppTesterChatAgentId = "AppTester";
export declare class AppTesterChatAgent extends AbstractStreamParsingChatAgent {
    protected readonly mcpService: MCPFrontendService;
    protected readonly preferenceService: PreferenceService;
    protected readonly llmProviderService: any;
    id: string;
    name: string;
    languageModelRequirements: LanguageModelRequirement[];
    protected defaultLanguageModelPurpose: string;
    description: any;
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
    protected sendLlmRequest(request: MutableChatRequestModel, messages: any[], toolRequests: any[], languageModel: any): Promise<any>;
}
//# sourceMappingURL=app-tester-chat-agent.d.ts.map