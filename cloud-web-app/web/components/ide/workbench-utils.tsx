'use client'

import type { FileItem as PaletteFileItem } from '@/components/ide/CommandPalette'

export type FileNode = {
  id: string
  name: string
  type: 'file' | 'folder'
  path: string
  children?: FileNode[]
  modified?: boolean
  extension?: string
}

export type FileTreeEntry = {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileTreeEntry[]
}

export type FileState = {
  content: string
  savedContent: string
  language?: string
  lastSavedAt?: Date | null
}

const LANGUAGE_BY_EXT: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescriptreact',
  js: 'javascript',
  jsx: 'javascriptreact',
  json: 'json',
  md: 'markdown',
  css: 'css',
  scss: 'scss',
  html: 'html',
  htm: 'html',
  py: 'python',
  rs: 'rust',
  go: 'go',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  txt: 'plaintext',
}

export const WORKBENCH_PROJECT_STORAGE_KEY = 'aethel.workbench.lastProjectId'

export function getExtension(name: string): string {
  const idx = name.lastIndexOf('.')
  return idx === -1 ? '' : name.slice(idx + 1).toLowerCase()
}

export function guessLanguage(path: string): string {
  const ext = getExtension(path)
  return LANGUAGE_BY_EXT[ext] || 'plaintext'
}

export function mapTreeEntry(entry: FileTreeEntry): FileNode {
  const extension = entry.type === 'file' ? getExtension(entry.name) : undefined
  return {
    id: entry.path,
    name: entry.name,
    type: entry.type === 'directory' ? 'folder' : 'file',
    path: entry.path,
    extension,
    children: entry.children?.map(mapTreeEntry),
  }
}

export function joinPath(base: string, name: string): string {
  const trimmedBase = base.replace(/[\\/]+$/, '')
  const trimmedName = name.replace(/^[\\/]+/, '')
  if (!trimmedBase || trimmedBase === '/') return `/${trimmedName}`
  return `${trimmedBase}/${trimmedName}`
}

export function dirname(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/')
  const idx = normalized.lastIndexOf('/')
  if (idx <= 0) return '/'
  return normalized.slice(0, idx)
}

export function isPathWithin(basePath: string, candidatePath: string): boolean {
  const base = basePath.replace(/\\/g, '/')
  const candidate = candidatePath.replace(/\\/g, '/')
  if (candidate === base) return true
  const prefix = base.endsWith('/') ? base : `${base}/`
  return candidate.startsWith(prefix)
}

export function normalizeWorkspaceRoot(input: string): string {
  const next = input.trim()
  if (!next || next === '/workspace') return '/'
  return next
}

export function sanitizeProjectId(value: string | null | undefined): string {
  const raw = String(value || '').trim()
  if (!raw) return 'default'
  const sanitized = raw.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
  return sanitized || 'default'
}

export function flattenFiles(nodes: FileNode[]): PaletteFileItem[] {
  const result: PaletteFileItem[] = []

  const visit = (node: FileNode) => {
    result.push({
      path: node.path,
      name: node.name,
      type: node.type === 'folder' ? 'folder' : 'file',
      modified: !!node.modified,
    })
    node.children?.forEach(visit)
  }

  nodes.forEach(visit)
  return result
}

export function TerminalSkeleton() {
  return (
    <div className="h-full bg-slate-950 p-4">
      <div className="flex items-center gap-2 text-slate-600">
        <div className="w-2 h-4 bg-slate-700 animate-pulse" />
        <span>Loading terminal...</span>
      </div>
    </div>
  )
}

export function EmptyEditorState({
  onOpenFile,
  onNewFile,
  onOpenStudioHome,
}: {
  onOpenFile?: () => void
  onNewFile?: () => void
  onOpenStudioHome?: () => void
}) {
  return (
    <div className="h-full flex items-center justify-center px-8 text-center">
      <div className="max-w-md">
        <div className="text-sm font-medium text-slate-300 mb-2">No file selected</div>
        <div className="text-xs text-slate-500">
          Open a file from Explorer or use <span className="font-mono text-slate-400">Ctrl+O</span> to load a path.
        </div>
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={onOpenFile}
            className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            Open File
          </button>
          <button
            type="button"
            onClick={onNewFile}
            className="rounded border border-sky-500/40 bg-sky-500/20 px-3 py-1.5 text-xs font-semibold text-sky-100 hover:bg-sky-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            New File
          </button>
          {onOpenStudioHome && (
            <button
              type="button"
              onClick={onOpenStudioHome}
              className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
            >
              Studio Home
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
