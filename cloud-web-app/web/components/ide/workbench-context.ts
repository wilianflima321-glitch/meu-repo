'use client'

export type WorkbenchEntry =
  | 'explorer'
  | 'search'
  | 'git'
  | 'ai'
  | 'terminal'
  | 'output'
  | 'problems'
  | 'debug'
  | 'ports'
  | 'chat'
  | 'debugger'
  | 'live-preview'
  | 'vr-preview'
  | 'testing'
  | 'niagara-editor'
  | 'blueprint-editor'
  | 'animation-blueprint'
  | 'level-editor'
  | 'landscape-editor'
  | 'editor-hub'
  | 'ai-command'
  | 'playground'

export const ENTRY_SIDEBAR_MAP: Partial<Record<WorkbenchEntry, 'explorer' | 'search' | 'git' | 'ai'>> = {
  explorer: 'explorer',
  search: 'search',
  git: 'git',
  ai: 'ai',
  chat: 'ai',
  'ai-command': 'ai',
  'live-preview': 'explorer',
  'vr-preview': 'explorer',
  testing: 'explorer',
  'niagara-editor': 'explorer',
  'blueprint-editor': 'explorer',
  'animation-blueprint': 'explorer',
  'level-editor': 'explorer',
  'landscape-editor': 'explorer',
  'editor-hub': 'explorer',
  playground: 'explorer',
}

export const ENTRY_BOTTOM_MAP: Partial<
  Record<WorkbenchEntry, 'terminal' | 'output' | 'problems' | 'debug' | 'ports'>
> = {
  terminal: 'terminal',
  debugger: 'debug',
  testing: 'problems',
}

export function buildContextBannerMessage({
  entry,
  sessionId,
  taskId,
}: {
  entry: WorkbenchEntry | null
  sessionId: string | null
  taskId: string | null
}): string | null {
  const parts: string[] = []
  if (entry) parts.push(`entry: ${entry}`)
  if (sessionId) parts.push(`studio session: ${sessionId.slice(0, 8)}`)
  if (taskId) parts.push(`task: ${taskId.slice(0, 8)}`)
  return parts.length > 0 ? parts.join(' | ') : null
}

