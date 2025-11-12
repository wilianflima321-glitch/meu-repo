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
exports.CommandChatAgent = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const chat_agents_1 = require("@theia/ai-chat/lib/common/chat-agents");
const chat_model_1 = require("@theia/ai-chat/lib/common/chat-model");
const core_1 = require("@theia/core");
const command_prompt_template_1 = require("./command-prompt-template");
const llm_provider_service_1 = require("../browser/llm-provider-service");
let CommandChatAgent = class CommandChatAgent extends chat_agents_1.AbstractTextToModelParsingChatAgent {
    commandRegistry;
    messageService;
    llmProviderService;
    id = 'Command';
    name = 'Command';
    languageModelRequirements = [{
            purpose: 'command',
            identifier: 'default/universal',
        }];
    defaultLanguageModelPurpose = 'command';
    description = 'This agent is aware of all commands that the user can execute within the Theia IDE, the tool that the user is currently working with. \
    Based on the user request, it can find the right command and then let the user execute it.';
    prompts = [command_prompt_template_1.commandTemplate];
    agentSpecificVariables = [{
            name: 'command-ids',
            description: 'The list of available commands in Theia.',
            usedInPrompt: true
        }];
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
        if (typeof chat_agents_1.SystemMessageDescription.fromResolvedPromptFragment === 'function') {
            return chat_agents_1.SystemMessageDescription.fromResolvedPromptFragment(systemPrompt);
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
            const resp = await this.llmProviderService.sendRequestToProvider(undefined, { input: messages.map(m => `${m.role || 'user'}: ${m.content}`).join('\n'), settings });
            const normalized = { status: resp.status, text: typeof resp.body === 'string' ? resp.body : JSON.stringify(resp.body), raw: resp.body };
            return normalized;
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
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.CommandRegistry),
    tslib_1.__metadata("design:type", Object)
], CommandChatAgent.prototype, "commandRegistry", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.MessageService),
    tslib_1.__metadata("design:type", Object)
], CommandChatAgent.prototype, "messageService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(llm_provider_service_1.LlmProviderService),
    tslib_1.__metadata("design:type", llm_provider_service_1.LlmProviderService)
], CommandChatAgent.prototype, "llmProviderService", void 0);
exports.CommandChatAgent = CommandChatAgent = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], CommandChatAgent);
//# sourceMappingURL=command-chat-agents.js.map