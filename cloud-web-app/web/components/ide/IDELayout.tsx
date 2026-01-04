'use client'

import { useState, useCallback, useEffect, type ReactNode } from 'react'
import {
  Files,
  Search,
  GitBranch,
  Bug,
  Boxes,
  Terminal as TerminalIcon,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  X,
  Play,
  Square,
  RotateCcw,
  MoreHorizontal,
  Layers,
  Cpu,
  Globe,
  Palette,
  Clapperboard,
  Mountain,
  Sparkles,
  Bot,
  Workflow,
  Package,
  TestTube,
  Clock,
  Bell,
  User,
  Command,
  Moon,
  Sun,
  PanelLeft,
  PanelBottom,
  Layout,
} from 'lucide-react'

// ============= Types =============

type SidebarTab = 
  | 'explorer' 
  | 'search' 
  | 'git' 
  | 'debug' 
  | 'extensions'
  | 'ai-chat'
  | 'ai-agents'

type BottomPanelTab = 
  | 'terminal' 
  | 'output' 
  | 'problems' 
  | 'debug-console'

type EditorTool =
  | 'code-editor'
  | 'visual-scripting'
  | '3d-viewport'
  | 'level-editor'
  | 'material-editor'
  | 'animation-editor'
  | 'particle-editor'
  | 'landscape-editor'
  | 'sequencer'
  | 'settings'

interface PanelState {
  leftSidebar: boolean
  rightSidebar: boolean
  bottomPanel: boolean
}

interface IDELayoutProps {
  children?: ReactNode
  // Injeção de componentes externos
  fileExplorer?: ReactNode
  searchPanel?: ReactNode
  gitPanel?: ReactNode
  debugPanel?: ReactNode
  extensionsPanel?: ReactNode
  aiChatPanel?: ReactNode
  aiAgentsPanel?: ReactNode
  terminal?: ReactNode
  outputPanel?: ReactNode
  problemsPanel?: ReactNode
  statusBar?: ReactNode
}

// ============= Sidebar Tabs Config =============

const SIDEBAR_TABS = [
  { id: 'explorer' as const, icon: Files, label: 'Explorer', shortcut: '⇧⌘E' },
  { id: 'search' as const, icon: Search, label: 'Search', shortcut: '⇧⌘F' },
  { id: 'git' as const, icon: GitBranch, label: 'Source Control', shortcut: '⌃⇧G' },
  { id: 'debug' as const, icon: Bug, label: 'Run and Debug', shortcut: '⇧⌘D' },
  { id: 'extensions' as const, icon: Boxes, label: 'Extensions', shortcut: '⇧⌘X' },
  { id: 'ai-chat' as const, icon: MessageSquare, label: 'AI Chat', shortcut: '⌘I' },
  { id: 'ai-agents' as const, icon: Bot, label: 'AI Agents', shortcut: '⌃⇧A' },
]

const BOTTOM_TABS = [
  { id: 'terminal' as const, icon: TerminalIcon, label: 'Terminal' },
  { id: 'output' as const, icon: Layout, label: 'Output' },
  { id: 'problems' as const, icon: Bug, label: 'Problems', badge: 0 },
  { id: 'debug-console' as const, icon: Play, label: 'Debug Console' },
]

const EDITOR_TOOLS = [
  { id: 'code-editor' as const, icon: Files, label: 'Code Editor', category: 'Core' },
  { id: 'visual-scripting' as const, icon: Workflow, label: 'Visual Scripting', category: 'Engine' },
  { id: '3d-viewport' as const, icon: Boxes, label: '3D Viewport', category: 'Engine' },
  { id: 'level-editor' as const, icon: Layers, label: 'Level Editor', category: 'Engine' },
  { id: 'material-editor' as const, icon: Palette, label: 'Material Editor', category: 'Engine' },
  { id: 'animation-editor' as const, icon: Clapperboard, label: 'Animation', category: 'Engine' },
  { id: 'particle-editor' as const, icon: Sparkles, label: 'Particles (Niagara)', category: 'Engine' },
  { id: 'landscape-editor' as const, icon: Mountain, label: 'Landscape', category: 'Engine' },
  { id: 'sequencer' as const, icon: Clock, label: 'Sequencer', category: 'Engine' },
  { id: 'settings' as const, icon: Settings, label: 'Settings', category: 'System' },
]

