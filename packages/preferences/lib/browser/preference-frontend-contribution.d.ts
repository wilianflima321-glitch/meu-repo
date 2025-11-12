import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { CliPreferences } from '../common/cli-preferences';
import { PreferenceService } from '@theia/core/lib/common/preferences';
export declare class PreferenceFrontendContribution implements FrontendApplicationContribution {
    protected readonly CliPreferences: CliPreferences;
    protected readonly preferenceService: PreferenceService;
    onStart(): void;
}
//# sourceMappingURL=preference-frontend-contribution.d.ts.map