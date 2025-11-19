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
var AIToolsConfigurationWidget_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIToolsConfigurationWidget = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
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
const browser_1 = require("@theia/core/lib/browser");
const inversify_1 = require("@theia/core/shared/inversify");
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
    constructor() {
        super(...arguments);
        // Mocked tool list and state
        this.tools = [];
        this.toolConfirmationModes = {};
        this.defaultState = chat_tool_preferences_1.ToolConfirmationMode.DISABLED;
        this.loading = true;
        this.handleToolConfirmationModeChange = async (tool, event) => {
            const newState = event.target.value;
            await this.updateToolConfirmationMode(tool, newState);
        };
        this.handleDefaultStateChange = async (event) => {
            const newState = event.target.value;
            await this.updateDefaultConfirmation(newState);
        };
    }
    static { AIToolsConfigurationWidget_1 = this; }
    static { this.ID = 'ai-tools-configuration-widget'; }
    static { this.LABEL = 'Tools'; }
    set confirmationManager(v) { this._confirmationManager = v; }
    get confirmationManager() { if (!this._confirmationManager) {
        throw new Error('AIToolsConfigurationWidget: confirmationManager not injected');
    } return this._confirmationManager; }
    set preferenceService(v) { this._preferenceService = v; }
    get preferenceService() { if (!this._preferenceService) {
        throw new Error('AIToolsConfigurationWidget: preferenceService not injected');
    } return this._preferenceService; }
    set toolInvocationRegistry(v) { this._toolInvocationRegistry = v; }
    get toolInvocationRegistry() { if (!this._toolInvocationRegistry) {
        throw new Error('AIToolsConfigurationWidget: toolInvocationRegistry not injected');
    } return this._toolInvocationRegistry; }
    init() {
        this.id = AIToolsConfigurationWidget_1.ID;
        this.title.label = AIToolsConfigurationWidget_1.LABEL;
        this.title.closable = false;
        this.loadData();
        this.update();
        const _pChanged = this.preferenceService.onPreferenceChanged(async (e) => {
            if (e.preferenceName === 'ai-features.chat.toolConfirmation') {
                this.defaultState = await this.loadDefaultConfirmation();
                this.toolConfirmationModes = await this.loadToolConfigurationModes();
                this.update();
            }
        });
        const _tChanged = this.toolInvocationRegistry.onDidChange(async () => {
            this.tools = await this.loadTools();
            this.update();
        });
        this.toDispose.push({ dispose: () => { try {
                if (typeof _pChanged === 'function') {
                    _pChanged();
                }
                else if (_pChanged && typeof _pChanged.dispose === 'function') {
                    (_pChanged.dispose)();
                }
            }
            catch { } } });
        this.toDispose.push({ dispose: () => { try {
                if (typeof _tChanged === 'function') {
                    _tChanged();
                }
                else if (_tChanged && typeof _tChanged.dispose === 'function') {
                    (_tChanged.dispose)();
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
            return (0, jsx_runtime_1.jsx)("div", { children: "Loading tools..." });
        }
        return (0, jsx_runtime_1.jsxs)("div", { className: 'ai-tools-configuration-container', children: [(0, jsx_runtime_1.jsxs)("div", { className: 'ai-tools-configuration-default-section ai-tools-default-row', children: [(0, jsx_runtime_1.jsx)("div", { className: 'ai-tools-configuration-default-label', children: "Default Tool Confirmation Mode:" }), (0, jsx_runtime_1.jsx)("select", { className: "ai-tools-configuration-default-select", value: this.defaultState, onChange: this.handleDefaultStateChange, children: TOOL_OPTIONS.map(opt => ((0, jsx_runtime_1.jsx)("option", { value: opt.value, children: opt.label }, opt.value))) }), (0, jsx_runtime_1.jsx)("button", { className: 'ai-tools-configuration-reset-btn ai-tools-reset', title: 'Reset all tools to default', onClick: () => this.resetAllToolsToDefault(), children: "Reset All" })] }), (0, jsx_runtime_1.jsxs)("div", { className: 'ai-tools-configuration-tools-section', children: [(0, jsx_runtime_1.jsx)("div", { className: 'ai-tools-configuration-tools-label', children: "Tools" }), (0, jsx_runtime_1.jsx)("ul", { className: 'ai-tools-configuration-tools-list', children: this.tools.map(tool => {
                                const state = this.toolConfirmationModes[tool] || this.defaultState;
                                const isDefault = state === this.defaultState;
                                const selectClass = 'ai-tools-configuration-tool-select';
                                return ((0, jsx_runtime_1.jsxs)("li", { className: 'ai-tools-configuration-tool-item ' +
                                        (isDefault ? 'default' : 'custom'), children: [(0, jsx_runtime_1.jsx)("span", { className: 'ai-tools-configuration-tool-name', children: tool }), (0, jsx_runtime_1.jsx)("select", { className: selectClass, value: state, onChange: e => this.handleToolConfirmationModeChange(tool, e), children: TOOL_OPTIONS.map(opt => ((0, jsx_runtime_1.jsx)("option", { value: opt.value, children: opt.label }, opt.value))) })] }, tool));
                            }) })] })] });
    }
};
exports.AIToolsConfigurationWidget = AIToolsConfigurationWidget;
__decorate([
    (0, inversify_1.inject)(chat_tool_preference_bindings_1.ToolConfirmationManager),
    __metadata("design:type", chat_tool_preference_bindings_1.ToolConfirmationManager)
], AIToolsConfigurationWidget.prototype, "_confirmationManager", void 0);
__decorate([
    (0, inversify_1.inject)(chat_tool_preference_bindings_1.ToolConfirmationManager),
    __metadata("design:type", chat_tool_preference_bindings_1.ToolConfirmationManager),
    __metadata("design:paramtypes", [chat_tool_preference_bindings_1.ToolConfirmationManager])
], AIToolsConfigurationWidget.prototype, "confirmationManager", null);
__decorate([
    (0, inversify_1.inject)(core_1.PreferenceService),
    __metadata("design:type", Object)
], AIToolsConfigurationWidget.prototype, "_preferenceService", void 0);
__decorate([
    (0, inversify_1.inject)(core_1.PreferenceService),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], AIToolsConfigurationWidget.prototype, "preferenceService", null);
__decorate([
    (0, inversify_1.inject)(ai_core_1.ToolInvocationRegistry),
    __metadata("design:type", Object)
], AIToolsConfigurationWidget.prototype, "_toolInvocationRegistry", void 0);
__decorate([
    (0, inversify_1.inject)(ai_core_1.ToolInvocationRegistry),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], AIToolsConfigurationWidget.prototype, "toolInvocationRegistry", null);
__decorate([
    (0, inversify_1.postConstruct)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AIToolsConfigurationWidget.prototype, "init", null);
exports.AIToolsConfigurationWidget = AIToolsConfigurationWidget = AIToolsConfigurationWidget_1 = __decorate([
    (0, inversify_1.injectable)()
], AIToolsConfigurationWidget);
