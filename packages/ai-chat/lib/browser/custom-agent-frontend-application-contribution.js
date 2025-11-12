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
exports.AICustomAgentsFrontendApplicationContribution = void 0;
const tslib_1 = require("tslib");
const ai_core_1 = require("@theia/ai-core");
const inversify_1 = require("@theia/core/shared/inversify");
const common_1 = require("../common");
const custom_agent_factory_1 = require("./custom-agent-factory");
let AICustomAgentsFrontendApplicationContribution = class AICustomAgentsFrontendApplicationContribution {
    constructor() {
        this.knownCustomAgents = new Map();
    }
    onStart() {
        var _a, _b;
        (_a = this.customizationService) === null || _a === void 0 ? void 0 : _a.getCustomAgents().then(customAgents => {
            customAgents.forEach(agent => {
                this.customAgentFactory(agent.id, agent.name, agent.description, agent.prompt, agent.defaultLLM);
                this.knownCustomAgents.set(agent.id, agent);
            });
        }).catch(e => {
            console.error('Failed to load custom agents', e);
        });
        (_b = this.customizationService) === null || _b === void 0 ? void 0 : _b.onDidChangeCustomAgents(() => {
            var _a;
            (_a = this.customizationService) === null || _a === void 0 ? void 0 : _a.getCustomAgents().then(customAgents => {
                const customAgentsToAdd = customAgents.filter(agent => !this.knownCustomAgents.has(agent.id) || !ai_core_1.CustomAgentDescription.equals(this.knownCustomAgents.get(agent.id), agent));
                const customAgentIdsToRemove = [...this.knownCustomAgents.values()].filter(agent => !customAgents.find(a => ai_core_1.CustomAgentDescription.equals(a, agent))).map(a => a.id);
                // delete first so we don't have to deal with the case where we add and remove the same agentId
                customAgentIdsToRemove.forEach(id => {
                    this.chatAgentService.unregisterChatAgent(id);
                    this.agentService.unregisterAgent(id);
                    this.knownCustomAgents.delete(id);
                });
                customAgentsToAdd
                    .forEach(agent => {
                    this.customAgentFactory(agent.id, agent.name, agent.description, agent.prompt, agent.defaultLLM);
                    this.knownCustomAgents.set(agent.id, agent);
                });
            }).catch(e => {
                console.error('Failed to load custom agents', e);
            });
        });
    }
    onStop() {
    }
};
exports.AICustomAgentsFrontendApplicationContribution = AICustomAgentsFrontendApplicationContribution;
tslib_1.__decorate([
    (0, inversify_1.inject)(custom_agent_factory_1.CustomAgentFactory),
    tslib_1.__metadata("design:type", Function)
], AICustomAgentsFrontendApplicationContribution.prototype, "customAgentFactory", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_core_1.PromptFragmentCustomizationService),
    (0, inversify_1.optional)(),
    tslib_1.__metadata("design:type", Object)
], AICustomAgentsFrontendApplicationContribution.prototype, "customizationService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_core_1.AgentService),
    tslib_1.__metadata("design:type", Object)
], AICustomAgentsFrontendApplicationContribution.prototype, "agentService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(common_1.ChatAgentService),
    tslib_1.__metadata("design:type", Object)
], AICustomAgentsFrontendApplicationContribution.prototype, "chatAgentService", void 0);
exports.AICustomAgentsFrontendApplicationContribution = AICustomAgentsFrontendApplicationContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], AICustomAgentsFrontendApplicationContribution);
//# sourceMappingURL=custom-agent-frontend-application-contribution.js.map