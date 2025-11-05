/// <reference types="node" />
/// <reference types="node" />
import { RequestOptions } from '@theia/core/shared/@theia/request';
import { RemotePlatform } from '@theia/core/lib/node/remote/remote-cli-contribution';
export interface FileDependencyResult {
    path: string;
    mode?: number;
}
export type DependencyDownload = FileDependencyDownload | DirectoryDependencyDownload;
export interface FileDependencyDownload {
    file: FileDependencyResult;
    buffer: Buffer;
}
export declare namespace FileDependencyResult {
    function is(item: unknown): item is FileDependencyDownload;
}
export interface DirectoryDependencyDownload {
    archive: 'tar' | 'zip' | 'tgz';
    buffer: Buffer;
}
export declare namespace DirectoryDependencyDownload {
    function is(item: unknown): item is DirectoryDependencyDownload;
}
export interface DownloadOptions {
    remotePlatform: RemotePlatform;
    theiaVersion: string;
    download: (requestInfo: string | RequestOptions) => Promise<Buffer>;
}
export declare const RemoteNativeDependencyContribution: unique symbol;
/**
 * contribution used for downloading prebuild native dependency when connecting to a remote machine with a different system
 */
export interface RemoteNativeDependencyContribution {
    download(options: DownloadOptions): Promise<DependencyDownload>;
}
//# sourceMappingURL=remote-native-dependency-contribution.d.ts.map