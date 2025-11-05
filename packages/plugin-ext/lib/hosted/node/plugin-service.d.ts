import { HostedPluginServer, HostedPluginClient, DeployedPlugin, PluginIdentifiers } from '../../common/plugin-protocol';
import { HostedPluginSupport } from './hosted-plugin';
import { ILogger, ContributionProvider, DisposableCollection } from '@theia/core';
import { ExtPluginApiProvider, ExtPluginApi } from '../../common/plugin-ext-api-contribution';
import { PluginDeployerHandlerImpl } from './plugin-deployer-handler-impl';
import { PluginDeployerImpl } from '../../main/node/plugin-deployer-impl';
import { HostedPluginLocalizationService } from './hosted-plugin-localization-service';
import { PluginUninstallationManager } from '../../main/node/plugin-uninstallation-manager';
import { Deferred } from '@theia/core/lib/common/promise-util';
export declare const BackendPluginHostableFilter: unique symbol;
/**
 * A filter matching backend plugins that are hostable in my plugin host process.
 * Only if at least one backend plugin is deployed that matches my filter will I
 * start the host process.
 */
export type BackendPluginHostableFilter = (plugin: DeployedPlugin) => boolean;
/**
 * This class implements the per-front-end services for plugin management and communication
 */
export declare class HostedPluginServerImpl implements HostedPluginServer {
    private readonly hostedPlugin;
    protected readonly logger: ILogger;
    protected readonly deployerHandler: PluginDeployerHandlerImpl;
    protected readonly pluginDeployer: PluginDeployerImpl;
    protected readonly localizationService: HostedPluginLocalizationService;
    protected readonly extPluginAPIContributions: ContributionProvider<ExtPluginApiProvider>;
    protected readonly uninstallationManager: PluginUninstallationManager;
    protected backendPluginHostableFilter: BackendPluginHostableFilter;
    protected client: HostedPluginClient | undefined;
    protected toDispose: DisposableCollection;
    protected uninstalledPlugins: Set<PluginIdentifiers.VersionedId>;
    protected disabledPlugins: Set<PluginIdentifiers.VersionedId>;
    protected readonly pluginVersions: Map<`${string}.${string}`, string>;
    protected readonly initialized: Deferred<void>;
    constructor(hostedPlugin: HostedPluginSupport);
    protected init(): void;
    protected getServerName(): string;
    dispose(): void;
    setClient(client: HostedPluginClient): void;
    getDeployedPluginIds(): Promise<PluginIdentifiers.VersionedId[]>;
    /**
     * Ensures that the plugin was not uninstalled when this session was started
     * and that it matches the first version of the given plugin seen by this session.
     *
     * The deployment system may have multiple versions of the same plugin available, but
     * a single session should only ever activate one of them.
     */
    protected isRelevantPlugin(identifier: PluginIdentifiers.VersionedId): boolean;
    getUninstalledPluginIds(): Promise<readonly PluginIdentifiers.VersionedId[]>;
    getDisabledPluginIds(): Promise<readonly PluginIdentifiers.VersionedId[]>;
    getDeployedPlugins(pluginIds: PluginIdentifiers.VersionedId[]): Promise<DeployedPlugin[]>;
    onMessage(pluginHostId: string, message: Uint8Array): Promise<void>;
    getExtPluginAPI(): Promise<ExtPluginApi[]>;
}
//# sourceMappingURL=plugin-service.d.ts.map