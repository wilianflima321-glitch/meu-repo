import { AbstractPluginManagerExt, EnvInit } from '@theia/plugin-ext';
import { KeysToKeysToAnyValue } from '@theia/plugin-ext/lib/common/types';
import { ExtPluginApi } from './plugin-ext-headless-api-contribution';
export declare const HEADLESSPLUGIN_RPC_CONTEXT: {
    MESSAGE_REGISTRY_MAIN: import("@theia/plugin-ext/lib/common/rpc-protocol").ProxyIdentifier<import("@theia/plugin-ext").MessageRegistryMain>;
    ENV_MAIN: import("@theia/plugin-ext/lib/common/rpc-protocol").ProxyIdentifier<import("@theia/plugin-ext").EnvMain>;
    NOTIFICATION_MAIN: import("@theia/plugin-ext/lib/common/rpc-protocol").ProxyIdentifier<import("@theia/plugin-ext").NotificationMain>;
    LOCALIZATION_MAIN: import("@theia/plugin-ext/lib/common/rpc-protocol").ProxyIdentifier<import("@theia/plugin-ext").LocalizationMain>;
};
export declare const HEADLESSMAIN_RPC_CONTEXT: {
    HOSTED_PLUGIN_MANAGER_EXT: import("@theia/plugin-ext/lib/common/rpc-protocol").ProxyIdentifier<HeadlessPluginManagerExt>;
    NOTIFICATION_EXT: import("@theia/plugin-ext/lib/common/rpc-protocol").ProxyIdentifier<import("@theia/plugin-ext").NotificationExt>;
};
export type HeadlessEnvInit = Pick<EnvInit, 'language' | 'shell' | 'appName' | 'appHost'>;
export interface HeadlessPluginManagerInitializeParams {
    activationEvents: string[];
    globalState: KeysToKeysToAnyValue;
    env: HeadlessEnvInit;
    extApi?: ExtPluginApi[];
}
export interface HeadlessPluginManagerExt extends AbstractPluginManagerExt<HeadlessPluginManagerInitializeParams> {
}
//# sourceMappingURL=headless-plugin-rpc.d.ts.map