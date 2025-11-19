"use strict";
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
exports.OrchestratorChatAgent = exports.OrchestratorChatAgentId = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any, max-len */
const ai_core_1 = require("@theia/ai-core");
const inversify_1 = require("@theia/core/shared/inversify");
const chat_agent_service_1 = require("@theia/ai-chat/lib/common/chat-agent-service");
const llm_provider_service_1 = require("./llm-provider-service");
const chat_agents_1 = require("@theia/ai-chat/lib/common/chat-agents");
const chat_model_1 = require("@theia/ai-chat/lib/common/chat-model");
const core_1 = require("@theia/core");
const orchestrator_prompt_template_1 = require("./orchestrator-prompt-template");
exports.OrchestratorChatAgentId = 'Orchestrator';
const OrchestratorRequestIdKey = 'orchestratorRequestIdKey';
// runtime helpers to avoid unsafe `as any` usage
function bindFn(obj, name) {
    if (obj && typeof obj[name] === 'function') {
        return obj[name].bind(obj);
    }
    return undefined;
}
function normalizeProviderResp(resp) {
    if (resp && typeof resp === 'object') {
        const maybe = resp;
        const s = maybe.status;
        if (typeof s === 'number') {
            return { status: s, body: maybe.body ?? resp };
        }
        if ('body' in maybe) {
            return { status: 200, body: maybe.body };
        }
    }
    return { status: 200, body: resp };
}
let OrchestratorChatAgent = class OrchestratorChatAgent extends chat_agents_1.AbstractStreamParsingChatAgent {
    constructor() {
        super(...arguments);
        this.id = exports.OrchestratorChatAgentId;
        this.name = exports.OrchestratorChatAgentId;
        this.languageModelRequirements = [{
                purpose: 'agent-selection',
                identifier: 'default/universal',
            }];
        this.defaultLanguageModelPurpose = 'agent-selection';
        this.variables = ['chatAgents'];
        this.prompts = [orchestrator_prompt_template_1.orchestratorTemplate];
        this.description = core_1.nls.localize('theia/ai/chat/orchestrator/description', 'This agent analyzes the user request against the description of all available chat agents and selects the best fitting agent to answer the request \
    (by using AI).The user\'s request will be directly delegated to the selected agent without further confirmation.');
        this.iconClass = 'codicon codicon-symbol-boolean';
        this.systemPromptId = orchestrator_prompt_template_1.orchestratorTemplate.id;
        this.fallBackChatAgentId = 'Universal';
    }
    set chatAgentService(v) { this._chatAgentService = v; }
    get chatAgentService() { if (!this._chatAgentService) {
        throw new Error('OrchestratorChatAgent: chatAgentService not injected');
    } return this._chatAgentService; }
    set llmProviderService(v) { this._llmProviderService = v; }
    get llmProviderService() { if (!this._llmProviderService) {
        throw new Error('OrchestratorChatAgent: llmProviderService not injected');
    } return this._llmProviderService; }
    async invoke(request) {
        try {
            const _addProgress = bindFn(request.response, 'addProgressMessage');
            if (_addProgress) {
                _addProgress({ content: 'Determining the most appropriate agent', status: 'inProgress' });
            }
        }
        catch { }
        // We use a dedicated id for the orchestrator request
        const orchestratorRequestId = (0, core_1.generateUuid)();
        request.addData(OrchestratorRequestIdKey, orchestratorRequestId);
        // Ask backend orchestrator for suggested agents first (thin client behaviour)
        try {
            const resp = await fetch('http://localhost:8000/orchestrator/select', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: request.inputText ?? '' })
            });
            if (resp.ok) {
                const data = await resp.json();
                const agents = data.agent_ids;
                if (agents && agents.length > 0) {
                    request.addData(OrchestratorRequestIdKey, orchestratorRequestId);
                    // Short-circuit to delegate to agent returned by backend
                    const _addProgress2 = bindFn(request.response, 'addProgressMessage');
                    if (_addProgress2) {
                        _addProgress2({ content: `Delegating to backend-selected agent @${agents[0]}`, status: 'inProgress' });
                    }
                    const _overrideAgent = bindFn(request.response, 'overrideAgentId');
                    if (_overrideAgent) {
                        _overrideAgent(agents[0]);
                    }
                    const agent = this.chatAgentService.getAgent(agents[0]);
                    if (agent) {
                        await agent.invoke(request);
                        return;
                    }
                }
            }
        }
        catch (e) {
            this.logger.warn('Backend orchestrator select failed, falling back to local selection', e);
        }
        return super.invoke(request);
    }
    async sendLlmRequest(request, messages, toolRequests, languageModel) {
        const agentSettings = this.getLlmSettings();
        const settings = { ...agentSettings, ...request.session.settings };
        const tools = toolRequests.length > 0 ? toolRequests : undefined;
        // getDataByKey may be untyped in shims; call non-generically and cast to string
        const subRequestId = (request.getDataByKey ? request.getDataByKey(OrchestratorRequestIdKey) : undefined) ?? request.id;
        request.removeData(OrchestratorRequestIdKey);
        // If a custom provider is configured, route the request through it.
        try {
            const providerId = undefined; // could be read from agentSettings or session
            const resp = await this.llmProviderService.sendRequestToProvider(providerId, {
                input: messages.map(m => `${m.role || 'user'}: ${m.content}`).join('\n'),
                settings
            });
            // normalize to LanguageModelResponse shape expected by callers: mimic languageModelService response
            const normalizedResp = normalizeProviderResp(resp);
            const normalized = {
                status: normalizedResp.status,
                text: typeof normalizedResp.body === 'string' ? normalizedResp.body : JSON.stringify(normalizedResp.body),
                raw: normalizedResp.body
            };
            return normalized;
        }
        catch (e) {
            // fallback to built-in languageModelService
            return this.languageModelService.sendRequest(languageModel, {
                messages,
                tools,
                settings,
                agentId: this.id,
                sessionId: request.session.id,
                requestId: request.id,
                subRequestId: subRequestId,
                cancellationToken: request.response.cancellationToken
            });
        }
    }
    async addContentsToResponse(response, request) {
        const responseText = await (0, ai_core_1.getTextOfResponse)(response);
        let _agentIds = [];
        try {
            const jsonResponse = await (0, ai_core_1.getJsonOfText)(responseText);
            if (Array.isArray(jsonResponse)) {
                _agentIds = jsonResponse.filter((id) => id !== this.id);
            }
        }
        catch (error) {
            // The llm sometimes does not return a parseable result
            this.logger.error('Failed to parse JSON response', error);
        }
        if (_agentIds.length < 1) {
            this.logger.error('No agent was selected, delegating to fallback chat agent');
            // use runtime-bound updater if available
            const updateProgress = bindFn(request.response, 'updateProgressMessage');
            if (updateProgress) {
                request.response.progressMessages.forEach((progressMessage) => {
                    try {
                        updateProgress({ ...progressMessage, status: 'failed' });
                    }
                    catch { }
                });
            }
            _agentIds = [this.fallBackChatAgentId];
        }
        // check if selected (or fallback) agent exists
        if (!this.chatAgentService.getAgent(_agentIds[0])) {
            this.logger.error(`Chat agent ${_agentIds[0]} not found. Falling back to first registered agent.`);
            const firstRegisteredAgent = this.chatAgentService.getAgents().filter(a => a.id !== this.id)[0]?.id;
            if (firstRegisteredAgent) {
                _agentIds = [firstRegisteredAgent];
            }
            else {
                throw new Error('No chat agent available to handle request. Please check your configuration whether any are enabled.');
            }
        }
        // TODO support delegating to more than one agent
        const delegatedToAgent = _agentIds[0];
        request.response.response.addContent(new chat_model_1.InformationalChatResponseContentImpl(`*Orchestrator*: Delegating to \`@${delegatedToAgent}\`
            
            ---

            `));
        const overrideFinal = bindFn(request.response, 'overrideAgentId');
        if (overrideFinal) {
            try {
                overrideFinal(delegatedToAgent);
            }
            catch { }
        }
        const updateProgress2 = bindFn(request.response, 'updateProgressMessage');
        if (updateProgress2) {
            request.response.progressMessages.forEach((progressMessage) => {
                try {
                    updateProgress2({ ...progressMessage, status: 'completed' });
                }
                catch { }
            });
        }
        const agent = this.chatAgentService.getAgent(delegatedToAgent);
        if (!agent) {
            throw new Error(`Chat agent ${delegatedToAgent} not found.`);
        }
        // Get the original request if available
        const originalRequest = '__originalRequest' in request ? request.__originalRequest : request;
        await agent.invoke(originalRequest);
    }
};
exports.OrchestratorChatAgent = OrchestratorChatAgent;
__decorate([
    (0, inversify_1.inject)(chat_agent_service_1.ChatAgentService),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], OrchestratorChatAgent.prototype, "chatAgentService", null);
__decorate([
    (0, inversify_1.inject)(llm_provider_service_1.LlmProviderService),
    __metadata("design:type", llm_provider_service_1.LlmProviderService),
    __metadata("design:paramtypes", [llm_provider_service_1.LlmProviderService])
], OrchestratorChatAgent.prototype, "llmProviderService", null);
exports.OrchestratorChatAgent = OrchestratorChatAgent = __decorate([
    (0, inversify_1.injectable)()
], OrchestratorChatAgent);
