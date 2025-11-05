import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { DefaultPromptFragmentCustomizationService } from '@theia/ai-core/lib/browser/frontend-prompt-customization-service';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { PreferenceService } from '@theia/core';
export declare class TemplatePreferenceContribution implements FrontendApplicationContribution {
    protected readonly preferenceService: PreferenceService;
    protected readonly customizationService: DefaultPromptFragmentCustomizationService;
    protected readonly workspaceService: WorkspaceService;
    onStart(): void;
    /**
     * Updates the template configuration in the customization service.
     * If a specific preference name is provided, only that configuration aspect is updated.
     * @param changedPreference Optional name of the preference that changed
     */
    protected updateConfiguration(changedPreference?: string): Promise<void>;
}
//# sourceMappingURL=template-preference-contribution.d.ts.map