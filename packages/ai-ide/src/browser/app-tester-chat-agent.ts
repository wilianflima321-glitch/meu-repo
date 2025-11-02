/* eslint-disable max-len */

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

import { AbstractStreamParsingChatAgent } from '@theia/ai-chat/lib/common/chat-agents';
import { ErrorChatResponseContentImpl, MarkdownChatResponseContentImpl, MutableChatRequestModel, QuestionResponseContentImpl } from '@theia/ai-chat/lib/common/chat-model';
import { LanguageModelRequirement } from '@theia/ai-core/lib/common';
import { MCPFrontendService, MCPServerDescription } from '@theia/ai-mcp/lib/common/mcp-server-manager';
import { nls } from '@theia/core';
import { inject, injectable } from '@theia/core/shared/inversify';
import { LlmProviderService } from '../browser/llm-provider-service';
import { MCP_SERVERS_PREF } from '@theia/ai-mcp/lib/common/mcp-preferences';
import { PreferenceScope, PreferenceService } from '@theia/core/lib/common';
import { appTesterTemplate, appTesterTemplateVariant, REQUIRED_MCP_SERVERS } from './app-tester-prompt-template';

export const AppTesterChatAgentId = 'AppTester';
@injectable()
export class AppTesterChatAgent extends AbstractStreamParsingChatAgent {

    @inject(MCPFrontendService)
    private _mcpService?: MCPFrontendService;
    @inject(MCPFrontendService)
    protected set mcpService(v: MCPFrontendService) { this._mcpService = v; }
    protected get mcpService(): MCPFrontendService { if (!this._mcpService) { throw new Error('AppTesterChatAgent: mcpService not injected'); } return this._mcpService; }

    @inject(PreferenceService)
    private _preferenceService?: PreferenceService;
    @inject(PreferenceService)
    protected set preferenceService(v: PreferenceService) { this._preferenceService = v; }
    protected get preferenceService(): PreferenceService { if (!this._preferenceService) { throw new Error('AppTesterChatAgent: preferenceService not injected'); } return this._preferenceService; }
    @inject(LlmProviderService)
    private _llmProviderService?: any;
    @inject(LlmProviderService)
    protected set llmProviderService(v: any) { this._llmProviderService = v; }
    protected get llmProviderService(): any { if (!this._llmProviderService) { throw new Error('AppTesterChatAgent: llmProviderService not injected'); } return this._llmProviderService; }

    override id: string = AppTesterChatAgentId;
    override name = AppTesterChatAgentId;
    override languageModelRequirements: LanguageModelRequirement[] = [{
        purpose: 'chat',
        identifier: 'default/code',
    }];
    protected override defaultLanguageModelPurpose: string = 'chat';
    override description = nls.localize('theia/ai/chat/app-tester/description', 'This agent tests your application user interface to verify user-specified test scenarios through the Playwright MCP server. '
        + 'It can automate testing workflows and provide detailed feedback on application functionality.');

    override iconClass: string = 'codicon codicon-beaker';
    protected override systemPromptId: string = 'app-tester-system';
    override prompts = [{ id: 'app-tester-system', defaultVariant: appTesterTemplate, variants: [appTesterTemplateVariant] }];

