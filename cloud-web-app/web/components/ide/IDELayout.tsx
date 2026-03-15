'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import Codicon, { type CodiconName } from './Codicon'

// ============= Types =============

type SidebarTab = 'explorer' | 'search' | 'git' | 'ai' | 'extensions'

type BottomPanelTab = 'terminal' | 'output' | 'problems' | 'debug' | 'ports'

interface PanelState {
  leftSidebar: boolean
  rightSidebar: boolean
  bottomPanel: boolean
}

interface MenuItem {
  label: string
  shortcut?: string
  action?: () => void
  disabled?: boolean
  separator?: boolean
}

interface MenuConfig {
  label: string
  items: MenuItem[]
}

interface IDELayoutProps {
  children?: ReactNode
  fileExplorer?: ReactNode
  searchPanel?: ReactNode
  gitPanel?: ReactNode
  aiChatPanel?: ReactNode
  terminal?: ReactNode
  outputPanel?: ReactNode
  problemsPanel?: ReactNode
  debugPanel?: ReactNode
  portsPanel?: ReactNode
  statusBar?: ReactNode
  onNewFile?: () => void
  onNewFolder?: () => void
  onNewProject?: () => void
  onOpenFile?: () => void
  onOpenFolder?: () => void
  onSwitchProject?: () => void
  onSaveFile?: () => void
  onSaveAll?: () => void
  onExport?: () => void
  onSettings?: () => void
  onCommandPalette?: () => void
  onTogglePreview?: () => void
  onUndo?: () => void
  onRedo?: () => void
  onCut?: () => void
  onCopy?: () => void
  onPaste?: () => void
  onFind?: () => void
  onReplace?: () => void
  onRunProject?: () => void
  onStopProject?: () => void
  onRestartProject?: () => void
  onBuildProject?: () => void
  onDebugProject?: () => void
  onDeployProject?: () => void
  onNewTerminal?: () => void
  onSplitTerminal?: () => void
  onClearTerminal?: () => void
  onAIChat?: () => void
  onAIExplain?: () => void
  onAIRefactor?: () => void
  onAIFix?: () => void
  onAIGenerateTest?: () => void
  onAgentMode?: () => void
  onHelpDocs?: () => void
  onHelpShortcuts?: () => void
  onHelpAbout?: () => void
}

const SIDEBAR_TABS = [
  { id: 'explorer' as const, icon: 'files' as CodiconName, label: 'Explorer', shortcut: 'Ctrl+Shift+E' },
  { id: 'search' as const, icon: 'search' as CodiconName, label: 'Search', shortcut: 'Ctrl+Shift+F' },
  { id: 'git' as const, icon: 'source-control' as CodiconName, label: 'Source Control', shortcut: 'Ctrl+Shift+G' },
  { id: 'ai' as const, icon: 'sparkle' as CodiconName, label: 'AI', shortcut: 'Ctrl+Shift+I' },
  { id: 'extensions' as const, icon: 'extensions' as CodiconName, label: 'Extensions', shortcut: '' },
]

const BOTTOM_TABS = [
  { id: 'terminal' as const, icon: 'terminal' as CodiconName, label: 'Terminal' },
  { id: 'output' as const, icon: 'output' as CodiconName, label: 'Output' },
  { id: 'problems' as const, icon: 'warning' as CodiconName, label: 'Problems', badge: 0 },
  { id: 'debug' as const, icon: 'debug' as CodiconName, label: 'Debug' },
  { id: 'ports' as const, icon: 'plug' as CodiconName, label: 'Ports' },
]

const LOCAL_STORAGE_KEY = 'aethel.workbench.layout'
const SIDEBAR_TAB_SET = new Set<SidebarTab>(['explorer', 'search', 'git', 'ai', 'extensions'])
const BOTTOM_TAB_SET = new Set<BottomPanelTab>(['terminal', 'output', 'problems', 'debug', 'ports'])

