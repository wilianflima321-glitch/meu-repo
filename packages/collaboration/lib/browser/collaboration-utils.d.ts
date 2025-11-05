import { URI } from '@theia/core';
import { CollaborationWorkspaceService } from './collaboration-workspace-service';
export declare class CollaborationUtils {
    protected readonly workspaceService: CollaborationWorkspaceService;
    getProtocolPath(uri?: URI): string | undefined;
    getResourceUri(path?: string): URI | undefined;
}
//# sourceMappingURL=collaboration-utils.d.ts.map