    /**
     * Override invoke to check if the Playwright MCP server is running, and if not, ask the user if it should be started.
     */
    override async invoke(request: MutableChatRequestModel): Promise<void> {
        try {
            if (await this.requiresStartingServers()) {
                // Ask the user if they want to start the server
                request.response.response.addContent(new QuestionResponseContentImpl(
                    'The Playwright MCP servers are not running. Would you like to start them now? This may install the Playwright MCP servers.',
                    [
                            { text: 'Yes, start the servers', value: 'yes' },
                        { text: 'No, cancel', value: 'no' }
                    ],
                    request,
                    async (selectedOption: any) => {
                        if (selectedOption.value === 'yes') {
                            // Show progress
                                const _addProgressFn = (request.response as any).addProgressMessage;
                                const progress = typeof _addProgressFn === 'function' ? _addProgressFn.call(request.response, { content: 'Starting Playwright MCP servers.', show: 'whileIncomplete' }) : undefined;
                            try {
                                await this.startServers();
                                // Remove progress, continue with normal flow
                                if (progress) {
                                    // progress may be a ChatProgressMessage; only update if present
                                    const _updateProgressFn = (request.response as any).updateProgressMessage;
                                    if (typeof _updateProgressFn === 'function') {
                                        _updateProgressFn.call(request.response, { ...(progress as any), status: 'completed' });
                                    }
                                }
                                await super.invoke(request);
                            } catch (error) {
                                const _addContent = (request.response as any)?.response?.addContent;
                                if (typeof _addContent === 'function') {
                                    _addContent.call((request.response as any).response, new ErrorChatResponseContentImpl(
                                        new Error('Failed to start Playwright MCP server: ' + (error instanceof Error ? error.message : String(error)))
                                    ));
                                }
                                (request.response as any)?.complete?.();
                            }
                        } else {
                            // Continue without starting the server
                                const _addContent2 = (request.response as any)?.response?.addContent;
                                if (typeof _addContent2 === 'function') {
                                    _addContent2.call((request.response as any).response, new MarkdownChatResponseContentImpl('Please setup the MCP servers.'));
                                }
                                const _completeFn = (request.response as any).complete;
                                if (typeof _completeFn === 'function') {
                                    _completeFn.call(request.response);
                                }
                        }
                    }
                ));
                const _waitForInput = (request.response as any).waitForInput;
                if (typeof _waitForInput === 'function') {
                    _waitForInput.call(request.response);
                }
                return;
            }
            // If already running, continue as normal
            await super.invoke(request);
        } catch (error) {
            const _addContentErr = request.response?.response?.addContent;
            if (typeof _addContentErr === 'function') {
                _addContentErr.call(request.response.response, new ErrorChatResponseContentImpl(
                    new Error('Error checking Playwright MCP server status: ' + (error instanceof Error ? error.message : String(error)))
                ));
            }
            const _completeOnErr = (request.response as any).complete;
            if (typeof _completeOnErr === 'function') {
                _completeOnErr.call(request.response);
            }
        }
    }

    protected override async requiresStartingServers(): Promise<boolean> {
        const allStarted = await Promise.all(REQUIRED_MCP_SERVERS.map(server => this.mcpService.isServerStarted(server.name)));
        return allStarted.some(started => !started);
    }

    protected override async startServers(): Promise<void> {
        await this.ensureServersStarted(...REQUIRED_MCP_SERVERS);
    }

    /**
     * Starts the Playwright MCP server if it doesn't exist or isn't running.
     *
     * @returns A promise that resolves when the server is started
     */
    override async ensureServersStarted(...servers: MCPServerDescription[]): Promise<void> {
        try {
            const serversToInstall: MCPServerDescription[] = [];
            const serversToStart: MCPServerDescription[] = [];

            for (const server of servers) {
                if (!(await this.mcpService.hasServer(server.name))) {
                    serversToInstall.push(server);
                }
                if (!(await this.mcpService.isServerStarted(server.name))) {
                    serversToStart.push(server);
                }
            }

            for (const server of serversToInstall) {
                const currentServers = this.preferenceService.get<Record<string, MCPServerDescription>>(MCP_SERVERS_PREF, {});
                if (typeof (this.preferenceService as any)?.set === 'function') {
                    await (this.preferenceService as any).set(MCP_SERVERS_PREF, { ...currentServers, [server.name]: server }, (PreferenceScope as any).User);
                } else if (typeof (this.preferenceService as any)?.updateValue === 'function') {
                    await (this.preferenceService as any).updateValue(MCP_SERVERS_PREF, { ...currentServers, [server.name]: server });
                }
                await this.mcpService.addOrUpdateServer(server);
            }

            for (const server of serversToStart) {
                await this.mcpService.startServer(server.name);
            }
        } catch (error) {
            this.logger.error(`Error starting MCP servers ${servers.map(s => s.name)}: ${error}`);
            throw error;
        }
    }

    protected override async sendLlmRequest(request: MutableChatRequestModel, messages: any[], toolRequests: any[], languageModel: any) {
        const settings = { ...(this.getLlmSettings ? this.getLlmSettings() : {}), ...request.session?.settings };
        try {
            const resp = await (this.llmProviderService as any).sendRequestToProvider(undefined, { input: messages.map(m => `${m.role||'user'}: ${m.content}`).join('\n'), settings });
            const normalized: any = { status: resp.status, text: typeof resp.body === 'string' ? resp.body : JSON.stringify(resp.body), raw: resp.body };
            return normalized;
        } catch (e) {
            return this.languageModelService.sendRequest(languageModel, { messages, tools: toolRequests.length ? toolRequests : undefined, settings, agentId: this.id, sessionId: request.session.id, requestId: request.id, cancellationToken: request.response?.cancellationToken });
        }
    }
}
