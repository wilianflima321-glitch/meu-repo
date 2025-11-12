import { RemoteNativeDependencyContribution, DownloadOptions, DependencyDownload } from './remote-native-dependency-contribution';
import { RemotePlatform } from '@theia/core/lib/node/remote/remote-cli-contribution';
export declare class AppNativeDependencyContribution implements RemoteNativeDependencyContribution {
    appDownloadUrlBase: string;
    protected getDefaultURLForFile(remotePlatform: RemotePlatform, theiaVersion: string): string;
    download(options: DownloadOptions): Promise<DependencyDownload>;
}
//# sourceMappingURL=app-native-dependency-contribution.d.ts.map