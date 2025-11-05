import { CancellationToken } from '@theia/core/lib/common/cancellation';
import { PluginDeployerImpl } from './plugin-deployer-impl';
import { PluginsKeyValueStorage } from './plugins-key-value-storage';
import { PluginServer, PluginStorageKind, PluginType, UnresolvedPluginEntry, PluginIdentifiers, PluginDeployOptions, PluginDeployerHandler } from '../../common/plugin-protocol';
import { KeysToAnyValues, KeysToKeysToAnyValue } from '../../common/types';
import { PluginUninstallationManager } from './plugin-uninstallation-manager';
export declare class PluginServerImpl implements PluginServer {
    protected readonly pluginDeployer: PluginDeployerImpl;
    protected readonly pluginDeployerHandler: PluginDeployerHandler;
    protected readonly pluginsKeyValueStorage: PluginsKeyValueStorage;
    protected readonly uninstallationManager: PluginUninstallationManager;
    install(pluginEntry: string, arg2?: PluginType | CancellationToken, options?: PluginDeployOptions): Promise<void>;
    protected doInstall(pluginEntry: UnresolvedPluginEntry, options?: PluginDeployOptions): Promise<number>;
    getInstalledPlugins(): Promise<readonly PluginIdentifiers.VersionedId[]>;
    getUninstalledPlugins(): Promise<readonly PluginIdentifiers.VersionedId[]>;
    getDisabledPlugins(): Promise<readonly PluginIdentifiers.VersionedId[]>;
    uninstall(pluginId: PluginIdentifiers.VersionedId): Promise<void>;
    enablePlugin(pluginId: PluginIdentifiers.VersionedId): Promise<boolean>;
    disablePlugin(pluginId: PluginIdentifiers.VersionedId): Promise<boolean>;
    setStorageValue(key: string, value: KeysToAnyValues, kind: PluginStorageKind): Promise<boolean>;
    getStorageValue(key: string, kind: PluginStorageKind): Promise<KeysToAnyValues>;
    getAllStorageValues(kind: PluginStorageKind): Promise<KeysToKeysToAnyValue>;
}
//# sourceMappingURL=plugin-server-impl.d.ts.map