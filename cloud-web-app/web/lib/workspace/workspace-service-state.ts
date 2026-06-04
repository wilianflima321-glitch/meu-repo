import {
  extractWorkspaceFileName,
  normalizeWorkspaceUri,
} from './workspace-service.helpers';
import type { DirtyFile, RecentFile } from './workspace-service.types';

export function getRecentFilesState(
  recentFiles: Map<string, RecentFile>,
  limit?: number
): RecentFile[] {
  const files = Array.from(recentFiles.values()).sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.lastAccessed.getTime() - a.lastAccessed.getTime();
  });

  return limit ? files.slice(0, limit) : files;
}

export function trackRecentFileState(
  recentFiles: Map<string, RecentFile>,
  uri: string,
  pinned: boolean,
  maxRecentFiles: number
): void {
  const normalizedUri = normalizeWorkspaceUri(uri);
  recentFiles.set(normalizedUri, {
    uri: normalizedUri,
    name: extractWorkspaceFileName(normalizedUri),
    lastAccessed: new Date(),
    pinned,
  });

  pruneRecentFilesState(recentFiles, maxRecentFiles);
}

export function clearRecentFilesState(recentFiles: Map<string, RecentFile>): void {
  const pinnedFiles = Array.from(recentFiles.values()).filter((file) => file.pinned);
  recentFiles.clear();

  for (const file of pinnedFiles) {
    recentFiles.set(file.uri, file);
  }
}

export function pinRecentFileState(recentFiles: Map<string, RecentFile>, uri: string): boolean {
  const file = recentFiles.get(normalizeWorkspaceUri(uri));
  if (!file) return false;

  file.pinned = true;
  return true;
}

export function unpinRecentFileState(recentFiles: Map<string, RecentFile>, uri: string): boolean {
  const file = recentFiles.get(normalizeWorkspaceUri(uri));
  if (!file) return false;

  file.pinned = false;
  return true;
}

export function transferRecentState(
  recentFiles: Map<string, RecentFile>,
  oldUri: string,
  newUri: string
): void {
  const file = recentFiles.get(oldUri);
  if (!file) return;

  recentFiles.delete(oldUri);
  recentFiles.set(newUri, {
    ...file,
    uri: newUri,
    name: extractWorkspaceFileName(newUri),
  });
}

function pruneRecentFilesState(
  recentFiles: Map<string, RecentFile>,
  maxRecentFiles: number
): void {
  const files = getRecentFilesState(recentFiles);
  if (files.length <= maxRecentFiles) return;

  const pinnedCount = files.filter((file) => file.pinned).length;
  const toRemove = files.filter((file) => !file.pinned).slice(maxRecentFiles - pinnedCount);

  for (const file of toRemove) {
    recentFiles.delete(file.uri);
  }
}

export function markDirtyState(
  dirtyFiles: Map<string, DirtyFile>,
  uri: string,
  originalContent: string,
  currentContent: string
): void {
  const normalizedUri = normalizeWorkspaceUri(uri);
  dirtyFiles.set(normalizedUri, {
    uri: normalizedUri,
    originalContent,
    currentContent,
    lastModified: new Date(),
  });
}

export function updateDirtyContentState(
  dirtyFiles: Map<string, DirtyFile>,
  uri: string,
  currentContent: string
): boolean {
  const dirty = dirtyFiles.get(normalizeWorkspaceUri(uri));
  if (!dirty) return false;

  dirty.currentContent = currentContent;
  dirty.lastModified = new Date();
  return true;
}

export function transferDirtyState(
  dirtyFiles: Map<string, DirtyFile>,
  oldUri: string,
  newUri: string
): void {
  const dirty = dirtyFiles.get(oldUri);
  if (!dirty) return;

  dirtyFiles.delete(oldUri);
  dirtyFiles.set(newUri, {
    ...dirty,
    uri: newUri,
  });
}
