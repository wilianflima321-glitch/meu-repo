import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { MCPServerDescription, MCPServerStatus } from '../common';
import { CallToolResult, ListResourcesResult, ReadResourceResult } from '@modelcontextprotocol/sdk/types';
export declare class MCPServer {
    private description;
    private transport;
    private client;
    private error?;
    private status;
    private readonly onDidUpdateStatusEmitter;
    readonly onDidUpdateStatus: import("@theia/core/lib/common/event").Event<MCPServerStatus>;
    constructor(description: MCPServerDescription);
    getStatus(): MCPServerStatus;
    setStatus(status: MCPServerStatus): void;
    isRunnning(): boolean;
    getDescription(): Promise<MCPServerDescription>;
    start(): Promise<void>;
    callTool(toolName: string, arg_string: string): Promise<CallToolResult>;
    getTools(): ReturnType<Client['listTools']>;
    update(description: MCPServerDescription): void;
    stop(): Promise<void>;
    readResource(resourceId: string): Promise<ReadResourceResult>;
    getResources(): Promise<ListResourcesResult>;
}
//# sourceMappingURL=mcp-server.d.ts.map