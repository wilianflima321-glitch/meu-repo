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
var ChatSessionNamingAgent_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatSessionNamingAgent = exports.ChatSessionNamingService = void 0;
const tslib_1 = require("tslib");
const ai_core_1 = require("@theia/ai-core");
const inversify_1 = require("@theia/core/shared/inversify");
const core_1 = require("@theia/core");
const chat_session_naming_prompt_template_1 = require("./chat-session-naming-prompt-template");
let ChatSessionNamingService = class ChatSessionNamingService {
    async generateChatSessionName(chatSession, otherNames) {
        const chatSessionNamingAgent = this.agentService.getAgents().find(agent => ChatSessionNamingAgent.ID === agent.id);
        if (!(chatSessionNamingAgent instanceof ChatSessionNamingAgent)) {
            return undefined;
        }
        return chatSessionNamingAgent.generateChatSessionName(chatSession, otherNames);
    }
};
exports.ChatSessionNamingService = ChatSessionNamingService;
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_core_1.AgentService),
    tslib_1.__metadata("design:type", Object)
], ChatSessionNamingService.prototype, "agentService", void 0);
exports.ChatSessionNamingService = ChatSessionNamingService = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ChatSessionNamingService);
let ChatSessionNamingAgent = ChatSessionNamingAgent_1 = class ChatSessionNamingAgent {
    constructor() {
        this.id = ChatSessionNamingAgent_1.ID;
        this.name = ChatSessionNamingAgent_1.ID;
        this.description = 'Agent for generating chat session names';
        this.variables = [];
        this.prompts = [chat_session_naming_prompt_template_1.CHAT_SESSION_NAMING_PROMPT];
        this.languageModelRequirements = [{
                purpose: 'chat-session-naming',
                identifier: 'default/summarize',
            }];
        this.agentSpecificVariables = [
            { name: 'conversation', usedInPrompt: true, description: 'The content of the chat conversation.' },
            { name: 'listOfSessionNames', usedInPrompt: true, description: 'The list of existing session names.' }
        ];
        this.functions = [];
    }
    async generateChatSessionName(chatSession, otherNames) {
        const lm = await this.lmRegistry.selectLanguageModel({ agent: this.id, ...this.languageModelRequirements[0] });
        if (!lm) {
            throw new Error('No language model found for chat session naming');
        }
        if (chatSession.model.getRequests().length < 1) {
            throw new Error('No chat request available to generate chat session name');
        }
        const conversation = chatSession.model.getRequests()
            .map(req => `<user>${req.message.parts.map(chunk => chunk.promptText).join('')}</user>` +
            (req.response.response ? `<assistant>${req.response.response.asString()}</assistant>` : ''))
            .join('\n\n');
        const listOfSessionNames = otherNames.map(name => name).join(', ');
        const prompt = await this.promptService.getResolvedPromptFragment(chat_session_naming_prompt_template_1.CHAT_SESSION_NAMING_PROMPT.id, { conversation, listOfSessionNames });
        const message = prompt === null || prompt === void 0 ? void 0 : prompt.text;
        if (!message) {
            throw new Error('Unable to create prompt message for generating chat session name');
        }
        const sessionId = (0, core_1.generateUuid)();
        const requestId = (0, core_1.generateUuid)();
        const request = {
            messages: [{
                    actor: 'user',
                    text: message,
                    type: 'text'
                }],
            requestId,
            sessionId,
            agentId: this.id
        };
        const result = await this.languageModelService.sendRequest(lm, request);
        const response = await (0, ai_core_1.getTextOfResponse)(result);
        return response.replace(/\s+/g, ' ').substring(0, 100);
    }
};
exports.ChatSessionNamingAgent = ChatSessionNamingAgent;
ChatSessionNamingAgent.ID = 'Chat Session Naming';
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_core_1.LanguageModelRegistry),
    tslib_1.__metadata("design:type", Object)
], ChatSessionNamingAgent.prototype, "lmRegistry", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_core_1.LanguageModelService),
    tslib_1.__metadata("design:type", Object)
], ChatSessionNamingAgent.prototype, "languageModelService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_core_1.PromptService),
    tslib_1.__metadata("design:type", Object)
], ChatSessionNamingAgent.prototype, "promptService", void 0);
exports.ChatSessionNamingAgent = ChatSessionNamingAgent = ChatSessionNamingAgent_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ChatSessionNamingAgent);
//# sourceMappingURL=chat-session-naming-service.js.map