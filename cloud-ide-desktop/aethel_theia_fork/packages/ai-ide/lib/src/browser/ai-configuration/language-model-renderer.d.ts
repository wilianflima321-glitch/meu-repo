import * as React from '@theia/core/shared/react';
import { Agent, AISettingsService, FrontendLanguageModelRegistry, LanguageModel } from '@theia/ai-core/lib/common';
import { LanguageModelAlias } from '@theia/ai-core/lib/common/language-model-alias';
export interface LanguageModelSettingsProps {
    agent: Agent;
    languageModels?: LanguageModel[];
    aiSettingsService: AISettingsService;
    languageModelRegistry: FrontendLanguageModelRegistry;
    languageModelAliases: LanguageModelAlias[];
}
export declare const LanguageModelRenderer: React.FC<LanguageModelSettingsProps>;
