'use client'

/**
 * Professional Status Bar Component
 * Complete IDE status bar with all indicators
 * 
 * Features:
 * - Git branch & sync status
 * - Problems (errors/warnings)
 * - Language mode
 * - Encoding
 * - Line endings
 * - Cursor position
 * - Indentation
 * - Notifications
 * - Online/Offline status
 * - AI Copilot status
 * - Performance metrics
 * - Quick actions
 */

import { useState, useEffect, useCallback } from 'react'
import {
  GitBranch,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Info,
  Bell,
  BellOff,
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  Cpu,
  Battery,
  Settings,
  Terminal,
  Code,
  FileCode,
  Sparkles,
  SparklesIcon,
  Play,
  Bug,
  Layers,
  Layout,
  PanelLeft,
  PanelRight,
  PanelBottom,
  Maximize2,
  Minimize2,
  Command,
  Keyboard,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Radio,
  CircleDot,
  Circle,
  Upload,
  Download,
  Zap,
  Activity,
  Timer,
  Eye,
  EyeOff,
} from 'lucide-react'

// ============= Types =============

export interface StatusBarProps {
  // File info
  language?: string
  encoding?: string
  lineEnding?: 'LF' | 'CRLF'
  indentation?: { type: 'spaces' | 'tabs'; size: number }
  cursorPosition?: { line: number; column: number }
  selection?: { lines: number; characters: number } | null
  
  // Git
  gitBranch?: string
  gitAhead?: number
  gitBehind?: number
  gitSyncing?: boolean
  
  // Problems
  errors?: number
  warnings?: number
  infos?: number
  
  // Status
  isOnline?: boolean
  isSynced?: boolean
  notifications?: number
  
  // AI
  aiEnabled?: boolean
  aiModel?: string
  aiTokensUsed?: number
  
  // Performance
  cpuUsage?: number
  memoryUsage?: number
  fps?: number
  
  // Panels
  showSidebar?: boolean
  showBottomPanel?: boolean
  showSecondarySidebar?: boolean
  
  // Recording
  isRecording?: boolean
  recordingTime?: number
  
  // Events
  onToggleSidebar?: () => void
  onToggleBottomPanel?: () => void
  onToggleSecondarySidebar?: () => void
  onOpenSettings?: () => void
  onOpenCommandPalette?: () => void
  onOpenNotifications?: () => void
  onToggleAI?: () => void
  onGitSync?: () => void
  onGitBranchClick?: () => void
  onProblemsClick?: () => void
  onLanguageClick?: () => void
  onEncodingClick?: () => void
  onLineEndingClick?: () => void
  onIndentationClick?: () => void
  onPlayClick?: () => void
}

// ============= Main Component =============

