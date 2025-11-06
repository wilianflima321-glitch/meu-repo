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
import { LanguageModelRequirement, LanguageModelResponse } from '@theia/ai-core/lib/common';
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

    private _mcpService?: MCPFrontendService;
    @inject(MCPFrontendService)
    protected set mcpService(v: MCPFrontendService) { this._mcpService = v; }
    protected get mcpService(): MCPFrontendService { if (!this._mcpService) { throw new Error('AppTesterChatAgent: mcpService not injected'); } return this._mcpService; }

    private _preferenceService?: PreferenceService;
    @inject(PreferenceService)
    protected set preferenceService(v: PreferenceService) { this._preferenceService = v; }
    protected get preferenceService(): PreferenceService { if (!this._preferenceService) { throw new Error('AppTesterChatAgent: preferenceService not injected'); } return this._preferenceService; }
    private _llmProviderService?: unknown;
    @inject(LlmProviderService)
    protected set llmProviderService(v: unknown) { this._llmProviderService = v; }
    protected get llmProviderService(): unknown { if (this._llmProviderService === undefined) { throw new Error('AppTesterChatAgent: llmProviderService not injected'); } return this._llmProviderService; }

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
                                const responseObj = request.response as unknown as { addProgressMessage?: Function, updateProgressMessage?: Function };
                                const _addProgressFn = responseObj.addProgressMessage;
                                const progress = typeof _addProgressFn === 'function' ? _addProgressFn.call(request.response, { content: 'Starting Playwright MCP servers.', show: 'whileIncomplete' }) : undefined;
                            try {
                                await this.startServers();
                                // Remove progress, continue with normal flow
                                if (progress) {
                                    // progress may be a ChatProgressMessage; only update if present
                                    const _updateProgressFn = responseObj.updateProgressMessage;
                                    if (typeof _updateProgressFn === 'function') {
                                        try {
                                            const progressObj = progress as unknown;
                                            if (progressObj && typeof progressObj === 'object') {
                                                const p = { ...(progressObj as Record<string, unknown>), status: 'completed' };
                                                _updateProgressFn.call(request.response, p);
                                            } else {
                                                _updateProgressFn.call(request.response, { status: 'completed' });
                                            }
                                        } catch {
                                            // fall back to a minimal update
                                            _updateProgressFn.call(request.response, { status: 'completed' });
                                        }
                                    }
                                }
                                await super.invoke(request);
                            } catch (error) {
                                    const responseRoot = request.response as unknown as { response?: { addContent?: Function }, complete?: Function };
                                const _addContent = responseRoot.response?.addContent;
                                if (typeof _addContent === 'function') {
                                    _addContent.call(responseRoot.response, new ErrorChatResponseContentImpl(
                                        new Error('Failed to start Playwright MCP server: ' + (error instanceof Error ? error.message : String(error)))
                                    ));
                                }
                                const _complete = responseRoot.complete;
                                if (typeof _complete === 'function') {
                                    _complete.call(request.response);
                                }
                            }
                        } else {
                            // Continue without starting the server
                                const responseRoot = request.response as unknown as { response?: { addContent?: Function }, complete?: Function };
                                const _addContent2 = responseRoot.response?.addContent;
                                if (typeof _addContent2 === 'function') {
                                    _addContent2.call(responseRoot.response, new MarkdownChatResponseContentImpl('Please setup the MCP servers.'));
                                }
                                const _completeFn = responseRoot.complete;
                                if (typeof _completeFn === 'function') {
                                    _completeFn.call(request.response);
                                }
                        }
                    }
                ));
                    const waitObj = request.response as unknown as { waitForInput?: Function };
                const _waitForInput = waitObj.waitForInput;
                if (typeof _waitForInput === 'function') {
                    _waitForInput.call(request.response);
                }
                return;
            }
            // If already running, continue as normal
            await super.invoke(request);
        } catch (error) {
                const responseRoot = request.response as unknown as { response?: { addContent?: Function }, complete?: Function };
            const _addContentErr = responseRoot.response?.addContent;
            if (typeof _addContentErr === 'function') {
                _addContentErr.call(responseRoot.response, new ErrorChatResponseContentImpl(
                    new Error('Error checking Playwright MCP server status: ' + (error instanceof Error ? error.message : String(error)))
                ));
            }
            const _completeOnErr = responseRoot.complete;
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
                const pref = this.preferenceService as unknown as { set?: Function, updateValue?: Function };
                if (typeof pref.set === 'function') {
                    await (pref.set as Function).call(this.preferenceService, MCP_SERVERS_PREF, { ...currentServers, [server.name]: server }, (PreferenceScope as unknown as object));
                } else if (typeof pref.updateValue === 'function') {
                    await (pref.updateValue as Function).call(this.preferenceService, MCP_SERVERS_PREF, { ...currentServers, [server.name]: server });
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
            const provider = this.llmProviderService as unknown as { sendRequestToProvider?: Function };
            const sendFn = provider.sendRequestToProvider;
            if (typeof sendFn === 'function') {
                const resp = await sendFn.call(provider, undefined, { input: messages.map(m => `${m.role || 'user'}: ${m.content}`).join('\n'), settings });
                const normalizeProviderResp = (r: unknown): LanguageModelResponse => {
                    const rr = r as { status?: unknown, body?: unknown } | undefined;
                    const status = rr && typeof rr.status === 'number' ? rr.status : (rr && typeof rr.status === 'string' ? Number(rr.status) || 200 : 200);
                    const body = rr?.body ?? r;
                    const text = typeof body === 'string' ? body : JSON.stringify(body);
                    return { status, text, raw: body } as unknown as LanguageModelResponse;
                };
                return normalizeProviderResp(resp);
            }
        } catch (e) {
            return this.languageModelService.sendRequest(languageModel, { messages, tools: toolRequests.length ? toolRequests : undefined, settings, agentId: this.id, sessionId: request.session.id, requestId: request.id, cancellationToken: request.response?.cancellationToken });
        }
    }
}
