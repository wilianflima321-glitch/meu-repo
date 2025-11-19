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
    protected readonly languageModelAliasRegistry: LanguageModelAliasRegistry;
    protected readonly languageModelRegistry: FrontendLanguageModelRegistry;
    protected readonly aiConfigurationSelectionService: AIConfigurationSelectionService;
    protected readonly aiSettingsService: AISettingsService;
    protected readonly agentService: AgentService;
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
//# sourceMappingURL=model-aliases-configuration-widget.d.ts.map