export default function IDELayout({
  children,
  fileExplorer,
  searchPanel,
  gitPanel,
  aiChatPanel,
  terminal,
  outputPanel,
  problemsPanel,
  debugPanel,
  portsPanel,
  statusBar,
  onNewFile,
  onNewFolder,
  onOpenFile,
  onOpenFolder,
  onSwitchProject,
  onSaveFile,
  onSaveAll,
  onExport,
  onCommandPalette,
  onSettings,
  onUndo,
  onRedo,
  onCut,
  onCopy,
  onPaste,
  onFind,
  onReplace,
  onRunProject,
  onStopProject,
  onRestartProject,
  onBuildProject,
  onDebugProject,
  onDeployProject,
  onTogglePreview,
  onNewTerminal,
  onClearTerminal,
  onAIChat,
  onHelpDocs,
  onHelpShortcuts,
  onHelpAbout,
}: IDELayoutProps) {
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('explorer')
  const [activeBottomTab, setActiveBottomTab] = useState<BottomPanelTab>('terminal')
  const [panels, setPanels] = useState<PanelState>({
    leftSidebar: true,
    rightSidebar: true,
    bottomPanel: true,
  })
  const [bottomPanelHeight, setBottomPanelHeight] = useState(260)
  const [sidebarWidth, setSidebarWidth] = useState(280)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [isResizingSidebar, setIsResizingSidebar] = useState(false)
  const [isResizingBottom, setIsResizingBottom] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const resizeStateRef = useRef({
    startX: 0,
    startWidth: 0,
    startY: 0,
    startHeight: 0,
  })

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (typeof parsed?.sidebarWidth === 'number') setSidebarWidth(parsed.sidebarWidth)
        if (typeof parsed?.bottomPanelHeight === 'number') setBottomPanelHeight(parsed.bottomPanelHeight)
        if (parsed?.panels) setPanels((prev) => ({ ...prev, ...parsed.panels }))
      }
    } catch {
      // ignore storage errors
    }
  }, [])

  useEffect(() => {
    const payload = JSON.stringify({
      sidebarWidth,
      bottomPanelHeight,
      panels,
    })
    localStorage.setItem(LOCAL_STORAGE_KEY, payload)
  }, [sidebarWidth, bottomPanelHeight, panels])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!isResizingSidebar && !isResizingBottom) return

    const onMouseMove = (e: MouseEvent) => {
      if (isResizingSidebar) {
        const delta = e.clientX - resizeStateRef.current.startX
        const nextWidth = Math.min(420, Math.max(200, resizeStateRef.current.startWidth + delta))
        setSidebarWidth(nextWidth)
      }
      if (isResizingBottom) {
        const delta = resizeStateRef.current.startY - e.clientY
        const nextHeight = Math.min(480, Math.max(160, resizeStateRef.current.startHeight + delta))
        setBottomPanelHeight(nextHeight)
      }
    }

    const onMouseUp = () => {
      setIsResizingSidebar(false)
      setIsResizingBottom(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = isResizingSidebar ? 'col-resize' : 'row-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [isResizingSidebar, isResizingBottom])

  const toggleLeftSidebar = useCallback(() => {
    setPanels((prev) => ({ ...prev, leftSidebar: !prev.leftSidebar }))
  }, [])

  const toggleRightSidebar = useCallback(() => {
    setPanels((prev) => ({ ...prev, rightSidebar: !prev.rightSidebar }))
  }, [])

  const toggleBottomPanel = useCallback(() => {
    setPanels((prev) => ({ ...prev, bottomPanel: !prev.bottomPanel }))
  }, [])

  useEffect(() => {
    const isAccel = (event: KeyboardEvent) => event.ctrlKey || event.metaKey
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isAccel(event) && event.shiftKey && event.key.toLowerCase() === 'p' && onCommandPalette) {
        event.preventDefault()
        onCommandPalette()
        return
      }
      if (isAccel(event) && event.altKey && event.key.toLowerCase() === 'p' && onSwitchProject) {
        event.preventDefault()
        onSwitchProject()
        return
      }
      if (isAccel(event) && event.key.toLowerCase() === 'b') {
        event.preventDefault()
        toggleLeftSidebar()
        return
      }
      if (isAccel(event) && event.key.toLowerCase() === 'j') {
        event.preventDefault()
        toggleBottomPanel()
        return
      }
      if (isAccel(event) && event.key.toLowerCase() === 'i') {
        event.preventDefault()
        toggleRightSidebar()
        return
      }
      if (isAccel(event) && event.shiftKey && event.key.toLowerCase() === 'v' && onTogglePreview) {
        event.preventDefault()
        onTogglePreview()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCommandPalette, onSwitchProject, onTogglePreview, toggleBottomPanel, toggleLeftSidebar, toggleRightSidebar])

  useEffect(() => {
    const onToggleSidebar = () => toggleLeftSidebar()
    const onToggleTerminal = () => {
      setActiveBottomTab('terminal')
      if (!panels.bottomPanel) {
        setPanels((prev) => ({ ...prev, bottomPanel: true }))
        return
      }
      toggleBottomPanel()
    }
    const onToggleAI = () => toggleRightSidebar()
    const onOpenSidebarTab = (event: Event) => {
      const detail = (event as CustomEvent<{ tab?: string }>).detail
      const tab = detail?.tab
      if (!tab || !SIDEBAR_TAB_SET.has(tab as SidebarTab)) return
      setActiveSidebarTab(tab as SidebarTab)
      setPanels((prev) => ({ ...prev, leftSidebar: true }))
    }
    const onOpenBottomTab = (event: Event) => {
      const detail = (event as CustomEvent<{ tab?: string }>).detail
      const tab = detail?.tab
      if (!tab || !BOTTOM_TAB_SET.has(tab as BottomPanelTab)) return
      setActiveBottomTab(tab as BottomPanelTab)
      setPanels((prev) => ({ ...prev, bottomPanel: true }))
    }
    const onOpenAI = () => {
      setActiveSidebarTab('ai')
      setPanels((prev) => ({ ...prev, rightSidebar: true }))
    }

    window.addEventListener('aethel.layout.toggleSidebar', onToggleSidebar)
    window.addEventListener('aethel.layout.toggleTerminal', onToggleTerminal)
    window.addEventListener('aethel.layout.toggleAI', onToggleAI)
    window.addEventListener('aethel.layout.openSidebarTab', onOpenSidebarTab as EventListener)
    window.addEventListener('aethel.layout.openBottomTab', onOpenBottomTab as EventListener)
    window.addEventListener('aethel.layout.openAI', onOpenAI)

    return () => {
      window.removeEventListener('aethel.layout.toggleSidebar', onToggleSidebar)
      window.removeEventListener('aethel.layout.toggleTerminal', onToggleTerminal)
      window.removeEventListener('aethel.layout.toggleAI', onToggleAI)
      window.removeEventListener('aethel.layout.openSidebarTab', onOpenSidebarTab as EventListener)
      window.removeEventListener('aethel.layout.openBottomTab', onOpenBottomTab as EventListener)
      window.removeEventListener('aethel.layout.openAI', onOpenAI)
    }
  }, [panels.bottomPanel, toggleBottomPanel, toggleLeftSidebar, toggleRightSidebar])

  const openSidebarTab = (tab: SidebarTab) => {
    setActiveSidebarTab(tab)
    setPanels((prev) => ({ ...prev, leftSidebar: true }))
  }

  const menuConfigs: MenuConfig[] = [
    {
      label: 'File',
      items: [
        { label: 'New File', shortcut: 'Ctrl+N', action: onNewFile },
        { label: 'New Folder', shortcut: 'Ctrl+Shift+N', action: onNewFolder },
        { separator: true, label: '' },
        { label: 'Open File', shortcut: 'Ctrl+O', action: onOpenFile },
        { label: 'Open Folder', shortcut: 'Ctrl+Shift+O', action: onOpenFolder },
        { label: 'Switch Project Context', shortcut: 'Ctrl+Alt+P', action: onSwitchProject },
        { separator: true, label: '' },
        { label: 'Save', shortcut: 'Ctrl+S', action: onSaveFile },
        { label: 'Save All', shortcut: 'Ctrl+Alt+S', action: onSaveAll },
        { separator: true, label: '' },
        { label: 'Export Project', action: onExport },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo', shortcut: 'Ctrl+Z', action: onUndo },
        { label: 'Redo', shortcut: 'Ctrl+Shift+Z', action: onRedo },
        { separator: true, label: '' },
        { label: 'Cut', shortcut: 'Ctrl+X', action: onCut },
        { label: 'Copy', shortcut: 'Ctrl+C', action: onCopy },
        { label: 'Paste', shortcut: 'Ctrl+V', action: onPaste },
        { separator: true, label: '' },
        { label: 'Find', shortcut: 'Ctrl+F', action: onFind },
        { label: 'Replace', shortcut: 'Ctrl+Alt+F', action: onReplace },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Toggle Sidebar', shortcut: 'Ctrl+B', action: () => toggleLeftSidebar() },
        { label: 'Toggle Panel', shortcut: 'Ctrl+J', action: () => toggleBottomPanel() },
        { label: 'Toggle AI Panel', shortcut: 'Ctrl+I', action: () => toggleRightSidebar() },
        { separator: true, label: '' },
        { label: 'Explorer', shortcut: 'Ctrl+Shift+E', action: () => openSidebarTab('explorer') },
        { label: 'Search', shortcut: 'Ctrl+Shift+F', action: () => openSidebarTab('search') },
        { label: 'Source Control', shortcut: 'Ctrl+Shift+G', action: () => openSidebarTab('git') },
        { label: 'Refresh Preview', shortcut: 'Ctrl+Shift+V', action: onTogglePreview },
      ],
    },
    {
      label: 'Run',
      items: [
        { label: 'Run', shortcut: 'F5', action: onRunProject },
        { label: 'Stop', shortcut: 'Shift+F5', action: onStopProject },
        { label: 'Restart', shortcut: 'Ctrl+Shift+F5', action: onRestartProject },
        { separator: true, label: '' },
        { label: 'Build', shortcut: 'Ctrl+Shift+B', action: onBuildProject },
        { label: 'Debug', shortcut: 'Ctrl+Shift+D', action: onDebugProject },
        { separator: true, label: '' },
        { label: 'Deploy', action: onDeployProject },
      ],
    },
    {
      label: 'Terminal',
      items: [
        {
          label: 'New Terminal',
          shortcut: 'Ctrl+`',
          action: () => {
            setActiveBottomTab('terminal')
            onNewTerminal?.()
          },
        },
        { label: 'Clear Terminal', action: onClearTerminal },
      ],
    },
    {
      label: 'AI',
      items: [
        { label: 'Open AI Panel', shortcut: 'Ctrl+I', action: () => toggleRightSidebar() },
        { label: 'New AI Chat', action: onAIChat },
      ],
    },
    {
      label: 'Help',
      items: [
        { label: 'Documentation', action: onHelpDocs },
        { label: 'Shortcuts', action: onHelpShortcuts },
        { separator: true, label: '' },
        { label: 'About', action: onHelpAbout },
      ],
    },
    {
      label: 'Preferences',
      items: [
        { label: 'Command Palette', shortcut: 'Ctrl+Shift+P', action: onCommandPalette },
        { label: 'Settings', shortcut: 'Ctrl+,', action: onSettings },
      ],
    },
  ]

  const renderSidebarContent = () => {
    switch (activeSidebarTab) {
      case 'explorer':
        return fileExplorer || <NotImplementedPanel title="Explorer" capability="EXPLORER_PANEL" milestone="P0" />
      case 'search':
        return searchPanel || <NotImplementedPanel title="Search" capability="SEARCH_PANEL" milestone="P1" />
      case 'git':
        return gitPanel || <NotImplementedPanel title="Source Control" capability="GIT_PANEL" milestone="P1" />
      case 'ai':
        return aiChatPanel || <NotImplementedPanel title="AI Assistant" capability="AI_CHAT_PANEL" milestone="P0" />
      case 'extensions':
        return (
          <NotImplementedPanel
            title="Extensions"
            capability="EXTENSIONS_RUNTIME"
            milestone="P2"
            description="Extension runtime is intentionally gated until P2."
          />
        )
      default:
        return null
    }
  }

  const renderBottomContent = () => {
    switch (activeBottomTab) {
      case 'terminal':
        return terminal || <NotImplementedPanel title="Terminal" capability="TERMINAL_PANEL" milestone="P0" />
      case 'output':
        return outputPanel || <NotImplementedPanel title="Output" capability="OUTPUT_PANEL" milestone="P1" />
      case 'problems':
        return problemsPanel || <NotImplementedPanel title="Problems" capability="PROBLEMS_PANEL" milestone="P1" />
      case 'debug':
        return debugPanel || <NotImplementedPanel title="Debug Console" capability="DEBUG_PANEL" milestone="P1" />
      case 'ports':
        return (
          portsPanel || (
            <NotImplementedPanel
              title="Ports"
              capability="PORT_FORWARDING_PANEL"
              milestone="P1"
              description="No forwarded ports are currently active."
            />
          )
        )
      default:
        return null
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#07080c] text-slate-100 density-compact">
      <header className="density-header flex items-center justify-between border-b border-white/10 bg-[linear-gradient(180deg,rgba(19,23,31,0.96),rgba(11,13,18,0.98))] px-3 shadow-[0_12px_40px_rgba(0,0,0,0.32)] backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 via-indigo-400 to-sky-400 shadow-[0_10px_24px_rgba(79,70,229,0.45)]">
              <Codicon name="sparkle" className="text-[13px] text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200">Aethel Studio</div>
              <div className="truncate text-[10px] text-slate-500">Apps · Research · Runtime orchestration</div>
            </div>
          </div>

          <nav ref={menuRef} className="relative hidden items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-1 py-1 text-xs md:flex">
            {menuConfigs.map((menu) => (
              <div key={menu.label} className="relative">
                <button
                  onClick={() => setActiveMenu(activeMenu === menu.label ? null : menu.label)}
                  className={`rounded-lg px-2 py-1.5 transition-colors ${
                    activeMenu === menu.label
                      ? 'bg-slate-700/90 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.04)]'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  {menu.label}
                </button>
                {activeMenu === menu.label && (
                  <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-xl border border-white/10 bg-[#171b25]/98 py-1 shadow-[0_24px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                    {menu.items.map((item, idx) =>
                      item.separator ? (
                        <div key={idx} className="my-1 border-t border-white/10" />
                      ) : (
                        <button
                          key={idx}
                          onClick={() => {
                            item.action?.()
                            setActiveMenu(null)
                          }}
                          disabled={item.disabled ?? !item.action}
                          className={`flex w-full items-center justify-between px-2.5 py-1.5 text-xs ${
                            item.disabled ?? !item.action
                              ? 'cursor-not-allowed opacity-50'
                              : 'hover:bg-slate-700/70 focus-visible:bg-slate-700/70'
                          }`}
                        >
                          <span>{item.label}</span>
                          {item.shortcut && <span className="text-xs text-slate-500">{item.shortcut}</span>}
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-200 lg:flex">
            <Codicon name="pulse" className="text-[11px]" />
            Ready for apply
          </div>
          <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] text-slate-400 xl:flex">
            <span className="flex items-center gap-1 text-slate-200">
              <Codicon name="git-branch" className="text-[11px]" />
              main
            </span>
            <span className="h-3 w-px bg-white/10" />
            <span>Workspace local</span>
          </div>
          <button
            onClick={() => onCommandPalette?.()}
            className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-slate-300 hover:bg-white/[0.08] focus-visible:bg-white/[0.08] md:flex"
            title="Command Palette (Ctrl+Shift+P)"
          >
            <Codicon name="sparkle" className="text-[12px] text-sky-300" />
            <span>Command Palette</span>
            <span className="rounded-md border border-white/10 bg-black/20 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">Ctrl+Shift+P</span>
          </button>
          <button
            onClick={toggleLeftSidebar}
            className={`rounded-lg p-2 hover:bg-white/[0.08] focus-visible:bg-white/[0.08] ${panels.leftSidebar ? 'text-sky-300' : 'text-slate-400'}`}
            title="Toggle Sidebar"
            aria-pressed={panels.leftSidebar}
          >
            <Codicon name="layout-sidebar-left" />
          </button>
          <button
            onClick={toggleBottomPanel}
            className={`rounded-lg p-2 hover:bg-white/[0.08] focus-visible:bg-white/[0.08] ${panels.bottomPanel ? 'text-sky-300' : 'text-slate-400'}`}
            title="Toggle Panel"
            aria-pressed={panels.bottomPanel}
          >
            <Codicon name="layout-panel" />
          </button>
          <button
            onClick={toggleRightSidebar}
            className={`rounded-lg p-2 hover:bg-white/[0.08] focus-visible:bg-white/[0.08] ${panels.rightSidebar ? 'text-sky-300' : 'text-slate-400'}`}
            title="Toggle AI Panel"
            aria-pressed={panels.rightSidebar}
          >
            <Codicon name="sparkle" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-12 flex-col items-center border-r border-white/10 bg-[linear-gradient(180deg,rgba(18,22,30,0.95),rgba(11,14,19,0.98))] py-2 shadow-[inset_-1px_0_0_rgba(255,255,255,0.03)]">
          {SIDEBAR_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSidebarTab(tab.id)
                if (!panels.leftSidebar) setPanels((prev) => ({ ...prev, leftSidebar: true }))
              }}
              className={`relative mb-1 flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
                activeSidebarTab === tab.id && panels.leftSidebar
                  ? 'bg-white/[0.1] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.06)]'
                  : 'text-slate-400 hover:bg-white/[0.06] hover:text-white focus-visible:bg-white/[0.06] focus-visible:text-white'
              }`}
              title={`${tab.label} (${tab.shortcut})`}
              aria-pressed={activeSidebarTab === tab.id && panels.leftSidebar}
            >
              {activeSidebarTab === tab.id && panels.leftSidebar && (
                <span className="absolute -left-1 top-2 h-4 w-0.5 rounded-full bg-sky-400" />
              )}
              <Codicon name={tab.icon} className="text-[14px]" />
            </button>
          ))}
        </div>

        {panels.leftSidebar && (
          <div
            className="flex flex-col border-r border-white/10 bg-[linear-gradient(180deg,rgba(16,19,26,0.98),rgba(12,14,20,0.98))] shadow-[inset_-1px_0_0_rgba(255,255,255,0.03)]"
            style={{ width: sidebarWidth }}
          >
            <div className="density-header flex items-center justify-between border-b border-white/10 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              <div className="flex flex-col">
                <span>{SIDEBAR_TABS.find((t) => t.id === activeSidebarTab)?.label}</span>
                <span className="text-[9px] font-normal tracking-[0.08em] text-slate-600">Studio surface</span>
              </div>
              <button onClick={toggleLeftSidebar} className="rounded-lg p-1 text-slate-500 hover:bg-white/[0.06] hover:text-slate-200">
                <Codicon name="chevron-left" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{renderSidebarContent()}</div>
          </div>
        )}

        {panels.leftSidebar && (
          <div
            className="w-[3px] cursor-col-resize bg-transparent transition-colors before:block before:h-full before:w-px before:bg-white/10 hover:before:bg-sky-400/45"
            onMouseDown={(e) => {
              setIsResizingSidebar(true)
              resizeStateRef.current.startX = e.clientX
              resizeStateRef.current.startWidth = sidebarWidth
            }}
          />
        )}

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.07),transparent_18%),linear-gradient(180deg,#0b0d12_0%,#090b10_100%)]">
            {children}
          </div>

          {panels.bottomPanel && (
            <div
              className="flex flex-col border-t border-white/10 bg-[linear-gradient(180deg,rgba(16,19,26,0.98),rgba(10,12,17,0.98))]"
              style={{ height: bottomPanelHeight }}
            >
              <div
                className="h-[3px] cursor-row-resize bg-transparent transition-colors before:block before:h-px before:w-full before:bg-white/10 hover:before:bg-sky-400/45"
                onMouseDown={(e) => {
                  setIsResizingBottom(true)
                  resizeStateRef.current.startY = e.clientY
                  resizeStateRef.current.startHeight = bottomPanelHeight
                }}
              />
              <div className="density-header flex items-center gap-0.5 border-b border-white/10 px-1.5">
                {BOTTOM_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveBottomTab(tab.id)}
                    className={`density-row flex items-center gap-1.5 rounded-lg px-2.5 text-[11px] transition-colors ${
                      activeBottomTab === tab.id
                        ? 'bg-white/[0.08] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.05)]'
                        : 'text-slate-400 hover:bg-white/[0.05] hover:text-white focus-visible:bg-white/[0.05] focus-visible:text-white'
                    }`}
                    aria-pressed={activeBottomTab === tab.id}
                  >
                    <Codicon name={tab.icon} className="text-[12px]" />
                    {tab.label}
                  </button>
                ))}

                <div className="flex-1" />

                <button
                  onClick={() => setBottomPanelHeight((h) => (h === 260 ? 380 : 260))}
                  className="rounded-lg p-1 text-slate-400 hover:bg-white/[0.06]"
                >
                  {bottomPanelHeight === 260 ? <Codicon name="fold-down" /> : <Codicon name="fold-up" />}
                </button>
                <button onClick={toggleBottomPanel} className="rounded-lg p-1 text-slate-400 hover:bg-white/[0.06]">
                  <Codicon name="x" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">{renderBottomContent()}</div>
            </div>
          )}
        </div>

        {panels.rightSidebar && (
          <div className="flex w-80 flex-col border-l border-white/10 bg-[linear-gradient(180deg,rgba(15,18,25,0.98),rgba(11,13,18,0.98))] shadow-[inset_1px_0_0_rgba(255,255,255,0.03)]">
            <div className="density-header flex items-center justify-between border-b border-white/10 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              <div className="flex flex-col">
                <span>AI Copilot</span>
                <span className="text-[9px] font-normal tracking-[0.08em] text-slate-600">Plans · edits · critique</span>
              </div>
              <button onClick={toggleRightSidebar} className="rounded-lg p-1 text-slate-500 hover:bg-white/[0.06] hover:text-slate-200">
                <Codicon name="chevron-right" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {aiChatPanel || <NotImplementedPanel title="AI Copilot" capability="AI_CHAT_PANEL" milestone="P0" />}
            </div>
          </div>
        )}
      </div>

      <footer className="flex h-6 items-center justify-between border-t border-white/10 bg-[linear-gradient(180deg,rgba(13,15,21,0.98),rgba(10,12,16,0.98))] px-3 text-[10px] text-slate-200">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-slate-300">
            <Codicon name="git-branch" className="text-[11px]" />
            main
          </span>
          <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-slate-400">
            Studio
          </span>
        </div>
        <div className="flex items-center gap-3">
          {statusBar}
          <span className="text-slate-500">UTF-8</span>
          <span className="flex items-center gap-1 text-slate-300">
            <Codicon name="comment-discussion" className="text-[11px]" />
            Ready
          </span>
          <span className="flex items-center gap-1 text-emerald-300">
            <Codicon name="circle-filled" className="text-[8px]" />
            Synced
          </span>
        </div>
      </footer>
    </div>
  )
}

function NotImplementedPanel({
  title,
  description,
  capability = 'PANEL',
  milestone = 'P1',
}: {
  title: string
  description?: string
  capability?: string
  milestone?: string
}) {
  const nextAction =
    milestone === 'P0'
      ? 'Use the current Workbench flow for the same task in this release.'
      : 'This capability is intentionally deferred outside the P0 critical path.'

  return (
    <div className="h-full flex items-center justify-center text-center px-6">
      <div className="max-w-xs rounded border border-slate-800 bg-slate-950/50 px-4 py-3">
        <div className="mb-1.5 flex items-center justify-center gap-2 text-slate-300">
          <Codicon name="warning" className="text-[13px] text-amber-300" />
          <span className="text-xs font-semibold tracking-wide">{title}</span>
        </div>
        <p className="text-[11px] leading-5 text-slate-400">
          {description || 'Capability is intentionally gated for this milestone.'}
        </p>
        <p className="mt-2 text-[10px] font-mono text-slate-500">Capability gate: {capability}</p>
        <p className="text-[10px] text-slate-500">Target milestone: {milestone}</p>
        <p className="mt-1 text-[10px] text-slate-500">{nextAction}</p>
      </div>
    </div>
  )
}
