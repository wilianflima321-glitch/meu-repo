import { MaybeArray, URI } from '@theia/core';
import { OpenFileDialogProps, SaveFileDialogProps } from '@theia/filesystem/lib/browser/file-dialog';
import { FileStat } from '@theia/filesystem/lib/common/files';
import { ElectronFileDialogService } from '@theia/filesystem/lib/electron-browser/file-dialog/electron-file-dialog-service';
import { RemoteService } from './remote-service';
export declare class RemoteElectronFileDialogService extends ElectronFileDialogService {
    protected readonly remoteService: RemoteService;
    showOpenDialog(props: OpenFileDialogProps & {
        canSelectMany: true;
    }, folder?: FileStat | undefined): Promise<MaybeArray<URI> | undefined>;
    showOpenDialog(props: OpenFileDialogProps, folder?: FileStat | undefined): Promise<URI | undefined>;
    showSaveDialog(props: SaveFileDialogProps, folder?: FileStat | undefined): Promise<URI | undefined>;
}
//# sourceMappingURL=remote-electron-file-dialog-service.d.ts.map