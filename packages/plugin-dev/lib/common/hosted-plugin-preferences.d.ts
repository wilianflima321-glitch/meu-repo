import { interfaces } from '@theia/core/shared/inversify';
import { PreferenceProxy, PreferenceSchema, PreferenceService } from '@theia/core/lib/common';
import { PluginDebugPort } from './plugin-dev-protocol';
export declare const HostedPluginConfigSchema: PreferenceSchema;
export interface HostedPluginConfiguration {
    'hosted-plugin.watchMode': boolean;
    'hosted-plugin.debugMode': string;
    'hosted-plugin.launchOutFiles': string[];
    'hosted-plugin.debugPorts': PluginDebugPort[];
}
export declare const HostedPluginPreferenceContribution: unique symbol;
export declare const HostedPluginPreferences: unique symbol;
export type HostedPluginPreferences = PreferenceProxy<HostedPluginConfiguration>;
export declare function createNavigatorPreferences(preferences: PreferenceService, schema?: PreferenceSchema): HostedPluginPreferences;
export declare function bindHostedPluginPreferences(bind: interfaces.Bind): void;
//# sourceMappingURL=hosted-plugin-preferences.d.ts.map