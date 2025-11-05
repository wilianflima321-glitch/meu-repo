"use strict";
// *****************************************************************************
// Copyright (C) 2025 EclipseSource GmbH.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************
var AIMCPConfigurationWidget_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIMCPConfigurationWidget = void 0;
const tslib_1 = require("tslib");
const browser_1 = require("@theia/core/lib/browser");
const inversify_1 = require("@theia/core/shared/inversify");
const React = require("@theia/core/shared/react");
const hover_service_1 = require("@theia/core/lib/browser/hover-service");
const mcp_server_manager_1 = require("@theia/ai-mcp/lib/common/mcp-server-manager");
const core_1 = require("@theia/core");
const prompt_variable_contribution_1 = require("@theia/ai-core/lib/common/prompt-variable-contribution");
let AIMCPConfigurationWidget = class AIMCPConfigurationWidget extends browser_1.ReactWidget {
    static { AIMCPConfigurationWidget_1 = this; }
    static ID = 'ai-mcp-configuration-container-widget';
    static LABEL = core_1.nls.localize('theia/ai/mcpConfiguration/widgetLabel', 'MCP Servers');
    servers = [];
    expandedTools = {};
    mcpFrontendService;
    mcpFrontendNotificationService;
    hoverService;
    messageService;
    init() {
        this.id = AIMCPConfigurationWidget_1.ID;
        this.title.label = AIMCPConfigurationWidget_1.LABEL;
        this.title.closable = false;
        this.toDispose.push(this.mcpFrontendNotificationService.onDidUpdateMCPServers(async () => {
            this.loadServers();
        }));
        this.loadServers();
    }
    async loadServers() {
        const serverNames = await this.mcpFrontendService.getServerNames();
        const descriptions = await Promise.all(serverNames.map(name => this.mcpFrontendService.getServerDescription(name)));
        this.servers = descriptions.filter((desc) => desc !== undefined);
        this.update();
    }
    getStatusColor(status) {
        if (!status) {
            return { bg: 'var(--theia-descriptionForeground)', fg: 'white' };
        }
        switch (status) {
            case mcp_server_manager_1.MCPServerStatus.Running:
            case mcp_server_manager_1.MCPServerStatus.Connected:
                return { bg: 'var(--theia-successBackground)', fg: 'var(--theia-successForeground)' };
            case mcp_server_manager_1.MCPServerStatus.Starting:
            case mcp_server_manager_1.MCPServerStatus.Connecting:
                return { bg: 'var(--theia-warningBackground)', fg: 'var(--theia-warningForeground)' };
            case mcp_server_manager_1.MCPServerStatus.Errored:
                return { bg: 'var(--theia-errorBackground)', fg: 'var(--theia-errorForeground)' };
            case mcp_server_manager_1.MCPServerStatus.NotRunning:
            case mcp_server_manager_1.MCPServerStatus.NotConnected:
            default:
                return { bg: 'var(--theia-inputValidation-infoBackground)', fg: 'var(--theia-inputValidation-infoForeground)' };
        }
    }
    showErrorHover(spanRef, error) {
        this.hoverService.requestHover({ content: error, target: spanRef.current, position: 'left' });
    }
    hideErrorHover() {
        this.hoverService.cancelHover();
    }
    async handleStartServer(serverName) {
        await this.mcpFrontendService.startServer(serverName);
    }
    async handleStopServer(serverName) {
        await this.mcpFrontendService.stopServer(serverName);
    }
    renderButton(text, title, onClick, className, style) {
        return (React.createElement("button", { className: className, title: title, onClick: onClick, style: style }, text));
    }
    renderStatusBadge(server) {
        const colors = this.getStatusColor(server.status);
        let displayStatus = server.status;
        if (!displayStatus) {
            displayStatus = (0, mcp_server_manager_1.isRemoteMCPServerDescription)(server) ? mcp_server_manager_1.MCPServerStatus.NotConnected : mcp_server_manager_1.MCPServerStatus.NotRunning;
        }
        const spanRef = React.createRef();
        const error = server.error;
        return (React.createElement("div", { className: "mcp-status-container" },
            React.createElement("span", { className: "mcp-status-badge mcp-status-dynamic", "data-bg": colors.bg, "data-fg": colors.fg }, displayStatus),
            error && (React.createElement("span", { onMouseEnter: () => this.showErrorHover(spanRef, error), onMouseLeave: () => this.hideErrorHover(), ref: spanRef, className: "mcp-error-indicator" }, "?"))));
    }
    renderServerHeader(server) {
        return (React.createElement("div", { className: "mcp-server-header" },
            React.createElement("div", { className: "mcp-server-name" }, server.name),
            this.renderStatusBadge(server)));
    }
    renderCommandSection(server) {
        if (!(0, mcp_server_manager_1.isLocalMCPServerDescription)(server)) {
            return;
        }
        return (React.createElement("div", { className: "mcp-server-section" },
            React.createElement("span", { className: "mcp-section-label" }, core_1.nls.localize('theia/ai/mcpConfiguration/command', 'Command: ')),
            React.createElement("code", { className: "mcp-code-block" }, server.command)));
    }
    renderArgumentsSection(server) {
        if (!(0, mcp_server_manager_1.isLocalMCPServerDescription)(server) || !server.args || server.args.length === 0) {
            return;
        }
        return (React.createElement("div", { className: "mcp-server-section" },
            React.createElement("span", { className: "mcp-section-label" }, core_1.nls.localize('theia/ai/mcpConfiguration/arguments', 'Arguments: ')),
            React.createElement("code", { className: "mcp-code-block" }, server.args.join(' '))));
    }
    renderEnvironmentSection(server) {
        if (!(0, mcp_server_manager_1.isLocalMCPServerDescription)(server) || !server.env || Object.keys(server.env).length === 0) {
            return;
        }
        return (React.createElement("div", { className: "mcp-server-section" },
            React.createElement("span", { className: "mcp-section-label" }, core_1.nls.localize('theia/ai/mcpConfiguration/environmentVariables', 'Environment Variables: ')),
            React.createElement("div", { className: "mcp-env-block" }, Object.entries(server.env).map(([key, value]) => (React.createElement("div", { key: key },
                key,
                "=",
                key.toLowerCase().includes('token') ? '******' : String(value)))))));
    }
    renderServerUrlSection(server) {
        if (!(0, mcp_server_manager_1.isRemoteMCPServerDescription)(server)) {
            return;
        }
        return (React.createElement("div", { className: "mcp-server-section" },
            React.createElement("span", { className: "mcp-section-label" }, core_1.nls.localize('theia/ai/mcpConfiguration/serverUrl', 'Server URL: ')),
            React.createElement("code", { className: "mcp-code-block" }, server.serverUrl)));
    }
    renderServerAuthTokenHeaderSection(server) {
        if (!(0, mcp_server_manager_1.isRemoteMCPServerDescription)(server) || !server.serverAuthTokenHeader) {
            return;
        }
        return (React.createElement("div", { className: "mcp-server-section" },
            React.createElement("span", { className: "mcp-section-label" }, core_1.nls.localize('theia/ai/mcpConfiguration/serverAuthTokenHeader', 'Authentication Header Name: ')),
            React.createElement("code", { className: "mcp-code-block" }, server.serverAuthTokenHeader)));
    }
    renderServerAuthTokenSection(server) {
        if (!(0, mcp_server_manager_1.isRemoteMCPServerDescription)(server) || !server.serverAuthToken) {
            return;
        }
        return (React.createElement("div", { className: "mcp-server-section" },
            React.createElement("span", { className: "mcp-section-label" }, core_1.nls.localize('theia/ai/mcpConfiguration/serverAuthToken', 'Authentication Token: ')),
            React.createElement("code", { className: "mcp-code-block" }, "******")));
    }
    renderServerHeadersSection(server) {
        if (!(0, mcp_server_manager_1.isRemoteMCPServerDescription)(server) || !server.headers) {
            return;
        }
        return (React.createElement("div", { className: "mcp-server-section" },
            React.createElement("span", { className: "mcp-section-label" }, core_1.nls.localize('theia/ai/mcpConfiguration/headers', 'Headers: ')),
            React.createElement("div", { className: "mcp-env-block" }, Object.entries(server.headers).map(([key, value]) => (React.createElement("div", { key: key },
                key,
                "=",
                (key.toLowerCase().includes('token') || key.toLowerCase().includes('authorization')) ? '******' : String(value)))))));
    }
    renderAutostartSection(server) {
        return (React.createElement("div", { className: "mcp-server-section" },
            React.createElement("span", { className: "mcp-section-label" }, core_1.nls.localize('theia/ai/mcpConfiguration/autostart', 'Autostart: ')),
            React.createElement("span", { className: "mcp-autostart-badge " + (server.autostart ? 'enabled' : 'disabled') }, server.autostart ? core_1.nls.localize('theia/ai/mcpConfiguration/enabled', 'Enabled') : core_1.nls.localize('theia/ai/mcpConfiguration/disabled', 'Disabled'))));
    }
    renderToolsSection(server) {
        if (!server.tools || server.tools.length === 0) {
            return;
        }
        const isToolsExpanded = this.expandedTools[server.name] || false;
        return (React.createElement("div", { className: "mcp-tools-section" },
            React.createElement("div", { className: 'mcp-tools-header', onClick: () => this.toggleTools(server.name) },
                React.createElement("div", { className: "mcp-toggle-indicator" },
                    React.createElement("span", { className: 'mcp-toggle-icon' }, isToolsExpanded ? '▼' : '►')),
                React.createElement("div", { className: 'mcp-tools-header-label' },
                    React.createElement("span", { className: "mcp-section-label" }, core_1.nls.localize('theia/ai/mcpConfiguration/tools', 'Tools: '))),
                React.createElement("div", { className: 'mcp-tools-header-actions' },
                    this.renderButton(React.createElement("i", { className: "codicon codicon-versions" }), core_1.nls.localize('theia/ai/mcpConfiguration/copyAllList', 'Copy all (list of all tools)'), e => {
                        e.stopPropagation();
                        if (server.tools) {
                            const toolNames = server.tools.map(tool => `~{mcp_${server.name}_${tool.name}}`).join('\n');
                            navigator.clipboard.writeText(toolNames);
                            this.messageService.info(core_1.nls.localize('theia/ai/mcpConfiguration/copiedAllList', 'Copied all tools to clipboard (list of all tools)'));
                        }
                    }, 'mcp-copy-tool-button'),
                    this.renderButton(React.createElement("i", { className: "codicon codicon-bracket" }), core_1.nls.localize('theia/ai/mcpConfiguration/copyForPromptTemplate', 'Copy all for prompt template (single prompt fragment with all tools)'), e => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(`{{${prompt_variable_contribution_1.PROMPT_VARIABLE.name}:${this.mcpFrontendService.getPromptTemplateId(server.name)}}}`);
                        this.messageService.info(core_1.nls.localize('theia/ai/mcpConfiguration/copiedForPromptTemplate', 'Copied all tools to clipboard for prompt template \
                                    (single prompt fragment with all tools)'));
                    }, 'mcp-copy-tool-button'),
                    this.renderButton(React.createElement("i", { className: "codicon codicon-copy" }), core_1.nls.localize('theia/ai/mcpConfiguration/copyAllSingle', 'Copy all for chat (single prompt fragment with all tools)'), e => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(`#${prompt_variable_contribution_1.PROMPT_VARIABLE.name}:${this.mcpFrontendService.getPromptTemplateId(server.name)}`);
                        this.messageService.info(core_1.nls.localize('theia/ai/mcpConfiguration/copiedAllSingle', 'Copied all tools to clipboard (single prompt fragment with all tools)'));
                    }, 'mcp-copy-tool-button'))),
            isToolsExpanded && (React.createElement("div", { className: "mcp-tools-list" }, server.tools.map(tool => (React.createElement("div", { key: tool.name, className: 'mcp-tool-row' },
                React.createElement("div", { className: 'mcp-tool-desc' },
                    React.createElement("strong", null,
                        tool.name,
                        ":"),
                    " ",
                    tool.description),
                React.createElement("div", { className: 'mcp-tool-actions' }, this.renderButton(React.createElement("i", { className: "codicon codicon-copy" }), core_1.nls.localize('theia/ai/mcpConfiguration/copyForPrompt', 'Copy tool (for chat or prompt template)'), e => {
                    e.stopPropagation();
                    const copied = `~{mcp_${server.name}_${tool.name}}`;
                    navigator.clipboard.writeText(copied);
                    this.messageService.info(`Copied ${copied} to clipboard (for chat or prompt template)`);
                }, 'mcp-copy-tool-button')))))))));
    }
    toggleTools(serverName) {
        this.expandedTools[serverName] = !this.expandedTools[serverName];
        this.update();
    }
    renderServerControls(server) {
        const isStoppable = server.status === mcp_server_manager_1.MCPServerStatus.Running
            || server.status === mcp_server_manager_1.MCPServerStatus.Connected
            || server.status === mcp_server_manager_1.MCPServerStatus.Starting
            || server.status === mcp_server_manager_1.MCPServerStatus.Connecting;
        const isStartable = server.status === mcp_server_manager_1.MCPServerStatus.NotRunning
            || server.status === mcp_server_manager_1.MCPServerStatus.NotConnected
            || server.status === mcp_server_manager_1.MCPServerStatus.Errored;
        const startLabel = (0, mcp_server_manager_1.isRemoteMCPServerDescription)(server)
            ? core_1.nls.localize('theia/ai/mcpConfiguration/connectServer', 'Connnect')
            : core_1.nls.localize('theia/ai/mcpConfiguration/startServer', 'Start Server');
        const stopLabel = (0, mcp_server_manager_1.isRemoteMCPServerDescription)(server)
            ? core_1.nls.localize('theia/ai/mcpConfiguration/disconnectServer', 'Disconnnect')
            : core_1.nls.localize('theia/ai/mcpConfiguration/stopServer', 'Stop Server');
        return (React.createElement("div", { className: "mcp-server-controls" },
            isStartable && this.renderButton(React.createElement(React.Fragment, null,
                React.createElement("i", { className: "codicon codicon-play" }),
                " ",
                startLabel), startLabel, () => this.handleStartServer(server.name), 'mcp-server-button play-button'),
            isStoppable && this.renderButton(React.createElement(React.Fragment, null,
                React.createElement("i", { className: "codicon codicon-close" }),
                " ",
                stopLabel), stopLabel, () => this.handleStopServer(server.name), 'mcp-server-button stop-button')));
    }
    renderServerCard(server) {
        return (React.createElement("div", { key: server.name, className: "mcp-server-card" },
            this.renderServerHeader(server),
            this.renderCommandSection(server),
            this.renderArgumentsSection(server),
            this.renderEnvironmentSection(server),
            this.renderServerUrlSection(server),
            this.renderServerAuthTokenHeaderSection(server),
            this.renderServerAuthTokenSection(server),
            this.renderServerHeadersSection(server),
            this.renderAutostartSection(server),
            this.renderToolsSection(server),
            this.renderServerControls(server)));
    }
    render() {
        if (this.servers.length === 0) {
            return (React.createElement("div", { className: "mcp-no-servers" }, core_1.nls.localize('theia/ai/mcpConfiguration/noServers', 'No MCP servers configured')));
        }
        return (React.createElement("div", { className: "mcp-configuration-container" },
            React.createElement("h2", { className: "mcp-configuration-title" }, core_1.nls.localize('theia/ai/mcpConfiguration/serverConfigurations', 'MCP Server Configurations')),
            this.servers.map(server => this.renderServerCard(server))));
    }
};
exports.AIMCPConfigurationWidget = AIMCPConfigurationWidget;
tslib_1.__decorate([
    (0, inversify_1.inject)(mcp_server_manager_1.MCPFrontendService),
    tslib_1.__metadata("design:type", Object)
], AIMCPConfigurationWidget.prototype, "mcpFrontendService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(mcp_server_manager_1.MCPFrontendNotificationService),
    tslib_1.__metadata("design:type", Object)
], AIMCPConfigurationWidget.prototype, "mcpFrontendNotificationService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(hover_service_1.HoverService),
    tslib_1.__metadata("design:type", hover_service_1.HoverService)
], AIMCPConfigurationWidget.prototype, "hoverService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.MessageService),
    tslib_1.__metadata("design:type", Object)
], AIMCPConfigurationWidget.prototype, "messageService", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], AIMCPConfigurationWidget.prototype, "init", null);
exports.AIMCPConfigurationWidget = AIMCPConfigurationWidget = AIMCPConfigurationWidget_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], AIMCPConfigurationWidget);
//# sourceMappingURL=mcp-configuration-widget.js.map