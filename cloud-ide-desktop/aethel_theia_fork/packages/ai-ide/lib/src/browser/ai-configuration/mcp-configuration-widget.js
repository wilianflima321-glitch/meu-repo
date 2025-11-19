"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AIMCPConfigurationWidget_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIMCPConfigurationWidget = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
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
const browser_1 = require("@theia/core/lib/browser");
const inversify_1 = require("@theia/core/shared/inversify");
const React = __importStar(require("@theia/core/shared/react"));
const hover_service_1 = require("@theia/core/lib/browser/hover-service");
const mcp_server_manager_1 = require("@theia/ai-mcp/lib/common/mcp-server-manager");
const core_1 = require("@theia/core");
const prompt_variable_contribution_1 = require("@theia/ai-core/lib/common/prompt-variable-contribution");
let AIMCPConfigurationWidget = class AIMCPConfigurationWidget extends browser_1.ReactWidget {
    constructor() {
        super(...arguments);
        this.servers = [];
        this.expandedTools = {};
    }
    static { AIMCPConfigurationWidget_1 = this; }
    static { this.ID = 'ai-mcp-configuration-container-widget'; }
    static { this.LABEL = core_1.nls.localize('theia/ai/mcpConfiguration/widgetLabel', 'MCP Servers'); }
    set mcpFrontendService(v) { this._mcpFrontendService = v; }
    get mcpFrontendService() { if (!this._mcpFrontendService) {
        throw new Error('AIMCPConfigurationWidget: mcpFrontendService not injected');
    } return this._mcpFrontendService; }
    set mcpFrontendNotificationService(v) { this._mcpFrontendNotificationService = v; }
    get mcpFrontendNotificationService() { if (!this._mcpFrontendNotificationService) {
        throw new Error('AIMCPConfigurationWidget: mcpFrontendNotificationService not injected');
    } return this._mcpFrontendNotificationService; }
    set hoverService(v) { this._hoverService = v; }
    get hoverService() { if (!this._hoverService) {
        throw new Error('AIMCPConfigurationWidget: hoverService not injected');
    } return this._hoverService; }
    set messageService(v) { this._messageService = v; }
    get messageService() { if (!this._messageService) {
        throw new Error('AIMCPConfigurationWidget: messageService not injected');
    } return this._messageService; }
    init() {
        this.id = AIMCPConfigurationWidget_1.ID;
        this.title.label = AIMCPConfigurationWidget_1.LABEL;
        this.title.closable = false;
        const _mcpUpdateListener = this.mcpFrontendNotificationService.onDidUpdateMCPServers(async () => {
            this.loadServers();
        });
        this.toDispose.push(_mcpUpdateListener);
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
        return ((0, jsx_runtime_1.jsx)("button", { className: className, title: title, onClick: onClick, style: style, children: text }));
    }
    renderStatusBadge(server) {
        const colors = this.getStatusColor(server.status);
        let displayStatus = server.status;
        if (!displayStatus) {
            displayStatus = (0, mcp_server_manager_1.isRemoteMCPServerDescription)(server) ? mcp_server_manager_1.MCPServerStatus.NotConnected : mcp_server_manager_1.MCPServerStatus.NotRunning;
        }
        const spanRef = React.createRef();
        const error = server.error;
        return ((0, jsx_runtime_1.jsxs)("div", { className: "mcp-status-container", children: [(0, jsx_runtime_1.jsx)("span", { className: "mcp-status-badge mcp-status-dynamic", "data-bg": colors.bg, "data-fg": colors.fg, children: displayStatus }), error && ((0, jsx_runtime_1.jsx)("span", { onMouseEnter: () => this.showErrorHover(spanRef, error), onMouseLeave: () => this.hideErrorHover(), ref: spanRef, className: "mcp-error-indicator", children: "?" }))] }));
    }
    renderServerHeader(server) {
        return ((0, jsx_runtime_1.jsxs)("div", { className: "mcp-server-header", children: [(0, jsx_runtime_1.jsx)("div", { className: "mcp-server-name", children: server.name }), this.renderStatusBadge(server)] }));
    }
    renderCommandSection(server) {
        if (!(0, mcp_server_manager_1.isLocalMCPServerDescription)(server)) {
            return;
        }
        return ((0, jsx_runtime_1.jsxs)("div", { className: "mcp-server-section", children: [(0, jsx_runtime_1.jsx)("span", { className: "mcp-section-label", children: core_1.nls.localize('theia/ai/mcpConfiguration/command', 'Command: ') }), (0, jsx_runtime_1.jsx)("code", { className: "mcp-code-block", children: server.command })] }));
    }
    renderArgumentsSection(server) {
        if (!(0, mcp_server_manager_1.isLocalMCPServerDescription)(server) || !server.args || server.args.length === 0) {
            return;
        }
        return ((0, jsx_runtime_1.jsxs)("div", { className: "mcp-server-section", children: [(0, jsx_runtime_1.jsx)("span", { className: "mcp-section-label", children: core_1.nls.localize('theia/ai/mcpConfiguration/arguments', 'Arguments: ') }), (0, jsx_runtime_1.jsx)("code", { className: "mcp-code-block", children: server.args.join(' ') })] }));
    }
    renderEnvironmentSection(server) {
        if (!(0, mcp_server_manager_1.isLocalMCPServerDescription)(server) || !server.env || Object.keys(server.env).length === 0) {
            return;
        }
        return ((0, jsx_runtime_1.jsxs)("div", { className: "mcp-server-section", children: [(0, jsx_runtime_1.jsx)("span", { className: "mcp-section-label", children: core_1.nls.localize('theia/ai/mcpConfiguration/environmentVariables', 'Environment Variables: ') }), (0, jsx_runtime_1.jsx)("div", { className: "mcp-env-block", children: Object.entries(server.env).map(([key, value]) => ((0, jsx_runtime_1.jsxs)("div", { children: [key, "=", key.toLowerCase().includes('token') ? '******' : String(value)] }, key))) })] }));
    }
    renderServerUrlSection(server) {
        if (!(0, mcp_server_manager_1.isRemoteMCPServerDescription)(server)) {
            return;
        }
        return ((0, jsx_runtime_1.jsxs)("div", { className: "mcp-server-section", children: [(0, jsx_runtime_1.jsx)("span", { className: "mcp-section-label", children: core_1.nls.localize('theia/ai/mcpConfiguration/serverUrl', 'Server URL: ') }), (0, jsx_runtime_1.jsx)("code", { className: "mcp-code-block", children: server.serverUrl })] }));
    }
    renderServerAuthTokenHeaderSection(server) {
        if (!(0, mcp_server_manager_1.isRemoteMCPServerDescription)(server) || !server.serverAuthTokenHeader) {
            return;
        }
        return ((0, jsx_runtime_1.jsxs)("div", { className: "mcp-server-section", children: [(0, jsx_runtime_1.jsx)("span", { className: "mcp-section-label", children: core_1.nls.localize('theia/ai/mcpConfiguration/serverAuthTokenHeader', 'Authentication Header Name: ') }), (0, jsx_runtime_1.jsx)("code", { className: "mcp-code-block", children: server.serverAuthTokenHeader })] }));
    }
    renderServerAuthTokenSection(server) {
        if (!(0, mcp_server_manager_1.isRemoteMCPServerDescription)(server) || !server.serverAuthToken) {
            return;
        }
        return ((0, jsx_runtime_1.jsxs)("div", { className: "mcp-server-section", children: [(0, jsx_runtime_1.jsx)("span", { className: "mcp-section-label", children: core_1.nls.localize('theia/ai/mcpConfiguration/serverAuthToken', 'Authentication Token: ') }), (0, jsx_runtime_1.jsx)("code", { className: "mcp-code-block", children: "******" })] }));
    }
    renderServerHeadersSection(server) {
        if (!(0, mcp_server_manager_1.isRemoteMCPServerDescription)(server) || !server.headers) {
            return;
        }
        return ((0, jsx_runtime_1.jsxs)("div", { className: "mcp-server-section", children: [(0, jsx_runtime_1.jsx)("span", { className: "mcp-section-label", children: core_1.nls.localize('theia/ai/mcpConfiguration/headers', 'Headers: ') }), (0, jsx_runtime_1.jsx)("div", { className: "mcp-env-block", children: Object.entries(server.headers).map(([key, value]) => ((0, jsx_runtime_1.jsxs)("div", { children: [key, "=", (key.toLowerCase().includes('token') || key.toLowerCase().includes('authorization')) ? '******' : String(value)] }, key))) })] }));
    }
    renderAutostartSection(server) {
        return ((0, jsx_runtime_1.jsxs)("div", { className: "mcp-server-section", children: [(0, jsx_runtime_1.jsx)("span", { className: "mcp-section-label", children: core_1.nls.localize('theia/ai/mcpConfiguration/autostart', 'Autostart: ') }), (0, jsx_runtime_1.jsx)("span", { className: 'mcp-autostart-badge ' + (server.autostart ? 'enabled' : 'disabled'), children: server.autostart ? core_1.nls.localize('theia/ai/mcpConfiguration/enabled', 'Enabled') : core_1.nls.localize('theia/ai/mcpConfiguration/disabled', 'Disabled') })] }));
    }
    renderToolsSection(server) {
        if (!server.tools || server.tools.length === 0) {
            return;
        }
        const isToolsExpanded = this.expandedTools[server.name] || false;
        return ((0, jsx_runtime_1.jsxs)("div", { className: "mcp-tools-section", children: [(0, jsx_runtime_1.jsxs)("div", { className: 'mcp-tools-header', onClick: () => this.toggleTools(server.name), children: [(0, jsx_runtime_1.jsx)("div", { className: "mcp-toggle-indicator", children: (0, jsx_runtime_1.jsx)("span", { className: 'mcp-toggle-icon', children: isToolsExpanded ? '▼' : '►' }) }), (0, jsx_runtime_1.jsx)("div", { className: 'mcp-tools-header-label', children: (0, jsx_runtime_1.jsx)("span", { className: "mcp-section-label", children: core_1.nls.localize('theia/ai/mcpConfiguration/tools', 'Tools: ') }) }), (0, jsx_runtime_1.jsxs)("div", { className: 'mcp-tools-header-actions', children: [this.renderButton((0, jsx_runtime_1.jsx)("i", { className: "codicon codicon-versions" }), core_1.nls.localize('theia/ai/mcpConfiguration/copyAllList', 'Copy all (list of all tools)'), e => {
                                    e.stopPropagation();
                                    if (server.tools) {
                                        const toolNames = server.tools.map(tool => `~{mcp_${server.name}_${tool.name}}`).join('\n');
                                        navigator.clipboard.writeText(toolNames);
                                        this.messageService.info(core_1.nls.localize('theia/ai/mcpConfiguration/copiedAllList', 'Copied all tools to clipboard (list of all tools)'));
                                    }
                                }, 'mcp-copy-tool-button'), this.renderButton((0, jsx_runtime_1.jsx)("i", { className: "codicon codicon-bracket" }), core_1.nls.localize('theia/ai/mcpConfiguration/copyForPromptTemplate', 'Copy all for prompt template (single prompt fragment with all tools)'), e => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(`{{${prompt_variable_contribution_1.PROMPT_VARIABLE.name}:${this.mcpFrontendService.getPromptTemplateId(server.name)}}}`);
                                    this.messageService.info(core_1.nls.localize('theia/ai/mcpConfiguration/copiedForPromptTemplate', 'Copied all tools to clipboard for prompt template \
                                    (single prompt fragment with all tools)'));
                                }, 'mcp-copy-tool-button'), this.renderButton((0, jsx_runtime_1.jsx)("i", { className: "codicon codicon-copy" }), core_1.nls.localize('theia/ai/mcpConfiguration/copyAllSingle', 'Copy all for chat (single prompt fragment with all tools)'), e => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(`#${prompt_variable_contribution_1.PROMPT_VARIABLE.name}:${this.mcpFrontendService.getPromptTemplateId(server.name)}`);
                                    this.messageService.info(core_1.nls.localize('theia/ai/mcpConfiguration/copiedAllSingle', 'Copied all tools to clipboard (single prompt fragment with all tools)'));
                                }, 'mcp-copy-tool-button')] })] }), isToolsExpanded && ((0, jsx_runtime_1.jsx)("div", { className: "mcp-tools-list", children: server.tools.map(tool => ((0, jsx_runtime_1.jsxs)("div", { className: 'mcp-tool-row', children: [(0, jsx_runtime_1.jsxs)("div", { className: 'mcp-tool-desc', children: [(0, jsx_runtime_1.jsxs)("strong", { children: [tool.name, ":"] }), " ", tool.description] }), (0, jsx_runtime_1.jsx)("div", { className: 'mcp-tool-actions', children: this.renderButton((0, jsx_runtime_1.jsx)("i", { className: "codicon codicon-copy" }), core_1.nls.localize('theia/ai/mcpConfiguration/copyForPrompt', 'Copy tool (for chat or prompt template)'), e => {
                                    e.stopPropagation();
                                    const copied = `~{mcp_${server.name}_${tool.name}}`;
                                    navigator.clipboard.writeText(copied);
                                    this.messageService.info(`Copied ${copied} to clipboard (for chat or prompt template)`);
                                }, 'mcp-copy-tool-button') })] }, tool.name))) }))] }));
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
        return ((0, jsx_runtime_1.jsxs)("div", { className: "mcp-server-controls", children: [isStartable && this.renderButton((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("i", { className: "codicon codicon-play" }), " ", startLabel] }), startLabel, () => this.handleStartServer(server.name), 'mcp-server-button play-button'), isStoppable && this.renderButton((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("i", { className: "codicon codicon-close" }), " ", stopLabel] }), stopLabel, () => this.handleStopServer(server.name), 'mcp-server-button stop-button')] }));
    }
    renderServerCard(server) {
        return ((0, jsx_runtime_1.jsxs)("div", { className: "mcp-server-card", children: [this.renderServerHeader(server), this.renderCommandSection(server), this.renderArgumentsSection(server), this.renderEnvironmentSection(server), this.renderServerUrlSection(server), this.renderServerAuthTokenHeaderSection(server), this.renderServerAuthTokenSection(server), this.renderServerHeadersSection(server), this.renderAutostartSection(server), this.renderToolsSection(server), this.renderServerControls(server)] }, server.name));
    }
    render() {
        if (this.servers.length === 0) {
            return ((0, jsx_runtime_1.jsx)("div", { className: "mcp-no-servers", children: core_1.nls.localize('theia/ai/mcpConfiguration/noServers', 'No MCP servers configured') }));
        }
        return ((0, jsx_runtime_1.jsxs)("div", { className: "mcp-configuration-container", children: [(0, jsx_runtime_1.jsx)("h2", { className: "mcp-configuration-title", children: core_1.nls.localize('theia/ai/mcpConfiguration/serverConfigurations', 'MCP Server Configurations') }), this.servers.map(server => this.renderServerCard(server))] }));
    }
};
exports.AIMCPConfigurationWidget = AIMCPConfigurationWidget;
__decorate([
    (0, inversify_1.inject)(mcp_server_manager_1.MCPFrontendService),
    __metadata("design:type", Object)
], AIMCPConfigurationWidget.prototype, "_mcpFrontendService", void 0);
__decorate([
    (0, inversify_1.inject)(mcp_server_manager_1.MCPFrontendService),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], AIMCPConfigurationWidget.prototype, "mcpFrontendService", null);
