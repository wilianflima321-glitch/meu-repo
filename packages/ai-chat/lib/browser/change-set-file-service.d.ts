import { ILogger, URI } from '@theia/core';
import { ApplicationShell, LabelProvider, OpenerService } from '@theia/core/lib/browser';
import { EditorManager } from '@theia/editor/lib/browser';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { MonacoWorkspace } from '@theia/monaco/lib/browser/monaco-workspace';
import { WorkspaceService } from '@theia/workspace/lib/browser/workspace-service';
import { ChangeSetFileElement } from './change-set-file-element';
export declare class ChangeSetFileService {
    protected readonly logger: ILogger;
    protected readonly wsService: WorkspaceService;
    protected readonly labelProvider: LabelProvider;
    protected readonly openerService: OpenerService;
    protected readonly editorManager: EditorManager;
    protected readonly shell: ApplicationShell;
    protected readonly monacoWorkspace: MonacoWorkspace;
    protected readonly fileService: FileService;
    read(uri: URI): Promise<string | undefined>;
    getName(uri: URI): string;
    getIcon(uri: URI): string | undefined;
    getAdditionalInfo(uri: URI): string | undefined;
    open(element: ChangeSetFileElement): Promise<void>;
    openDiff(originalUri: URI, suggestedUri: URI): Promise<void>;
    protected getDiffUri(originalUri: URI, suggestedUri: URI): URI;
    delete(uri: URI): Promise<void>;
    /** Returns true if there was a document available to save for the specified URI. */
    trySave(suggestedUri: URI): Promise<boolean>;
    writeFrom(from: URI, to: URI, fallbackContent: string): Promise<void>;
    write(uri: URI, text: string): Promise<void>;
    closeDiffsForSession(sessionId: string, except?: URI[]): void;
    closeDiff(uri: URI): void;
}
//# sourceMappingURL=change-set-file-service.d.ts.map