"use strict";
// *****************************************************************************
// Copyright (C) 2025 STMicroelectronics and others.
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
exports.ChatInputHistoryContribution = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@theia/core");
const browser_1 = require("@theia/core/lib/browser");
const inversify_1 = require("@theia/core/shared/inversify");
const chat_input_widget_1 = require("./chat-input-widget");
const chat_input_history_1 = require("./chat-input-history");
const CHAT_INPUT_PREVIOUS_PROMPT_COMMAND = core_1.Command.toDefaultLocalizedCommand({
    id: 'chat-input:previous-prompt',
    label: 'Previous Prompt'
});
const CHAT_INPUT_NEXT_PROMPT_COMMAND = core_1.Command.toDefaultLocalizedCommand({
    id: 'chat-input:next-prompt',
    label: 'Next Prompt'
});
const CHAT_INPUT_CLEAR_HISTORY_COMMAND = core_1.Command.toDefaultLocalizedCommand({
    id: 'chat-input:clear-history',
    category: 'Chat',
    label: 'Clear Input Prompt History'
});
let ChatInputHistoryContribution = class ChatInputHistoryContribution {
    registerCommands(commands) {
        commands.registerCommand(CHAT_INPUT_PREVIOUS_PROMPT_COMMAND, {
            execute: () => this.executeNavigatePrevious(),
            isEnabled: () => this.isNavigationEnabled()
        });
        commands.registerCommand(CHAT_INPUT_NEXT_PROMPT_COMMAND, {
            execute: () => this.executeNavigateNext(),
            isEnabled: () => this.isNavigationEnabled()
        });
        commands.registerCommand(CHAT_INPUT_CLEAR_HISTORY_COMMAND, {
            execute: () => this.historyService.clearHistory(),
            isEnabled: () => this.historyService.getPrompts().length > 0
        });
    }
    registerKeybindings(keybindings) {
        keybindings.registerKeybinding({
            command: CHAT_INPUT_PREVIOUS_PROMPT_COMMAND.id,
            keybinding: 'up',
            when: 'chatInputFocus && chatInputFirstLine && !suggestWidgetVisible'
        });
        keybindings.registerKeybinding({
            command: CHAT_INPUT_NEXT_PROMPT_COMMAND.id,
            keybinding: 'down',
            when: 'chatInputFocus && chatInputLastLine && !suggestWidgetVisible'
        });
    }
    executeNavigatePrevious() {
        const chatInputWidget = this.findFocusedChatInput();
        if (!chatInputWidget || !chatInputWidget.editor) {
            return;
        }
        const currentInput = chatInputWidget.editor.getControl().getValue();
        const previousPrompt = chatInputWidget.getPreviousPrompt(currentInput);
        if (previousPrompt !== undefined) {
            chatInputWidget.editor.getControl().setValue(previousPrompt);
            this.positionCursorAtEnd(chatInputWidget);
        }
    }
    executeNavigateNext() {
        const chatInputWidget = this.findFocusedChatInput();
        if (!chatInputWidget || !chatInputWidget.editor) {
            return;
        }
        const nextPrompt = chatInputWidget.getNextPrompt();
        if (nextPrompt !== undefined) {
            chatInputWidget.editor.getControl().setValue(nextPrompt);
            this.positionCursorAtEnd(chatInputWidget);
        }
    }
    positionCursorAtEnd(widget) {
        var _a;
        const editor = (_a = widget.editor) === null || _a === void 0 ? void 0 : _a.getControl();
        const model = editor === null || editor === void 0 ? void 0 : editor.getModel();
        if (editor && model) {
            const lastLine = model.getLineCount();
            const lastColumn = model.getLineContent(lastLine).length + 1;
            editor.setPosition({ lineNumber: lastLine, column: lastColumn });
            editor.focus();
            setTimeout(() => {
                var _a;
                // Trigger cursor position update after setting value
                if ((_a = widget.editor) === null || _a === void 0 ? void 0 : _a.getControl().hasWidgetFocus()) {
                    widget.updateCursorPositionKeys();
                }
            }, 0);
        }
    }
    findFocusedChatInput() {
        var _a, _b;
        const activeElement = document.activeElement;
        if (!(activeElement instanceof HTMLElement)) {
            return;
        }
        const activeWidget = this.shell.findWidgetForElement(activeElement);
        if (!(activeWidget instanceof chat_input_widget_1.AIChatInputWidget)) {
            return;
        }
        if (!((_a = activeWidget.inputConfiguration) === null || _a === void 0 ? void 0 : _a.enablePromptHistory)) {
            return;
        }
        if (!((_b = activeWidget.editor) === null || _b === void 0 ? void 0 : _b.getControl().hasWidgetFocus())) {
            return;
        }
        return activeWidget;
    }
    isNavigationEnabled() {
        var _a;
        const chatInputWidget = this.findFocusedChatInput();
        return chatInputWidget !== undefined &&
            ((_a = chatInputWidget.inputConfiguration) === null || _a === void 0 ? void 0 : _a.enablePromptHistory) !== false;
    }
};
exports.ChatInputHistoryContribution = ChatInputHistoryContribution;
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.ApplicationShell),
    tslib_1.__metadata("design:type", browser_1.ApplicationShell)
], ChatInputHistoryContribution.prototype, "shell", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(chat_input_history_1.ChatInputHistoryService),
    tslib_1.__metadata("design:type", chat_input_history_1.ChatInputHistoryService)
], ChatInputHistoryContribution.prototype, "historyService", void 0);
exports.ChatInputHistoryContribution = ChatInputHistoryContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ChatInputHistoryContribution);
//# sourceMappingURL=chat-input-history-contribution.js.map