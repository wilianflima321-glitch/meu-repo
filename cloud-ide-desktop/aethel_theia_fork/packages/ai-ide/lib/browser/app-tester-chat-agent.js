"use strict";
/* eslint-disable max-len */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppTesterChatAgent = exports.AppTesterChatAgentId = void 0;
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
const chat_agents_1 = require("@theia/ai-chat/lib/common/chat-agents");
const chat_model_1 = require("@theia/ai-chat/lib/common/chat-model");
const mcp_server_manager_1 = require("@theia/ai-mcp/lib/common/mcp-server-manager");
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
const llm_provider_service_1 = require("../browser/llm-provider-service");
const mcp_preferences_1 = require("@theia/ai-mcp/lib/common/mcp-preferences");
const common_1 = require("@theia/core/lib/common");
const app_tester_prompt_template_1 = require("./app-tester-prompt-template");
exports.AppTesterChatAgentId = 'AppTester';
let AppTesterChatAgent = class AppTesterChatAgent extends chat_agents_1.AbstractStreamParsingChatAgent {
    mcpService;
    preferenceService;
    llmProviderService;
    id = exports.AppTesterChatAgentId;
    name = exports.AppTesterChatAgentId;
    languageModelRequirements = [{
            purpose: 'chat',
            identifier: 'default/code',
        }];
    defaultLanguageModelPurpose = 'chat';
    description = core_1.nls.localize('theia/ai/chat/app-tester/description', 'This agent tests your application user interface to verify user-specified test scenarios through the Playwright MCP server. '
        + 'It can automate testing workflows and provide detailed feedback on application functionality.');
    iconClass = 'codicon codicon-beaker';
    systemPromptId = 'app-tester-system';
    prompts = [{ id: 'app-tester-system', defaultVariant: app_tester_prompt_template_1.appTesterTemplate, variants: [app_tester_prompt_template_1.appTesterTemplateVariant] }];
    /**
     * Override invoke to check if the Playwright MCP server is running, and if not, ask the user if it should be started.
     */
    async invoke(request) {
        try {
            if (await this.requiresStartingServers()) {
                // Ask the user if they want to start the server
                request.response.response.addContent(new chat_model_1.QuestionResponseContentImpl('The Playwright MCP servers are not running. Would you like to start them now? This may install the Playwright MCP servers.', [
                    { text: 'Yes, start the servers', value: 'yes' },
                    { text: 'No, cancel', value: 'no' }
                ], request, async (selectedOption) => {
                    if (selectedOption.value === 'yes') {
                        // Show progress
                        const _addProgressFn = request.response.addProgressMessage;
                        const progress = typeof _addProgressFn === 'function' ? _addProgressFn.call(request.response, { content: 'Starting Playwright MCP servers.', show: 'whileIncomplete' }) : undefined;
                        try {
                            await this.startServers();
                            // Remove progress, continue with normal flow
                            if (progress) {
                                // progress may be a ChatProgressMessage; only update if present
                                const _updateProgressFn = request.response.updateProgressMessage;
                                if (typeof _updateProgressFn === 'function') {
                                    _updateProgressFn.call(request.response, { ...progress, status: 'completed' });
                                }
                            }
                            await super.invoke(request);
                        }
                        catch (error) {
                            const _addContent = request.response?.response?.addContent;
                            if (typeof _addContent === 'function') {
                                _addContent.call(request.response.response, new chat_model_1.ErrorChatResponseContentImpl(new Error('Failed to start Playwright MCP server: ' + (error instanceof Error ? error.message : String(error)))));
                            }
                            request.response?.complete?.();
                        }
                    }
                    else {
                        // Continue without starting the server
                        const _addContent2 = request.response?.response?.addContent;
                        if (typeof _addContent2 === 'function') {
                            _addContent2.call(request.response.response, new chat_model_1.MarkdownChatResponseContentImpl('Please setup the MCP servers.'));
                        }
                        const _completeFn = request.response.complete;
                        if (typeof _completeFn === 'function') {
                            _completeFn.call(request.response);
                        }
                    }
                }));
                const _waitForInput = request.response.waitForInput;
                if (typeof _waitForInput === 'function') {
                    _waitForInput.call(request.response);
                }
                return;
            }
            // If already running, continue as normal
            await super.invoke(request);
        }
        catch (error) {
            const _addContentErr = request.response?.response?.addContent;
            if (typeof _addContentErr === 'function') {
                _addContentErr.call(request.response.response, new chat_model_1.ErrorChatResponseContentImpl(new Error('Error checking Playwright MCP server status: ' + (error instanceof Error ? error.message : String(error)))));
            }
            const _completeOnErr = request.response.complete;
            if (typeof _completeOnErr === 'function') {
                _completeOnErr.call(request.response);
            }
        }
    }
    async requiresStartingServers() {
        const allStarted = await Promise.all(app_tester_prompt_template_1.REQUIRED_MCP_SERVERS.map(server => this.mcpService.isServerStarted(server.name)));
        return allStarted.some(started => !started);
    }
    async startServers() {
        await this.ensureServersStarted(...app_tester_prompt_template_1.REQUIRED_MCP_SERVERS);
    }
    /**
     * Starts the Playwright MCP server if it doesn't exist or isn't running.
     *
     * @returns A promise that resolves when the server is started
     */
    async ensureServersStarted(...servers) {
        try {
            const serversToInstall = [];
            const serversToStart = [];
            for (const server of servers) {
                if (!(await this.mcpService.hasServer(server.name))) {
                    serversToInstall.push(server);
                }
                if (!(await this.mcpService.isServerStarted(server.name))) {
                    serversToStart.push(server);
                }
            }
            for (const server of serversToInstall) {
                const currentServers = this.preferenceService.get(mcp_preferences_1.MCP_SERVERS_PREF, {});
                await this.preferenceService.set(mcp_preferences_1.MCP_SERVERS_PREF, { ...currentServers, [server.name]: server }, common_1.PreferenceScope.User);
                await this.mcpService.addOrUpdateServer(server);
            }
            for (const server of serversToStart) {
                await this.mcpService.startServer(server.name);
            }
        }
        catch (error) {
            this.logger.error(`Error starting MCP servers ${servers.map(s => s.name)}: ${error}`);
            throw error;
        }
    }
    async sendLlmRequest(request, messages, toolRequests, languageModel) {
        const settings = { ...(this.getLlmSettings ? this.getLlmSettings() : {}), ...request.session?.settings };
        try {
            const resp = await this.llmProviderService.sendRequestToProvider(undefined, { input: messages.map(m => `${m.role || 'user'}: ${m.content}`).join('\n'), settings });
            const normalized = { status: resp.status, text: typeof resp.body === 'string' ? resp.body : JSON.stringify(resp.body), raw: resp.body };
            return normalized;
        }
        catch (e) {
            return this.languageModelService.sendRequest(languageModel, { messages, tools: toolRequests.length ? toolRequests : undefined, settings, agentId: this.id, sessionId: request.session.id, requestId: request.id, cancellationToken: request.response?.cancellationToken });
        }
    }
};
exports.AppTesterChatAgent = AppTesterChatAgent;
tslib_1.__decorate([
    (0, inversify_1.inject)(mcp_server_manager_1.MCPFrontendService),
    tslib_1.__metadata("design:type", Object)
], AppTesterChatAgent.prototype, "mcpService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(common_1.PreferenceService),
    tslib_1.__metadata("design:type", Object)
], AppTesterChatAgent.prototype, "preferenceService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(llm_provider_service_1.LlmProviderService),
    tslib_1.__metadata("design:type", Object)
], AppTesterChatAgent.prototype, "llmProviderService", void 0);
exports.AppTesterChatAgent = AppTesterChatAgent = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], AppTesterChatAgent);
//# sourceMappingURL=app-tester-chat-agent.js.map