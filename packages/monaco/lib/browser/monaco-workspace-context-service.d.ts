import { Emitter } from '@theia/monaco-editor-core/esm/vs/base/common/event';
import { URI } from '@theia/monaco-editor-core/esm/vs/base/common/uri';
import { ISingleFolderWorkspaceIdentifier, IWorkspace, IWorkspaceContextService, IWorkspaceFolder, IWorkspaceFoldersChangeEvent, IWorkspaceFoldersWillChangeEvent, IWorkspaceIdentifier, WorkbenchState } from '@theia/monaco-editor-core/esm/vs/platform/workspace/common/workspace';
/**
 * A minimal implementation of {@link IWorkspaceContextService} to replace the `StandaloneWorkspaceContextService` in Monaco
 * as a workaround for the issue of showing no context menu for editor minimap (#15217).
 */
export declare class MonacoWorkspaceContextService implements IWorkspaceContextService {
    readonly _serviceBrand: undefined;
    protected readonly onDidChangeWorkbenchStateEmitter: Emitter<WorkbenchState>;
    readonly onDidChangeWorkbenchState: import("@theia/monaco-editor-core/esm/vs/base/common/event").Event<WorkbenchState>;
    protected readonly onDidChangeWorkspaceNameEmitter: Emitter<void>;
    readonly onDidChangeWorkspaceName: import("@theia/monaco-editor-core/esm/vs/base/common/event").Event<void>;
    protected readonly onWillChangeWorkspaceFoldersEmitter: Emitter<IWorkspaceFoldersWillChangeEvent>;
    readonly onWillChangeWorkspaceFolders: import("@theia/monaco-editor-core/esm/vs/base/common/event").Event<IWorkspaceFoldersWillChangeEvent>;
    protected readonly onDidChangeWorkspaceFoldersEmitter: Emitter<IWorkspaceFoldersChangeEvent>;
    readonly onDidChangeWorkspaceFolders: import("@theia/monaco-editor-core/esm/vs/base/common/event").Event<IWorkspaceFoldersChangeEvent>;
    protected workspace: IWorkspace;
    getCompleteWorkspace(): Promise<IWorkspace>;
    getWorkspace(): IWorkspace;
    getWorkbenchState(): WorkbenchState;
    getWorkspaceFolder(resource: URI): IWorkspaceFolder | null;
    isCurrentWorkspace(workspaceIdOrFolder: IWorkspaceIdentifier | ISingleFolderWorkspaceIdentifier | URI): boolean;
    isInsideWorkspace(resource: URI): boolean;
}
//# sourceMappingURL=monaco-workspace-context-service.d.ts.map