import { ToolProvider, ToolRequest } from '@theia/ai-core';
import { PreferenceService } from '@theia/core/lib/common/preferences/preference-service';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { SearchInWorkspaceService } from '@theia/search-in-workspace/lib/browser/search-in-workspace-service';
import { WorkspaceFunctionScope } from './workspace-functions';
export declare class WorkspaceSearchProvider implements ToolProvider {
    protected readonly searchService: SearchInWorkspaceService;
    protected readonly workspaceScope: WorkspaceFunctionScope;
    protected readonly preferenceService: PreferenceService;
    protected readonly fileService: FileService;
    getTool(): ToolRequest;
    private determineSearchRoots;
    private handleSearch;
}
//# sourceMappingURL=workspace-search-provider.d.ts.map