"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import type * as monacoEditor from 'monaco-editor'
import IDELayout from "@/components/ide/IDELayout";
import FileExplorerPro from "@/components/ide/FileExplorerPro";
import AIChatPanelContainer from "@/components/ide/AIChatPanelContainer";
import CanonicalPreviewSurface from "@/components/preview/CanonicalPreviewSurface";
import PreviewRuntimeToolbar from "@/components/ide/PreviewRuntimeToolbar";
import TabBar, { TabProvider } from "@/components/editor/TabBar";
import MonacoEditorPro from "@/components/editor/MonacoEditorPro";
import CommandPaletteProvider from "@/components/ide/CommandPalette";
import { analytics } from "@/lib/analytics";
import { usePreviewRuntimeManager } from '@/hooks/usePreviewRuntimeManager';
import { submitChangeFeedback } from '@/lib/ai/change-feedback-client';

const LAST_PROJECT_ID_STORAGE_KEY = "aethel.workbench.lastProjectId";
const PREVIEW_ENABLED_STORAGE_KEY = "aethel.workbench.preview.enabled";

type ActiveFileState = {
  path: string;
  content: string;
  language: string;
};

type WorkspaceTreeNode = {
  path?: string;
  type?: "file" | "directory";
  children?: WorkspaceTreeNode[];
};

type FullAccessGrant = {
  id: string
  userId: string
  projectId?: string | null
  scope: string[]
  expiresAt: string
  status: 'active' | 'expired' | 'revoked'
}

type FullAccessResponse = {
  error?: string
  message?: string
  metadata?: {
    grants?: FullAccessGrant[]
  }
}

type InlineApplyResult = {
  runId?: string
  rollbackToken?: string
  message?: string
  filePath?: string
}

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const token = window.localStorage.getItem('aethel-token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function resolveLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "ts" || ext === "tsx") return "typescript";
  if (ext === "js" || ext === "jsx") return "javascript";
  if (ext === "json") return "json";
  if (ext === "md") return "markdown";
  if (ext === "css" || ext === "scss") return "css";
  if (ext === "html" || ext === "htm") return "html";
  if (ext === "py") return "python";
  return "plaintext";
}

function normalizePath(input: string): string {
  if (!input) return "/";
  return input.startsWith("/") ? input : `/${input}`;
}

function pickFirstFilePath(nodes: WorkspaceTreeNode[]): string | null {
  const preferred = ["tsx", "ts", "jsx", "js", "html", "htm", "md", "json", "css"];

  const allFiles: string[] = [];
  const walk = (list: WorkspaceTreeNode[]) => {
    for (const node of list) {
      if (!node) continue;
      if (node.type === "file" && typeof node.path === "string" && node.path.trim()) {
        allFiles.push(node.path);
      }
      if (node.type === "directory" && Array.isArray(node.children)) {
        walk(node.children);
      }
    }
  };
  walk(nodes);

  if (allFiles.length === 0) return null;
  const ranked = [...allFiles].sort((a, b) => {
    const extA = a.split(".").pop()?.toLowerCase() ?? "";
    const extB = b.split(".").pop()?.toLowerCase() ?? "";
    const idxA = preferred.indexOf(extA);
    const idxB = preferred.indexOf(extB);
    const scoreA = idxA >= 0 ? idxA : preferred.length + 1;
    const scoreB = idxB >= 0 ? idxB : preferred.length + 1;
    if (scoreA !== scoreB) return scoreA - scoreB;
    return a.localeCompare(b);
  });
  return normalizePath(ranked[0]);
}

