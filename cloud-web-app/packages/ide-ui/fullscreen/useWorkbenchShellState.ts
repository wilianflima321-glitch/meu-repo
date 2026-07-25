'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import type * as monacoEditor from 'monaco-editor'
import type { Diagnostic as MonacoDiagnostic } from '../../../web/components/editor/MonacoEditorPro'
import type { SplitDirection } from '../../../web/components/editor/SplitEditor'
import type { PanelState as ModernPanelState } from '../ModernIDEShell'
import type { DocumentSymbol } from '../../../web/components/outline/OutlinePanel'
import type { EntryNotice } from './WorkbenchEntryNotice'
import type {
  EditorDocumentSymbolState,
  EditorCursorStatus,
  EditorPane,
  EditorSelectionStatus,
  InlineApplyResult,
  PreviewMode,
  SidebarTab,
} from './types'
import type { BottomPanelMode } from '../modern-shell/types'
import { resolveWorkbenchEntryProfile } from './workbench-entry-triage'
import {
  getUiPersistence,
  UI_PERSISTENCE_LEGACY_KEYS,
} from '../../../web/lib/storage/ui-persistence-spine'

export const LAST_PROJECT_ID_STORAGE_KEY = 'aethel.workbench.lastProjectId'
export const PREVIEW_ENABLED_STORAGE_KEY = UI_PERSISTENCE_LEGACY_KEYS.workbenchPreviewEnabled
export const PANEL_STATE_STORAGE_KEY = UI_PERSISTENCE_LEGACY_KEYS.workbenchPanelState
export const BOTTOM_PANEL_MODE_STORAGE_KEY = UI_PERSISTENCE_LEGACY_KEYS.workbenchBottomPanel

type UseWorkbenchShellStateOptions = {
  projectIdParam: string | null
  entryParam: string | null
  sourceParam: string | null
  missionParam: string | null
  editorRef: RefObject<monacoEditor.editor.IStandaloneCodeEditor | null>
  primaryEditorRef: RefObject<monacoEditor.editor.IStandaloneCodeEditor | null>
  secondaryEditorRef: RefObject<monacoEditor.editor.IStandaloneCodeEditor | null>
}

export function useWorkbenchShellState({
  projectIdParam,
  entryParam,
  sourceParam,
  missionParam,
  editorRef,
  primaryEditorRef,
  secondaryEditorRef,
}: UseWorkbenchShellStateOptions) {
  const entryProfile = useMemo(
    () =>
      resolveWorkbenchEntryProfile({
        source: sourceParam,
        mission: missionParam,
      }),
    [missionParam, sourceParam],
  )
  const hasContextualEntry = Boolean(sourceParam?.trim() || missionParam?.trim())

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
    if (typeof window === 'undefined') return entryProfile.previewEnabled
    if (hasContextualEntry) return entryProfile.previewEnabled
    // CW4: spine first, legacy mirror fallback.
    const stored = getUiPersistence<string | null>(
      'ide.workbench.previewEnabled',
      null,
      (v): v is string => typeof v === 'string',
    )
    if (stored === '1') return true
    if (stored === '0') return false
    return window.innerWidth >= 1280
  })
  const [modernPanelState, setModernPanelState] = useState<ModernPanelState>(() => {
    const fallback: ModernPanelState = {
      sidebar: { ...entryProfile.panelState.sidebar },
      editor: { ...entryProfile.panelState.editor },
      preview: { ...entryProfile.panelState.preview },
      chat: { ...entryProfile.panelState.chat },
    }

    if (typeof window === 'undefined') return fallback
    if (hasContextualEntry) return fallback

    try {
      const parsed = getUiPersistence<Partial<ModernPanelState> | null>(
        'ide.workbench.panelState',
        null,
        (v): v is Partial<ModernPanelState> => Boolean(v) && typeof v === 'object',
      )
      if (!parsed) return fallback
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
    if (typeof window === 'undefined') return entryProfile.bottomPanel
    if (hasContextualEntry) return entryProfile.bottomPanel
    const stored = getUiPersistence<string | null>(
      'ide.workbench.bottomPanel',
      null,
      (v): v is string => typeof v === 'string',
    )
    return stored === 'terminal' ? 'terminal' : 'chat'
  })
  const [previewMode, setPreviewMode] = useState<PreviewMode>(entryProfile.previewMode)
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>(entryProfile.sidebarTab)
  const [entryNotice, setEntryNotice] = useState<EntryNotice | null>(null)
  const [showIntelliSense, setShowIntelliSense] = useState(false)
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const [showOutline, setShowOutline] = useState(false)
  const [editorDiagnostics, setEditorDiagnostics] = useState<MonacoDiagnostic[]>([])
  const [secondaryEditorDiagnostics, setSecondaryEditorDiagnostics] = useState<MonacoDiagnostic[]>([])
  const [editorDocumentSymbols, setEditorDocumentSymbols] = useState<EditorDocumentSymbolState | null>(null)
  const [secondaryEditorDocumentSymbols, setSecondaryEditorDocumentSymbols] = useState<EditorDocumentSymbolState | null>(null)
  const [isCompactViewport, setIsCompactViewport] = useState(false)
  const [rollbackBusy, setRollbackBusy] = useState(false)
  const [hasToken, setHasToken] = useState(false)
  const [lastAiApply, setLastAiApply] = useState<(InlineApplyResult & { appliedAt: string }) | null>(null)
  const [editorCursorStatus, setEditorCursorStatus] = useState<EditorCursorStatus | null>(null)
  const [editorSelectionStatus, setEditorSelectionStatus] = useState<EditorSelectionStatus | null>(null)
  const appliedEntryPresetRef = useRef<string | null>(null)

  useEffect(() => {
    if (!hasContextualEntry) return

    const presetKey = JSON.stringify({
      entry: entryParam?.trim() || null,
      source: sourceParam?.trim() || null,
      mission: missionParam?.trim() || null,
      lane: entryProfile.laneId,
    })

    if (appliedEntryPresetRef.current === presetKey) return
    appliedEntryPresetRef.current = presetKey

    setPreviewEnabled(entryProfile.previewEnabled)
    setPreviewMode(entryProfile.previewMode)
    setSidebarTab(entryProfile.sidebarTab)
    setActiveBottomPanel(entryProfile.bottomPanel)
    setModernPanelState({
      sidebar: { ...entryProfile.panelState.sidebar },
      editor: { ...entryProfile.panelState.editor },
      preview: { ...entryProfile.panelState.preview },
      chat: { ...entryProfile.panelState.chat },
    })
  }, [entryParam, entryProfile, hasContextualEntry, missionParam, sourceParam])

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
    entryProfile,
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
    editorDocumentSymbols,
    setEditorDocumentSymbols,
    secondaryEditorDocumentSymbols,
    setSecondaryEditorDocumentSymbols,
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
