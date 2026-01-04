import { Agent, AgentService, AISettingsService, AIVariableService, FrontendLanguageModelRegistry, LanguageModel, PromptFragmentCustomizationService, PromptService } from '@theia/ai-core/lib/common';
import { QuickInputService, ReactWidget } from '@theia/core/lib/browser';
import { URI } from '@theia/core/lib/common';
import * as React from '@theia/core/shared/react';
import { AIConfigurationSelectionService } from './ai-configuration-service';
import { LanguageModelAliasRegistry, LanguageModelAlias } from '@theia/ai-core/lib/common/language-model-alias';
export declare class AIAgentConfigurationWidget extends ReactWidget {
    static readonly ID = "ai-agent-configuration-container-widget";
    static readonly LABEL: string;
    private _agentService?;
    protected set agentService(v: AgentService);
    protected get agentService(): AgentService;
    private _languageModelRegistry?;
    protected set languageModelRegistry(v: FrontendLanguageModelRegistry);
    protected get languageModelRegistry(): FrontendLanguageModelRegistry;
    private _promptFragmentCustomizationService?;
    protected set promptFragmentCustomizationService(v: PromptFragmentCustomizationService);
    protected get promptFragmentCustomizationService(): PromptFragmentCustomizationService;
    private _languageModelAliasRegistry?;
    protected set languageModelAliasRegistry(v: LanguageModelAliasRegistry);
    protected get languageModelAliasRegistry(): LanguageModelAliasRegistry;
    private _aiSettingsService?;
    protected set aiSettingsService(v: AISettingsService);
    protected get aiSettingsService(): AISettingsService;
    private _aiConfigurationSelectionService?;
    protected set aiConfigurationSelectionService(v: AIConfigurationSelectionService);
    protected get aiConfigurationSelectionService(): AIConfigurationSelectionService;
    private _variableService?;
    protected set variableService(v: AIVariableService);
    protected get variableService(): AIVariableService;
    private _promptService?;
    protected set promptService(v: PromptService);
    protected get promptService(): PromptService;
    private _quickInputService?;
    protected set quickInputService(v: QuickInputService);
    protected get quickInputService(): QuickInputService;
    protected languageModels: LanguageModel[] | undefined;
    protected languageModelAliases: LanguageModelAlias[];
    protected init(): void;
    /**
     * Normalize and push a disposable-like value into this.toDispose.
     * Accepts functions, objects with a dispose() method, or disposables.
     */
    pushDisposable(d: unknown): void;
    /**
     * Safely format a runtime URI-like object into a displayable label.
     * Accepts real URI instances or plain strings/objects that have a `path` property.
     */
    protected formatUriLabel(uriRaw: unknown): string;
    protected normalizeLocation(raw: unknown): {
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
