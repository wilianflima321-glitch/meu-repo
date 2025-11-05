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
require("../../src/browser/style/index.css");
const core_1 = require("@theia/core");
const browser_1 = require("@theia/core/lib/browser");
const tab_bar_toolbar_1 = require("@theia/core/lib/browser/shell/tab-bar-toolbar");
const inversify_1 = require("@theia/core/shared/inversify");
const editor_manager_1 = require("@theia/editor/lib/browser/editor-manager");
const ai_chat_ui_contribution_1 = require("./ai-chat-ui-contribution");
const chat_input_widget_1 = require("./chat-input-widget");
const chat_node_toolbar_action_contribution_1 = require("./chat-node-toolbar-action-contribution");
const chat_response_part_renderer_1 = require("./chat-response-part-renderer");
const chat_response_renderer_1 = require("./chat-response-renderer");
const ai_selection_resolver_1 = require("./chat-response-renderer/ai-selection-resolver");
const question_part_renderer_1 = require("./chat-response-renderer/question-part-renderer");
const chat_tree_view_1 = require("./chat-tree-view");
const chat_view_tree_widget_1 = require("./chat-tree-view/chat-view-tree-widget");
const chat_view_contribution_1 = require("./chat-view-contribution");
const chat_view_language_contribution_1 = require("./chat-view-language-contribution");
const chat_view_widget_1 = require("./chat-view-widget");
const chat_view_widget_toolbar_contribution_1 = require("./chat-view-widget-toolbar-contribution");
const context_variable_picker_1 = require("./context-variable-picker");
const change_set_action_service_1 = require("./change-set-actions/change-set-action-service");
const change_set_accept_action_1 = require("./change-set-actions/change-set-accept-action");
const chat_view_tree_input_widget_1 = require("./chat-tree-view/chat-view-tree-input-widget");
const sub_chat_widget_1 = require("./chat-tree-view/sub-chat-widget");
const chat_input_history_1 = require("./chat-input-history");
const chat_input_history_contribution_1 = require("./chat-input-history-contribution");
exports.default = new inversify_1.ContainerModule((bind, _unbind, _isBound, rebind) => {
    (0, browser_1.bindViewContribution)(bind, ai_chat_ui_contribution_1.AIChatContribution);
    bind(tab_bar_toolbar_1.TabBarToolbarContribution).toService(ai_chat_ui_contribution_1.AIChatContribution);
    bind(chat_input_history_1.ChatInputHistoryService).toSelf().inSingletonScope();
    bind(chat_input_history_contribution_1.ChatInputHistoryContribution).toSelf().inSingletonScope();
    bind(core_1.CommandContribution).toService(chat_input_history_contribution_1.ChatInputHistoryContribution);
    bind(browser_1.KeybindingContribution).toService(chat_input_history_contribution_1.ChatInputHistoryContribution);
    (0, core_1.bindContributionProvider)(bind, chat_response_part_renderer_1.ChatResponsePartRenderer);
    bindChatViewWidget(bind);
    bind(chat_input_widget_1.AIChatInputWidget).toSelf();
    bind(chat_input_widget_1.AIChatInputConfiguration).toConstantValue({
        showContext: true,
        showPinnedAgent: true,
        showChangeSet: true,
        enablePromptHistory: true
    });
    bind(browser_1.WidgetFactory).toDynamicValue(({ container }) => ({
        id: chat_input_widget_1.AIChatInputWidget.ID,
        createWidget: () => container.get(chat_input_widget_1.AIChatInputWidget)
    })).inSingletonScope();
    bind(chat_view_tree_widget_1.ChatViewTreeWidget).toDynamicValue(ctx => (0, chat_tree_view_1.createChatViewTreeWidget)(ctx.container));
    bind(browser_1.WidgetFactory).toDynamicValue(({ container }) => ({
        id: chat_view_tree_widget_1.ChatViewTreeWidget.ID,
        createWidget: () => container.get(chat_view_tree_widget_1.ChatViewTreeWidget)
    })).inSingletonScope();
    bind(chat_view_tree_input_widget_1.AIChatTreeInputFactory).toFactory(ctx => (args) => {
        var _a, _b, _c, _d;
        const container = ctx.container.createChild();
        container.bind(chat_view_tree_input_widget_1.AIChatTreeInputArgs).toConstantValue(args);
        container.bind(chat_view_tree_input_widget_1.AIChatTreeInputConfiguration).toConstantValue({
            showContext: true,
            showPinnedAgent: true,
            showChangeSet: false,
            showSuggestions: false,
            enablePromptHistory: false
        });
        container.bind(chat_view_tree_input_widget_1.AIChatTreeInputWidget).toSelf().inSingletonScope();
        const widget = container.get(chat_view_tree_input_widget_1.AIChatTreeInputWidget);
        const noOp = () => { };
        widget.node.classList.add('chat-input-widget');
        widget.chatModel = args.node.request.session;
        widget.initialValue = args.initialValue;
        widget.setEnabled(true);
        widget.onQuery = args.onQuery;
        // We need to set those values here, otherwise the widget will throw an error
        widget.onUnpin = (_a = args.onUnpin) !== null && _a !== void 0 ? _a : noOp;
        widget.onCancel = (_b = args.onCancel) !== null && _b !== void 0 ? _b : noOp;
        widget.onDeleteChangeSet = (_c = args.onDeleteChangeSet) !== null && _c !== void 0 ? _c : noOp;
        widget.onDeleteChangeSetElement = (_d = args.onDeleteChangeSetElement) !== null && _d !== void 0 ? _d : noOp;
        return widget;
    });
    bind(context_variable_picker_1.ContextVariablePicker).toSelf().inSingletonScope();
    bind(chat_response_part_renderer_1.ChatResponsePartRenderer).to(chat_response_renderer_1.HorizontalLayoutPartRenderer).inSingletonScope();
    bind(chat_response_part_renderer_1.ChatResponsePartRenderer).to(chat_response_renderer_1.ErrorPartRenderer).inSingletonScope();
    bind(chat_response_part_renderer_1.ChatResponsePartRenderer).to(chat_response_renderer_1.MarkdownPartRenderer).inSingletonScope();
    bind(chat_response_part_renderer_1.ChatResponsePartRenderer).to(chat_response_renderer_1.CodePartRenderer).inSingletonScope();
    bind(chat_response_part_renderer_1.ChatResponsePartRenderer).to(chat_response_renderer_1.CommandPartRenderer).inSingletonScope();
    bind(chat_response_part_renderer_1.ChatResponsePartRenderer).to(chat_response_renderer_1.ToolCallPartRenderer).inSingletonScope();
    bind(chat_response_part_renderer_1.ChatResponsePartRenderer).to(chat_response_renderer_1.ErrorPartRenderer).inSingletonScope();
    bind(chat_response_part_renderer_1.ChatResponsePartRenderer).to(chat_response_renderer_1.ThinkingPartRenderer).inSingletonScope();
    bind(chat_response_part_renderer_1.ChatResponsePartRenderer).to(question_part_renderer_1.QuestionPartRenderer).inSingletonScope();
    bind(chat_response_part_renderer_1.ChatResponsePartRenderer).to(chat_response_renderer_1.ProgressPartRenderer).inSingletonScope();
    bind(chat_response_part_renderer_1.ChatResponsePartRenderer).to(chat_response_renderer_1.DelegationResponseRenderer).inSingletonScope();
    [core_1.CommandContribution, core_1.MenuContribution].forEach(serviceIdentifier => bind(serviceIdentifier).to(chat_view_contribution_1.ChatViewMenuContribution).inSingletonScope());
    (0, core_1.bindContributionProvider)(bind, chat_response_renderer_1.CodePartRendererAction);
    (0, core_1.bindContributionProvider)(bind, change_set_action_service_1.ChangeSetActionRenderer);
    bind(chat_response_renderer_1.CopyToClipboardButtonAction).toSelf().inSingletonScope();
    bind(chat_response_renderer_1.CodePartRendererAction).toService(chat_response_renderer_1.CopyToClipboardButtonAction);
    bind(chat_response_renderer_1.InsertCodeAtCursorButtonAction).toSelf().inSingletonScope();
    bind(chat_response_renderer_1.CodePartRendererAction).toService(chat_response_renderer_1.InsertCodeAtCursorButtonAction);
    bind(editor_manager_1.EditorSelectionResolver).to(ai_selection_resolver_1.GitHubSelectionResolver).inSingletonScope();
    bind(editor_manager_1.EditorSelectionResolver).to(ai_selection_resolver_1.TypeDocSymbolSelectionResolver).inSingletonScope();
    bind(editor_manager_1.EditorSelectionResolver).to(ai_selection_resolver_1.TextFragmentSelectionResolver).inSingletonScope();
    bind(chat_view_widget_toolbar_contribution_1.ChatViewWidgetToolbarContribution).toSelf().inSingletonScope();
    bind(tab_bar_toolbar_1.TabBarToolbarContribution).toService(chat_view_widget_toolbar_contribution_1.ChatViewWidgetToolbarContribution);
    bind(browser_1.FrontendApplicationContribution).to(chat_view_language_contribution_1.ChatViewLanguageContribution).inSingletonScope();
    bind(change_set_action_service_1.ChangeSetActionService).toSelf().inSingletonScope();
    bind(change_set_accept_action_1.ChangeSetAcceptAction).toSelf().inSingletonScope();
    bind(change_set_action_service_1.ChangeSetActionRenderer).toService(change_set_accept_action_1.ChangeSetAcceptAction);
    (0, core_1.bindContributionProvider)(bind, chat_node_toolbar_action_contribution_1.ChatNodeToolbarActionContribution);
    bind(chat_node_toolbar_action_contribution_1.DefaultChatNodeToolbarActionContribution).toSelf().inSingletonScope();
    bind(chat_node_toolbar_action_contribution_1.ChatNodeToolbarActionContribution).toService(chat_node_toolbar_action_contribution_1.DefaultChatNodeToolbarActionContribution);
    bind(sub_chat_widget_1.SubChatWidgetFactory).toFactory(ctx => () => {
        const container = ctx.container.createChild();
        container.bind(sub_chat_widget_1.SubChatWidget).toSelf().inSingletonScope();
        const widget = container.get(sub_chat_widget_1.SubChatWidget);
        return widget;
    });
});
function bindChatViewWidget(bind) {
    let chatViewWidget;
    bind(chat_view_widget_1.ChatViewWidget).toSelf();
    bind(browser_1.WidgetFactory).toDynamicValue(context => ({
        id: chat_view_widget_1.ChatViewWidget.ID,
        createWidget: () => {
            if ((chatViewWidget === null || chatViewWidget === void 0 ? void 0 : chatViewWidget.isDisposed) !== false) {
                chatViewWidget = context.container.get(chat_view_widget_1.ChatViewWidget);
            }
            return chatViewWidget;
        }
    })).inSingletonScope();
}
//# sourceMappingURL=ai-chat-ui-frontend-module.js.map