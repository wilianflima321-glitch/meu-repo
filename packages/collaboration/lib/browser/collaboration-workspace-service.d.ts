import { Disposable } from '@theia/core/shared/vscode-languageserver-protocol';
import { FileStat } from '@theia/filesystem/lib/common/files';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { Workspace, ProtocolBroadcastConnection } from 'open-collaboration-protocol';
export declare class CollaborationWorkspaceService extends WorkspaceService {
    protected collabWorkspace?: Workspace;
    protected connection?: ProtocolBroadcastConnection;
    setHostWorkspace(workspace: Workspace, connection: ProtocolBroadcastConnection): Promise<Disposable>;
    protected computeRoots(): Promise<FileStat[]>;
    protected entryToStat(entry: string): FileStat;
}
//# sourceMappingURL=collaboration-workspace-service.d.ts.map