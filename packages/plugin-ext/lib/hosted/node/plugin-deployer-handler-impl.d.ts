import { ILogger } from '@theia/core';
import { PluginDeployerHandler, PluginDeployerEntry, PluginEntryPoint, DeployedPlugin, PluginDependencies, PluginIdentifiers } from '../../common/plugin-protocol';
import { Stopwatch } from '@theia/core/lib/common';
import { PluginUninstallationManager } from '../../main/node/plugin-uninstallation-manager';
export declare class PluginDeployerHandlerImpl implements PluginDeployerHandler {
    protected readonly logger: ILogger;
    private readonly reader;
    private readonly localizationService;
    protected readonly stopwatch: Stopwatch;
    protected readonly uninstallationManager: PluginUninstallationManager;
    private readonly deployedLocations;
    protected readonly sourceLocations: Map<`${string}.${string}@${string}`, Set<string>>;
    /**
     * Managed plugin metadata backend entries.
     */
    private readonly deployedBackendPlugins;
    /**
     * Managed plugin metadata frontend entries.
     */
    private readonly deployedFrontendPlugins;
    private backendPluginsMetadataDeferred;
    private frontendPluginsMetadataDeferred;
    getDeployedFrontendPluginIds(): Promise<PluginIdentifiers.VersionedId[]>;
    getDeployedBackendPluginIds(): Promise<PluginIdentifiers.VersionedId[]>;
    getDeployedBackendPlugins(): Promise<DeployedPlugin[]>;
    getDeployedPluginIds(): Promise<readonly PluginIdentifiers.VersionedId[]>;
    getDeployedPlugins(): Promise<DeployedPlugin[]>;
    getDeployedPluginsById(pluginId: string): DeployedPlugin[];
    getDeployedPlugin(pluginId: PluginIdentifiers.VersionedId): DeployedPlugin | undefined;
    /**
     * @throws never! in order to isolate plugin deployment
     */
    getPluginDependencies(entry: PluginDeployerEntry): Promise<PluginDependencies | undefined>;
    deployFrontendPlugins(frontendPlugins: PluginDeployerEntry[]): Promise<number>;
    deployBackendPlugins(backendPlugins: PluginDeployerEntry[]): Promise<number>;
    /**
     * @throws never! in order to isolate plugin deployment.
     * @returns whether the plugin is deployed after running this function. If the plugin was already installed, will still return `true`.
     */
    protected deployPlugin(entry: PluginDeployerEntry, entryPoint: keyof PluginEntryPoint): Promise<boolean>;
    uninstallPlugin(pluginId: PluginIdentifiers.VersionedId): Promise<boolean>;
    protected markAsInstalled(id: PluginIdentifiers.VersionedId): void;
    undeployPlugin(pluginId: PluginIdentifiers.VersionedId): Promise<boolean>;
    protected setSourceLocationsForPlugin(id: PluginIdentifiers.VersionedId, entry: PluginDeployerEntry): void;
    enablePlugin(pluginId: PluginIdentifiers.VersionedId): Promise<boolean>;
    disablePlugin(pluginId: PluginIdentifiers.VersionedId): Promise<boolean>;
}
//# sourceMappingURL=plugin-deployer-handler-impl.d.ts.map