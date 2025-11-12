import { DeployedPlugin, HostedPluginServer } from '@theia/plugin-ext/lib/common/plugin-protocol';
import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';
import { ContributionProvider, Disposable, DisposableCollection } from '@theia/core';
import { HostedPluginProcess } from '@theia/plugin-ext/lib/hosted/node/hosted-plugin-process';
import { IShellTerminalServer } from '@theia/terminal/lib/common/shell-terminal-protocol';
import { HeadlessPluginManagerExt } from '../../common/headless-plugin-rpc';
import { AbstractHostedPluginSupport, PluginContributions } from '@theia/plugin-ext/lib/hosted/common/hosted-plugin';
import { TheiaHeadlessPluginScanner } from './scanners/scanner-theia-headless';
import { PluginDeployerImpl } from '@theia/plugin-ext/lib/main/node/plugin-deployer-impl';
export type HeadlessPluginHost = string;
export declare function isHeadlessPlugin(plugin: DeployedPlugin): boolean;
export declare class HeadlessHostedPluginSupport extends AbstractHostedPluginSupport<HeadlessPluginManagerExt, HostedPluginServer> {
    protected readonly pluginProcess: HostedPluginProcess;
    protected readonly shellTerminalServer: IShellTerminalServer;
    protected readonly scanner: TheiaHeadlessPluginScanner;
    protected readonly pluginDeployer: PluginDeployerImpl;
    protected readonly supportedActivationEventsContributions: ContributionProvider<string[]>;
    constructor();
    shutDown(): void;
    protected createTheiaReadyPromise(): Promise<unknown>;
    protected acceptPlugin(plugin: DeployedPlugin): boolean | DeployedPlugin;
    protected handleContributions(_plugin: DeployedPlugin): Disposable;
    protected beforeSyncPlugins(toDisconnect: DisposableCollection): Promise<void>;
    protected obtainManager(host: string, hostContributions: PluginContributions[], toDisconnect: DisposableCollection): Promise<HeadlessPluginManagerExt | undefined>;
    protected initRpc(host: HeadlessPluginHost, pluginId: string): RPCProtocol;
    protected createServerRpc(pluginHostId: string): RPCProtocol;
    protected getStoragePath(): Promise<string | undefined>;
    protected getHostGlobalStoragePath(): Promise<string>;
}
//# sourceMappingURL=headless-hosted-plugin.d.ts.map