'use client'

import { useCallback, useMemo, useState, type RefObject } from 'react'
import type * as monacoEditor from 'monaco-editor'
import type { Diagnostic as MonacoDiagnostic } from '@/components/editor/MonacoEditorPro'
import type { SplitDirection } from '@/components/editor/SplitEditor'
import type { PanelState as ModernPanelState } from '@/components/ide/ModernIDEShell'
import type { DocumentSymbol } from '@/components/outline/OutlinePanel'
import type { EntryNotice } from '@/components/ide/fullscreen/WorkbenchEntryNotice'
import type {
  EditorCursorStatus,
  EditorPane,
  EditorSelectionStatus,
  InlineApplyResult,
  PreviewMode,
  SidebarTab,
} from './types'
import type { BottomPanelMode } from '@/components/ide/modern-shell/types'

export const LAST_PROJECT_ID_STORAGE_KEY = 'aethel.workbench.lastProjectId'
export const PREVIEW_ENABLED_STORAGE_KEY = 'aethel.workbench.preview.enabled'
export const PANEL_STATE_STORAGE_KEY = 'aethel.workbench.panelState'
export const BOTTOM_PANEL_MODE_STORAGE_KEY = 'aethel.workbench.bottomPanelMode'

type UseWorkbenchShellStateOptions = {
  projectIdParam: string | null
  editorRef: RefObject<monacoEditor.editor.IStandaloneCodeEditor | null>
  primaryEditorRef: RefObject<monacoEditor.editor.IStandaloneCodeEditor | null>
  secondaryEditorRef: RefObject<monacoEditor.editor.IStandaloneCodeEditor | null>
}

