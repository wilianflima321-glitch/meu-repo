import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { AnthropicLanguageModelsManager, AnthropicModelDescription } from '../common';
import { AICorePreferences } from '@theia/ai-core/lib/common/ai-core-preferences';
import { PreferenceService } from '@theia/core';
export declare class AnthropicFrontendApplicationContribution implements FrontendApplicationContribution {
    protected preferenceService: PreferenceService;
    protected manager: AnthropicLanguageModelsManager;
    protected aiCorePreferences: AICorePreferences;
    protected prevModels: string[];
    onStart(): void;
    protected handleModelChanges(newModels: string[]): void;
    protected updateAllModels(): void;
    protected createAnthropicModelDescription(modelId: string): AnthropicModelDescription;
}
//# sourceMappingURL=anthropic-frontend-application-contribution.d.ts.map