import { RpcProxy } from '@theia/core';
import { RemoteFileSystemProvider, RemoteFileSystemServer } from '@theia/filesystem/lib/common/remote-file-system-provider';
export declare const LocalEnvVariablesServer: unique symbol;
export declare const LocalRemoteFileSytemServer: unique symbol;
/**
 * provide file access to local files while connected to a remote workspace or dev container.
 */
export declare class LocalRemoteFileSystemProvider extends RemoteFileSystemProvider {
    protected readonly server: RpcProxy<RemoteFileSystemServer>;
}
//# sourceMappingURL=local-backend-services.d.ts.map