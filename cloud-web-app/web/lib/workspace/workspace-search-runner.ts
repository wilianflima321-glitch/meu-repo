import { matchesWorkspacePattern } from './workspace-service.helpers';
import { buildSearchRegex, findMatches, matchesSearchPattern } from './workspace-search';
import type { FileInfo, SearchOptions, SearchResult, WorkspaceFolder } from './workspace-service.types';

export async function runWorkspaceSearch(
  options: SearchOptions,
  folders: WorkspaceFolder[],
  listFolderRecursive: (uri: string) => Promise<FileInfo[]>,
  readFile: (uri: string) => Promise<string>,
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  if (folders.length === 0) {
    return results;
  }

  const searchRegex = buildSearchRegex(options);
  let totalMatches = 0;
  const maxResults = options.maxResults || 1000;

  for (const folder of folders) {
    if (totalMatches >= maxResults) break;

    try {
      const files = await listFolderRecursive(folder.uri);

      for (const file of files) {
        if (totalMatches >= maxResults) break;
        if (file.isDirectory) continue;
        if (!matchesSearchPattern(file.path, options.includePattern, options.excludePattern, matchesWorkspacePattern)) {
          continue;
        }

        try {
          const content = await readFile(file.path);
          const matches = findMatches(content, searchRegex);

          if (matches.length > 0) {
            results.push({ uri: file.path, matches });
            totalMatches += matches.length;
          }
        } catch {
          // Skip unreadable files.
        }
      }
    } catch {
      // Skip folders that cannot be listed.
    }
  }

  return results;
}
