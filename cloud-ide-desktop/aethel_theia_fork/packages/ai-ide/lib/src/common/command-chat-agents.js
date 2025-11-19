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
exports.CommandChatAgent = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any, max-len */
const inversify_1 = require("@theia/core/shared/inversify");
const chat_agents_1 = require("@theia/ai-chat/lib/common/chat-agents");
const chat_model_1 = require("@theia/ai-chat/lib/common/chat-model");
const core_1 = require("@theia/core");
const command_prompt_template_1 = require("./command-prompt-template");
const llm_provider_service_1 = require("./llm-provider-service");
let CommandChatAgent = class CommandChatAgent extends chat_agents_1.AbstractTextToModelParsingChatAgent {
    constructor() {
        super(...arguments);
        this.id = 'Command';
        this.name = 'Command';
        this.languageModelRequirements = [{
                purpose: 'command',
                identifier: 'default/universal',
            }];
        this.defaultLanguageModelPurpose = 'command';
        this.description = 'This agent is aware of all commands that the user can execute within the Theia IDE, the tool that the user is currently working with. \
    Based on the user request, it can find the right command and then let the user execute it.';
        this.prompts = [command_prompt_template_1.commandTemplate];
        this.agentSpecificVariables = [{
                name: 'command-ids',
                description: 'The list of available commands in Theia.',
                usedInPrompt: true
            }];
    }
    set commandRegistry(v) { this._commandRegistry = v; }
    get commandRegistry() { if (!this._commandRegistry) {
        throw new Error('CommandChatAgent: commandRegistry not injected');
    } return this._commandRegistry; }
    set messageService(v) { this._messageService = v; }
    get messageService() { if (!this._messageService) {
        throw new Error('CommandChatAgent: messageService not injected');
    } return this._messageService; }
    set llmProviderService(v) { this._llmProviderService = v; }
    get llmProviderService() { if (!this._llmProviderService) {
        throw new Error('CommandChatAgent: llmProviderService not injected');
    } return this._llmProviderService; }
    async getSystemMessageDescription(context) {
        const knownCommands = [];
        for (const command of this.commandRegistry.getAllCommands()) {
            knownCommands.push(`${command.id}: ${command.label}`);
        }
        const systemPrompt = await this.promptService.getResolvedPromptFragment(command_prompt_template_1.commandTemplate.id, {
            'command-ids': knownCommands.join('\n')
        }, context);
        if (systemPrompt === undefined) {
            throw new Error('Couldn\'t get prompt ');
        }
        // `fromResolvedPromptFragment` may be an optional helper in some versions; guard at runtime
        // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
        const sysMsgDescHelpers = chat_agents_1.SystemMessageDescription;
        if (typeof sysMsgDescHelpers.fromResolvedPromptFragment === 'function') {
            // pass the resolved template string when available
            const tmpl = systemPrompt?.template ?? String(systemPrompt);
            return sysMsgDescHelpers.fromResolvedPromptFragment(tmpl);
        }
        return undefined;
    }
    /**
     * @param text the text received from the language model
     * @returns the parsed command if the text contained a valid command.
     * If there was no json in the text, return a no-command response.
     */
    async parseTextResponse(text) {
        const jsonMatch = text.match(/(\{[\s\S]*\})/);
        const jsonString = jsonMatch ? jsonMatch[1] : `{
    "type": "no-command",
    "message": "Please try again."
}`;
        const parsedCommand = JSON.parse(jsonString);
        return parsedCommand;
    }
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
                    const _s = maybe.status;
                    const body = maybe.body ?? r;
                    const status = typeof _s === 'number' ? _s : 200;
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
    createResponseContent(parsedCommand, request) {
        if (parsedCommand.type === 'theia-command') {
            const theiaCommand = this.commandRegistry.getCommand(parsedCommand.commandId);
            if (theiaCommand === undefined) {
                console.error(`No Theia Command with id ${parsedCommand.commandId}`);
                request.cancel();
            }
            const args = parsedCommand.arguments !== undefined &&
                parsedCommand.arguments.length > 0
                ? parsedCommand.arguments
                : undefined;
            return new chat_model_1.HorizontalLayoutChatResponseContentImpl([
                new chat_model_1.MarkdownChatResponseContentImpl('I found this command that might help you:'),
                new chat_model_1.CommandChatResponseContentImpl(theiaCommand, undefined, args),
            ]);
        }
        else if (parsedCommand.type === 'custom-handler') {
            const id = `ai-command-${(0, core_1.generateUuid)()}`;
            const commandArgs = parsedCommand.arguments !== undefined && parsedCommand.arguments.length > 0 ? parsedCommand.arguments : [];
            const args = [id, ...commandArgs];
            const customCallback = {
                label: 'AI command',
                callback: () => this.commandCallback(...args),
            };
            return new chat_model_1.HorizontalLayoutChatResponseContentImpl([
                new chat_model_1.MarkdownChatResponseContentImpl('Try executing this:'),
                new chat_model_1.CommandChatResponseContentImpl(undefined, customCallback, args),
            ]);
        }
        else {
            return new chat_model_1.MarkdownChatResponseContentImpl(parsedCommand.message ?? 'Sorry, I can\'t find such a command');
        }
    }
    async commandCallback(...commandArgs) {
        this.messageService.info(`Executing callback with args ${commandArgs.join(', ')}. The first arg is the command id registered for the dynamically registered command. \
        The other args are the actual args for the handler.`, 'Got it');
    }
};
exports.CommandChatAgent = CommandChatAgent;
__decorate([
    (0, inversify_1.inject)(core_1.CommandRegistry),
    __metadata("design:type", core_1.CommandRegistry),
    __metadata("design:paramtypes", [core_1.CommandRegistry])
], CommandChatAgent.prototype, "commandRegistry", null);
__decorate([
    (0, inversify_1.inject)(core_1.MessageService),
    __metadata("design:type", core_1.MessageService),
    __metadata("design:paramtypes", [core_1.MessageService])
], CommandChatAgent.prototype, "messageService", null);
__decorate([
    (0, inversify_1.inject)(llm_provider_service_1.LlmProviderService),
    __metadata("design:type", llm_provider_service_1.LlmProviderService),
    __metadata("design:paramtypes", [llm_provider_service_1.LlmProviderService])
], CommandChatAgent.prototype, "llmProviderService", null);
exports.CommandChatAgent = CommandChatAgent = __decorate([
    (0, inversify_1.injectable)()
], CommandChatAgent);
