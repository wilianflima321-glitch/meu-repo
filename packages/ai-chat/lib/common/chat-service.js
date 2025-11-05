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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// Partially copied from https://github.com/microsoft/vscode/blob/a2cab7255c0df424027be05d58e1b7b941f4ea60/src/vs/workbench/contrib/chat/common/chatService.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatServiceImpl = exports.ChatServiceFactory = exports.ChatService = exports.PinChatAgent = exports.FallbackChatAgentId = exports.DefaultChatAgentId = void 0;
exports.isActiveSessionChangedEvent = isActiveSessionChangedEvent;
exports.isSessionCreatedEvent = isSessionCreatedEvent;
exports.isSessionDeletedEvent = isSessionDeletedEvent;
const tslib_1 = require("tslib");
const ai_core_1 = require("@theia/ai-core");
const core_1 = require("@theia/core");
const promise_util_1 = require("@theia/core/lib/common/promise-util");
const inversify_1 = require("@theia/core/shared/inversify");
const chat_agent_service_1 = require("./chat-agent-service");
const chat_agents_1 = require("./chat-agents");
const chat_model_1 = require("./chat-model");
const chat_request_parser_1 = require("./chat-request-parser");
const chat_session_naming_service_1 = require("./chat-session-naming-service");
const parsed_chat_request_1 = require("./parsed-chat-request");
function isActiveSessionChangedEvent(obj) {
    // eslint-disable-next-line no-null/no-null
    return typeof obj === 'object' && obj !== null && 'type' in obj && obj.type === 'activeChange';
}
function isSessionCreatedEvent(obj) {
    // eslint-disable-next-line no-null/no-null
    return typeof obj === 'object' && obj !== null && 'type' in obj && obj.type === 'created';
}
function isSessionDeletedEvent(obj) {
    // eslint-disable-next-line no-null/no-null
    return typeof obj === 'object' && obj !== null && 'type' in obj && obj.type === 'deleted';
}
/**
 * The default chat agent to invoke
 */
exports.DefaultChatAgentId = Symbol('DefaultChatAgentId');
/**
 * In case no fitting chat agent is available, this one will be used (if it is itself available)
 */
