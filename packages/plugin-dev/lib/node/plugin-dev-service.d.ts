import { PluginDebugConfiguration, PluginDevServer, PluginDevClient } from '../common/plugin-dev-protocol';
import { HostedInstanceManager } from './hosted-instance-manager';
import { PluginMetadata } from '@theia/plugin-ext/lib/common/plugin-protocol';
import URI from '@theia/core/lib/common/uri';
import { HostedPluginsManager } from './hosted-plugins-manager';
export declare class PluginDevServerImpl implements PluginDevServer {
    protected readonly hostedPluginsManager: HostedPluginsManager;
    protected readonly hostedInstanceManager: HostedInstanceManager;
    private readonly reader;
    private readonly hostedPlugin;
    dispose(): void;
    setClient(client: PluginDevClient): void;
    getHostedPlugin(): Promise<PluginMetadata | undefined>;
    isPluginValid(uri: string): Promise<boolean>;
    runHostedPluginInstance(uri: string): Promise<string>;
    runDebugHostedPluginInstance(uri: string, debugConfig: PluginDebugConfiguration): Promise<string>;
    terminateHostedPluginInstance(): Promise<void>;
    isHostedPluginInstanceRunning(): Promise<boolean>;
    getHostedPluginInstanceURI(): Promise<string>;
    getHostedPluginURI(): Promise<string>;
    protected uriToStrPromise(promise: Promise<URI>): Promise<string>;
    runWatchCompilation(path: string): Promise<void>;
    stopWatchCompilation(path: string): Promise<void>;
    isWatchCompilationRunning(path: string): Promise<boolean>;
}
//# sourceMappingURL=plugin-dev-service.d.ts.map