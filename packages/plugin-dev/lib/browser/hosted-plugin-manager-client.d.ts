import URI from '@theia/core/lib/common/uri';
import { MessageService, Command, Emitter, Event } from '@theia/core/lib/common';
import { LabelProvider } from '@theia/core/lib/browser';
import { WindowService } from '@theia/core/lib/browser/window/window-service';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { FileDialogService } from '@theia/filesystem/lib/browser';
import { PluginDebugConfiguration, PluginDevServer } from '../common/plugin-dev-protocol';
import { LaunchVSCodeRequest, LaunchVSCodeResult } from '@theia/debug/lib/browser/debug-contribution';
import { DebugSessionManager } from '@theia/debug/lib/browser/debug-session-manager';
import { HostedPluginPreferences } from '../common/hosted-plugin-preferences';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables';
import { DebugSessionConnection } from '@theia/debug/lib/browser/debug-session-connection';
/**
 * Commands to control Hosted plugin instances.
 */
export declare namespace HostedPluginCommands {
    const START: Command;
    const DEBUG: Command;
    const STOP: Command;
    const RESTART: Command;
    const SELECT_PATH: Command;
}
/**
 * Available states of hosted plugin instance.
 */
export declare enum HostedInstanceState {
    STOPPED = "stopped",
    STARTING = "starting",
    RUNNING = "running",
    STOPPING = "stopping",
    FAILED = "failed"
}
export interface HostedInstanceData {
    state: HostedInstanceState;
    pluginLocation: URI;
}
/**
 * Responsible for UI to set up and control Hosted Plugin Instance.
 */
export declare class HostedPluginManagerClient {
    private openNewTabAskDialog;
    private connection;
    protected pluginLocation: URI | undefined;
    protected pluginInstanceURL: string | undefined;
    protected isDebug: boolean;
    protected readonly stateChanged: Emitter<HostedInstanceData>;
    get onStateChanged(): Event<HostedInstanceData>;
    protected readonly hostedPluginServer: PluginDevServer;
    protected readonly messageService: MessageService;
    protected readonly labelProvider: LabelProvider;
    protected readonly windowService: WindowService;
    protected readonly fileService: FileService;
    protected readonly environments: EnvVariablesServer;
    protected readonly workspaceService: WorkspaceService;
    protected readonly debugSessionManager: DebugSessionManager;
    protected readonly hostedPluginPreferences: HostedPluginPreferences;
    protected readonly fileDialogService: FileDialogService;
    protected init(): void;
    protected doInit(): Promise<void>;
    get lastPluginLocation(): string | undefined;
    start(debugConfig?: PluginDebugConfiguration): Promise<void>;
    debug(config?: PluginDebugConfiguration): Promise<string | undefined>;
    startDebugSessionManager(): Promise<void>;
    stop(checkRunning?: boolean): Promise<void>;
    restart(): Promise<void>;
    /**
     * Creates directory choose dialog and set selected folder into pluginLocation field.
     */
    selectPluginPath(): Promise<void>;
    register(configType: string, connection: DebugSessionConnection): void;
    /**
     * Opens window with URL to the running plugin instance.
     */
    protected openPluginWindow(): Promise<void>;
    protected launchVSCode({ arguments: { args } }: LaunchVSCodeRequest): Promise<LaunchVSCodeResult>;
    protected getErrorMessage(error: any): string;
    private setDebugConfig;
    private getDebugPluginConfig;
}
//# sourceMappingURL=hosted-plugin-manager-client.d.ts.map