export default function StatusBar({
  // File info
  language = 'TypeScript',
  encoding = 'UTF-8',
  lineEnding = 'LF',
  indentation = { type: 'spaces', size: 2 },
  cursorPosition = { line: 1, column: 1 },
  selection = null,
  
  // Git
  gitBranch = 'main',
  gitAhead = 0,
  gitBehind = 0,
  gitSyncing = false,
  
  // Problems
  errors = 0,
  warnings = 2,
  infos = 0,
  
  // Status
  isOnline = true,
  isSynced = true,
  notifications = 3,
  
  // AI
  aiEnabled = true,
  aiModel = 'Claude 3.5',
  aiTokensUsed = 1250,
  
  // Performance
  cpuUsage = 15,
  memoryUsage = 45,
  fps = 60,
  
  // Panels
  showSidebar = true,
  showBottomPanel = true,
  showSecondarySidebar = false,
  
  // Recording
  isRecording = false,
  recordingTime = 0,
  
  // Events
  onToggleSidebar,
  onToggleBottomPanel,
  onToggleSecondarySidebar,
  onOpenSettings,
  onOpenCommandPalette,
  onOpenNotifications,
  onToggleAI,
  onGitSync,
  onGitBranchClick,
  onProblemsClick,
  onLanguageClick,
  onEncodingClick,
  onLineEndingClick,
  onIndentationClick,
  onPlayClick,
}: StatusBarProps) {
  const [currentTime, setCurrentTime] = useState(new Date())
  
  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])
  
  // Format recording time
  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  
  return (
    <div className="h-6 flex items-center justify-between bg-indigo-600 text-white text-xs select-none border-t border-indigo-700">
      {/* Left Section */}
      <div className="flex items-center h-full">
        {/* Panel Toggles */}
        <StatusBarButton
          onClick={onToggleSidebar}
          active={showSidebar}
          title="Toggle Primary Sidebar (Ctrl+B)"
        >
          <PanelLeft className="w-3.5 h-3.5" />
        </StatusBarButton>
        
        {/* Git Branch */}
        <StatusBarButton onClick={onGitBranchClick} title="Git Branch">
          <GitBranch className="w-3.5 h-3.5" />
          <span>{gitBranch}</span>
          {(gitAhead > 0 || gitBehind > 0) && (
            <span className="flex items-center gap-0.5 text-[10px]">
              {gitAhead > 0 && <span>↑{gitAhead}</span>}
              {gitBehind > 0 && <span>↓{gitBehind}</span>}
            </span>
          )}
        </StatusBarButton>
        
        {/* Git Sync */}
        <StatusBarButton onClick={onGitSync} title="Synchronize Changes">
          <RefreshCw className={`w-3.5 h-3.5 ${gitSyncing ? 'animate-spin' : ''}`} />
        </StatusBarButton>
        
        {/* Problems */}
        <StatusBarButton onClick={onProblemsClick} title="View Problems">
          {errors > 0 ? (
            <AlertCircle className="w-3.5 h-3.5 text-red-300" />
          ) : warnings > 0 ? (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
          ) : (
            <CheckCircle className="w-3.5 h-3.5 text-green-300" />
          )}
          <span>
            {errors > 0 && <span className="text-red-300">{errors}</span>}
            {errors > 0 && warnings > 0 && <span className="mx-1 opacity-50">·</span>}
            {warnings > 0 && <span className="text-amber-300">{warnings}</span>}
            {errors === 0 && warnings === 0 && 'No problems'}
          </span>
        </StatusBarButton>
        
        {/* Recording Indicator */}
        {isRecording && (
          <StatusBarButton className="bg-red-600/50">
            <CircleDot className="w-3.5 h-3.5 text-red-400 animate-pulse" />
            <span>REC {formatRecordingTime(recordingTime)}</span>
          </StatusBarButton>
        )}
      </div>
      
      {/* Center Section */}
      <div className="flex items-center h-full">
        {/* Play Button */}
        <StatusBarButton onClick={onPlayClick} className="bg-green-600/40 hover:bg-green-600/60">
          <Play className="w-3.5 h-3.5" />
          <span>Play</span>
        </StatusBarButton>
        
        {/* AI Status */}
        <StatusBarButton onClick={onToggleAI} title="AI Copilot">
          <Sparkles className={`w-3.5 h-3.5 ${aiEnabled ? 'text-amber-300' : 'text-slate-400'}`} />
          <span className={aiEnabled ? '' : 'opacity-50'}>
            {aiEnabled ? aiModel : 'AI Off'}
          </span>
        </StatusBarButton>
      </div>
      
      {/* Right Section */}
      <div className="flex items-center h-full">
        {/* Cursor Position */}
        <StatusBarButton title="Go to Line (Ctrl+G)">
          <span>
            Ln {cursorPosition.line}, Col {cursorPosition.column}
          </span>
          {selection && (
            <span className="text-indigo-300">
              ({selection.lines} lines, {selection.characters} chars)
            </span>
          )}
        </StatusBarButton>
        
        {/* Indentation */}
        <StatusBarButton onClick={onIndentationClick} title="Select Indentation">
          <span>
            {indentation.type === 'spaces' ? 'Spaces' : 'Tabs'}: {indentation.size}
          </span>
        </StatusBarButton>
        
        {/* Encoding */}
        <StatusBarButton onClick={onEncodingClick} title="Select Encoding">
          <span>{encoding}</span>
        </StatusBarButton>
        
        {/* Line Ending */}
        <StatusBarButton onClick={onLineEndingClick} title="Select End of Line Sequence">
          <span>{lineEnding}</span>
        </StatusBarButton>
        
        {/* Language */}
        <StatusBarButton onClick={onLanguageClick} title="Select Language Mode">
          <FileCode className="w-3.5 h-3.5" />
          <span>{language}</span>
        </StatusBarButton>
        
        {/* Separator */}
        <div className="w-px h-4 bg-indigo-500 mx-1" />
        
        {/* Performance */}
        <StatusBarButton title="Performance">
          <Activity className={`w-3.5 h-3.5 ${cpuUsage > 80 ? 'text-red-300' : ''}`} />
          <span className={cpuUsage > 80 ? 'text-red-300' : ''}>
            {cpuUsage}%
          </span>
        </StatusBarButton>
        
        <StatusBarButton title="Memory Usage">
          <Cpu className={`w-3.5 h-3.5 ${memoryUsage > 80 ? 'text-red-300' : ''}`} />
          <span className={memoryUsage > 80 ? 'text-red-300' : ''}>
            {memoryUsage}%
          </span>
        </StatusBarButton>
        
        {fps !== undefined && (
          <StatusBarButton title="FPS">
            <Timer className={`w-3.5 h-3.5 ${fps < 30 ? 'text-red-300' : fps < 50 ? 'text-amber-300' : 'text-green-300'}`} />
            <span className={fps < 30 ? 'text-red-300' : fps < 50 ? 'text-amber-300' : 'text-green-300'}>
              {fps} FPS
            </span>
          </StatusBarButton>
        )}
        
        {/* Separator */}
        <div className="w-px h-4 bg-indigo-500 mx-1" />
        
        {/* Online Status */}
        <StatusBarButton title={isOnline ? 'Online' : 'Offline'}>
          {isOnline ? (
            <Wifi className="w-3.5 h-3.5 text-green-300" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-red-300" />
          )}
        </StatusBarButton>
        
        {/* Cloud Sync */}
        <StatusBarButton title={isSynced ? 'All changes synced' : 'Syncing...'}>
          {isSynced ? (
            <Cloud className="w-3.5 h-3.5 text-green-300" />
          ) : (
            <CloudOff className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
          )}
        </StatusBarButton>
        
        {/* Notifications */}
        <StatusBarButton onClick={onOpenNotifications} title="Notifications">
          {notifications > 0 ? (
            <>
              <Bell className="w-3.5 h-3.5" />
              <span className="bg-red-500 text-white text-[10px] px-1 rounded-full min-w-[16px] text-center">
                {notifications > 99 ? '99+' : notifications}
              </span>
            </>
          ) : (
            <BellOff className="w-3.5 h-3.5 opacity-50" />
          )}
        </StatusBarButton>
        
        {/* Command Palette */}
        <StatusBarButton onClick={onOpenCommandPalette} title="Command Palette (Ctrl+Shift+P)">
          <Command className="w-3.5 h-3.5" />
        </StatusBarButton>
        
        {/* Bottom Panel Toggle */}
        <StatusBarButton
          onClick={onToggleBottomPanel}
          active={showBottomPanel}
          title="Toggle Panel (Ctrl+J)"
        >
          <PanelBottom className="w-3.5 h-3.5" />
        </StatusBarButton>
        
        {/* Settings */}
        <StatusBarButton onClick={onOpenSettings} title="Settings (Ctrl+,)">
          <Settings className="w-3.5 h-3.5" />
        </StatusBarButton>
      </div>
    </div>
  )
}

