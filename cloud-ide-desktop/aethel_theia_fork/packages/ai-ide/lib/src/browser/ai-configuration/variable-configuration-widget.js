"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AIVariableConfigurationWidget_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIVariableConfigurationWidget = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
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
const common_1 = require("@theia/ai-core/lib/common");
const browser_1 = require("@theia/core/lib/browser");
const inversify_1 = require("@theia/core/shared/inversify");
const React = __importStar(require("@theia/core/shared/react"));
const agent_configuration_widget_1 = require("./agent-configuration-widget");
const ai_configuration_service_1 = require("./ai-configuration-service");
let AIVariableConfigurationWidget = class AIVariableConfigurationWidget extends browser_1.ReactWidget {
    static { AIVariableConfigurationWidget_1 = this; }
    static { this.ID = 'ai-variable-configuration-container-widget'; }
    static { this.LABEL = 'Variables'; }
    set variableService(v) { this._variableService = v; }
    get variableService() { if (!this._variableService) {
        throw new Error('AIVariableConfigurationWidget: variableService not injected');
    } return this._variableService; }
    set agentService(v) { this._agentService = v; }
    get agentService() { if (!this._agentService) {
        throw new Error('AIVariableConfigurationWidget: agentService not injected');
    } return this._agentService; }
    set aiConfigurationSelectionService(v) { this._aiConfigurationSelectionService = v; }
    get aiConfigurationSelectionService() { if (!this._aiConfigurationSelectionService) {
        throw new Error('AIVariableConfigurationWidget: aiConfigurationSelectionService not injected');
    } return this._aiConfigurationSelectionService; }
    init() {
        this.id = AIVariableConfigurationWidget_1.ID;
        this.title.label = AIVariableConfigurationWidget_1.LABEL;
        this.title.closable = false;
        this.update();
        // The onDidChangeVariables API may return either a unregister function or a Disposable.
        // Treat the return as an unknown runtime value and wrap unconditionally to avoid testing a value typed as void.
        const _d = this.variableService.onDidChangeVariables(() => this.update());
        // Normalize listener return into a Disposable. Supports unregister functions and Disposable objects.
        const makeDisposable = (x) => {
            if (!x) {
                return undefined;
            }
            if (typeof x === 'function') {
                const fn = x;
                return { dispose: () => { try {
                        fn();
                    }
                    catch { /* swallow */ } } };
            }
            if (x && typeof x.dispose === 'function') {
                return x;
            }
            return undefined;
        };
        const _dd = makeDisposable(_d);
        if (_dd) {
            this.toDispose.push(_dd);
        }
    }
    render() {
        return (0, jsx_runtime_1.jsx)("div", { className: 'configuration-variables-list', children: (0, jsx_runtime_1.jsx)("ul", { children: this.variableService.getVariables().map(variable => (0, jsx_runtime_1.jsxs)("li", { className: 'variable-item', children: [(0, jsx_runtime_1.jsx)("div", { className: 'settings-section-title settings-section-category-title variable-title', children: variable.name }), (0, jsx_runtime_1.jsx)("small", { children: variable.id }), (0, jsx_runtime_1.jsx)("small", { children: variable.description }), this.renderReferencedVariables(variable), this.renderArgs(variable)] }, variable.id)) }) });
    }
    renderReferencedVariables(variable) {
        const agents = this.getAgentsForVariable(variable);
        if (agents.length === 0) {
            return;
        }
        return (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h3", { children: "Agents" }), (0, jsx_runtime_1.jsx)("ul", { className: 'variable-references', children: agents.map(agent => (0, jsx_runtime_1.jsx)("li", { className: 'theia-TreeNode theia-CompositeTreeNode theia-ExpandableTreeNode theia-mod-selected', children: (0, jsx_runtime_1.jsxs)("div", { onClick: () => { this.showAgentConfiguration(agent); }, className: 'variable-reference', children: [(0, jsx_runtime_1.jsx)("span", { children: agent.name }), (0, jsx_runtime_1.jsx)("i", { className: (0, browser_1.codicon)('chevron-right') })] }) }, agent.id)) })] });
    }
    renderArgs(variable) {
        if (variable.args === undefined || variable.args.length === 0) {
            return;
        }
        return (0, jsx_runtime_1.jsxs)("div", { className: 'variable-args-container', children: [(0, jsx_runtime_1.jsx)("h3", { children: "Variable Arguments" }), (0, jsx_runtime_1.jsx)("div", { className: 'variable-args', children: variable.args.map((arg) => (0, jsx_runtime_1.jsxs)(React.Fragment, { children: [(0, jsx_runtime_1.jsx)("span", { children: arg.name }), (0, jsx_runtime_1.jsx)("small", { children: arg.description })] }, arg.name)) })] });
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
__decorate([
    (0, inversify_1.inject)(common_1.AIVariableService),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], AIVariableConfigurationWidget.prototype, "variableService", null);
__decorate([
    (0, inversify_1.inject)(common_1.AgentService),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], AIVariableConfigurationWidget.prototype, "agentService", null);
__decorate([
    (0, inversify_1.inject)(ai_configuration_service_1.AIConfigurationSelectionService),
    __metadata("design:type", ai_configuration_service_1.AIConfigurationSelectionService),
    __metadata("design:paramtypes", [ai_configuration_service_1.AIConfigurationSelectionService])
], AIVariableConfigurationWidget.prototype, "aiConfigurationSelectionService", null);
__decorate([
    (0, inversify_1.postConstruct)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AIVariableConfigurationWidget.prototype, "init", null);
exports.AIVariableConfigurationWidget = AIVariableConfigurationWidget = AIVariableConfigurationWidget_1 = __decorate([
    (0, inversify_1.injectable)()
], AIVariableConfigurationWidget);
