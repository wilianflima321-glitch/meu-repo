'use client'

/**
 * IDE Layout - Unified Professional IDE Shell
 * Main application layout connecting all components
 * 
 * Features:
 * - Resizable panels (sidebar, bottom panel)
 * - Multiple activity bar items
 * - Tab management
 * - Editor groups
 * - Command palette integration
 * - Notification system
 * - Status bar
 */

import { useState, useCallback, useRef, useEffect, ReactNode } from 'react'
import {
  Files,
  Search,
  GitBranch,
  Bug,
  Package,
  Settings,
  Play,
  Terminal,
  PanelBottom,
  PanelLeft,
  PanelRight,
  Maximize2,
  Minimize2,
  X,
  Plus,
  ChevronDown,
  MoreHorizontal,
  SplitSquareHorizontal,
  Columns,
  Circle,
  CheckCircle,
  AlertCircle,
  Info,
  Bell,
  User,
  Cloud,
  Wifi,
  WifiOff,
  Cpu,
  Gamepad2,
  Palette,
  Layers,
  Image,
  Music,
  Video,
  Code,
  FileCode,
  Folder,
  FolderOpen,
  ChevronRight,
  MessageSquare,
  Sparkles,
  Command,
  Keyboard,
} from 'lucide-react'

// ============= Types =============

export interface Tab {
  id: string
  title: string
  icon?: ReactNode
  path?: string
  isDirty?: boolean
  isPinned?: boolean
  isPreview?: boolean
}

export interface PanelConfig {
  id: string
  title: string
  icon: ReactNode
  component?: ReactNode
}

export interface ActivityBarItem {
  id: string
  icon: ReactNode
  title: string
  badge?: number | string
}

export type SidebarView = 'explorer' | 'search' | 'git' | 'debug' | 'extensions' | 'engine' | 'ai'
export type BottomPanelView = 'terminal' | 'problems' | 'output' | 'debug-console'

interface IDELayoutProps {
  children?: ReactNode
  
  // Sidebar
  sidebarContent?: ReactNode
  sidebarWidth?: number
  showSidebar?: boolean
  activeSidebarView?: SidebarView
  onSidebarViewChange?: (view: SidebarView) => void
  
  // Bottom Panel
  bottomPanelContent?: ReactNode
  bottomPanelHeight?: number
  showBottomPanel?: boolean
  activeBottomView?: BottomPanelView
  onBottomViewChange?: (view: BottomPanelView) => void
  
  // Secondary Sidebar (right)
  secondarySidebarContent?: ReactNode
  secondarySidebarWidth?: number
  showSecondarySidebar?: boolean
  
  // Tabs
  tabs?: Tab[]
  activeTabId?: string
  onTabChange?: (tabId: string) => void
  onTabClose?: (tabId: string) => void
  onTabsReorder?: (tabs: Tab[]) => void
  
  // Status
  notifications?: number
  isOnline?: boolean
  gitBranch?: string
  problems?: { errors: number; warnings: number }
  
  // Events
  onOpenSettings?: () => void
  onOpenCommandPalette?: () => void
  onToggleTerminal?: () => void
  onPlayGame?: () => void
}

// ============= Activity Bar Items =============

const ACTIVITY_BAR_ITEMS: { id: SidebarView; icon: ReactNode; title: string }[] = [
  { id: 'explorer', icon: <Files className="w-6 h-6" />, title: 'Explorer' },
  { id: 'search', icon: <Search className="w-6 h-6" />, title: 'Search' },
  { id: 'git', icon: <GitBranch className="w-6 h-6" />, title: 'Source Control' },
  { id: 'debug', icon: <Bug className="w-6 h-6" />, title: 'Run and Debug' },
  { id: 'extensions', icon: <Package className="w-6 h-6" />, title: 'Extensions' },
  { id: 'engine', icon: <Gamepad2 className="w-6 h-6" />, title: 'Game Engine' },
  { id: 'ai', icon: <Sparkles className="w-6 h-6" />, title: 'AI Copilot' },
]

