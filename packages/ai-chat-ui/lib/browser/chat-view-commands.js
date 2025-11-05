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
exports.AI_CHAT_SHOW_CHATS_COMMAND = exports.AI_CHAT_NEW_CHAT_WINDOW_COMMAND = exports.ChatCommands = void 0;
const core_1 = require("@theia/core");
const browser_1 = require("@theia/core/lib/browser");
var ChatCommands;
(function (ChatCommands) {
    const CHAT_CATEGORY = 'Chat';
    const CHAT_CATEGORY_KEY = core_1.nls.getDefaultKey(CHAT_CATEGORY);
    ChatCommands.SCROLL_LOCK_WIDGET = core_1.Command.toLocalizedCommand({
        id: 'chat:widget:lock',
        category: CHAT_CATEGORY,
        iconClass: (0, browser_1.codicon)('unlock')
    }, '', CHAT_CATEGORY_KEY);
    ChatCommands.SCROLL_UNLOCK_WIDGET = core_1.Command.toLocalizedCommand({
        id: 'chat:widget:unlock',
        category: CHAT_CATEGORY,
        iconClass: (0, browser_1.codicon)('lock')
    }, '', CHAT_CATEGORY_KEY);
    ChatCommands.EDIT_SESSION_SETTINGS = core_1.Command.toLocalizedCommand({
        id: 'chat:widget:session-settings',
        category: CHAT_CATEGORY,
        iconClass: (0, browser_1.codicon)('bracket')
    }, 'Set Session Settings', CHAT_CATEGORY_KEY);
    ChatCommands.AI_CHAT_NEW_WITH_TASK_CONTEXT = {
        id: 'ai-chat.new-with-task-context',
    };
    ChatCommands.AI_CHAT_INITIATE_SESSION_WITH_TASK_CONTEXT = core_1.Command.toLocalizedCommand({
        id: 'ai-chat.initiate-session-with-task-context',
        label: 'Task Context: Initiate Session',
        category: CHAT_CATEGORY
    }, undefined, CHAT_CATEGORY_KEY);
    ChatCommands.AI_CHAT_SUMMARIZE_CURRENT_SESSION = core_1.Command.toLocalizedCommand({
        id: 'ai-chat-summary-current-session',
        iconClass: (0, browser_1.codicon)('go-to-editing-session'),
        label: 'Summarize Current Session',
        category: CHAT_CATEGORY
    }, undefined, CHAT_CATEGORY_KEY);
    ChatCommands.AI_CHAT_OPEN_SUMMARY_FOR_CURRENT_SESSION = core_1.Command.toLocalizedCommand({
        id: 'ai-chat-open-current-session-summary',
        iconClass: (0, browser_1.codicon)('note'),
        label: 'Open Current Session Summary',
        category: CHAT_CATEGORY
    }, undefined, CHAT_CATEGORY_KEY);
})(ChatCommands || (exports.ChatCommands = ChatCommands = {}));
exports.AI_CHAT_NEW_CHAT_WINDOW_COMMAND = {
    id: 'ai-chat-ui.new-chat',
    iconClass: (0, browser_1.codicon)('add')
};
exports.AI_CHAT_SHOW_CHATS_COMMAND = {
    id: 'ai-chat-ui.show-chats',
    iconClass: (0, browser_1.codicon)('history')
};
//# sourceMappingURL=chat-view-commands.js.map