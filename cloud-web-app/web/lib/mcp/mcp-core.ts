/**
 * MCP (Model Context Protocol) Server Implementation
 * 
 * Implementação completa do protocolo MCP da Anthropic para integração
 * com ferramentas externas, servidores e contexto dinâmico.
 * 
 * Similar ao que Cursor, Claude Desktop e outros usam.
 * 
 * @see https://modelcontextprotocol.io/
 */

import { EventEmitter } from 'events';

// ============================================================================
// TYPES - MCP Protocol Specification
// ============================================================================

export interface MCPServerInfo {
  name: string;
  version: string;
  protocolVersion: '2024-11-05';
}

export interface MCPCapabilities {
  tools?: boolean;
  resources?: boolean;
  prompts?: boolean;
  logging?: boolean;
  sampling?: boolean;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      required?: boolean;
    }>;
    required?: string[];
  };
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

export interface MCPToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
    resource?: MCPResource;
  }>;
  isError?: boolean;
}

export interface MCPMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// ============================================================================
// MCP SERVER CLASS
// ============================================================================

export class MCPServer extends EventEmitter {
  private serverInfo: MCPServerInfo;
  private capabilities: MCPCapabilities;
  private tools: Map<string, MCPTool> = new Map();
  private toolHandlers: Map<string, (args: Record<string, unknown>) => Promise<MCPToolResult>> = new Map();
  private resources: Map<string, MCPResource> = new Map();
  private resourceHandlers: Map<string, () => Promise<string>> = new Map();
  private prompts: Map<string, MCPPrompt> = new Map();
  private promptHandlers: Map<string, (args: Record<string, unknown>) => Promise<string>> = new Map();
  
  constructor(name: string, version: string = '1.0.0') {
    super();
    this.serverInfo = {
      name,
      version,
      protocolVersion: '2024-11-05',
    };
    this.capabilities = {
      tools: true,
      resources: true,
      prompts: true,
      logging: true,
    };
  }
  
  // ---------------------------------------------------------------------------
  // Tool Registration
  // ---------------------------------------------------------------------------
  
  registerTool(
    tool: MCPTool,
    handler: (args: Record<string, unknown>) => Promise<MCPToolResult>
  ): void {
    this.tools.set(tool.name, tool);
    this.toolHandlers.set(tool.name, handler);
    this.emit('tool:registered', tool);
  }
  
  unregisterTool(name: string): void {
    this.tools.delete(name);
    this.toolHandlers.delete(name);
    this.emit('tool:unregistered', name);
  }
  
  async executeTool(name: string, args: Record<string, unknown>): Promise<MCPToolResult> {
    const handler = this.toolHandlers.get(name);
    if (!handler) {
      return {
        content: [{ type: 'text', text: `Tool "${name}" not found` }],
        isError: true,
      };
    }
    
    try {
      this.emit('tool:executing', { name, args });
      const result = await handler(args);
      this.emit('tool:executed', { name, args, result });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit('tool:error', { name, args, error: errorMessage });
      return {
        content: [{ type: 'text', text: `Error executing tool "${name}": ${errorMessage}` }],
        isError: true,
      };
    }
  }
  
  // ---------------------------------------------------------------------------
  // Resource Registration
  // ---------------------------------------------------------------------------
  
  registerResource(
    resource: MCPResource,
    handler: () => Promise<string>
  ): void {
    this.resources.set(resource.uri, resource);
    this.resourceHandlers.set(resource.uri, handler);
    this.emit('resource:registered', resource);
  }
  
  async readResource(uri: string): Promise<{ contents: string; mimeType?: string }> {
    const handler = this.resourceHandlers.get(uri);
    const resource = this.resources.get(uri);
    
    if (!handler) {
      throw new Error(`Resource "${uri}" not found`);
    }
    
    const contents = await handler();
    return { contents, mimeType: resource?.mimeType };
  }
  
  // ---------------------------------------------------------------------------
  // Prompt Registration
  // ---------------------------------------------------------------------------
  
