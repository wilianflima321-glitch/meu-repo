"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type * as monacoEditor from 'monaco-editor'
import CollaboratorsBar from "@/components/collaboration/CollaboratorsBar";
import AIChatPanelContainer from "@/components/ide/AIChatPanelContainer";
import type { Diagnostic as MonacoDiagnostic } from "@/components/editor/MonacoEditorPro";
import type { EditorGroup, EditorTab, SplitDirection } from "@/components/editor/SplitEditor";
import { TabProvider } from "@/components/editor/TabBar";
import CommandPaletteProvider, { type FileItem } from "@/components/ide/CommandPalette";
import { ModernIDEShell } from "@/components/ide/ModernIDEShell";
import type { PanelState as ModernPanelState } from "@/components/ide/ModernIDEShell";
import { EditorApplyBridgeProvider } from "@/components/ide/EditorApplyBridgeContext";
import { IdeWorkbenchCommandExtras } from "@/components/ide/IdeWorkbenchCommandExtras";
import type { DocumentSymbol } from "@/components/outline/OutlinePanel";
import { buildOutlineSymbols } from "@/components/outline/outline-parser";
import { analytics } from "@/lib/analytics";
import { usePreviewRuntimeManager } from '@/hooks/usePreviewRuntimeManager';
import { submitChangeFeedback } from '@/lib/ai/change-feedback-client';
import {
  getAuthHeaders,
  resolveLanguage,
  normalizePath,
  pickFirstFilePath,
  type WorkspaceTreeNode,
} from '@/components/ide/fullscreen/workbench-helpers';
import { WorkbenchSidebar } from '@/components/ide/fullscreen/WorkbenchSidebar';
import { WorkbenchEditorPane } from '@/components/ide/fullscreen/WorkbenchEditorPane';
import { WorkbenchPreviewPane } from '@/components/ide/fullscreen/WorkbenchPreviewPane';
import {
  WorkbenchEntryNotice,
  type EntryNotice,
} from '@/components/ide/fullscreen/WorkbenchEntryNotice';
import {
  type ActiveFileState,
  type EditorPane,
  type InlineApplyResult,
  type PreviewMode,
  type SidebarTab,
} from '@/components/ide/fullscreen/types';
import { useWorkbenchEntryConvergence } from '@/components/ide/fullscreen/useWorkbenchEntryConvergence';
import { useWorkbenchFullAccess } from '@/components/ide/fullscreen/useWorkbenchFullAccess';
import { useWorkbenchPresence } from '@/components/ide/fullscreen/useWorkbenchPresence';

const LAST_PROJECT_ID_STORAGE_KEY = "aethel.workbench.lastProjectId";
const PREVIEW_ENABLED_STORAGE_KEY = "aethel.workbench.preview.enabled";
const PANEL_STATE_STORAGE_KEY = "aethel.workbench.panelState";

