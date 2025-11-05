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
var AIVariableConfigurationWidget_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIVariableConfigurationWidget = void 0;
const tslib_1 = require("tslib");
const common_1 = require("@theia/ai-core/lib/common");
const browser_1 = require("@theia/core/lib/browser");
const inversify_1 = require("@theia/core/shared/inversify");
const React = require("@theia/core/shared/react");
const agent_configuration_widget_1 = require("./agent-configuration-widget");
const ai_configuration_service_1 = require("./ai-configuration-service");
let AIVariableConfigurationWidget = class AIVariableConfigurationWidget extends browser_1.ReactWidget {
    static { AIVariableConfigurationWidget_1 = this; }
    static ID = 'ai-variable-configuration-container-widget';
    static LABEL = 'Variables';
    variableService;
    agentService;
    aiConfigurationSelectionService;
    init() {
        this.id = AIVariableConfigurationWidget_1.ID;
        this.title.label = AIVariableConfigurationWidget_1.LABEL;
        this.title.closable = false;
        this.update();
        // The onDidChangeVariables API may return either a unregister function or a Disposable.
        // Treat the return as 'any' and wrap unconditionally to avoid testing a value typed as void.
        const d = this.variableService.onDidChangeVariables(() => this.update());
        this.toDispose.push({ dispose: () => { try {
                if (typeof d === 'function') {
                    d();
                }
                else if (d && typeof d.dispose === 'function') {
                    d.dispose();
                }
            }
            catch { } } });
    }
    render() {
        return React.createElement("div", { className: 'configuration-variables-list' },
            React.createElement("ul", null, this.variableService.getVariables().map(variable => React.createElement("li", { key: variable.id, className: 'variable-item' },
                React.createElement("div", { className: 'settings-section-title settings-section-category-title variable-title' }, variable.name),
                React.createElement("small", null, variable.id),
                React.createElement("small", null, variable.description),
                this.renderReferencedVariables(variable),
                this.renderArgs(variable)))));
    }
    renderReferencedVariables(variable) {
        const agents = this.getAgentsForVariable(variable);
        if (agents.length === 0) {
            return;
        }
        return React.createElement("div", null,
            React.createElement("h3", null, "Agents"),
            React.createElement("ul", { className: 'variable-references' }, agents.map(agent => React.createElement("li", { key: agent.id, className: 'theia-TreeNode theia-CompositeTreeNode theia-ExpandableTreeNode theia-mod-selected' },
                React.createElement("div", { onClick: () => { this.showAgentConfiguration(agent); }, className: 'variable-reference' },
                    React.createElement("span", null, agent.name),
                    React.createElement("i", { className: (0, browser_1.codicon)('chevron-right') }))))));
    }
    renderArgs(variable) {
        if (variable.args === undefined || variable.args.length === 0) {
            return;
        }
        return React.createElement("div", { className: 'variable-args-container' },
            React.createElement("h3", null, "Variable Arguments"),
            React.createElement("div", { className: 'variable-args' }, variable.args.map(arg => React.createElement(React.Fragment, { key: arg.name },
                React.createElement("span", null, arg.name),
                React.createElement("small", null, arg.description)))));
    }
    showAgentConfiguration(agent) {
        this.aiConfigurationSelectionService.setActiveAgent(agent);
        this.aiConfigurationSelectionService.selectConfigurationTab(agent_configuration_widget_1.AIAgentConfigurationWidget.ID);
    }
    getAgentsForVariable(variable) {
        return this.agentService.getAgents().filter(a => a.variables?.includes(variable.id));
    }
};
exports.AIVariableConfigurationWidget = AIVariableConfigurationWidget;
tslib_1.__decorate([
    (0, inversify_1.inject)(common_1.AIVariableService),
    tslib_1.__metadata("design:type", common_1.AIVariableService)
], AIVariableConfigurationWidget.prototype, "variableService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(common_1.AgentService),
    tslib_1.__metadata("design:type", common_1.AgentService)
], AIVariableConfigurationWidget.prototype, "agentService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_configuration_service_1.AIConfigurationSelectionService),
    tslib_1.__metadata("design:type", ai_configuration_service_1.AIConfigurationSelectionService)
], AIVariableConfigurationWidget.prototype, "aiConfigurationSelectionService", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], AIVariableConfigurationWidget.prototype, "init", null);
exports.AIVariableConfigurationWidget = AIVariableConfigurationWidget = AIVariableConfigurationWidget_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], AIVariableConfigurationWidget);
//# sourceMappingURL=variable-configuration-widget.js.map