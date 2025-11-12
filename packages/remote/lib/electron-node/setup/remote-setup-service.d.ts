import { RemoteConnection, RemoteExecResult, RemoteStatusReport } from '../remote-types';
import { RemoteCliContribution, RemotePlatform } from '@theia/core/lib/node/remote/remote-cli-contribution';
import { ApplicationPackage } from '@theia/core/shared/@theia/application-package';
import { RemoteCopyService } from './remote-copy-service';
import { RemoteNativeDependencyService } from './remote-native-dependency-service';
import { ContributionProvider } from '@theia/core';
import { RemoteNodeSetupService } from './remote-node-setup-service';
import { RemoteSetupScriptService } from './remote-setup-script-service';
export interface RemoteSetupOptions {
    connection: RemoteConnection;
    report: RemoteStatusReport;
    nodeDownloadTemplate?: string;
}
export interface RemoteSetupResult {
    applicationDirectory: string;
    nodeDirectory: string;
}
export declare class RemoteSetupService {
    protected readonly copyService: RemoteCopyService;
    protected readonly nativeDependencyService: RemoteNativeDependencyService;
    protected readonly nodeSetupService: RemoteNodeSetupService;
    protected readonly scriptService: RemoteSetupScriptService;
    protected readonly applicationPackage: ApplicationPackage;
    protected readonly cliContributions: ContributionProvider<RemoteCliContribution>;
    setup(options: RemoteSetupOptions): Promise<RemoteSetupResult>;
    protected startApplication(connection: RemoteConnection, platform: RemotePlatform, remotePath: string, nodeDir: string): Promise<number>;
    protected detectRemotePlatform(connection: RemoteConnection): Promise<RemotePlatform>;
    protected getRemoteHomeDirectory(connection: RemoteConnection, platform: RemotePlatform): Promise<string>;
    protected getRemoteAppName(): string;
    protected cleanupDirectoryName(name: string): string;
    protected mkdirRemote(connection: RemoteConnection, platform: RemotePlatform, remotePath: string): Promise<void>;
    protected dirExistsRemote(connection: RemoteConnection, remotePath: string): Promise<boolean>;
    protected unzipRemote(connection: RemoteConnection, platform: RemotePlatform, remoteFile: string, remoteDirectory: string): Promise<void>;
    protected executeScriptRemote(connection: RemoteConnection, platform: RemotePlatform, script: string): Promise<RemoteExecResult>;
}
//# sourceMappingURL=remote-setup-service.d.ts.map