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
var AIAgentConfigurationWidget_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIAgentConfigurationWidget = void 0;
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
const common_2 = require("@theia/core/lib/common");
const inversify_1 = require("@theia/core/shared/inversify");
const ai_configuration_service_1 = require("./ai-configuration-service");
const language_model_renderer_1 = require("./language-model-renderer");
const language_model_alias_1 = require("@theia/ai-core/lib/common/language-model-alias");
const variable_configuration_widget_1 = require("./variable-configuration-widget");
const core_1 = require("@theia/core");
const template_settings_renderer_1 = require("./template-settings-renderer");
;
let AIAgentConfigurationWidget = class AIAgentConfigurationWidget extends browser_1.ReactWidget {
    constructor() {
        super(...arguments);
        this.languageModelAliases = [];
        this.toggleAgentEnabled = () => {
            const agent = this.aiConfigurationSelectionService.getActiveAgent();
            if (!agent) {
                return false;
            }
            const enabled = this.agentService.isEnabled(agent.id);
            if (enabled) {
                this.agentService.disableAgent(agent.id);
            }
            else {
                this.agentService.enableAgent(agent.id);
            }
            this.update();
        };
    }
    static { AIAgentConfigurationWidget_1 = this; }
    static { this.ID = 'ai-agent-configuration-container-widget'; }
    static { this.LABEL = core_1.nls.localize('theia/ai/core/agentConfiguration/label', 'Agents'); }
    set agentService(v) { this._agentService = v; }
    get agentService() { if (!this._agentService) {
        throw new Error('AIAgentConfigurationWidget: agentService not injected');
    } return this._agentService; }
    set languageModelRegistry(v) { this._languageModelRegistry = v; }
    get languageModelRegistry() { if (!this._languageModelRegistry) {
        throw new Error('AIAgentConfigurationWidget: languageModelRegistry not injected');
    } return this._languageModelRegistry; }
    set promptFragmentCustomizationService(v) { this._promptFragmentCustomizationService = v; }
    get promptFragmentCustomizationService() { if (!this._promptFragmentCustomizationService) {
        throw new Error('AIAgentConfigurationWidget: promptFragmentCustomizationService not injected');
    } return this._promptFragmentCustomizationService; }
    set languageModelAliasRegistry(v) { this._languageModelAliasRegistry = v; }
    get languageModelAliasRegistry() { if (!this._languageModelAliasRegistry) {
        throw new Error('AIAgentConfigurationWidget: languageModelAliasRegistry not injected');
    } return this._languageModelAliasRegistry; }
    set aiSettingsService(v) { this._aiSettingsService = v; }
    get aiSettingsService() { if (!this._aiSettingsService) {
        throw new Error('AIAgentConfigurationWidget: aiSettingsService not injected');
    } return this._aiSettingsService; }
    set aiConfigurationSelectionService(v) { this._aiConfigurationSelectionService = v; }
    get aiConfigurationSelectionService() { if (!this._aiConfigurationSelectionService) {
        throw new Error('AIAgentConfigurationWidget: aiConfigurationSelectionService not injected');
    } return this._aiConfigurationSelectionService; }
    set variableService(v) { this._variableService = v; }
    get variableService() { if (!this._variableService) {
        throw new Error('AIAgentConfigurationWidget: variableService not injected');
    } return this._variableService; }
    set promptService(v) { this._promptService = v; }
    get promptService() { if (!this._promptService) {
        throw new Error('AIAgentConfigurationWidget: promptService not injected');
    } return this._promptService; }
    set quickInputService(v) { this._quickInputService = v; }
    get quickInputService() { if (!this._quickInputService) {
        throw new Error('AIAgentConfigurationWidget: quickInputService not injected');
    } return this._quickInputService; }
    init() {
        this.id = AIAgentConfigurationWidget_1.ID;
        this.title.label = AIAgentConfigurationWidget_1.LABEL;
        this.title.closable = false;
        this.languageModelRegistry.getLanguageModels().then(models => {
            this.languageModels = models ?? [];
            this.update();
        });
        this.languageModelAliasRegistry.ready.then(() => {
            this.languageModelAliases = this.languageModelAliasRegistry.getAliases();
            const d = this.languageModelAliasRegistry.onDidChange(() => {
                this.languageModelAliases = this.languageModelAliasRegistry.getAliases();
                this.update();
            });
            this.pushDisposable(d);
        });
        const d2 = this.languageModelRegistry.onChange((payload) => {
            const models = payload.models;
            this.languageModelAliases = this.languageModelAliasRegistry.getAliases();
            this.languageModels = models;
            this.update();
        });
        this.pushDisposable(d2);
        const d3 = this.promptService.onPromptsChange(() => this.update());
        this.pushDisposable(d3);
        this.aiSettingsService.onDidChange(() => this.update());
        this.aiConfigurationSelectionService.onDidAgentChange(() => this.update());
        this.agentService.onDidChangeAgents(() => this.update());
        this.update();
    }
    /**
     * Normalize and push a disposable-like value into this.toDispose.
     * Accepts functions, objects with a dispose() method, or disposables.
     */
    pushDisposable(d) {
        if (!d) {
            return;
        }
        // If it's a function (unregister callback), wrap it into a safe Disposable
        if (typeof d === 'function') {
            const disposeFn = d;
            this.toDispose.push({ dispose: () => { try {
                    disposeFn();
                }
                catch { /* swallow */ } } });
            return;
        }
        // If it already has dispose(), push as-is
        if (d && typeof d.dispose === 'function') {
            this.toDispose.push(d);
            return;
        }
        // Last resort: if it has a 'dispose' property that's not a function, ignore
    }
    /**
     * Safely format a runtime URI-like object into a displayable label.
     * Accepts real URI instances or plain strings/objects that have a `path` property.
     */
    formatUriLabel(uriRaw) {
        if (!uriRaw) {
            return '';
        }
        if (typeof uriRaw === 'object') {
            const asObj = uriRaw;
            const p = asObj.path;
            if (p) {
                // Prefer a runtime toString if present, otherwise fallback to String()
                if (typeof p.toString === 'function') {
                    return p.toString();
                }
                return String(p);
            }
        }
        return String(uriRaw);
    }
    normalizeLocation(raw) {
        if (!raw) {
            return { uri: new common_2.URI(''), exists: false };
        }
        // raw may be a string (uri) or an object { uri, exists }
        if (typeof raw === 'string') {
            return { uri: new common_2.URI(raw), exists: false };
        }
        const rawObj = raw;
        const uriCandidate = rawObj.uri;
        let uri;
        if (uriCandidate && typeof uriCandidate === 'object' && 'path' in uriCandidate && uriCandidate.path) {
            uri = uriCandidate;
        }
        else {
            uri = new common_2.URI(String(uriCandidate));
        }
        const exists = !!rawObj.exists;
        return { uri, exists };
    }
    render() {
        return (0, jsx_runtime_1.jsxs)("div", { className: 'ai-agent-configuration-main', children: [(0, jsx_runtime_1.jsxs)("div", { className: 'configuration-agents-list theia-Tree theia-TreeContainer configuration-agents-sidebar', children: [(0, jsx_runtime_1.jsx)("ul", { children: this.agentService.getAllAgents().map(agent => {
                                const isActive = this.aiConfigurationSelectionService.getActiveAgent()?.id === agent.id;
                                const className = `theia-TreeNode theia-CompositeTreeNode theia-ExpandableTreeNode${isActive ? ' theia-mod-selected' : ''}`;
                                return (0, jsx_runtime_1.jsx)("li", { className: className, onClick: () => this.setActiveAgent(agent), children: this.renderAgentName(agent) }, agent.id);
                            }) }), (0, jsx_runtime_1.jsx)("div", { className: 'configuration-agents-add', children: (0, jsx_runtime_1.jsx)("button", { className: 'theia-button main', onClick: () => this.addCustomAgent(), children: core_1.nls.localize('theia/ai/core/agentConfiguration/addCustomAgent', 'Add Custom Agent') }) })] }), (0, jsx_runtime_1.jsx)("div", { className: 'configuration-agent-panel preferences-editor-widget', children: this.renderAgentDetails() })] });
    }
    renderAgentName(agent) {
        const tagsSuffix = agent.tags?.length ? (0, jsx_runtime_1.jsx)("span", { children: agent.tags.map(tag => (0, jsx_runtime_1.jsx)("span", { className: 'agent-tag', children: tag }, tag)) }) : '';
        return (0, jsx_runtime_1.jsxs)("span", { children: [agent.name, " ", tagsSuffix] });
    }
    renderAgentDetails() {
        const agent = this.aiConfigurationSelectionService.getActiveAgent();
        if (!agent) {
            return (0, jsx_runtime_1.jsx)("div", { children: core_1.nls.localize('theia/ai/core/agentConfiguration/selectAgentMessage', 'Please select an Agent first!') });
        }
        const enabled = this.agentService.isEnabled(agent.id);
        const parsedPromptParts = this.parsePromptFragmentsForVariableAndFunction(agent);
        const globalVariables = Array.from(new Set([...parsedPromptParts.globalVariables, ...agent.variables]));
        const functions = Array.from(new Set([...parsedPromptParts.functions, ...agent.functions]));
        return (0, jsx_runtime_1.jsxs)("div", { className: 'agent-details-column', children: [(0, jsx_runtime_1.jsxs)("div", { className: 'settings-section-title settings-section-category-title agent-title', children: [this.renderAgentName(agent), (0, jsx_runtime_1.jsxs)("pre", { className: 'agent-id-pre', children: ["Id: ", agent.id] })] }), (0, jsx_runtime_1.jsx)("div", { className: 'agent-description', children: agent.description }), (0, jsx_runtime_1.jsx)("div", { className: 'agent-enable-row', children: (0, jsx_runtime_1.jsxs)("label", { children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: enabled, onChange: this.toggleAgentEnabled }), core_1.nls.localize('theia/ai/core/agentConfiguration/enableAgent', 'Enable Agent')] }) }), (0, jsx_runtime_1.jsx)("div", { className: "settings-section-subcategory-title ai-settings-section-subcategory-title", children: core_1.nls.localize('theia/ai/core/agentConfiguration/promptTemplates', 'Prompt Templates') }), (0, jsx_runtime_1.jsx)("div", { className: "ai-templates", children: (() => {
                        const prompts = agent.prompts;
                        return prompts.length > 0 ? (prompts.map(prompt => ((0, jsx_runtime_1.jsx)("div", { children: (0, jsx_runtime_1.jsx)(template_settings_renderer_1.PromptVariantRenderer, { agentId: agent.id, promptVariantSet: prompt, promptService: this.promptService }, agent.id + '.' + prompt.id) }, agent.id + '.' + prompt.id)))) : ((0, jsx_runtime_1.jsx)("div", { children: core_1.nls.localize('theia/ai/core/agentConfiguration/noDefaultTemplate', 'No default template available') }));
                    })() }), (0, jsx_runtime_1.jsx)("div", { className: 'ai-lm-requirements', children: (0, jsx_runtime_1.jsx)(language_model_renderer_1.LanguageModelRenderer, { agent: agent, languageModels: this.languageModels, aiSettingsService: this.aiSettingsService, languageModelRegistry: this.languageModelRegistry, languageModelAliases: this.languageModelAliases }) }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { children: "Used Global Variables:" }), (0, jsx_runtime_1.jsx)("ul", { className: 'variable-references', children: (0, jsx_runtime_1.jsx)(AgentGlobalVariables, { variables: globalVariables, showVariableConfigurationTab: this.showVariableConfigurationTab.bind(this) }) })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { children: "Used agent-specific Variables:" }), (0, jsx_runtime_1.jsx)("ul", { className: 'variable-references', children: (0, jsx_runtime_1.jsx)(AgentSpecificVariables, { promptVariables: parsedPromptParts.agentSpecificVariables, agent: agent }) })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { children: "Used Functions:" }), (0, jsx_runtime_1.jsx)("ul", { className: 'function-references', children: (0, jsx_runtime_1.jsx)(AgentFunctions, { functions: functions }) })] })] }, agent.id);
    }
    parsePromptFragmentsForVariableAndFunction(agent) {
        const prompts = agent.prompts;
        const promptFragments = [];
        prompts.forEach(prompt => {
            promptFragments.push(prompt.defaultVariant);
            if (prompt.variants) {
                promptFragments.push(...prompt.variants);
            }
        });
        const result = { functions: [], globalVariables: [], agentSpecificVariables: [] };
        promptFragments.forEach(template => {
            const storedPrompt = this.promptService.getPromptFragment(template.id);
            const prompt = storedPrompt?.template ?? template.template;
            const variableMatches = (0, common_1.matchVariablesRegEx)(prompt);
            variableMatches.forEach((match) => {
                const variableId = match[1];
                // if the variable is part of the variable service and not part of the agent specific variables then it is a global variable
                if (this.variableService.hasVariable(variableId) &&
                    agent.agentSpecificVariables.find(v => v.name === variableId) === undefined) {
                    result.globalVariables.push(variableId);
                }
                else {
                    result.agentSpecificVariables.push(variableId);
                }
            });
            const functionMatches = [...prompt.matchAll(common_1.PROMPT_FUNCTION_REGEX)];
            functionMatches.forEach(match => {
                const functionId = match[1];
                result.functions.push(functionId);
            });
        });
        return result;
    }
    showVariableConfigurationTab() {
        this.aiConfigurationSelectionService.selectConfigurationTab(variable_configuration_widget_1.AIVariableConfigurationWidget.ID);
    }
    async addCustomAgent() {
        const locations = await this.promptFragmentCustomizationService.getCustomAgentsLocations();
        // If only one location is available, use the direct approach
        if (locations.length === 1) {
            const first = this.normalizeLocation(locations[0]);
            this.promptFragmentCustomizationService.openCustomAgentYaml(first.uri);
            return;
        }
        // Multiple locations - show quick picker
        const quickPick = this.quickInputService.createQuickPick();
        quickPick.title = 'Select Location for Custom Agents File';
        quickPick.placeholder = 'Choose where to create or open a custom agents file';
        quickPick.items = locations.map(locationRaw => {
            const location = this.normalizeLocation(locationRaw);
            return ({
                label: this.formatUriLabel(location.uri),
                description: location.exists ? 'Open existing file' : 'Create new file',
                location
            });
        });
        const acceptDisposable = quickPick.onDidAccept(async () => {
            const selectedItem = quickPick.selectedItems[0];
            const loc = (selectedItem && typeof selectedItem === 'object' && 'location' in selectedItem) ? selectedItem.location : undefined;
            if (loc) {
                quickPick.dispose();
                const raw = loc.uri;
                // Normalize potential string URIs to a URI instance at runtime
                let uri;
                if (raw && typeof raw === 'object' && 'path' in raw && raw.path) {
                    uri = raw;
                }
                else {
                    uri = new common_2.URI(String(raw));
                }
                this.promptFragmentCustomizationService.openCustomAgentYaml(uri);
            }
        });
        this.pushDisposable(acceptDisposable);
        quickPick.show();
    }
    setActiveAgent(agent) {
        this.aiConfigurationSelectionService.setActiveAgent(agent);
        this.update();
    }
};
exports.AIAgentConfigurationWidget = AIAgentConfigurationWidget;
__decorate([
    (0, inversify_1.inject)(common_1.AgentService),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], AIAgentConfigurationWidget.prototype, "agentService", null);
