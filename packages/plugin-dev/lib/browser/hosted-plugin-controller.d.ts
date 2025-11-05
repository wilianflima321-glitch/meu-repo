import { StatusBar } from '@theia/core/lib/browser/status-bar/status-bar';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { MessageService, PreferenceChange, PreferenceServiceImpl } from '@theia/core/lib/common';
import { CommandRegistry } from '@theia/core/shared/@lumino/commands';
import { Menu } from '@theia/core/shared/@lumino/widgets';
import { FrontendApplicationStateService } from '@theia/core/lib/browser/frontend-application-state';
import { ConnectionStatusService } from '@theia/core/lib/browser/connection-status-service';
import { PluginDevServer } from '../common/plugin-dev-protocol';
import { HostedPluginManagerClient, HostedInstanceData } from './hosted-plugin-manager-client';
import { HostedPluginLogViewer } from './hosted-plugin-log-viewer';
import { HostedPluginPreferences } from '../common/hosted-plugin-preferences';
/**
 * Adds a status bar element displaying the state of secondary Theia instance with hosted plugin and
 * allows controlling the instance by simple clicking on the status bar element.
 */
export declare class HostedPluginController implements FrontendApplicationContribution {
    static readonly HOSTED_PLUGIN = "hosted-plugin";
    static readonly HOSTED_PLUGIN_OFFLINE = "hosted-plugin-offline";
    static readonly HOSTED_PLUGIN_FAILED = "hosted-plugin-failed";
    protected readonly statusBar: StatusBar;
    protected readonly frontendApplicationStateService: FrontendApplicationStateService;
    protected readonly hostedPluginServer: PluginDevServer;
    protected readonly hostedPluginManagerClient: HostedPluginManagerClient;
    protected readonly connectionStatusService: ConnectionStatusService;
    protected readonly hostedPluginLogViewer: HostedPluginLogViewer;
    protected readonly hostedPluginPreferences: HostedPluginPreferences;
    protected readonly preferenceService: PreferenceServiceImpl;
    protected readonly messageService: MessageService;
    private pluginState;
    private watcherSuccess;
    private entry;
    initialize(): void;
    /**
     * Display status bar element for stopped plugin.
     */
    protected onHostedPluginStopped(): Promise<void>;
    /**
     * Display status bar element for starting plugin.
     */
    protected onHostedPluginStarting(): Promise<void>;
    /**
     * Display status bar element for running plugin.
     */
    protected onHostedPluginRunning(): Promise<void>;
    /**
     * Display status bar element for failed plugin.
     */
    protected onHostedPluginFailed(): Promise<void>;
    protected onPreferencesChanged(preference: PreferenceChange): Promise<void>;
    /**
     * Starts / stops watchers on hosted instance state change.
     *
     * @param event hosted instance state change event
     */
    protected handleWatchers(event: HostedInstanceData): Promise<void>;
    private runWatchCompilation;
    private getErrorMessage;
    /**
     * Updating status bar element when changing connection status.
     */
    private onConnectionStatusChanged;
    /**
     * Show menu containing actions to start/stop/restart hosted plugin.
     */
    protected showMenu(x: number, y: number): void;
    /**
     * Adds commands to the menu for running plugin.
     */
    protected addCommandsForRunningPlugin(commands: CommandRegistry, menu: Menu): void;
    /**
     * Adds command to the menu for stopped plugin.
     */
    protected addCommandsForStoppedPlugin(commands: CommandRegistry, menu: Menu): void;
}
//# sourceMappingURL=hosted-plugin-controller.d.ts.map