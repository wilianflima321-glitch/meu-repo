import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { MCPServerDescription, MCPServerManager } from '../common';
import { MCPFrontendService } from '../common/mcp-server-manager';
import { PreferenceService } from '@theia/core';
interface BaseMCPServerPreferenceValue {
    autostart?: boolean;
}
interface LocalMCPServerPreferenceValue extends BaseMCPServerPreferenceValue {
    command: string;
    args?: string[];
    env?: {
        [key: string]: string;
    };
}
interface RemoteMCPServerPreferenceValue extends BaseMCPServerPreferenceValue {
    serverUrl: string;
    serverAuthToken?: string;
    serverAuthTokenHeader?: string;
    headers?: {
        [key: string]: string;
    };
}
type MCPServersPreferenceValue = LocalMCPServerPreferenceValue | RemoteMCPServerPreferenceValue;
interface MCPServersPreference {
    [name: string]: MCPServersPreferenceValue;
}
declare namespace MCPServersPreference {
    function isValue(obj: unknown): obj is MCPServersPreferenceValue;
}
export declare class McpFrontendApplicationContribution implements FrontendApplicationContribution {
    protected preferenceService: PreferenceService;
    protected manager: MCPServerManager;
    protected frontendMCPService: MCPFrontendService;
    protected prevServers: Map<string, MCPServerDescription>;
    onStart(): void;
    protected autoStartServers(servers: Map<string, MCPServerDescription>): Promise<void>;
    protected handleServerChanges(newServers: MCPServersPreference): void;
    protected syncServers(servers: Map<string, MCPServerDescription>): void;
    protected convertToMap(servers: MCPServersPreference): Map<string, MCPServerDescription>;
}
export {};
//# sourceMappingURL=mcp-frontend-application-contribution.d.ts.map