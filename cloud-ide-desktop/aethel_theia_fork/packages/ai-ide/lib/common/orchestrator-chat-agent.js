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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestratorChatAgent = exports.OrchestratorChatAgentId = void 0;
const tslib_1 = require("tslib");
const ai_core_1 = require("@theia/ai-core");
const inversify_1 = require("@theia/core/shared/inversify");
const chat_agent_service_1 = require("@theia/ai-chat/lib/common/chat-agent-service");
const llm_provider_service_1 = require("../browser/llm-provider-service");
const chat_agents_1 = require("@theia/ai-chat/lib/common/chat-agents");
const chat_model_1 = require("@theia/ai-chat/lib/common/chat-model");
const core_1 = require("@theia/core");
const orchestrator_prompt_template_1 = require("./orchestrator-prompt-template");
exports.OrchestratorChatAgentId = 'Orchestrator';
const OrchestratorRequestIdKey = 'orchestratorRequestIdKey';
let OrchestratorChatAgent = class OrchestratorChatAgent extends chat_agents_1.AbstractStreamParsingChatAgent {
    id = exports.OrchestratorChatAgentId;
    name = exports.OrchestratorChatAgentId;
    languageModelRequirements = [{
            purpose: 'agent-selection',
            identifier: 'default/universal',
        }];
    defaultLanguageModelPurpose = 'agent-selection';
    variables = ['chatAgents'];
    prompts = [orchestrator_prompt_template_1.orchestratorTemplate];
    description = core_1.nls.localize('theia/ai/chat/orchestrator/description', 'This agent analyzes the user request against the description of all available chat agents and selects the best fitting agent to answer the request \
    (by using AI).The user\'s request will be directly delegated to the selected agent without further confirmation.');
    iconClass = 'codicon codicon-symbol-boolean';
    systemPromptId = orchestrator_prompt_template_1.orchestratorTemplate.id;
    fallBackChatAgentId = 'Universal';
    chatAgentService;
    llmProviderService;
    async invoke(request) {
        try {
            const _addProgress = request.response.addProgressMessage;
            if (typeof _addProgress === 'function') {
                _addProgress.call(request.response, { content: 'Determining the most appropriate agent', status: 'inProgress' });
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
                    const _addProgress2 = request.response.addProgressMessage;
                    if (typeof _addProgress2 === 'function') {
                        _addProgress2.call(request.response, { content: `Delegating to backend-selected agent @${agents[0]}`, status: 'inProgress' });
                    }
                    const _overrideAgent = request.response.overrideAgentId;
                    if (typeof _overrideAgent === 'function') {
                        _overrideAgent.call(request.response, agents[0]);
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
            const normalized = {
                status: resp.status,
                text: typeof resp.body === 'string' ? resp.body : JSON.stringify(resp.body),
                raw: resp.body
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
        let agentIds = [];
        try {
            const jsonResponse = await (0, ai_core_1.getJsonOfText)(responseText);
            if (Array.isArray(jsonResponse)) {
                agentIds = jsonResponse.filter((id) => id !== this.id);
            }
        }
        catch (error) {
            // The llm sometimes does not return a parseable result
            this.logger.error('Failed to parse JSON response', error);
        }
        if (agentIds.length < 1) {
            this.logger.error('No agent was selected, delegating to fallback chat agent');
            request.response.progressMessages.forEach(progressMessage => {
                const _update = request.response.updateProgressMessage;
                if (typeof _update === 'function') {
                    _update.call(request.response, { ...progressMessage, status: 'failed' });
                }
            });
            agentIds = [this.fallBackChatAgentId];
        }
        // check if selected (or fallback) agent exists
        if (!this.chatAgentService.getAgent(agentIds[0])) {
            this.logger.error(`Chat agent ${agentIds[0]} not found. Falling back to first registered agent.`);
            const firstRegisteredAgent = this.chatAgentService.getAgents().filter(a => a.id !== this.id)[0]?.id;
            if (firstRegisteredAgent) {
                agentIds = [firstRegisteredAgent];
            }
            else {
                throw new Error('No chat agent available to handle request. Please check your configuration whether any are enabled.');
            }
        }
        // TODO support delegating to more than one agent
        const delegatedToAgent = agentIds[0];
        request.response.response.addContent(new chat_model_1.InformationalChatResponseContentImpl(`*Orchestrator*: Delegating to \`@${delegatedToAgent}\`
            
            ---

            `));
        const _overrideFinal = request.response.overrideAgentId;
        if (typeof _overrideFinal === 'function') {
            _overrideFinal.call(request.response, delegatedToAgent);
        }
        request.response.progressMessages.forEach(progressMessage => {
            const _update2 = request.response.updateProgressMessage;
            if (typeof _update2 === 'function') {
                _update2.call(request.response, { ...progressMessage, status: 'completed' });
            }
        });
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
tslib_1.__decorate([
    (0, inversify_1.inject)(chat_agent_service_1.ChatAgentService),
    tslib_1.__metadata("design:type", chat_agent_service_1.ChatAgentService)
], OrchestratorChatAgent.prototype, "chatAgentService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(llm_provider_service_1.LlmProviderService),
    tslib_1.__metadata("design:type", llm_provider_service_1.LlmProviderService)
], OrchestratorChatAgent.prototype, "llmProviderService", void 0);
exports.OrchestratorChatAgent = OrchestratorChatAgent = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], OrchestratorChatAgent);
//# sourceMappingURL=orchestrator-chat-agent.js.map