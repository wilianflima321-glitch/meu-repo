"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatViewMenuContribution = exports.ChatViewCommands = void 0;
const tslib_1 = require("tslib");
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
const clipboard_service_1 = require("@theia/core/lib/browser/clipboard-service");
const inversify_1 = require("@theia/core/shared/inversify");
const chat_view_tree_widget_1 = require("./chat-tree-view/chat-view-tree-widget");
const chat_input_widget_1 = require("./chat-input-widget");
const browser_2 = require("@theia/ai-core/lib/browser");
var ChatViewCommands;
(function (ChatViewCommands) {
    ChatViewCommands.COPY_MESSAGE = core_1.Command.toDefaultLocalizedCommand({
        id: 'chat.copy.message',
        label: 'Copy Message'
    });
    ChatViewCommands.COPY_ALL = core_1.Command.toDefaultLocalizedCommand({
        id: 'chat.copy.all',
        label: 'Copy All'
    });
    ChatViewCommands.COPY_CODE = core_1.Command.toLocalizedCommand({
        id: 'chat.copy.code',
        label: 'Copy Code Block'
    }, 'theia/ai/chat-ui/copyCodeBlock');
    ChatViewCommands.EDIT = core_1.Command.toLocalizedCommand({
        id: 'chat.edit.request',
        label: 'Edit'
    }, 'theia/ai/chat-ui/editRequest');
})(ChatViewCommands || (exports.ChatViewCommands = ChatViewCommands = {}));
let ChatViewMenuContribution = class ChatViewMenuContribution {
    registerCommands(commands) {
        commands.registerHandler(browser_1.CommonCommands.COPY.id, this.commandHandlerFactory({
            execute: (...args) => {
                var _a;
                if (((_a = window.getSelection()) === null || _a === void 0 ? void 0 : _a.type) !== 'Range' && containsRequestOrResponseNode(args)) {
                    this.copyMessage(extractRequestOrResponseNodes(args));
                }
                else {
                    this.commandService.executeCommand(browser_1.CommonCommands.COPY.id);
                }
            },
            isEnabled: (...args) => containsRequestOrResponseNode(args)
        }));
        commands.registerCommand(ChatViewCommands.COPY_MESSAGE, this.commandHandlerFactory({
            execute: (...args) => {
                if (containsRequestOrResponseNode(args)) {
                    this.copyMessage(extractRequestOrResponseNodes(args));
                }
            },
            isEnabled: (...args) => containsRequestOrResponseNode(args)
        }));
        commands.registerCommand(ChatViewCommands.COPY_ALL, this.commandHandlerFactory({
            execute: (...args) => {
                var _a;
                if (containsRequestOrResponseNode(args)) {
                    const parent = (_a = extractRequestOrResponseNodes(args).find(arg => arg.parent)) === null || _a === void 0 ? void 0 : _a.parent;
                    const text = parent === null || parent === void 0 ? void 0 : parent.children.filter(isRequestOrResponseNode).map(child => this.getCopyText(child)).join('\n\n---\n\n');
                    if (text) {
                        this.clipboardService.writeText(text);
                    }
                }
            },
            isEnabled: (...args) => containsRequestOrResponseNode(args)
        }));
        commands.registerCommand(ChatViewCommands.COPY_CODE, this.commandHandlerFactory({
            execute: (...args) => {
                if (containsCode(args)) {
                    const code = args
                        .filter(isCodeArg)
                        .map(arg => arg.code)
                        .join();
                    this.clipboardService.writeText(code);
                }
            },
            isEnabled: (...args) => containsRequestOrResponseNode(args) && containsCode(args)
        }));
        commands.registerCommand(ChatViewCommands.EDIT, this.commandHandlerFactory({
            execute: (...args) => {
                args[0].request.enableEdit();
            },
            isEnabled: (...args) => hasAsFirstArg(args, chat_view_tree_widget_1.isEditableRequestNode) && !args[0].request.isEditing,
            isVisible: (...args) => hasAsFirstArg(args, chat_view_tree_widget_1.isEditableRequestNode) && !args[0].request.isEditing
        }));
    }
    copyMessage(args) {
        const text = this.getCopyTextAndJoin(args);
        this.clipboardService.writeText(text);
    }
    getCopyTextAndJoin(args) {
        return args !== undefined ? args.map(arg => this.getCopyText(arg)).join() : '';
    }
    getCopyText(arg) {
        var _a;
        if ((0, chat_view_tree_widget_1.isRequestNode)(arg)) {
            return (_a = arg.request.request.text) !== null && _a !== void 0 ? _a : '';
        }
        else if ((0, chat_view_tree_widget_1.isResponseNode)(arg)) {
            return arg.response.response.asDisplayString();
        }
        return '';
    }
    registerMenus(menus) {
        menus.registerMenuAction([...chat_view_tree_widget_1.ChatViewTreeWidget.CONTEXT_MENU, '_1'], {
            commandId: browser_1.CommonCommands.COPY.id,
            when: browser_2.ENABLE_AI_CONTEXT_KEY
        });
        menus.registerMenuAction([...chat_view_tree_widget_1.ChatViewTreeWidget.CONTEXT_MENU, '_1'], {
            commandId: ChatViewCommands.COPY_MESSAGE.id,
            when: browser_2.ENABLE_AI_CONTEXT_KEY
        });
        menus.registerMenuAction([...chat_view_tree_widget_1.ChatViewTreeWidget.CONTEXT_MENU, '_1'], {
            commandId: ChatViewCommands.COPY_ALL.id,
            when: browser_2.ENABLE_AI_CONTEXT_KEY
        });
        menus.registerMenuAction([...chat_view_tree_widget_1.ChatViewTreeWidget.CONTEXT_MENU, '_1'], {
            commandId: ChatViewCommands.COPY_CODE.id,
            when: browser_2.ENABLE_AI_CONTEXT_KEY
        });
        menus.registerMenuAction([...chat_view_tree_widget_1.ChatViewTreeWidget.CONTEXT_MENU, '_1'], {
            commandId: ChatViewCommands.EDIT.id,
            when: browser_2.ENABLE_AI_CONTEXT_KEY
        });
        menus.registerMenuAction([...chat_input_widget_1.AIChatInputWidget.CONTEXT_MENU, '_1'], {
            commandId: browser_1.CommonCommands.COPY.id,
            when: browser_2.ENABLE_AI_CONTEXT_KEY
        });
        menus.registerMenuAction([...chat_input_widget_1.AIChatInputWidget.CONTEXT_MENU, '_1'], {
            commandId: browser_1.CommonCommands.PASTE.id,
            when: browser_2.ENABLE_AI_CONTEXT_KEY
        });
    }
};
exports.ChatViewMenuContribution = ChatViewMenuContribution;
tslib_1.__decorate([
    (0, inversify_1.inject)(clipboard_service_1.ClipboardService),
    tslib_1.__metadata("design:type", Object)
], ChatViewMenuContribution.prototype, "clipboardService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.CommandService),
    tslib_1.__metadata("design:type", Object)
], ChatViewMenuContribution.prototype, "commandService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_2.AICommandHandlerFactory),
    tslib_1.__metadata("design:type", Function)
], ChatViewMenuContribution.prototype, "commandHandlerFactory", void 0);
exports.ChatViewMenuContribution = ChatViewMenuContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ChatViewMenuContribution);
function hasAsFirstArg(args, guard) {
    return args.length > 0 && guard(args[0]);
}
function extractRequestOrResponseNodes(args) {
    return args.filter(arg => isRequestOrResponseNode(arg));
}
function containsRequestOrResponseNode(args) {
    return extractRequestOrResponseNodes(args).length > 0;
}
function isRequestOrResponseNode(arg) {
    return browser_1.TreeNode.is(arg) && ((0, chat_view_tree_widget_1.isRequestNode)(arg) || (0, chat_view_tree_widget_1.isResponseNode)(arg));
}
function containsCode(args) {
    return args.filter(arg => isCodeArg(arg)).length > 0;
}
function isCodeArg(arg) {
    return (0, core_1.isObject)(arg) && 'code' in arg;
}
//# sourceMappingURL=chat-view-contribution.js.map