// ============= Main Component =============

export default function IDELayout({
  children,
  fileExplorer,
  searchPanel,
  gitPanel,
  debugPanel,
  extensionsPanel,
  aiChatPanel,
  aiAgentsPanel,
  terminal,
  outputPanel,
  problemsPanel,
  statusBar,
}: IDELayoutProps) {
  // State
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('explorer')
  const [activeBottomTab, setActiveBottomTab] = useState<BottomPanelTab>('terminal')
  const [activeEditorTool, setActiveEditorTool] = useState<EditorTool>('code-editor')
  const [panels, setPanels] = useState<PanelState>({
    leftSidebar: true,
    rightSidebar: false,
    bottomPanel: true,
  })
  const [bottomPanelHeight, setBottomPanelHeight] = useState(250)
  const [sidebarWidth, setSidebarWidth] = useState(280)
  const [isDarkTheme, setIsDarkTheme] = useState(true)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [problemsCount, setProblemCount] = useState(0)

  // Toggle functions
  const toggleLeftSidebar = useCallback(() => {
    setPanels(p => ({ ...p, leftSidebar: !p.leftSidebar }))
  }, [])

  const toggleRightSidebar = useCallback(() => {
    setPanels(p => ({ ...p, rightSidebar: !p.rightSidebar }))
  }, [])

  const toggleBottomPanel = useCallback(() => {
    setPanels(p => ({ ...p, bottomPanel: !p.bottomPanel }))
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowCommandPalette(p => !p)
      }
      // Toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        toggleLeftSidebar()
      }
      // Toggle terminal
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault()
        toggleBottomPanel()
      }
      // Explorer
      if (e.shiftKey && (e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault()
        setActiveSidebarTab('explorer')
        setPanels(p => ({ ...p, leftSidebar: true }))
      }
      // Search
      if (e.shiftKey && (e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        setActiveSidebarTab('search')
        setPanels(p => ({ ...p, leftSidebar: true }))
      }
      // AI Chat
      if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
        e.preventDefault()
        setActiveSidebarTab('ai-chat')
        setPanels(p => ({ ...p, leftSidebar: true }))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleLeftSidebar, toggleBottomPanel])

  // Render sidebar content
  const renderSidebarContent = () => {
    switch (activeSidebarTab) {
      case 'explorer':
        return fileExplorer || <DefaultExplorer />
      case 'search':
        return searchPanel || <DefaultSearch />
      case 'git':
        return gitPanel || <DefaultGit />
      case 'debug':
        return debugPanel || <DefaultDebug />
      case 'extensions':
        return extensionsPanel || <DefaultExtensions />
      case 'ai-chat':
        return aiChatPanel || <DefaultAIChat />
      case 'ai-agents':
        return aiAgentsPanel || <DefaultAIAgents />
      default:
        return null
    }
  }

  // Render bottom panel content
  const renderBottomContent = () => {
    switch (activeBottomTab) {
      case 'terminal':
        return terminal || <DefaultTerminal />
      case 'output':
        return outputPanel || <DefaultOutput />
      case 'problems':
        return problemsPanel || <DefaultProblems />
      case 'debug-console':
        return <DefaultDebugConsole />
      default:
        return null
    }
  }

  return (
    <div className={`h-screen flex flex-col ${isDarkTheme ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'}`}>
      {/* ========== TOP BAR ========== */}
      <header className={`h-12 flex items-center justify-between px-4 border-b ${isDarkTheme ? 'bg-slate-900 border-slate-800' : 'bg-gray-100 border-gray-200'}`}>
        {/* Left */}
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm">Aethel IDE</span>
          </div>

          {/* Menu */}
          <nav className="hidden md:flex items-center gap-1 text-sm">
            {['File', 'Edit', 'View', 'Go', 'Run', 'Terminal', 'Help'].map(item => (
              <button
                key={item}
                className={`px-2 py-1 rounded hover:${isDarkTheme ? 'bg-slate-800' : 'bg-gray-200'} transition-colors`}
              >
                {item}
              </button>
            ))}
          </nav>
        </div>

        {/* Center - Editor Tools Dropdown */}
        <div className="flex items-center gap-2">
          <select
            value={activeEditorTool}
            onChange={(e) => setActiveEditorTool(e.target.value as EditorTool)}
            className={`px-3 py-1.5 text-sm rounded-lg border ${
              isDarkTheme 
                ? 'bg-slate-800 border-slate-700 text-white' 
                : 'bg-white border-gray-300'
            }`}
          >
            <optgroup label="Core">
              <option value="code-editor">Code Editor</option>
            </optgroup>
            <optgroup label="Engine Tools">
              <option value="visual-scripting">Visual Scripting</option>
              <option value="3d-viewport">3D Viewport</option>
              <option value="level-editor">Level Editor</option>
              <option value="material-editor">Material Editor</option>
              <option value="animation-editor">Animation</option>
              <option value="particle-editor">Particles (Niagara)</option>
              <option value="landscape-editor">Landscape</option>
              <option value="sequencer">Sequencer</option>
            </optgroup>
            <optgroup label="System">
              <option value="settings">Settings</option>
            </optgroup>
          </select>

          {/* Play/Stop buttons for engine */}
          {activeEditorTool !== 'code-editor' && activeEditorTool !== 'settings' && (
            <div className="flex items-center gap-1 ml-2">
              <button className="p-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white">
                <Play className="w-4 h-4" />
              </button>
              <button className={`p-1.5 rounded ${isDarkTheme ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-200 hover:bg-gray-300'}`}>
                <Square className="w-4 h-4" />
              </button>
              <button className={`p-1.5 rounded ${isDarkTheme ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-200 hover:bg-gray-300'}`}>
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {/* Search/Command Palette */}
          <button
            onClick={() => setShowCommandPalette(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
              isDarkTheme 
                ? 'bg-slate-800 text-slate-400 hover:text-white' 
                : 'bg-gray-200 text-gray-600 hover:text-gray-900'
            }`}
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden sm:flex items-center gap-0.5 text-xs opacity-60">
              <Command className="w-3 h-3" />K
            </kbd>
          </button>

          {/* Layout toggles */}
          <button
            onClick={toggleLeftSidebar}
            className={`p-1.5 rounded ${isDarkTheme ? 'hover:bg-slate-800' : 'hover:bg-gray-200'} ${panels.leftSidebar ? 'text-indigo-400' : ''}`}
            title="Toggle Sidebar (⌘B)"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
          <button
            onClick={toggleBottomPanel}
            className={`p-1.5 rounded ${isDarkTheme ? 'hover:bg-slate-800' : 'hover:bg-gray-200'} ${panels.bottomPanel ? 'text-indigo-400' : ''}`}
            title="Toggle Panel (⌘J)"
          >
            <PanelBottom className="w-4 h-4" />
          </button>

          {/* Theme toggle */}
          <button
            onClick={() => setIsDarkTheme(!isDarkTheme)}
            className={`p-1.5 rounded ${isDarkTheme ? 'hover:bg-slate-800' : 'hover:bg-gray-200'}`}
          >
            {isDarkTheme ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Notifications */}
          <button className={`p-1.5 rounded relative ${isDarkTheme ? 'hover:bg-slate-800' : 'hover:bg-gray-200'}`}>
            <Bell className="w-4 h-4" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {/* User */}
          <button className={`p-1.5 rounded ${isDarkTheme ? 'hover:bg-slate-800' : 'hover:bg-gray-200'}`}>
            <User className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ========== MAIN CONTENT ========== */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar (leftmost icons) */}
        <div className={`w-12 flex flex-col items-center py-2 ${isDarkTheme ? 'bg-slate-900 border-r border-slate-800' : 'bg-gray-100 border-r border-gray-200'}`}>
          {SIDEBAR_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSidebarTab(tab.id)
                if (!panels.leftSidebar) setPanels(p => ({ ...p, leftSidebar: true }))
              }}
              className={`
                w-10 h-10 flex items-center justify-center rounded-lg mb-1 relative
                ${activeSidebarTab === tab.id && panels.leftSidebar
                  ? `${isDarkTheme ? 'text-white bg-slate-800' : 'text-indigo-600 bg-indigo-50'}`
                  : `${isDarkTheme ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'}`
                }
                ${activeSidebarTab === tab.id && panels.leftSidebar ? 'before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-0.5 before:h-6 before:bg-indigo-500 before:rounded-r' : ''}
              `}
              title={`${tab.label} (${tab.shortcut})`}
            >
              <tab.icon className="w-5 h-5" />
            </button>
          ))}

          <div className="flex-1" />

          {/* Settings at bottom */}
          <button
            onClick={() => setActiveEditorTool('settings')}
            className={`w-10 h-10 flex items-center justify-center rounded-lg ${isDarkTheme ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'}`}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Left Sidebar */}
        {panels.leftSidebar && (
          <div 
            className={`flex flex-col border-r ${isDarkTheme ? 'bg-slate-900 border-slate-800' : 'bg-gray-50 border-gray-200'}`}
            style={{ width: sidebarWidth }}
          >
            {/* Sidebar Header */}
            <div className={`h-9 flex items-center justify-between px-4 text-xs font-semibold uppercase tracking-wider ${isDarkTheme ? 'text-slate-400' : 'text-gray-500'}`}>
              {SIDEBAR_TABS.find(t => t.id === activeSidebarTab)?.label}
              <button
                onClick={toggleLeftSidebar}
                className={`p-1 rounded ${isDarkTheme ? 'hover:bg-slate-800' : 'hover:bg-gray-200'}`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto">
              {renderSidebarContent()}
            </div>
          </div>
        )}

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor Content */}
          <div className={`flex-1 overflow-hidden ${isDarkTheme ? 'bg-slate-950' : 'bg-white'}`}>
            {children || (
              <div className="h-full flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg mb-2">Selecione uma ferramenta</p>
                  <p className="text-sm opacity-60">
                    Ferramenta ativa: {EDITOR_TOOLS.find(t => t.id === activeEditorTool)?.label}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Panel */}
          {panels.bottomPanel && (
            <div 
              className={`flex flex-col border-t ${isDarkTheme ? 'bg-slate-900 border-slate-800' : 'bg-gray-50 border-gray-200'}`}
              style={{ height: bottomPanelHeight }}
            >
              {/* Bottom Panel Tabs */}
              <div className={`h-9 flex items-center px-2 gap-1 border-b ${isDarkTheme ? 'border-slate-800' : 'border-gray-200'}`}>
                {BOTTOM_TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveBottomTab(tab.id)}
                    className={`
                      flex items-center gap-1.5 px-3 py-1 text-xs rounded transition-colors
                      ${activeBottomTab === tab.id
                        ? `${isDarkTheme ? 'bg-slate-800 text-white' : 'bg-white text-indigo-600 shadow-sm'}`
                        : `${isDarkTheme ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`
                      }
                    `}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                    {tab.id === 'problems' && problemsCount > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] bg-red-500 text-white rounded-full">
                        {problemsCount}
                      </span>
                    )}
                  </button>
                ))}

                <div className="flex-1" />

                {/* Panel controls */}
                <button
                  onClick={() => setBottomPanelHeight(h => h === 250 ? 400 : 250)}
                  className={`p-1 rounded ${isDarkTheme ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-200 text-gray-500'}`}
                >
                  {bottomPanelHeight === 250 ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={toggleBottomPanel}
                  className={`p-1 rounded ${isDarkTheme ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-200 text-gray-500'}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Bottom Panel Content */}
              <div className="flex-1 overflow-hidden">
                {renderBottomContent()}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar (AI Chat expanded) */}
        {panels.rightSidebar && (
          <div className={`w-80 flex flex-col border-l ${isDarkTheme ? 'bg-slate-900 border-slate-800' : 'bg-gray-50 border-gray-200'}`}>
            <div className={`h-9 flex items-center justify-between px-4 text-xs font-semibold uppercase tracking-wider ${isDarkTheme ? 'text-slate-400' : 'text-gray-500'}`}>
              AI Assistant
              <button
                onClick={toggleRightSidebar}
                className={`p-1 rounded ${isDarkTheme ? 'hover:bg-slate-800' : 'hover:bg-gray-200'}`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {aiChatPanel || <DefaultAIChat />}
            </div>
          </div>
        )}
      </div>

      {/* ========== STATUS BAR ========== */}
      <footer className={`h-6 flex items-center justify-between px-2 text-[11px] ${isDarkTheme ? 'bg-indigo-600 text-white' : 'bg-indigo-500 text-white'}`}>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <GitBranch className="w-3 h-3" />
            main
          </span>
          <span className="flex items-center gap-1">
            <RotateCcw className="w-3 h-3" />
            0↓ 0↑
          </span>
          {problemsCount > 0 && (
            <span className="flex items-center gap-1">
              <Bug className="w-3 h-3" />
              {problemsCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {statusBar}
          <span>Ln 1, Col 1</span>
          <span>UTF-8</span>
          <span>TypeScript</span>
          <span className="flex items-center gap-1">
            <Cpu className="w-3 h-3" />
            Ready
          </span>
        </div>
      </footer>
    </div>
  )
}

// ============= Default Panels =============

function DefaultExplorer() {
  return (
    <div className="p-2">
      <div className="text-xs text-slate-400 mb-2 px-2">WORKSPACE</div>
      <div className="space-y-0.5">
        {['src', 'components', 'lib', 'public', 'package.json', 'tsconfig.json'].map(item => (
          <button key={item} className="w-full flex items-center gap-2 px-2 py-1 text-sm hover:bg-slate-800 rounded">
            {item.includes('.') ? <Files className="w-4 h-4 text-slate-500" /> : <Files className="w-4 h-4 text-amber-400" />}
            {item}
          </button>
        ))}
      </div>
    </div>
  )
}

function DefaultSearch() {
  return (
    <div className="p-3">
      <input
        type="text"
        placeholder="Search files..."
        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm"
      />
    </div>
  )
}

function DefaultGit() {
  return (
    <div className="p-3">
      <p className="text-sm text-slate-400">No source control providers registered.</p>
    </div>
  )
}

function DefaultDebug() {
  return (
    <div className="p-3">
      <button className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm">
        Run and Debug
      </button>
    </div>
  )
}

function DefaultExtensions() {
  return (
    <div className="p-3">
      <input
        type="text"
        placeholder="Search extensions..."
        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm mb-3"
      />
      <p className="text-xs text-slate-400">Popular extensions will appear here.</p>
    </div>
  )
}

function DefaultAIChat() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 p-3 overflow-y-auto">
        <div className="text-center text-slate-400 py-8">
          <Bot className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Start a conversation with AI</p>
        </div>
      </div>
      <div className="p-3 border-t border-slate-800">
        <input
          type="text"
          placeholder="Ask AI..."
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm"
        />
      </div>
    </div>
  )
}

function DefaultAIAgents() {
  const agents = [
    { name: 'Architect', status: 'idle', icon: '🏗️' },
    { name: 'Coder', status: 'active', icon: '💻' },
    { name: 'Research', status: 'idle', icon: '🔬' },
    { name: 'AI Dream', status: 'idle', icon: '✨' },
  ]
  return (
    <div className="p-3">
      <div className="space-y-2">
        {agents.map(agent => (
          <div key={agent.name} className="flex items-center gap-3 p-2 bg-slate-800 rounded-lg">
            <span className="text-2xl">{agent.icon}</span>
            <div className="flex-1">
              <div className="text-sm font-medium">{agent.name}</div>
              <div className={`text-xs ${agent.status === 'active' ? 'text-emerald-400' : 'text-slate-500'}`}>
                {agent.status}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DefaultTerminal() {
  return (
    <div className="h-full p-2 font-mono text-sm bg-slate-950">
      <div className="text-slate-500">$ </div>
    </div>
  )
}

function DefaultOutput() {
  return (
    <div className="h-full p-2 font-mono text-xs text-slate-400">
      No output yet.
    </div>
  )
}

function DefaultProblems() {
  return (
    <div className="h-full p-3 text-sm text-slate-400">
      No problems detected.
    </div>
  )
}

function DefaultDebugConsole() {
  return (
    <div className="h-full p-2 font-mono text-sm">
      <div className="text-slate-500">Debug console ready.</div>
    </div>
  )
}