  registerPrompt(
    prompt: MCPPrompt,
    handler: (args: Record<string, unknown>) => Promise<string>
  ): void {
    this.prompts.set(prompt.name, prompt);
    this.promptHandlers.set(prompt.name, handler);
    this.emit('prompt:registered', prompt);
  }
  
  async getPrompt(name: string, args: Record<string, unknown> = {}): Promise<string> {
    const handler = this.promptHandlers.get(name);
    if (!handler) {
      throw new Error(`Prompt "${name}" not found`);
    }
    return handler(args);
  }
  
  // ---------------------------------------------------------------------------
  // Protocol Message Handling
  // ---------------------------------------------------------------------------
  
  async handleMessage(message: MCPMessage): Promise<MCPMessage> {
    const { id, method, params } = message;
    
    try {
      switch (method) {
        case 'initialize':
          return this.handleInitialize(id);
          
        case 'tools/list':
          return this.handleToolsList(id);
          
        case 'tools/call':
          return await this.handleToolsCall(id, params as { name: string; arguments: Record<string, unknown> });
          
        case 'resources/list':
          return this.handleResourcesList(id);
          
        case 'resources/read':
          return await this.handleResourcesRead(id, params as { uri: string });
          
        case 'prompts/list':
          return this.handlePromptsList(id);
          
        case 'prompts/get':
          return await this.handlePromptsGet(id, params as { name: string; arguments?: Record<string, unknown> });
          
        case 'ping':
          return { jsonrpc: '2.0', id, result: {} };
          
        default:
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: `Method "${method}" not found` },
          };
      }
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error',
        },
      };
    }
  }
  
  private handleInitialize(id?: string | number): MCPMessage {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: this.serverInfo.protocolVersion,
        capabilities: this.capabilities,
        serverInfo: {
          name: this.serverInfo.name,
          version: this.serverInfo.version,
        },
      },
    };
  }
  
  private handleToolsList(id?: string | number): MCPMessage {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        tools: Array.from(this.tools.values()),
      },
    };
  }
  
  private async handleToolsCall(
    id: string | number | undefined,
    params: { name: string; arguments: Record<string, unknown> }
  ): Promise<MCPMessage> {
    const result = await this.executeTool(params.name, params.arguments);
    return { jsonrpc: '2.0', id, result };
  }
  
  private handleResourcesList(id?: string | number): MCPMessage {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        resources: Array.from(this.resources.values()),
      },
    };
  }
  
  private async handleResourcesRead(
    id: string | number | undefined,
    params: { uri: string }
  ): Promise<MCPMessage> {
    const { contents, mimeType } = await this.readResource(params.uri);
    return {
      jsonrpc: '2.0',
      id,
      result: {
        contents: [{ uri: params.uri, text: contents, mimeType }],
      },
    };
  }
  
  private handlePromptsList(id?: string | number): MCPMessage {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        prompts: Array.from(this.prompts.values()),
      },
    };
  }
  
  private async handlePromptsGet(
    id: string | number | undefined,
    params: { name: string; arguments?: Record<string, unknown> }
  ): Promise<MCPMessage> {
    const messages = await this.getPrompt(params.name, params.arguments || {});
    return {
      jsonrpc: '2.0',
      id,
      result: {
        messages: [{ role: 'user', content: { type: 'text', text: messages } }],
      },
    };
  }
  
  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------
  
  getTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }
  
  getResources(): MCPResource[] {
    return Array.from(this.resources.values());
  }
  
  getPrompts(): MCPPrompt[] {
    return Array.from(this.prompts.values());
  }
  
  getServerInfo(): MCPServerInfo {
    return this.serverInfo;
  }
  
  getCapabilities(): MCPCapabilities {
    return this.capabilities;
  }
}

// ============================================================================
// MCP CLIENT CLASS
// ============================================================================

export class MCPClient extends EventEmitter {
  private servers: Map<string, MCPServer> = new Map();
  private messageId: number = 0;
  
  constructor() {
    super();
  }
  
  // ---------------------------------------------------------------------------
  // Server Management
  // ---------------------------------------------------------------------------
  
