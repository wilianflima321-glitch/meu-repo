"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ModelAliasesConfigurationWidget_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelAliasesConfigurationWidget = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const inversify_1 = require("@theia/core/shared/inversify");
const react_widget_1 = require("@theia/core/lib/browser/widgets/react-widget");
const language_model_alias_1 = require("@theia/ai-core/lib/common/language-model-alias");
const language_model_1 = require("@theia/ai-core/lib/common/language-model");
const nls_1 = require("@theia/core/lib/common/nls");
const ai_configuration_service_1 = require("./ai-configuration-service");
const ai_core_1 = require("@theia/ai-core");
let ModelAliasesConfigurationWidget = class ModelAliasesConfigurationWidget extends react_widget_1.ReactWidget {
    constructor() {
        super(...arguments);
        this.aliases = [];
        this.languageModels = [];
        /**
         * Map from alias ID to a list of agent IDs that have a language model requirement for that alias.
         */
        this.matchingAgentIdsForAliasMap = new Map();
        /**
         * Map from alias ID to the resolved LanguageModel (what the alias currently evaluates to).
         */
        this.resolvedModelForAlias = new Map();
        this.handleAliasSelectedModelIdChange = (alias, event) => {
            const newModelId = event.target.value || undefined;
            const updatedAlias = {
                ...alias,
                selectedModelId: newModelId
            };
            this.languageModelAliasRegistry.ready.then(() => {
                this.languageModelAliasRegistry.addAlias(updatedAlias);
            });
        };
    }
    static { ModelAliasesConfigurationWidget_1 = this; }
    static { this.ID = 'ai-model-aliases-configuration-widget'; }
    static { this.LABEL = nls_1.nls.localize('theia/ai/core/modelAliasesConfiguration/label', 'Model Aliases'); }
    set languageModelAliasRegistry(v) { this._languageModelAliasRegistry = v; }
    get languageModelAliasRegistry() { if (!this._languageModelAliasRegistry) {
        throw new Error('ModelAliasesConfigurationWidget: languageModelAliasRegistry not injected');
    } return this._languageModelAliasRegistry; }
    set languageModelRegistry(v) { this._languageModelRegistry = v; }
    get languageModelRegistry() { if (!this._languageModelRegistry) {
        throw new Error('ModelAliasesConfigurationWidget: languageModelRegistry not injected');
    } return this._languageModelRegistry; }
    set aiConfigurationSelectionService(v) { this._aiConfigurationSelectionService = v; }
    get aiConfigurationSelectionService() { if (!this._aiConfigurationSelectionService) {
        throw new Error('ModelAliasesConfigurationWidget: aiConfigurationSelectionService not injected');
    } return this._aiConfigurationSelectionService; }
    set aiSettingsService(v) { this._aiSettingsService = v; }
    get aiSettingsService() { if (!this._aiSettingsService) {
        throw new Error('ModelAliasesConfigurationWidget: aiSettingsService not injected');
    } return this._aiSettingsService; }
    set agentService(v) { this._agentService = v; }
    get agentService() { if (!this._agentService) {
        throw new Error('ModelAliasesConfigurationWidget: agentService not injected');
    } return this._agentService; }
    init() {
        this.id = ModelAliasesConfigurationWidget_1.ID;
        this.title.label = ModelAliasesConfigurationWidget_1.LABEL;
        this.title.closable = false;
        // Helper: normalize listener-return values into a Disposable if possible.
        // Some listeners return a Disposable object, others return an unregister function,
        // and some may return nothing. This helper makes it safe to push into `this.toDispose`.
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
        const aliasesPromise = this.loadAliases();
        const languageModelsPromise = this.loadLanguageModels();
        const matchingAgentsPromise = this.loadMatchingAgentIdsForAllAliases();
        Promise.all([aliasesPromise, languageModelsPromise, matchingAgentsPromise]).then(() => this.update());
        this.languageModelAliasRegistry.ready.then(() => {
            const _d = this.languageModelAliasRegistry.onDidChange(async () => {
                await this.loadAliases();
                this.update();
            });
            const _dd = makeDisposable(_d);
            if (_dd) {
                this.toDispose.push(_dd);
            }
        });
        // Capture listener returns as 'any' and wrap them to ensure a Disposable-like object is pushed.
        const _r1 = this.languageModelRegistry.onChange(async () => {
            await this.loadAliases();
            await this.loadLanguageModels();
            this.update();
        });
        const _r2 = this.aiSettingsService.onDidChange(async () => {
            await this.loadMatchingAgentIdsForAllAliases();
            this.update();
        });
        const _r3 = this.aiConfigurationSelectionService.onDidAliasChange(() => this.update());
        const _rr1 = makeDisposable(_r1);
        if (_rr1) {
            this.toDispose.push(_rr1);
        }
        const _rr2 = makeDisposable(_r2);
        if (_rr2) {
            this.toDispose.push(_rr2);
        }
        const _rr3 = makeDisposable(_r3);
        if (_rr3) {
            this.toDispose.push(_rr3);
        }
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
                    if (requirementSetting?.languageModelRequirements?.find((e) => e.identifier === alias.id)) {
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
    render() {
        const selectedAliasId = this.aiConfigurationSelectionService.getSelectedAliasId();
        const selectedAlias = this.aliases.find(alias => alias.id === selectedAliasId);
        return ((0, jsx_runtime_1.jsxs)("div", { className: "model-alias-configuration-main", children: [(0, jsx_runtime_1.jsx)("div", { className: "model-alias-configuration-list preferences-tree-widget theia-TreeContainer ai-model-alias-list", children: (0, jsx_runtime_1.jsx)("ul", { children: this.aliases.map(alias => ((0, jsx_runtime_1.jsx)("li", { className: `theia-TreeNode theia-CompositeTreeNode${alias.id === selectedAliasId ? ' theia-mod-selected' : ''}`, onClick: () => this.aiConfigurationSelectionService.setSelectedAliasId(alias.id), children: (0, jsx_runtime_1.jsx)("span", { children: alias.id }) }, alias.id))) }) }), (0, jsx_runtime_1.jsx)("div", { className: "model-alias-configuration-panel preferences-editor-widget", children: selectedAlias ? this.renderAliasDetail(selectedAlias, this.languageModels) : ((0, jsx_runtime_1.jsx)("div", { children: nls_1.nls.localize('theia/ai/core/modelAliasesConfiguration/selectAlias', 'Please select a Model Alias.') })) })] }));
    }
    renderAliasDetail(alias, languageModels) {
        const availableModelIds = languageModels.map(m => m.id);
        const selectedModelId = alias.selectedModelId ?? '';
        const isInvalidModel = !!selectedModelId && !availableModelIds.includes(alias.selectedModelId ?? '');
        const agentIds = this.matchingAgentIdsForAliasMap.get(alias.id) || [];
        const agents = this.agentService.getAllAgents().filter(agent => agentIds.includes(agent.id));
        const resolvedModel = this.resolvedModelForAlias.get(alias.id);
        return ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { className: "settings-section-title settings-section-category-title ai-alias-detail-title", children: (0, jsx_runtime_1.jsx)("span", { children: alias.id }) }), alias.description && (0, jsx_runtime_1.jsx)("div", { className: "ai-alias-detail-description", children: alias.description }), (0, jsx_runtime_1.jsxs)("div", { className: "ai-alias-detail-selected-model", children: [(0, jsx_runtime_1.jsxs)("label", { children: [nls_1.nls.localize('theia/ai/core/modelAliasesConfiguration/selectedModelId', 'Selected Model'), ": "] }), (0, jsx_runtime_1.jsxs)("select", { className: `theia-select template-variant-selector ${isInvalidModel ? 'error' : ''}`, value: isInvalidModel ? 'invalid' : selectedModelId, onChange: event => this.handleAliasSelectedModelIdChange(alias, event), children: [isInvalidModel && ((0, jsx_runtime_1.jsx)("option", { value: "invalid", disabled: true, children: nls_1.nls.localize('theia/ai/core/modelAliasesConfiguration/unavailableModel', 'Selected model is no longer available') })), (0, jsx_runtime_1.jsx)("option", { value: "", className: 'ai-language-model-item-ready', children: nls_1.nls.localize('theia/ai/core/modelAliasesConfiguration/defaultList', '[Default list]') }), [...languageModels]
                                    .sort((a, b) => (a.name ?? a.id).localeCompare(b.name ?? b.id))
                                    .map(model => {
                                    const isNotReady = model.status.status !== 'ready';
                                    return ((0, jsx_runtime_1.jsxs)("option", { value: model.id, className: isNotReady ? 'ai-language-model-item-not-ready' : 'ai-language-model-item-ready', title: isNotReady && model.status.message ? model.status.message : undefined, children: [model.name ?? model.id, " ", isNotReady ? '✗' : '✓'] }, model.id));
                                })] })] }), alias.selectedModelId === undefined &&
                    (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { className: "ai-alias-detail-defaults", children: (0, jsx_runtime_1.jsx)("ol", { children: alias.defaultModelIds.map(modelId => {
                                        const model = this.languageModels.find(m => m.id === modelId);
                                        const isReady = model?.status.status === 'ready';
                                        return ((0, jsx_runtime_1.jsx)("li", { children: isReady ? ((0, jsx_runtime_1.jsxs)("span", { className: modelId === resolvedModel?.id ? 'ai-alias-priority-item-resolved' : 'ai-alias-priority-item-ready', children: [modelId, " ", (0, jsx_runtime_1.jsx)("span", { className: "ai-model-status-ready", title: "Ready", children: "\u2713" })] })) : ((0, jsx_runtime_1.jsxs)("span", { className: "ai-model-default-not-ready", children: [modelId, " ", (0, jsx_runtime_1.jsx)("span", { className: "ai-model-status-not-ready", title: "Not ready", children: "\u2717" })] })) }, modelId));
                                    }) }) }), (0, jsx_runtime_1.jsxs)("div", { className: "ai-alias-evaluates-to-container", children: [(0, jsx_runtime_1.jsxs)("label", { className: "ai-alias-evaluates-to-label", children: [nls_1.nls.localize('theia/ai/core/modelAliasesConfiguration/evaluatesTo', 'Evaluates to'), ":"] }), resolvedModel ? ((0, jsx_runtime_1.jsxs)("span", { className: "ai-alias-evaluates-to-value", children: [resolvedModel.name ?? resolvedModel.id, resolvedModel.status.status === 'ready' ? ((0, jsx_runtime_1.jsx)("span", { className: "ai-model-status-ready", title: "Ready", children: "\u2713" })) : ((0, jsx_runtime_1.jsx)("span", { className: "ai-model-status-not-ready", title: resolvedModel.status.message || 'Not ready', children: "\u2717" }))] })) : ((0, jsx_runtime_1.jsx)("span", { className: "ai-alias-evaluates-to-unresolved", children: nls_1.nls.localize('theia/ai/core/modelAliasesConfiguration/noResolvedModel', 'No model ready for this alias.') }))] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "ai-alias-detail-agents", children: [(0, jsx_runtime_1.jsxs)("label", { children: [nls_1.nls.localize('theia/ai/core/modelAliasesConfiguration/agents', 'Agents using this Alias'), ":"] }), (0, jsx_runtime_1.jsx)("ul", { children: agents.length > 0 ? (agents.map(agent => ((0, jsx_runtime_1.jsxs)("li", { children: [(0, jsx_runtime_1.jsx)("span", { children: agent.name }), agent.id !== agent.name && (0, jsx_runtime_1.jsxs)("span", { className: "ai-alias-agent-id", children: ["(", agent.id, ")"] })] }, agent.id)))) : ((0, jsx_runtime_1.jsx)("span", { children: nls_1.nls.localize('theia/ai/core/modelAliasesConfiguration/noAgents', 'No agents use this alias.') })) })] })] }));
    }
};
exports.ModelAliasesConfigurationWidget = ModelAliasesConfigurationWidget;
__decorate([
    (0, inversify_1.inject)(language_model_alias_1.LanguageModelAliasRegistry),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], ModelAliasesConfigurationWidget.prototype, "languageModelAliasRegistry", null);
__decorate([
    (0, inversify_1.inject)(language_model_1.LanguageModelRegistry),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], ModelAliasesConfigurationWidget.prototype, "languageModelRegistry", null);
__decorate([
    (0, inversify_1.inject)(ai_configuration_service_1.AIConfigurationSelectionService),
    __metadata("design:type", ai_configuration_service_1.AIConfigurationSelectionService),
    __metadata("design:paramtypes", [ai_configuration_service_1.AIConfigurationSelectionService])
], ModelAliasesConfigurationWidget.prototype, "aiConfigurationSelectionService", null);
__decorate([
    (0, inversify_1.inject)(ai_core_1.AISettingsService),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], ModelAliasesConfigurationWidget.prototype, "aiSettingsService", null);
__decorate([
    (0, inversify_1.inject)(ai_core_1.AgentService),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], ModelAliasesConfigurationWidget.prototype, "agentService", null);
__decorate([
    (0, inversify_1.postConstruct)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ModelAliasesConfigurationWidget.prototype, "init", null);
exports.ModelAliasesConfigurationWidget = ModelAliasesConfigurationWidget = ModelAliasesConfigurationWidget_1 = __decorate([
    (0, inversify_1.injectable)()
], ModelAliasesConfigurationWidget);
