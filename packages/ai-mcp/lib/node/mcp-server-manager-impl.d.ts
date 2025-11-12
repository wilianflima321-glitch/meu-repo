import { MCPServerDescription, MCPServerManager, MCPFrontendNotificationService } from '../common/mcp-server-manager';
import { MCPServer } from './mcp-server';
import { Disposable } from '@theia/core/lib/common/disposable';
import { CallToolResult, ListResourcesResult, ReadResourceResult } from '@modelcontextprotocol/sdk/types';
export declare class MCPServerManagerImpl implements MCPServerManager {
    protected servers: Map<string, MCPServer>;
    protected clients: Array<MCPFrontendNotificationService>;
    protected serverListeners: Map<string, Disposable>;
    stopServer(serverName: string): Promise<void>;
    getRunningServers(): Promise<string[]>;
    callTool(serverName: string, toolName: string, arg_string: string): Promise<CallToolResult>;
    startServer(serverName: string): Promise<void>;
    getServerNames(): Promise<string[]>;
    getServerDescription(name: string): Promise<MCPServerDescription | undefined>;
    getTools(serverName: string): ReturnType<MCPServer['getTools']>;
    addOrUpdateServer(description: MCPServerDescription): void;
    removeServer(name: string): void;
    setClient(client: MCPFrontendNotificationService): void;
    disconnectClient(client: MCPFrontendNotificationService): void;
    private notifyClients;
    readResource(serverName: string, resourceId: string): Promise<ReadResourceResult>;
    getResources(serverName: string): Promise<ListResourcesResult>;
}
//# sourceMappingURL=mcp-server-manager-impl.d.ts.map