"use strict";
/* eslint-disable max-len */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppTesterChatAgent = exports.AppTesterChatAgentId = void 0;
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
    constructor() {
        super(...arguments);
        this.id = exports.AppTesterChatAgentId;
        this.name = exports.AppTesterChatAgentId;
        this.languageModelRequirements = [{
                purpose: 'chat',
                identifier: 'default/code',
            }];
        this.defaultLanguageModelPurpose = 'chat';
        this.description = core_1.nls.localize('theia/ai/chat/app-tester/description', 'This agent tests your application user interface to verify user-specified test scenarios through the Playwright MCP server. '
            + 'It can automate testing workflows and provide detailed feedback on application functionality.');
        this.iconClass = 'codicon codicon-beaker';
        this.systemPromptId = 'app-tester-system';
        this.prompts = [{ id: 'app-tester-system', defaultVariant: app_tester_prompt_template_1.appTesterTemplate, variants: [app_tester_prompt_template_1.appTesterTemplateVariant] }];
    }
    set mcpService(v) { this._mcpService = v; }
    get mcpService() { if (!this._mcpService) {
        throw new Error('AppTesterChatAgent: mcpService not injected');
    } return this._mcpService; }
    set preferenceService(v) { this._preferenceService = v; }
    get preferenceService() { if (!this._preferenceService) {
        throw new Error('AppTesterChatAgent: preferenceService not injected');
    } return this._preferenceService; }
    set llmProviderService(v) { this._llmProviderService = v; }
    get llmProviderService() { if (!this._llmProviderService) {
        throw new Error('AppTesterChatAgent: llmProviderService not injected');
    } return this._llmProviderService; }
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
                        const responseObj = request.response;
                        const _addProgressFn = responseObj.addProgressMessage;
                        const progress = typeof _addProgressFn === 'function' ? _addProgressFn.call(request.response, { content: 'Starting Playwright MCP servers.', show: 'whileIncomplete' }) : undefined;
                        try {
                            await this.startServers();
                            // Remove progress, continue with normal flow
                            if (progress) {
                                // progress may be a ChatProgressMessage; only update if present
                                const _updateProgressFn = responseObj.updateProgressMessage;
                                if (typeof _updateProgressFn === 'function') {
                                    try {
                                        const progressObj = progress;
                                        if (progressObj && typeof progressObj === 'object') {
                                            const p = { ...progressObj, status: 'completed' };
                                            _updateProgressFn.call(request.response, p);
                                        }
                                        else {
                                            _updateProgressFn.call(request.response, { status: 'completed' });
                                        }
                                    }
                                    catch {
                                        // fall back to a minimal update
                                        _updateProgressFn.call(request.response, { status: 'completed' });
                                    }
                                }
                            }
                            await super.invoke(request);
                        }
                        catch (error) {
                            const responseRoot = request.response;
                            const _addContent = responseRoot.response?.addContent;
                            if (typeof _addContent === 'function') {
                                _addContent.call(responseRoot.response, new chat_model_1.ErrorChatResponseContentImpl(new Error('Failed to start Playwright MCP server: ' + (error instanceof Error ? error.message : String(error)))));
                            }
                            const _complete = responseRoot.complete;
                            if (typeof _complete === 'function') {
                                _complete.call(request.response);
                            }
                        }
                    }
                    else {
                        // Continue without starting the server
                        const responseRoot = request.response;
                        const _addContent2 = responseRoot.response?.addContent;
                        if (typeof _addContent2 === 'function') {
                            _addContent2.call(responseRoot.response, new chat_model_1.MarkdownChatResponseContentImpl('Please setup the MCP servers.'));
                        }
                        const _completeFn = responseRoot.complete;
                        if (typeof _completeFn === 'function') {
                            _completeFn.call(request.response);
                        }
                    }
                }));
                const waitObj = request.response;
                const _waitForInput = waitObj.waitForInput;
                if (typeof _waitForInput === 'function') {
                    _waitForInput.call(request.response);
                }
                return;
            }
            // If already running, continue as normal
            await super.invoke(request);
        }
        catch (error) {
            const responseRoot = request.response;
            const _addContentErr = responseRoot.response?.addContent;
            if (typeof _addContentErr === 'function') {
                _addContentErr.call(responseRoot.response, new chat_model_1.ErrorChatResponseContentImpl(new Error('Error checking Playwright MCP server status: ' + (error instanceof Error ? error.message : String(error)))));
            }
            const _completeOnErr = responseRoot.complete;
            if (typeof _completeOnErr === 'function') {
                _completeOnErr.call(request.response);
            }
        }
    }
    async requiresStartingServers() {
        const allStarted = await Promise.all(app_tester_prompt_template_1.REQUIRED_MCP_SERVERS.map((server) => this.mcpService.isServerStarted(server.name)));
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
                const pref = this.preferenceService;
                if (typeof pref.set === 'function') {
                    await pref.set.call(this.preferenceService, mcp_preferences_1.MCP_SERVERS_PREF, { ...currentServers, [server.name]: server }, common_1.PreferenceScope);
                }
                else if (typeof pref.updateValue === 'function') {
                    await pref.updateValue.call(this.preferenceService, mcp_preferences_1.MCP_SERVERS_PREF, { ...currentServers, [server.name]: server });
                }
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
        const provider = this.llmProviderService;
        const sendFn = provider.sendRequestToProvider;
        const normalizeProviderResp = (r) => {
            const rr = r;
            const status = rr && typeof rr.status === 'number' ? rr.status : (rr && typeof rr.status === 'string' ? Number(rr.status) || 200 : 200);
            const body = rr?.body ?? r;
            const text = typeof body === 'string' ? body : JSON.stringify(body);
            return { status, text, raw: body };
        };
        try {
            if (typeof sendFn === 'function') {
                const resp = await sendFn.call(provider, undefined, { input: messages.map(m => `${m.role || 'user'}: ${m.content}`).join('\n'), settings });
                return normalizeProviderResp(resp);
            }
        }
        catch (e) {
            // fallthrough to fallback provider below
        }
        // Ensure a LanguageModelResponse is always returned by delegating to the fallback languageModelService
        return await this.languageModelService.sendRequest(languageModel, { messages, tools: toolRequests.length ? toolRequests : undefined, settings, agentId: this.id, sessionId: request.session.id, requestId: request.id, cancellationToken: request.response?.cancellationToken });
    }
};
exports.AppTesterChatAgent = AppTesterChatAgent;
__decorate([
    (0, inversify_1.inject)(mcp_server_manager_1.MCPFrontendService),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], AppTesterChatAgent.prototype, "mcpService", null);
__decorate([
    (0, inversify_1.inject)(common_1.PreferenceService),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], AppTesterChatAgent.prototype, "preferenceService", null);
__decorate([
    (0, inversify_1.inject)(llm_provider_service_1.LlmProviderService),
    __metadata("design:type", llm_provider_service_1.LlmProviderService),
    __metadata("design:paramtypes", [llm_provider_service_1.LlmProviderService])
], AppTesterChatAgent.prototype, "llmProviderService", null);
exports.AppTesterChatAgent = AppTesterChatAgent = __decorate([
    (0, inversify_1.injectable)()
], AppTesterChatAgent);