__decorate([
    (0, inversify_1.inject)(common_1.LanguageModelRegistry),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], AIAgentConfigurationWidget.prototype, "languageModelRegistry", null);
__decorate([
    (0, inversify_1.inject)(common_1.PromptFragmentCustomizationService),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], AIAgentConfigurationWidget.prototype, "promptFragmentCustomizationService", null);
__decorate([
    (0, inversify_1.inject)(language_model_alias_1.LanguageModelAliasRegistry),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], AIAgentConfigurationWidget.prototype, "languageModelAliasRegistry", null);
__decorate([
    (0, inversify_1.inject)(common_1.AISettingsService),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], AIAgentConfigurationWidget.prototype, "aiSettingsService", null);
__decorate([
    (0, inversify_1.inject)(ai_configuration_service_1.AIConfigurationSelectionService),
    __metadata("design:type", ai_configuration_service_1.AIConfigurationSelectionService),
    __metadata("design:paramtypes", [ai_configuration_service_1.AIConfigurationSelectionService])
], AIAgentConfigurationWidget.prototype, "aiConfigurationSelectionService", null);
__decorate([
    (0, inversify_1.inject)(common_1.AIVariableService),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], AIAgentConfigurationWidget.prototype, "variableService", null);
__decorate([
    (0, inversify_1.inject)(common_1.PromptService),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], AIAgentConfigurationWidget.prototype, "promptService", null);
