import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { OllamaLanguageModelsManager, OllamaModelDescription } from '../common';
import { PreferenceService } from '@theia/core';
export declare class OllamaFrontendApplicationContribution implements FrontendApplicationContribution {
    protected preferenceService: PreferenceService;
    protected manager: OllamaLanguageModelsManager;
    protected prevModels: string[];
    onStart(): void;
    protected handleModelChanges(newModels: string[]): void;
    protected createOllamaModelDescription(modelId: string): OllamaModelDescription;
}
//# sourceMappingURL=ollama-frontend-application-contribution.d.ts.map