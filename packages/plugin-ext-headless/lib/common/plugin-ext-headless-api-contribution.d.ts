import { PluginManager } from '@theia/plugin-ext';
import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';
export * from '@theia/plugin-ext';
declare module '@theia/plugin-ext' {
    /**
     * Plugin API extension description.
     * This interface describes scripts for all three plugin runtimes: frontend (WebWorker), backend (NodeJs), and headless (NodeJs).
     */
    interface ExtPluginApi extends ExtPluginHeadlessApi {
    }
}
/**
 * Provider for headless extension API description.
 */
export interface ExtPluginHeadlessApiProvider {
    /**
     * Provide API description.
     */
    provideApi(): ExtPluginHeadlessApi;
}
/**
 * Headless Plugin API extension description.
 * This interface describes a script for the headless (NodeJs) runtime outside of the scope of frontend connections.
 */
export interface ExtPluginHeadlessApi {
    /**
     * Path to the script which should be loaded to provide api, module should export `provideApi` function with
     * [ExtPluginApiBackendInitializationFn](#ExtPluginApiBackendInitializationFn) signature
     */
    headlessInitPath?: string;
}
/**
 * Signature of the extension API initialization function for APIs contributed to headless plugins.
 */
export interface ExtPluginApiHeadlessInitializationFn {
    (rpc: RPCProtocol, pluginManager: PluginManager): void;
}
//# sourceMappingURL=plugin-ext-headless-api-contribution.d.ts.map