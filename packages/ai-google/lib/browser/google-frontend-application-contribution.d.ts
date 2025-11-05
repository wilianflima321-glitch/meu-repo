import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { GoogleLanguageModelsManager, GoogleModelDescription } from '../common';
import { PreferenceService } from '@theia/core';
export declare class GoogleFrontendApplicationContribution implements FrontendApplicationContribution {
    protected preferenceService: PreferenceService;
    protected manager: GoogleLanguageModelsManager;
    protected prevModels: string[];
    onStart(): void;
    /**
     * Called when the API key changes. Updates all Google models on the manager to ensure the new key is used.
     */
    protected handleKeyChange(newApiKey: string | undefined): void;
    protected handleModelChanges(newModels: string[]): void;
    protected createGeminiModelDescription(modelId: string): GoogleModelDescription;
}
//# sourceMappingURL=google-frontend-application-contribution.d.ts.map