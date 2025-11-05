import { interfaces } from '@theia/core/shared/inversify';
import { PreferenceProxy } from '@theia/core/lib/common/preferences/preference-proxy';
import { PreferenceSchema } from '@theia/core/lib/common/preferences/preference-schema';
import { PreferenceService } from '@theia/core';
export declare const TestConfigSchema: PreferenceSchema;
export interface TestConfiguration {
    'testing.openTesting': 'neverOpen' | 'openOnTestStart';
}
export declare const TestPreferenceContribution: unique symbol;
export declare const TestPreferences: unique symbol;
export type TestPreferences = PreferenceProxy<TestConfiguration>;
export declare function createTestPreferences(preferences: PreferenceService, schema?: PreferenceSchema): TestPreferences;
export declare const bindTestPreferences: (bind: interfaces.Bind) => void;
//# sourceMappingURL=test-preferences.d.ts.map