"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import type * as monacoEditor from 'monaco-editor'
import FileExplorerPro from "@/components/ide/FileExplorerPro";
import AIChatPanelContainer from "@/components/ide/AIChatPanelContainer";
import CanonicalPreviewSurface from "@/components/preview/CanonicalPreviewSurface";
import PreviewRuntimeToolbar from "@/components/ide/PreviewRuntimeToolbar";
import TabBar, { TabProvider } from "@/components/editor/TabBar";
import MonacoEditorPro from "@/components/editor/MonacoEditorPro";
import type { Diagnostic as MonacoDiagnostic } from "@/components/editor/MonacoEditorPro";
import SplitEditor, { type EditorGroup, type EditorTab, type SplitDirection } from "@/components/editor/SplitEditor";
import CommandPaletteProvider, { type FileItem } from "@/components/ide/CommandPalette";
import { ModernIDEShell } from "@/components/ide/ModernIDEShell";
import type { PanelState as ModernPanelState } from "@/components/ide/ModernIDEShell";
import { EditorApplyBridgeProvider } from "@/components/ide/EditorApplyBridgeContext";
import { IdeWorkbenchCommandExtras } from "@/components/ide/IdeWorkbenchCommandExtras";
import { DevicePreview } from "@/components/ide/DevicePreview";
import { ConsoleIntegration } from "@/components/ide/ConsoleIntegration";
import { GitIntegration } from "@/components/ide/GitIntegration";
import { IntelliSense } from "@/components/ide/IntelliSense";
import { ErrorHighlighting } from "@/components/ide/ErrorHighlighting";
import OutlinePanel, { type DocumentSymbol } from "@/components/outline/OutlinePanel";
import { buildOutlineSymbols } from "@/components/outline/outline-parser";
import { analytics } from "@/lib/analytics";
import { usePreviewRuntimeManager } from '@/hooks/usePreviewRuntimeManager';
import { submitChangeFeedback } from '@/lib/ai/change-feedback-client';

const LAST_PROJECT_ID_STORAGE_KEY = "aethel.workbench.lastProjectId";
const PREVIEW_ENABLED_STORAGE_KEY = "aethel.workbench.preview.enabled";
const PANEL_STATE_STORAGE_KEY = "aethel.workbench.panelState";

type ActiveFileState = {
  path: string;
  content: string;
  language: string;
};

type EditorPane = 'primary' | 'secondary';

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