exports.FallbackChatAgentId = Symbol('FallbackChatAgentId');
exports.PinChatAgent = Symbol('PinChatAgent');
exports.ChatService = Symbol('ChatService');
exports.ChatServiceFactory = Symbol('ChatServiceFactory');
let ChatServiceImpl = class ChatServiceImpl {
    constructor() {
        this.onSessionEventEmitter = new core_1.Emitter();
        this.onSessionEvent = this.onSessionEventEmitter.event;
        this._sessions = [];
    }
    getSessions() {
        return [...this._sessions];
    }
    getSession(id) {
        return this._sessions.find(session => session.id === id);
    }
    createSession(location = chat_agents_1.ChatAgentLocation.Panel, options, pinnedAgent) {
        const model = new chat_model_1.MutableChatModel(location);
        const session = {
            id: model.id,
            model,
            isActive: true,
            pinnedAgent
        };
        this._sessions.push(session);
        this.setActiveSession(session.id, options);
        this.onSessionEventEmitter.fire({ type: 'created', sessionId: session.id });
        return session;
    }
    deleteSession(sessionId) {
        var _a;
        const sessionIndex = this._sessions.findIndex(candidate => candidate.id === sessionId);
        if (sessionIndex === -1) {
            return;
        }
        const session = this._sessions[sessionIndex];
        // If the removed session is the active one, set the newest one as active
        if (session.isActive) {
            this.setActiveSession((_a = this._sessions[this._sessions.length - 1]) === null || _a === void 0 ? void 0 : _a.id);
        }
        session.model.dispose();
        this._sessions.splice(sessionIndex, 1);
        this.onSessionEventEmitter.fire({ type: 'deleted', sessionId: sessionId });
    }
    getActiveSession() {
        const activeSessions = this._sessions.filter(candidate => candidate.isActive);
        if (activeSessions.length > 1) {
            throw new Error('More than one session marked as active. This indicates an error in ChatService.');
        }
        return activeSessions.at(0);
    }
    setActiveSession(sessionId, options) {
        this._sessions.forEach(session => {
            session.isActive = session.id === sessionId;
        });
        this.onSessionEventEmitter.fire({ type: 'activeChange', sessionId: sessionId, ...options });
    }
    async sendRequest(sessionId, request) {
        var _a;
        const session = this.getSession(sessionId);
        if (!session) {
            return undefined;
        }
        this.cancelIncompleteRequests(session);
        const resolutionContext = { model: session.model };
        const resolvedContext = await this.resolveChatContext((_a = request.variables) !== null && _a !== void 0 ? _a : session.model.context.getVariables(), resolutionContext);
        const parsedRequest = await this.chatRequestParser.parseChatRequest(request, session.model.location, resolvedContext);
        const agent = this.getAgent(parsedRequest, session);
        if (agent === undefined) {
            const error = 'No ChatAgents available to handle request!';
            this.logger.error(error);
            const chatResponseModel = new chat_model_1.ErrorChatResponseModel((0, core_1.generateUuid)(), new Error(error));
            return {
                requestCompleted: Promise.reject(error),
                responseCreated: Promise.reject(error),
                responseCompleted: Promise.resolve(chatResponseModel),
            };
        }
        const requestModel = session.model.addRequest(parsedRequest, agent === null || agent === void 0 ? void 0 : agent.id, resolvedContext);
        this.updateSessionMetadata(session, requestModel);
        resolutionContext.request = requestModel;
        const responseCompletionDeferred = new promise_util_1.Deferred();
        const invocation = {
            requestCompleted: Promise.resolve(requestModel),
            responseCreated: Promise.resolve(requestModel.response),
            responseCompleted: responseCompletionDeferred.promise,
        };
        requestModel.response.onDidChange(() => {
            if (requestModel.response.isComplete) {
                responseCompletionDeferred.resolve(requestModel.response);
            }
            if (requestModel.response.isError) {
                responseCompletionDeferred.resolve(requestModel.response);
            }
        });
        agent.invoke(requestModel).catch(error => requestModel.response.error(error));
        return invocation;
    }
    cancelIncompleteRequests(session) {
        for (const pastRequest of session.model.getRequests()) {
            if (!pastRequest.response.isComplete) {
                pastRequest.cancel();
            }
        }
    }
    updateSessionMetadata(session, request) {
        var _a;
        session.lastInteraction = new Date();
        if (session.title) {
            return;
        }
        const requestText = (_a = request.request.displayText) !== null && _a !== void 0 ? _a : request.request.text;
        session.title = requestText;
        if (this.chatSessionNamingService) {
            const otherSessionNames = this._sessions.map(s => s.title).filter((title) => title !== undefined);
            const namingService = this.chatSessionNamingService;
            let didGenerateName = false;
            request.response.onDidChange(() => {
                if (request.response.isComplete && !didGenerateName) {
                    namingService.generateChatSessionName(session, otherSessionNames).then(name => {
                        if (name && session.title === requestText) {
                            session.title = name;
                        }
                        didGenerateName = true;
                    }).catch(error => this.logger.error('Failed to generate chat session name', error));
                }
            });
        }
    }
    async resolveChatContext(resolutionRequests, context) {
        // TODO use a common cache to resolve variables and return recursively resolved variables?
        const resolvedVariables = await Promise.all(resolutionRequests.map(async (contextVariable) => this.variableService.resolveVariable(contextVariable, context)))
            .then(results => results.filter(ai_core_1.ResolvedAIContextVariable.is));
        return { variables: resolvedVariables };
    }
    async cancelRequest(sessionId, requestId) {
        var _a, _b;
        return (_b = (_a = this.getSession(sessionId)) === null || _a === void 0 ? void 0 : _a.model.getRequest(requestId)) === null || _b === void 0 ? void 0 : _b.response.cancel();
    }
    getAgent(parsedRequest, session) {
        const agent = this.initialAgentSelection(parsedRequest);
        if (!this.isPinChatAgentEnabled()) {
            return agent;
        }
        return this.handlePinnedAgent(parsedRequest, session, agent);
    }
    /**
     * Determines if chat agent pinning is enabled.
     * Can be overridden by subclasses to provide different logic (e.g., using preferences).
     */
    isPinChatAgentEnabled() {
        return this.pinChatAgent !== false;
    }
    /**
     * Handle pinned agent by:
     * - checking if an agent is pinned, and use it if no other agent is mentioned
     * - pinning the current agent
     */
    handlePinnedAgent(parsedRequest, session, agent) {
        const mentionedAgentPart = this.getMentionedAgent(parsedRequest);
        const mentionedAgent = mentionedAgentPart ? this.chatAgentService.getAgent(mentionedAgentPart.agentId) : undefined;
        if (mentionedAgent) {
            // If an agent is explicitly mentioned, it becomes the new pinned agent
            session.pinnedAgent = mentionedAgent;
            return mentionedAgent;
        }
        else if (session.pinnedAgent) {
            // If we have a valid pinned agent, use it (pinned agent may become stale
            // if it was disabled; so we always need to recheck)
            const pinnedAgent = this.chatAgentService.getAgent(session.pinnedAgent.id);
            if (pinnedAgent) {
                return pinnedAgent;
            }
        }
        // Otherwise, override the pinned agent and return the suggested one
        session.pinnedAgent = agent;
        return agent;
    }
    initialAgentSelection(parsedRequest) {
        var _a;
        const agentPart = this.getMentionedAgent(parsedRequest);
        if (agentPart) {
            return this.chatAgentService.getAgent(agentPart.agentId);
        }
        let chatAgent = undefined;
        if (this.defaultChatAgentId) {
            chatAgent = this.chatAgentService.getAgent(this.defaultChatAgentId.id);
        }
        if (!chatAgent && this.fallbackChatAgentId) {
            chatAgent = this.chatAgentService.getAgent(this.fallbackChatAgentId.id);
        }
        if (chatAgent) {
            return chatAgent;
        }
        this.logger.warn('Neither the default chat agent nor the fallback chat agent are configured or available. Falling back to the first registered agent');
        return (_a = this.chatAgentService.getAgents()[0]) !== null && _a !== void 0 ? _a : undefined;
    }
    getMentionedAgent(parsedRequest) {
        return parsedRequest.parts.find(p => p instanceof parsed_chat_request_1.ParsedChatRequestAgentPart);
    }
    deleteChangeSet(sessionId) {
        var _a;
        const model = (_a = this.getSession(sessionId)) === null || _a === void 0 ? void 0 : _a.model;
        model === null || model === void 0 ? void 0 : model.changeSet.setElements();
    }
    deleteChangeSetElement(sessionId, uri) {
        var _a;
        (_a = this.getSession(sessionId)) === null || _a === void 0 ? void 0 : _a.model.changeSet.removeElements(uri);
    }
};
exports.ChatServiceImpl = ChatServiceImpl;
tslib_1.__decorate([
    (0, inversify_1.inject)(chat_agent_service_1.ChatAgentService),
    tslib_1.__metadata("design:type", Object)
], ChatServiceImpl.prototype, "chatAgentService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(exports.DefaultChatAgentId),
    (0, inversify_1.optional)(),
    tslib_1.__metadata("design:type", Object)
], ChatServiceImpl.prototype, "defaultChatAgentId", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(exports.FallbackChatAgentId),
    (0, inversify_1.optional)(),
    tslib_1.__metadata("design:type", Object)
], ChatServiceImpl.prototype, "fallbackChatAgentId", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(chat_session_naming_service_1.ChatSessionNamingService),
    (0, inversify_1.optional)(),
    tslib_1.__metadata("design:type", Object)
], ChatServiceImpl.prototype, "chatSessionNamingService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(exports.PinChatAgent),
    (0, inversify_1.optional)(),
    tslib_1.__metadata("design:type", Object)
], ChatServiceImpl.prototype, "pinChatAgent", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(chat_request_parser_1.ChatRequestParser),
    tslib_1.__metadata("design:type", Object)
], ChatServiceImpl.prototype, "chatRequestParser", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_core_1.AIVariableService),
    tslib_1.__metadata("design:type", Object)
], ChatServiceImpl.prototype, "variableService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.ILogger),
    tslib_1.__metadata("design:type", Object)
], ChatServiceImpl.prototype, "logger", void 0);
exports.ChatServiceImpl = ChatServiceImpl = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ChatServiceImpl);
//# sourceMappingURL=chat-service.js.map