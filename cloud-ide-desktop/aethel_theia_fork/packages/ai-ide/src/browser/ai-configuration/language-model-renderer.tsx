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

export const LanguageModelRenderer: React.FC<LanguageModelSettingsProps> = () => {
    // Minimal stub for type-check; full implementation upstream.
    return null;
};
