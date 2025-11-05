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
// Partially copied from https://github.com/microsoft/vscode/blob/a2cab7255c0df424027be05d58e1b7b941f4ea60/src/vs/workbench/contrib/chat/common/chatAgents.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatAgentServiceImpl = exports.ChatAgentServiceFactory = exports.ChatAgentService = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
const chat_agents_1 = require("./chat-agents");
const ai_core_1 = require("@theia/ai-core");
exports.ChatAgentService = Symbol('ChatAgentService');
exports.ChatAgentServiceFactory = Symbol('ChatAgentServiceFactory');
let ChatAgentServiceImpl = class ChatAgentServiceImpl {
    constructor() {
        this._agents = [];
    }
    get agents() {
        // We can't collect the contributions at @postConstruct because this will lead to a circular dependency
        // with chat agents reusing the chat agent service (e.g. orchestrator)
        return [...this.agentContributions.getContributions(), ...this._agents];
    }
    registerChatAgent(agent) {
        this._agents.push(agent);
    }
    unregisterChatAgent(agentId) {
        this._agents = this._agents.filter(a => a.id !== agentId);
    }
    getAgent(id) {
        if (!this._agentIsEnabled(id)) {
            return undefined;
        }
        return this.getAgents().find(agent => agent.id === id);
    }
    getAgents() {
        return this.agents.filter(a => this._agentIsEnabled(a.id));
    }
    getAllAgents() {
        return this.agents;
    }
    _agentIsEnabled(id) {
        return this.agentService.isEnabled(id);
    }
};
exports.ChatAgentServiceImpl = ChatAgentServiceImpl;
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.ContributionProvider),
    (0, inversify_1.named)(chat_agents_1.ChatAgent),
    tslib_1.__metadata("design:type", Object)
], ChatAgentServiceImpl.prototype, "agentContributions", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.ILogger),
    tslib_1.__metadata("design:type", Object)
], ChatAgentServiceImpl.prototype, "logger", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_core_1.AgentService),
    tslib_1.__metadata("design:type", Object)
], ChatAgentServiceImpl.prototype, "agentService", void 0);
exports.ChatAgentServiceImpl = ChatAgentServiceImpl = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ChatAgentServiceImpl);
//# sourceMappingURL=chat-agent-service.js.map