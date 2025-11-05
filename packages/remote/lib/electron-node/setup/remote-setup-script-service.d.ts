import { RemotePlatform } from '@theia/core/lib/node/remote/remote-cli-contribution';
export interface RemoteScriptStrategy {
    exec(): string;
    downloadFile(url: string, output: string): string;
    unzip(file: string, directory: string): string;
    mkdir(path: string): string;
    home(): string;
    joinPath(...segments: string[]): string;
    joinScript(...segments: string[]): string;
}
export declare class RemoteWindowsScriptStrategy implements RemoteScriptStrategy {
    home(): string;
    exec(): string;
    downloadFile(url: string, output: string): string;
    unzip(file: string, directory: string): string;
    mkdir(path: string): string;
    joinPath(...segments: string[]): string;
    joinScript(...segments: string[]): string;
}
export declare class RemotePosixScriptStrategy implements RemoteScriptStrategy {
    home(): string;
    exec(): string;
    downloadFile(url: string, output: string): string;
    unzip(file: string, directory: string): string;
    mkdir(path: string): string;
    joinPath(...segments: string[]): string;
    joinScript(...segments: string[]): string;
}
export declare class RemoteSetupScriptService {
    protected windowsStrategy: RemoteWindowsScriptStrategy;
    protected posixStrategy: RemotePosixScriptStrategy;
    protected getStrategy(platform: RemotePlatform): RemoteScriptStrategy;
    home(platform: RemotePlatform): string;
    exec(platform: RemotePlatform): string;
    downloadFile(platform: RemotePlatform, url: string, output: string): string;
    unzip(platform: RemotePlatform, file: string, directory: string): string;
    mkdir(platform: RemotePlatform, path: string): string;
    joinPath(platform: RemotePlatform, ...segments: string[]): string;
    joinScript(platform: RemotePlatform, ...segments: string[]): string;
}
//# sourceMappingURL=remote-setup-script-service.d.ts.map