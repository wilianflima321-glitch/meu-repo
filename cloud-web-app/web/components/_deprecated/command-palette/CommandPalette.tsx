'use client'

/**
 * Command Palette - Professional Command Interface
 * Like VS Code/Sublime Text Command Palette (Ctrl+Shift+P)
 * 
 * Features:
 * - Fuzzy search
 * - Categories
 * - Recent commands
 * - Keyboard navigation
 * - Extensible command registry
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import {
  Search,
  Command,
  File,
  Settings,
  GitBranch,
  Terminal,
  Code,
  Play,
  Bug,
  Palette,
  Keyboard,
  FolderOpen,
  Save,
  Undo,
  Redo,
  Copy,
  Scissors,
  Clipboard,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  RefreshCw,
  Download,
  Upload,
  Eye,
  EyeOff,
  Layout,
  Columns,
  Rows,
  PanelLeft,
  PanelRight,
  PanelBottom,
  ChevronRight,
  Clock,
  Star,
  Hash,
  AtSign,
  Globe,
  Box,
  Cpu,
  Layers,
  Gamepad2,
} from 'lucide-react'

// ============= Types =============

export interface CommandItem {
  id: string
  label: string
  description?: string
  category: CommandCategory
  icon?: React.ReactNode
  keybinding?: string
  action: () => void | Promise<void>
  when?: () => boolean
  group?: string
}

type CommandCategory =
  | 'file'
  | 'edit'
  | 'view'
  | 'go'
  | 'run'
  | 'terminal'
  | 'git'
  | 'debug'
  | 'preferences'
  | 'help'
  | 'engine'
  | 'ai'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  commands?: CommandItem[]
  placeholder?: string
  mode?: 'commands' | 'files' | 'symbols' | 'lines'
}

// ============= Category Icons =============

const CATEGORY_ICONS: Record<CommandCategory, React.ReactNode> = {
  file: <File className="w-4 h-4" />,
  edit: <Scissors className="w-4 h-4" />,
  view: <Eye className="w-4 h-4" />,
  go: <ChevronRight className="w-4 h-4" />,
  run: <Play className="w-4 h-4" />,
  terminal: <Terminal className="w-4 h-4" />,
  git: <GitBranch className="w-4 h-4" />,
  debug: <Bug className="w-4 h-4" />,
  preferences: <Settings className="w-4 h-4" />,
  help: <Globe className="w-4 h-4" />,
  engine: <Cpu className="w-4 h-4" />,
  ai: <Command className="w-4 h-4" />,
}

const CATEGORY_LABELS: Record<CommandCategory, string> = {
  file: 'File',
  edit: 'Edit',
  view: 'View',
  go: 'Go',
  run: 'Run',
  terminal: 'Terminal',
  git: 'Git',
  debug: 'Debug',
  preferences: 'Preferences',
  help: 'Help',
  engine: 'Engine',
  ai: 'AI',
}

// ============= Default Commands =============

export const DEFAULT_COMMANDS: CommandItem[] = [
  // File Commands
  {
    id: 'file.new',
    label: 'New File',
    category: 'file',
    icon: <File className="w-4 h-4" />,
    keybinding: 'Ctrl+N',
    action: () => console.log('New file'),
  },
  {
    id: 'file.open',
    label: 'Open File...',
    category: 'file',
    icon: <FolderOpen className="w-4 h-4" />,
    keybinding: 'Ctrl+O',
    action: () => console.log('Open file'),
  },
  {
    id: 'file.save',
    label: 'Save',
    category: 'file',
    icon: <Save className="w-4 h-4" />,
    keybinding: 'Ctrl+S',
    action: () => console.log('Save'),
  },
  {
    id: 'file.saveAll',
    label: 'Save All',
    category: 'file',
    keybinding: 'Ctrl+K S',
    action: () => console.log('Save all'),
  },
  {
    id: 'file.closeTab',
    label: 'Close Tab',
    category: 'file',
    keybinding: 'Ctrl+W',
    action: () => console.log('Close tab'),
  },
  
  // Edit Commands
  {
    id: 'edit.undo',
    label: 'Undo',
    category: 'edit',
    icon: <Undo className="w-4 h-4" />,
    keybinding: 'Ctrl+Z',
    action: () => console.log('Undo'),
  },
  {
    id: 'edit.redo',
    label: 'Redo',
    category: 'edit',
    icon: <Redo className="w-4 h-4" />,
    keybinding: 'Ctrl+Y',
    action: () => console.log('Redo'),
  },
  {
    id: 'edit.cut',
    label: 'Cut',
    category: 'edit',
    icon: <Scissors className="w-4 h-4" />,
    keybinding: 'Ctrl+X',
    action: () => console.log('Cut'),
  },
  {
    id: 'edit.copy',
    label: 'Copy',
    category: 'edit',
    icon: <Copy className="w-4 h-4" />,
    keybinding: 'Ctrl+C',
    action: () => console.log('Copy'),
  },
  {
    id: 'edit.paste',
    label: 'Paste',
    category: 'edit',
    icon: <Clipboard className="w-4 h-4" />,
    keybinding: 'Ctrl+V',
    action: () => console.log('Paste'),
  },
  {
    id: 'edit.find',
    label: 'Find',
    category: 'edit',
    icon: <Search className="w-4 h-4" />,
    keybinding: 'Ctrl+F',
    action: () => console.log('Find'),
  },
  {
    id: 'edit.replace',
    label: 'Find and Replace',
    category: 'edit',
    keybinding: 'Ctrl+H',
    action: () => console.log('Replace'),
  },
  {
    id: 'edit.formatDocument',
    label: 'Format Document',
    category: 'edit',
    keybinding: 'Shift+Alt+F',
    action: () => console.log('Format'),
  },
  
  // View Commands
  {
    id: 'view.commandPalette',
    label: 'Command Palette',
    category: 'view',
    icon: <Command className="w-4 h-4" />,
    keybinding: 'Ctrl+Shift+P',
    action: () => console.log('Command palette'),
  },
  {
    id: 'view.explorer',
    label: 'Explorer',
    category: 'view',
    icon: <FolderOpen className="w-4 h-4" />,
    keybinding: 'Ctrl+Shift+E',
    action: () => console.log('Explorer'),
  },
  {
    id: 'view.search',
    label: 'Search',
    category: 'view',
    icon: <Search className="w-4 h-4" />,
    keybinding: 'Ctrl+Shift+F',
    action: () => console.log('Search'),
  },
  {
    id: 'view.sourceControl',
    label: 'Source Control',
    category: 'view',
    icon: <GitBranch className="w-4 h-4" />,
    keybinding: 'Ctrl+Shift+G',
    action: () => console.log('Source control'),
  },
  {
    id: 'view.terminal',
    label: 'Terminal',
    category: 'view',
    icon: <Terminal className="w-4 h-4" />,
    keybinding: 'Ctrl+`',
    action: () => console.log('Terminal'),
  },
  {
    id: 'view.problems',
    label: 'Problems',
    category: 'view',
    keybinding: 'Ctrl+Shift+M',
    action: () => console.log('Problems'),
  },
  {
    id: 'view.output',
    label: 'Output',
    category: 'view',
    action: () => console.log('Output'),
  },
  {
    id: 'view.zoomIn',
    label: 'Zoom In',
    category: 'view',
    icon: <ZoomIn className="w-4 h-4" />,
    keybinding: 'Ctrl+=',
    action: () => console.log('Zoom in'),
  },
  {
    id: 'view.zoomOut',
    label: 'Zoom Out',
    category: 'view',
    icon: <ZoomOut className="w-4 h-4" />,
    keybinding: 'Ctrl+-',
    action: () => console.log('Zoom out'),
  },
  {
    id: 'view.resetZoom',
    label: 'Reset Zoom',
    category: 'view',
    keybinding: 'Ctrl+0',
    action: () => console.log('Reset zoom'),
  },
  {
    id: 'view.fullscreen',
    label: 'Toggle Full Screen',
    category: 'view',
    icon: <Maximize2 className="w-4 h-4" />,
    keybinding: 'F11',
    action: () => console.log('Fullscreen'),
  },
  {
    id: 'view.toggleSidebar',
    label: 'Toggle Sidebar',
    category: 'view',
    icon: <PanelLeft className="w-4 h-4" />,
    keybinding: 'Ctrl+B',
    action: () => console.log('Toggle sidebar'),
  },
  {
    id: 'view.togglePanel',
    label: 'Toggle Panel',
    category: 'view',
    icon: <PanelBottom className="w-4 h-4" />,
    keybinding: 'Ctrl+J',
    action: () => console.log('Toggle panel'),
  },
  
  // Go Commands
  {
    id: 'go.toFile',
    label: 'Go to File...',
    category: 'go',
    icon: <File className="w-4 h-4" />,
    keybinding: 'Ctrl+P',
    action: () => console.log('Go to file'),
  },
  {
    id: 'go.toLine',
    label: 'Go to Line...',
    category: 'go',
    keybinding: 'Ctrl+G',
    action: () => console.log('Go to line'),
  },
  {
    id: 'go.toSymbol',
    label: 'Go to Symbol...',
    category: 'go',
    icon: <Hash className="w-4 h-4" />,
    keybinding: 'Ctrl+Shift+O',
    action: () => console.log('Go to symbol'),
  },
  {
    id: 'go.toDefinition',
    label: 'Go to Definition',
    category: 'go',
    keybinding: 'F12',
    action: () => console.log('Go to definition'),
  },
  {
    id: 'go.toReferences',
    label: 'Go to References',
    category: 'go',
    keybinding: 'Shift+F12',
    action: () => console.log('Go to references'),
  },
  {
    id: 'go.back',
    label: 'Go Back',
    category: 'go',
    keybinding: 'Alt+Left',
    action: () => console.log('Go back'),
  },
  {
    id: 'go.forward',
    label: 'Go Forward',
    category: 'go',
    keybinding: 'Alt+Right',
    action: () => console.log('Go forward'),
  },
  
  // Run Commands
  {
    id: 'run.start',
    label: 'Start Debugging',
    category: 'run',
    icon: <Play className="w-4 h-4" />,
    keybinding: 'F5',
    action: () => console.log('Start debugging'),
  },
  {
    id: 'run.startWithoutDebugging',
    label: 'Run Without Debugging',
    category: 'run',
    keybinding: 'Ctrl+F5',
    action: () => console.log('Run without debugging'),
  },
  {
    id: 'run.stop',
    label: 'Stop',
    category: 'run',
    keybinding: 'Shift+F5',
    action: () => console.log('Stop'),
  },
  {
    id: 'run.restart',
    label: 'Restart',
    category: 'run',
    icon: <RefreshCw className="w-4 h-4" />,
    keybinding: 'Ctrl+Shift+F5',
    action: () => console.log('Restart'),
  },
  
  // Terminal Commands
  {
    id: 'terminal.new',
    label: 'New Terminal',
    category: 'terminal',
    icon: <Terminal className="w-4 h-4" />,
    keybinding: 'Ctrl+Shift+`',
    action: () => console.log('New terminal'),
  },
  {
    id: 'terminal.split',
    label: 'Split Terminal',
    category: 'terminal',
    action: () => console.log('Split terminal'),
  },
  {
    id: 'terminal.kill',
    label: 'Kill Terminal',
    category: 'terminal',
    action: () => console.log('Kill terminal'),
  },
  {
    id: 'terminal.clear',
    label: 'Clear Terminal',
    category: 'terminal',
    action: () => console.log('Clear terminal'),
  },
  
  // Git Commands
  {
    id: 'git.clone',
    label: 'Clone Repository...',
    category: 'git',
    icon: <Download className="w-4 h-4" />,
    action: () => console.log('Clone'),
  },
  {
    id: 'git.init',
    label: 'Initialize Repository',
    category: 'git',
    action: () => console.log('Init'),
  },
  {
    id: 'git.commit',
    label: 'Commit',
    category: 'git',
    action: () => console.log('Commit'),
  },
  {
    id: 'git.push',
    label: 'Push',
    category: 'git',
    icon: <Upload className="w-4 h-4" />,
    action: () => console.log('Push'),
  },
  {
    id: 'git.pull',
    label: 'Pull',
    category: 'git',
    icon: <Download className="w-4 h-4" />,
    action: () => console.log('Pull'),
  },
  {
    id: 'git.fetch',
    label: 'Fetch',
    category: 'git',
    action: () => console.log('Fetch'),
  },
  {
    id: 'git.checkout',
    label: 'Checkout to...',
    category: 'git',
    action: () => console.log('Checkout'),
  },
  {
    id: 'git.createBranch',
    label: 'Create Branch...',
    category: 'git',
    action: () => console.log('Create branch'),
  },
  {
    id: 'git.stash',
    label: 'Stash',
    category: 'git',
    action: () => console.log('Stash'),
  },
  
  // Debug Commands
  {
    id: 'debug.toggleBreakpoint',
    label: 'Toggle Breakpoint',
    category: 'debug',
    icon: <Bug className="w-4 h-4" />,
    keybinding: 'F9',
    action: () => console.log('Toggle breakpoint'),
  },
  {
    id: 'debug.stepOver',
    label: 'Step Over',
    category: 'debug',
    keybinding: 'F10',
    action: () => console.log('Step over'),
  },
  {
    id: 'debug.stepInto',
    label: 'Step Into',
    category: 'debug',
    keybinding: 'F11',
    action: () => console.log('Step into'),
  },
  {
    id: 'debug.stepOut',
    label: 'Step Out',
    category: 'debug',
    keybinding: 'Shift+F11',
    action: () => console.log('Step out'),
  },
  
  // Preferences Commands
  {
    id: 'preferences.settings',
    label: 'Settings',
    category: 'preferences',
    icon: <Settings className="w-4 h-4" />,
    keybinding: 'Ctrl+,',
    action: () => console.log('Settings'),
  },
  {
    id: 'preferences.keyboardShortcuts',
    label: 'Keyboard Shortcuts',
    category: 'preferences',
    icon: <Keyboard className="w-4 h-4" />,
    keybinding: 'Ctrl+K Ctrl+S',
    action: () => console.log('Keyboard shortcuts'),
  },
  {
    id: 'preferences.colorTheme',
    label: 'Color Theme',
    category: 'preferences',
    icon: <Palette className="w-4 h-4" />,
    keybinding: 'Ctrl+K Ctrl+T',
    action: () => console.log('Color theme'),
  },
  {
    id: 'preferences.iconTheme',
    label: 'File Icon Theme',
    category: 'preferences',
    action: () => console.log('Icon theme'),
  },
  
  // Engine Commands
  {
    id: 'engine.play',
    label: 'Play in Editor',
    category: 'engine',
    icon: <Play className="w-4 h-4" />,
    keybinding: 'Alt+P',
    action: () => console.log('Play'),
  },
  {
    id: 'engine.stop',
    label: 'Stop Playing',
    category: 'engine',
    keybinding: 'Esc',
    action: () => console.log('Stop'),
  },
  {
    id: 'engine.openBlueprintEditor',
    label: 'Open Blueprint Editor',
    category: 'engine',
    icon: <Box className="w-4 h-4" />,
    action: () => console.log('Blueprint editor'),
  },
  {
    id: 'engine.openLevelEditor',
    label: 'Open Level Editor',
    category: 'engine',
    icon: <Layers className="w-4 h-4" />,
    action: () => console.log('Level editor'),
  },
  {
    id: 'engine.openMaterialEditor',
    label: 'Open Material Editor',
    category: 'engine',
    icon: <Palette className="w-4 h-4" />,
    action: () => console.log('Material editor'),
  },
  {
    id: 'engine.openAnimationEditor',
    label: 'Open Animation Editor',
    category: 'engine',
    action: () => console.log('Animation editor'),
  },
  {
    id: 'engine.openSpriteEditor',
    label: 'Open Sprite Editor',
    category: 'engine',
    action: () => console.log('Sprite editor'),
  },
  {
    id: 'engine.openVFXEditor',
    label: 'Open VFX Editor',
    category: 'engine',
    action: () => console.log('VFX editor'),
  },
  {
    id: 'engine.openSequencer',
    label: 'Open Sequencer',
    category: 'engine',
    action: () => console.log('Sequencer'),
  },
  {
    id: 'engine.build',
    label: 'Build Project',
    category: 'engine',
    keybinding: 'Ctrl+Shift+B',
    action: () => console.log('Build'),
  },
  
  // AI Commands
  {
    id: 'ai.openChat',
    label: 'Open AI Chat',
    category: 'ai',
    icon: <Command className="w-4 h-4" />,
    keybinding: 'Ctrl+Shift+I',
    action: () => console.log('AI chat'),
  },
  {
    id: 'ai.explainCode',
    label: 'Explain Selected Code',
    category: 'ai',
    action: () => console.log('Explain code'),
  },
  {
    id: 'ai.generateCode',
    label: 'Generate Code...',
    category: 'ai',
    action: () => console.log('Generate code'),
  },
  {
    id: 'ai.fixErrors',
    label: 'Fix Errors with AI',
    category: 'ai',
    action: () => console.log('Fix errors'),
  },
  {
    id: 'ai.generateTests',
    label: 'Generate Tests',
    category: 'ai',
    action: () => console.log('Generate tests'),
  },
  {
    id: 'ai.refactorCode',
    label: 'Refactor with AI',
    category: 'ai',
    action: () => console.log('Refactor'),
  },
  {
    id: 'ai.documentCode',
    label: 'Generate Documentation',
    category: 'ai',
    action: () => console.log('Document'),
  },
  {
    id: 'ai.toggleInlineCompletion',
    label: 'Toggle Inline Completion',
    category: 'ai',
    action: () => console.log('Toggle completion'),
  },
]

// ============= Fuzzy Search =============

function fuzzyMatch(query: string, text: string): { matches: boolean; score: number } {
  if (!query) return { matches: true, score: 0 }
  
  const queryLower = query.toLowerCase()
  const textLower = text.toLowerCase()
  
  // Exact match
  if (textLower === queryLower) return { matches: true, score: 100 }
  
  // Starts with
  if (textLower.startsWith(queryLower)) return { matches: true, score: 90 }
  
  // Contains
  if (textLower.includes(queryLower)) return { matches: true, score: 80 }
  
  // Fuzzy match
  let queryIdx = 0
  let score = 0
  let consecutive = 0
  
  for (let i = 0; i < textLower.length && queryIdx < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIdx]) {
      queryIdx++
      score += 10 + consecutive * 5
      consecutive++
    } else {
      consecutive = 0
    }
  }
  
  if (queryIdx === queryLower.length) {
    return { matches: true, score }
  }
  
  return { matches: false, score: 0 }
}

// ============= Main Component =============

export default function CommandPalette({
  isOpen,
  onClose,
  commands = DEFAULT_COMMANDS,
  placeholder = 'Type a command or search...',
  mode = 'commands',
}: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [recentCommands, setRecentCommands] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  
  // Load recent commands
  useEffect(() => {
    const saved = localStorage.getItem('aethel-recent-commands')
    if (saved) {
      try {
        setRecentCommands(JSON.parse(saved))
      } catch (e) {}
    }
  }, [])
  
  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isOpen])
  
  // Filter and sort commands
  const filteredCommands = useMemo(() => {
    const results = commands
      .filter((cmd) => !cmd.when || cmd.when())
      .map((cmd) => {
        const labelMatch = fuzzyMatch(query, cmd.label)
        const descMatch = fuzzyMatch(query, cmd.description || '')
        const idMatch = fuzzyMatch(query, cmd.id)
        
        const matches = labelMatch.matches || descMatch.matches || idMatch.matches
        const score = Math.max(labelMatch.score, descMatch.score * 0.5, idMatch.score * 0.3)
        
        // Boost recent commands
        const recentBoost = recentCommands.includes(cmd.id) 
          ? 50 - recentCommands.indexOf(cmd.id) * 5 
          : 0
        
        return { cmd, matches, score: score + recentBoost }
      })
      .filter((r) => r.matches)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.cmd)
    
    return results
  }, [commands, query, recentCommands])
  
  // Execute command
  const executeCommand = useCallback((cmd: CommandItem) => {
    // Add to recent
    const newRecent = [cmd.id, ...recentCommands.filter((id) => id !== cmd.id)].slice(0, 10)
    setRecentCommands(newRecent)
    localStorage.setItem('aethel-recent-commands', JSON.stringify(newRecent))
    
    // Close and execute
    onClose()
    cmd.action()
  }, [onClose, recentCommands])
  
  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (filteredCommands[selectedIndex]) {
          executeCommand(filteredCommands[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
    }
  }, [filteredCommands, selectedIndex, executeCommand, onClose])
  
  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    
    const item = list.children[selectedIndex] as HTMLElement
    if (!item) return
    
    const listRect = list.getBoundingClientRect()
    const itemRect = item.getBoundingClientRect()
    
    if (itemRect.bottom > listRect.bottom) {
      item.scrollIntoView({ block: 'nearest' })
    } else if (itemRect.top < listRect.top) {
      item.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])
  
  if (!isOpen) return null
  
  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {}
    
    filteredCommands.forEach((cmd) => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = []
      }
      groups[cmd.category].push(cmd)
    })
    
    return groups
  }, [filteredCommands])
  
  // Flatten for indexing
  const flatCommands = filteredCommands
  
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Palette */}
      <div className="relative w-[600px] max-h-[60vh] bg-slate-800 rounded-lg shadow-2xl border border-slate-700 overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 bg-transparent border-none outline-none text-white text-sm placeholder:text-slate-500"
          />
          <kbd className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-400">
            Esc
          </kbd>
        </div>
        
        {/* Results */}
        <div ref={listRef} className="overflow-y-auto max-h-[calc(60vh-60px)]">
          {flatCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-slate-500">
              No matching commands
            </div>
          ) : query ? (
            // Flat list when searching
            flatCommands.map((cmd, idx) => (
              <CommandRow
                key={cmd.id}
                command={cmd}
                isSelected={idx === selectedIndex}
                onClick={() => executeCommand(cmd)}
                onMouseEnter={() => setSelectedIndex(idx)}
                isRecent={recentCommands.includes(cmd.id)}
              />
            ))
          ) : (
            // Grouped by category
            <>
              {/* Recent */}
              {recentCommands.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    Recent
                  </div>
                  {recentCommands
                    .map((id) => commands.find((c) => c.id === id))
                    .filter(Boolean)
                    .slice(0, 5)
                    .map((cmd) => {
                      const idx = flatCommands.indexOf(cmd!)
                      return (
                        <CommandRow
                          key={cmd!.id}
                          command={cmd!}
                          isSelected={idx === selectedIndex}
                          onClick={() => executeCommand(cmd!)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          isRecent
                        />
                      )
                    })}
                </div>
              )}
              
              {/* All commands by category */}
              {Object.entries(groupedCommands).map(([category, cmds]) => (
                <div key={category}>
                  <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase flex items-center gap-2">
                    {CATEGORY_ICONS[category as CommandCategory]}
                    {CATEGORY_LABELS[category as CommandCategory]}
                  </div>
                  {cmds.map((cmd) => {
                    const idx = flatCommands.indexOf(cmd)
                    return (
                      <CommandRow
                        key={cmd.id}
                        command={cmd}
                        isSelected={idx === selectedIndex}
                        onClick={() => executeCommand(cmd)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        isRecent={recentCommands.includes(cmd.id)}
                      />
                    )
                  })}
                </div>
              ))}
            </>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-slate-700 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-[10px]">↑</kbd>
            <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-[10px]">↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-[10px]">↵</kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-[10px]">Esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>
  )
}

// ============= Command Row Component =============

interface CommandRowProps {
  command: CommandItem
  isSelected: boolean
  onClick: () => void
  onMouseEnter: () => void
  isRecent?: boolean
}

function CommandRow({ command, isSelected, onClick, onMouseEnter, isRecent }: CommandRowProps) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
        isSelected ? 'bg-indigo-600/30' : 'hover:bg-slate-700/50'
      }`}
    >
      <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-slate-400">
        {command.icon || CATEGORY_ICONS[command.category]}
      </span>
      
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white truncate">{command.label}</div>
        {command.description && (
          <div className="text-xs text-slate-500 truncate">{command.description}</div>
        )}
      </div>
      
      {isRecent && (
        <Clock className="w-3 h-3 text-slate-600" />
      )}
      
      {command.keybinding && (
        <kbd className="flex-shrink-0 px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-400">
          {command.keybinding}
        </kbd>
      )}
    </button>
  )
}

// ============= Hook for opening palette =============

export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  
  // Global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault()
        setIsOpen(true)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'p' && !e.shiftKey) {
        e.preventDefault()
        setIsOpen(true)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
  
  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  }
}
