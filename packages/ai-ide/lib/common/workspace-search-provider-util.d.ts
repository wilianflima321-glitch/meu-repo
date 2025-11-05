import { SearchInWorkspaceResult } from '@theia/search-in-workspace/lib/common/search-in-workspace-interface';
import { URI } from '@theia/core';
/**
 * Optimizes search results for token efficiency while preserving all information.
 * - Groups matches by file to reduce repetition
 * - Trims leading/trailing whitespace from line text
 * - Uses relative file paths
 * - Preserves all line numbers and content
 */
export declare function optimizeSearchResults(results: SearchInWorkspaceResult[], workspaceRoot: URI): Array<{
    file: string;
    matches: Array<{
        line: number;
        text: string;
    }>;
}>;
//# sourceMappingURL=workspace-search-provider-util.d.ts.map