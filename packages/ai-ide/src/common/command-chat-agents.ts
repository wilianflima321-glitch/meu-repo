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

/* eslint-disable @typescript-eslint/no-explicit-any, max-len */

import { inject, injectable } from '@theia/core/shared/inversify';
import { AbstractTextToModelParsingChatAgent, SystemMessageDescription } from '@theia/ai-chat/lib/common/chat-agents';
import { AIVariableContext, LanguageModelRequirement } from '@theia/ai-core';
import {
    MutableChatRequestModel,
    ChatResponseContent,
    CommandChatResponseContentImpl,
    CustomCallback,
    HorizontalLayoutChatResponseContentImpl,
    MarkdownChatResponseContentImpl,
} from '@theia/ai-chat/lib/common/chat-model';
import {
    CommandRegistry,
    MessageService,
    generateUuid,
} from '@theia/core';

import { commandTemplate } from './command-prompt-template';
import { LlmProviderService } from './llm-provider-service';

interface ParsedCommand {
    type: 'theia-command' | 'custom-handler' | 'no-command'
    commandId: string;
    arguments?: string[];
    message?: string;
}

@injectable()
export class CommandChatAgent extends AbstractTextToModelParsingChatAgent<ParsedCommand> {
    private _commandRegistry?: CommandRegistry;
    @inject(CommandRegistry)
    protected set commandRegistry(v: CommandRegistry) { this._commandRegistry = v; }
    protected get commandRegistry(): CommandRegistry { if (!this._commandRegistry) { throw new Error('CommandChatAgent: commandRegistry not injected'); } return this._commandRegistry; }

    private _messageService?: MessageService;
    @inject(MessageService)
    protected set messageService(v: MessageService) { this._messageService = v; }
    protected get messageService(): MessageService { if (!this._messageService) { throw new Error('CommandChatAgent: messageService not injected'); } return this._messageService; }

    private _llmProviderService?: LlmProviderService;
    @inject(LlmProviderService)
    protected set llmProviderService(v: LlmProviderService) { this._llmProviderService = v; }
    protected get llmProviderService(): LlmProviderService { if (!this._llmProviderService) { throw new Error('CommandChatAgent: llmProviderService not injected'); } return this._llmProviderService; }

    override id: string = 'Command';
    override name = 'Command';
    override languageModelRequirements: LanguageModelRequirement[] = [{
        purpose: 'command',
        identifier: 'default/universal',
    }];
    protected override defaultLanguageModelPurpose: string = 'command';

    override description = 'This agent is aware of all commands that the user can execute within the Theia IDE, the tool that the user is currently working with. \
    Based on the user request, it can find the right command and then let the user execute it.';
    override prompts = [commandTemplate];
    override agentSpecificVariables = [{
        name: 'command-ids',
        description: 'The list of available commands in Theia.',
        usedInPrompt: true
    }];

    protected override async getSystemMessageDescription(context: AIVariableContext): Promise<SystemMessageDescription | undefined> {
        const knownCommands: string[] = [];
        for (const command of this.commandRegistry.getAllCommands()) {
            knownCommands.push(`${command.id}: ${command.label}`);
        }
        const systemPrompt = await this.promptService.getResolvedPromptFragment(commandTemplate.id, {
            'command-ids': knownCommands.join('\n')
        }, context);
        if (systemPrompt === undefined) {
            throw new Error('Couldn\'t get prompt ');
        }
        // `fromResolvedPromptFragment` may be an optional helper in some versions; guard at runtime
        // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
    const sysMsgDescHelpers = SystemMessageDescription as unknown as { fromResolvedPromptFragment?: (_s: string) => SystemMessageDescription };
        if (typeof sysMsgDescHelpers.fromResolvedPromptFragment === 'function') {
            return sysMsgDescHelpers.fromResolvedPromptFragment(systemPrompt);
        }
        return undefined;
    }

    /**
     * @param text the text received from the language model
     * @returns the parsed command if the text contained a valid command.
     * If there was no json in the text, return a no-command response.
     */
    protected async parseTextResponse(text: string): Promise<ParsedCommand> {
        const jsonMatch = text.match(/(\{[\s\S]*\})/);
        const jsonString = jsonMatch ? jsonMatch[1] : `{
    "type": "no-command",
    "message": "Please try again."
}`;
        const parsedCommand = JSON.parse(jsonString) as ParsedCommand;
        return parsedCommand;
    }

    protected async sendLlmRequest(request: MutableChatRequestModel, messages: any[], toolRequests: any[], languageModel: any) {
        const settings = { ...(this.getLlmSettings ? this.getLlmSettings() : {}), ...request.session?.settings };
        try {
            const _svc: unknown = this.llmProviderService;
            const sendFn = ((): Function | undefined => {
                const maybe = _svc as unknown as { sendRequestToProvider?: unknown };
                if (_svc && typeof maybe.sendRequestToProvider === 'function') {
                    return (maybe.sendRequestToProvider as Function).bind(_svc) as unknown as Function;
                }
                return undefined;
            })();
            if (!sendFn) {
                throw new Error('LlmProviderService.sendRequestToProvider not available');
            }
            const resp = await sendFn(undefined, { input: messages.map(m => `${m.role || 'user'}: ${m.content}`).join('\n'), settings });
            const normalizeProviderResp = (r: unknown) => {
                if (r && typeof r === 'object') {
                    const maybe = r as unknown as { status?: unknown; body?: unknown };
                    const _s = maybe.status;
                    const body = maybe.body ?? r;
                    const status = typeof _s === 'number' ? _s : 200;
                    return { status, text: typeof body === 'string' ? body : JSON.stringify(body), raw: body };
                }
                return { status: 200, text: typeof r === 'string' ? r : JSON.stringify(r), raw: r };
            };
            return normalizeProviderResp(resp);
        } catch (e) {
            return this.languageModelService.sendRequest(languageModel, { messages, tools: toolRequests.length ? toolRequests : undefined, settings, agentId: this.id, sessionId: request.session.id, requestId: request.id, cancellationToken: request.response?.cancellationToken });
        }
    }

    protected createResponseContent(parsedCommand: ParsedCommand, request: MutableChatRequestModel): ChatResponseContent {
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

            return new HorizontalLayoutChatResponseContentImpl([
                new MarkdownChatResponseContentImpl(
                    'I found this command that might help you:'
                ),
                new CommandChatResponseContentImpl(theiaCommand, undefined, args),
            ]);
        } else if (parsedCommand.type === 'custom-handler') {
            const id = `ai-command-${generateUuid()}`;
            const commandArgs = parsedCommand.arguments !== undefined && parsedCommand.arguments.length > 0 ? parsedCommand.arguments : [];
            const args = [id, ...commandArgs];
            const customCallback: CustomCallback = {
                label: 'AI command',
                callback: () => this.commandCallback(...args),
            };
            return new HorizontalLayoutChatResponseContentImpl([
                new MarkdownChatResponseContentImpl(
                    'Try executing this:'
                ),
                new CommandChatResponseContentImpl(undefined, customCallback, args),
            ]);
        } else {
            return new MarkdownChatResponseContentImpl(parsedCommand.message ?? 'Sorry, I can\'t find such a command');
        }
    }

    protected async commandCallback(...commandArgs: unknown[]): Promise<void> {
        this.messageService.info(`Executing callback with args ${commandArgs.join(', ')}. The first arg is the command id registered for the dynamically registered command. \
        The other args are the actual args for the handler.`, 'Got it');
    }
}
