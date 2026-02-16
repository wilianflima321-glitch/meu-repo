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
    <div className="h-screen flex flex-col bg-[#0b0d12] text-slate-100 density-compact">
      <header className="density-header flex items-center justify-between px-2 border-b border-slate-800/80 bg-[#11141c]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-sm shadow-blue-900/50">
              <Codicon name="menu" className="text-white text-[13px]" />
            </div>
            <span className="font-semibold text-xs tracking-tight">Aethel Workbench</span>
          </div>

          <nav ref={menuRef} className="hidden md:flex items-center gap-0.5 text-xs relative">
            {menuConfigs.map((menu) => (
              <div key={menu.label} className="relative">
                <button
                  onClick={() => setActiveMenu(activeMenu === menu.label ? null : menu.label)}
                  className={`px-1.5 py-1 rounded transition-colors ${
                    activeMenu === menu.label ? 'bg-slate-700/90 text-white' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  {menu.label}
                </button>
                {activeMenu === menu.label && (
                  <div className="absolute top-full left-0 mt-1 w-56 py-1 rounded-md shadow-xl z-50 bg-[#171b25] border border-slate-700/80 backdrop-blur">
                    {menu.items.map((item, idx) =>
                      item.separator ? (
                        <div key={idx} className="my-1 border-t border-slate-700" />
                      ) : (
                        <button
                          key={idx}
                          onClick={() => {
                            item.action?.()
                            setActiveMenu(null)
                          }}
                          disabled={item.disabled ?? !item.action}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs ${
                            item.disabled ?? !item.action
                              ? 'opacity-50 cursor-not-allowed'
                              : 'hover:bg-slate-700/70 focus-visible:bg-slate-700/70'
                          }`}
                        >
                          <span>{item.label}</span>
                          {item.shortcut && (
                            <span className="text-xs text-slate-500">{item.shortcut}</span>
                          )}
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
          <button
            onClick={() => onCommandPalette?.()}
            className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded border border-slate-700/80 bg-slate-900/40 text-[11px] text-slate-300 hover:bg-slate-800/80 focus-visible:bg-slate-800/80"
            title="Command Palette (Ctrl+Shift+P)"
          >
            <Codicon name="sparkle" className="text-[12px]" />
            <span>Command Palette</span>
            <span className="text-slate-500">Ctrl+Shift+P</span>
          </button>
          <button
            onClick={toggleLeftSidebar}
            className={`p-1.5 rounded hover:bg-slate-800/80 focus-visible:bg-slate-800/80 ${panels.leftSidebar ? 'text-blue-300' : 'text-slate-400'}`}
            title="Toggle Sidebar"
            aria-pressed={panels.leftSidebar}
          >
            <Codicon name="layout-sidebar-left" />
          </button>
          <button
            onClick={toggleBottomPanel}
            className={`p-1.5 rounded hover:bg-slate-800/80 focus-visible:bg-slate-800/80 ${panels.bottomPanel ? 'text-blue-300' : 'text-slate-400'}`}
            title="Toggle Panel"
            aria-pressed={panels.bottomPanel}
          >
            <Codicon name="layout-panel" />
          </button>
          <button
            onClick={toggleRightSidebar}
            className={`p-1.5 rounded hover:bg-slate-800/80 focus-visible:bg-slate-800/80 ${panels.rightSidebar ? 'text-blue-300' : 'text-slate-400'}`}
            title="Toggle AI Panel"
            aria-pressed={panels.rightSidebar}
          >
            <Codicon name="sparkle" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-11 flex flex-col items-center py-1.5 bg-[#11141c] border-r border-slate-800/80">
          {SIDEBAR_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSidebarTab(tab.id)
                if (!panels.leftSidebar) setPanels((prev) => ({ ...prev, leftSidebar: true }))
              }}
              className={`w-9 h-9 flex items-center justify-center rounded-md mb-1 relative ${
                activeSidebarTab === tab.id && panels.leftSidebar
                  ? 'text-white bg-slate-800/90'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80 focus-visible:text-white focus-visible:bg-slate-800/80'
              }`}
              title={`${tab.label} (${tab.shortcut})`}
              aria-pressed={activeSidebarTab === tab.id && panels.leftSidebar}
            >
              <Codicon name={tab.icon} className="text-[14px]" />
            </button>
          ))}
        </div>

        {panels.leftSidebar && (
          <div
            className="flex flex-col border-r border-slate-800/80 bg-[#10131a]"
            style={{ width: sidebarWidth }}
          >
            <div className="density-header flex items-center justify-between px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 border-b border-slate-800/70">
              {SIDEBAR_TABS.find((t) => t.id === activeSidebarTab)?.label}
              <button onClick={toggleLeftSidebar} className="p-1 rounded hover:bg-slate-800/80">
                <Codicon name="chevron-left" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{renderSidebarContent()}</div>
          </div>
        )}

        {panels.leftSidebar && (
          <div
            className="w-1 cursor-col-resize bg-slate-800/80 hover:bg-blue-500/50 transition-colors"
            onMouseDown={(e) => {
              setIsResizingSidebar(true)
              resizeStateRef.current.startX = e.clientX
              resizeStateRef.current.startWidth = sidebarWidth
            }}
          />
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden bg-[#0b0d12]">{children}</div>

          {panels.bottomPanel && (
            <div
              className="flex flex-col border-t border-slate-800/80 bg-[#10131a]"
              style={{ height: bottomPanelHeight }}
            >
              <div
                className="h-1 cursor-row-resize bg-slate-800/80 hover:bg-blue-500/50 transition-colors"
                onMouseDown={(e) => {
                  setIsResizingBottom(true)
                  resizeStateRef.current.startY = e.clientY
                  resizeStateRef.current.startHeight = bottomPanelHeight
                }}
              />
              <div className="density-header flex items-center px-1.5 gap-0.5 border-b border-slate-800/70">
                {BOTTOM_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveBottomTab(tab.id)}
                    className={`density-row flex items-center gap-1.5 px-2.5 text-[11px] rounded transition-colors ${
                      activeBottomTab === tab.id
                        ? 'bg-slate-800/90 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60 focus-visible:text-white focus-visible:bg-slate-800/60'
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
                  className="p-1 rounded hover:bg-slate-800/80 text-slate-400"
                >
                  {bottomPanelHeight === 260 ? <Codicon name="fold-down" /> : <Codicon name="fold-up" />}
                </button>
                <button onClick={toggleBottomPanel} className="p-1 rounded hover:bg-slate-800/80 text-slate-400">
                  <Codicon name="x" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">{renderBottomContent()}</div>
            </div>
          )}
        </div>

        {panels.rightSidebar && (
          <div className="w-80 flex flex-col border-l border-slate-800/80 bg-[#10131a]">
            <div className="density-header flex items-center justify-between px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 border-b border-slate-800/70">
              AI Panel
              <button onClick={toggleRightSidebar} className="p-1 rounded hover:bg-slate-800/80">
                <Codicon name="chevron-right" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {aiChatPanel || <NotImplementedPanel title="AI Panel" capability="AI_CHAT_PANEL" milestone="P0" />}
            </div>
          </div>
        )}
      </div>

      <footer className="h-5 flex items-center justify-between px-2 text-[10px] bg-[#11141c] border-t border-slate-800/80 text-slate-200">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-slate-300">
            <Codicon name="git-branch" className="text-[11px]" />
            main
          </span>
        </div>
        <div className="flex items-center gap-3">
          {statusBar}
          <span className="text-slate-400">UTF-8</span>
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
