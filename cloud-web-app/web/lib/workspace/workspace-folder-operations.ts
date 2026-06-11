import { performWorkspaceFileOperation } from './workspace-file-backend';
import { extractWorkspaceFileName, normalizeWorkspaceUri } from './workspace-service.helpers';
import { WorkspaceError } from './workspace-service.types';
import type { FileInfo } from './workspace-service.types';

function createWorkspaceFileError(code: string, message: string, cause?: unknown): WorkspaceError {
  return new WorkspaceError(code, message, cause);
}

export async function createWorkspaceFolder(uri: string): Promise<string> {
  const normalizedUri = normalizeWorkspaceUri(uri);
  try {
    await performWorkspaceFileOperation('mkdir', normalizedUri);
    return normalizedUri;
  } catch (error) {
    throw createWorkspaceFileError('MKDIR_ERROR', `Failed to create folder: ${normalizedUri}`, error);
  }
}

export async function listWorkspaceFolder(uri: string): Promise<FileInfo[]> {
  const normalizedUri = normalizeWorkspaceUri(uri);

  try {
    const response = await performWorkspaceFileOperation('readdir', normalizedUri);
    return response.entries.map((entry: { name: string; isDirectory: boolean; size: number; modified: string }) => ({
      name: entry.name,
      path: `${normalizedUri}/${entry.name}`,
      isDirectory: entry.isDirectory,
      size: entry.size,
      modified: new Date(entry.modified),
    }));
  } catch (error) {
    throw createWorkspaceFileError('READDIR_ERROR', `Failed to list folder: ${normalizedUri}`, error);
  }
}

export async function deleteWorkspaceFolder(
  uri: string,
  recursive: boolean,
  deleteFile: (uri: string) => Promise<void>,
): Promise<string> {
  const normalizedUri = normalizeWorkspaceUri(uri);

  try {
    if (recursive) {
      const entries = await listWorkspaceFolder(normalizedUri);

      for (const entry of entries) {
        if (entry.isDirectory) {
          await deleteWorkspaceFolder(entry.path, true, deleteFile);
        } else {
          await deleteFile(entry.path);
        }
      }
    }

    await performWorkspaceFileOperation('rmdir', normalizedUri);
    return normalizedUri;
  } catch (error) {
    if (error instanceof WorkspaceError) throw error;
    throw createWorkspaceFileError('RMDIR_ERROR', `Failed to delete folder: ${normalizedUri}`, error);
  }
}

export async function listWorkspaceFolderRecursive(uri: string, maxDepth = 10): Promise<FileInfo[]> {
  const results: FileInfo[] = [];

  const traverse = async (currentUri: string, depth: number): Promise<void> => {
    if (depth > maxDepth) return;

    const entries = await listWorkspaceFolder(currentUri);

    for (const entry of entries) {
      results.push(entry);
      if (entry.isDirectory) {
        await traverse(entry.path, depth + 1);
      }
    }
  };

  await traverse(normalizeWorkspaceUri(uri), 0);
  return results;
}

export function fileInfoFromStatResponse(
  normalizedUri: string,
  response: { isDirectory: boolean; size: number; modified: string; created?: string; readonly?: boolean },
): FileInfo {
  return {
    name: extractWorkspaceFileName(normalizedUri),
    path: normalizedUri,
    isDirectory: response.isDirectory,
    size: response.size,
    modified: new Date(response.modified),
    created: response.created ? new Date(response.created) : undefined,
    readonly: response.readonly,
  };
}