// NOTE: Workbench helpers + EntryNotice type + WorkbenchEntryNotice component
// live in components/ide/fullscreen/{workbench-helpers,WorkbenchEntryNotice}
// to keep this orchestrator under the component-budget.

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
  const [previewMode, setPreviewMode] = useState<PreviewMode>('runtime')
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('explorer')
  const [entryNotice, setEntryNotice] = useState<EntryNotice | null>(null)
  const [showIntelliSense, setShowIntelliSense] = useState(false)
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const [showOutline, setShowOutline] = useState(false)
  const [editorDiagnostics, setEditorDiagnostics] = useState<MonacoDiagnostic[]>([])
  const [secondaryEditorDiagnostics, setSecondaryEditorDiagnostics] = useState<MonacoDiagnostic[]>([])
  const [previewRefreshTick, setPreviewRefreshTick] = useState(0);
  const [initialFileResolved, setInitialFileResolved] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(false)
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

  const {
    fullAccessActiveGrant,
    toggleFullAccess: handleToggleFullAccess,
  } = useWorkbenchFullAccess({
    hasToken,
    projectId,
  })

  const { headerCollaborators } = useWorkbenchPresence({
    hasToken,
    projectId,
  })

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

  useWorkbenchEntryConvergence({
    entryParam,
    clearEntryNotice,
    openCommandPalette,
    showEntryNotice,
    setPreviewEnabled,
    handleSelectPreviewMode,
  })

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
            headerExtras={
              headerCollaborators.length > 0 ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px 8px',
                    borderRadius: '999px',
                    border: '1px solid var(--aethel-border-secondary)',
                    background: 'color-mix(in srgb, var(--aethel-surface-secondary) 68%, transparent)',
                  }}
                >
                  <CollaboratorsBar
                    peers={headerCollaborators}
                    maxVisible={4}
                    showStatusDot
                  />
                </div>
              ) : null
            }
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
                <WorkbenchSidebar
                  sidebarTab={sidebarTab}
                  onSidebarTabChange={setSidebarTab}
                  onFileSelect={handleFileSelect}
                />
              ),
              chat: <AIChatPanelContainer />,
              editor: (
                <WorkbenchEditorPane
                  activeFile={activeFile}
                  secondaryFile={secondaryFile}
                  bridgeActiveFile={bridgeActiveFile}
                  activeDiagnostics={activeDiagnostics}
                  splitEditorGroups={splitEditorGroups}
                  outlineSymbols={outlineSymbols}
                  splitEditorOpen={splitEditorOpen}
                  splitActivePane={splitActivePane}
                  splitDirection={splitDirection}
                  nextOpenTarget={nextOpenTarget}
                  isCompactViewport={isCompactViewport}
                  isReadingFile={isReadingFile}
                  fileError={fileError}
                  showIntelliSense={showIntelliSense}
                  showOutline={showOutline}
                  showDiagnostics={showDiagnostics}
                  fullAccessActive={Boolean(fullAccessActiveGrant)}
                  primaryEditorRef={primaryEditorRef}
                  secondaryEditorRef={secondaryEditorRef}
                  editorRef={editorRef}
                  setSplitActivePane={setSplitActivePane}
                  setSecondaryFile={setSecondaryFile}
                  setActiveFile={setActiveFile}
                  setShowIntelliSense={setShowIntelliSense}
                  setShowOutline={setShowOutline}
                  setShowDiagnostics={setShowDiagnostics}
                  setSplitDirection={setSplitDirection}
                  setNextOpenTarget={setNextOpenTarget}
                  setSplitEditorOpen={setSplitEditorOpen}
                  setEditorDiagnostics={setEditorDiagnostics}
                  setSecondaryEditorDiagnostics={setSecondaryEditorDiagnostics}
                  onFind={handleEditorFind}
                  onReplace={handleEditorReplace}
                  onToggleSplitEditor={handleToggleSplitEditor}
                  onJumpToOutlineSymbol={handleJumpToOutlineSymbol}
                  onInlineApplyResult={handleInlineApplyResult}
                  onRequestFullAccess={handleToggleFullAccess}
                  onSaveFile={writeFile}
                />
              ),
              preview: (
                <WorkbenchPreviewPane
                  activeFile={activeFile}
                  previewMode={previewMode}
                  previewRefreshTick={previewRefreshTick}
                  previewRuntimeUrl={previewRuntimeUrl}
                  previewRuntimeInput={previewRuntimeInput}
                  showRuntimeSettings={showRuntimeSettings}
                  runtimeHealth={runtimeHealth}
                  runtimeHealthCheckedAt={runtimeHealthCheckedAt}
                  runtimeHealthHint={runtimeHealthHint}
                  runtimeReadiness={runtimeReadiness}
                  runtimePrimaryAction={runtimePrimaryAction}
                  runtimePrimaryActionLabel={runtimePrimaryActionLabel}
                  runtimeStrategyLabel={runtimeStrategyLabel}
                  runtimeStrategyHint={runtimeStrategyHint}
                  runtimeDiscoveryMessage={runtimeDiscoveryMessage}
                  runtimeDiscoveryTone={runtimeDiscoveryTone}
                  isDiscoveringRuntime={isDiscoveringRuntime}
                  isProvisioningRuntime={isProvisioningRuntime}
                  isSyncingRuntime={isSyncingRuntime}
                  previewSandboxId={previewSandboxId}
                  forceInlinePreviewFallback={forceInlinePreviewFallback}
                  isSavingFile={isSavingFile}
                  projectId={projectId}
                  setPreviewMode={setPreviewMode}
                  setPreviewRuntimeInput={setPreviewRuntimeInput}
                  setShowRuntimeSettings={setShowRuntimeSettings}
                  setPreviewRefreshTick={setPreviewRefreshTick}
                  applyRuntimeUrl={applyRuntimeUrl}
                  handleUseInlineFallback={handleUseInlineFallback}
                  refreshRuntimeReadiness={refreshRuntimeReadiness}
                  discoverRuntime={discoverRuntime}
                  provisionRuntime={provisionRuntime}
                  syncRuntime={syncRuntime}
                  checkRuntimeHealth={checkRuntimeHealth}
                />
              ),
            }}
        </ModernIDEShell>
        </EditorApplyBridgeProvider>
      </TabProvider>
    </CommandPaletteProvider>
  );
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


