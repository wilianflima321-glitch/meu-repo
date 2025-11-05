/// <reference types="node" />
import * as cp from 'child_process';
import { HostedPluginSupport } from '@theia/plugin-ext/lib/hosted/node/hosted-plugin';
export declare const HostedPluginsManager: unique symbol;
export interface HostedPluginsManager {
    /**
     * Runs watcher script to recompile plugin on any changes along given path.
     *
     * @param uri uri to plugin root folder.
     */
    runWatchCompilation(uri: string): Promise<void>;
    /**
     * Stops watcher script.
     *
     * @param uri uri to plugin root folder.
     */
    stopWatchCompilation(uri: string): Promise<void>;
    /**
     * Checks if watcher script to recompile plugin is running.
     *
     * @param uri uri to plugin root folder.
     */
    isWatchCompilationRunning(uri: string): Promise<boolean>;
}
export declare class HostedPluginsManagerImpl implements HostedPluginsManager {
    protected readonly hostedPluginSupport: HostedPluginSupport;
    protected watchCompilationRegistry: Map<string, cp.ChildProcess>;
    constructor();
    runWatchCompilation(uri: string): Promise<void>;
    private killProcessTree;
    stopWatchCompilation(uri: string): Promise<void>;
    isWatchCompilationRunning(uri: string): Promise<boolean>;
    protected runWatchScript(pluginRootPath: string): Promise<void>;
    protected unregisterWatchScript(pluginRootPath: string): void;
    /**
     * Checks whether watch script is present into package.json by given parent folder.
     *
     * @param pluginPath path to plugin's root directory
     */
    protected checkWatchScript(pluginPath: string): Promise<boolean>;
}
//# sourceMappingURL=hosted-plugins-manager.d.ts.map