  async connectServer(server: MCPServer): Promise<void> {
    const info = server.getServerInfo();
    this.servers.set(info.name, server);
    
    // Initialize connection
    const initMessage: MCPMessage = {
      jsonrpc: '2.0',
      id: this.nextId(),
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          roots: { listChanged: true },
          sampling: {},
        },
        clientInfo: {
          name: 'aethel-ide',
          version: '1.0.0',
        },
      },
    };
    
    const response = await server.handleMessage(initMessage);
    this.emit('server:connected', { name: info.name, capabilities: response.result });
  }
  
  disconnectServer(name: string): void {
    this.servers.delete(name);
    this.emit('server:disconnected', { name });
  }
  
  getConnectedServers(): string[] {
    return Array.from(this.servers.keys());
  }
  
  // ---------------------------------------------------------------------------
  // Tool Operations
  // ---------------------------------------------------------------------------
  
  async listAllTools(): Promise<Array<MCPTool & { server: string }>> {
    const allTools: Array<MCPTool & { server: string }> = [];
    
    for (const [serverName, server] of this.servers) {
      const tools = server.getTools();
      allTools.push(...tools.map(tool => ({ ...tool, server: serverName })));
    }
    
    return allTools;
  }
  
  async callTool(
    serverName: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<MCPToolResult> {
    const server = this.servers.get(serverName);
    if (!server) {
      throw new Error(`Server "${serverName}" not connected`);
    }
    
    const message: MCPMessage = {
      jsonrpc: '2.0',
      id: this.nextId(),
      method: 'tools/call',
      params: { name: toolName, arguments: args },
    };
    
    const response = await server.handleMessage(message);
    
    if (response.error) {
      throw new Error(response.error.message);
    }
    
    return response.result as MCPToolResult;
  }
  
  // ---------------------------------------------------------------------------
  // Resource Operations
  // ---------------------------------------------------------------------------
  
  async listAllResources(): Promise<Array<MCPResource & { server: string }>> {
    const allResources: Array<MCPResource & { server: string }> = [];
    
    for (const [serverName, server] of this.servers) {
      const resources = server.getResources();
      allResources.push(...resources.map(r => ({ ...r, server: serverName })));
    }
    
    return allResources;
  }
  
  async readResource(serverName: string, uri: string): Promise<string> {
    const server = this.servers.get(serverName);
    if (!server) {
      throw new Error(`Server "${serverName}" not connected`);
    }
    
    const message: MCPMessage = {
      jsonrpc: '2.0',
      id: this.nextId(),
      method: 'resources/read',
      params: { uri },
    };
    
    const response = await server.handleMessage(message);
    
    if (response.error) {
      throw new Error(response.error.message);
    }
    
    const contents = (response.result as any)?.contents?.[0]?.text;
    return contents || '';
  }
  
  // ---------------------------------------------------------------------------
  // Prompt Operations
  // ---------------------------------------------------------------------------
  
  async listAllPrompts(): Promise<Array<MCPPrompt & { server: string }>> {
    const allPrompts: Array<MCPPrompt & { server: string }> = [];
    
    for (const [serverName, server] of this.servers) {
      const prompts = server.getPrompts();
      allPrompts.push(...prompts.map(p => ({ ...p, server: serverName })));
    }
    
    return allPrompts;
  }
  
  async getPrompt(
    serverName: string,
    promptName: string,
    args: Record<string, unknown> = {}
  ): Promise<string> {
    const server = this.servers.get(serverName);
    if (!server) {
      throw new Error(`Server "${serverName}" not connected`);
    }
    
    const message: MCPMessage = {
      jsonrpc: '2.0',
      id: this.nextId(),
      method: 'prompts/get',
      params: { name: promptName, arguments: args },
    };
    
    const response = await server.handleMessage(message);
    
    if (response.error) {
      throw new Error(response.error.message);
    }
    
    return (response.result as any)?.messages?.[0]?.content?.text || '';
  }
  
  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  
  private nextId(): number {
    return ++this.messageId;
  }
}

// ============================================================================
// SINGLETON INSTANCES
// ============================================================================

export const mcpClient = new MCPClient();

// ============================================================================
// EXPORTS
// ============================================================================

const mcpExports = { MCPServer, MCPClient, mcpClient };
export default mcpExports;
