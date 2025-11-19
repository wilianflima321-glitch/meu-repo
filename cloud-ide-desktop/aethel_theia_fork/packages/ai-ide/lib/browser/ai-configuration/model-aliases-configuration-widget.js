"use strict";
var ModelAliasesConfigurationWidget_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelAliasesConfigurationWidget = void 0;
const tslib_1 = require("tslib");
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
const React = require("@theia/core/shared/react");
const inversify_1 = require("@theia/core/shared/inversify");
const react_widget_1 = require("@theia/core/lib/browser/widgets/react-widget");
const language_model_alias_1 = require("@theia/ai-core/lib/common/language-model-alias");
const language_model_1 = require("@theia/ai-core/lib/common/language-model");
const nls_1 = require("@theia/core/lib/common/nls");
const ai_configuration_service_1 = require("./ai-configuration-service");
const ai_core_1 = require("@theia/ai-core");
let ModelAliasesConfigurationWidget = class ModelAliasesConfigurationWidget extends react_widget_1.ReactWidget {
    static { ModelAliasesConfigurationWidget_1 = this; }
    static ID = 'ai-model-aliases-configuration-widget';
    static LABEL = nls_1.nls.localize('theia/ai/core/modelAliasesConfiguration/label', 'Model Aliases');
    languageModelAliasRegistry;
    languageModelRegistry;
    aiConfigurationSelectionService;
    aiSettingsService;
    agentService;
    aliases = [];
    languageModels = [];
    /**
     * Map from alias ID to a list of agent IDs that have a language model requirement for that alias.
     */
    matchingAgentIdsForAliasMap = new Map();
    /**
     * Map from alias ID to the resolved LanguageModel (what the alias currently evaluates to).
     */
    resolvedModelForAlias = new Map();
    init() {
        this.id = ModelAliasesConfigurationWidget_1.ID;
        this.title.label = ModelAliasesConfigurationWidget_1.LABEL;
        this.title.closable = false;
        const aliasesPromise = this.loadAliases();
        const languageModelsPromise = this.loadLanguageModels();
        const matchingAgentsPromise = this.loadMatchingAgentIdsForAllAliases();
        Promise.all([aliasesPromise, languageModelsPromise, matchingAgentsPromise]).then(() => this.update());
        this.languageModelAliasRegistry.ready.then(() => {
            const d = this.languageModelAliasRegistry.onDidChange(async () => {
                await this.loadAliases();
                this.update();
            });
            // Wrap the return as 'any' and avoid testing it in a boolean context (which fails if it's typed as void).
            this.toDispose.push({ dispose: () => { try {
                    if (typeof d === 'function') {
                        d();
                    }
                    else if (typeof d.dispose === 'function') {
                        d.dispose();
                    }
                }
                catch { } } });
        });
        // Capture listener returns as 'any' and wrap them to ensure a Disposable-like object is pushed.
        const r1 = this.languageModelRegistry.onChange(async () => {
            await this.loadAliases();
            await this.loadLanguageModels();
            this.update();
        });
        const r2 = this.aiSettingsService.onDidChange(async () => {
            await this.loadMatchingAgentIdsForAllAliases();
            this.update();
        });
        const r3 = this.aiConfigurationSelectionService.onDidAliasChange(() => this.update());
        this.toDispose.push({ dispose: () => { try {
                if (typeof r1 === 'function') {
                    r1();
                }
                else if (r1 && typeof r1.dispose === 'function') {
                    r1.dispose();
                }
            }
            catch { } } });
        this.toDispose.push({ dispose: () => { try {
                if (typeof r2 === 'function') {
                    r2();
                }
                else if (r2 && typeof r2.dispose === 'function') {
                    r2.dispose();
                }
            }
            catch { } } });
        this.toDispose.push({ dispose: () => { try {
                if (typeof r3 === 'function') {
                    r3();
                }
                else if (r3 && typeof r3.dispose === 'function') {
                    r3.dispose();
                }
            }
            catch { } } });
    }
    async loadAliases() {
        await this.languageModelAliasRegistry.ready;
        this.aliases = this.languageModelAliasRegistry.getAliases();
        // Set the initial selection if not set
        if (this.aliases.length > 0 && !this.aiConfigurationSelectionService.getSelectedAliasId()) {
            this.aiConfigurationSelectionService.setSelectedAliasId(this.aliases[0].id);
        }
        await this.loadMatchingAgentIdsForAllAliases();
        // Resolve evaluated models for each alias
        this.resolvedModelForAlias = new Map();
        for (const alias of this.aliases) {
            const model = await this.languageModelRegistry.getReadyLanguageModel(alias.id);
            this.resolvedModelForAlias.set(alias.id, model);
        }
    }
    async loadLanguageModels() {
        this.languageModels = await this.languageModelRegistry.getLanguageModels();
    }
    /**
     * Loads a map from alias ID to a list of agent IDs that have a language model requirement for that alias.
     */
    async loadMatchingAgentIdsForAllAliases() {
        const agents = this.agentService.getAllAgents();
        const aliasMap = new Map();
        for (const alias of this.aliases) {
            const matchingAgentIds = [];
            for (const agent of agents) {
                const requirementSetting = await this.aiSettingsService.getAgentSettings(agent.id);
                if (requirementSetting?.languageModelRequirements) {
                    // requirement is set via settings, check if it is this alias
                    if (requirementSetting?.languageModelRequirements?.find(e => e.identifier === alias.id)) {
                        matchingAgentIds.push(agent.id);
                    }
                }
                else {
                    // requirement is NOT set via settings, check if this alias is the default for this agent
                    if ((agent.languageModelRequirements ?? []).some((req) => req.identifier === alias.id)) {
                        matchingAgentIds.push(agent.id);
                    }
                }
            }
            aliasMap.set(alias.id, matchingAgentIds);
        }
        this.matchingAgentIdsForAliasMap = aliasMap;
    }
    handleAliasSelectedModelIdChange = (alias, event) => {
        const newModelId = event.target.value || undefined;
        const updatedAlias = {
            ...alias,
            selectedModelId: newModelId
        };
        this.languageModelAliasRegistry.ready.then(() => {
            this.languageModelAliasRegistry.addAlias(updatedAlias);
        });
    };
    render() {
        const selectedAliasId = this.aiConfigurationSelectionService.getSelectedAliasId();
        const selectedAlias = this.aliases.find(alias => alias.id === selectedAliasId);
        return (React.createElement("div", { className: "model-alias-configuration-main" },
            React.createElement("div", { className: "model-alias-configuration-list preferences-tree-widget theia-TreeContainer ai-model-alias-list" },
                React.createElement("ul", null, this.aliases.map(alias => (React.createElement("li", { key: alias.id, className: `theia-TreeNode theia-CompositeTreeNode${alias.id === selectedAliasId ? ' theia-mod-selected' : ''}`, onClick: () => this.aiConfigurationSelectionService.setSelectedAliasId(alias.id) },
                    React.createElement("span", null, alias.id)))))),
            React.createElement("div", { className: "model-alias-configuration-panel preferences-editor-widget" }, selectedAlias ? this.renderAliasDetail(selectedAlias, this.languageModels) : (React.createElement("div", null, nls_1.nls.localize('theia/ai/core/modelAliasesConfiguration/selectAlias', 'Please select a Model Alias.'))))));
    }
    renderAliasDetail(alias, languageModels) {
        const availableModelIds = languageModels.map(m => m.id);
        const selectedModelId = alias.selectedModelId ?? '';
        const isInvalidModel = !!selectedModelId && !availableModelIds.includes(alias.selectedModelId ?? '');
        const agentIds = this.matchingAgentIdsForAliasMap.get(alias.id) || [];
        const agents = this.agentService.getAllAgents().filter(agent => agentIds.includes(agent.id));
        const resolvedModel = this.resolvedModelForAlias.get(alias.id);
        return (React.createElement("div", null,
            React.createElement("div", { className: "settings-section-title settings-section-category-title ai-alias-detail-title" },
                React.createElement("span", null, alias.id)),
            alias.description && React.createElement("div", { className: "ai-alias-detail-description" }, alias.description),
            React.createElement("div", { className: "ai-alias-detail-selected-model" },
                React.createElement("label", null,
                    nls_1.nls.localize('theia/ai/core/modelAliasesConfiguration/selectedModelId', 'Selected Model'),
                    ": "),
                React.createElement("select", { className: `theia-select template-variant-selector ${isInvalidModel ? 'error' : ''}`, value: isInvalidModel ? 'invalid' : selectedModelId, onChange: event => this.handleAliasSelectedModelIdChange(alias, event) },
                    isInvalidModel && (React.createElement("option", { value: "invalid", disabled: true }, nls_1.nls.localize('theia/ai/core/modelAliasesConfiguration/unavailableModel', 'Selected model is no longer available'))),
                    React.createElement("option", { value: "", className: 'ai-language-model-item-ready' }, nls_1.nls.localize('theia/ai/core/modelAliasesConfiguration/defaultList', '[Default list]')),
                    [...languageModels]
                        .sort((a, b) => (a.name ?? a.id).localeCompare(b.name ?? b.id))
                        .map(model => {
                        const isNotReady = model.status.status !== 'ready';
                        return (React.createElement("option", { key: model.id, value: model.id, className: isNotReady ? 'ai-language-model-item-not-ready' : 'ai-language-model-item-ready', title: isNotReady && model.status.message ? model.status.message : undefined },
                            model.name ?? model.id,
                            " ",
                            isNotReady ? '✗' : '✓'));
                    }))),
            alias.selectedModelId === undefined &&
                React.createElement(React.Fragment, null,
                    React.createElement("div", { className: "ai-alias-detail-defaults" },
                        React.createElement("ol", null, alias.defaultModelIds.map(modelId => {
                            const model = this.languageModels.find(m => m.id === modelId);
                            const isReady = model?.status.status === 'ready';
                            return (React.createElement("li", { key: modelId }, isReady ? (React.createElement("span", { className: modelId === resolvedModel?.id ? 'ai-alias-priority-item-resolved' : 'ai-alias-priority-item-ready' },
                                modelId,
                                " ",
                                React.createElement("span", { className: "ai-model-status-ready", title: "Ready" }, "\u2713"))) : (React.createElement("span", { className: "ai-model-default-not-ready" },
                                modelId,
                                " ",
                                React.createElement("span", { className: "ai-model-status-not-ready", title: "Not ready" }, "\u2717")))));
                        }))),
                    React.createElement("div", { className: "ai-alias-evaluates-to-container" },
                        React.createElement("label", { className: "ai-alias-evaluates-to-label" },
                            nls_1.nls.localize('theia/ai/core/modelAliasesConfiguration/evaluatesTo', 'Evaluates to'),
                            ":"),
                        resolvedModel ? (React.createElement("span", { className: "ai-alias-evaluates-to-value" },
                            resolvedModel.name ?? resolvedModel.id,
                            resolvedModel.status.status === 'ready' ? (React.createElement("span", { className: "ai-model-status-ready", title: "Ready" }, "\u2713")) : (React.createElement("span", { className: "ai-model-status-not-ready", title: resolvedModel.status.message || 'Not ready' }, "\u2717")))) : (React.createElement("span", { className: "ai-alias-evaluates-to-unresolved" }, nls_1.nls.localize('theia/ai/core/modelAliasesConfiguration/noResolvedModel', 'No model ready for this alias.'))))),
            React.createElement("div", { className: "ai-alias-detail-agents" },
                React.createElement("label", null,
                    nls_1.nls.localize('theia/ai/core/modelAliasesConfiguration/agents', 'Agents using this Alias'),
                    ":"),
                React.createElement("ul", null, agents.length > 0 ? (agents.map(agent => (React.createElement("li", { key: agent.id },
                    React.createElement("span", null, agent.name),
                    agent.id !== agent.name && React.createElement("span", { className: "ai-alias-agent-id" },
                        "(",
                        agent.id,
                        ")"))))) : (React.createElement("span", null, nls_1.nls.localize('theia/ai/core/modelAliasesConfiguration/noAgents', 'No agents use this alias.')))))));
    }
};
exports.ModelAliasesConfigurationWidget = ModelAliasesConfigurationWidget;
tslib_1.__decorate([
    (0, inversify_1.inject)(language_model_alias_1.LanguageModelAliasRegistry),
    tslib_1.__metadata("design:type", Object)
], ModelAliasesConfigurationWidget.prototype, "languageModelAliasRegistry", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(language_model_1.LanguageModelRegistry),
    tslib_1.__metadata("design:type", Object)
], ModelAliasesConfigurationWidget.prototype, "languageModelRegistry", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_configuration_service_1.AIConfigurationSelectionService),
    tslib_1.__metadata("design:type", ai_configuration_service_1.AIConfigurationSelectionService)
], ModelAliasesConfigurationWidget.prototype, "aiConfigurationSelectionService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_core_1.AISettingsService),
    tslib_1.__metadata("design:type", ai_core_1.AISettingsService)
], ModelAliasesConfigurationWidget.prototype, "aiSettingsService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_core_1.AgentService),
    tslib_1.__metadata("design:type", ai_core_1.AgentService)
], ModelAliasesConfigurationWidget.prototype, "agentService", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], ModelAliasesConfigurationWidget.prototype, "init", null);
exports.ModelAliasesConfigurationWidget = ModelAliasesConfigurationWidget = ModelAliasesConfigurationWidget_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ModelAliasesConfigurationWidget);
//# sourceMappingURL=model-aliases-configuration-widget.js.map