// ============= Status Bar Button =============

interface StatusBarButtonProps {
  children: React.ReactNode
  onClick?: () => void
  active?: boolean
  title?: string
  className?: string
}

function StatusBarButton({
  children,
  onClick,
  active,
  title,
  className = '',
}: StatusBarButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`
        flex items-center gap-1 h-full px-2 
        hover:bg-indigo-700/50 transition-colors
        ${active ? 'bg-indigo-700/50' : ''}
        ${className}
      `}
    >
      {children}
    </button>
  )
}

// ============= Mini Status Bar (for embeds) =============

export interface MiniStatusBarProps {
  language?: string
  cursorPosition?: { line: number; column: number }
  isDirty?: boolean
  isReadOnly?: boolean
}

export function MiniStatusBar({
  language = 'Plain Text',
  cursorPosition = { line: 1, column: 1 },
  isDirty = false,
  isReadOnly = false,
}: MiniStatusBarProps) {
  return (
    <div className="h-5 flex items-center justify-between px-2 bg-slate-800 text-slate-400 text-[10px] border-t border-slate-700">
      <div className="flex items-center gap-2">
        {isDirty && (
          <Circle className="w-2 h-2 fill-amber-400 text-amber-400" />
        )}
        {isReadOnly && (
          <Lock className="w-3 h-3" />
        )}
      </div>
      <div className="flex items-center gap-3">
        <span>
          Ln {cursorPosition.line}, Col {cursorPosition.column}
        </span>
        <span>{language}</span>
      </div>
    </div>
  )
}

