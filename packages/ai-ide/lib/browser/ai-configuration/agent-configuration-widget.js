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
var AIAgentConfigurationWidget_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIAgentConfigurationWidget = void 0;
const tslib_1 = require("tslib");
const common_1 = require("@theia/ai-core/lib/common");
const browser_1 = require("@theia/core/lib/browser");
const common_2 = require("@theia/core/lib/common");
const inversify_1 = require("@theia/core/shared/inversify");
const inversify_2 = require("inversify");
const React = require("@theia/core/shared/react");
const ai_configuration_service_1 = require("./ai-configuration-service");
const language_model_renderer_1 = require("./language-model-renderer");
const language_model_alias_1 = require("@theia/ai-core/lib/common/language-model-alias");
const variable_configuration_widget_1 = require("./variable-configuration-widget");
const core_1 = require("@theia/core");
const template_settings_renderer_1 = require("./template-settings-renderer");
;
let AIAgentConfigurationWidget = class AIAgentConfigurationWidget extends browser_1.ReactWidget {
    static { AIAgentConfigurationWidget_1 = this; }
    static ID = 'ai-agent-configuration-container-widget';
    static LABEL = core_1.nls.localize('theia/ai/core/agentConfiguration/label', 'Agents');
    agentService;
    languageModelRegistry;
    promptFragmentCustomizationService;
    languageModelAliasRegistry;
    aiSettingsService;
    aiConfigurationSelectionService;
    variableService;
    promptService;
    quickInputService;
    languageModels;
    languageModelAliases = [];
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
        // If it's a function (unregister callback), wrap it
        if (typeof d === 'function') {
            this.toDispose.push({ dispose: d });
            return;
        }
        // If it already has dispose(), push as-is
        if (typeof d.dispose === 'function') {
            this.toDispose.push(d);
            return;
        }
        // Last resort: if it has a 'dispose' property that's not a function, ignore
    }
    normalizeLocation(raw) {
        if (!raw) {
            return { uri: new common_2.URI(''), exists: false };
        }
        // raw may be a string (uri) or an object { uri, exists }
        if (typeof raw === 'string') {
            return { uri: new common_2.URI(raw), exists: false };
        }
        const uri = (raw.uri && raw.uri.path) ? raw.uri : new common_2.URI(String(raw.uri));
        const exists = !!raw.exists;
        return { uri, exists };
    }
    render() {
        return React.createElement("div", { className: 'ai-agent-configuration-main' },
            React.createElement("div", { className: 'configuration-agents-list theia-Tree theia-TreeContainer configuration-agents-sidebar' },
                React.createElement("ul", null, this.agentService.getAllAgents().map(agent => {
                    const isActive = this.aiConfigurationSelectionService.getActiveAgent()?.id === agent.id;
                    const className = `theia-TreeNode theia-CompositeTreeNode theia-ExpandableTreeNode${isActive ? ' theia-mod-selected' : ''}`;
                    return React.createElement("li", { key: agent.id, className: className, onClick: () => this.setActiveAgent(agent) }, this.renderAgentName(agent));
                })),
                React.createElement("div", { className: 'configuration-agents-add' },
                    React.createElement("button", { className: 'theia-button main', onClick: () => this.addCustomAgent() }, core_1.nls.localize('theia/ai/core/agentConfiguration/addCustomAgent', 'Add Custom Agent')))),
            React.createElement("div", { className: 'configuration-agent-panel preferences-editor-widget' }, this.renderAgentDetails()));
    }
    renderAgentName(agent) {
        const tagsSuffix = agent.tags?.length ? React.createElement("span", null, agent.tags.map(tag => React.createElement("span", { key: tag, className: 'agent-tag' }, tag))) : '';
        return React.createElement("span", null,
            agent.name,
            " ",
            tagsSuffix);
    }
    renderAgentDetails() {
        const agent = this.aiConfigurationSelectionService.getActiveAgent();
        if (!agent) {
            return React.createElement("div", null, core_1.nls.localize('theia/ai/core/agentConfiguration/selectAgentMessage', 'Please select an Agent first!'));
        }
        const enabled = this.agentService.isEnabled(agent.id);
        const parsedPromptParts = this.parsePromptFragmentsForVariableAndFunction(agent);
        const globalVariables = Array.from(new Set([...parsedPromptParts.globalVariables, ...agent.variables]));
        const functions = Array.from(new Set([...parsedPromptParts.functions, ...agent.functions]));
        return React.createElement("div", { key: agent.id, className: 'agent-details-column' },
            React.createElement("div", { className: 'settings-section-title settings-section-category-title agent-title' },
                this.renderAgentName(agent),
                React.createElement("pre", { className: 'agent-id-pre' },
                    "Id: ",
                    agent.id)),
            React.createElement("div", { className: 'agent-description' }, agent.description),
            React.createElement("div", { className: 'agent-enable-row' },
                React.createElement("label", null,
                    React.createElement("input", { type: "checkbox", checked: enabled, onChange: this.toggleAgentEnabled }),
                    core_1.nls.localize('theia/ai/core/agentConfiguration/enableAgent', 'Enable Agent'))),
            React.createElement("div", { className: "settings-section-subcategory-title ai-settings-section-subcategory-title" }, core_1.nls.localize('theia/ai/core/agentConfiguration/promptTemplates', 'Prompt Templates')),
            React.createElement("div", { className: "ai-templates" }, (() => {
                const prompts = agent.prompts;
                return prompts.length > 0 ? (prompts.map(prompt => (React.createElement("div", { key: agent.id + '.' + prompt.id },
                    React.createElement(template_settings_renderer_1.PromptVariantRenderer, { key: agent.id + '.' + prompt.id, agentId: agent.id, promptVariantSet: prompt, promptService: this.promptService }))))) : (React.createElement("div", null, core_1.nls.localize('theia/ai/core/agentConfiguration/noDefaultTemplate', 'No default template available')));
            })()),
            React.createElement("div", { className: 'ai-lm-requirements' },
                React.createElement(language_model_renderer_1.LanguageModelRenderer, { agent: agent, languageModels: this.languageModels, aiSettingsService: this.aiSettingsService, languageModelRegistry: this.languageModelRegistry, languageModelAliases: this.languageModelAliases })),
            React.createElement("div", null,
                React.createElement("span", null, "Used Global Variables:"),
                React.createElement("ul", { className: 'variable-references' },
                    React.createElement(AgentGlobalVariables, { variables: globalVariables, showVariableConfigurationTab: this.showVariableConfigurationTab.bind(this) }))),
            React.createElement("div", null,
                React.createElement("span", null, "Used agent-specific Variables:"),
                React.createElement("ul", { className: 'variable-references' },
                    React.createElement(AgentSpecificVariables, { promptVariables: parsedPromptParts.agentSpecificVariables, agent: agent }))),
            React.createElement("div", null,
                React.createElement("span", null, "Used Functions:"),
                React.createElement("ul", { className: 'function-references' },
                    React.createElement(AgentFunctions, { functions: functions }))));
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
            variableMatches.forEach(match => {
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
            this.promptFragmentCustomizationService.openCustomAgentYaml(first.uri.toString());
            return;
        }
        // Multiple locations - show quick picker
        const quickPick = this.quickInputService.createQuickPick();
        quickPick.title = 'Select Location for Custom Agents File';
        quickPick.placeholder = 'Choose where to create or open a custom agents file';
        quickPick.items = locations.map(locationRaw => {
            const location = this.normalizeLocation(locationRaw);
            return ({
                label: (location.uri && location.uri.path) ? location.uri.path.toString() : String(location.uri),
                description: location.exists ? 'Open existing file' : 'Create new file',
                location
            });
        });
        const acceptDisposable = quickPick.onDidAccept(async () => {
            const selectedItem = quickPick.selectedItems[0];
            const loc = selectedItem?.location;
            if (loc) {
                quickPick.dispose();
                const raw = loc.uri;
                // Normalize potential string URIs to a URI instance at runtime
                const uri = (raw && raw.path) ? raw : new common_2.URI(String(raw));
                this.promptFragmentCustomizationService.openCustomAgentYaml(uri.toString());
            }
        });
        this.pushDisposable(acceptDisposable);
        quickPick.show();
    }
    setActiveAgent(agent) {
        this.aiConfigurationSelectionService.setActiveAgent(agent);
        this.update();
    }
    toggleAgentEnabled = () => {
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
};
exports.AIAgentConfigurationWidget = AIAgentConfigurationWidget;
tslib_1.__decorate([
    (0, inversify_1.inject)(common_1.AgentService),
    tslib_1.__metadata("design:type", common_1.AgentService)
], AIAgentConfigurationWidget.prototype, "agentService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(common_1.LanguageModelRegistry),
    tslib_1.__metadata("design:type", common_1.FrontendLanguageModelRegistry)
], AIAgentConfigurationWidget.prototype, "languageModelRegistry", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(common_1.PromptFragmentCustomizationService),
    tslib_1.__metadata("design:type", common_1.PromptFragmentCustomizationService)
], AIAgentConfigurationWidget.prototype, "promptFragmentCustomizationService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(language_model_alias_1.LanguageModelAliasRegistry),
    tslib_1.__metadata("design:type", Object)
], AIAgentConfigurationWidget.prototype, "languageModelAliasRegistry", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(common_1.AISettingsService),
    tslib_1.__metadata("design:type", common_1.AISettingsService)
], AIAgentConfigurationWidget.prototype, "aiSettingsService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_configuration_service_1.AIConfigurationSelectionService),
    tslib_1.__metadata("design:type", ai_configuration_service_1.AIConfigurationSelectionService)
], AIAgentConfigurationWidget.prototype, "aiConfigurationSelectionService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(common_1.AIVariableService),
    tslib_1.__metadata("design:type", common_1.AIVariableService)
], AIAgentConfigurationWidget.prototype, "variableService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(common_1.PromptService),
    tslib_1.__metadata("design:type", common_1.PromptService)
], AIAgentConfigurationWidget.prototype, "promptService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.QuickInputService),
    tslib_1.__metadata("design:type", Object)
], AIAgentConfigurationWidget.prototype, "quickInputService", void 0);
tslib_1.__decorate([
    (0, inversify_2.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], AIAgentConfigurationWidget.prototype, "init", null);
exports.AIAgentConfigurationWidget = AIAgentConfigurationWidget = AIAgentConfigurationWidget_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], AIAgentConfigurationWidget);
const AgentGlobalVariables = ({ variables: globalVariables, showVariableConfigurationTab }) => {
    if (globalVariables.length === 0) {
        return React.createElement(React.Fragment, null, core_1.nls.localize('theia/ai/core/agentConfiguration/none', 'None'));
    }
    return React.createElement(React.Fragment, null, globalVariables.map(variableId => React.createElement("li", { key: variableId, className: 'theia-TreeNode theia-CompositeTreeNode theia-ExpandableTreeNode theia-mod-selected' },
        React.createElement("div", { key: variableId, onClick: () => { showVariableConfigurationTab(); }, className: 'variable-reference' },
            React.createElement("span", null, variableId),
            React.createElement("i", { className: (0, browser_1.codicon)('chevron-right') })))));
};
const AgentFunctions = ({ functions }) => {
    if (functions.length === 0) {
        return React.createElement(React.Fragment, null, core_1.nls.localize('theia/ai/core/agentConfiguration/none', 'None'));
    }
    return React.createElement(React.Fragment, null, functions.map(functionId => React.createElement("li", { key: functionId, className: 'variable-reference' },
        React.createElement("span", null, functionId))));
};
const AgentSpecificVariables = ({ promptVariables, agent }) => {
    const agentDefinedVariablesName = agent.agentSpecificVariables.map(v => v.name);
    const variables = Array.from(new Set([...promptVariables, ...agentDefinedVariablesName]));
    if (variables.length === 0) {
        return React.createElement(React.Fragment, null, core_1.nls.localize('theia/ai/core/agentConfiguration/none', 'None'));
    }
    return React.createElement(React.Fragment, null, variables.map(variableId => React.createElement(AgentSpecificVariable, { key: variableId, variableId: variableId, agent: agent, promptVariables: promptVariables })));
};
const AgentSpecificVariable = ({ variableId, agent, promptVariables }) => {
    const agentDefinedVariable = agent.agentSpecificVariables.find(v => v.name === variableId);
    const undeclared = agentDefinedVariable === undefined;
    const notUsed = !promptVariables.includes(variableId) && agentDefinedVariable?.usedInPrompt === true;
    return React.createElement("li", { key: variableId },
        React.createElement("div", null,
            React.createElement("span", null, core_1.nls.localize('theia/ai/core/agentConfiguration/name', 'Name:')),
            " ",
            React.createElement("span", null, variableId)),
        undeclared ? React.createElement("div", null,
            React.createElement("span", null, core_1.nls.localize('theia/ai/core/agentConfiguration/undeclared', 'Undeclared'))) :
            (React.createElement(React.Fragment, null,
                React.createElement("div", null,
                    React.createElement("span", null, core_1.nls.localize('theia/ai/core/agentConfiguration/description', 'Description:')),
                    " ",
                    React.createElement("span", null, agentDefinedVariable.description)),
                notUsed && React.createElement("div", null, core_1.nls.localize('theia/ai/core/agentConfiguration/notUsedInPrompt', 'Not used in prompt')))),
        React.createElement("hr", null));
};
//# sourceMappingURL=agent-configuration-widget.js.map