const BOTTOM_PANEL_ITEMS: { id: BottomPanelView; title: string }[] = [
  { id: 'problems', title: 'Problems' },
  { id: 'output', title: 'Output' },
  { id: 'debug-console', title: 'Debug Console' },
  { id: 'terminal', title: 'Terminal' },
]

// ============= Main Component =============

export default function IDELayout({
  children,
  sidebarContent,
  sidebarWidth: initialSidebarWidth = 260,
  showSidebar: initialShowSidebar = true,
  activeSidebarView = 'explorer',
  onSidebarViewChange,
  bottomPanelContent,
  bottomPanelHeight: initialBottomPanelHeight = 250,
  showBottomPanel: initialShowBottomPanel = true,
  activeBottomView = 'terminal',
  onBottomViewChange,
  secondarySidebarContent,
  secondarySidebarWidth: initialSecondarySidebarWidth = 300,
  showSecondarySidebar: initialShowSecondarySidebar = false,
  tabs = [],
  activeTabId,
  onTabChange,
  onTabClose,
  onTabsReorder,
  notifications = 0,
  isOnline = true,
  gitBranch = 'main',
  problems = { errors: 0, warnings: 2 },
  onOpenSettings,
  onOpenCommandPalette,
  onToggleTerminal,
  onPlayGame,
}: IDELayoutProps) {
  // Panel states
  const [showSidebar, setShowSidebar] = useState(initialShowSidebar)
  const [sidebarWidth, setSidebarWidth] = useState(initialSidebarWidth)
  const [showBottomPanel, setShowBottomPanel] = useState(initialShowBottomPanel)
  const [bottomPanelHeight, setBottomPanelHeight] = useState(initialBottomPanelHeight)
  const [showSecondarySidebar, setShowSecondarySidebar] = useState(initialShowSecondarySidebar)
  const [secondarySidebarWidth, setSecondarySidebarWidth] = useState(initialSecondarySidebarWidth)
  const [isMaximized, setIsMaximized] = useState(false)
  
  // Refs for resizing
  const sidebarResizeRef = useRef<HTMLDivElement>(null)
  const bottomResizeRef = useRef<HTMLDivElement>(null)
  const secondaryResizeRef = useRef<HTMLDivElement>(null)
  
  // Resizing logic
  const handleSidebarResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = sidebarWidth
    
    const onMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX
      const newWidth = Math.max(200, Math.min(600, startWidth + delta))
      setSidebarWidth(newWidth)
    }
    
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [sidebarWidth])
  
  const handleBottomResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startY = e.clientY
    const startHeight = bottomPanelHeight
    
    const onMouseMove = (e: MouseEvent) => {
      const delta = startY - e.clientY
      const newHeight = Math.max(100, Math.min(500, startHeight + delta))
      setBottomPanelHeight(newHeight)
    }
    
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [bottomPanelHeight])
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+B - Toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault()
        setShowSidebar((prev) => !prev)
      }
      // Ctrl+J - Toggle bottom panel
      if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
        e.preventDefault()
        setShowBottomPanel((prev) => !prev)
      }
      // Ctrl+Shift+P - Command palette
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault()
        onOpenCommandPalette?.()
      }
      // Ctrl+` - Toggle terminal
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault()
        setShowBottomPanel((prev) => !prev)
        onBottomViewChange?.('terminal')
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onOpenCommandPalette, onBottomViewChange])
  
  return (
    <div className="h-screen flex flex-col bg-slate-900 text-white overflow-hidden">
      {/* Title Bar */}
      <TitleBar
        onMaximize={() => setIsMaximized(!isMaximized)}
        isMaximized={isMaximized}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar */}
        <ActivityBar
          items={ACTIVITY_BAR_ITEMS}
          activeItem={activeSidebarView}
          onItemClick={(id) => {
            if (id === activeSidebarView && showSidebar) {
              setShowSidebar(false)
            } else {
              setShowSidebar(true)
              onSidebarViewChange?.(id as SidebarView)
            }
          }}
          bottomItems={[
            { id: 'settings', icon: <Settings className="w-5 h-5" />, title: 'Settings', onClick: onOpenSettings },
          ]}
        />
        
        {/* Primary Sidebar */}
        {showSidebar && (
          <>
            <div
              className="flex flex-col bg-slate-850 border-r border-slate-700"
              style={{ width: sidebarWidth }}
            >
              {/* Sidebar Header */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
                <span className="text-xs font-semibold text-slate-400 uppercase">
                  {ACTIVITY_BAR_ITEMS.find((i) => i.id === activeSidebarView)?.title}
                </span>
                <button className="p-1 text-slate-500 hover:text-white">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
              
              {/* Sidebar Content */}
              <div className="flex-1 overflow-y-auto">
                {sidebarContent || <DefaultSidebarContent view={activeSidebarView} />}
              </div>
            </div>
            
            {/* Sidebar Resize Handle */}
            <div
              ref={sidebarResizeRef}
              className="w-1 cursor-col-resize hover:bg-indigo-500 active:bg-indigo-500 transition-colors"
              onMouseDown={handleSidebarResize}
            />
          </>
        )}
        
        {/* Editor Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tabs */}
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onTabChange={onTabChange}
            onTabClose={onTabClose}
            onNewTab={() => {}}
          />
          
          {/* Editor Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Main Editor */}
            <div className="flex-1 overflow-hidden">
              {children || <EditorPlaceholder />}
            </div>
            
            {/* Bottom Panel */}
            {showBottomPanel && (
              <>
                {/* Bottom Resize Handle */}
                <div
                  ref={bottomResizeRef}
                  className="h-1 cursor-row-resize hover:bg-indigo-500 active:bg-indigo-500 transition-colors"
                  onMouseDown={handleBottomResize}
                />
                
                <div
                  className="flex flex-col border-t border-slate-700 bg-slate-850"
                  style={{ height: bottomPanelHeight }}
                >
                  {/* Bottom Panel Tabs */}
                  <div className="flex items-center justify-between px-2 border-b border-slate-700">
                    <div className="flex items-center">
                      {BOTTOM_PANEL_ITEMS.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => onBottomViewChange?.(item.id)}
                          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                            activeBottomView === item.id
                              ? 'text-white border-b-2 border-indigo-500'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {item.title}
                          {item.id === 'problems' && (problems.errors > 0 || problems.warnings > 0) && (
                            <span className="ml-1.5">
                              {problems.errors > 0 && (
                                <span className="text-red-400">{problems.errors}</span>
                              )}
                              {problems.errors > 0 && problems.warnings > 0 && ' '}
                              {problems.warnings > 0 && (
                                <span className="text-amber-400">{problems.warnings}</span>
                              )}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setIsMaximized(!isMaximized)}
                        className="p-1 text-slate-500 hover:text-white"
                      >
                        {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setShowBottomPanel(false)}
                        className="p-1 text-slate-500 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Bottom Panel Content */}
                  <div className="flex-1 overflow-hidden">
                    {bottomPanelContent || <TerminalPlaceholder />}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Secondary Sidebar (Right) */}
        {showSecondarySidebar && (
          <>
            <div
              ref={secondaryResizeRef}
              className="w-1 cursor-col-resize hover:bg-indigo-500 active:bg-indigo-500 transition-colors"
            />
            <div
              className="flex flex-col bg-slate-850 border-l border-slate-700"
              style={{ width: secondarySidebarWidth }}
            >
              {secondarySidebarContent || (
                <div className="flex-1 flex items-center justify-center text-slate-500">
                  Secondary Panel
                </div>
              )}
            </div>
          </>
        )}
      </div>
      
      {/* Status Bar */}
      <StatusBar
        showSidebar={showSidebar}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
        showBottomPanel={showBottomPanel}
        onToggleBottomPanel={() => setShowBottomPanel(!showBottomPanel)}
        gitBranch={gitBranch}
        problems={problems}
        notifications={notifications}
        isOnline={isOnline}
        onOpenSettings={onOpenSettings}
        onOpenCommandPalette={onOpenCommandPalette}
        onPlayGame={onPlayGame}
      />
    </div>
  )
}

// ============= Title Bar =============

interface TitleBarProps {
  onMaximize: () => void
  isMaximized: boolean
}

function TitleBar({ onMaximize, isMaximized }: TitleBarProps) {
  return (
    <div className="h-8 flex items-center justify-between bg-slate-900 border-b border-slate-800 px-2 select-none">
      {/* Left - Menu */}
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-sm bg-gradient-to-br from-indigo-500 to-purple-600" />
        <span className="text-sm font-medium text-slate-300">Aethel Engine</span>
      </div>
      
      {/* Center - Title */}
      <div className="absolute left-1/2 transform -translate-x-1/2 text-xs text-slate-500">
        Aethel IDE - Professional Game Development
      </div>
      
      {/* Right - Window Controls */}
      <div className="flex items-center">
        <button className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-800">
          <Minimize2 className="w-3 h-3" />
        </button>
        <button
          onClick={onMaximize}
          className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-800"
        >
          <Maximize2 className="w-3 h-3" />
        </button>
        <button className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white hover:bg-red-600">
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

// ============= Activity Bar =============

interface ActivityBarProps {
  items: { id: string; icon: ReactNode; title: string }[]
  activeItem: string
  onItemClick: (id: string) => void
  bottomItems?: { id: string; icon: ReactNode; title: string; onClick?: () => void }[]
}

function ActivityBar({ items, activeItem, onItemClick, bottomItems }: ActivityBarProps) {
  return (
    <div className="w-12 flex flex-col items-center py-2 bg-slate-900 border-r border-slate-800">
      {/* Main Items */}
      <div className="flex-1 flex flex-col items-center gap-1">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onItemClick(item.id)}
            className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
              activeItem === item.id
                ? 'text-white bg-slate-800 border-l-2 border-indigo-500'
                : 'text-slate-500 hover:text-white'
            }`}
            title={item.title}
          >
            {item.icon}
          </button>
        ))}
      </div>
      
      {/* Bottom Items */}
      {bottomItems && (
        <div className="flex flex-col items-center gap-1 mt-auto">
          {bottomItems.map((item) => (
            <button
              key={item.id}
              onClick={item.onClick}
              className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-white rounded transition-colors"
              title={item.title}
            >
              {item.icon}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ============= Tab Bar =============

interface TabBarProps {
  tabs: Tab[]
  activeTabId?: string
  onTabChange?: (tabId: string) => void
  onTabClose?: (tabId: string) => void
  onNewTab: () => void
}

function TabBar({ tabs, activeTabId, onTabChange, onTabClose, onNewTab }: TabBarProps) {
  if (tabs.length === 0) {
    return (
      <div className="h-9 flex items-center px-2 bg-slate-850 border-b border-slate-700">
        <button
          onClick={onNewTab}
          className="flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-white"
        >
          <Plus className="w-3 h-3" />
          New Tab
        </button>
      </div>
    )
  }
  
  return (
    <div className="h-9 flex items-center bg-slate-850 border-b border-slate-700 overflow-x-auto">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => onTabChange?.(tab.id)}
          className={`group flex items-center gap-2 px-3 h-full border-r border-slate-700 cursor-pointer ${
            activeTabId === tab.id
              ? 'bg-slate-900 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          {tab.icon || <FileCode className="w-4 h-4 text-slate-500" />}
          <span className={`text-sm ${tab.isPreview ? 'italic' : ''}`}>
            {tab.title}
          </span>
          {tab.isDirty && (
            <Circle className="w-2 h-2 fill-current text-white" />
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onTabClose?.(tab.id)
            }}
            className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-slate-700 rounded"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      <button
        onClick={onNewTab}
        className="flex items-center justify-center w-8 h-full text-slate-500 hover:text-white hover:bg-slate-800"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  )
}

// ============= Status Bar =============

interface StatusBarProps {
  showSidebar: boolean
  onToggleSidebar: () => void
  showBottomPanel: boolean
  onToggleBottomPanel: () => void
  gitBranch: string
  problems: { errors: number; warnings: number }
  notifications: number
  isOnline: boolean
  onOpenSettings?: () => void
  onOpenCommandPalette?: () => void
  onPlayGame?: () => void
}

function StatusBar({
  showSidebar,
  onToggleSidebar,
  showBottomPanel,
  onToggleBottomPanel,
  gitBranch,
  problems,
  notifications,
  isOnline,
  onOpenSettings,
  onOpenCommandPalette,
  onPlayGame,
}: StatusBarProps) {
  return (
    <div className="h-6 flex items-center justify-between px-2 bg-indigo-600 text-white text-xs select-none">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="flex items-center gap-1 hover:bg-indigo-700 px-1 py-0.5 rounded"
        >
          <PanelLeft className="w-3.5 h-3.5" />
        </button>
        
        <button className="flex items-center gap-1 hover:bg-indigo-700 px-1 py-0.5 rounded">
          <GitBranch className="w-3.5 h-3.5" />
          {gitBranch}
        </button>
        
        <button className="flex items-center gap-1 hover:bg-indigo-700 px-1 py-0.5 rounded">
          {problems.errors > 0 ? (
            <AlertCircle className="w-3.5 h-3.5 text-red-300" />
          ) : (
            <CheckCircle className="w-3.5 h-3.5" />
          )}
          {problems.errors} <span className="opacity-75">errors</span>
          <span className="mx-1">•</span>
          {problems.warnings} <span className="opacity-75">warnings</span>
        </button>
      </div>
      
      {/* Center */}
      <div className="flex items-center gap-2">
        <button
          onClick={onPlayGame}
          className="flex items-center gap-1 hover:bg-indigo-700 px-2 py-0.5 rounded bg-green-600/50"
        >
          <Play className="w-3.5 h-3.5" />
          Play
        </button>
      </div>
      
      {/* Right */}
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-1 hover:bg-indigo-700 px-1 py-0.5 rounded">
          <Code className="w-3.5 h-3.5" />
          TypeScript
        </button>
        
        <button className="flex items-center gap-1 hover:bg-indigo-700 px-1 py-0.5 rounded">
          UTF-8
        </button>
        
        <button className="flex items-center gap-1 hover:bg-indigo-700 px-1 py-0.5 rounded">
          LF
        </button>
        
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-1 hover:bg-indigo-700 px-1 py-0.5 rounded"
          title="Command Palette (Ctrl+Shift+P)"
        >
          <Command className="w-3.5 h-3.5" />
        </button>
        
        {isOnline ? (
          <Wifi className="w-3.5 h-3.5 text-green-300" />
        ) : (
          <WifiOff className="w-3.5 h-3.5 text-red-300" />
        )}
        
        {notifications > 0 && (
          <button className="flex items-center gap-1 hover:bg-indigo-700 px-1 py-0.5 rounded">
            <Bell className="w-3.5 h-3.5" />
            <span className="bg-red-500 text-white text-[10px] px-1 rounded">
              {notifications}
            </span>
          </button>
        )}
        
        <button
          onClick={onToggleBottomPanel}
          className="flex items-center gap-1 hover:bg-indigo-700 px-1 py-0.5 rounded"
        >
          <PanelBottom className="w-3.5 h-3.5" />
        </button>
        
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1 hover:bg-indigo-700 px-1 py-0.5 rounded"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ============= Default Sidebar Content =============

function DefaultSidebarContent({ view }: { view: SidebarView }) {
  if (view === 'explorer') {
    return <ExplorerTree />
  }
  
  return (
    <div className="flex items-center justify-center h-full text-slate-500">
      {view.charAt(0).toUpperCase() + view.slice(1)} Panel
    </div>
  )
}

// ============= Explorer Tree =============

function ExplorerTree() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['src', 'components']))
  
  const toggleFolder = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }
  
  const folders = [
    {
      name: 'src',
      children: [
        {
          name: 'components',
          children: [
            { name: 'App.tsx', icon: <FileCode className="w-4 h-4 text-blue-400" /> },
            { name: 'Header.tsx', icon: <FileCode className="w-4 h-4 text-blue-400" /> },
            { name: 'Sidebar.tsx', icon: <FileCode className="w-4 h-4 text-blue-400" /> },
          ],
        },
        {
          name: 'services',
          children: [
            { name: 'api.ts', icon: <FileCode className="w-4 h-4 text-blue-400" /> },
            { name: 'auth.ts', icon: <FileCode className="w-4 h-4 text-blue-400" /> },
          ],
        },
        { name: 'index.tsx', icon: <FileCode className="w-4 h-4 text-blue-400" /> },
        { name: 'main.ts', icon: <FileCode className="w-4 h-4 text-blue-400" /> },
      ],
    },
    {
      name: 'public',
      children: [
        { name: 'index.html', icon: <FileCode className="w-4 h-4 text-orange-400" /> },
        { name: 'favicon.ico', icon: <Image className="w-4 h-4 text-purple-400" /> },
      ],
    },
    { name: 'package.json', icon: <FileCode className="w-4 h-4 text-green-400" /> },
    { name: 'tsconfig.json', icon: <FileCode className="w-4 h-4 text-blue-400" /> },
    { name: 'README.md', icon: <FileCode className="w-4 h-4 text-slate-400" /> },
  ]
  
  const renderItem = (item: any, path: string, depth: number = 0) => {
    const isFolder = !!item.children
    const isExpanded = expanded.has(path)
    
    return (
      <div key={path}>
        <button
          onClick={() => isFolder && toggleFolder(path)}
          className={`w-full flex items-center gap-1 px-2 py-0.5 hover:bg-slate-800 text-left text-sm`}
          style={{ paddingLeft: depth * 12 + 8 }}
        >
          {isFolder ? (
            <>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
              )}
              {isExpanded ? (
                <FolderOpen className="w-4 h-4 text-amber-400 flex-shrink-0" />
              ) : (
                <Folder className="w-4 h-4 text-amber-400 flex-shrink-0" />
              )}
            </>
          ) : (
            <>
              <span className="w-4" />
              {item.icon || <FileCode className="w-4 h-4 text-slate-400 flex-shrink-0" />}
            </>
          )}
          <span className="text-slate-300 truncate">{item.name}</span>
        </button>
        
        {isFolder && isExpanded && item.children && (
          <div>
            {item.children.map((child: any) =>
              renderItem(child, `${path}/${child.name}`, depth + 1)
            )}
          </div>
        )}
      </div>
    )
  }
  
  return (
    <div className="py-2">
      <div className="px-3 py-1 text-xs font-semibold text-slate-500 uppercase">
        Project
      </div>
      {folders.map((item) => renderItem(item, item.name))}
    </div>
  )
}

// ============= Placeholders =============

function EditorPlaceholder() {
  return (
    <div className="flex-1 flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <Code className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Aethel IDE</h2>
        <p className="text-slate-400 mb-6">Professional Game Development Environment</p>
        <div className="flex flex-col gap-2 text-sm text-slate-500">
          <p><kbd className="px-2 py-0.5 bg-slate-800 rounded">Ctrl+N</kbd> New File</p>
          <p><kbd className="px-2 py-0.5 bg-slate-800 rounded">Ctrl+O</kbd> Open File</p>
          <p><kbd className="px-2 py-0.5 bg-slate-800 rounded">Ctrl+Shift+P</kbd> Command Palette</p>
        </div>
      </div>
    </div>
  )
}

function TerminalPlaceholder() {
  return (
    <div className="h-full p-2 font-mono text-sm bg-slate-900">
      <div className="text-slate-500">
        <span className="text-green-400">aethel@engine</span>
        <span className="text-slate-600">:</span>
        <span className="text-blue-400">~/project</span>
        <span className="text-slate-600">$</span>
        <span className="ml-2 animate-pulse">▊</span>
      </div>
    </div>
  )
}
