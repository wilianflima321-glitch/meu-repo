'use client'

/**
 * Aethel IDE - Unified Entry Point
 * 
 * This component connects all the integrated professional components:
 * - IDELayout (shell)
 * - GitPanelPro (integrated with git-client)
 * - FileExplorerPro (file management)
 * - TerminalPro (terminal with manager)
 * - AIChatPanelPro (AI chat with backend)
 * - StatusBar (integrated with StatusBarManager)
 * - CommandPalette (with real CustomEvents)
 * - KeybindingsEditor (integrated with KeybindingManager)
 * - Engine editors (Blueprint, Level, Material, etc.)
 */

import { useState, useCallback, useEffect, useMemo } from 'react'

// Layout
import IDELayout from './ide/IDELayout'

// Integrated Components
import GitPanelPro from './ide/GitPanelPro'
import FileExplorerPro from './ide/FileExplorerPro'
import AIChatPanelPro from './ide/AIChatPanelPro'
import DiffViewer from './ide/DiffViewer'
import InlineCompletion from './ide/InlineCompletion'

// Status & Command
import { StatusBar } from './statusbar/StatusBar'
import CommandPalette from './CommandPalette'
import CommandPalettePro from './CommandPalettePro'

// Terminal & Output
import TerminalPro from './TerminalPro'
import { OutputPanel } from './output/OutputPanel'
import { ProblemsPanel } from './problems/ProblemsPanel'

// Settings & Keybindings
import SettingsEditor from './SettingsEditor'
import KeybindingsEditor from './keybindings/KeybindingsEditor'

// Search
import { SearchPanel } from './search/SearchPanel'

// Engine Editors
import BlueprintEditor from './engine/BlueprintEditor'
import LevelEditor from './engine/LevelEditor'
import { MaterialEditor } from './materials/MaterialEditor'
import NiagaraVFX from './engine/NiagaraVFX'
import AnimationBlueprint from './engine/AnimationBlueprint'
import LandscapeEditor from './engine/LandscapeEditor'

// Media Studio (unified video/image/audio)
import MediaStudio from './media/MediaStudio'

// Monaco Editor
import MonacoEditor from './editor/MonacoEditor'

// Extensions
import ExtensionMarketplace from './extensions/ExtensionManager'

// Debug
import DebugPanel from './ide/DebugPanel'

// Notification
import { NotificationSystem } from './NotificationSystem'

// ============= Types =============

type EditorTab = {
  id: string
  title: string
  type: 'code' | 'blueprint' | 'level' | 'material' | 'particles' | 'animation' | 'landscape' | 'settings' | 'keybindings' | 'media'
  path?: string
  dirty?: boolean
}

type WorkspaceState = {
  openFiles: EditorTab[]
  activeFileId: string | null
  sidebarTab: string
  bottomPanelTab: string
  showCommandPalette: boolean
  showDiffViewer: boolean
  diffFile: string | null
}

// ============= Main Component =============

