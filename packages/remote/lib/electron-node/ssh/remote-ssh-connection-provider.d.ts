/// <reference types="node" />
import * as ssh2 from 'ssh2';
import * as net from 'net';
import SftpClient = require('ssh2-sftp-client');
import SshConfig from 'ssh-config';
import { Event, MessageService, QuickInputService } from '@theia/core';
import { RemoteSSHConnectionProvider, RemoteSSHConnectionProviderOptions, SSHConfig } from '../../electron-common/remote-ssh-connection-provider';
import { RemoteConnectionService } from '../remote-connection-service';
import { RemoteProxyServerProvider } from '../remote-proxy-server-provider';
import { RemoteConnection, RemoteExecOptions, RemoteExecResult, RemoteExecTester } from '../remote-types';
import { SSHIdentityFileCollector, SSHKey } from './ssh-identity-file-collector';
import { RemoteSetupService } from '../setup/remote-setup-service';
export declare class RemoteSSHConnectionProviderImpl implements RemoteSSHConnectionProvider {
    protected readonly remoteConnectionService: RemoteConnectionService;
    protected readonly serverProvider: RemoteProxyServerProvider;
    protected readonly identityFileCollector: SSHIdentityFileCollector;
    protected readonly remoteSetup: RemoteSetupService;
    protected readonly quickInputService: QuickInputService;
    protected readonly messageService: MessageService;
    protected passwordRetryCount: number;
    protected passphraseRetryCount: number;
    matchSSHConfigHost(host: string, user?: string, customConfigFile?: string): Promise<Record<string, string | string[]> | undefined>;
    getSSHConfig(customConfigFile?: string): Promise<SSHConfig>;
    doGetSSHConfig(customConfigFile?: string): Promise<SshConfig>;
    establishConnection(options: RemoteSSHConnectionProviderOptions): Promise<string>;
    establishSSHConnection(host: string, user: string, customConfigFile?: string): Promise<RemoteSSHConnection>;
    /**
     * Sometimes, ssh2.exec will not execute and retrieve any data right after the `ready` event fired.
     * In this method, we just perform `echo hello` in a loop to ensure that the connection is really ready.
     * See also https://github.com/mscdex/ssh2/issues/48
     */
    protected testConnection(connection: RemoteSSHConnection): Promise<void>;
    protected getAuthHandler(user: string, host: string, identityKeys: SSHKey[]): ssh2.AuthHandlerMiddleware;
}
export interface RemoteSSHConnectionOptions {
    id: string;
    name: string;
    type: string;
    client: ssh2.Client;
}
export declare class RemoteSSHConnection implements RemoteConnection {
    id: string;
    name: string;
    type: string;
    client: ssh2.Client;
    localPort: number;
    remotePort: number;
    private sftpClientPromise;
    private readonly onDidDisconnectEmitter;
    get onDidDisconnect(): Event<void>;
    constructor(options: RemoteSSHConnectionOptions);
    protected setupSftpClient(): Promise<SftpClient>;
    forwardOut(socket: net.Socket, port?: number): void;
    copy(localPath: string, remotePath: string): Promise<void>;
    exec(cmd: string, args?: string[], options?: RemoteExecOptions): Promise<RemoteExecResult>;
    execPartial(cmd: string, tester: RemoteExecTester, args?: string[], options?: RemoteExecOptions): Promise<RemoteExecResult>;
    protected buildCmd(cmd: string, args?: string[]): string;
    dispose(): void;
}
//# sourceMappingURL=remote-ssh-connection-provider.d.ts.map