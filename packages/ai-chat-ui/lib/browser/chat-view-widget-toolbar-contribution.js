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
exports.ChatViewWidgetToolbarContribution = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const ai_chat_ui_contribution_1 = require("./ai-chat-ui-contribution");
const core_1 = require("@theia/core");
const chat_view_commands_1 = require("./chat-view-commands");
const command_1 = require("@theia/core/lib/common/command");
const session_settings_dialog_1 = require("./session-settings-dialog");
const monaco_editor_provider_1 = require("@theia/monaco/lib/browser/monaco-editor-provider");
const chat_view_widget_1 = require("./chat-view-widget");
const browser_1 = require("@theia/ai-core/lib/browser");
let ChatViewWidgetToolbarContribution = class ChatViewWidgetToolbarContribution {
    constructor() {
        this.onChatWidgetStateChangedEmitter = new core_1.Emitter();
        this.onChatWidgetStateChanged = this.onChatWidgetStateChangedEmitter.event;
        this.sessionSettingsURI = new core_1.URI('chat-view:/settings.json');
    }
    init() {
        this.resources.add(this.sessionSettingsURI, '{}');
        this.chatContribution.widget.then(widget => {
            widget.onStateChanged(() => this.onChatWidgetStateChangedEmitter.fire());
        });
        this.commandRegistry.registerCommand(chat_view_commands_1.ChatCommands.EDIT_SESSION_SETTINGS, {
            execute: () => this.openJsonDataDialog(),
            isEnabled: widget => this.activationService.isActive && widget instanceof chat_view_widget_1.ChatViewWidget,
            isVisible: widget => this.activationService.isActive && widget instanceof chat_view_widget_1.ChatViewWidget
        });
    }
    registerToolbarItems(registry) {
        registry.registerItem({
            id: chat_view_commands_1.ChatCommands.SCROLL_LOCK_WIDGET.id,
            command: chat_view_commands_1.ChatCommands.SCROLL_LOCK_WIDGET.id,
            tooltip: core_1.nls.localizeByDefault('Turn Auto Scrolling Off'),
            onDidChange: this.onChatWidgetStateChanged,
            priority: 2,
            when: browser_1.ENABLE_AI_CONTEXT_KEY
        });
        registry.registerItem({
            id: chat_view_commands_1.ChatCommands.SCROLL_UNLOCK_WIDGET.id,
            command: chat_view_commands_1.ChatCommands.SCROLL_UNLOCK_WIDGET.id,
            tooltip: core_1.nls.localizeByDefault('Turn Auto Scrolling On'),
            onDidChange: this.onChatWidgetStateChanged,
            priority: 2,
            when: browser_1.ENABLE_AI_CONTEXT_KEY
        });
        registry.registerItem({
            id: chat_view_commands_1.ChatCommands.EDIT_SESSION_SETTINGS.id,
            command: chat_view_commands_1.ChatCommands.EDIT_SESSION_SETTINGS.id,
            tooltip: core_1.nls.localize('theia/ai/session-settings-dialog/tooltip', 'Set Session Settings'),
            priority: 3,
            when: browser_1.ENABLE_AI_CONTEXT_KEY
        });
    }
    async openJsonDataDialog() {
        const widget = await this.chatContribution.widget;
        if (!widget) {
            return;
        }
        const dialog = new session_settings_dialog_1.SessionSettingsDialog(this.editorProvider, this.resources, this.sessionSettingsURI, {
            initialSettings: widget.getSettings()
        });
        const result = await dialog.open();
        if (result) {
            widget.setSettings(result);
        }
    }
};
exports.ChatViewWidgetToolbarContribution = ChatViewWidgetToolbarContribution;
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_chat_ui_contribution_1.AIChatContribution),
    tslib_1.__metadata("design:type", ai_chat_ui_contribution_1.AIChatContribution)
], ChatViewWidgetToolbarContribution.prototype, "chatContribution", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(command_1.CommandRegistry),
    tslib_1.__metadata("design:type", command_1.CommandRegistry)
], ChatViewWidgetToolbarContribution.prototype, "commandRegistry", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(monaco_editor_provider_1.MonacoEditorProvider),
    tslib_1.__metadata("design:type", monaco_editor_provider_1.MonacoEditorProvider)
], ChatViewWidgetToolbarContribution.prototype, "editorProvider", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.InMemoryResources),
    tslib_1.__metadata("design:type", core_1.InMemoryResources)
], ChatViewWidgetToolbarContribution.prototype, "resources", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.AIActivationService),
    tslib_1.__metadata("design:type", Object)
], ChatViewWidgetToolbarContribution.prototype, "activationService", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], ChatViewWidgetToolbarContribution.prototype, "init", null);
exports.ChatViewWidgetToolbarContribution = ChatViewWidgetToolbarContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ChatViewWidgetToolbarContribution);
//# sourceMappingURL=chat-view-widget-toolbar-contribution.js.map