__decorate([
    (0, inversify_1.inject)(browser_1.QuickInputService),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], AIAgentConfigurationWidget.prototype, "quickInputService", null);
__decorate([
    (0, inversify_1.postConstruct)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AIAgentConfigurationWidget.prototype, "init", null);
exports.AIAgentConfigurationWidget = AIAgentConfigurationWidget = AIAgentConfigurationWidget_1 = __decorate([
    (0, inversify_1.injectable)()
], AIAgentConfigurationWidget);
const AgentGlobalVariables = ({ variables: globalVariables, showVariableConfigurationTab }) => {
    if (globalVariables.length === 0) {
        return (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: core_1.nls.localize('theia/ai/core/agentConfiguration/none', 'None') });
    }
    return (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: globalVariables.map(variableId => (0, jsx_runtime_1.jsx)("li", { className: 'theia-TreeNode theia-CompositeTreeNode theia-ExpandableTreeNode theia-mod-selected', children: (0, jsx_runtime_1.jsxs)("div", { onClick: () => { showVariableConfigurationTab(); }, className: 'variable-reference', children: [(0, jsx_runtime_1.jsx)("span", { children: variableId }), (0, jsx_runtime_1.jsx)("i", { className: (0, browser_1.codicon)('chevron-right') })] }, variableId) }, variableId)) });
};
const AgentFunctions = ({ functions }) => {
    if (functions.length === 0) {
        return (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: core_1.nls.localize('theia/ai/core/agentConfiguration/none', 'None') });
    }
    return (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: functions.map(functionId => (0, jsx_runtime_1.jsx)("li", { className: 'variable-reference', children: (0, jsx_runtime_1.jsx)("span", { children: functionId }) }, functionId)) });
};
const AgentSpecificVariables = ({ promptVariables, agent }) => {
    const agentDefinedVariablesName = agent.agentSpecificVariables.map(v => v.name);
    const variables = Array.from(new Set([...promptVariables, ...agentDefinedVariablesName]));
    if (variables.length === 0) {
        return (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: core_1.nls.localize('theia/ai/core/agentConfiguration/none', 'None') });
    }
    return (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: variables.map(variableId => (0, jsx_runtime_1.jsx)(AgentSpecificVariable, { variableId: variableId, agent: agent, promptVariables: promptVariables }, variableId)) });
};
const AgentSpecificVariable = ({ variableId, agent, promptVariables }) => {
    const agentDefinedVariable = agent.agentSpecificVariables.find(v => v.name === variableId);
    const undeclared = agentDefinedVariable === undefined;
    const notUsed = !promptVariables.includes(variableId) && agentDefinedVariable?.usedInPrompt === true;
    return (0, jsx_runtime_1.jsxs)("li", { children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { children: core_1.nls.localize('theia/ai/core/agentConfiguration/name', 'Name:') }), " ", (0, jsx_runtime_1.jsx)("span", { children: variableId })] }), undeclared ? (0, jsx_runtime_1.jsx)("div", { children: (0, jsx_runtime_1.jsx)("span", { children: core_1.nls.localize('theia/ai/core/agentConfiguration/undeclared', 'Undeclared') }) }) :
                ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { children: core_1.nls.localize('theia/ai/core/agentConfiguration/description', 'Description:') }), " ", (0, jsx_runtime_1.jsx)("span", { children: agentDefinedVariable.description })] }), notUsed && (0, jsx_runtime_1.jsx)("div", { children: core_1.nls.localize('theia/ai/core/agentConfiguration/notUsedInPrompt', 'Not used in prompt') })] })), (0, jsx_runtime_1.jsx)("hr", {})] }, variableId);
};
