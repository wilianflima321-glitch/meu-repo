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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubChatWidgetFactory = exports.SubChatWidget = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const chat_progress_message_1 = require("../chat-progress-message");
const chat_view_tree_widget_1 = require("./chat-view-tree-widget");
const React = require("@theia/core/shared/react");
const core_1 = require("@theia/core");
const chat_response_part_renderer_1 = require("../chat-response-part-renderer");
const chat_node_toolbar_action_contribution_1 = require("../chat-node-toolbar-action-contribution");
const browser_1 = require("@theia/core/lib/browser");
const nls_1 = require("@theia/core/lib/common/nls");
/**
 * Subset of the ChatViewTreeWidget used to render ResponseNodes for delegated prompts.
 */
let SubChatWidget = class SubChatWidget {
    renderChatResponse(node) {
        return (React.createElement("div", { className: 'theia-ResponseNode' },
            !node.response.isComplete
                && node.response.response.content.length === 0
                && node.response.progressMessages
                    .filter(c => c.show === 'untilFirstContent')
                    .map((c, i) => React.createElement(chat_progress_message_1.ProgressMessage, { ...c, key: `${node.id}-progress-untilFirstContent-${i}` })),
            node.response.response.content.map((c, i) => React.createElement("div", { className: 'theia-ResponseNode-Content', key: `${node.id}-content-${i}` }, this.getChatResponsePartRenderer(c, node))),
            !node.response.isComplete
                && node.response.progressMessages
                    .filter(c => c.show === 'whileIncomplete')
                    .map((c, i) => React.createElement(chat_progress_message_1.ProgressMessage, { ...c, key: `${node.id}-progress-whileIncomplete-${i}` })),
            node.response.progressMessages
                .filter(c => c.show === 'forever')
                .map((c, i) => React.createElement(chat_progress_message_1.ProgressMessage, { ...c, key: `${node.id}-progress-afterComplete-${i}` }))));
    }
    getChatResponsePartRenderer(content, node) {
        const renderer = this.chatResponsePartRenderers.getContributions().reduce((prev, current) => {
            const prio = current.canHandle(content);
            if (prio > prev[0]) {
                return [prio, current];
            }
            return prev;
        }, [-1, undefined])[1];
        if (!renderer) {
            console.error('No renderer found for content', content);
            return React.createElement("div", null, nls_1.nls.localize('theia/ai/chat-ui/chat-view-tree-widget/noRenderer', 'Error: No renderer found'));
        }
        return renderer.render(content, node);
    }
    handleContextMenu(node, event) {
        this.contextMenuRenderer.render({
            menuPath: chat_view_tree_widget_1.ChatViewTreeWidget.CONTEXT_MENU,
            anchor: { x: event.clientX, y: event.clientY },
            args: [node],
            context: event.currentTarget
        });
        event.preventDefault();
    }
};
exports.SubChatWidget = SubChatWidget;
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.ContributionProvider),
    (0, inversify_1.named)(chat_response_part_renderer_1.ChatResponsePartRenderer),
    tslib_1.__metadata("design:type", Object)
], SubChatWidget.prototype, "chatResponsePartRenderers", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.ContributionProvider),
    (0, inversify_1.named)(chat_node_toolbar_action_contribution_1.ChatNodeToolbarActionContribution),
    tslib_1.__metadata("design:type", Object)
], SubChatWidget.prototype, "chatNodeToolbarActionContributions", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.ContextMenuRenderer),
    tslib_1.__metadata("design:type", browser_1.ContextMenuRenderer)
], SubChatWidget.prototype, "contextMenuRenderer", void 0);
exports.SubChatWidget = SubChatWidget = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], SubChatWidget);
exports.SubChatWidgetFactory = Symbol('SubChatWidgetFactory');
//# sourceMappingURL=sub-chat-widget.js.map