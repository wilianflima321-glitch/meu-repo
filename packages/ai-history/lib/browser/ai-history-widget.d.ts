/// <reference types="react" />
import { Agent, AgentService, LanguageModelService, SessionEvent } from '@theia/ai-core';
import { LanguageModelExchange } from '@theia/ai-core/lib/common/language-model-interaction-model';
import { ReactWidget, StatefulWidget } from '@theia/core/lib/browser';
import * as React from '@theia/core/shared/react';
declare namespace AIHistoryView {
    interface State {
        chronological: boolean;
        compactView: boolean;
        renderNewlines: boolean;
        selectedAgentId?: string;
    }
}
export declare class AIHistoryView extends ReactWidget implements StatefulWidget {
    protected languageModelService: LanguageModelService;
    protected readonly agentService: AgentService;
    static ID: string;
    static LABEL: string;
    protected _state: AIHistoryView.State;
    constructor();
    protected get state(): AIHistoryView.State;
    protected set state(state: AIHistoryView.State);
    storeState(): object;
    restoreState(oldState: object & Partial<AIHistoryView.State>): void;
    protected init(): void;
    protected selectAgent(agent: Agent | undefined): void;
    protected historyContentUpdated(event: SessionEvent): void;
    render(): React.ReactNode;
    protected renderHistory(): React.ReactNode;
    /**
     * Get all exchanges for a specific agent.
     * Includes all exchanges in which the agent is involved, either as the main exchange or as a sub-request.
     * @param agentId The agent ID to filter by
     */
    protected getExchangesByAgent(agentId: string): LanguageModelExchange[];
    sortHistory(chronological: boolean): void;
    toggleCompactView(): void;
    toggleRenderNewlines(): void;
    get isChronological(): boolean;
    get isCompactView(): boolean;
    get isRenderNewlines(): boolean;
}
export {};
//# sourceMappingURL=ai-history-widget.d.ts.map