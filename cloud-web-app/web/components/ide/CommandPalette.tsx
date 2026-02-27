'use client'

import {
  createContext,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import Codicon, { type CodiconName } from './Codicon'

export type CommandCategory =
  | 'file'
  | 'edit'
  | 'view'
  | 'go'
  | 'run'
  | 'terminal'
  | 'git'
  | 'ai'
  | 'settings'
  | 'debug'
  | 'extension'

export type PaletteMode = 'commands' | 'files' | 'symbols' | 'lines'

export interface CommandItem {
  id: string
  label: string
  description?: string
  category: CommandCategory
  icon?: CodiconName
  shortcut?: string
  action: () => void | Promise<void>
  when?: () => boolean
  keywords?: string[]
}

export interface FileItem {
  path: string
  name: string
  type: 'file' | 'folder'
  modified?: boolean
  gitStatus?: 'M' | 'A' | 'D' | 'U' | 'C' | 'R'
}

interface CommandPaletteContextType {
  isOpen: boolean
  mode: PaletteMode
  open: (mode?: PaletteMode) => void
  close: () => void
  toggle: (mode?: PaletteMode) => void
  registerCommand: (command: CommandItem) => void
  unregisterCommand: (id: string) => void
  executeCommand: (id: string) => Promise<void>
  commands: CommandItem[]
}

const CATEGORY_ICONS: Record<CommandCategory, CodiconName> = {
  file: 'symbol-file',
  edit: 'edit',
  view: 'layout-panel',
  go: 'chevron-right',
  run: 'rocket',
  terminal: 'terminal',
  git: 'git-branch',
  ai: 'sparkle',
  settings: 'gear',
  debug: 'debug',
  extension: 'extensions',
}

const CATEGORY_LABELS: Record<CommandCategory, string> = {
  file: 'File',
  edit: 'Edit',
  view: 'View',
  go: 'Go',
  run: 'Run',
  terminal: 'Terminal',
  git: 'Git',
  ai: 'AI',
  settings: 'Settings',
  debug: 'Debug',
  extension: 'Extensions',
}

const CommandPaletteContext = createContext<CommandPaletteContextType | null>(null)

export function useCommandPalette() {
  const context = useContext(CommandPaletteContext)
  if (!context) {
    throw new Error('useCommandPalette must be used within CommandPaletteProvider')
  }
  return context
}

function createDefaultCommands(handlers: {
  openFile?: () => void
  saveFile?: () => void
  saveAll?: () => void
  newFile?: () => void
  newFolder?: () => void
  switchProject?: () => void
  toggleSidebar?: () => void
  toggleTerminal?: () => void
  aiChat?: () => void
  rollbackLastAIPatch?: () => void
  openSettings?: () => void
}): CommandItem[] {
  return [
    {
      id: 'file.open',
      label: 'Open File',
      description: 'Open a file from the workspace',
      category: 'file',
      icon: 'folder-opened',
      shortcut: 'Ctrl+O',
      action: handlers.openFile || (() => {}),
      keywords: ['open', 'file'],
    },
    {
      id: 'file.save',
      label: 'Save',
      description: 'Save current file',
      category: 'file',
      shortcut: 'Ctrl+S',
      action: handlers.saveFile || (() => {}),
      keywords: ['save'],
    },
    {
      id: 'file.saveAll',
      label: 'Save All',
      description: 'Save all changed files',
      category: 'file',
      shortcut: 'Ctrl+Shift+S',
      action: handlers.saveAll || (() => {}),
      keywords: ['save', 'all'],
    },
    {
      id: 'file.newFile',
      label: 'New File',
      description: 'Create a new file',
      category: 'file',
      icon: 'new-file',
      shortcut: 'Ctrl+N',
      action: handlers.newFile || (() => {}),
      keywords: ['new', 'file'],
    },
    {
      id: 'file.newFolder',
      label: 'New Folder',
      description: 'Create a new folder',
      category: 'file',
      icon: 'new-folder',
      action: handlers.newFolder || (() => {}),
      keywords: ['new', 'folder'],
    },
    {
      id: 'view.toggleSidebar',
      label: 'Toggle Sidebar',
      description: 'Show or hide the left sidebar',
      category: 'view',
      shortcut: 'Ctrl+B',
      action: handlers.toggleSidebar || (() => {}),
      keywords: ['sidebar', 'panel'],
    },
    {
      id: 'view.toggleTerminal',
      label: 'Toggle Terminal',
      description: 'Show or hide the bottom terminal panel',
      category: 'view',
      shortcut: 'Ctrl+J',
      action: handlers.toggleTerminal || (() => {}),
      keywords: ['terminal', 'panel'],
    },
    {
      id: 'ai.chat',
      label: 'Open AI Panel',
      description: 'Open AI panel on the right side',
      category: 'ai',
      shortcut: 'Ctrl+I',
      action: handlers.aiChat || (() => {}),
      keywords: ['ai', 'assistant', 'chat'],
    },
    {
      id: 'ai.rollbackLastPatch',
      label: 'Rollback Last AI Patch',
      description: 'Revert the most recent server-applied AI inline patch',
      category: 'ai',
      icon: 'refresh',
      shortcut: 'Ctrl+Alt+Z',
      action: handlers.rollbackLastAIPatch || (() => {}),
      when: () => typeof handlers.rollbackLastAIPatch === 'function',
      keywords: ['ai', 'rollback', 'revert', 'patch'],
    },
    {
      id: 'settings.open',
      label: 'Open Settings',
      description: 'Open IDE settings',
      category: 'settings',
      shortcut: 'Ctrl+,',
      action: handlers.openSettings || (() => {}),
      keywords: ['settings', 'preferences'],
    },
    {
      id: 'project.switch',
      label: 'Switch Project Context',
      description: 'Change active projectId for file and preview scope',
      category: 'settings',
      shortcut: 'Ctrl+Alt+P',
      action: handlers.switchProject || (() => {}),
      when: () => typeof handlers.switchProject === 'function',
      keywords: ['project', 'context', 'scope'],
    },
  ]
}

function fuzzyMatch(pattern: string, text: string): { match: boolean; score: number; indices: number[] } {
  const patternLower = pattern.toLowerCase()
  const textLower = text.toLowerCase()

  if (!patternLower.length) return { match: true, score: 0, indices: [] }
  if (patternLower.length > textLower.length) return { match: false, score: 0, indices: [] }

  const indices: number[] = []
  let p = 0
  let score = 0
  let consecutive = 0

  for (let i = 0; i < textLower.length && p < patternLower.length; i++) {
    if (textLower[i] !== patternLower[p]) continue
    indices.push(i)
    if (i === 0) score += 10
    if (i > 0 && /[^a-zA-Z0-9]/.test(text[i - 1])) score += 5
    if (indices.length > 1 && indices[indices.length - 2] === i - 1) {
      consecutive += 3
    } else {
      consecutive = 0
    }
    score += consecutive
    p++
  }

  const match = p === patternLower.length
  if (match) score -= (textLower.length - patternLower.length) * 0.5
  return { match, score, indices }
}

function highlightMatches(text: string, indices: number[]): ReactNode {
  if (!indices.length) return text
  const nodes: ReactNode[] = []
  let last = 0
  indices.forEach((index, i) => {
    if (index > last) nodes.push(text.slice(last, index))
    nodes.push(
      <span key={`match-${i}`} className="text-blue-300 font-semibold">
        {text[index]}
      </span>
    )
    last = index + 1
  })
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

export function CommandPaletteProvider({
  children,
  onOpenFile,
  onOpenFileDialog,
  onSaveFile,
  onSaveAll,
  onNewFile,
  onNewFolder,
  onSwitchProject,
  onToggleSidebar,
  onToggleTerminal,
  onAIChat,
  onRollbackLastAIPatch,
  onOpenSettings,
  files = [],
}: {
  children: ReactNode
  onOpenFile?: (path: string) => void
  onOpenFileDialog?: () => void
  onSaveFile?: () => void
  onSaveAll?: () => void
  onNewFile?: () => void
  onNewFolder?: () => void
  onSwitchProject?: () => void
  onToggleSidebar?: () => void
  onToggleTerminal?: () => void
  onAIChat?: () => void
  onRollbackLastAIPatch?: () => void
  onOpenSettings?: () => void
  files?: FileItem[]
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<PaletteMode>('commands')
  const [commands, setCommands] = useState<CommandItem[]>(() =>
    createDefaultCommands({
      openFile: onOpenFileDialog,
      saveFile: onSaveFile,
      saveAll: onSaveAll,
      newFile: onNewFile,
      newFolder: onNewFolder,
      switchProject: onSwitchProject,
      toggleSidebar: onToggleSidebar,
      toggleTerminal: onToggleTerminal,
      aiChat: onAIChat,
      rollbackLastAIPatch: onRollbackLastAIPatch,
      openSettings: onOpenSettings,
    })
  )

  useEffect(() => {
    setCommands(
      createDefaultCommands({
        openFile: onOpenFileDialog,
        saveFile: onSaveFile,
        saveAll: onSaveAll,
        newFile: onNewFile,
        newFolder: onNewFolder,
        switchProject: onSwitchProject,
        toggleSidebar: onToggleSidebar,
        toggleTerminal: onToggleTerminal,
        aiChat: onAIChat,
        rollbackLastAIPatch: onRollbackLastAIPatch,
        openSettings: onOpenSettings,
      })
    )
  }, [
    onOpenFileDialog,
    onSaveFile,
    onSaveAll,
    onNewFile,
    onNewFolder,
    onSwitchProject,
    onToggleSidebar,
    onToggleTerminal,
    onAIChat,
    onRollbackLastAIPatch,
    onOpenSettings,
  ])

  const open = useCallback((nextMode: PaletteMode = 'commands') => {
    setMode(nextMode)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => setIsOpen(false), [])

  const toggle = useCallback(
    (nextMode: PaletteMode = 'commands') => {
      if (isOpen && mode === nextMode) {
        setIsOpen(false)
        return
      }
      setMode(nextMode)
      setIsOpen(true)
    },
    [isOpen, mode]
  )

  const registerCommand = useCallback((command: CommandItem) => {
    setCommands((prev) => {
      const existing = prev.findIndex((item) => item.id === command.id)
      if (existing >= 0) {
        const next = [...prev]
        next[existing] = command
        return next
      }
      return [...prev, command]
    })
  }, [])

  const unregisterCommand = useCallback((id: string) => {
    setCommands((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const executeCommand = useCallback(
    async (id: string) => {
      const command = commands.find((item) => item.id === id)
      if (!command) return
      if (command.when && !command.when()) return
      await command.action()
    },
    [commands]
  )

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      const accel = event.ctrlKey || event.metaKey
      if (accel && event.shiftKey && event.key.toLowerCase() === 'p') {
        event.preventDefault()
        toggle('commands')
        return
      }
      if (accel && !event.shiftKey && event.key.toLowerCase() === 'p') {
        event.preventDefault()
        toggle('files')
        return
      }
      if (accel && event.shiftKey && event.key.toLowerCase() === 'o') {
        event.preventDefault()
        toggle('symbols')
        return
      }
      if (accel && !event.shiftKey && event.key.toLowerCase() === 'g') {
        event.preventDefault()
        toggle('lines')
        return
      }
      if (event.key === 'Escape' && isOpen) {
        event.preventDefault()
        close()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggle, close, isOpen])

  useEffect(() => {
    const onOpen = (event: Event) => {
      const custom = event as CustomEvent<{ mode?: PaletteMode }>
      open(custom.detail?.mode || 'commands')
    }
    window.addEventListener('aethel.commandPalette.open', onOpen as EventListener)
    return () => window.removeEventListener('aethel.commandPalette.open', onOpen as EventListener)
  }, [open])

  const value: CommandPaletteContextType = {
    isOpen,
    mode,
    open,
    close,
    toggle,
    registerCommand,
    unregisterCommand,
    executeCommand,
    commands,
  }

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <CommandPaletteUI files={files} onOpenFile={onOpenFile} />
    </CommandPaletteContext.Provider>
  )
}

function CommandPaletteUI({
  files = [],
  onOpenFile,
}: {
  files?: FileItem[]
  onOpenFile?: (path: string) => void
}) {
  const { isOpen, mode, close, commands, executeCommand } = useCommandPalette()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    setQuery('')
    setSelectedIndex(0)
    window.setTimeout(() => inputRef.current?.focus(), 10)
  }, [isOpen, mode])

  const filteredItems = useMemo(() => {
    if (mode === 'commands') {
      return commands
        .filter((command) => !command.when || command.when())
        .map((command) => {
          const labelMatch = fuzzyMatch(query, command.label)
          const descriptionMatch = command.description
            ? fuzzyMatch(query, command.description)
            : { match: false, score: 0, indices: [] }
          const keywordMatch = (command.keywords || []).some((keyword) => fuzzyMatch(query, keyword).match)
          return {
            ...command,
            labelMatch,
            descriptionMatch,
            match: labelMatch.match || descriptionMatch.match || keywordMatch,
            score: Math.max(labelMatch.score, descriptionMatch.score * 0.75),
          }
        })
        .filter((item) => item.match)
        .sort((a, b) => b.score - a.score)
    }
    if (mode === 'files') {
      return files
        .map((file) => {
          const nameMatch = fuzzyMatch(query, file.name)
          const pathMatch = fuzzyMatch(query, file.path)
          return {
            ...file,
            nameMatch,
            pathMatch,
            match: nameMatch.match || pathMatch.match,
            score: Math.max(nameMatch.score * 1.5, pathMatch.score),
          }
        })
        .filter((item) => item.match)
        .sort((a, b) => b.score - a.score)
        .slice(0, 80)
    }
    return []
  }, [mode, commands, files, query])

  useEffect(() => {
    setSelectedIndex((prev) => Math.min(prev, Math.max(filteredItems.length - 1, 0)))
  }, [filteredItems.length])

  useEffect(() => {
    const selected = listRef.current?.children[selectedIndex] as HTMLElement | undefined
    selected?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  const handleSelect = useCallback(
    async (index: number) => {
      const item = filteredItems[index]
      if (!item) return
      close()
      if (mode === 'commands' && 'action' in item) {
        await executeCommand(item.id)
      } else if (mode === 'files' && 'path' in item) {
        onOpenFile?.(item.path)
      }
    },
    [filteredItems, close, mode, executeCommand, onOpenFile]
  )

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, filteredItems.length - 1))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      handleSelect(selectedIndex)
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
    }
  }

  if (!isOpen) return null

  const modeConfig: Record<PaletteMode, { placeholder: string; prefix: string }> = {
    commands: { placeholder: 'Type a command...', prefix: '>' },
    files: { placeholder: 'Search files...', prefix: '' },
    symbols: { placeholder: 'Go to symbol...', prefix: '@' },
    lines: { placeholder: 'Go to line...', prefix: ':' },
  }

  const currentMode = modeConfig[mode]

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px]" onClick={close} />
      <div
        className="fixed left-1/2 top-[12%] z-50 w-[680px] max-w-[94vw] -translate-x-1/2"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="overflow-hidden rounded-lg border border-slate-700/80 bg-[#0f131b] shadow-2xl">
          <div className="flex items-center gap-2 border-b border-slate-700/70 px-3 py-2.5">
            {currentMode.prefix && <span className="font-mono text-xs text-cyan-300">{currentMode.prefix}</span>}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={currentMode.placeholder}
              className="flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
              autoComplete="off"
              spellCheck={false}
              aria-label="Command palette input"
            />
            <div className="hidden items-center gap-2 text-[10px] text-slate-500 md:flex">
              <kbd className="rounded bg-slate-800 px-1.5 py-0.5">Up/Down</kbd>
              <span>Navigate</span>
              <kbd className="rounded bg-slate-800 px-1.5 py-0.5">Enter</kbd>
              <span>Select</span>
              <kbd className="rounded bg-slate-800 px-1.5 py-0.5">Esc</kbd>
              <span>Close</span>
            </div>
          </div>

          <div ref={listRef} className="max-h-[420px] overflow-y-auto" role="listbox" aria-label="Command palette results">
            {!filteredItems.length && (
              <div className="px-4 py-8 text-center text-xs text-slate-500">No results found</div>
            )}

            {filteredItems.map((item, index) => {
              if (mode === 'commands' && 'action' in item) {
                const icon = item.icon || CATEGORY_ICONS[item.category]
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(index)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    role="option"
                    aria-selected={index === selectedIndex}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                      index === selectedIndex ? 'bg-blue-500/20' : 'hover:bg-slate-800/70'
                    }`}
                  >
                    <Codicon name={icon} className="text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs text-slate-100">{highlightMatches(item.label, item.labelMatch.indices)}</div>
                      {item.description && <div className="truncate text-[11px] text-slate-500">{item.description}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500">{CATEGORY_LABELS[item.category]}</span>
                      {item.shortcut && <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">{item.shortcut}</kbd>}
                    </div>
                  </button>
                )
              }

              if (mode === 'files' && 'path' in item) {
                const icon = item.type === 'folder' ? 'folder' : 'symbol-file'
                return (
                  <button
                    key={item.path}
                    onClick={() => handleSelect(index)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    role="option"
                    aria-selected={index === selectedIndex}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                      index === selectedIndex ? 'bg-blue-500/20' : 'hover:bg-slate-800/70'
                    }`}
                  >
                    <Codicon name={icon} className="text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs text-slate-100">{highlightMatches(item.name, item.nameMatch.indices)}</div>
                      <div className="truncate text-[11px] text-slate-500">{item.path}</div>
                    </div>
                    {item.modified && <span className="text-xs text-amber-400">M</span>}
                    {item.gitStatus && <span className="text-xs text-slate-500">{item.gitStatus}</span>}
                  </button>
                )
              }

              return null
            })}
          </div>

          <div className="flex items-center justify-between border-t border-slate-700/70 px-3 py-1.5 text-[10px] text-slate-500">
            <div className="flex items-center gap-3">
              <span>
                <kbd className="rounded bg-slate-800 px-1 py-0.5">Ctrl+Shift+P</kbd> Commands
              </span>
              <span>
                <kbd className="rounded bg-slate-800 px-1 py-0.5">Ctrl+P</kbd> Files
              </span>
            </div>
            <span>{filteredItems.length} results</span>
          </div>
        </div>
      </div>
    </>
  )
}

export function useRegisterCommand(command: CommandItem, deps: unknown[] = []) {
  const { registerCommand, unregisterCommand } = useCommandPalette()

  useEffect(() => {
    registerCommand(command)
    return () => unregisterCommand(command.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerCommand, unregisterCommand, command.id, ...deps])
}

export default CommandPaletteProvider
