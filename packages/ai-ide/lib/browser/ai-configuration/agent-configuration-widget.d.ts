import { Agent, AgentService, AISettingsService, AIVariableService, FrontendLanguageModelRegistry, LanguageModel, PromptFragmentCustomizationService, PromptService } from '@theia/ai-core/lib/common';
import { QuickInputService, ReactWidget } from '@theia/core/lib/browser';
import { URI } from '@theia/core/lib/common';
import * as React from '@theia/core/shared/react';
import { AIConfigurationSelectionService } from './ai-configuration-service';
import { LanguageModelAliasRegistry, LanguageModelAlias } from '@theia/ai-core/lib/common/language-model-alias';
export declare class AIAgentConfigurationWidget extends ReactWidget {
    static readonly ID = "ai-agent-configuration-container-widget";
    static readonly LABEL: any;
    protected readonly agentService: AgentService;
    protected readonly languageModelRegistry: FrontendLanguageModelRegistry;
    protected readonly promptFragmentCustomizationService: PromptFragmentCustomizationService;
    protected readonly languageModelAliasRegistry: LanguageModelAliasRegistry;
    protected readonly aiSettingsService: AISettingsService;
    protected readonly aiConfigurationSelectionService: AIConfigurationSelectionService;
    protected readonly variableService: AIVariableService;
    protected promptService: PromptService;
    protected readonly quickInputService: QuickInputService;
    protected languageModels: LanguageModel[] | undefined;
    protected languageModelAliases: LanguageModelAlias[];
    protected init(): void;
    /**
     * Normalize and push a disposable-like value into this.toDispose.
     * Accepts functions, objects with a dispose() method, or disposables.
     */
    protected pushDisposable(d: any): void;
    protected normalizeLocation(raw: any): {
        uri: URI;
        exists: boolean;
    };
    protected render(): React.ReactNode;
    private renderAgentName;
    private renderAgentDetails;
    private parsePromptFragmentsForVariableAndFunction;
    protected showVariableConfigurationTab(): void;
    protected addCustomAgent(): Promise<void>;
    protected setActiveAgent(agent: Agent): void;
    private toggleAgentEnabled;
}
//# sourceMappingURL=agent-configuration-widget.d.ts.map