"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPFrontendServiceImpl = void 0;
const tslib_1 = require("tslib");
// *****************************************************************************
// Copyright (C) 2024 EclipseSource GmbH.
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
const inversify_1 = require("@theia/core/shared/inversify");
const mcp_server_manager_1 = require("../common/mcp-server-manager");
const ai_core_1 = require("@theia/ai-core");
let MCPFrontendServiceImpl = class MCPFrontendServiceImpl {
    async startServer(serverName) {
        await this.mcpServerManager.startServer(serverName);
        await this.registerTools(serverName);
    }
    async hasServer(serverName) {
        const serverNames = await this.getServerNames();
        return serverNames.includes(serverName);
    }
    async isServerStarted(serverName) {
        const startedServers = await this.getStartedServers();
        return startedServers.includes(serverName);
    }
    async registerToolsForAllStartedServers() {
        const startedServers = await this.getStartedServers();
        for (const serverName of startedServers) {
            await this.registerTools(serverName);
        }
    }
    async registerTools(serverName) {
        const returnedTools = await this.getTools(serverName);
        if (returnedTools) {
            const toolRequests = returnedTools.tools.map(tool => this.convertToToolRequest(tool, serverName));
            toolRequests.forEach(toolRequest => this.toolInvocationRegistry.registerTool(toolRequest));
            this.createPromptTemplate(serverName, toolRequests);
        }
    }
    getPromptTemplateId(serverName) {
        return `mcp_${serverName}_tools`;
    }
    createPromptTemplate(serverName, toolRequests) {
        const templateId = this.getPromptTemplateId(serverName);
        const functionIds = toolRequests.map(tool => `~{${tool.id}}`);
        const template = functionIds.join('\n');
        this.promptService.addBuiltInPromptFragment({
            id: templateId,
            template
        });
    }
    async stopServer(serverName) {
        this.toolInvocationRegistry.unregisterAllTools(`mcp_${serverName}`);
        this.promptService.removePromptFragment(this.getPromptTemplateId(serverName));
        await this.mcpServerManager.stopServer(serverName);
    }
    getStartedServers() {
        return this.mcpServerManager.getRunningServers();
    }
    getServerNames() {
        return this.mcpServerManager.getServerNames();
    }
    async getServerDescription(name) {
        return this.mcpServerManager.getServerDescription(name);
    }
    async getTools(serverName) {
        try {
            return await this.mcpServerManager.getTools(serverName);
        }
        catch (error) {
            console.error('Error while trying to get tools: ' + error);
            return undefined;
        }
    }
    async addOrUpdateServer(description) {
        return this.mcpServerManager.addOrUpdateServer(description);
    }
    convertToToolRequest(tool, serverName) {
        const id = `mcp_${serverName}_${tool.name}`;
        return {
            id: id,
            name: id,
            providerName: `mcp_${serverName}`,
            parameters: ai_core_1.ToolRequest.isToolRequestParameters(tool.inputSchema) ? {
                type: tool.inputSchema.type,
                properties: tool.inputSchema.properties,
                required: tool.inputSchema.required
            } : {
                type: 'object',
                properties: {}
            },
            description: tool.description,
            handler: async (arg_string) => {
                var _a;
                try {
                    const result = await this.mcpServerManager.callTool(serverName, tool.name, arg_string);
                    if (result.isError) {
                        const textContent = result.content.find(callContent => callContent.type === 'text');
                        return { content: [{ type: 'error', data: (_a = textContent === null || textContent === void 0 ? void 0 : textContent.text) !== null && _a !== void 0 ? _a : 'Unknown Error' }] };
                    }
                    const content = result.content.map(callContent => {
                        switch (callContent.type) {
                            case 'image':
                                return { type: 'image', base64data: callContent.data, mimeType: callContent.mimeType };
                            case 'text':
                                return { type: 'text', text: callContent.text };
                            case 'resource': {
                                return { type: 'text', text: JSON.stringify(callContent.resource) };
                            }
                            default: {
                                return { type: 'text', text: JSON.stringify(callContent) };
                            }
                        }
                    });
                    return { content };
                }
                catch (error) {
                    console.error(`Error in tool handler for ${tool.name} on MCP server ${serverName}:`, error);
                    throw error;
                }
            },
        };
    }
};
exports.MCPFrontendServiceImpl = MCPFrontendServiceImpl;
tslib_1.__decorate([
    (0, inversify_1.inject)(mcp_server_manager_1.MCPServerManager),
    tslib_1.__metadata("design:type", Object)
], MCPFrontendServiceImpl.prototype, "mcpServerManager", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_core_1.ToolInvocationRegistry),
    tslib_1.__metadata("design:type", Object)
], MCPFrontendServiceImpl.prototype, "toolInvocationRegistry", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_core_1.PromptService),
    tslib_1.__metadata("design:type", Object)
], MCPFrontendServiceImpl.prototype, "promptService", void 0);
exports.MCPFrontendServiceImpl = MCPFrontendServiceImpl = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], MCPFrontendServiceImpl);
//# sourceMappingURL=mcp-frontend-service.js.map