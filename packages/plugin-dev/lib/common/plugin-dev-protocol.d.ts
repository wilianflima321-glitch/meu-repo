import { RpcServer } from '@theia/core/lib/common/messaging/proxy-factory';
import { PluginMetadata } from '@theia/plugin-ext/lib/common/plugin-protocol';
export declare const pluginDevServicePath = "/services/plugin-dev";
export declare const PluginDevServer: unique symbol;
export interface PluginDevServer extends RpcServer<PluginDevClient> {
    getHostedPlugin(): Promise<PluginMetadata | undefined>;
    runHostedPluginInstance(uri: string): Promise<string>;
    runDebugHostedPluginInstance(uri: string, debugConfig: PluginDebugConfiguration): Promise<string>;
    terminateHostedPluginInstance(): Promise<void>;
    isHostedPluginInstanceRunning(): Promise<boolean>;
    getHostedPluginInstanceURI(): Promise<string>;
    getHostedPluginURI(): Promise<string>;
    runWatchCompilation(uri: string): Promise<void>;
    stopWatchCompilation(uri: string): Promise<void>;
    isWatchCompilationRunning(uri: string): Promise<boolean>;
    isPluginValid(uri: string): Promise<boolean>;
}
export interface PluginDevClient {
}
export interface PluginDebugPort {
    serverName: string;
    debugPort: number;
}
export interface PluginDebugConfiguration {
    debugMode?: string;
    pluginLocation?: string;
    debugPort?: string | PluginDebugPort[];
}
//# sourceMappingURL=plugin-dev-protocol.d.ts.map