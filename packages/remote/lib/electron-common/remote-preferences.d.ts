import { interfaces } from '@theia/core/shared/inversify';
import { PreferenceProxy } from '@theia/core/lib/common/preferences/preference-proxy';
import { PreferenceSchema } from '@theia/core/lib/common/preferences/preference-schema';
export declare const RemotePreferenceSchema: PreferenceSchema;
export interface RemoteConfiguration {
    'remote.nodeDownloadTemplate': string;
    'remote.ssh.configFile': string;
}
export declare const RemotePreferenceContribution: unique symbol;
export declare const RemotePreferences: unique symbol;
export type RemotePreferences = PreferenceProxy<RemoteConfiguration>;
export declare function bindRemotePreferences(bind: interfaces.Bind): void;
//# sourceMappingURL=remote-preferences.d.ts.map