export function useWorkbenchShellState({
  projectIdParam,
  editorRef,
  primaryEditorRef,
  secondaryEditorRef,
}: UseWorkbenchShellStateOptions) {
  const projectId = useMemo(() => {
    if (projectIdParam && projectIdParam.trim()) {
      return projectIdParam.trim()
    }
    if (typeof window === 'undefined') return 'default'
    const fromStorage = localStorage.getItem(LAST_PROJECT_ID_STORAGE_KEY)
    return fromStorage?.trim() || 'default'
  }, [projectIdParam])

  const [splitEditorOpen, setSplitEditorOpen] = useState(false)
  const [splitDirection, setSplitDirection] = useState<SplitDirection>('horizontal')
  const [splitActivePane, setSplitActivePane] = useState<EditorPane>('primary')
  const [nextOpenTarget, setNextOpenTarget] = useState<EditorPane>('primary')
  const [previewEnabled, setPreviewEnabled] = useState(() => {
    if (typeof window === 'undefined') return true
    const stored = window.localStorage.getItem(PREVIEW_ENABLED_STORAGE_KEY)
    if (stored === '1') return true
    if (stored === '0') return false
    return window.innerWidth >= 1440
  })
  const [modernPanelState, setModernPanelState] = useState<ModernPanelState>(() => {
    const fallback: ModernPanelState = {
      sidebar: { open: true, size: 20 },
      editor: { open: true, size: 45 },
      preview: { open: true, size: 35 },
      chat: { open: false, size: 25 },
    }

    if (typeof window === 'undefined') return fallback

    try {
      const stored = window.localStorage.getItem(PANEL_STATE_STORAGE_KEY)
      if (!stored) return fallback
      const parsed = JSON.parse(stored) as Partial<ModernPanelState>
      return {
        sidebar: { ...fallback.sidebar, ...parsed.sidebar },
        editor: { ...fallback.editor, ...parsed.editor },
        preview: { ...fallback.preview, ...parsed.preview },
        chat: { ...fallback.chat, ...parsed.chat },
      }
    } catch {
      return fallback
    }
  })
  const [activeBottomPanel, setActiveBottomPanel] = useState<BottomPanelMode>(() => {
    if (typeof window === 'undefined') return 'chat'
    const stored = window.localStorage.getItem(BOTTOM_PANEL_MODE_STORAGE_KEY)
    return stored === 'terminal' ? 'terminal' : 'chat'
  })
  const [previewMode, setPreviewMode] = useState<PreviewMode>('runtime')
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('explorer')
  const [entryNotice, setEntryNotice] = useState<EntryNotice | null>(null)
  const [showIntelliSense, setShowIntelliSense] = useState(false)
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const [showOutline, setShowOutline] = useState(false)
  const [editorDiagnostics, setEditorDiagnostics] = useState<MonacoDiagnostic[]>([])
  const [secondaryEditorDiagnostics, setSecondaryEditorDiagnostics] = useState<MonacoDiagnostic[]>([])
  const [isCompactViewport, setIsCompactViewport] = useState(false)
  const [rollbackBusy, setRollbackBusy] = useState(false)
  const [hasToken, setHasToken] = useState(false)
  const [lastAiApply, setLastAiApply] = useState<(InlineApplyResult & { appliedAt: string }) | null>(null)
  const [editorCursorStatus, setEditorCursorStatus] = useState<EditorCursorStatus | null>(null)
  const [editorSelectionStatus, setEditorSelectionStatus] = useState<EditorSelectionStatus | null>(null)

  const openCommandPalette = useCallback((mode: 'commands' | 'files' = 'commands') => {
    window.dispatchEvent(new CustomEvent('aethel.commandPalette.open', { detail: { mode } }))
  }, [])

  const handleOpenSettings = useCallback(() => {
    const params = new URLSearchParams(window.location.search)
    const currentProjectId = params.get('projectId')
    const next = currentProjectId ? `/settings?projectId=${encodeURIComponent(currentProjectId)}` : '/settings'
    window.location.assign(next)
  }, [])

  const handleEditorUndo = useCallback(() => {
    editorRef.current?.trigger('aethel', 'undo', null)
  }, [editorRef])

  const handleEditorRedo = useCallback(() => {
    editorRef.current?.trigger('aethel', 'redo', null)
  }, [editorRef])

  const handleEditorFind = useCallback(() => {
    editorRef.current?.trigger('aethel', 'actions.find', null)
  }, [editorRef])

  const handleEditorReplace = useCallback(() => {
    editorRef.current?.trigger('aethel', 'editor.action.startFindReplaceAction', null)
  }, [editorRef])

  const emitLayoutEvent = useCallback((eventName: string) => {
    window.dispatchEvent(new Event(eventName))
  }, [])

  const handleAIInline = useCallback(() => {
    editorRef.current?.trigger('aethel', 'aethel.inlineEdit', null)
  }, [editorRef])

  const handleAIPanel = useCallback(() => {
    emitLayoutEvent('aethel.layout.openAI')
  }, [emitLayoutEvent])

  const handleSelectSidebarTab = useCallback((tab: SidebarTab) => {
    setSidebarTab(tab)
    setModernPanelState((prev) => ({
      ...prev,
      sidebar: {
        ...prev.sidebar,
        open: true,
      },
    }))
  }, [])

  const handleSelectPreviewMode = useCallback((mode: PreviewMode) => {
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
  }, [primaryEditorRef, secondaryEditorRef, splitActivePane])

  const handleEditorCursorStatus = useCallback((status: EditorCursorStatus) => {
    setEditorCursorStatus(status)
  }, [])

  const handleEditorSelectionStatus = useCallback((status: EditorSelectionStatus) => {
    setEditorSelectionStatus(status)
  }, [])

  return {
    projectId,
    splitEditorOpen,
    setSplitEditorOpen,
    splitDirection,
    setSplitDirection,
    splitActivePane,
    setSplitActivePane,
    nextOpenTarget,
    setNextOpenTarget,
    previewEnabled,
    setPreviewEnabled,
    modernPanelState,
    setModernPanelState,
    activeBottomPanel,
    setActiveBottomPanel,
    previewMode,
    setPreviewMode,
    sidebarTab,
    setSidebarTab,
    entryNotice,
    setEntryNotice,
    showIntelliSense,
    setShowIntelliSense,
    showDiagnostics,
    setShowDiagnostics,
    showOutline,
    setShowOutline,
    editorDiagnostics,
    setEditorDiagnostics,
    secondaryEditorDiagnostics,
    setSecondaryEditorDiagnostics,
    isCompactViewport,
    setIsCompactViewport,
    rollbackBusy,
    setRollbackBusy,
    hasToken,
    setHasToken,
    lastAiApply,
    setLastAiApply,
    editorCursorStatus,
    editorSelectionStatus,
    openCommandPalette,
    handleOpenSettings,
    handleEditorUndo,
    handleEditorRedo,
    handleEditorFind,
    handleEditorReplace,
    emitLayoutEvent,
    handleAIInline,
    handleAIPanel,
    handleSelectSidebarTab,
    handleSelectPreviewMode,
    clearEntryNotice,
    showEntryNotice,
    handleToggleDiagnosticsPanel,
    handleJumpToOutlineSymbol,
    handleEditorCursorStatus,
    handleEditorSelectionStatus,
  }
}

export default useWorkbenchShellState
