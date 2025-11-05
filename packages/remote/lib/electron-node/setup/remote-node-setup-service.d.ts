import { RequestService } from '@theia/core/shared/@theia/request';
import { RemoteSetupScriptService } from './remote-setup-script-service';
import { RemotePlatform } from '@theia/core/lib/node/remote/remote-cli-contribution';
/**
 * The current node version that Theia recommends.
 *
 * Native dependencies are compiled against this version.
 */
export declare const REMOTE_NODE_VERSION = "22.17.0";
export declare class RemoteNodeSetupService {
    protected readonly requestService: RequestService;
    protected readonly scriptService: RemoteSetupScriptService;
    getNodeDirectoryName(platform: RemotePlatform): string;
    protected getPlatformName(platform: RemotePlatform): string;
    protected validatePlatform(platform: RemotePlatform): void;
    protected throwPlatformError(platform: RemotePlatform, supportedArch: string): never;
    protected getNodeFileExtension(platform: RemotePlatform): string;
    getNodeFileName(platform: RemotePlatform): string;
    downloadNode(platform: RemotePlatform, downloadTemplate?: string): Promise<string>;
    generateDownloadScript(platform: RemotePlatform, targetPath: string, downloadTemplate?: string): string;
    protected getDownloadPath(platform: RemotePlatform, downloadTemplate?: string): string;
}
//# sourceMappingURL=remote-node-setup-service.d.ts.map