import { Command, CommandContribution, CommandRegistry, ContributionProvider, QuickInputService } from '@theia/core';
import { FrontendApplicationContribution, StatusBar } from '@theia/core/lib/browser';
import { RemoteStatus, RemoteStatusService } from '../electron-common/remote-status-service';
import { RemoteRegistry, RemoteRegistryContribution } from './remote-registry-contribution';
import { RemoteService } from './remote-service';
import { WindowService } from '@theia/core/lib/browser/window/window-service';
export declare namespace RemoteCommands {
    const REMOTE_SELECT: Command;
    const REMOTE_DISCONNECT: Command;
}
export declare class RemoteFrontendContribution implements CommandContribution, FrontendApplicationContribution {
    protected readonly statusBar: StatusBar;
    protected readonly quickInputService?: QuickInputService;
    protected readonly commandRegistry: CommandRegistry;
    protected readonly remoteService: RemoteService;
    protected readonly remoteStatusService: RemoteStatusService;
    protected readonly windowService: WindowService;
    protected readonly remoteRegistryContributions: ContributionProvider<RemoteRegistryContribution>;
    protected remoteRegistry: RemoteRegistry;
    configure(): Promise<void>;
    protected setStatusBar(info: RemoteStatus): Promise<void>;
    registerCommands(commands: CommandRegistry): void;
    protected disconnectRemote(): Promise<void>;
    protected selectRemote(): Promise<void>;
}
//# sourceMappingURL=remote-frontend-contribution.d.ts.map