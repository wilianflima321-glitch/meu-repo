import * as React from '@theia/core/shared/react';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { LanguageModelAliasRegistry, LanguageModelAlias } from '@theia/ai-core/lib/common/language-model-alias';
import { FrontendLanguageModelRegistry, LanguageModel, LanguageModelRegistry } from '@theia/ai-core/lib/common/language-model';
import { AIConfigurationSelectionService } from './ai-configuration-service';
import { AgentService, AISettingsService } from '@theia/ai-core';
export interface ModelAliasesConfigurationProps {
    languageModelAliasRegistry: LanguageModelAliasRegistry;
    languageModelRegistry: LanguageModelRegistry;
}
export declare class ModelAliasesConfigurationWidget extends ReactWidget {
    static readonly ID = "ai-model-aliases-configuration-widget";
    static readonly LABEL: string;
    private _languageModelAliasRegistry?;
    protected set languageModelAliasRegistry(v: LanguageModelAliasRegistry);
    protected get languageModelAliasRegistry(): LanguageModelAliasRegistry;
    private _languageModelRegistry?;
    protected set languageModelRegistry(v: FrontendLanguageModelRegistry);
    protected get languageModelRegistry(): FrontendLanguageModelRegistry;
    private _aiConfigurationSelectionService?;
    protected set aiConfigurationSelectionService(v: AIConfigurationSelectionService);
    protected get aiConfigurationSelectionService(): AIConfigurationSelectionService;
    private _aiSettingsService?;
    protected set aiSettingsService(v: AISettingsService);
    protected get aiSettingsService(): AISettingsService;
    private _agentService?;
    protected set agentService(v: AgentService);
    protected get agentService(): AgentService;
    protected aliases: LanguageModelAlias[];
    protected languageModels: LanguageModel[];
    /**
     * Map from alias ID to a list of agent IDs that have a language model requirement for that alias.
     */
    protected matchingAgentIdsForAliasMap: Map<string, string[]>;
    /**
     * Map from alias ID to the resolved LanguageModel (what the alias currently evaluates to).
     */
    protected resolvedModelForAlias: Map<string, LanguageModel | undefined>;
    protected init(): void;
    protected loadAliases(): Promise<void>;
    protected loadLanguageModels(): Promise<void>;
    /**
     * Loads a map from alias ID to a list of agent IDs that have a language model requirement for that alias.
     */
    protected loadMatchingAgentIdsForAllAliases(): Promise<void>;
    protected handleAliasSelectedModelIdChange: (alias: LanguageModelAlias, event: React.ChangeEvent<HTMLSelectElement>) => void;
    render(): React.ReactNode;
    protected renderAliasDetail(alias: LanguageModelAlias, languageModels: LanguageModel[]): React.ReactNode;
}
