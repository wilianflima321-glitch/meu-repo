'use client';

import { useCallback, useEffect, useState } from 'react';

import type { FileItem } from '../CommandPalette';
import { useAethelContext } from '../../../web/contexts/AethelContextRegistry';
import { analytics } from '../../../web/lib/analytics';
import {
  getAuthHeaders,
  normalizePath,
  pickFirstFilePath,
  resolveLanguage,
  type WorkspaceTreeNode,
} from './workbench-helpers';
import type {
  ActiveFileState,
  EditorPane,
} from './types';

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
  const { setActiveFile: setAethelActiveFile } = useAethelContext();

  useEffect(() => {
    setAethelActiveFile(activeFile?.path ?? null)
  }, [activeFile?.path, setAethelActiveFile])

  // Block 7B.2 — persist active editor path for Resume Workspace (dock layout stays on aethel.ide.dock.v1).
  useEffect(() => {
    if (typeof window === 'undefined') return
    void import('../../../web/lib/ide/workspace-session-resume').then(
      ({ saveWorkspaceSession, loadWorkspaceSession }) => {
        const prev = loadWorkspaceSession()
        const openTabPaths = Array.from(
          new Set([
            ...(prev?.openTabPaths ?? []),
            ...(activeFile?.path ? [activeFile.path] : []),
            ...(secondaryFile?.path ? [secondaryFile.path] : []),
          ]),
        )
        saveWorkspaceSession({
          openTabPaths,
          activePath: activeFile?.path ?? null,
          editorScrollLine: prev?.editorScrollLine ?? 0,
          panelScroll: prev?.panelScroll ?? {},
        })
      },
    )
  }, [activeFile?.path, secondaryFile?.path])

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
            ...getAuthHeaders(),
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

  // Block 7B.2 — open paths from resume entry / session snapshot.
  useEffect(() => {
    const onOpenPaths = (event: Event) => {
      const detail = (event as CustomEvent).detail as
        | {
            paths?: string[]
            openTabPaths?: string[]
            activePath?: string | null
            scrollLine?: number
            editorScrollLine?: number
          }
        | undefined
      const paths = (detail?.paths ?? detail?.openTabPaths ?? []).filter(
        (path) => typeof path === 'string' && path.length > 0,
      )
      const preferred =
        detail?.activePath && paths.includes(detail.activePath) ? detail.activePath : paths[0]
      if (!preferred) return
      const scrollLine = detail?.scrollLine ?? detail?.editorScrollLine ?? 0
      void readFile(preferred).then(() => {
        if (scrollLine > 0) {
          window.dispatchEvent(
            new CustomEvent('aethel.ide.restoreEditorScroll', { detail: { line: scrollLine } }),
          )
        }
      })
    }
    window.addEventListener('aethel.ide.openPaths', onOpenPaths as EventListener)
    window.addEventListener('aethel.ide.resumeSession', onOpenPaths as EventListener)
    return () => {
      window.removeEventListener('aethel.ide.openPaths', onOpenPaths as EventListener)
      window.removeEventListener('aethel.ide.resumeSession', onOpenPaths as EventListener)
    }
  }, [readFile])

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
            ...getAuthHeaders(),
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
        // Focus 1B — host disk via Tauri when present; else workspace disk authority
        const { fetchExplorerTreeAuthority } = await import(
          '../../../web/lib/explorer/workspace-tree-client'
        );
        const data = await fetchExplorerTreeAuthority({ projectId, depth: 6 });
        if (!cancelled) {
          setWorkspaceFiles(flattenTree(data.tree));
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

    let unlistenHost: (() => void) | undefined;
    void (async () => {
      const { detectHostDiskBridgeAvailable, subscribeHostDiskFsEvents } = await import(
        '../../../web/lib/explorer/workspace-tree-client'
      );
      if (!detectHostDiskBridgeAvailable() || cancelled) return;
      unlistenHost = await subscribeHostDiskFsEvents(() => {
        if (!cancelled) void load();
      });
    })();

    return () => {
      cancelled = true;
      unlistenHost?.();
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
        const { fetchExplorerTreeAuthority } = await import(
          '../../../web/lib/explorer/workspace-tree-client'
        );
        const data = await fetchExplorerTreeAuthority({ projectId, depth: 5 });
        const firstFile = pickFirstFilePath(data.tree as WorkspaceTreeNode[]);
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
      } catch {
        if (!cancelled) setInitialFileResolved(true);
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
