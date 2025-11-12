import { Command, MessageService, QuickInputService } from '@theia/core';
import { VariableResolverService } from '@theia/variable-resolver/lib/browser';
import { RemoteSSHConnectionProvider } from '../electron-common/remote-ssh-connection-provider';
import { AbstractRemoteRegistryContribution, RemoteRegistry } from './remote-registry-contribution';
import { RemotePreferences } from '../electron-common/remote-preferences';
export declare namespace RemoteSSHCommands {
    const CONNECT: Command;
    const CONNECT_CURRENT_WINDOW: Command;
    const CONNECT_CURRENT_WINDOW_TO_CONFIG_HOST: Command;
}
export declare class RemoteSSHContribution extends AbstractRemoteRegistryContribution {
    protected readonly quickInputService: QuickInputService;
    protected readonly sshConnectionProvider: RemoteSSHConnectionProvider;
    protected readonly messageService: MessageService;
    protected readonly remotePreferences: RemotePreferences;
    protected readonly variableResolver: VariableResolverService;
    registerRemoteCommands(registry: RemoteRegistry): void;
    getConfigFilePath(): Promise<string | undefined>;
    connectToConfigHost(): Promise<void>;
    connect(newWindow: boolean): Promise<void>;
    sendSSHConnect(host: string, user: string): Promise<string>;
}
//# sourceMappingURL=remote-ssh-contribution.d.ts.map