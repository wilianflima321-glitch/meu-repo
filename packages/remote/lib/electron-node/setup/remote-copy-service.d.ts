import { ApplicationPackage } from '@theia/core/shared/@theia/application-package';
import { RemoteConnection } from '../remote-types';
import { RemotePlatform } from '@theia/core/lib/node/remote/remote-cli-contribution';
import { RemoteNativeDependencyService } from './remote-native-dependency-service';
import { ContributionProvider } from '@theia/core';
import { RemoteCopyRegistryImpl } from './remote-copy-contribution';
import { RemoteCopyContribution, RemoteFile } from '@theia/core/lib/node/remote/remote-copy-contribution';
export declare class RemoteCopyService {
    protected readonly applicationPackage: ApplicationPackage;
    protected readonly copyRegistry: RemoteCopyRegistryImpl;
    protected readonly nativeDependencyService: RemoteNativeDependencyService;
    protected readonly copyContributions: ContributionProvider<RemoteCopyContribution>;
    protected initialized: boolean;
    copyToRemote(remote: RemoteConnection, remotePlatform: RemotePlatform, destination: string): Promise<void>;
    protected getFiles(remotePlatform: RemotePlatform, tempDir: string): Promise<RemoteFile[]>;
    protected loadCopyContributions(): Promise<RemoteFile[]>;
    protected loadNativeDependencies(remotePlatform: RemotePlatform, tempDir: string): Promise<RemoteFile[]>;
    protected getTempDir(): Promise<string>;
    protected getRemoteDownloadLocation(): Promise<string | undefined>;
}
//# sourceMappingURL=remote-copy-service.d.ts.map