// ============= Floating Status =============

export interface FloatingStatusProps {
  message: string
  type?: 'info' | 'success' | 'warning' | 'error' | 'loading'
  duration?: number
  onClose?: () => void
}

export function FloatingStatus({
  message,
  type = 'info',
  duration = 3000,
  onClose,
}: FloatingStatusProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => onClose?.(), duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])
  
  const icons = {
    info: <Info className="w-4 h-4 text-blue-400" />,
    success: <CheckCircle className="w-4 h-4 text-green-400" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-400" />,
    error: <AlertCircle className="w-4 h-4 text-red-400" />,
    loading: <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />,
  }
  
  const colors = {
    info: 'border-blue-500/50 bg-blue-500/10',
    success: 'border-green-500/50 bg-green-500/10',
    warning: 'border-amber-500/50 bg-amber-500/10',
    error: 'border-red-500/50 bg-red-500/10',
    loading: 'border-indigo-500/50 bg-indigo-500/10',
  }
  
  return (
    <div
      className={`
        fixed bottom-10 left-1/2 transform -translate-x-1/2
        flex items-center gap-2 px-4 py-2
        rounded-lg border shadow-lg
        text-sm text-white
        ${colors[type]}
        animate-fade-in-up
      `}
    >
      {icons[type]}
      <span>{message}</span>
    </div>
  )
}

// ============= Status Bar Context Hook =============

export interface StatusBarState {
  language: string
  encoding: string
  lineEnding: 'LF' | 'CRLF'
  indentation: { type: 'spaces' | 'tabs'; size: number }
  cursorPosition: { line: number; column: number }
  selection: { lines: number; characters: number } | null
  gitBranch: string
  gitAhead: number
  gitBehind: number
  errors: number
  warnings: number
  notifications: number
  isOnline: boolean
  isSynced: boolean
  aiEnabled: boolean
  aiModel: string
}

const defaultState: StatusBarState = {
  language: 'Plain Text',
  encoding: 'UTF-8',
  lineEnding: 'LF',
  indentation: { type: 'spaces', size: 2 },
  cursorPosition: { line: 1, column: 1 },
  selection: null,
  gitBranch: 'main',
  gitAhead: 0,
  gitBehind: 0,
  errors: 0,
  warnings: 0,
  notifications: 0,
  isOnline: true,
  isSynced: true,
  aiEnabled: true,
  aiModel: 'Claude 3.5',
}

export function useStatusBar(initialState: Partial<StatusBarState> = {}) {
  const [state, setState] = useState<StatusBarState>({
    ...defaultState,
    ...initialState,
  })
  
  const update = useCallback((updates: Partial<StatusBarState>) => {
    setState((prev) => ({ ...prev, ...updates }))
  }, [])
  
  const setCursorPosition = useCallback((line: number, column: number) => {
    update({ cursorPosition: { line, column } })
  }, [update])
  
  const setSelection = useCallback((lines: number, characters: number) => {
    update({ selection: { lines, characters } })
  }, [update])
  
  const clearSelection = useCallback(() => {
    update({ selection: null })
  }, [update])
  
  const setLanguage = useCallback((language: string) => {
    update({ language })
  }, [update])
  
  const setGitBranch = useCallback((branch: string, ahead = 0, behind = 0) => {
    update({ gitBranch: branch, gitAhead: ahead, gitBehind: behind })
  }, [update])
  
  const setProblems = useCallback((errors: number, warnings: number) => {
    update({ errors, warnings })
  }, [update])
  
  const toggleAI = useCallback(() => {
    setState((prev) => ({ ...prev, aiEnabled: !prev.aiEnabled }))
  }, [])
  
  return {
    state,
    update,
    setCursorPosition,
    setSelection,
    clearSelection,
    setLanguage,
    setGitBranch,
    setProblems,
    toggleAI,
  }
}
