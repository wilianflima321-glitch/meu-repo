import { interfaces } from '@theia/core/shared/inversify';
import { PreferenceProxy, PreferenceSchema, PreferenceService } from '@theia/core/lib/common/preferences';
export declare const scmPreferenceSchema: PreferenceSchema;
export interface ScmConfiguration {
    'scm.defaultViewMode': 'tree' | 'list';
}
export declare const ScmPreferenceContribution: unique symbol;
export declare const ScmPreferences: unique symbol;
export type ScmPreferences = PreferenceProxy<ScmConfiguration>;
export declare function createScmPreferences(preferences: PreferenceService, schema?: PreferenceSchema): ScmPreferences;
export declare function bindScmPreferences(bind: interfaces.Bind): void;
//# sourceMappingURL=scm-preferences.d.ts.map