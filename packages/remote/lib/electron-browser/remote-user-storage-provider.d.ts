import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { FileSystemProvider } from '@theia/filesystem/lib/common/files';
import { UserStorageContribution } from '@theia/userstorage/lib/browser/user-storage-contribution';
import { RemoteStatusService } from '../electron-common/remote-status-service';
import { LocalRemoteFileSystemProvider } from './local-backend-services';
import { Deferred } from '@theia/core/lib/common/promise-util';
import { URI } from '@theia/core';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables';
/**
 * This overide is to have remote connections still use settings, keymaps, etc. from the local machine.
 */
export declare class RemoteUserStorageContribution extends UserStorageContribution {
    protected readonly remoteStatusService: RemoteStatusService;
    protected readonly localRemoteFileSystemProvider: LocalRemoteFileSystemProvider;
    protected readonly localEnvironments: EnvVariablesServer;
    isRemoteConnection: Deferred<boolean>;
    protected init(): void;
    protected getDelegate(service: FileService): Promise<FileSystemProvider>;
    protected getCongigDirUri(): Promise<URI>;
}
//# sourceMappingURL=remote-user-storage-provider.d.ts.map