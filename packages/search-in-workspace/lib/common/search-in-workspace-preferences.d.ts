import { PreferenceProxy, PreferenceService } from '@theia/core/lib/common/preferences';
import { interfaces } from '@theia/core/shared/inversify';
import { PreferenceSchema } from '@theia/core/lib/common/preferences/preference-schema';
export declare const searchInWorkspacePreferencesSchema: PreferenceSchema;
export declare class SearchInWorkspaceConfiguration {
    'search.lineNumbers': boolean;
    'search.collapseResults': string;
    'search.searchOnType': boolean;
    'search.searchOnTypeDebouncePeriod': number;
    'search.searchOnEditorModification': boolean;
    'search.smartCase': boolean;
    'search.followSymlinks': boolean;
}
export declare const SearchInWorkspacePreferenceContribution: unique symbol;
export declare const SearchInWorkspacePreferences: unique symbol;
export type SearchInWorkspacePreferences = PreferenceProxy<SearchInWorkspaceConfiguration>;
export declare function createSearchInWorkspacePreferences(preferences: PreferenceService, schema?: PreferenceSchema): SearchInWorkspacePreferences;
export declare function bindSearchInWorkspacePreferences(bind: interfaces.Bind): void;
//# sourceMappingURL=search-in-workspace-preferences.d.ts.map