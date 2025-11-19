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
var AIToolsConfigurationWidget_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIToolsConfigurationWidget = void 0;
const tslib_1 = require("tslib");
const browser_1 = require("@theia/core/lib/browser");
const inversify_1 = require("@theia/core/shared/inversify");
const React = require("@theia/core/shared/react");
const ai_core_1 = require("@theia/ai-core");
const core_1 = require("@theia/core");
const chat_tool_preference_bindings_1 = require("@theia/ai-chat/lib/browser/chat-tool-preference-bindings");
const chat_tool_preferences_1 = require("@theia/ai-chat/lib/common/chat-tool-preferences");
const TOOL_OPTIONS = [
    { value: chat_tool_preferences_1.ToolConfirmationMode.DISABLED, label: 'Disabled', icon: 'close' },
    { value: chat_tool_preferences_1.ToolConfirmationMode.CONFIRM, label: 'Confirm', icon: 'question' },
    { value: chat_tool_preferences_1.ToolConfirmationMode.ALWAYS_ALLOW, label: 'Always Allow', icon: 'thumbsup' },
];
let AIToolsConfigurationWidget = class AIToolsConfigurationWidget extends browser_1.ReactWidget {
    static { AIToolsConfigurationWidget_1 = this; }
    static ID = 'ai-tools-configuration-widget';
    static LABEL = 'Tools';
    confirmationManager;
    preferenceService;
    toolInvocationRegistry;
    // Mocked tool list and state
    tools = [];
    toolConfirmationModes = {};
    defaultState;
    loading = true;
    init() {
        this.id = AIToolsConfigurationWidget_1.ID;
        this.title.label = AIToolsConfigurationWidget_1.LABEL;
        this.title.closable = false;
        this.loadData();
        this.update();
        const pChanged = this.preferenceService.onPreferenceChanged(async (e) => {
            if (e.preferenceName === 'ai-features.chat.toolConfirmation') {
                this.defaultState = await this.loadDefaultConfirmation();
                this.toolConfirmationModes = await this.loadToolConfigurationModes();
                this.update();
            }
        });
        const tChanged = this.toolInvocationRegistry.onDidChange(async () => {
            this.tools = await this.loadTools();
            this.update();
        });
        this.toDispose.push({ dispose: () => { try {
                if (typeof pChanged === 'function') {
                    pChanged();
                }
                else if (pChanged && typeof pChanged.dispose === 'function') {
                    pChanged.dispose();
                }
            }
            catch { } } });
        this.toDispose.push({ dispose: () => { try {
                if (typeof tChanged === 'function') {
                    tChanged();
                }
                else if (tChanged && typeof tChanged.dispose === 'function') {
                    tChanged.dispose();
                }
            }
            catch { } } });
    }
    async loadData() {
        // Replace with real service calls
        this.tools = await this.loadTools();
        this.defaultState = await this.loadDefaultConfirmation();
        this.toolConfirmationModes = await this.loadToolConfigurationModes();
        this.loading = false;
        this.update();
    }
    async loadTools() {
        return this.toolInvocationRegistry.getAllFunctions().map(func => func.name);
    }
    async loadDefaultConfirmation() {
        return this.confirmationManager.getConfirmationMode('*', 'doesNotMatter');
    }
    async loadToolConfigurationModes() {
        return this.confirmationManager.getAllConfirmationSettings();
    }
    async updateToolConfirmationMode(tool, state) {
        await this.confirmationManager.setConfirmationMode(tool, state);
    }
    async updateDefaultConfirmation(state) {
        await this.confirmationManager.setConfirmationMode('*', state);
    }
    handleToolConfirmationModeChange = async (tool, event) => {
        const newState = event.target.value;
        await this.updateToolConfirmationMode(tool, newState);
    };
    handleDefaultStateChange = async (event) => {
        const newState = event.target.value;
        await this.updateDefaultConfirmation(newState);
    };
    async resetAllToolsToDefault() {
        const dialog = new browser_1.ConfirmDialog({
            title: 'Reset All Tool Confirmation Modes',
            msg: 'Are you sure you want to reset all tool confirmation modes to the default? This will remove all custom settings.',
            ok: 'Reset All',
            cancel: 'Cancel'
        });
        const shouldReset = await dialog.open();
        if (shouldReset) {
            this.confirmationManager.resetAllConfirmationModeSettings();
        }
    }
    render() {
        if (this.loading) {
            return React.createElement("div", null, "Loading tools...");
        }
        return React.createElement("div", { className: 'ai-tools-configuration-container' },
            React.createElement("div", { className: 'ai-tools-configuration-default-section ai-tools-default-row' },
                React.createElement("div", { className: 'ai-tools-configuration-default-label' }, "Default Tool Confirmation Mode:"),
                React.createElement("select", { className: "ai-tools-configuration-default-select", value: this.defaultState, onChange: this.handleDefaultStateChange }, TOOL_OPTIONS.map(opt => (React.createElement("option", { key: opt.value, value: opt.value }, opt.label)))),
                React.createElement("button", { className: 'ai-tools-configuration-reset-btn ai-tools-reset', title: 'Reset all tools to default', onClick: () => this.resetAllToolsToDefault() }, "Reset All")),
            React.createElement("div", { className: 'ai-tools-configuration-tools-section' },
                React.createElement("div", { className: 'ai-tools-configuration-tools-label' }, "Tools"),
                React.createElement("ul", { className: 'ai-tools-configuration-tools-list' }, this.tools.map(tool => {
                    const state = this.toolConfirmationModes[tool] || this.defaultState;
                    const isDefault = state === this.defaultState;
                    const selectClass = 'ai-tools-configuration-tool-select';
                    return (React.createElement("li", { key: tool, className: 'ai-tools-configuration-tool-item ' +
                            (isDefault ? 'default' : 'custom') },
                        React.createElement("span", { className: 'ai-tools-configuration-tool-name' }, tool),
                        React.createElement("select", { className: selectClass, value: state, onChange: e => this.handleToolConfirmationModeChange(tool, e) }, TOOL_OPTIONS.map(opt => (React.createElement("option", { key: opt.value, value: opt.value }, opt.label))))));
                }))));
    }
};
exports.AIToolsConfigurationWidget = AIToolsConfigurationWidget;
tslib_1.__decorate([
    (0, inversify_1.inject)(chat_tool_preference_bindings_1.ToolConfirmationManager),
    tslib_1.__metadata("design:type", chat_tool_preference_bindings_1.ToolConfirmationManager)
], AIToolsConfigurationWidget.prototype, "confirmationManager", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.PreferenceService),
    tslib_1.__metadata("design:type", Object)
], AIToolsConfigurationWidget.prototype, "preferenceService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_core_1.ToolInvocationRegistry),
    tslib_1.__metadata("design:type", ai_core_1.ToolInvocationRegistry)
], AIToolsConfigurationWidget.prototype, "toolInvocationRegistry", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], AIToolsConfigurationWidget.prototype, "init", null);
exports.AIToolsConfigurationWidget = AIToolsConfigurationWidget = AIToolsConfigurationWidget_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], AIToolsConfigurationWidget);
//# sourceMappingURL=tools-configuration-widget.js.map