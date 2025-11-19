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
exports.UniversalChatAgent = exports.UniversalChatAgentId = void 0;
const inversify_1 = require("@theia/core/shared/inversify");
const llm_provider_service_1 = require("./llm-provider-service");
const chat_agents_1 = require("@theia/ai-chat/lib/common/chat-agents");
const core_1 = require("@theia/core");
const universal_prompt_template_1 = require("./universal-prompt-template");
exports.UniversalChatAgentId = 'Universal';
let UniversalChatAgent = class UniversalChatAgent extends chat_agents_1.AbstractStreamParsingChatAgent {
    constructor() {
        super(...arguments);
        this.id = exports.UniversalChatAgentId;
        this.name = exports.UniversalChatAgentId;
        this.languageModelRequirements = [{
                purpose: 'chat',
                identifier: 'default/universal',
            }];
        this.defaultLanguageModelPurpose = 'chat';
        this.description = core_1.nls.localize('theia/ai/chat/universal/description', 'This agent is designed to help software developers by providing concise and accurate '
            + 'answers to general programming and software development questions. It is also the fall-back for any generic '
            + 'questions the user might ask. The universal agent currently does not have any context by default, i.e. it cannot '
            + 'access the current user context or the workspace.');
        this.prompts = [{ id: 'universal-system', defaultVariant: universal_prompt_template_1.universalTemplate, variants: [universal_prompt_template_1.universalTemplateVariant] }];
        this.systemPromptId = 'universal-system';
    }
    set llmProviderService(v) { this._llmProviderService = v; }
    get llmProviderService() { if (!this._llmProviderService) {
        throw new Error('UniversalChatAgent: llmProviderService not injected');
    } return this._llmProviderService; }
    async sendLlmRequest(request, messages, toolRequests, languageModel) {
        const settings = { ...(this.getLlmSettings ? this.getLlmSettings() : {}), ...request.session?.settings };
        try {
            const _svc = this.llmProviderService;
            const sendFn = (() => {
                const maybe = _svc;
                if (_svc && typeof maybe.sendRequestToProvider === 'function') {
                    return maybe.sendRequestToProvider.bind(_svc);
                }
                return undefined;
            })();
            if (!sendFn) {
                throw new Error('LlmProviderService.sendRequestToProvider not available');
            }
            const resp = await sendFn(undefined, { input: messages.map(m => `${m.role || 'user'}: ${m.content}`).join('\n'), settings });
            const normalizeProviderResp = (r) => {
                if (r && typeof r === 'object') {
                    const maybe = r;
                    const s = maybe.status;
                    const body = maybe.body ?? r;
                    const status = typeof s === 'number' ? s : 200;
                    return { status, text: typeof body === 'string' ? body : JSON.stringify(body), raw: body };
                }
                return { status: 200, text: typeof r === 'string' ? r : JSON.stringify(r), raw: r };
            };
            return normalizeProviderResp(resp);
        }
        catch (e) {
            return this.languageModelService.sendRequest(languageModel, { messages, tools: toolRequests.length ? toolRequests : undefined, settings, agentId: this.id, sessionId: request.session.id, requestId: request.id, cancellationToken: request.response?.cancellationToken });
        }
    }
};
exports.UniversalChatAgent = UniversalChatAgent;
__decorate([
    (0, inversify_1.inject)(llm_provider_service_1.LlmProviderService),
    __metadata("design:type", llm_provider_service_1.LlmProviderService),
    __metadata("design:paramtypes", [llm_provider_service_1.LlmProviderService])
], UniversalChatAgent.prototype, "llmProviderService", null);
exports.UniversalChatAgent = UniversalChatAgent = __decorate([
    (0, inversify_1.injectable)()
], UniversalChatAgent);
