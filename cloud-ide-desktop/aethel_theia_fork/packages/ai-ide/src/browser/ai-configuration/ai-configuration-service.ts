import { Agent } from '@theia/ai-core/lib/common';
import { Emitter } from '@theia/core';

// Minimal runtime stub used during type-checking and initial compilation.
// This mirrors the shape used by ai-ide code; full implementation lives upstream.
export class AIConfigurationSelectionService {
    protected activeAgent?: Agent;
    protected selectedAliasId?: string;
    protected readonly onDidSelectConfigurationEmitter = new Emitter<string>();
    public onDidSelectConfiguration = this.onDidSelectConfigurationEmitter.event as any;
    protected readonly onDidAgentChangeEmitter = new Emitter<Agent | undefined>();
    public onDidAgentChange = this.onDidAgentChangeEmitter.event as any;
    protected readonly onDidAliasChangeEmitter = new Emitter<string | undefined>();
    public onDidAliasChange = this.onDidAliasChangeEmitter.event as any;

    getActiveAgent(): Agent | undefined { return this.activeAgent; }
    setActiveAgent(agent?: Agent): void { this.activeAgent = agent; this.onDidAgentChangeEmitter.fire(agent); }
    getSelectedAliasId(): string | undefined { return this.selectedAliasId; }
    setSelectedAliasId(aliasId?: string): void { this.selectedAliasId = aliasId; this.onDidAliasChangeEmitter.fire(aliasId); }
    selectConfigurationTab(widgetId: string): void {
        this.onDidSelectConfigurationEmitter.fire(widgetId);
    }
}
