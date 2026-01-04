declare module 'lucide-react' {
  export const AlertCircle: any;
  export const RefreshCw: any;
  export const Home: any;
  export const Bell: any;
  export const X: any;
  export const Check: any;
  export const Info: any;
  export const AlertTriangle: any;
  export const CheckCircle: any;
}

// Allow compiling jest-style tests in this package when only mocha types are enabled.
declare const expect: any;

declare module '@theia/ai-chat-ui/lib/browser/chat-view-widget' {
  export class ChatViewWidget {
    static readonly ID: string;
  }
}

declare module '@theia/ai-chat-ui/lib/browser/chat-tree-view' {
  export const ChatWelcomeMessageProvider: unique symbol;
  export interface ChatWelcomeMessageProvider {}
}

declare module '@theia/ai-history/lib/browser/ai-history-widget' {
  export class AIHistoryView {
    static readonly ID: string;
  }
}

declare module '@theia/ai-chat/lib/browser/task-context-service' {
  export const TaskContextStorageService: unique symbol;
  export interface TaskContextStorageService {}
}

declare module '@theia/ai-core/lib/browser' {
  export const AIActivationService: unique symbol;
  export interface AIActivationService {}
}

declare module '@theia/ai-mcp/lib/common/mcp-server-manager' {
  export const MCPFrontendService: unique symbol;
  export interface MCPFrontendService {
    getServerDescription(serverName: string): Promise<MCPServerDescription | undefined>;
    getServerNames(): Promise<string[]>;
    hasServer(serverName: string): Promise<boolean>;
    isServerStarted(serverName: string): Promise<boolean>;
    addOrUpdateServer(server: MCPServerDescription): Promise<void>;
    startServer(serverName: string): Promise<void>;
    stopServer(serverName: string): Promise<void>;
    getPromptTemplateId(serverName: string): string;
  }

  export const MCPFrontendNotificationService: unique symbol;
  export interface MCPFrontendNotificationService {
    onDidUpdateMCPServers(listener: () => void): { dispose(): void };
  }

  export function isLocalMCPServerDescription(server: MCPServerDescription): boolean;
  export function isRemoteMCPServerDescription(server: MCPServerDescription): boolean;

  export enum MCPServerStatus {
    NotRunning = 'NotRunning',
    Starting = 'Starting',
    Running = 'Running',
    Errored = 'Errored',
    NotConnected = 'NotConnected',
    Connecting = 'Connecting',
    Connected = 'Connected'
  }

  export interface MCPServerToolDescription {
    name: string;
    description?: string;
  }

  export interface MCPServerDescription {
    name: string;
    status?: MCPServerStatus;
    error?: string;
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    serverUrl?: string;
    serverAuthTokenHeader?: string;
    serverAuthToken?: string;
    headers?: Record<string, string>;
    autostart?: boolean;
    tools?: MCPServerToolDescription[];
  }
}

declare module '@theia/ai-mcp/lib/common/mcp-preferences' {
  export const MCP_SERVERS_PREF: string;
}

declare module '@theia/ai-chat/lib/browser/chat-tool-preference-bindings' {
  export class ToolConfirmationManager {
    getConfirmationMode(tool: string, functionName: string): any;
    getAllConfirmationSettings(): any;
    setConfirmationMode(tool: string, state: any): Promise<void>;
    resetAllConfirmationModeSettings(): void;
  }
}

declare module '@theia/ai-chat/lib/common/chat-tool-preferences' {
  export enum ToolConfirmationMode {
    DISABLED = 'DISABLED',
    CONFIRM = 'CONFIRM',
    ALWAYS_ALLOW = 'ALWAYS_ALLOW'
  }
}