type EntryNotice = {
  tone: 'info' | 'warning'
  title: string
  description: string
}

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const token = window.localStorage.getItem('token')
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
  const missionParam = searchParams.get("mission");
  const previewUrlParam = searchParams.get("previewUrl");
  const sourceParam = searchParams.get("source");

  const projectId = useMemo(() => {
    if (projectIdParam && projectIdParam.trim()) {
      return projectIdParam.trim();
    }
    if (typeof window === "undefined") return "default";
    const fromStorage = localStorage.getItem(LAST_PROJECT_ID_STORAGE_KEY);
    return fromStorage?.trim() || "default";
  }, [projectIdParam]);

  const [activeFile, setActiveFile] = useState<ActiveFileState | null>(null);
  const [secondaryFile, setSecondaryFile] = useState<ActiveFileState | null>(null);
  const [splitEditorOpen, setSplitEditorOpen] = useState(false);
  const [splitDirection, setSplitDirection] = useState<SplitDirection>('horizontal');
  const [splitActivePane, setSplitActivePane] = useState<EditorPane>('primary');
  const [nextOpenTarget, setNextOpenTarget] = useState<EditorPane>('primary');
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
  const [modernPanelState, setModernPanelState] = useState<ModernPanelState>(() => {
    const fallback: ModernPanelState = {
      sidebar: { open: true, size: 20 },
      editor: { open: true, size: 45 },
      preview: { open: true, size: 35 },
      chat: { open: false, size: 25 },
    }
    if (typeof window === "undefined") return fallback;

    try {
      const stored = window.localStorage.getItem(PANEL_STATE_STORAGE_KEY);
      if (!stored) return fallback;
      const parsed = JSON.parse(stored) as Partial<ModernPanelState>;
      return {
        sidebar: { ...fallback.sidebar, ...parsed.sidebar },
        editor: { ...fallback.editor, ...parsed.editor },
        preview: { ...fallback.preview, ...parsed.preview },
        chat: { ...fallback.chat, ...parsed.chat },
      };
    } catch {
      return fallback;
    }
  });
  const [previewMode, setPreviewMode] = useState<'runtime' | 'device' | 'console' | 'viewport3d'>('runtime')
  const [sidebarTab, setSidebarTab] = useState<'explorer' | 'git'>('explorer')
  const [entryNotice, setEntryNotice] = useState<EntryNotice | null>(null)
  const [showIntelliSense, setShowIntelliSense] = useState(false)
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const [showOutline, setShowOutline] = useState(false)
  const [editorDiagnostics, setEditorDiagnostics] = useState<MonacoDiagnostic[]>([])
  const [secondaryEditorDiagnostics, setSecondaryEditorDiagnostics] = useState<MonacoDiagnostic[]>([])
  const [previewRefreshTick, setPreviewRefreshTick] = useState(0);
  const [initialFileResolved, setInitialFileResolved] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(false)
  const [fullAccessBusy, setFullAccessBusy] = useState(false)
  const [rollbackBusy, setRollbackBusy] = useState(false)
  const [hasToken, setHasToken] = useState(false)
  const [lastAiApply, setLastAiApply] = useState<(InlineApplyResult & { appliedAt: string }) | null>(null)
  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null)
  const primaryEditorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null)
  const secondaryEditorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null)
  const runtimeSyncTimerRef = useRef<number | null>(null)
  const lastRuntimeSyncAtRef = useRef<number>(0)

  const bridgeActiveFile = splitActivePane === 'secondary' && secondaryFile ? secondaryFile : activeFile
  const activeDiagnostics = splitActivePane === 'secondary' ? secondaryEditorDiagnostics : editorDiagnostics
  const outlineSymbols = useMemo<DocumentSymbol[]>(() => {
    if (!bridgeActiveFile) return []
    return buildOutlineSymbols(bridgeActiveFile.content, bridgeActiveFile.language)
  }, [bridgeActiveFile])

  const [workspaceFiles, setWorkspaceFiles] = useState<FileItem[]>([])
  const [workspaceFilesLoaded, setWorkspaceFilesLoaded] = useState(false)

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

  const runtimeStateLabel = useMemo(() => {
    if (runtimeHealth.status === 'reachable') {
      return typeof runtimeHealth.latencyMs === 'number'
        ? `pronto ${runtimeHealth.latencyMs}ms`
        : 'pronto'
    }
    if (runtimeHealth.status === 'checking') return 'validando'
    if (runtimeHealth.status === 'idle') return 'inline'
    return runtimeHealth.reason || runtimeHealth.status
  }, [runtimeHealth.latencyMs, runtimeHealth.reason, runtimeHealth.status])

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

  const openCommandPalette = useCallback((mode: 'commands' | 'files' = 'commands') => {
    window.dispatchEvent(new CustomEvent('aethel.commandPalette.open', { detail: { mode } }))
  }, [])

  const handleBackToDashboard = useCallback(() => {
    const params = new URLSearchParams()
    if (projectId && projectId !== 'default') params.set('projectId', projectId)
    if (missionParam) params.set('mission', missionParam)
    if (sourceParam) params.set('source', sourceParam)
    window.location.assign(params.toString() ? `/dashboard?${params.toString()}` : '/dashboard')
  }, [missionParam, projectId, sourceParam])

  const handleOpenSettings = useCallback(() => {
    const params = new URLSearchParams(window.location.search)
    const currentProjectId = params.get('projectId')
    const next = currentProjectId ? `/settings?projectId=${encodeURIComponent(currentProjectId)}` : '/settings'
    window.location.assign(next)
  }, [])

  const handleEditorUndo = useCallback(() => {
    editorRef.current?.trigger('aethel', 'undo', null)
  }, [])

  const handleEditorRedo = useCallback(() => {
    editorRef.current?.trigger('aethel', 'redo', null)
  }, [])

  const handleEditorFind = useCallback(() => {
    editorRef.current?.trigger('aethel', 'actions.find', null)
  }, [])

  const handleEditorReplace = useCallback(() => {
    editorRef.current?.trigger('aethel', 'editor.action.startFindReplaceAction', null)
  }, [])

  const emitLayoutEvent = useCallback((eventName: string) => {
    window.dispatchEvent(new Event(eventName))
  }, [])

  const handleAIInline = useCallback(() => {
    editorRef.current?.trigger('aethel', 'aethel.inlineEdit', null)
  }, [])

  const handleAIPanel = useCallback(() => {
    emitLayoutEvent('aethel.layout.openAI')
  }, [emitLayoutEvent])

  const handleSelectSidebarTab = useCallback((tab: 'explorer' | 'git') => {
    setSidebarTab(tab)
    setModernPanelState((prev) => ({
      ...prev,
      sidebar: {
        ...prev.sidebar,
        open: true,
      },
    }))
  }, [])

  const handleSelectPreviewMode = useCallback((mode: 'runtime' | 'device' | 'console' | 'viewport3d') => {
    setPreviewEnabled(true)
    setPreviewMode(mode)
    setModernPanelState((prev) => ({
      ...prev,
      preview: {
        ...prev.preview,
        open: true,
      },
    }))
  }, [])

  const clearEntryNotice = useCallback(() => {
    setEntryNotice(null)
  }, [])

  const showEntryNotice = useCallback((notice: EntryNotice) => {
    setEntryNotice(notice)
  }, [])

  const handleToggleDiagnosticsPanel = useCallback(() => {
    setShowDiagnostics((prev) => !prev)
  }, [])

  const handleJumpToOutlineSymbol = useCallback((symbol: DocumentSymbol) => {
    const editor = splitActivePane === 'secondary' ? secondaryEditorRef.current : primaryEditorRef.current
    if (!editor) return
    editor.revealLineInCenter(symbol.selectionRange.startLine)
    editor.setPosition({
      lineNumber: symbol.selectionRange.startLine,
      column: symbol.selectionRange.startColumn,
    })
    editor.focus()
  }, [splitActivePane])

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
        throw new Error(payload.error || payload.message || `Falha na requisição: ${response.status}`)
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

    const onToggleSidebar = () => {
      setModernPanelState((prev) => ({
        ...prev,
        sidebar: {
          ...prev.sidebar,
          open: !prev.sidebar.open,
        },
      }))
    }

    const onOpenAI = () => {
      setModernPanelState((prev) => ({
        ...prev,
        chat: {
          ...prev.chat,
          open: true,
        },
      }))
    }

    const onToggleTerminal = () => {
      handleSelectPreviewMode('console')
    }

    const onOpenSidebarTab = (event: Event) => {
      const detail = (event as CustomEvent<{ tab?: 'explorer' | 'git' }>).detail
      if (detail?.tab === 'explorer' || detail?.tab === 'git') {
        handleSelectSidebarTab(detail.tab)
      }
    }

    const onOpenBottomTab = (event: Event) => {
      const detail = (event as CustomEvent<{ tab?: string }>).detail
      if (detail?.tab === 'terminal') {
        handleSelectPreviewMode('console')
        return
      }
      if (detail?.tab === 'debug') {
        setShowDiagnostics(true)
      }
    }

    window.addEventListener('aethel.layout.toggleSidebar', onToggleSidebar)
    window.addEventListener('aethel.layout.openAI', onOpenAI)
    window.addEventListener('aethel.layout.toggleTerminal', onToggleTerminal)
    window.addEventListener('aethel.layout.openSidebarTab', onOpenSidebarTab as EventListener)
    window.addEventListener('aethel.layout.openBottomTab', onOpenBottomTab as EventListener)

    return () => {
      window.removeEventListener('aethel.layout.toggleSidebar', onToggleSidebar)
      window.removeEventListener('aethel.layout.openAI', onOpenAI)
      window.removeEventListener('aethel.layout.toggleTerminal', onToggleTerminal)
      window.removeEventListener('aethel.layout.openSidebarTab', onOpenSidebarTab as EventListener)
      window.removeEventListener('aethel.layout.openBottomTab', onOpenBottomTab as EventListener)
    }
  }, [handleSelectPreviewMode, handleSelectSidebarTab])

  useEffect(() => {
    if (typeof window === 'undefined') return
    setHasToken(Boolean(window.localStorage.getItem('token')))
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!projectId) return
    let cancelled = false

    const flattenTree = (nodes: Array<{ name: string; path: string; type: 'file' | 'directory'; children?: any[] }>): FileItem[] => {
      const out: FileItem[] = []
      const walk = (list: any[]) => {
        for (const node of list) {
          if (!node || typeof node.path !== 'string' || typeof node.name !== 'string') continue
          const nodeType = node.type === 'directory' ? 'folder' : 'file'
          out.push({
            path: node.path,
            name: node.name,
            type: nodeType,
          })
          if (Array.isArray(node.children) && node.children.length) {
            walk(node.children)
          }
        }
      }
      walk(nodes)
      return out
    }

    const load = async () => {
      try {
        const res = await fetch('/api/files/tree', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-project-id': projectId,
          },
          body: JSON.stringify({ path: '/', maxDepth: 6, projectId }),
        })
        if (!res.ok) {
          if (!cancelled) {
            setWorkspaceFiles([])
            setWorkspaceFilesLoaded(true)
          }
          return
        }
        const data = (await res.json().catch(() => null)) as any
        const rawTree = Array.isArray(data?.children)
          ? data.children
          : Array.isArray(data?.tree)
            ? data.tree
            : []
        const flattened = flattenTree(rawTree)
        if (!cancelled) {
          setWorkspaceFiles(flattened)
          setWorkspaceFilesLoaded(true)
        }
      } catch {
        if (!cancelled) {
          setWorkspaceFiles([])
          setWorkspaceFilesLoaded(true)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [projectId])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onCommand = (event: Event) => {
      const detail = (event as CustomEvent<{ command?: string }>).detail
      const command = detail?.command
      if (!command) return

      switch (command) {
        case 'workbench.action.quickOpen':
          openCommandPalette('files')
          return
        case 'workbench.action.showCommands':
          openCommandPalette('commands')
          return
        case 'workbench.action.toggleSidebarVisibility':
          emitLayoutEvent('aethel.layout.toggleSidebar')
          return
        case 'workbench.action.terminal.toggleTerminal':
          emitLayoutEvent('aethel.layout.toggleTerminal')
          return
        case 'undo':
          handleEditorUndo()
          return
        case 'redo':
          handleEditorRedo()
          return
        case 'actions.find':
          handleEditorFind()
          return
        case 'editor.action.startFindReplaceAction':
          handleEditorReplace()
          return
        case 'aethel.ai.inlineChat':
          handleAIInline()
          return
        case 'aethel.ai.openChat':
          handleAIPanel()
          return
        default:
          return
      }
    }

    window.addEventListener('aethel:command', onCommand as EventListener)
    return () => window.removeEventListener('aethel:command', onCommand as EventListener)
  }, [emitLayoutEvent, handleAIInline, handleAIPanel, handleEditorFind, handleEditorRedo, handleEditorReplace, handleEditorUndo, openCommandPalette])

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PREVIEW_ENABLED_STORAGE_KEY, previewEnabled ? "1" : "0");
  }, [previewEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PANEL_STATE_STORAGE_KEY, JSON.stringify(modernPanelState));
  }, [modernPanelState]);

  useEffect(() => {
    setModernPanelState((prev) => ({
      ...prev,
      preview: {
        ...prev.preview,
        open: previewEnabled,
      },
    }));
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
    async (path: string, targetPane: EditorPane = 'primary') => {
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
          throw new Error(bodyText || `Falha ao ler (HTTP ${response.status})`);
        }

        const payload = await response.json();
        const content = typeof payload?.content === "string" ? payload.content : "";

        const nextFile = {
          path: normalizedPath,
          content,
          language: resolveLanguage(normalizedPath),
        };

        if (targetPane === 'secondary') {
          setSecondaryFile(nextFile);
          setSplitEditorOpen(true);
          setSplitActivePane('secondary');
          setNextOpenTarget('primary');
        } else {
          setActiveFile(nextFile);
          setSplitActivePane('primary');
        }
        setLastSavedAt(null);
      } catch (error) {
        setFileError(error instanceof Error ? error.message : "Não foi possível ler o arquivo.");
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
          throw new Error(bodyText || `Falha ao salvar (HTTP ${response.status})`);
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
        setFileError(error instanceof Error ? error.message : "Não foi possível salvar o arquivo.");
      } finally {
        setIsSavingFile(false);
      }
    },
    [projectId, previewEnabled, previewSandboxId, scheduleRuntimeSync, syncRuntimeFile]
  );

  const handleSaveActiveFile = useCallback(() => {
    if (!activeFile) return
    void writeFile(activeFile.path, activeFile.content)
  }, [activeFile, writeFile])

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
    if (!activeFile?.path) {
      setEditorDiagnostics([])
    }
  }, [activeFile?.path])

  useEffect(() => {
    if (!splitEditorOpen || secondaryFile || !activeFile) return
    setSecondaryFile({ ...activeFile })
  }, [activeFile, secondaryFile, splitEditorOpen])

  useEffect(() => {
    if (!entryParam) return;
    const entry = entryParam.toLowerCase();
    const labNotice = {
      tone: 'warning' as const,
      title: 'Surface em modo Labs',
      description: 'Esta rota foi convergida para o workbench principal. A experiência canônica ainda está no shell de código, prévia e revisão.',
    }

    clearEntryNotice()

    if (entry === "ai" || entry === "chat" || entry === 'ai-command') {
      window.dispatchEvent(new Event("aethel.layout.openAI"));
      if (entry === 'ai-command') {
        showEntryNotice({
          tone: 'info',
          title: 'Comando de IA convergido',
          description: 'A ação abriu o painel principal de IA dentro do workbench, onde diff, execução e contexto ficam centralizados.',
        })
      }
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
    if (entry === 'git') {
      window.dispatchEvent(
        new CustomEvent("aethel.layout.openSidebarTab", {
          detail: { tab: "git" },
        })
      );
      showEntryNotice({
        tone: 'info',
        title: 'Git aberto no workbench',
        description: 'A rota dedicada foi convergida para a barra lateral do IDE para manter revisão, arquivos e diff no mesmo fluxo.',
      })
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
      showEntryNotice({
        tone: 'info',
        title: 'Prévia aberta no shell principal',
        description: 'A prévia canônica agora vive dentro do workbench para manter runtime, console e editor no mesmo contexto.',
      })
      return;
    }
    if (entry === 'editor-hub') {
      setPreviewEnabled(true)
      showEntryNotice({
        tone: 'info',
        title: 'Editor Hub convergido',
        description: 'Você já está no hub principal do editor. A navegação dedicada foi removida para evitar duplicidade de shell.',
      })
      return
    }
    if (entry === 'search') {
      openCommandPalette('files')
      showEntryNotice({
        tone: 'info',
        title: 'Busca convergida',
        description: 'A busca dedicada foi substituída pela command palette e pelo quick open do workbench.',
      })
      return
    }
    if (entry === "playground") {
      setPreviewEnabled(true);
      window.dispatchEvent(new Event("aethel.layout.openAI"));
      showEntryNotice({
        tone: 'info',
        title: 'Playground convergido',
        description: 'O playground agora usa o shell principal com prévia ativa e copiloto aberto, evitando uma superfície paralela.',
      })
      return;
    }
    if (entry === "testing") {
      setPreviewEnabled(true);
      window.dispatchEvent(
        new CustomEvent("aethel.layout.openBottomTab", {
          detail: { tab: "debug" },
        })
      );
      showEntryNotice({
        tone: 'info',
        title: 'Testing convergido',
        description: 'A rota abriu a prévia e os diagnósticos do editor para manter testes e inspeção no mesmo fluxo.',
      })
      return
    }
    if (
      entry === 'animation-blueprint' ||
      entry === 'blueprint-editor' ||
      entry === 'landscape-editor' ||
      entry === 'level-editor' ||
      entry === 'niagara-editor' ||
      entry === 'vr-preview'
    ) {
      handleSelectPreviewMode('viewport3d')
      window.dispatchEvent(new Event("aethel.layout.openAI"));
      showEntryNotice(labNotice)
    }
  }, [clearEntryNotice, entryParam, handleSelectPreviewMode, openCommandPalette, showEntryNotice]);

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
      void readFile(file.path, nextOpenTarget);
    },
    [nextOpenTarget, readFile]
  );

  const handlePaletteOpenFile = useCallback((path: string) => {
    void readFile(path, nextOpenTarget);
  }, [nextOpenTarget, readFile]);

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

  const handleToggleSplitEditor = useCallback(() => {
    setSplitEditorOpen((prev) => {
      const next = !prev
      if (!next) {
        setSecondaryFile(null)
        setNextOpenTarget('primary')
        setSplitActivePane('primary')
      } else if (activeFile) {
        setSecondaryFile((current) => current ?? { ...activeFile })
      }
      return next
    })
  }, [activeFile])

  const splitEditorGroups = useMemo<EditorGroup[]>(() => {
    const groups: EditorGroup[] = []
    if (activeFile) {
      const primaryTab: EditorTab = {
        id: `primary:${activeFile.path}`,
        title: activeFile.path.split('/').pop() || activeFile.path,
        path: activeFile.path,
        language: activeFile.language,
        dirty: false,
        pinned: true,
        preview: false,
      }
      groups.push({
        id: 'primary',
        tabs: [primaryTab],
        activeTabId: primaryTab.id,
      })
    }

    if (splitEditorOpen && secondaryFile) {
      const secondaryTab: EditorTab = {
        id: `secondary:${secondaryFile.path}`,
        title: secondaryFile.path.split('/').pop() || secondaryFile.path,
        path: secondaryFile.path,
        language: secondaryFile.language,
        dirty: false,
        pinned: false,
        preview: false,
      }
      groups.push({
        id: 'secondary',
        tabs: [secondaryTab],
        activeTabId: secondaryTab.id,
      })
    }

    return groups
  }, [activeFile, secondaryFile, splitEditorOpen])

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
            throw new Error(payload.error || payload.message || `Falha na requisição: ${response.status}`)
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
            throw new Error(payload.error || payload.message || `Falha na requisição: ${response.status}`)
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
          throw new Error(payload.error || payload.message || `Falha ao desfazer (HTTP ${response.status})`)
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
        setFileError(error instanceof Error ? error.message : 'Não foi possível desfazer a última aplicação de IA.')
      } finally {
        setRollbackBusy(false)
      }
    })()
  }, [activeFile, lastAiApply?.filePath, lastAiApply?.rollbackToken, lastAiApply?.runId, projectId, readFile, rollbackBusy])

  return (
    <CommandPaletteProvider
      onOpenFile={handlePaletteOpenFile}
      onOpenFileDialog={() => openCommandPalette('files')}
      onSaveFile={handleSaveActiveFile}
      onUndo={handleEditorUndo}
      onRedo={handleEditorRedo}
      onFind={handleEditorFind}
      onReplace={handleEditorReplace}
      onOpenSettings={handleOpenSettings}
      onToggleSidebar={() => emitLayoutEvent("aethel.layout.toggleSidebar")}
      onToggleTerminal={() => emitLayoutEvent("aethel.layout.toggleTerminal")}
      onAIChat={handleAIPanel}
      files={workspaceFilesLoaded ? workspaceFiles : []}
    >
      <IdeWorkbenchCommandExtras />
      <TabProvider>
        <EditorApplyBridgeProvider
          editorRef={editorRef}
          activeFilePath={bridgeActiveFile?.path ?? null}
          activeFileContent={bridgeActiveFile?.content ?? ""}
          normalizePath={normalizePath}
          writeFile={writeFile}
          readFile={readFile}
        >
        <ModernIDEShell
            projectName={`Projeto ${projectId}`}
            activeFileName={activeFile?.path}
            banner={
              entryNotice ? (
                <WorkbenchEntryNotice
                  notice={entryNotice}
                  onDismiss={clearEntryNotice}
                />
              ) : null
            }
            panelState={modernPanelState}
            onResizePanel={(panel, size) => {
              setModernPanelState((prev) => ({
                ...prev,
                [panel]: {
                  ...prev[panel],
                  size,
                },
              }))
            }}
            onToggleSidebar={() => {
              setModernPanelState((prev) => ({
                ...prev,
                sidebar: {
                  ...prev.sidebar,
                  open: !prev.sidebar.open,
                },
              }))
            }}
            onTogglePanel={(panel) => {
              if (panel === 'preview') {
                setPreviewEnabled((prev) => !prev)
                return
              }
              if (panel === 'chat') {
                handleAIPanel()
              }
              setModernPanelState((prev) => ({
                ...prev,
                [panel]: {
                  ...prev[panel],
                  open: !prev[panel].open,
                },
              }))
            }}
            onRunPrimaryAction={handleRunRecommendedPreviewAction}
            onOpenSettings={handleOpenSettings}
            onOpenCommandPalette={openCommandPalette}
            onSelectSidebarTab={handleSelectSidebarTab}
            onSelectPreviewMode={handleSelectPreviewMode}
            onToggleDiagnostics={handleToggleDiagnosticsPanel}
            activeSidebarTab={sidebarTab}
            activePreviewMode={previewMode}
          >
            {{
              sidebar: (
                <div className="h-full flex flex-col">
                  <div className="flex items-center gap-2 border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_68%,transparent)] px-3 py-3">
                    <button
                      type="button"
                      onClick={() => setSidebarTab('explorer')}
                      className={`flex-1 rounded-lg px-3 py-2 min-h-9 text-[11px] font-medium transition-colors ${
                        sidebarTab === 'explorer'
                          ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)] text-[var(--aethel-primary-light)]'
                          : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
                      }`}
                    >
                      Arquivos
                    </button>
                    <button
                      type="button"
                      onClick={() => setSidebarTab('git')}
                      className={`flex-1 rounded-lg px-3 py-2 min-h-9 text-[11px] font-medium transition-colors ${
                        sidebarTab === 'git'
                          ? 'bg-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)] text-[var(--aethel-info-light)]'
                          : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
                      }`}
                    >
                      Git
                    </button>
                  </div>
                  <div className="flex-1 min-h-0">
                    {sidebarTab === 'explorer' ? (
                      <FileExplorerPro onFileSelect={handleFileSelect} />
                    ) : (
                      <GitIntegration />
                    )}
                  </div>
                </div>
              ),
              chat: <AIChatPanelContainer />,
              editor: (
                <div className="h-full flex flex-col">
                  {isCompactViewport && (
                    <div className="border-b border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] px-4 py-3.5 text-xs leading-6 text-[color-mix(in_srgb,var(--aethel-warning-light)_70%,transparent)]">
                      Viewport compacto detectado. Para melhor experiência use desktop com {'>='} 1024px.
                    </div>
                  )}
                  <TabBar />
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color-mix(in_srgb,var(--aethel-border-secondary)_70%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_46%,transparent)] px-3 py-2.5 text-[11px]">
                    <div className="flex items-center gap-2 text-[var(--aethel-text-tertiary)]">
                      <span className="font-medium uppercase tracking-[0.12em]">Ferramentas do editor</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleEditorFind}
                        className="rounded-lg px-3 py-1.5 min-h-9 text-[11px] font-medium text-[var(--aethel-text-tertiary)] transition-colors hover:text-[var(--aethel-text-secondary)]"
                      >
                        Buscar
                      </button>
                      <button
                        type="button"
                        onClick={handleEditorReplace}
                        className="rounded-lg px-3 py-1.5 min-h-9 text-[11px] font-medium text-[var(--aethel-text-tertiary)] transition-colors hover:text-[var(--aethel-text-secondary)]"
                      >
                        Substituir
                      </button>
                      <button
                        type="button"
                        onClick={handleToggleSplitEditor}
                        className={`rounded-lg px-3 py-1.5 min-h-9 text-[11px] font-medium transition-colors ${
                          splitEditorOpen
                            ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)] text-[var(--aethel-primary-light)]'
                            : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
                        }`}
                      >
                        {splitEditorOpen ? 'Fechar split' : 'Dividir editor'}
                      </button>
                      {splitEditorOpen && (
                        <>
                          <button
                            type="button"
                            onClick={() => setNextOpenTarget((prev) => (prev === 'secondary' ? 'primary' : 'secondary'))}
                            className={`rounded-lg px-3 py-1.5 min-h-9 text-[11px] font-medium transition-colors ${
                              nextOpenTarget === 'secondary'
                                ? 'bg-[color-mix(in_srgb,var(--aethel-success)_18%,transparent)] text-[var(--aethel-success-light)]'
                                : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
                            }`}
                          >
                            {nextOpenTarget === 'secondary' ? 'Próximo arquivo: lateral' : 'Próximo arquivo: principal'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setSplitDirection((prev) => (prev === 'horizontal' ? 'vertical' : 'horizontal'))}
                            className="rounded-lg px-3 py-1.5 min-h-9 text-[11px] font-medium text-[var(--aethel-text-tertiary)] transition-colors hover:text-[var(--aethel-text-secondary)]"
                          >
                            {splitDirection === 'horizontal' ? 'Empilhar verticalmente' : 'Dividir lado a lado'}
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowIntelliSense((prev) => !prev)}
                        className={`rounded-lg px-3 py-1.5 min-h-9 text-[11px] font-medium transition-colors ${
                          showIntelliSense
                            ? 'bg-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)] text-[var(--aethel-info-light)]'
                            : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
                        }`}
                      >
                        IntelliSense
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowOutline((prev) => !prev)}
                        className={`rounded-lg px-3 py-1.5 min-h-9 text-[11px] font-medium transition-colors ${
                          showOutline
                            ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)] text-[var(--aethel-primary-light)]'
                            : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
                        }`}
                      >
                        Outline
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDiagnostics((prev) => !prev)}
                        className={`rounded-lg px-3 py-1.5 min-h-9 text-[11px] font-medium transition-colors ${
                          showDiagnostics
                            ? 'bg-[color-mix(in_srgb,var(--aethel-warning)_18%,transparent)] text-[var(--aethel-warning-light)]'
                            : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
                        }`}
                      >
                        Diagnósticos
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    {isReadingFile && (
                      <div className="h-full flex items-center justify-center px-6">
                        <div className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-border-secondary)_72%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_38%,transparent)] px-5 py-4 text-sm text-[var(--aethel-text-tertiary)]">
                          Carregando arquivo...
                        </div>
                      </div>
                    )}
                    {!isReadingFile && fileError && (
                      <div className="h-full flex items-center justify-center px-6">
                        <div className="max-w-xl rounded border border-[color-mix(in_srgb,var(--aethel-error)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] px-4 py-3 text-sm text-[var(--aethel-error)]">{fileError}</div>
                      </div>
                    )}
                    {!isReadingFile && !fileError && activeFile && (
                      <div className="h-full min-h-0">
                        <div className="h-full min-h-0 flex">
                          <div className="flex-1 min-w-0">
                            {splitEditorOpen ? (
                              <SplitEditor
                                groups={splitEditorGroups}
                                activeGroupId={splitActivePane}
                                splitDirection={splitDirection}
                                onGroupFocus={(groupId) => {
                                  const pane = groupId === 'secondary' ? 'secondary' : 'primary'
                                  setSplitActivePane(pane)
                                  editorRef.current = pane === 'secondary' ? secondaryEditorRef.current : primaryEditorRef.current
                                }}
                                onSplit={() => {}}
                                onTabClick={(_, groupId) => {
                                  const pane = groupId === 'secondary' ? 'secondary' : 'primary'
                                  setSplitActivePane(pane)
                                  editorRef.current = pane === 'secondary' ? secondaryEditorRef.current : primaryEditorRef.current
                                  if (pane === 'secondary') {
                                    secondaryEditorRef.current?.focus()
                                  } else {
                                    primaryEditorRef.current?.focus()
                                  }
                                }}
                                onTabClose={(_, groupId) => {
                                  if (groupId === 'secondary') {
                                    setSplitEditorOpen(false)
                                    setSecondaryFile(null)
                                    setNextOpenTarget('primary')
                                    setSplitActivePane('primary')
                                    editorRef.current = primaryEditorRef.current
                                    return
                                  }
                                  setActiveFile(null)
                                }}
                                onTabPin={() => {}}
                                onTabMove={() => {}}
                                onGroupClose={(groupId) => {
                                  if (groupId === 'secondary') {
                                    setSplitEditorOpen(false)
                                    setSecondaryFile(null)
                                    setNextOpenTarget('primary')
                                    setSplitActivePane('primary')
                                    editorRef.current = primaryEditorRef.current
                                  }
                                }}
                                renderEditor={(groupId, tab) => {
                                  if (!tab) {
                                    return (
                                      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[var(--aethel-text-tertiary)]">
                                        Nenhum arquivo aberto neste grupo.
                                      </div>
                                    )
                                  }

                                  const isSecondary = groupId === 'secondary'
                                  const fileState = isSecondary ? secondaryFile : activeFile
                                  if (!fileState) return null

                                  return (
                                    <div
                                      className="h-full"
                                      onMouseDown={() => {
                                        setSplitActivePane(isSecondary ? 'secondary' : 'primary')
                                        editorRef.current = isSecondary ? secondaryEditorRef.current : primaryEditorRef.current
                                      }}
                                    >
                                      <MonacoEditorPro
                                        path={fileState.path}
                                        value={fileState.content}
                                        language={fileState.language}
                                        fullAccessActive={Boolean(fullAccessActiveGrant)}
                                        onMount={(editor) => {
                                          if (isSecondary) {
                                            secondaryEditorRef.current = editor
                                          } else {
                                            primaryEditorRef.current = editor
                                          }
                                          if ((isSecondary && splitActivePane === 'secondary') || (!isSecondary && splitActivePane === 'primary')) {
                                            editorRef.current = editor
                                          }
                                        }}
                                        onAiApplyResult={handleInlineApplyResult}
                                        onRequestFullAccess={handleToggleFullAccess}
                                        onDiagnosticsChange={isSecondary ? setSecondaryEditorDiagnostics : setEditorDiagnostics}
                                        onChange={(value) => {
                                          const nextValue = value ?? ""
                                          if (isSecondary) {
                                            setSecondaryFile((prev) => (prev ? { ...prev, content: nextValue } : prev))
                                          } else {
                                            setActiveFile((prev) => (prev ? { ...prev, content: nextValue } : prev))
                                          }
                                        }}
                                        onSave={(value) => {
                                          void writeFile(fileState.path, value)
                                        }}
                                      />
                                    </div>
                                  )
                                }}
                              />
                            ) : (
                              <MonacoEditorPro
                                path={activeFile.path}
                                value={activeFile.content}
                                language={activeFile.language}
                                fullAccessActive={Boolean(fullAccessActiveGrant)}
                                onMount={(editor) => {
                                  primaryEditorRef.current = editor
                                  editorRef.current = editor
                                }}
                                onAiApplyResult={handleInlineApplyResult}
                                onRequestFullAccess={handleToggleFullAccess}
                                onDiagnosticsChange={setEditorDiagnostics}
                                onChange={(value) => {
                                  setActiveFile((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          content: value ?? "",
                                        }
                                      : prev
                                  )
                                }}
                                onSave={(value) => {
                                  void writeFile(activeFile.path, value)
                                }}
                              />
                            )}
                          </div>
                          {(showIntelliSense || showOutline || showDiagnostics) && (
                            <div className="w-80 border-l border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] flex flex-col">
                              {showIntelliSense && (
                                <div className="flex-1 min-h-0 border-b border-[var(--aethel-border-secondary)]">
                                  <IntelliSense />
                                </div>
                              )}
                              {showOutline && (
                                <div className="flex-1 min-h-0 border-b border-[var(--aethel-border-secondary)]">
                                  <OutlinePanel
                                    symbols={outlineSymbols}
                                    activeFilePath={bridgeActiveFile?.path ?? activeFile.path}
                                    onSymbolClick={handleJumpToOutlineSymbol}
                                  />
                                </div>
                              )}
                              {showDiagnostics && (
                                <div className="flex-1 min-h-0">
                                  <ErrorHighlighting
                                    errors={activeDiagnostics.map((diagnostic, index) => ({
                                      id: `${bridgeActiveFile?.path ?? activeFile.path}:${diagnostic.line}:${diagnostic.column}:${index}`,
                                      type:
                                        diagnostic.severity === 'error'
                                          ? 'error'
                                          : diagnostic.severity === 'warning'
                                            ? 'warning'
                                            : 'info',
                                      severity:
                                        diagnostic.severity === 'error'
                                          ? 'major'
                                          : diagnostic.severity === 'warning'
                                            ? 'minor'
                                            : 'suggestion',
                                      message: diagnostic.message,
                                      code: diagnostic.code ? String(diagnostic.code) : '',
                                      line: diagnostic.line,
                                      column: diagnostic.column,
                                      file: bridgeActiveFile?.path ?? activeFile.path,
                                      documentation: diagnostic.source
                                        ? `Origem: ${diagnostic.source}`
                                        : '',
                                      fixable: false,
                                    }))}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {!isReadingFile && !fileError && !activeFile && (
                      <div className="flex h-full items-center justify-center px-6 text-center text-sm leading-6 text-[var(--aethel-text-tertiary)]">Selecione um arquivo para iniciar a edi??o.</div>
                    )}
                  </div>
                </div>
              ),
              preview: (
                <div className="h-full min-h-0 bg-[var(--aethel-surface-primary)] flex flex-col">
                  {(previewMode === 'runtime' || previewMode === 'device') && (
                    <PreviewRuntimeToolbar
                      previewRuntimeUrl={previewRuntimeUrl}
                      runtimeHealthStatus={runtimeHealth.status}
                      runtimeHealthLatencyMs={runtimeHealth.latencyMs}
                      runtimeHealthCheckedAt={runtimeHealthCheckedAt}
                      runtimeHealthHint={runtimeHealthHint}
                      runtimeReadiness={runtimeReadiness}
                      runtimePrimaryAction={
                        runtimePrimaryAction === 'provision' || runtimePrimaryAction === 'discover'
                          ? runtimePrimaryAction
                          : 'inline'
                      }
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
                  <div className="flex flex-wrap items-center gap-2 border-b border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_55%,transparent)] px-3 py-2.5 text-[11px]">
                    {[
                      { id: 'runtime' as const, label: 'Prévia' },
                      { id: 'device' as const, label: 'Dispositivos' },
                      { id: 'console' as const, label: 'Console' },
                      { id: 'viewport3d' as const, label: 'Viewport 3D' },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setPreviewMode(mode.id)}
                        className={`rounded-lg px-3 py-1.5 font-medium transition-colors min-h-[36px] ${
                          previewMode === mode.id
                            ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] text-[var(--aethel-primary-light)]'
                            : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1 min-h-0">
                    {previewMode === 'console' && <ConsoleIntegration />}
                    {previewMode === 'viewport3d' && (
                      <CanonicalPreviewSurface
                        variant="scene"
                        renderMode="draft"
                      />
                    )}
                    {previewMode === 'runtime' && (
                      activeFile ? (
                        <div className="h-full min-h-0">
                          <CanonicalPreviewSurface
                            key={`${activeFile.path}:${previewRefreshTick}`}
                            variant="runtime"
                            title="Prévia ao vivo"
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
                      ) : (
                        <div className="flex h-full items-center justify-center px-6 text-center text-sm leading-6 text-[var(--aethel-text-tertiary)]">
                          Selecione um arquivo para visualizar a prévia.
                        </div>
                      )
                    )}
                    {previewMode === 'device' && (
                      activeFile ? (
                        <DevicePreview>
                          <CanonicalPreviewSurface
                            key={`${activeFile.path}:${previewRefreshTick}:device`}
                            variant="runtime"
                            title="Prévia ao vivo"
                            filePath={activeFile.path}
                            content={activeFile.content}
                            projectId={projectId}
                            runtimeUrl={previewRuntimeUrl ?? undefined}
                            forceInlineFallback={forceInlinePreviewFallback}
                            runtimeUnavailableReason={runtimeHealth.reason}
                            isStale={isSavingFile}
                            onRefresh={() => setPreviewRefreshTick((prev) => prev + 1)}
                          />
                        </DevicePreview>
                      ) : (
                        <div className="flex h-full items-center justify-center px-6 text-center text-sm leading-6 text-[var(--aethel-text-tertiary)]">
                          Selecione um arquivo para visualizar a prévia.
                        </div>
                      )
                    )}
                  </div>
                </div>
              )
            }}
        </ModernIDEShell>
        </EditorApplyBridgeProvider>
      </TabProvider>
    </CommandPaletteProvider>
  );
}

function WorkbenchEntryNotice({
  notice,
  onDismiss,
}: {
  notice: EntryNotice
  onDismiss: () => void
}) {
  const toneClasses =
    notice.tone === 'warning'
      ? 'border-[color-mix(in_srgb,var(--aethel-warning)_32%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning-light)]'
      : 'border-[color-mix(in_srgb,var(--aethel-info)_32%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] text-[var(--aethel-info-light)]'

  return (
    <div className="flex items-start justify-between gap-4 px-5 py-4">
      <div className={`flex-1 rounded-xl border px-4 py-3 ${toneClasses}`}>
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em]">
          {notice.title}
        </div>
        <p className="mt-1 text-sm leading-6 text-[var(--aethel-text-secondary)]">
          {notice.description}
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="min-h-[36px] rounded-lg border border-[var(--aethel-border-primary)] px-3 py-2 text-[11px] font-medium text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[var(--aethel-surface-secondary)] hover:text-[var(--aethel-text-secondary)]"
        aria-label="Fechar aviso do workbench"
      >
        Fechar
      </button>
    </div>
  )
}

export default function FullscreenIDE() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center px-6 text-sm text-[var(--aethel-text-tertiary)]">
          Carregando contexto do workspace...
        </div>
      }
    >
      <IDEContent />
    </Suspense>
  );
}


