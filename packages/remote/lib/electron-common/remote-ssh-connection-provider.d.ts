import * as SshConfig from 'ssh-config';
export declare const RemoteSSHConnectionProviderPath = "/remote/ssh";
export declare const RemoteSSHConnectionProvider: unique symbol;
export interface RemoteSSHConnectionProviderOptions {
    user: string;
    host: string;
    nodeDownloadTemplate?: string;
    customConfigFile?: string;
}
export type SSHConfig = Array<SshConfig.Line>;
export interface RemoteSSHConnectionProvider {
    establishConnection(options: RemoteSSHConnectionProviderOptions): Promise<string>;
    getSSHConfig(customConfigFile?: string): Promise<SSHConfig>;
    matchSSHConfigHost(host: string, user?: string, customConfigFile?: string): Promise<Record<string, string | string[]> | undefined>;
}
//# sourceMappingURL=remote-ssh-connection-provider.d.ts.map