import { MCPFrontendService, MCPServerDescription, MCPServerManager } from '../common/mcp-server-manager';
import { ToolInvocationRegistry, ToolRequest, PromptService } from '@theia/ai-core';
import { ListToolsResult } from '@modelcontextprotocol/sdk/types';
export declare class MCPFrontendServiceImpl implements MCPFrontendService {
    protected readonly mcpServerManager: MCPServerManager;
    protected readonly toolInvocationRegistry: ToolInvocationRegistry;
    protected readonly promptService: PromptService;
    startServer(serverName: string): Promise<void>;
    hasServer(serverName: string): Promise<boolean>;
    isServerStarted(serverName: string): Promise<boolean>;
    registerToolsForAllStartedServers(): Promise<void>;
    registerTools(serverName: string): Promise<void>;
    getPromptTemplateId(serverName: string): string;
    protected createPromptTemplate(serverName: string, toolRequests: ToolRequest[]): void;
    stopServer(serverName: string): Promise<void>;
    getStartedServers(): Promise<string[]>;
    getServerNames(): Promise<string[]>;
    getServerDescription(name: string): Promise<MCPServerDescription | undefined>;
    getTools(serverName: string): Promise<ListToolsResult | undefined>;
    addOrUpdateServer(description: MCPServerDescription): Promise<void>;
    private convertToToolRequest;
}
//# sourceMappingURL=mcp-frontend-service.d.ts.map