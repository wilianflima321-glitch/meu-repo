import { Agent } from '@theia/ai-core/lib/common';
import { Emitter } from '@theia/core';
export declare class AIConfigurationSelectionService {
    protected activeAgent?: Agent;
    protected selectedAliasId?: string;
    protected readonly onDidSelectConfigurationEmitter: Emitter<string>;
    onDidSelectConfiguration: any;
    protected readonly onDidAgentChangeEmitter: Emitter<Agent | undefined>;
    onDidAgentChange: any;
    protected readonly onDidAliasChangeEmitter: Emitter<string | undefined>;
    onDidAliasChange: any;
    getActiveAgent(): Agent | undefined;
    setActiveAgent(agent?: Agent): void;
    getSelectedAliasId(): string | undefined;
    setSelectedAliasId(aliasId?: string): void;
    selectConfigurationTab(widgetId: string): void;
}
