"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIHistoryViewContribution = exports.AI_HISTORY_VIEW_CLEAR = exports.AI_HISTORY_VIEW_TOGGLE_HIDE_NEWLINES = exports.AI_HISTORY_VIEW_TOGGLE_RENDER_NEWLINES = exports.AI_HISTORY_VIEW_TOGGLE_RAW = exports.AI_HISTORY_VIEW_TOGGLE_COMPACT = exports.AI_HISTORY_VIEW_SORT_REVERSE_CHRONOLOGICALLY = exports.AI_HISTORY_VIEW_SORT_CHRONOLOGICALLY = exports.OPEN_AI_HISTORY_VIEW = exports.AI_HISTORY_TOGGLE_COMMAND_ID = void 0;
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
const browser_1 = require("@theia/core/lib/browser");
const browser_2 = require("@theia/ai-core/lib/browser");
const inversify_1 = require("@theia/core/shared/inversify");
const ai_history_widget_1 = require("./ai-history-widget");
const core_1 = require("@theia/core");
const ai_core_1 = require("@theia/ai-core");
const chat_view_widget_1 = require("@theia/ai-chat-ui/lib/browser/chat-view-widget");
exports.AI_HISTORY_TOGGLE_COMMAND_ID = 'aiHistory:toggle';
exports.OPEN_AI_HISTORY_VIEW = core_1.Command.toLocalizedCommand({
    id: 'aiHistory:open',
    label: 'Open AI History view',
});
exports.AI_HISTORY_VIEW_SORT_CHRONOLOGICALLY = core_1.Command.toLocalizedCommand({
    id: 'aiHistory:sortChronologically',
    label: 'AI History: Sort chronologically',
    iconClass: (0, browser_1.codicon)('arrow-down')
});
exports.AI_HISTORY_VIEW_SORT_REVERSE_CHRONOLOGICALLY = core_1.Command.toLocalizedCommand({
    id: 'aiHistory:sortReverseChronologically',
    label: 'AI History: Sort reverse chronologically',
    iconClass: (0, browser_1.codicon)('arrow-up')
});
exports.AI_HISTORY_VIEW_TOGGLE_COMPACT = core_1.Command.toLocalizedCommand({
    id: 'aiHistory:toggleCompact',
    label: 'AI History: Toggle compact view',
    iconClass: (0, browser_1.codicon)('list-flat')
});
exports.AI_HISTORY_VIEW_TOGGLE_RAW = core_1.Command.toLocalizedCommand({
    id: 'aiHistory:toggleRaw',
    label: 'AI History: Toggle raw view',
    iconClass: (0, browser_1.codicon)('list-tree')
});
exports.AI_HISTORY_VIEW_TOGGLE_RENDER_NEWLINES = core_1.Command.toLocalizedCommand({
    id: 'aiHistory:toggleRenderNewlines',
    label: 'AI History: Interpret newlines',
    iconClass: (0, browser_1.codicon)('newline')
});
exports.AI_HISTORY_VIEW_TOGGLE_HIDE_NEWLINES = core_1.Command.toLocalizedCommand({
    id: 'aiHistory:toggleHideNewlines',
    label: 'AI History: Stop interpreting newlines',
    iconClass: (0, browser_1.codicon)('no-newline')
});
exports.AI_HISTORY_VIEW_CLEAR = core_1.Command.toLocalizedCommand({
    id: 'aiHistory:clear',
    label: 'AI History: Clear History',
    iconClass: (0, browser_1.codicon)('clear-all')
});
let AIHistoryViewContribution = class AIHistoryViewContribution extends browser_2.AIViewContribution {
    constructor() {
        super({
            widgetId: ai_history_widget_1.AIHistoryView.ID,
            widgetName: ai_history_widget_1.AIHistoryView.LABEL,
            defaultWidgetOptions: {
                area: 'bottom',
                rank: 100
            },
            toggleCommandId: exports.AI_HISTORY_TOGGLE_COMMAND_ID,
        });
        this.chronologicalChangedEmitter = new core_1.Emitter();
        this.chronologicalStateChanged = this.chronologicalChangedEmitter.event;
        this.compactViewChangedEmitter = new core_1.Emitter();
        this.compactViewStateChanged = this.compactViewChangedEmitter.event;
        this.renderNewlinesChangedEmitter = new core_1.Emitter();
        this.renderNewlinesStateChanged = this.renderNewlinesChangedEmitter.event;
    }
    async initializeLayout(_app) {
        await this.openView();
    }
    registerCommands(registry) {
        super.registerCommands(registry);
        registry.registerCommand(exports.OPEN_AI_HISTORY_VIEW, {
            execute: () => this.openView({ activate: true }),
        });
        registry.registerCommand(exports.AI_HISTORY_VIEW_SORT_CHRONOLOGICALLY, {
            isEnabled: widget => this.withHistoryWidget(widget, historyView => !historyView.isChronological),
            isVisible: widget => this.withHistoryWidget(widget, historyView => !historyView.isChronological),
            execute: widget => this.withHistoryWidget(widget, historyView => {
                historyView.sortHistory(true);
                this.chronologicalChangedEmitter.fire();
                return true;
            })
        });
        registry.registerCommand(exports.AI_HISTORY_VIEW_SORT_REVERSE_CHRONOLOGICALLY, {
            isEnabled: widget => this.withHistoryWidget(widget, historyView => historyView.isChronological),
            isVisible: widget => this.withHistoryWidget(widget, historyView => historyView.isChronological),
            execute: widget => this.withHistoryWidget(widget, historyView => {
                historyView.sortHistory(false);
                this.chronologicalChangedEmitter.fire();
                return true;
            })
        });
        registry.registerCommand(exports.AI_HISTORY_VIEW_TOGGLE_COMPACT, {
            isEnabled: widget => this.withHistoryWidget(widget),
            isVisible: widget => this.withHistoryWidget(widget, historyView => !historyView.isCompactView),
            execute: widget => this.withHistoryWidget(widget, historyView => {
                historyView.toggleCompactView();
                this.compactViewChangedEmitter.fire();
                return true;
            })
        });
        registry.registerCommand(exports.AI_HISTORY_VIEW_TOGGLE_RAW, {
            isEnabled: widget => this.withHistoryWidget(widget),
            isVisible: widget => this.withHistoryWidget(widget, historyView => historyView.isCompactView),
            execute: widget => this.withHistoryWidget(widget, historyView => {
                historyView.toggleCompactView();
                this.compactViewChangedEmitter.fire();
                return true;
            })
        });
        registry.registerCommand(exports.AI_HISTORY_VIEW_TOGGLE_RENDER_NEWLINES, {
            isEnabled: widget => this.withHistoryWidget(widget),
            isVisible: widget => this.withHistoryWidget(widget, historyView => !historyView.isRenderNewlines),
            execute: widget => this.withHistoryWidget(widget, historyView => {
                historyView.toggleRenderNewlines();
                this.renderNewlinesChangedEmitter.fire();
                return true;
            })
        });
        registry.registerCommand(exports.AI_HISTORY_VIEW_TOGGLE_HIDE_NEWLINES, {
            isEnabled: widget => this.withHistoryWidget(widget),
            isVisible: widget => this.withHistoryWidget(widget, historyView => historyView.isRenderNewlines),
            execute: widget => this.withHistoryWidget(widget, historyView => {
                historyView.toggleRenderNewlines();
                this.renderNewlinesChangedEmitter.fire();
                return true;
            })
        });
        registry.registerCommand(exports.AI_HISTORY_VIEW_CLEAR, {
            isEnabled: widget => this.withHistoryWidget(widget),
            isVisible: widget => this.withHistoryWidget(widget),
            execute: widget => this.withHistoryWidget(widget, () => {
                this.clearHistory();
                return true;
            })
        });
    }
    clearHistory() {
        this.languageModelService.sessions = [];
    }
    withHistoryWidget(widget = this.tryGetWidget(), predicate = () => true) {
        return widget instanceof ai_history_widget_1.AIHistoryView ? predicate(widget) : false;
    }
    registerToolbarItems(registry) {
        registry.registerItem({
            id: exports.AI_HISTORY_VIEW_SORT_CHRONOLOGICALLY.id,
            command: exports.AI_HISTORY_VIEW_SORT_CHRONOLOGICALLY.id,
            tooltip: core_1.nls.localize('theia/ai/history/sortChronologically/tooltip', 'Sort chronologically'),
            isVisible: widget => this.withHistoryWidget(widget),
            onDidChange: this.chronologicalStateChanged
        });
        registry.registerItem({
            id: exports.AI_HISTORY_VIEW_SORT_REVERSE_CHRONOLOGICALLY.id,
            command: exports.AI_HISTORY_VIEW_SORT_REVERSE_CHRONOLOGICALLY.id,
            tooltip: core_1.nls.localize('theia/ai/history/sortReverseChronologically/tooltip', 'Sort reverse chronologically'),
            isVisible: widget => this.withHistoryWidget(widget),
            onDidChange: this.chronologicalStateChanged
        });
        registry.registerItem({
            id: exports.AI_HISTORY_VIEW_TOGGLE_COMPACT.id,
            command: exports.AI_HISTORY_VIEW_TOGGLE_COMPACT.id,
            tooltip: core_1.nls.localize('theia/ai/history/toggleCompact/tooltip', 'Show compact view'),
            isVisible: widget => this.withHistoryWidget(widget, historyView => !historyView.isCompactView),
            onDidChange: this.compactViewStateChanged
        });
        registry.registerItem({
            id: exports.AI_HISTORY_VIEW_TOGGLE_RAW.id,
            command: exports.AI_HISTORY_VIEW_TOGGLE_RAW.id,
            tooltip: core_1.nls.localize('theia/ai/history/toggleRaw/tooltip', 'Show raw view'),
            isVisible: widget => this.withHistoryWidget(widget, historyView => historyView.isCompactView),
            onDidChange: this.compactViewStateChanged
        });
        registry.registerItem({
            id: exports.AI_HISTORY_VIEW_TOGGLE_RENDER_NEWLINES.id,
            command: exports.AI_HISTORY_VIEW_TOGGLE_RENDER_NEWLINES.id,
            tooltip: core_1.nls.localize('theia/ai/history/toggleRenderNewlines/tooltip', 'Interpret newlines'),
            isVisible: widget => this.withHistoryWidget(widget, historyView => !historyView.isRenderNewlines),
            onDidChange: this.renderNewlinesStateChanged
        });
        registry.registerItem({
            id: exports.AI_HISTORY_VIEW_TOGGLE_HIDE_NEWLINES.id,
            command: exports.AI_HISTORY_VIEW_TOGGLE_HIDE_NEWLINES.id,
            tooltip: core_1.nls.localize('theia/ai/history/toggleHideNewlines/tooltip', 'Stop interpreting newlines'),
            isVisible: widget => this.withHistoryWidget(widget, historyView => historyView.isRenderNewlines),
            onDidChange: this.renderNewlinesStateChanged
        });
        registry.registerItem({
            id: exports.AI_HISTORY_VIEW_CLEAR.id,
            command: exports.AI_HISTORY_VIEW_CLEAR.id,
            tooltip: core_1.nls.localize('theia/ai/history/clear/tooltip', 'Clear History of all agents'),
            isVisible: widget => this.withHistoryWidget(widget)
        });
        // Register the AI History view command for the chat view
        registry.registerItem({
            id: 'chat-view.' + exports.OPEN_AI_HISTORY_VIEW.id,
            command: exports.OPEN_AI_HISTORY_VIEW.id,
            tooltip: core_1.nls.localize('theia/ai/history/open-history-tooltip', 'Open AI history...'),
            group: 'ai-settings',
            priority: 1,
            isVisible: widget => this.activationService.isActive && widget instanceof chat_view_widget_1.ChatViewWidget
        });
    }
};
exports.AIHistoryViewContribution = AIHistoryViewContribution;
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_core_1.LanguageModelService),
    tslib_1.__metadata("design:type", Object)
], AIHistoryViewContribution.prototype, "languageModelService", void 0);
exports.AIHistoryViewContribution = AIHistoryViewContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)(),
    tslib_1.__metadata("design:paramtypes", [])
], AIHistoryViewContribution);
//# sourceMappingURL=ai-history-contribution.js.map