import { ReactWidget } from '@theia/core/lib/browser';
import * as React from '@theia/core/shared/react';
import { HoverService } from '@theia/core/lib/browser/hover-service';
import { MCPFrontendNotificationService, MCPFrontendService, MCPServerDescription, MCPServerStatus } from '@theia/ai-mcp/lib/common/mcp-server-manager';
import { MessageService } from '@theia/core';
export declare class AIMCPConfigurationWidget extends ReactWidget {
    static readonly ID = "ai-mcp-configuration-container-widget";
    static readonly LABEL: any;
    protected servers: MCPServerDescription[];
    protected expandedTools: Record<string, boolean>;
    protected readonly mcpFrontendService: MCPFrontendService;
    protected readonly mcpFrontendNotificationService: MCPFrontendNotificationService;
    protected readonly hoverService: HoverService;
    protected readonly messageService: MessageService;
    protected init(): void;
    protected loadServers(): Promise<void>;
    protected getStatusColor(status?: MCPServerStatus): {
        bg: string;
        fg: string;
    };
    protected showErrorHover(spanRef: React.RefObject<HTMLSpanElement>, error: string): void;
    protected hideErrorHover(): void;
    protected handleStartServer(serverName: string): Promise<void>;
    protected handleStopServer(serverName: string): Promise<void>;
    protected renderButton(text: React.ReactNode, title: string, onClick: React.MouseEventHandler<HTMLButtonElement>, className?: string, style?: React.CSSProperties): React.ReactNode;
    protected renderStatusBadge(server: MCPServerDescription): React.ReactNode;
    protected renderServerHeader(server: MCPServerDescription): React.ReactNode;
    protected renderCommandSection(server: MCPServerDescription): React.ReactNode;
    protected renderArgumentsSection(server: MCPServerDescription): React.ReactNode;
    protected renderEnvironmentSection(server: MCPServerDescription): React.ReactNode;
    protected renderServerUrlSection(server: MCPServerDescription): React.ReactNode;
    protected renderServerAuthTokenHeaderSection(server: MCPServerDescription): React.ReactNode;
    protected renderServerAuthTokenSection(server: MCPServerDescription): React.ReactNode;
    protected renderServerHeadersSection(server: MCPServerDescription): React.ReactNode;
    protected renderAutostartSection(server: MCPServerDescription): React.ReactNode;
    protected renderToolsSection(server: MCPServerDescription): React.ReactNode;
    protected toggleTools(serverName: string): void;
    protected renderServerControls(server: MCPServerDescription): React.ReactNode;
    protected renderServerCard(server: MCPServerDescription): React.ReactNode;
    protected render(): React.ReactNode;
}
//# sourceMappingURL=mcp-configuration-widget.d.ts.map