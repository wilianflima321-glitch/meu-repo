import { FrontendApplication } from '@theia/core/lib/browser';
import { AIViewContribution } from '@theia/ai-core/lib/browser';
import { AIHistoryView } from './ai-history-widget';
import { Command, CommandRegistry, Emitter } from '@theia/core';
import { TabBarToolbarContribution, TabBarToolbarRegistry } from '@theia/core/lib/browser/shell/tab-bar-toolbar';
export declare const AI_HISTORY_TOGGLE_COMMAND_ID = "aiHistory:toggle";
export declare const OPEN_AI_HISTORY_VIEW: Command;
export declare const AI_HISTORY_VIEW_SORT_CHRONOLOGICALLY: Command;
export declare const AI_HISTORY_VIEW_SORT_REVERSE_CHRONOLOGICALLY: Command;
export declare const AI_HISTORY_VIEW_TOGGLE_COMPACT: Command;
export declare const AI_HISTORY_VIEW_TOGGLE_RAW: Command;
export declare const AI_HISTORY_VIEW_TOGGLE_RENDER_NEWLINES: Command;
export declare const AI_HISTORY_VIEW_TOGGLE_HIDE_NEWLINES: Command;
export declare const AI_HISTORY_VIEW_CLEAR: Command;
export declare class AIHistoryViewContribution extends AIViewContribution<AIHistoryView> implements TabBarToolbarContribution {
    private languageModelService;
    protected readonly chronologicalChangedEmitter: Emitter<void>;
    protected readonly chronologicalStateChanged: import("@theia/core").Event<void>;
    protected readonly compactViewChangedEmitter: Emitter<void>;
    protected readonly compactViewStateChanged: import("@theia/core").Event<void>;
    protected readonly renderNewlinesChangedEmitter: Emitter<void>;
    protected readonly renderNewlinesStateChanged: import("@theia/core").Event<void>;
    constructor();
    initializeLayout(_app: FrontendApplication): Promise<void>;
    registerCommands(registry: CommandRegistry): void;
    clearHistory(): void;
    protected withHistoryWidget(widget?: unknown, predicate?: (output: AIHistoryView) => boolean): boolean | false;
    registerToolbarItems(registry: TabBarToolbarRegistry): void;
}
//# sourceMappingURL=ai-history-contribution.d.ts.map