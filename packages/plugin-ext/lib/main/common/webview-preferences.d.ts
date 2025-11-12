import { interfaces } from '@theia/core/shared/inversify';
import { PreferenceProxy, PreferenceSchema, PreferenceService } from '@theia/core/lib/common/preferences';
export declare const WebviewConfigSchema: PreferenceSchema;
export interface WebviewConfiguration {
    'webview.trace': 'off' | 'on' | 'verbose';
    'webview.warnIfUnsecure'?: boolean;
}
export declare const WebviewPreferenceContribution: unique symbol;
export declare const WebviewPreferences: unique symbol;
export type WebviewPreferences = PreferenceProxy<WebviewConfiguration>;
export declare function createWebviewPreferences(preferences: PreferenceService, schema?: PreferenceSchema): WebviewPreferences;
export declare function bindWebviewPreferences(bind: interfaces.Bind): void;
//# sourceMappingURL=webview-preferences.d.ts.map