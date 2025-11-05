import { type ToolProvider, type ToolRequest } from '@theia/ai-core';
import { MCPServerManager } from '@theia/ai-mcp/lib/common';
import { BrowserAutomation } from '../common/browser-automation-protocol';
export declare abstract class BrowserAutomationToolProvider implements ToolProvider {
    protected readonly browser: BrowserAutomation;
    abstract getTool(): ToolRequest;
}
export declare class LaunchBrowserProvider extends BrowserAutomationToolProvider {
    static ID: string;
    protected readonly mcpServerManager: MCPServerManager;
    getTool(): ToolRequest;
}
export declare class CloseBrowserProvider extends BrowserAutomationToolProvider {
    static ID: string;
    getTool(): ToolRequest;
}
export declare class IsBrowserRunningProvider extends BrowserAutomationToolProvider {
    static ID: string;
    getTool(): ToolRequest;
}
export declare class QueryDomProvider extends BrowserAutomationToolProvider {
    static ID: string;
    getTool(): ToolRequest;
}
//# sourceMappingURL=app-tester-chat-functions.d.ts.map