function IDEContent() {
  const searchParams = useSearchParams();
  const fileParam = searchParams.get("file");
  const projectIdParam = searchParams.get("projectId");
  const entryParam = searchParams.get("entry");
  const previewUrlParam = searchParams.get("previewUrl");

  const projectId = useMemo(() => {
    if (projectIdParam && projectIdParam.trim()) {
      return projectIdParam.trim();
    }
    if (typeof window === "undefined") return "default";
    const fromStorage = localStorage.getItem(LAST_PROJECT_ID_STORAGE_KEY);
    return fromStorage?.trim() || "default";
  }, [projectIdParam]);

  const [activeFile, setActiveFile] = useState<ActiveFileState | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isSavingFile, setIsSavingFile] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewEnabled, setPreviewEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem(PREVIEW_ENABLED_STORAGE_KEY);
    if (stored === "1") return true;
    if (stored === "0") return false;
    return window.innerWidth >= 1440;
  });
  const [previewRefreshTick, setPreviewRefreshTick] = useState(0);
  const [initialFileResolved, setInitialFileResolved] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(false)
  const [fullAccessBusy, setFullAccessBusy] = useState(false)
  const [rollbackBusy, setRollbackBusy] = useState(false)
  const [hasToken, setHasToken] = useState(false)
  const [lastAiApply, setLastAiApply] = useState<(InlineApplyResult & { appliedAt: string }) | null>(null)
  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null)
  const runtimeSyncTimerRef = useRef<number | null>(null)
  const lastRuntimeSyncAtRef = useRef<number>(0)

  const {
    previewRuntimeUrl,
    previewRuntimeInput,
    setPreviewRuntimeInput,
    showRuntimeSettings,
    setShowRuntimeSettings,
    runtimeHealth,
    runtimeHealthCheckedAt,
    isDiscoveringRuntime,
    isProvisioningRuntime,
    isSyncingRuntime,
    runtimeDiscoveryMessage,
    runtimeDiscoveryTone,
    runtimeHealthHint,
    runtimeReadiness,
    refreshRuntimeReadiness,
    runtimeStrategyLabel,
    runtimeStrategyHint,
    runtimePrimaryAction,
    runtimePrimaryActionLabel,
    forceInlinePreviewFallback,
    applyRuntimeUrl,
    discoverRuntime,
    provisionRuntime,
    syncRuntime,
    syncRuntimeFile,
    checkRuntimeHealth,
    handleUseInlineFallback,
    previewSandboxId,
  } = usePreviewRuntimeManager({
    projectId,
    previewEnabled,
    hasToken,
    previewUrlParam,
  })

  const scheduleRuntimeSync = useCallback(() => {
    if (!previewSandboxId || isSyncingRuntime) return
    if (runtimeSyncTimerRef.current) {
      window.clearTimeout(runtimeSyncTimerRef.current)
    }
    runtimeSyncTimerRef.current = window.setTimeout(() => {
      runtimeSyncTimerRef.current = null
      const now = Date.now()
      if (now - lastRuntimeSyncAtRef.current < 1000) return
      lastRuntimeSyncAtRef.current = now
      void syncRuntime()
    }, 1500)
  }, [previewSandboxId, isSyncingRuntime, syncRuntime])

  useEffect(() => {
    return () => {
      if (runtimeSyncTimerRef.current) {
        window.clearTimeout(runtimeSyncTimerRef.current)
        runtimeSyncTimerRef.current = null
      }
    }
  }, [])

  const { data: fullAccessData, mutate: mutateFullAccess } = useSWR<FullAccessResponse>(
    hasToken ? '/api/studio/access/full' : null,
    async (url: string) => {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      })
      const payload = (await response.json().catch(() => ({}))) as FullAccessResponse
      if (!response.ok) {
        throw new Error(payload.error || payload.message || `Request failed: ${response.status}`)
      }
      return payload
    },
    {
      refreshInterval: 30000,
    }
  )

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (projectId && projectId !== "default") {
      localStorage.setItem(LAST_PROJECT_ID_STORAGE_KEY, projectId);
    }
  }, [projectId]);

  useEffect(() => {
    if (typeof window === 'undefined') return
    setHasToken(Boolean(window.localStorage.getItem('aethel-token')))
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PREVIEW_ENABLED_STORAGE_KEY, previewEnabled ? "1" : "0");
  }, [previewEnabled]);

  useEffect(() => {
    if (typeof window === 'undefined') return
    const update = () => {
      setIsCompactViewport(window.innerWidth < 1024)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const readFile = useCallback(
    async (path: string) => {
      const normalizedPath = normalizePath(path);
      setIsReadingFile(true);
      setFileError(null);

      try {
        const response = await fetch("/api/files/fs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-project-id": projectId,
          },
          body: JSON.stringify({
            action: "read",
            path: normalizedPath,
            projectId,
          }),
        });

        if (!response.ok) {
          const bodyText = await response.text();
          throw new Error(bodyText || `Read failed with HTTP ${response.status}`);
        }

        const payload = await response.json();
        const content = typeof payload?.content === "string" ? payload.content : "";

        setActiveFile({
          path: normalizedPath,
          content,
          language: resolveLanguage(normalizedPath),
        });
        setLastSavedAt(null);
      } catch (error) {
        setFileError(error instanceof Error ? error.message : "Unable to read file.");
      } finally {
        setIsReadingFile(false);
      }
    },
    [projectId]
  );

  const writeFile = useCallback(
    async (path: string, content: string) => {
      const normalizedPath = normalizePath(path);
      setIsSavingFile(true);
      setFileError(null);
      try {
        const response = await fetch("/api/files/fs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-project-id": projectId,
          },
          body: JSON.stringify({
            action: "write",
            path: normalizedPath,
            content,
            projectId,
          }),
        });
        if (!response.ok) {
          const bodyText = await response.text();
          throw new Error(bodyText || `Write failed with HTTP ${response.status}`);
        }
        setLastSavedAt(new Date());
        setPreviewRefreshTick((prev) => prev + 1);
        analytics?.track?.("project", "project_save", {
          metadata: {
            source: "ide-editor",
            projectId,
            file: normalizedPath,
          },
        });
        window.dispatchEvent(new CustomEvent('aethel.ide.fileMutation', {
          detail: {
            projectId,
            path: normalizedPath,
            operation: 'write',
            timestamp: new Date().toISOString(),
          },
        }))
        if (previewEnabled && previewSandboxId) {
          void syncRuntimeFile(normalizedPath).then((synced) => {
            if (!synced) scheduleRuntimeSync()
          })
        }
      } catch (error) {
        setFileError(error instanceof Error ? error.message : "Unable to save file.");
      } finally {
        setIsSavingFile(false);
      }
    },
    [projectId, previewEnabled, previewSandboxId, scheduleRuntimeSync]
  );

  useEffect(() => {
    if (!fileParam) return;
    const normalized = normalizePath(fileParam);
    if (activeFile?.path === normalized) return;
    void readFile(normalized);
    setInitialFileResolved(true);
  }, [fileParam, activeFile?.path, readFile]);

  useEffect(() => {
    if (fileParam || initialFileResolved || activeFile || isReadingFile) return;
    let cancelled = false;

    const resolveInitialFile = async () => {
      try {
        const response = await fetch("/api/files/tree", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-project-id": projectId,
          },
          body: JSON.stringify({
            path: "/",
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
          analytics?.track?.("project", "project_open", {
            metadata: {
              source: "ide-auto-open",
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

  useEffect(() => {
    if (!entryParam) return;
    const entry = entryParam.toLowerCase();

    if (entry === "ai" || entry === "chat") {
      window.dispatchEvent(new Event("aethel.layout.openAI"));
      return;
    }
    if (entry === "explorer") {
      window.dispatchEvent(
        new CustomEvent("aethel.layout.openSidebarTab", {
          detail: { tab: "explorer" },
        })
      );
      return;
    }
    if (entry === "debugger" || entry === "debug") {
      window.dispatchEvent(
        new CustomEvent("aethel.layout.openBottomTab", {
          detail: { tab: "debug" },
        })
      );
      return;
    }
    if (entry === "terminal") {
      window.dispatchEvent(
        new CustomEvent("aethel.layout.openBottomTab", {
          detail: { tab: "terminal" },
        })
      );
      return;
    }
    if (entry === "live-preview" || entry === "preview") {
      setPreviewEnabled(true);
    }
  }, [entryParam]);

  useEffect(() => {
    const onOpenFileFromContext = (event: Event) => {
      const detail = (event as CustomEvent<{ path?: string; startLine?: number; endLine?: number; source?: string }>).detail
      const targetPath = typeof detail?.path === 'string' ? normalizePath(detail.path) : null
      if (!targetPath) return
      const startLine = typeof detail?.startLine === 'number' ? detail.startLine : null
      const endLine = typeof detail?.endLine === 'number' ? detail.endLine : startLine

      analytics?.track?.('project', 'project_open', {
        metadata: {
          source: detail?.source || 'ai-context',
          projectId,
          file: targetPath,
          startLine,
          endLine,
        },
      })

      void readFile(targetPath).then(() => {
        if (!editorRef.current || !startLine) return
        editorRef.current.revealLineInCenter(startLine)
        editorRef.current.setPosition({ lineNumber: startLine, column: 1 })
        if (endLine && endLine >= startLine) {
          editorRef.current.setSelection({
            startLineNumber: startLine,
            startColumn: 1,
            endLineNumber: endLine,
            endColumn: 1,
          })
        }
        editorRef.current.focus()
      })
      window.dispatchEvent(new Event('aethel.layout.openAI'))
    }

    window.addEventListener('aethel.ide.openFileFromContext', onOpenFileFromContext as EventListener)
    return () => {
      window.removeEventListener('aethel.ide.openFileFromContext', onOpenFileFromContext as EventListener)
    }
  }, [projectId, readFile]);

  useEffect(() => {
    analytics?.track("engine", "editor_open", {
      metadata: {
        surface: "ide",
        projectId,
        file: fileParam ?? null,
        entry: entryParam ?? null,
        runtimePreviewUrl: previewRuntimeUrl ?? null,
      },
    });
    analytics?.trackPageLoad?.("ide");
  }, [entryParam, fileParam, projectId, previewRuntimeUrl]);

  const handleFileSelect = useCallback(
    (file: { path: string; type: "file" | "folder" }) => {
      if (file.type !== "file") return;
      void readFile(file.path);
    },
    [readFile]
  );

  const handlePaletteOpenFile = useCallback((path: string) => {
    void readFile(path);
  }, [readFile]);

  const emitLayoutEvent = useCallback((eventName: string) => {
    window.dispatchEvent(new Event(eventName));
  }, []);

  const handleRunRecommendedPreviewAction = useCallback(() => {
    if (runtimePrimaryAction === 'provision') {
      void provisionRuntime('manual').then(() => {
        void refreshRuntimeReadiness()
      })
      return
    }
    if (runtimePrimaryAction === 'discover') {
      void discoverRuntime('manual').then(() => {
        void refreshRuntimeReadiness()
      })
      return
    }
    handleUseInlineFallback()
  }, [
    discoverRuntime,
    handleUseInlineFallback,
    provisionRuntime,
    refreshRuntimeReadiness,
    runtimePrimaryAction,
  ])

  const fullAccessActiveGrant = useMemo(() => {
    const grants = fullAccessData?.metadata?.grants || []
    return grants.find((grant) => grant.status === 'active') ?? null
  }, [fullAccessData?.metadata?.grants])

  const fullAccessExpiryLabel = useMemo(() => {
    if (!fullAccessActiveGrant?.expiresAt) return null
    return new Date(fullAccessActiveGrant.expiresAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [fullAccessActiveGrant?.expiresAt])

  const handleToggleFullAccess = useCallback(() => {
    if (!hasToken || fullAccessBusy) return

    void (async () => {
      setFullAccessBusy(true)
      try {
        if (fullAccessActiveGrant?.id) {
          const response = await fetch(`/api/studio/access/full/${encodeURIComponent(fullAccessActiveGrant.id)}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
          })
          const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string }
          if (!response.ok) {
            throw new Error(payload.error || payload.message || `Request failed: ${response.status}`)
          }
        } else {
          const response = await fetch('/api/studio/access/full', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify({
              projectId: projectId || undefined,
              durationMinutes: 15,
              reason: `ide_full_access:${projectId || 'workspace'}`,
              scope: projectId ? [`project:${projectId}`, 'workspace:apply'] : ['workspace:apply'],
            }),
          })
          const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string }
          if (!response.ok) {
            throw new Error(payload.error || payload.message || `Request failed: ${response.status}`)
          }
        }
        await mutateFullAccess()
      } catch (error) {
        console.error('[FullscreenIDE] full access toggle failed', error)
      } finally {
        setFullAccessBusy(false)
      }
    })()
  }, [fullAccessActiveGrant?.id, fullAccessBusy, hasToken, mutateFullAccess, projectId])

  const handleInlineApplyResult = useCallback((result: InlineApplyResult) => {
    setLastAiApply({
      runId: result.runId,
      rollbackToken: result.rollbackToken,
      message: result.message,
      filePath: result.filePath,
      appliedAt: new Date().toISOString(),
    })
  }, [])

  const handleRollbackLastAiApply = useCallback(() => {
    if (!lastAiApply?.rollbackToken || rollbackBusy || !activeFile) return

    void (async () => {
      setRollbackBusy(true)
      setFileError(null)
      try {
        const rollbackRunId = lastAiApply.runId
        const rollbackFilePath = lastAiApply.filePath || activeFile.path
        const response = await fetch('/api/ai/change/rollback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            rollbackToken: lastAiApply.rollbackToken,
          }),
        })
        const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string }
        if (!response.ok) {
          throw new Error(payload.error || payload.message || `Rollback failed: HTTP ${response.status}`)
        }

        const rollbackPath = rollbackFilePath
        await readFile(rollbackPath)
        setPreviewRefreshTick((prev) => prev + 1)
        setLastSavedAt(new Date())
        setLastAiApply(null)
        if (rollbackRunId) {
          void submitChangeFeedback({
            runId: rollbackRunId,
            feedback: 'rejected',
            reason: 'USER_TRIGGERED_ROLLBACK',
            notes: 'User triggered rollback from IDE status bar.',
            filePath: rollbackPath,
            runSource: 'production',
          })
        }
        analytics?.track?.('project', 'project_save', {
          metadata: {
            source: 'ide-inline-rollback',
            projectId,
            file: rollbackPath,
            runId: lastAiApply.runId,
          },
        })
      } catch (error) {
        setFileError(error instanceof Error ? error.message : 'Unable to rollback latest AI apply.')
      } finally {
        setRollbackBusy(false)
      }
    })()
  }, [activeFile, lastAiApply?.filePath, lastAiApply?.rollbackToken, lastAiApply?.runId, projectId, readFile, rollbackBusy])

  return (
    <CommandPaletteProvider
      onOpenFile={handlePaletteOpenFile}
      onToggleSidebar={() => emitLayoutEvent("aethel.layout.toggleSidebar")}
      onToggleTerminal={() => emitLayoutEvent("aethel.layout.toggleTerminal")}
      onAIChat={() => emitLayoutEvent("aethel.layout.openAI")}
    >
      <TabProvider>
        <IDELayout
          fileExplorer={<FileExplorerPro onFileSelect={handleFileSelect} />}
          aiChatPanel={<AIChatPanelContainer />}
          onTogglePreview={() => setPreviewEnabled((prev) => !prev)}
        >
          <div className="h-full flex flex-col">
            {isCompactViewport && (
              <div className="border-b border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                Viewport compacto detectado. Para melhor experiencia use desktop {'>='} 1024px.
              </div>
            )}
            <TabBar />
            {previewEnabled && (
              <PreviewRuntimeToolbar
                previewRuntimeUrl={previewRuntimeUrl}
                runtimeHealthStatus={runtimeHealth.status}
                runtimeHealthLatencyMs={runtimeHealth.latencyMs}
                runtimeHealthCheckedAt={runtimeHealthCheckedAt}
                runtimeHealthHint={runtimeHealthHint}
                runtimeReadiness={runtimeReadiness}
                runtimePrimaryAction={runtimePrimaryAction}
                runtimePrimaryActionLabel={runtimePrimaryActionLabel}
                runtimeStrategyLabel={runtimeStrategyLabel}
                runtimeStrategyHint={runtimeStrategyHint}
                showRuntimeSettings={showRuntimeSettings}
                previewRuntimeInput={previewRuntimeInput}
                onToggleSettings={() => setShowRuntimeSettings((prev) => !prev)}
                onRuntimeInputChange={setPreviewRuntimeInput}
                onApplyRuntime={applyRuntimeUrl}
                onUseFallback={handleUseInlineFallback}
                isDiscoveringRuntime={isDiscoveringRuntime}
                isProvisioningRuntime={isProvisioningRuntime}
                isSyncingRuntime={isSyncingRuntime}
                canSyncRuntime={Boolean(previewSandboxId)}
                runtimeDiscoveryMessage={runtimeDiscoveryMessage}
                runtimeDiscoveryTone={runtimeDiscoveryTone}
                onRunRecommendedAction={handleRunRecommendedPreviewAction}
                onDiscoverRuntime={() => {
                  void discoverRuntime('manual').then(() => {
                    void refreshRuntimeReadiness()
                  })
                }}
                onProvisionRuntime={() => {
                  void provisionRuntime('manual').then(() => {
                    void refreshRuntimeReadiness()
                  })
                }}
                onSyncRuntime={() => {
                  void syncRuntime().then(() => {
                    void refreshRuntimeReadiness()
                  })
                }}
                onRevalidate={() => {
                  if (!previewRuntimeUrl) return
                  void checkRuntimeHealth(previewRuntimeUrl)
                  analytics?.track?.('engine', 'render_time', {
                    metadata: {
                      surface: 'ide-preview-runtime-health',
                      action: 'manual-revalidate',
                      runtimeUrl: previewRuntimeUrl,
                    },
                  })
                }}
                onOpenRuntime={() => {
                  if (!previewRuntimeUrl) return
                  window.open(previewRuntimeUrl, '_blank', 'noopener,noreferrer')
                }}
              />
            )}
            <div className="flex-1 overflow-hidden">
              {isReadingFile && (
                <div className="h-full flex items-center justify-center text-zinc-400">
                  Loading file...
                </div>
              )}

              {!isReadingFile && fileError && (
                <div className="h-full flex items-center justify-center px-6">
                  <div className="max-w-xl rounded border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {fileError}
                  </div>
                </div>
              )}

              {!isReadingFile && !fileError && activeFile && (
                <div className={`h-full min-h-0 ${previewEnabled ? "grid grid-cols-1 xl:grid-cols-2" : ""}`}>
                  <div className={`h-full min-h-0 ${previewEnabled ? "border-r border-zinc-800" : ""}`}>
                    <MonacoEditorPro
                      path={activeFile.path}
                      value={activeFile.content}
                      language={activeFile.language}
                      fullAccessActive={Boolean(fullAccessActiveGrant)}
                      onMount={(editor) => {
                        editorRef.current = editor
                      }}
                      onAiApplyResult={handleInlineApplyResult}
                      onRequestFullAccess={handleToggleFullAccess}
                      onChange={(value) => {
                        setActiveFile((prev) =>
                          prev
                            ? {
                                ...prev,
                                content: value ?? "",
                              }
                            : prev
                        );
                      }}
                      onSave={(value) => {
                        void writeFile(activeFile.path, value);
                      }}
                    />
                  </div>
                  {previewEnabled && (
                    <div className="h-full min-h-0 bg-zinc-950">
                      <CanonicalPreviewSurface
                        key={`${activeFile.path}:${previewRefreshTick}`}
                        variant="runtime"
                        title="Live Preview"
                        filePath={activeFile.path}
                        content={activeFile.content}
                        projectId={projectId}
                        runtimeUrl={previewRuntimeUrl ?? undefined}
                        forceInlineFallback={forceInlinePreviewFallback}
                        runtimeUnavailableReason={runtimeHealth.reason}
                        isStale={isSavingFile}
                        onRefresh={() => setPreviewRefreshTick((prev) => prev + 1)}
                      />
                    </div>
                  )}
                </div>
              )}

              {!isReadingFile && !fileError && !activeFile && (
                <div className="h-full flex items-center justify-center text-zinc-500">
                  Select a file to start editing.
                </div>
              )}
            </div>
            {activeFile && (
              <div className="h-7 border-t border-zinc-800 bg-zinc-950 px-3 flex items-center justify-between text-xs text-zinc-400">
                <span>
                  {isSavingFile
                    ? "Saving..."
                    : lastSavedAt
                      ? `Saved at ${lastSavedAt.toLocaleTimeString()}`
                      : "Ready"}
                </span>
                <div className="flex items-center gap-2">
                  {lastAiApply?.rollbackToken && (
                    <button
                      type="button"
                      onClick={handleRollbackLastAiApply}
                      disabled={rollbackBusy}
                      className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-100 hover:bg-amber-500/20 disabled:opacity-60"
                      title="Rollback da ultima aplicacao inline da IA"
                    >
                      {rollbackBusy ? 'Rolling back...' : 'Rollback AI'}
                    </button>
                  )}
                  {fullAccessActiveGrant && (
                    <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-200">
                      Full Access ON{fullAccessExpiryLabel ? ` (${fullAccessExpiryLabel})` : ''}
                    </span>
                  )}
                  {hasToken && (
                    <button
                      type="button"
                      onClick={handleToggleFullAccess}
                      disabled={fullAccessBusy}
                      className={`rounded border px-2 py-0.5 text-[10px] disabled:opacity-60 ${
                        fullAccessActiveGrant
                          ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20'
                          : 'border-zinc-600 bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                      }`}
                      title={
                        fullAccessActiveGrant
                          ? 'Revogar Full Access temporario'
                          : 'Ativar Full Access temporario auditado'
                      }
                    >
                      {fullAccessBusy
                        ? '...'
                        : fullAccessActiveGrant
                          ? 'Revoke Full Access'
                          : 'Full Access'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </IDELayout>
      </TabProvider>
    </CommandPaletteProvider>
  );
}

export default function FullscreenIDE() {
  return (
    <Suspense fallback={<div>Loading workspace context...</div>}>
      <IDEContent />
    </Suspense>
  );
}
