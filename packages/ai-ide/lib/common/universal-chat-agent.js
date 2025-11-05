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
exports.UniversalChatAgent = exports.UniversalChatAgentId = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const llm_provider_service_1 = require("../browser/llm-provider-service");
const chat_agents_1 = require("@theia/ai-chat/lib/common/chat-agents");
const core_1 = require("@theia/core");
const universal_prompt_template_1 = require("./universal-prompt-template");
exports.UniversalChatAgentId = 'Universal';
let UniversalChatAgent = class UniversalChatAgent extends chat_agents_1.AbstractStreamParsingChatAgent {
    id = exports.UniversalChatAgentId;
    name = exports.UniversalChatAgentId;
    languageModelRequirements = [{
            purpose: 'chat',
            identifier: 'default/universal',
        }];
    defaultLanguageModelPurpose = 'chat';
    description = core_1.nls.localize('theia/ai/chat/universal/description', 'This agent is designed to help software developers by providing concise and accurate '
        + 'answers to general programming and software development questions. It is also the fall-back for any generic '
        + 'questions the user might ask. The universal agent currently does not have any context by default, i.e. it cannot '
        + 'access the current user context or the workspace.');
    prompts = [{ id: 'universal-system', defaultVariant: universal_prompt_template_1.universalTemplate, variants: [universal_prompt_template_1.universalTemplateVariant] }];
    systemPromptId = 'universal-system';
    llmProviderService;
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
exports.UniversalChatAgent = UniversalChatAgent;
tslib_1.__decorate([
    (0, inversify_1.inject)(llm_provider_service_1.LlmProviderService),
    tslib_1.__metadata("design:type", llm_provider_service_1.LlmProviderService)
], UniversalChatAgent.prototype, "llmProviderService", void 0);
exports.UniversalChatAgent = UniversalChatAgent = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], UniversalChatAgent);
//# sourceMappingURL=universal-chat-agent.js.map