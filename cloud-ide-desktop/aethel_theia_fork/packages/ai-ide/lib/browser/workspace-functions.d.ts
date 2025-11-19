import { ToolProvider, ToolRequest } from '@theia/ai-core';
import { CancellationToken, PreferenceService, URI } from '@theia/core';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { FileStat } from '@theia/filesystem/lib/common/files';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { OpenerService } from '@theia/core/lib/browser';
import { MonacoWorkspace } from '@theia/monaco/lib/browser/monaco-workspace';
import { MonacoTextModelService } from '@theia/monaco/lib/browser/monaco-text-model-service';
import { ProblemManager } from '@theia/markers/lib/browser';
import { Range } from '@theia/core/shared/vscode-languageserver-protocol';
export declare class WorkspaceFunctionScope {
    protected readonly GITIGNORE_FILE_NAME = ".gitignore";
    protected readonly workspaceService: WorkspaceService;
    protected readonly fileService: FileService;
    protected readonly preferences: PreferenceService;
    private gitignoreMatcher;
    private gitignoreWatcherInitialized;
    safeGetPreference<T>(key: string, defaultValue: T): T;
    getWorkspaceRoot(): Promise<URI>;
    ensureWithinWorkspace(targetUri: URI, workspaceRootUri: URI): void;
    resolveRelativePath(relativePath: string): Promise<URI>;
    private initializeGitignoreWatcher;
    shouldExclude(stat: FileStat): Promise<boolean>;
    protected isUserExcluded(fileName: string, userExcludePatterns: string[]): boolean;
    protected isGitIgnored(stat: FileStat, workspaceRoot: URI): Promise<boolean>;
}
export declare class GetWorkspaceDirectoryStructure implements ToolProvider {
    static ID: string;
    getTool(): ToolRequest;
    protected readonly fileService: FileService;
    protected workspaceScope: WorkspaceFunctionScope;
    private getDirectoryStructure;
    private buildDirectoryStructure;
}
export declare class FileContentFunction implements ToolProvider {
    static ID: string;
    getTool(): ToolRequest;
    protected readonly fileService: FileService;
    protected readonly workspaceScope: WorkspaceFunctionScope;
    protected readonly monacoWorkspace: MonacoWorkspace;
    private parseArg;
    private getFileContent;
}
export declare class GetWorkspaceFileList implements ToolProvider {
    static ID: string;
    getTool(): ToolRequest;
    protected readonly fileService: FileService;
    protected workspaceScope: WorkspaceFunctionScope;
    getProjectFileList(path?: string, cancellationToken?: CancellationToken): Promise<string | string[]>;
    private listFilesDirectly;
}
export declare class FileDiagnosticProvider implements ToolProvider {
    static ID: string;
    protected readonly workspaceScope: WorkspaceFunctionScope;
    protected readonly problemManager: ProblemManager;
    protected readonly modelService: MonacoTextModelService;
    protected readonly openerService: OpenerService;
    getTool(): ToolRequest;
    protected getDiagnosticsForFile(uri: URI, cancellationToken?: CancellationToken): Promise<string>;
    /**
     * Expands the range provided until it contains at least {@link desiredLines} lines or reaches the end of the document
     *  to attempt to provide the agent sufficient context to understand the diagnostic.
     */
    protected atLeastNLines(desiredLines: number, range: Range, documentLineCount: number): Range;
}
export declare class FindFilesByPattern implements ToolProvider {
    static ID: string;
    protected readonly workspaceScope: WorkspaceFunctionScope;
    protected readonly preferences: PreferenceService;
    protected readonly fileService: FileService;
    getTool(): ToolRequest;
    private findFiles;
    private buildIgnorePatterns;
    private traverseDirectory;
}
//# sourceMappingURL=workspace-functions.d.ts.map