/// <reference types="node" />
/// <reference types="node" />
import { ContributionProvider } from '@theia/core';
import { RequestService, RequestOptions } from '@theia/core/shared/@theia/request';
import { DependencyDownload, RemoteNativeDependencyContribution } from './remote-native-dependency-contribution';
import { RemotePlatform } from '@theia/core/lib/node/remote/remote-cli-contribution';
export declare const DEFAULT_HTTP_OPTIONS: {
    method: string;
    headers: {
        Accept: string;
    };
};
export interface NativeDependencyFile {
    path: string;
    target: string;
    mode?: number;
}
export declare class RemoteNativeDependencyService {
    protected nativeDependencyContributions: ContributionProvider<RemoteNativeDependencyContribution>;
    protected requestService: RequestService;
    downloadDependencies(remotePlatform: RemotePlatform, directory: string): Promise<NativeDependencyFile[]>;
    protected downloadDependency(downloadURI: string | RequestOptions): Promise<Buffer>;
    protected storeDependency(dependency: DependencyDownload, directory: string): Promise<NativeDependencyFile[]>;
}
//# sourceMappingURL=remote-native-dependency-service.d.ts.map