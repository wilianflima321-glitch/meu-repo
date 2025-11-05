import { WorkspaceService } from '@theia/workspace/lib/browser';
import { type DebugSessionOptions } from './debug-session-options';
/**
 * Provides a label for the debug session without the need to create the session.
 * Debug session labels are used to check if sessions are the "same".
 */
export declare class DebugSessionConfigurationLabelProvider {
    protected readonly workspaceService: WorkspaceService;
    getLabel(params: Pick<DebugSessionOptions, 'name' | 'workspaceFolderUri'>, includeRoot?: boolean): string;
}
//# sourceMappingURL=debug-session-configuration-label-provider.d.ts.map