"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultChatNodeToolbarActionContribution = exports.ChatNodeToolbarCommands = exports.ChatNodeToolbarActionContribution = void 0;
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
const core_1 = require("@theia/core");
const browser_1 = require("@theia/core/lib/browser");
const chat_tree_view_1 = require("./chat-tree-view");
const ai_chat_1 = require("@theia/ai-chat");
/**
 * Clients implement this interface if they want to contribute to the toolbar of chat nodes.
 *
 * ### Example
 * ```ts
 * bind(ChatNodeToolbarActionContribution).toDynamicValue(context => ({
 *  getToolbarActions: (args: RequestNode | ResponseNode) => {
 *      if (isResponseNode(args)) {
 *          return [{
 *              commandId: 'core.about',
 *              icon: 'codicon codicon-feedback',
 *              tooltip: 'Show about dialog on response nodes'
 *          }];
 *      } else {
 *          return [];
 *      }
 *  }
 * }));
 * ```
 */
exports.ChatNodeToolbarActionContribution = Symbol('ChatNodeToolbarActionContribution');
var ChatNodeToolbarCommands;
(function (ChatNodeToolbarCommands) {
    const CHAT_NODE_TOOLBAR_CATEGORY = 'ChatNodeToolbar';
    const CHAT_NODE_TOOLBAR_CATEGORY_KEY = core_1.nls.getDefaultKey(CHAT_NODE_TOOLBAR_CATEGORY);
    ChatNodeToolbarCommands.EDIT = core_1.Command.toLocalizedCommand({
        id: 'chat:node:toolbar:edit-request',
        category: CHAT_NODE_TOOLBAR_CATEGORY,
    }, '', CHAT_NODE_TOOLBAR_CATEGORY_KEY);
    ChatNodeToolbarCommands.CANCEL = core_1.Command.toLocalizedCommand({
        id: 'chat:node:toolbar:cancel-request',
        category: CHAT_NODE_TOOLBAR_CATEGORY,
    }, '', CHAT_NODE_TOOLBAR_CATEGORY_KEY);
    ChatNodeToolbarCommands.RETRY = core_1.Command.toLocalizedCommand({
        id: 'chat:node:toolbar:retry-message',
        category: CHAT_NODE_TOOLBAR_CATEGORY,
    }, 'Retry', CHAT_NODE_TOOLBAR_CATEGORY_KEY);
})(ChatNodeToolbarCommands || (exports.ChatNodeToolbarCommands = ChatNodeToolbarCommands = {}));
class DefaultChatNodeToolbarActionContribution {
    getToolbarActions(node) {
        if ((0, chat_tree_view_1.isRequestNode)(node)) {
            if (ai_chat_1.EditableChatRequestModel.isEditing(node.request)) {
                return [{
                        commandId: ChatNodeToolbarCommands.CANCEL.id,
                        icon: (0, browser_1.codicon)('close'),
                        tooltip: core_1.nls.localize('theia/ai/chat-ui/node/toolbar/cancel', 'Cancel'),
                    }];
            }
            return [{
                    commandId: ChatNodeToolbarCommands.EDIT.id,
                    icon: (0, browser_1.codicon)('edit'),
                    tooltip: core_1.nls.localize('theia/ai/chat-ui/node/toolbar/edit', 'Edit'),
                }];
        }
        else {
            const shouldShowRetry = node.response.isError || node.response.isCanceled;
            if (shouldShowRetry) {
                return [{
                        commandId: ChatNodeToolbarCommands.RETRY.id,
                        icon: (0, browser_1.codicon)('refresh'),
                        tooltip: core_1.nls.localize('theia/ai/chat-ui/node/toolbar/retry', 'Retry'),
                        priority: -1 // Higher priority to show it first
                    }];
            }
            return [];
        }
    }
}
exports.DefaultChatNodeToolbarActionContribution = DefaultChatNodeToolbarActionContribution;
//# sourceMappingURL=chat-node-toolbar-action-contribution.js.map