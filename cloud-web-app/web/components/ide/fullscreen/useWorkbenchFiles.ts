'use client';

import { useCallback, useEffect, useState } from 'react';

import type { FileItem } from '@/components/ide/CommandPalette';
import { analytics } from '@/lib/analytics';
import {
  normalizePath,
  pickFirstFilePath,
  resolveLanguage,
  type WorkspaceTreeNode,
} from '@/components/ide/fullscreen/workbench-helpers';
import type {
  ActiveFileState,
  EditorPane,
} from '@/components/ide/fullscreen/types';

type UseWorkbenchFilesParams = {
  projectId: string;
  fileParam: string | null;
  previewEnabled: boolean;
  previewSandboxId: string | null;
  scheduleRuntimeSync: () => void;
  syncRuntimeFile: (path: string) => Promise<boolean>;
};

export function useWorkbenchFiles({
  projectId,
  fileParam,
  previewEnabled,
  previewSandboxId,
  scheduleRuntimeSync,
  syncRuntimeFile,
}: UseWorkbenchFilesParams) {
  const [activeFile, setActiveFile] = useState<ActiveFileState | null>(null);
  const [secondaryFile, setSecondaryFile] = useState<ActiveFileState | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isSavingFile, setIsSavingFile] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewRefreshTick, setPreviewRefreshTick] = useState(0);
  const [initialFileResolved, setInitialFileResolved] = useState(false);
  const [workspaceFiles, setWorkspaceFiles] = useState<FileItem[]>([]);
  const [workspaceFilesLoaded, setWorkspaceFilesLoaded] = useState(false);

  const readFile = useCallback(
    async (path: string, targetPane: EditorPane = 'primary') => {
      const normalizedPath = normalizePath(path);
      setIsReadingFile(true);
      setFileError(null);

      try {
        const response = await fetch('/api/files/fs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-project-id': projectId,
          },
          body: JSON.stringify({
            action: 'read',
            path: normalizedPath,
            projectId,
          }),
        });

        if (!response.ok) {
          const bodyText = await response.text();
          throw new Error(bodyText || `Failed to read (HTTP ${response.status})`);
        }

        const payload = await response.json();
        const content = typeof payload?.content === 'string' ? payload.content : '';
        const nextFile = {
          path: normalizedPath,
          content,
          language: resolveLanguage(normalizedPath),
        };

        if (targetPane === 'secondary') {
          setSecondaryFile(nextFile);
        } else {
          setActiveFile(nextFile);
        }
        setLastSavedAt(null);
      } catch (error) {
        setFileError(error instanceof Error ? error.message : 'Unable to read the file.');
      } finally {
        setIsReadingFile(false);
      }
    },
    [projectId],
  );

  const writeFile = useCallback(
    async (path: string, content: string) => {
      const normalizedPath = normalizePath(path);
      setIsSavingFile(true);
      setFileError(null);

      try {
        const response = await fetch('/api/files/fs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-project-id': projectId,
          },
          body: JSON.stringify({
            action: 'write',
            path: normalizedPath,
            content,
            projectId,
          }),
        });

        if (!response.ok) {
          const bodyText = await response.text();
          throw new Error(bodyText || `Failed to save (HTTP ${response.status})`);
        }

        setLastSavedAt(new Date());
        setPreviewRefreshTick((prev) => prev + 1);
        analytics?.track?.('project', 'project_save', {
          metadata: {
            source: 'ide-editor',
            projectId,
            file: normalizedPath,
          },
        });
        window.dispatchEvent(
          new CustomEvent('aethel.ide.fileMutation', {
            detail: {
              projectId,
              path: normalizedPath,
              operation: 'write',
              timestamp: new Date().toISOString(),
            },
          }),
        );
        if (previewEnabled && previewSandboxId) {
          void syncRuntimeFile(normalizedPath).then((synced) => {
            if (!synced) scheduleRuntimeSync();
          });
        }
      } catch (error) {
        setFileError(error instanceof Error ? error.message : 'Unable to save the file.');
      } finally {
        setIsSavingFile(false);
      }
    },
    [previewEnabled, previewSandboxId, projectId, scheduleRuntimeSync, syncRuntimeFile],
  );

  useEffect(() => {
    if (!projectId || typeof window === 'undefined') return;

    let cancelled = false;

    const flattenTree = (
      nodes: Array<{ name: string; path: string; type: 'file' | 'directory'; children?: unknown[] }>,
    ): FileItem[] => {
      const out: FileItem[] = [];

      const walk = (list: unknown[]) => {
        for (const node of list) {
          if (!node || typeof node !== 'object') continue;
          const candidate = node as {
            name?: string;
            path?: string;
            type?: 'file' | 'directory';
            children?: unknown[];
          };
          if (typeof candidate.path !== 'string' || typeof candidate.name !== 'string') continue;
          out.push({
            path: candidate.path,
            name: candidate.name,
            type: candidate.type === 'directory' ? 'folder' : 'file',
          });
          if (Array.isArray(candidate.children) && candidate.children.length) {
            walk(candidate.children);
          }
        }
      };

      walk(nodes);
      return out;
    };

    const load = async () => {
      try {
        const res = await fetch('/api/files/tree', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-project-id': projectId,
          },
          body: JSON.stringify({ path: '/', maxDepth: 6, projectId }),
        });
        if (!res.ok) {
          if (!cancelled) {
            setWorkspaceFiles([]);
            setWorkspaceFilesLoaded(true);
          }
          return;
        }

        const data = (await res.json().catch(() => null)) as {
          children?: Array<{ name: string; path: string; type: 'file' | 'directory'; children?: unknown[] }>;
          tree?: Array<{ name: string; path: string; type: 'file' | 'directory'; children?: unknown[] }>;
        } | null;
        const rawTree = Array.isArray(data?.children)
          ? data.children
          : Array.isArray(data?.tree)
            ? data.tree
            : [];
        if (!cancelled) {
          setWorkspaceFiles(flattenTree(rawTree));
          setWorkspaceFilesLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setWorkspaceFiles([]);
          setWorkspaceFilesLoaded(true);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    if (!fileParam) return;
    const normalized = normalizePath(fileParam);
    if (activeFile?.path === normalized) return;
    void readFile(normalized);
    setInitialFileResolved(true);
  }, [activeFile?.path, fileParam, readFile]);

  useEffect(() => {
    if (fileParam || initialFileResolved || activeFile || isReadingFile) return;
    let cancelled = false;

    const resolveInitialFile = async () => {
      try {
        const response = await fetch('/api/files/tree', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-project-id': projectId,
          },
          body: JSON.stringify({
            path: '/',
            maxDepth: 5,
            projectId,
          }),
        });

        if (!response.ok) {
          setInitialFileResolved(true);
          return;
        }

        const payload = await response.json();
        const treeNodes = Array.isArray(payload?.children)
          ? (payload.children as WorkspaceTreeNode[])
          : Array.isArray(payload?.tree)
            ? (payload.tree as WorkspaceTreeNode[])
            : [];
        const firstFile = pickFirstFilePath(treeNodes);
        if (!firstFile) {
          setInitialFileResolved(true);
          return;
        }
        if (!cancelled) {
          analytics?.track?.('project', 'project_open', {
            metadata: {
              source: 'ide-auto-open',
              projectId,
              file: firstFile,
            },
          });
          await readFile(firstFile);
        }
      } finally {
        if (!cancelled) setInitialFileResolved(true);
      }
    };

    void resolveInitialFile();
    return () => {
      cancelled = true;
    };
  }, [activeFile, fileParam, initialFileResolved, isReadingFile, projectId, readFile]);

  return {
    activeFile,
    fileError,
    initialFileResolved,
    isReadingFile,
    isSavingFile,
    lastSavedAt,
    previewRefreshTick,
    readFile,
    secondaryFile,
    setActiveFile,
    setFileError,
    setInitialFileResolved,
    setLastSavedAt,
    setPreviewRefreshTick,
    setSecondaryFile,
    workspaceFiles,
    workspaceFilesLoaded,
    writeFile,
  };
}

export default useWorkbenchFiles;
