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
var AIChatContribution_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIChatContribution = exports.AI_CHAT_TOGGLE_COMMAND_ID = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const core_1 = require("@theia/core");
const chat_view_commands_1 = require("./chat-view-commands");
const ai_chat_1 = require("@theia/ai-chat");
const chat_agent_service_1 = require("@theia/ai-chat/lib/common/chat-agent-service");
const editor_manager_1 = require("@theia/editor/lib/browser/editor-manager");
const view_contribution_1 = require("@theia/core/lib/browser/shell/view-contribution");
const chat_view_widget_1 = require("./chat-view-widget");
const promise_util_1 = require("@theia/core/lib/common/promise-util");
const secondary_window_handler_1 = require("@theia/core/lib/browser/secondary-window-handler");
const date_fns_1 = require("date-fns");
const locales = require("date-fns/locale");
const browser_1 = require("@theia/ai-core/lib/browser");
const chat_node_toolbar_action_contribution_1 = require("./chat-node-toolbar-action-contribution");
const chat_tree_view_1 = require("./chat-tree-view");
const task_context_variable_1 = require("@theia/ai-chat/lib/browser/task-context-variable");
const task_context_service_1 = require("@theia/ai-chat/lib/browser/task-context-service");
exports.AI_CHAT_TOGGLE_COMMAND_ID = 'aiChat:toggle';
let AIChatContribution = AIChatContribution_1 = class AIChatContribution extends view_contribution_1.AbstractViewContribution {
    constructor() {
        super({
            widgetId: chat_view_widget_1.ChatViewWidget.ID,
            widgetName: chat_view_widget_1.ChatViewWidget.LABEL,
            defaultWidgetOptions: {
                area: 'right',
                rank: 100
            },
            toggleCommandId: exports.AI_CHAT_TOGGLE_COMMAND_ID,
            toggleKeybinding: core_1.isOSX ? 'ctrl+cmd+i' : 'ctrl+alt+i'
        });
    }
    initialize() {
        this.chatService.onSessionEvent(event => {
            if (!(0, ai_chat_1.isActiveSessionChangedEvent)(event)) {
                return;
            }
            if (event.focus) {
                this.openView({ activate: true });
            }
        });
    }
    registerCommands(registry) {
        super.registerCommands(registry);
        registry.registerCommand(chat_view_commands_1.ChatCommands.SCROLL_LOCK_WIDGET, {
            isEnabled: widget => this.withWidget(widget, chatWidget => !chatWidget.isLocked),
            isVisible: widget => this.withWidget(widget, chatWidget => !chatWidget.isLocked),
            execute: widget => this.withWidget(widget, chatWidget => {
                chatWidget.lock();
                return true;
            })
        });
        registry.registerCommand(chat_view_commands_1.ChatCommands.SCROLL_UNLOCK_WIDGET, {
            isEnabled: widget => this.withWidget(widget, chatWidget => chatWidget.isLocked),
            isVisible: widget => this.withWidget(widget, chatWidget => chatWidget.isLocked),
            execute: widget => this.withWidget(widget, chatWidget => {
                chatWidget.unlock();
                return true;
            })
        });
        registry.registerCommand(chat_view_commands_1.AI_CHAT_NEW_CHAT_WINDOW_COMMAND, {
            execute: () => this.openView().then(() => this.chatService.createSession(ai_chat_1.ChatAgentLocation.Panel, { focus: true })),
            isVisible: widget => this.activationService.isActive,
            isEnabled: widget => this.activationService.isActive,
        });
        registry.registerCommand(chat_view_commands_1.ChatCommands.AI_CHAT_NEW_WITH_TASK_CONTEXT, {
            execute: async () => {
                const activeSession = this.chatService.getActiveSession();
                const id = await this.summarizeActiveSession();
                if (!id || !activeSession) {
                    return;
                }
                const newSession = this.chatService.createSession(ai_chat_1.ChatAgentLocation.Panel, { focus: true }, activeSession.pinnedAgent);
                const summaryVariable = { variable: task_context_variable_1.TASK_CONTEXT_VARIABLE, arg: id };
                newSession.model.context.addVariables(summaryVariable);
            },
            isVisible: () => false
        });
        registry.registerCommand(chat_view_commands_1.ChatCommands.AI_CHAT_SUMMARIZE_CURRENT_SESSION, {
            execute: async () => this.summarizeActiveSession(),
            isVisible: widget => {
                if (!this.activationService.isActive) {
                    return false;
                }
                if (widget && !this.withWidget(widget)) {
                    return false;
                }
                const activeSession = this.chatService.getActiveSession();
                return (activeSession === null || activeSession === void 0 ? void 0 : activeSession.model.location) === ai_chat_1.ChatAgentLocation.Panel
                    && !this.taskContextService.hasSummary(activeSession);
            },
            isEnabled: widget => {
                if (!this.activationService.isActive) {
                    return false;
                }
                if (widget && !this.withWidget(widget)) {
                    return false;
                }
                const activeSession = this.chatService.getActiveSession();
                return (activeSession === null || activeSession === void 0 ? void 0 : activeSession.model.location) === ai_chat_1.ChatAgentLocation.Panel
                    && !activeSession.model.isEmpty()
                    && !this.taskContextService.hasSummary(activeSession);
            }
        });
        registry.registerCommand(chat_view_commands_1.ChatCommands.AI_CHAT_OPEN_SUMMARY_FOR_CURRENT_SESSION, {
            execute: async () => {
                const id = await this.summarizeActiveSession();
                if (!id) {
                    return;
                }
                await this.taskContextService.open(id);
            },
            isVisible: widget => {
                if (!this.activationService.isActive) {
                    return false;
                }
                if (widget && !this.withWidget(widget)) {
                    return false;
                }
                const activeSession = this.chatService.getActiveSession();
                return !!activeSession && this.taskContextService.hasSummary(activeSession);
            },
            isEnabled: widget => {
                if (!this.activationService.isActive) {
                    return false;
                }
                return this.withWidget(widget, () => true);
            }
        });
        registry.registerCommand(chat_view_commands_1.ChatCommands.AI_CHAT_INITIATE_SESSION_WITH_TASK_CONTEXT, {
            execute: async () => {
                const selectedContextId = await this.selectTaskContextWithMarking();
                if (!selectedContextId) {
                    return;
                }
                const selectedAgent = await this.selectAgent('Coder');
                if (!selectedAgent) {
                    return;
                }
                const newSession = this.chatService.createSession(ai_chat_1.ChatAgentLocation.Panel, { focus: true }, selectedAgent);
                newSession.model.context.addVariables({ variable: task_context_variable_1.TASK_CONTEXT_VARIABLE, arg: selectedContextId });
            },
            isVisible: () => this.activationService.isActive,
            isEnabled: () => this.activationService.isActive
        });
        registry.registerCommand(chat_view_commands_1.AI_CHAT_SHOW_CHATS_COMMAND, {
            execute: () => this.selectChat(),
            isEnabled: widget => this.activationService.isActive && this.withWidget(widget) && this.chatService.getSessions().some(session => !!session.title),
            isVisible: widget => this.activationService.isActive && this.withWidget(widget)
        });
        registry.registerCommand(chat_node_toolbar_action_contribution_1.ChatNodeToolbarCommands.EDIT, {
            isEnabled: node => (0, chat_tree_view_1.isEditableRequestNode)(node) && !node.request.isEditing,
            isVisible: node => (0, chat_tree_view_1.isEditableRequestNode)(node) && !node.request.isEditing,
            execute: (node) => {
                node.request.enableEdit();
            }
        });
        registry.registerCommand(chat_node_toolbar_action_contribution_1.ChatNodeToolbarCommands.CANCEL, {
            isEnabled: node => (0, chat_tree_view_1.isEditableRequestNode)(node) && node.request.isEditing,
            isVisible: node => (0, chat_tree_view_1.isEditableRequestNode)(node) && node.request.isEditing,
            execute: (node) => {
                node.request.cancelEdit();
            }
        });
        registry.registerCommand(chat_node_toolbar_action_contribution_1.ChatNodeToolbarCommands.RETRY, {
            isEnabled: node => (0, chat_tree_view_1.isResponseNode)(node) && (node.response.isError || node.response.isCanceled),
            isVisible: node => (0, chat_tree_view_1.isResponseNode)(node) && (node.response.isError || node.response.isCanceled),
            execute: async (node) => {
                try {
                    // Get the session for this response node
                    const session = this.chatService.getActiveSession();
                    if (!session) {
                        this.messageService.error('Session not found for retry');
                        return;
                    }
                    // Find the request associated with this response
                    const request = session.model.getRequests().find(req => req.response.id === node.response.id);
                    if (!request) {
                        this.messageService.error('Request not found for retry');
                        return;
                    }
                    // Send the same request again using the chat service
                    await this.chatService.sendRequest(node.sessionId, request.request);
                }
                catch (error) {
                    console.error('Failed to retry chat message:', error);
                    this.messageService.error('Failed to retry message');
                }
            }
        });
    }
    registerToolbarItems(registry) {
        registry.registerItem({
            id: chat_view_commands_1.AI_CHAT_NEW_CHAT_WINDOW_COMMAND.id,
            command: chat_view_commands_1.AI_CHAT_NEW_CHAT_WINDOW_COMMAND.id,
            tooltip: core_1.nls.localizeByDefault('New Chat'),
            isVisible: widget => this.activationService.isActive && this.withWidget(widget),
            when: browser_1.ENABLE_AI_CONTEXT_KEY
        });
        registry.registerItem({
            id: chat_view_commands_1.AI_CHAT_SHOW_CHATS_COMMAND.id,
            command: chat_view_commands_1.AI_CHAT_SHOW_CHATS_COMMAND.id,
            tooltip: core_1.nls.localizeByDefault('Show Chats...'),
            isVisible: widget => this.activationService.isActive && this.withWidget(widget),
            when: browser_1.ENABLE_AI_CONTEXT_KEY
        });
        registry.registerItem({
            id: 'chat-view.' + browser_1.AI_SHOW_SETTINGS_COMMAND.id,
            command: browser_1.AI_SHOW_SETTINGS_COMMAND.id,
            group: 'ai-settings',
            priority: 3,
            tooltip: core_1.nls.localize('theia/ai-chat-ui/open-settings-tooltip', 'Open AI settings...'),
            isVisible: widget => this.activationService.isActive && this.withWidget(widget),
            when: browser_1.ENABLE_AI_CONTEXT_KEY
        });
        const sessionSummarizibilityChangedEmitter = new core_1.Emitter();
        this.taskContextService.onDidChange(() => sessionSummarizibilityChangedEmitter.fire());
        this.chatService.onSessionEvent(event => event.type === 'activeChange' && sessionSummarizibilityChangedEmitter.fire());
        this.activationService.onDidChangeActiveStatus(() => sessionSummarizibilityChangedEmitter.fire());
        registry.registerItem({
            id: 'chat-view.' + chat_view_commands_1.ChatCommands.AI_CHAT_SUMMARIZE_CURRENT_SESSION.id,
            command: chat_view_commands_1.ChatCommands.AI_CHAT_SUMMARIZE_CURRENT_SESSION.id,
            onDidChange: sessionSummarizibilityChangedEmitter.event,
            when: browser_1.ENABLE_AI_CONTEXT_KEY
        });
        registry.registerItem({
            id: 'chat-view.' + chat_view_commands_1.ChatCommands.AI_CHAT_OPEN_SUMMARY_FOR_CURRENT_SESSION.id,
            command: chat_view_commands_1.ChatCommands.AI_CHAT_OPEN_SUMMARY_FOR_CURRENT_SESSION.id,
            onDidChange: sessionSummarizibilityChangedEmitter.event,
            when: browser_1.ENABLE_AI_CONTEXT_KEY
        });
    }
    async selectChat(sessionId) {
        let activeSessionId = sessionId;
        if (!activeSessionId) {
            const item = await this.askForChatSession();
            if (item === undefined) {
                return;
            }
            activeSessionId = item.id;
        }
        this.chatService.setActiveSession(activeSessionId, { focus: true });
    }
    askForChatSession() {
        const getItems = () => this.chatService.getSessions()
            .filter(session => session.title)
            .sort((a, b) => {
            if (!a.lastInteraction) {
                return 1;
            }
            if (!b.lastInteraction) {
                return -1;
            }
            return b.lastInteraction.getTime() - a.lastInteraction.getTime();
        })
            .map(session => {
            var _a;
            return ({
                label: session.title,
                description: session.lastInteraction ? (0, date_fns_1.formatDistance)(session.lastInteraction, new Date(), { addSuffix: false, locale: getDateFnsLocale() }) : undefined,
                detail: (_a = session.model.getRequests().at(0)) === null || _a === void 0 ? void 0 : _a.request.text,
                id: session.id,
                buttons: [AIChatContribution_1.RENAME_CHAT_BUTTON, AIChatContribution_1.REMOVE_CHAT_BUTTON]
            });
        });
        const defer = new promise_util_1.Deferred();
        const quickPick = this.quickInputService.createQuickPick();
        quickPick.placeholder = core_1.nls.localize('theia/ai/chat-ui/selectChat', 'Select chat');
        quickPick.canSelectMany = false;
        quickPick.items = getItems();
        quickPick.onDidTriggerItemButton(async (context) => {
            if (context.button === AIChatContribution_1.RENAME_CHAT_BUTTON) {
                quickPick.hide();
                this.quickInputService.input({
                    placeHolder: core_1.nls.localize('theia/ai/chat-ui/enterChatName', 'Enter chat name')
                }).then(name => {
                    if (name && name.length > 0) {
                        const session = this.chatService.getSession(context.item.id);
                        if (session) {
                            session.title = name;
                        }
                    }
                });
            }
            else if (context.button === AIChatContribution_1.REMOVE_CHAT_BUTTON) {
                this.chatService.deleteSession(context.item.id);
                quickPick.items = getItems();
                if (this.chatService.getSessions().length <= 1) {
                    quickPick.hide();
                }
            }
        });
        quickPick.onDidAccept(() => {
            const selectedItem = quickPick.selectedItems[0];
            defer.resolve(selectedItem);
            quickPick.hide();
        });
        quickPick.onDidHide(() => defer.resolve(undefined));
        quickPick.show();
        return defer.promise;
    }
    withWidget(widget = this.tryGetWidget(), predicate = () => true) {
        return widget instanceof chat_view_widget_1.ChatViewWidget ? predicate(widget) : false;
    }
    extractChatView(chatView) {
        this.secondaryWindowHandler.moveWidgetToSecondaryWindow(chatView);
    }
    canExtractChatView(chatView) {
        return !chatView.secondaryWindow;
    }
    async summarizeActiveSession() {
        const activeSession = this.chatService.getActiveSession();
        if (!activeSession) {
            return;
        }
        return this.taskContextService.summarize(activeSession).catch(err => {
            console.warn('Error while summarizing session:', err);
            this.messageService.error('Unable to summarize current session. Please confirm that the summary agent is not disabled.');
            return undefined;
        });
    }
    /**
     * Prompts the user to select a chat agent
     * @returns The selected agent or undefined if cancelled
     */
    /**
     * Prompts the user to select a chat agent with an optional default (pre-selected) agent.
     * @param defaultAgentId The id of the agent to pre-select, if present
     * @returns The selected agent or undefined if cancelled
     */
    async selectAgent(defaultAgentId) {
        const agents = this.chatAgentService.getAgents();
        if (agents.length === 0) {
            this.messageService.warn('No chat agents available.');
            return undefined;
        }
        const items = agents.map(agent => ({
            label: agent.name || agent.id,
            description: agent.description,
            id: agent.id
        }));
        let preselected = undefined;
        if (defaultAgentId) {
            preselected = items.find(item => item.id === defaultAgentId);
        }
        const selected = await this.quickInputService.showQuickPick(items, {
            placeholder: 'Select an agent for the new session',
            activeItem: preselected
        });
        if (!selected) {
            return undefined;
        }
        return this.chatAgentService.getAgent(selected.id);
    }
    /**
     * Prompts the user to select a task context with special marking for currently opened files
     * @returns The selected task context ID or undefined if cancelled
     */
    async selectTaskContextWithMarking() {
        const contexts = this.taskContextService.getAll();
        const openedFilesInfo = this.getOpenedTaskContextFiles();
        // Create items with opened files marked and prioritized
        const items = contexts.map(summary => {
            const isOpened = openedFilesInfo.openedIds.includes(summary.id);
            const isActive = openedFilesInfo.activeId === summary.id;
            return {
                label: isOpened ? `📄 ${summary.label} (currently open)` : summary.label,
                description: summary.id,
                id: summary.id,
                // We'll sort active file first, then opened files, then others
                sortText: isActive ? `0-${summary.label}` : isOpened ? `1-${summary.label}` : `2-${summary.label}`
            };
        }).sort((a, b) => a.sortText.localeCompare(b.sortText));
        const selected = await this.quickInputService.showQuickPick(items, {
            placeholder: 'Select a task context to attach'
        });
        return selected === null || selected === void 0 ? void 0 : selected.id;
    }
    /**
     * Returns information about task context files that are currently opened
     * @returns Object with arrays of opened context IDs and the active context ID
     */
    getOpenedTaskContextFiles() {
        var _a;
        // Get all contexts with their URIs
        const allContexts = this.taskContextService.getAll();
        const contextMap = new Map(); // Map of URI -> ID
        // Create a map of URI string -> context ID for lookup
        for (const context of allContexts) {
            if (context.uri) {
                contextMap.set(context.uri.toString(), context.id);
            }
        }
        // Get all open editor URIs
        const openEditorUris = this.editorManager.all.map(widget => widget.editor.uri.toString());
        // Get the currently active/focused editor URI if any
        const activeEditorUri = (_a = this.editorManager.currentEditor) === null || _a === void 0 ? void 0 : _a.editor.uri.toString();
        let activeContextId;
        if (activeEditorUri) {
            activeContextId = contextMap.get(activeEditorUri);
        }
        // Filter to only task context files that are currently opened
        const openedContextIds = [];
        for (const uri of openEditorUris) {
            const contextId = contextMap.get(uri);
            if (contextId) {
                openedContextIds.push(contextId);
            }
        }
        return { openedIds: openedContextIds, activeId: activeContextId };
    }
};
exports.AIChatContribution = AIChatContribution;
AIChatContribution.RENAME_CHAT_BUTTON = {
    iconClass: 'codicon-edit',
    tooltip: core_1.nls.localize('theia/ai/chat-ui/renameChat', 'Rename Chat'),
};
AIChatContribution.REMOVE_CHAT_BUTTON = {
    iconClass: 'codicon-remove-close',
    tooltip: core_1.nls.localize('theia/ai/chat-ui/removeChat', 'Remove Chat'),
};
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_chat_1.ChatService),
    tslib_1.__metadata("design:type", Object)
], AIChatContribution.prototype, "chatService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.QuickInputService),
    tslib_1.__metadata("design:type", Object)
], AIChatContribution.prototype, "quickInputService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(task_context_service_1.TaskContextService),
    tslib_1.__metadata("design:type", task_context_service_1.TaskContextService)
], AIChatContribution.prototype, "taskContextService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.MessageService),
    tslib_1.__metadata("design:type", core_1.MessageService)
], AIChatContribution.prototype, "messageService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(chat_agent_service_1.ChatAgentService),
    tslib_1.__metadata("design:type", Object)
], AIChatContribution.prototype, "chatAgentService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(editor_manager_1.EditorManager),
    tslib_1.__metadata("design:type", editor_manager_1.EditorManager)
], AIChatContribution.prototype, "editorManager", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.AIActivationService),
    tslib_1.__metadata("design:type", Object)
], AIChatContribution.prototype, "activationService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(secondary_window_handler_1.SecondaryWindowHandler),
    tslib_1.__metadata("design:type", secondary_window_handler_1.SecondaryWindowHandler)
], AIChatContribution.prototype, "secondaryWindowHandler", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], AIChatContribution.prototype, "initialize", null);
exports.AIChatContribution = AIChatContribution = AIChatContribution_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)(),
    tslib_1.__metadata("design:paramtypes", [])
], AIChatContribution);
const dateFnsLocales = locales;
function getDateFnsLocale() {
    var _a;
    return core_1.nls.locale ? (_a = dateFnsLocales[core_1.nls.locale]) !== null && _a !== void 0 ? _a : dateFnsLocales.enUS : dateFnsLocales.enUS;
}
//# sourceMappingURL=ai-chat-ui-contribution.js.map