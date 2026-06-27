'use client'

import type { ReactNode } from 'react'
import type { CodiconName } from './Codicon'

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

export interface CommandPaletteContextType {
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

export interface CommandPaletteProviderProps {
  children: ReactNode
  onOpenFile?: (path: string) => void
  onOpenFileDialog?: () => void
  onSaveFile?: () => void
  onSaveAll?: () => void
  onUndo?: () => void
  onRedo?: () => void
  onFind?: () => void
  onReplace?: () => void
  onNewFile?: () => void
  onNewFolder?: () => void
  onSwitchProject?: () => void
  onToggleSidebar?: () => void
  onToggleTerminal?: () => void
  onAIChat?: () => void
  onOpenSettings?: () => void
  files?: FileItem[]
}

export const CATEGORY_ICONS: Record<CommandCategory, CodiconName> = {
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

export const CATEGORY_LABELS: Record<CommandCategory, string> = {
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


export function createDefaultCommands(handlers: {
  openFile?: () => void
  saveFile?: () => void
  saveAll?: () => void
  newFile?: () => void
  newFolder?: () => void
  switchProject?: () => void
  undo?: () => void
  redo?: () => void
  find?: () => void
  replace?: () => void
  toggleSidebar?: () => void
  toggleTerminal?: () => void
  aiChat?: () => void
  openSettings?: () => void
}): CommandItem[] {
  return [
    {
      id: 'file.open',
      label: 'Open file',
      description: 'Open a workspace file',
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
      label: 'Save all',
      description: 'Save all changed files',
      category: 'file',
      shortcut: 'Ctrl+Shift+S',
      action: handlers.saveAll || (() => {}),
      when: () => typeof handlers.saveAll === 'function',
      keywords: ['save', 'all'],
    },
    {
      id: 'file.newFile',
      label: 'New file',
      description: 'Create a new file',
      category: 'file',
      icon: 'new-file',
      shortcut: 'Ctrl+N',
      action: handlers.newFile || (() => {}),
      keywords: ['new', 'file'],
    },
    {
      id: 'file.newFolder',
      label: 'New folder',
      description: 'Create a new folder',
      category: 'file',
      icon: 'new-folder',
      action: handlers.newFolder || (() => {}),
      keywords: ['new', 'folder'],
    },
    {
      id: 'edit.undo',
      label: 'Undo',
      description: 'Undo the last action',
      category: 'edit',
      shortcut: 'Ctrl+Z',
      action: handlers.undo || (() => {}),
      when: () => typeof handlers.undo === 'function',
      keywords: ['undo'],
    },
    {
      id: 'edit.redo',
      label: 'Redo',
      description: 'Redo the undone action',
      category: 'edit',
      shortcut: 'Ctrl+Y',
      action: handlers.redo || (() => {}),
      when: () => typeof handlers.redo === 'function',
      keywords: ['redo'],
    },
    {
      id: 'edit.find',
      label: 'Search',
      description: 'Search in file',
      category: 'edit',
      shortcut: 'Ctrl+F',
      action: handlers.find || (() => {}),
      when: () => typeof handlers.find === 'function',
      keywords: ['find', 'search'],
    },
    {
      id: 'edit.replace',
      label: 'Replace',
      description: 'Search and replace',
      category: 'edit',
      shortcut: 'Ctrl+H',
      action: handlers.replace || (() => {}),
      when: () => typeof handlers.replace === 'function',
      keywords: ['replace'],
    },
    {
      id: 'view.toggleSidebar',
      label: 'Toggle sidebar',
      description: 'Show or hide the left sidebar',
      category: 'view',
      shortcut: 'Ctrl+B',
      action: handlers.toggleSidebar || (() => {}),
      keywords: ['sidebar', 'panel'],
    },
    {
      id: 'view.toggleTerminal',
      label: 'Toggle terminal',
      description: 'Show or hide the bottom terminal',
      category: 'view',
      shortcut: 'Ctrl+`',
      action: handlers.toggleTerminal || (() => {}),
      keywords: ['terminal', 'panel'],
    },
    {
      id: 'ai.chat',
      label: 'Open agents panel',
      description: 'Open the agents panel in the IDE workbench',
      category: 'ai',
      shortcut: 'Ctrl+I',
      action: handlers.aiChat || (() => {}),
      keywords: ['ai', 'assistant', 'chat'],
    },
    {
      id: 'settings.open',
      label: 'Open settings',
      description: 'Open IDE settings',
      category: 'settings',
      shortcut: 'Ctrl+,',
      action: handlers.openSettings || (() => {}),
      keywords: ['settings', 'preferences'],
    },
    {
      id: 'project.switch',
      label: 'Switch project context',
      description: 'Change the active projectId for file scope and preview',
      category: 'settings',
      shortcut: 'Ctrl+Alt+P',
      action: handlers.switchProject || (() => {}),
      when: () => typeof handlers.switchProject === 'function',
      keywords: ['project', 'context', 'scope'],
    },
  ]
}

export function fuzzyMatch(pattern: string, text: string): { match: boolean; score: number; indices: number[] } {
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

export function highlightMatches(text: string, indices: number[]): ReactNode {
  if (!indices.length) return text
  const nodes: ReactNode[] = []
  let last = 0
  indices.forEach((index, i) => {
    if (index > last) nodes.push(text.slice(last, index))
    nodes.push(
      <mark
        key={`match-${i}`}
        className="rounded-sm bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] px-px font-semibold text-[var(--aethel-info-light)] not-italic"
        style={{ textShadow: '0 0 8px rgba(56,189,248,0.45)' }}
      >
        {text[index]}
      </mark>
    )
    last = index + 1
  })
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}
