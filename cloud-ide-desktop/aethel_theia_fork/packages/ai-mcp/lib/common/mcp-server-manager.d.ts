/**
 * MCP (Model Context Protocol) server manager
 */

export interface MCPServer {
    id: string;
    name: string;
    status: 'running' | 'stopped' | 'error';
}

export interface MCPServerManager {
    getServers(): MCPServer[];
    startServer(id: string): Promise<void>;
    stopServer(id: string): Promise<void>;
}
