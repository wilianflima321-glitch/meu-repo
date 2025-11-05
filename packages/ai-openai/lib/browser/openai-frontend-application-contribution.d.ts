import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { OpenAiLanguageModelsManager, OpenAiModelDescription } from '../common';
import { AICorePreferences } from '@theia/ai-core/lib/common/ai-core-preferences';
import { PreferenceService } from '@theia/core';
export declare class OpenAiFrontendApplicationContribution implements FrontendApplicationContribution {
    protected preferenceService: PreferenceService;
    protected manager: OpenAiLanguageModelsManager;
    protected aiCorePreferences: AICorePreferences;
    protected prevModels: string[];
    protected prevCustomModels: Partial<OpenAiModelDescription>[];
    onStart(): void;
    protected handleModelChanges(newModels: string[]): void;
    protected handleCustomModelChanges(newCustomModels: Partial<OpenAiModelDescription>[]): void;
    protected updateAllModels(): void;
    protected createOpenAIModelDescription(modelId: string): OpenAiModelDescription;
    protected createCustomModelDescriptionsFromPreferences(preferences: Partial<OpenAiModelDescription>[]): OpenAiModelDescription[];
}
//# sourceMappingURL=openai-frontend-application-contribution.d.ts.map