export default function AethelIDE() {
  // Workspace state
  const [state, setState] = useState<WorkspaceState>({
    openFiles: [
      { id: '1', title: 'main.ts', type: 'code', path: '/src/main.ts' },
    ],
    activeFileId: '1',
    sidebarTab: 'explorer',
    bottomPanelTab: 'terminal',
    showCommandPalette: false,
    showDiffViewer: false,
    diffFile: null,
  })

  // Handle opening diff viewer
  const handleOpenDiff = useCallback((path: string) => {
    setState(prev => ({
      ...prev,
      showDiffViewer: true,
      diffFile: path,
    }))
  }, [])

  // Handle command palette toggle
  const toggleCommandPalette = useCallback(() => {
    setState(prev => ({
      ...prev,
      showCommandPalette: !prev.showCommandPalette,
    }))
  }, [])

  // Handle opening files
  const handleOpenFile = useCallback((path: string, type?: EditorTab['type']) => {
    const fileName = path.split('/').pop() || 'untitled'
    const existingTab = state.openFiles.find(f => f.path === path)

    const inferredType = type ?? getEditorTypeFromPath(path)
    
    if (existingTab) {
      setState(prev => ({ ...prev, activeFileId: existingTab.id }))
    } else {
      const newTab: EditorTab = {
        id: `file-${Date.now()}`,
        title: fileName,
        type: inferredType,
        path,
      }
      setState(prev => ({
        ...prev,
        openFiles: [...prev.openFiles, newTab],
        activeFileId: newTab.id,
      }))
    }
  }, [state.openFiles])
  
  // Wrapper for FileExplorerPro which passes FileNode
  const handleFileNodeSelect = useCallback((file: { path: string }) => {
    handleOpenFile(file.path)
  }, [handleOpenFile])

  // Handle closing files
  const handleCloseFile = useCallback((id: string) => {
    setState(prev => {
      const newFiles = prev.openFiles.filter(f => f.id !== id)
      const newActiveId = prev.activeFileId === id
        ? newFiles[newFiles.length - 1]?.id || null
        : prev.activeFileId
      return { ...prev, openFiles: newFiles, activeFileId: newActiveId }
    })
  }, [])

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command Palette: Ctrl+Shift+P
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'p') {
        e.preventDefault()
        toggleCommandPalette()
      }
      // Quick Open: Ctrl+P
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'p') {
        e.preventDefault()
        // TODO: Quick open
      }
      // Save: Ctrl+S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('save-file'))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleCommandPalette])

  // Listen for custom events from commands
  useEffect(() => {
    const handleCommand = (e: CustomEvent) => {
      const { command } = e.detail
      console.log('Command executed:', command)
      // Handle command execution here
    }

    window.addEventListener('aethel:command', handleCommand as EventListener)
    return () => window.removeEventListener('aethel:command', handleCommand as EventListener)
  }, [])

  // Get active tab
  const activeTab = state.openFiles.find(f => f.id === state.activeFileId)

  // Render sidebar content based on active tab
  const renderSidebarContent = () => {
    switch (state.sidebarTab) {
      case 'explorer':
        return (
          <FileExplorerPro
            onFileSelect={handleFileNodeSelect}
          />
        )
      case 'search':
        return <SearchPanel />
      case 'git':
        return (
          <GitPanelPro
            workspacePath="/workspace"
            onOpenDiff={handleOpenDiff}
          />
        )
      case 'debug':
        return <DebugPanel />
      case 'extensions':
        return <ExtensionMarketplace />
      case 'ai-chat':
        return <AIChatPanelPro />
      default:
        return null
    }
  }

  // Render editor content based on active tab type
  const renderEditorContent = () => {
    if (!activeTab) {
      return (
        <div className="h-full flex items-center justify-center text-slate-500">
          <div className="text-center">
            <p className="text-xl mb-2">Welcome to Aethel Engine</p>
            <p className="text-sm">Open a file or create a new one to get started</p>
          </div>
        </div>
      )
    }

    switch (activeTab.type) {
      case 'code':
        return (
          <MonacoEditor
            path={activeTab.path}
            language={getLanguageFromPath(activeTab.path || '')}
          />
        )
      case 'media':
        return <MediaStudio path={activeTab.path} />
      case 'blueprint':
        return <BlueprintEditor />
      case 'level':
        return <LevelEditor />
      case 'material':
        return <MaterialEditor />
      case 'particles':
        return <NiagaraVFX />
      case 'animation':
        return <AnimationBlueprint />
      case 'landscape':
        return <LandscapeEditor />
      case 'settings':
        return <SettingsEditor />
      case 'keybindings':
        return <KeybindingsEditor />
      default:
        return <MonacoEditor path={activeTab.path} />
    }
  }

  // Render bottom panel content
  const renderBottomPanel = () => {
    switch (state.bottomPanelTab) {
      case 'terminal':
        return <TerminalPro />
      case 'output':
        return <OutputPanel />
      case 'problems':
        return <ProblemsPanel />
      default:
        return <TerminalPro />
    }
  }

  return (
    <NotificationSystem>
      <div className="h-screen w-screen overflow-hidden bg-slate-900">
        {/* IDE Layout */}
        <IDELayout
          fileExplorer={renderSidebarContent()}
          terminal={renderBottomPanel()}
          statusBar={<StatusBar />}
        >
          {renderEditorContent()}
        </IDELayout>

      {/* Command Palette */}
      <CommandPalette
        isOpen={state.showCommandPalette}
        onClose={() => setState(prev => ({ ...prev, showCommandPalette: false }))}
      />

      {/* Diff Viewer Modal */}
      {state.showDiffViewer && state.diffFile && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="w-[90vw] h-[80vh] bg-slate-900 rounded-lg overflow-hidden">
            <DiffViewer
              filePath={state.diffFile}
              onClose={() => setState(prev => ({ ...prev, showDiffViewer: false, diffFile: null }))}
            />
          </div>
        </div>
      )}
      </div>
    </NotificationSystem>
  )
}

// ============= Helpers =============

function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase()
  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    rs: 'rust',
    go: 'go',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    cs: 'csharp',
    rb: 'ruby',
    php: 'php',
    swift: 'swift',
    kt: 'kotlin',
    lua: 'lua',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    md: 'markdown',
    html: 'html',
    css: 'css',
    scss: 'scss',
    less: 'less',
    sql: 'sql',
    sh: 'shell',
    bash: 'shell',
    ps1: 'powershell',
    xml: 'xml',
    toml: 'toml',
  }
  return languageMap[ext || ''] || 'plaintext'
}

function getEditorTypeFromPath(path: string): EditorTab['type'] {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  const mediaExts = new Set([
    // image
    'png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tga', 'tiff', 'svg',
    // audio
    'wav', 'mp3', 'ogg', 'flac', 'm4a', 'aac',
    // video
    'mp4', 'webm', 'mov', 'mkv',
  ])

  if (mediaExts.has(ext)) return 'media'
  return 'code'
}

// Export all integrated components for individual use
export {
  IDELayout,
  GitPanelPro,
  FileExplorerPro,
  AIChatPanelPro,
  DiffViewer,
  InlineCompletion,
  StatusBar,
  CommandPalette,
  CommandPalettePro,
  TerminalPro,
  OutputPanel,
  ProblemsPanel,
  SettingsEditor,
  KeybindingsEditor,
  SearchPanel,
  BlueprintEditor,
  LevelEditor,
  MaterialEditor,
  NiagaraVFX,
  AnimationBlueprint,
  LandscapeEditor,
  MonacoEditor,
  DebugPanel,
  NotificationSystem,
}
