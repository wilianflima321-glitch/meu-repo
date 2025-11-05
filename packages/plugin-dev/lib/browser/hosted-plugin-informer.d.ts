import { StatusBar } from '@theia/core/lib/browser/status-bar/status-bar';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { PluginDevServer } from '../common/plugin-dev-protocol';
import { ConnectionStatusService } from '@theia/core/lib/browser/connection-status-service';
import { FrontendApplicationStateService } from '@theia/core/lib/browser/frontend-application-state';
import { WindowTitleService } from '@theia/core/lib/browser/window/window-title-service';
/**
 * Informs the user whether Theia is running with hosted plugin.
 * Adds 'Development Host' status bar element and appends the same prefix to window title.
 */
export declare class HostedPluginInformer implements FrontendApplicationContribution {
    static readonly DEVELOPMENT_HOST_TITLE: string;
    static readonly DEVELOPMENT_HOST = "development-host";
    static readonly DEVELOPMENT_HOST_OFFLINE = "development-host-offline";
    private entry;
    protected readonly statusBar: StatusBar;
    protected readonly workspaceService: WorkspaceService;
    protected readonly hostedPluginServer: PluginDevServer;
    protected readonly connectionStatusService: ConnectionStatusService;
    protected readonly frontendApplicationStateService: FrontendApplicationStateService;
    protected readonly windowTitleService: WindowTitleService;
    initialize(): void;
    private updateStatusBarElement;
}
//# sourceMappingURL=hosted-plugin-informer.d.ts.map