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

import { getJsonOfText, getTextOfResponse, LanguageModel, LanguageModelMessage, LanguageModelRequirement, LanguageModelResponse } from '@theia/ai-core';
import { inject, injectable } from '@theia/core/shared/inversify';
import { ChatAgentService } from '@theia/ai-chat/lib/common/chat-agent-service';
import { LlmProviderService } from '../browser/llm-provider-service';
import { ChatToolRequest } from '@theia/ai-chat/lib/common/chat-tool-request-service';
import { AbstractStreamParsingChatAgent } from '@theia/ai-chat/lib/common/chat-agents';
import { MutableChatRequestModel, InformationalChatResponseContentImpl } from '@theia/ai-chat/lib/common/chat-model';
import { generateUuid, nls } from '@theia/core';
import { orchestratorTemplate } from './orchestrator-prompt-template';

export const OrchestratorChatAgentId = 'Orchestrator';
const OrchestratorRequestIdKey = 'orchestratorRequestIdKey';

@injectable()
export class OrchestratorChatAgent extends AbstractStreamParsingChatAgent {
    override id: string = OrchestratorChatAgentId;
    override name = OrchestratorChatAgentId;
    override languageModelRequirements: LanguageModelRequirement[] = [{
        purpose: 'agent-selection',
        identifier: 'default/universal',
    }];
    protected override defaultLanguageModelPurpose: string = 'agent-selection';

    override variables = ['chatAgents'];
    override prompts = [orchestratorTemplate];
    override description = nls.localize('theia/ai/chat/orchestrator/description',
        'This agent analyzes the user request against the description of all available chat agents and selects the best fitting agent to answer the request \
    (by using AI).The user\'s request will be directly delegated to the selected agent without further confirmation.');
    override iconClass: string = 'codicon codicon-symbol-boolean';

    protected override systemPromptId: string = orchestratorTemplate.id;

    private fallBackChatAgentId = 'Universal';

    @inject(ChatAgentService)
    protected chatAgentService: ChatAgentService;

    @inject(LlmProviderService)
    protected llmProviderService: LlmProviderService;

    override async invoke(request: MutableChatRequestModel): Promise<void> {
    try {
        const _addProgress = (request.response as any).addProgressMessage;
        if (typeof _addProgress === 'function') {
            _addProgress.call(request.response, { content: 'Determining the most appropriate agent', status: 'inProgress' });
        }
    } catch {}
        // We use a dedicated id for the orchestrator request
        const orchestratorRequestId = generateUuid();
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
                const agents = data.agent_ids as string[];
                if (agents && agents.length > 0) {
                    request.addData(OrchestratorRequestIdKey, orchestratorRequestId);
                    // Short-circuit to delegate to agent returned by backend
                    const _addProgress2 = (request.response as any).addProgressMessage;
                    if (typeof _addProgress2 === 'function') {
                        _addProgress2.call(request.response, { content: `Delegating to backend-selected agent @${agents[0]}`, status: 'inProgress' });
                    }
                    const _overrideAgent = (request.response as any).overrideAgentId;
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
        } catch (e) {
            this.logger.warn('Backend orchestrator select failed, falling back to local selection', e);
        }

        return super.invoke(request);
    }

    protected override async sendLlmRequest(
        request: MutableChatRequestModel,
        messages: LanguageModelMessage[],
        toolRequests: ChatToolRequest[],
        languageModel: LanguageModel
    ): Promise<LanguageModelResponse> {
        const agentSettings = this.getLlmSettings();
        const settings = { ...agentSettings, ...request.session.settings };
        const tools = toolRequests.length > 0 ? toolRequests : undefined;
    // getDataByKey may be untyped in shims; call non-generically and cast to string
    const subRequestId = (request.getDataByKey ? (request.getDataByKey(OrchestratorRequestIdKey) as string) : undefined) ?? request.id;
        request.removeData(OrchestratorRequestIdKey);
        // If a custom provider is configured, route the request through it.
        try {
            const providerId = undefined; // could be read from agentSettings or session
            const resp = await this.llmProviderService.sendRequestToProvider(providerId, {
                input: messages.map(m => `${m.role || 'user'}: ${m.content}`).join('\n'),
                settings
            });
            // normalize to LanguageModelResponse shape expected by callers: mimic languageModelService response
            const normalized: LanguageModelResponse = {
                status: resp.status,
                text: typeof resp.body === 'string' ? resp.body : JSON.stringify(resp.body),
                raw: resp.body
            } as unknown as LanguageModelResponse;
            return normalized;
        } catch (e) {
            // fallback to built-in languageModelService
            return this.languageModelService.sendRequest(
                languageModel,
                {
                    messages,
                    tools,
                    settings,
                    agentId: this.id,
                    sessionId: request.session.id,
                    requestId: request.id,
                    subRequestId: subRequestId,
                    cancellationToken: request.response.cancellationToken
                }
            );
        }
    }

    protected override async addContentsToResponse(response: LanguageModelResponse, request: MutableChatRequestModel): Promise<void> {
        const responseText = await getTextOfResponse(response);

        let agentIds: string[] = [];

        try {
            const jsonResponse = await getJsonOfText(responseText);
            if (Array.isArray(jsonResponse)) {
                agentIds = jsonResponse.filter((id: string) => id !== this.id);
            }
        } catch (error: unknown) {
            // The llm sometimes does not return a parseable result
            this.logger.error('Failed to parse JSON response', error);
        }

        if (agentIds.length < 1) {
            this.logger.error('No agent was selected, delegating to fallback chat agent');
            request.response.progressMessages.forEach(progressMessage => {
                const _update = (request.response as any).updateProgressMessage;
                if (typeof _update === 'function') {
                    _update.call(request.response, { ...(progressMessage as any), status: 'failed' });
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
            } else {
                throw new Error('No chat agent available to handle request. Please check your configuration whether any are enabled.');
            }
        }

        // TODO support delegating to more than one agent
        const delegatedToAgent = agentIds[0];
        request.response.response.addContent(new InformationalChatResponseContentImpl(
            `*Orchestrator*: Delegating to \`@${delegatedToAgent}\`
            
            ---

            `
        ));
        const _overrideFinal = (request.response as any).overrideAgentId;
        if (typeof _overrideFinal === 'function') {
            _overrideFinal.call(request.response, delegatedToAgent);
        }
        request.response.progressMessages.forEach(progressMessage => {
            const _update2 = (request.response as any).updateProgressMessage;
            if (typeof _update2 === 'function') {
                _update2.call(request.response, { ...(progressMessage as any), status: 'completed' });
            }
        });
        const agent = this.chatAgentService.getAgent(delegatedToAgent);
        if (!agent) {
            throw new Error(`Chat agent ${delegatedToAgent} not found.`);
        }

        // Get the original request if available
        const originalRequest = '__originalRequest' in request ? request.__originalRequest as MutableChatRequestModel : request;
        await agent.invoke(originalRequest);
    }
}
