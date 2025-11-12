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
var AgentDelegationTool_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentDelegationTool = exports.AGENT_DELEGATION_FUNCTION_ID = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const common_1 = require("../common");
const delegation_response_content_1 = require("./delegation-response-content");
exports.AGENT_DELEGATION_FUNCTION_ID = 'delegateToAgent';
let AgentDelegationTool = AgentDelegationTool_1 = class AgentDelegationTool {
    getTool() {
        return {
            id: AgentDelegationTool_1.ID,
            name: AgentDelegationTool_1.ID,
            description: 'Delegate a task or question to a specific AI agent. This tool allows you to submit requests to specialized agents based on their capabilities.',
            parameters: {
                type: 'object',
                properties: {
                    agentId: {
                        type: 'string',
                        description: 'The ID of the AI agent to delegate the task to.',
                    },
                    prompt: {
                        type: 'string',
                        description: 'The task, question, or prompt to pass to the specified agent.',
                    },
                },
                required: ['agentId', 'prompt'],
            },
            handler: (arg_string, ctx) => this.delegateToAgent(arg_string, ctx),
        };
    }
    async delegateToAgent(arg_string, ctx) {
        var _a, _b, _c;
        if (ctx.response.cancellationToken.isCancellationRequested) {
            return 'Operation cancelled by user';
        }
        try {
            const args = JSON.parse(arg_string);
            const { agentId, prompt } = args;
            if (!agentId || !prompt) {
                const errorMsg = 'Both agentId and prompt parameters are required.';
                console.error(errorMsg, { agentId, prompt });
                return errorMsg;
            }
            // Check if the specified agent exists
            const agent = this.getChatAgentService().getAgent(agentId);
            if (!agent) {
                const availableAgents = this.getChatAgentService()
                    .getAgents()
                    .map(a => a.id);
                const errorMsg = `Agent '${agentId}' not found or not enabled. Available agents: ${availableAgents.join(', ')}`;
                console.error(errorMsg);
                return errorMsg;
            }
            let newSession;
            try {
                // FIXME: this creates a new conversation visible in the UI (Panel), which we don't want
                // It is not possible to start a session without specifying a location (default=Panel)
                const chatService = this.getChatService();
                // Store the current active session to restore it after delegation
                const currentActiveSession = chatService.getActiveSession();
                newSession = chatService.createSession(undefined, { focus: false }, agent);
                // Immediately restore the original active session to avoid confusing the user
                if (currentActiveSession) {
                    chatService.setActiveSession(currentActiveSession.id, { focus: false });
                }
                // Setup ChangeSet bubbling from delegated session to parent session
                this.setupChangeSetBubbling(newSession, ctx.session);
            }
            catch (sessionError) {
                const errorMsg = `Failed to create chat session for agent '${agentId}': ${sessionError instanceof Error ? sessionError.message : sessionError}`;
                console.error(errorMsg, sessionError);
                return errorMsg;
            }
            // Send the request
            const chatRequest = {
                text: prompt,
            };
            let response;
            try {
                if ((_b = (_a = ctx === null || ctx === void 0 ? void 0 : ctx.response) === null || _a === void 0 ? void 0 : _a.cancellationToken) === null || _b === void 0 ? void 0 : _b.isCancellationRequested) {
                    return 'Operation cancelled by user';
                }
                const chatService = this.getChatService();
                response = await chatService.sendRequest(newSession.id, chatRequest);
                if ((_c = ctx === null || ctx === void 0 ? void 0 : ctx.response) === null || _c === void 0 ? void 0 : _c.cancellationToken) {
                    ctx.response.cancellationToken.onCancellationRequested(async () => {
                        if (response) {
                            (await (response === null || response === void 0 ? void 0 : response.requestCompleted)).cancel();
                        }
                    });
                }
            }
            catch (sendError) {
                const errorMsg = `Failed to send request to agent '${agentId}': ${sendError instanceof Error ? sendError.message : sendError}`;
                console.error(errorMsg, sendError);
                return errorMsg;
            }
            if (response) {
                // Add the response content immediately to enable streaming
                // The renderer will handle the streaming updates
                ctx.response.response.addContent(new delegation_response_content_1.DelegationResponseContent(agent.name, prompt, response));
                try {
                    // Wait for completion to return the final result as tool output
                    const result = await response.responseCompleted;
                    const stringResult = result.response.asString();
                    // Clean up the session after completion
                    const chatService = this.getChatService();
                    chatService.deleteSession(newSession.id);
                    // Return the raw text to the top-level Agent, as a tool result
                    return stringResult;
                }
                catch (completionError) {
                    if (completionError.message &&
                        completionError.message.includes('cancelled')) {
                        return 'Operation cancelled by user';
                    }
                    const errorMsg = `Failed to complete response from agent '${agentId}': ${completionError instanceof Error ? completionError.message : completionError}`;
                    console.error(errorMsg, completionError);
                    return errorMsg;
                }
            }
            else {
                const errorMsg = `Delegation to agent '${agentId}' has failed: no response returned.`;
                console.error(errorMsg);
                return errorMsg;
            }
        }
        catch (error) {
            console.error('Failed to delegate to agent', error);
            return JSON.stringify({
                error: `Failed to parse arguments or delegate to agent: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
        }
    }
    /**
     * Sets up monitoring of the ChangeSet in the delegated session and bubbles changes to the parent session.
     * @param delegatedSession The session created for the delegated agent
     * @param parentModel The parent session model that should receive the bubbled changes
     * @param agentName The name of the agent for attribution purposes
     */
    setupChangeSetBubbling(delegatedSession, parentModel) {
        // Monitor ChangeSet for bubbling
        delegatedSession.model.changeSet.onDidChange(_event => {
            this.bubbleChangeSet(delegatedSession, parentModel);
        });
    }
    /**
     * Bubbles the ChangeSet from the delegated session to the parent session.
     * @param delegatedSession The session from which to bubble changes
     * @param parentModel The parent session model to receive the bubbled changes
     * @param agentName The name of the agent for attribution purposes
     */
    bubbleChangeSet(delegatedSession, parentModel) {
        const delegatedElements = delegatedSession.model.changeSet.getElements();
        if (delegatedElements.length > 0) {
            parentModel.changeSet.setTitle(delegatedSession.model.changeSet.title);
            parentModel.changeSet.addElements(...delegatedElements);
        }
    }
};
exports.AgentDelegationTool = AgentDelegationTool;
AgentDelegationTool.ID = exports.AGENT_DELEGATION_FUNCTION_ID;
tslib_1.__decorate([
    (0, inversify_1.inject)(common_1.ChatAgentServiceFactory),
    tslib_1.__metadata("design:type", Function)
], AgentDelegationTool.prototype, "getChatAgentService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(common_1.ChatServiceFactory),
    tslib_1.__metadata("design:type", Function)
], AgentDelegationTool.prototype, "getChatService", void 0);
exports.AgentDelegationTool = AgentDelegationTool = AgentDelegationTool_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], AgentDelegationTool);
//# sourceMappingURL=agent-delegation-tool.js.map