__decorate([
    (0, inversify_1.inject)(mcp_server_manager_1.MCPFrontendNotificationService),
    __metadata("design:type", Object)
], AIMCPConfigurationWidget.prototype, "_mcpFrontendNotificationService", void 0);
__decorate([
    (0, inversify_1.inject)(mcp_server_manager_1.MCPFrontendNotificationService),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], AIMCPConfigurationWidget.prototype, "mcpFrontendNotificationService", null);
__decorate([
    (0, inversify_1.inject)(hover_service_1.HoverService),
    __metadata("design:type", hover_service_1.HoverService)
], AIMCPConfigurationWidget.prototype, "_hoverService", void 0);
__decorate([
    (0, inversify_1.inject)(hover_service_1.HoverService),
    __metadata("design:type", hover_service_1.HoverService),
    __metadata("design:paramtypes", [hover_service_1.HoverService])
], AIMCPConfigurationWidget.prototype, "hoverService", null);
__decorate([
    (0, inversify_1.inject)(core_1.MessageService),
    __metadata("design:type", core_1.MessageService)
], AIMCPConfigurationWidget.prototype, "_messageService", void 0);
__decorate([
    (0, inversify_1.inject)(core_1.MessageService),
    __metadata("design:type", core_1.MessageService),
    __metadata("design:paramtypes", [core_1.MessageService])
], AIMCPConfigurationWidget.prototype, "messageService", null);
__decorate([
    (0, inversify_1.postConstruct)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AIMCPConfigurationWidget.prototype, "init", null);
exports.AIMCPConfigurationWidget = AIMCPConfigurationWidget = AIMCPConfigurationWidget_1 = __decorate([
    (0, inversify_1.injectable)()
], AIMCPConfigurationWidget);
