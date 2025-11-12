import { PreferenceProxy } from '@theia/core/lib/common/preferences/preference-proxy';
import { PreferenceSchema } from '@theia/core/lib/common/preferences/preference-schema';
export declare const TOOLBAR_ENABLE_PREFERENCE_ID = "toolbar.showToolbar";
export declare const ToolbarPreferencesSchema: PreferenceSchema;
declare class ToolbarPreferencesContribution {
    [TOOLBAR_ENABLE_PREFERENCE_ID]: boolean;
}
export declare const ToolbarPreferences: unique symbol;
export type ToolbarPreferences = PreferenceProxy<ToolbarPreferencesContribution>;
export {};
//# sourceMappingURL=toolbar-preference-contribution.d.ts.map