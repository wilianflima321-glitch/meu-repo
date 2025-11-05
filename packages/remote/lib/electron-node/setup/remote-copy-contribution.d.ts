import { ApplicationPackage } from '@theia/core/shared/@theia/application-package';
import { RemoteCopyRegistry, RemoteFile, RemoteCopyOptions } from '@theia/core/lib/node/remote/remote-copy-contribution';
export declare class RemoteCopyRegistryImpl implements RemoteCopyRegistry {
    protected readonly applicationPackage: ApplicationPackage;
    protected readonly files: RemoteFile[];
    getFiles(): RemoteFile[];
    glob(pattern: string, target?: string): Promise<void>;
    doGlob(pattern: string, cwd: string, target?: string): Promise<void>;
    file(file: string, target?: string, options?: RemoteCopyOptions): void;
    directory(dir: string, target?: string): Promise<void>;
    protected withTarget(file: string, target?: string): string;
}
//# sourceMappingURL=remote-copy-contribution.d.ts.map