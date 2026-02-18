'use client'

import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import IDELayout from '@/components/ide/IDELayout'
import FileExplorerPro from '@/components/ide/FileExplorerPro'
import PreviewPanel from '@/components/ide/PreviewPanel'
import AIChatPanelContainer from '@/components/ide/AIChatPanelContainer'
import TabBar, { TabProvider, useTabBar } from '@/components/editor/TabBar'
import MonacoEditorPro from '@/components/editor/MonacoEditorPro'
import CommandPaletteProvider, { type FileItem as PaletteFileItem } from '@/components/ide/CommandPalette'

const MultiTerminalPanel = dynamic(
  () => import('@/components/terminal/XTerminal').then((mod) => ({ default: mod.MultiTerminalPanel })),
  {
    ssr: false,
    loading: () => <TerminalSkeleton />,
  }
)

type FileNode = {
  id: string
  name: string
  type: 'file' | 'folder'
  path: string
  children?: FileNode[]
  modified?: boolean
  extension?: string
}

type FileTreeEntry = {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileTreeEntry[]
}

type FileState = {
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

function getExtension(name: string): string {
  const idx = name.lastIndexOf('.')
  return idx === -1 ? '' : name.slice(idx + 1).toLowerCase()
}

function guessLanguage(path: string): string {
  const ext = getExtension(path)
  return LANGUAGE_BY_EXT[ext] || 'plaintext'
}

function mapTreeEntry(entry: FileTreeEntry): FileNode {
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

function joinPath(base: string, name: string): string {
  const trimmedBase = base.replace(/[\\/]+$/, '')
  const trimmedName = name.replace(/^[\\/]+/, '')
  if (!trimmedBase || trimmedBase === '/') return `/${trimmedName}`
  return `${trimmedBase}/${trimmedName}`
}

function dirname(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/')
  const idx = normalized.lastIndexOf('/')
  if (idx <= 0) return '/'
  return normalized.slice(0, idx)
}

function isPathWithin(basePath: string, candidatePath: string): boolean {
  const base = basePath.replace(/\\/g, '/')
  const candidate = candidatePath.replace(/\\/g, '/')
  if (candidate === base) return true
  const prefix = base.endsWith('/') ? base : `${base}/`
  return candidate.startsWith(prefix)
}

function normalizeWorkspaceRoot(input: string): string {
  const next = input.trim()
  if (!next || next === '/workspace') return '/'
  return next
}

const WORKBENCH_PROJECT_STORAGE_KEY = 'aethel.workbench.lastProjectId'

function sanitizeProjectId(value: string | null | undefined): string {
  const raw = String(value || '').trim()
  if (!raw) return 'default'
  const sanitized = raw.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
  return sanitized || 'default'
}

type WorkbenchEntry =
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

const ENTRY_SIDEBAR_MAP: Partial<Record<WorkbenchEntry, 'explorer' | 'search' | 'git' | 'ai'>> = {
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

const ENTRY_BOTTOM_MAP: Partial<Record<WorkbenchEntry, 'terminal' | 'output' | 'problems' | 'debug' | 'ports'>> = {
  terminal: 'terminal',
  debugger: 'debug',
  testing: 'problems',
}

function flattenFiles(nodes: FileNode[]): PaletteFileItem[] {
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

function TerminalSkeleton() {
  return (
    <div className="h-full bg-slate-950 p-4">
      <div className="flex items-center gap-2 text-slate-600">
        <div className="w-2 h-4 bg-slate-700 animate-pulse" />
        <span>Loading terminal...</span>
      </div>
    </div>
  )
}

function EmptyEditorState() {
  return (
    <div className="h-full flex items-center justify-center px-8 text-center">
      <div>
        <div className="text-sm font-medium text-slate-300 mb-2">No file selected</div>
        <div className="text-xs text-slate-500">
          Open a file from Explorer or use <span className="font-mono text-slate-400">Ctrl+O</span> to load a path.
        </div>
      </div>
    </div>
  )
}

function useStatusMessage() {
  const [message, setMessage] = useState<string | null>(null)
  const timeoutRef = useRef<number | null>(null)

  const pushMessage = useCallback((next: string) => {
    setMessage(next)
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    timeoutRef.current = window.setTimeout(() => setMessage(null), 3000)
  }, [])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    }
  }, [])

  return { message, pushMessage }
}

type PromptOptions = {
  title: string
  placeholder?: string
  defaultValue?: string
}

type PromptState = PromptOptions & {
  open: boolean
}

function usePromptDialog() {
  const resolverRef = useRef<((value: string | null) => void) | null>(null)
  const [state, setState] = useState<PromptState>({
    open: false,
    title: '',
    placeholder: '',
    defaultValue: '',
  })
  const [value, setValue] = useState('')

  const openPrompt = useCallback((options: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      resolverRef.current = resolve
      setValue(options.defaultValue || '')
      setState({
        open: true,
        title: options.title,
        placeholder: options.placeholder,
        defaultValue: options.defaultValue,
      })
    })
  }, [])

  const closePrompt = useCallback((nextValue: string | null) => {
    const resolver = resolverRef.current
    resolverRef.current = null
    setState((prev) => ({ ...prev, open: false }))
    resolver?.(nextValue)
  }, [])

  return { state, value, setValue, openPrompt, closePrompt }
}

type ConfirmState = {
  open: boolean
  message: string
}

function useConfirmDialog() {
  const resolverRef = useRef<((value: boolean) => void) | null>(null)
  const [state, setState] = useState<ConfirmState>({
    open: false,
    message: '',
  })

  const openConfirm = useCallback((message: string) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
      setState({ open: true, message })
    })
  }, [])

  const closeConfirm = useCallback((accepted: boolean) => {
    const resolver = resolverRef.current
    resolverRef.current = null
    setState({ open: false, message: '' })
    resolver?.(accepted)
  }, [])

  return { state, openConfirm, closeConfirm }
}

function PromptDialog({
  title,
  placeholder,
  value,
  open,
  onChange,
  onCancel,
  onConfirm,
}: {
  title: string
  placeholder?: string
  value: string
  open: boolean
  onChange: (next: string) => void
  onCancel: () => void
  onConfirm: () => void
}) {
  if (!open) return null

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/45">
      <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-2xl">
        <div className="text-sm font-semibold text-slate-100">{title}</div>
        <input
          autoFocus
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onConfirm()
            if (event.key === 'Escape') onCancel()
          }}
          className="mt-3 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500"
        />
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 focus-visible:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded border border-blue-500/50 bg-blue-600/30 px-3 py-1.5 text-xs text-blue-100 hover:bg-blue-600/40 focus-visible:bg-blue-600/40"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

function ConfirmDialog({
  open,
  message,
  onCancel,
  onConfirm,
}: {
  open: boolean
  message: string
  onCancel: () => void
  onConfirm: () => void
}) {
  if (!open) return null

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/45">
      <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-2xl">
        <div className="text-sm font-semibold text-slate-100">Confirm action</div>
        <div className="mt-2 text-xs leading-5 text-slate-300">{message}</div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 focus-visible:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded border border-red-500/50 bg-red-600/30 px-3 py-1.5 text-xs text-red-100 hover:bg-red-600/40 focus-visible:bg-red-600/40"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

async function fsRequest(payload: Record<string, unknown>, projectId: string) {
  const requestPayload = {
    ...payload,
    projectId,
  }
  const res = await fetch('/api/files/fs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-project-id': projectId,
    },
    body: JSON.stringify(requestPayload),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Request failed with ${res.status}`)
  }
  return res.json()
}

function IDEPageInner() {
  const searchParams = useSearchParams()
  const queryProjectId = searchParams.get('projectId')
  const { tabs, activeTabId, openTab, closeTab, markTabDirty } = useTabBar()
  const [fileTree, setFileTree] = useState<FileNode[]>([])
  const [treeError, setTreeError] = useState<string | null>(null)
  const [treeLoading, setTreeLoading] = useState(false)
  const [workspaceRoot, setWorkspaceRoot] = useState('/')
  const [projectId, setProjectId] = useState(() => sanitizeProjectId(queryProjectId))
  const [fileStates, setFileStates] = useState<Record<string, FileState>>({})
  const [previewKey, setPreviewKey] = useState(0)
  const { message: statusMessage, pushMessage } = useStatusMessage()
  const promptDialog = usePromptDialog()
  const confirmDialog = useConfirmDialog()
  const startupFilePath = searchParams.get('file')?.trim() || null
  const startupEntry = (searchParams.get('entry')?.trim().toLowerCase() || null) as WorkbenchEntry | null
  const startupSessionId = searchParams.get('sessionId')?.trim() || null
  const startupTaskId = searchParams.get('taskId')?.trim() || null
  const startupFileHandledRef = useRef(false)
  const startupEntryHandledRef = useRef(false)
  const startupSessionHandledRef = useRef(false)

  const activeTab = tabs.find((tab) => tab.id === activeTabId) || null
  const activePath = activeTab?.path || null
  const activeState = activePath ? fileStates[activePath] : null

  useEffect(() => {
    if (queryProjectId && queryProjectId.trim()) {
      const normalized = sanitizeProjectId(queryProjectId)
      setProjectId(normalized)
      try {
        localStorage.setItem(WORKBENCH_PROJECT_STORAGE_KEY, normalized)
      } catch {
        // ignore storage errors
      }
      return
    }

    try {
      const stored = localStorage.getItem(WORKBENCH_PROJECT_STORAGE_KEY)
      if (stored?.trim()) {
        setProjectId((prev) => (prev === 'default' ? sanitizeProjectId(stored) : prev))
      }
    } catch {
      // ignore storage errors
    }
  }, [queryProjectId])

  useEffect(() => {
    try {
      localStorage.setItem(WORKBENCH_PROJECT_STORAGE_KEY, projectId)
    } catch {
      // ignore storage errors
    }
  }, [projectId])

  const previewContent = useMemo(() => {
    if (!activePath) return undefined
    return activeState?.content || ''
  }, [activePath, activeState])

  const isPreviewStale = useMemo(() => {
    if (!activePath || !activeState) return false
    const ext = getExtension(activePath)
    if (ext !== 'html' && ext !== 'htm') return false
    return activeState.content !== activeState.savedContent
  }, [activePath, activeState])

  const paletteFiles = useMemo(() => flattenFiles(fileTree), [fileTree])

  const markDirtyByPath = useCallback(
    (path: string, dirty: boolean) => {
      const tab = tabs.find((t) => t.path === path)
      if (tab) markTabDirty(tab.id, dirty)
    },
    [tabs, markTabDirty]
  )

  const loadTree = useCallback(async (rootPath: string, scopedProjectId: string = projectId) => {
    const normalizedRoot = normalizeWorkspaceRoot(rootPath)
    setTreeLoading(true)
    setTreeError(null)
    const response = await fetch('/api/files/tree', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-project-id': scopedProjectId,
      },
      body: JSON.stringify({ path: normalizedRoot, maxDepth: 6, projectId: scopedProjectId }),
    })
    if (!response.ok) {
      const message = await response.text().catch(() => '')
      throw new Error(message || 'Failed to load file tree')
    }
    const tree = await response.json()
    const entries = Array.isArray(tree?.children) ? tree.children : []
    setFileTree(entries.map(mapTreeEntry))
    return normalizedRoot
  }, [projectId])

  const refreshTree = useCallback(async () => {
    try {
      await loadTree(workspaceRoot)
    } catch (err) {
      setTreeError(err instanceof Error ? err.message : 'Failed to load workspace')
      setFileTree([])
    } finally {
      setTreeLoading(false)
    }
  }, [loadTree, workspaceRoot])

  useEffect(() => {
    refreshTree()
  }, [refreshTree])

  const readFile = useCallback(async (path: string) => {
    const data = await fsRequest({ action: 'read', path }, projectId)
    const content = typeof data?.content === 'string' ? data.content : ''
    const language = typeof data?.language === 'string' ? data.language : guessLanguage(path)
    return { content, language, modified: data?.modified ? new Date(data.modified) : null }
  }, [projectId])

  const handleFileSelect = useCallback(
    async (file: FileNode) => {
      if (file.type !== 'file') return

      openTab({
        title: file.name,
        path: file.path,
        language: file.extension ? guessLanguage(file.path) : 'plaintext',
      })

      if (fileStates[file.path]) return

      try {
        const data = await readFile(file.path)
        setFileStates((prev) => ({
          ...prev,
          [file.path]: {
            content: data.content,
            savedContent: data.content,
            language: data.language,
            lastSavedAt: data.modified,
          },
        }))
      } catch (err) {
        pushMessage(`Read failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    },
    [openTab, fileStates, readFile, pushMessage]
  )

  const handleCreate = useCallback(
    async (parentPath: string, type: 'file' | 'folder') => {
      const name = await promptDialog.openPrompt({
        title: type === 'file' ? 'New file name' : 'New folder name',
        placeholder: type === 'file' ? 'example.ts' : 'folder-name',
      })
      if (!name) return
      const targetPath = joinPath(parentPath === '/' ? workspaceRoot : parentPath, name)

      try {
        if (type === 'folder') {
          await fsRequest({ action: 'mkdir', path: targetPath, options: { recursive: true } }, projectId)
        } else {
          await fsRequest({ action: 'write', path: targetPath, content: '', options: { createDirectories: true } }, projectId)
        }
        await refreshTree()
        if (type === 'file') {
          handleFileSelect({ id: targetPath, name, type: 'file', path: targetPath })
        }
      } catch (err) {
        pushMessage(`Create failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    },
    [handleFileSelect, promptDialog, refreshTree, pushMessage, workspaceRoot, projectId]
  )

  const handleDelete = useCallback(
    async (file: FileNode) => {
      const ok = await confirmDialog.openConfirm(`Delete "${file.name}"? This action cannot be undone.`)
      if (!ok) return

      try {
        await fsRequest({ action: 'delete', path: file.path, options: { recursive: true, force: true } }, projectId)
        tabs
          .filter((tab) => isPathWithin(file.path, tab.path))
          .forEach((tab) => closeTab(tab.id))
        setFileStates((prev) => {
          const next = { ...prev }
          Object.keys(next).forEach((path) => {
            if (isPathWithin(file.path, path)) delete next[path]
          })
          return next
        })
        await refreshTree()
      } catch (err) {
        pushMessage(`Delete failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    },
    [tabs, closeTab, refreshTree, pushMessage, confirmDialog, projectId]
  )

  const handleRename = useCallback(
    async (file: FileNode, requestedName?: string) => {
      const promptedName = requestedName?.trim()
        ? requestedName.trim()
        : await promptDialog.openPrompt({
            title: 'Rename to',
            defaultValue: file.name,
            placeholder: file.name,
          })
      const name = promptedName?.trim()
      if (!name || name === file.name) return
      const newPath = joinPath(dirname(file.path), name)

      try {
        await fsRequest({ action: 'move', path: file.path, destination: newPath, options: { overwrite: false } }, projectId)
        if (fileStates[file.path]) {
          setFileStates((prev) => {
            const next = { ...prev }
            next[newPath] = { ...next[file.path] }
            delete next[file.path]
            return next
          })
        }
        const existingTab = tabs.find((tab) => tab.path === file.path)
        if (existingTab) {
          closeTab(existingTab.id)
          openTab({
            title: name,
            path: newPath,
            language: guessLanguage(newPath),
          })
        }
        await refreshTree()
      } catch (err) {
        pushMessage(`Rename failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    },
    [fileStates, tabs, closeTab, openTab, refreshTree, pushMessage, promptDialog, projectId]
  )

  const saveFile = useCallback(
    async (path: string) => {
      const state = fileStates[path]
      if (!state) return

      try {
        await fsRequest({ action: 'write', path, content: state.content }, projectId)
        setFileStates((prev) => ({
          ...prev,
          [path]: {
            ...prev[path],
            savedContent: state.content,
            lastSavedAt: new Date(),
          },
        }))
        markDirtyByPath(path, false)
        pushMessage(`Saved ${path}`)
      } catch (err) {
        pushMessage(`Save failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    },
    [fileStates, markDirtyByPath, pushMessage, projectId]
  )

  const saveActiveFile = useCallback(() => {
    if (!activePath) {
      pushMessage('No active file to save.')
      return
    }
    saveFile(activePath)
  }, [activePath, saveFile, pushMessage])

  const saveAll = useCallback(() => {
    Object.keys(fileStates).forEach((path) => {
      const state = fileStates[path]
      if (state && state.content !== state.savedContent) saveFile(path)
    })
  }, [fileStates, saveFile])

  const openFileByPath = useCallback(
    async (path: string) => {
      if (!path.trim()) return
      openTab({ title: path.split(/[\\/]/).pop() || path, path, language: guessLanguage(path) })
      try {
        const data = await readFile(path)
        setFileStates((prev) => ({
          ...prev,
          [path]: {
            content: data.content,
            savedContent: data.content,
            language: data.language,
            lastSavedAt: data.modified,
          },
        }))
      } catch (err) {
        pushMessage(`Read failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    },
    [openTab, readFile, pushMessage]
  )

  useEffect(() => {
    if (startupFileHandledRef.current) return
    if (!startupFilePath || treeLoading) return
    startupFileHandledRef.current = true
    openFileByPath(startupFilePath)
  }, [openFileByPath, startupFilePath, treeLoading])

  useEffect(() => {
    if (startupEntryHandledRef.current) return
    if (!startupEntry) return
    startupEntryHandledRef.current = true

    const sidebarTab = ENTRY_SIDEBAR_MAP[startupEntry]
    const bottomTab = ENTRY_BOTTOM_MAP[startupEntry]

    if (sidebarTab) {
      window.dispatchEvent(new CustomEvent('aethel.layout.openSidebarTab', { detail: { tab: sidebarTab } }))
    }
    if (bottomTab) {
      window.dispatchEvent(new CustomEvent('aethel.layout.openBottomTab', { detail: { tab: bottomTab } }))
    }
    if (startupEntry === 'ai' || startupEntry === 'chat' || startupEntry === 'ai-command') {
      window.dispatchEvent(new Event('aethel.layout.openAI'))
    }

    pushMessage(`Workbench entry context: ${startupEntry}`)
  }, [startupEntry, pushMessage])

  useEffect(() => {
    if (startupSessionHandledRef.current) return
    if (!startupSessionId) return
    startupSessionHandledRef.current = true
    const payload = {
      sessionId: startupSessionId,
      ...(startupTaskId ? { taskId: startupTaskId } : {}),
    }
    window.dispatchEvent(new CustomEvent('aethel.ide.studioContext', { detail: payload }))
    pushMessage(
      startupTaskId
        ? `Studio handoff loaded (session ${startupSessionId.slice(0, 8)}, task ${startupTaskId.slice(0, 8)}).`
        : `Studio handoff loaded (session ${startupSessionId.slice(0, 8)}).`
    )
  }, [startupSessionId, startupTaskId, pushMessage])

  useEffect(() => {
    const handleOpenRecentWorkspace = async (event: Event) => {
      const detail = (event as CustomEvent<{ workspaceUri?: string }>).detail
      const workspaceUri = detail?.workspaceUri?.trim()
      if (!workspaceUri) return

      const nextRoot = normalizeWorkspaceRoot(workspaceUri)
      try {
        await loadTree(nextRoot, projectId)
        setWorkspaceRoot(nextRoot)
        setTreeError(null)
        pushMessage(`Workspace root opened from recent list: ${nextRoot}`)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to open recent workspace'
        setTreeError(message)
        pushMessage(`Workspace open failed: ${message}`)
      } finally {
        setTreeLoading(false)
      }
    }

    const handleProblemOpenLocation = async (event: Event) => {
      const detail = (event as CustomEvent<{ uri?: string; line?: number; column?: number }>).detail
      const uri = detail?.uri?.trim()
      if (!uri) return

      await openFileByPath(uri)
      window.dispatchEvent(
        new CustomEvent('aethel.editor.revealLocation', {
          detail: {
            path: uri,
            line: Math.max(1, Number(detail?.line ?? 0) + 1),
            column: Math.max(1, Number(detail?.column ?? 0) + 1),
          },
        })
      )
    }

    window.addEventListener('aethel.workspace.openRecent', handleOpenRecentWorkspace as EventListener)
    window.addEventListener('aethel.problems.openLocation', handleProblemOpenLocation as EventListener)

    return () => {
      window.removeEventListener('aethel.workspace.openRecent', handleOpenRecentWorkspace as EventListener)
      window.removeEventListener('aethel.problems.openLocation', handleProblemOpenLocation as EventListener)
    }
  }, [loadTree, openFileByPath, projectId, pushMessage])

  const updateProjectIdInUrl = useCallback((nextProjectId: string) => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    url.searchParams.set('projectId', nextProjectId)
    window.history.replaceState({}, '', url.toString())
  }, [])

  const handleSwitchProject = useCallback(async () => {
    const requested = await promptDialog.openPrompt({
      title: 'Switch active project',
      defaultValue: projectId,
      placeholder: 'project-id',
    })
    if (requested === null) return

    const nextProjectId = sanitizeProjectId(requested)
    if (nextProjectId === projectId) {
      pushMessage(`Project context unchanged (${projectId}).`)
      return
    }

    try {
      await loadTree('/', nextProjectId)
      setProjectId(nextProjectId)
      setWorkspaceRoot('/')
      setFileStates({})
      tabs.forEach((tab) => closeTab(tab.id))
      updateProjectIdInUrl(nextProjectId)
      setTreeError(null)
      pushMessage(`Switched project context to "${nextProjectId}".`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to switch project context'
      pushMessage(`Project switch failed: ${message}`)
      setTreeError(message)
    } finally {
      setTreeLoading(false)
    }
  }, [promptDialog, projectId, pushMessage, loadTree, tabs, closeTab, updateProjectIdInUrl])

  const handleOpenFile = useCallback(() => {
    promptDialog
      .openPrompt({
        title: 'Open file path',
        placeholder: '/src/main.ts',
      })
      .then((path) => {
        if (path?.trim()) openFileByPath(path.trim())
      })
  }, [openFileByPath, promptDialog])

  const handleOpenFolder = useCallback(async () => {
    const input = await promptDialog.openPrompt({
      title: 'Open workspace root',
      defaultValue: workspaceRoot,
      placeholder: '/',
    })
    if (input === null) return

    const requestedRoot = normalizeWorkspaceRoot(input)
    try {
      const loadedRoot = await loadTree(requestedRoot)
      setWorkspaceRoot(loadedRoot)
      setTreeError(null)
      pushMessage(`Workspace root: ${loadedRoot}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to open folder'
      pushMessage(`Open folder failed: ${message}`)
      setTreeError(message)
    } finally {
      setTreeLoading(false)
    }
  }, [loadTree, pushMessage, workspaceRoot, promptDialog])

  const handleExport = useCallback(() => {
    pushMessage('Export requires project context. Open a project dashboard to deploy/export.')
  }, [pushMessage])

  const handleRun = useCallback(() => {
    pushMessage('Use Terminal (Ctrl+`) to run project commands in this workspace.')
  }, [pushMessage])

  const handleBuild = useCallback(() => {
    pushMessage('Build pipeline is available per project. Select project export for managed builds.')
  }, [pushMessage])

  const handleDebug = useCallback(() => {
    pushMessage('Debug adapter will be wired in the next execution milestone.')
  }, [pushMessage])

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (!activePath) return
      const nextValue = value ?? ''
      setFileStates((prev) => {
        const prevState = prev[activePath] || {
          content: '',
          savedContent: '',
          language: guessLanguage(activePath),
        }
        const nextState = { ...prevState, content: nextValue }
        const isDirty = nextState.content !== prevState.savedContent
        markDirtyByPath(activePath, isDirty)
        return { ...prev, [activePath]: nextState }
      })
    },
    [activePath, markDirtyByPath]
  )

  const handleRefreshPreview = useCallback(() => {
    setPreviewKey((key) => key + 1)
  }, [])

  const statusNode = (
    <span>
      {statusMessage ||
        (activePath
          ? `Project: ${projectId} | Workspace: ${workspaceRoot} | ${activePath}${activeState?.content !== activeState?.savedContent ? ' (unsaved)' : ''}${startupSessionId ? ` | Studio: ${startupSessionId.slice(0, 8)}` : ''}`
          : `Project: ${projectId} | Workspace: ${workspaceRoot}${startupSessionId ? ` | Studio: ${startupSessionId.slice(0, 8)}` : ''}`)}
    </span>
  )

  const outputPanel = (
    <div className="h-full p-3 text-xs text-slate-300 space-y-2">
      <div className="font-medium text-slate-200">Output</div>
      <div className="text-slate-400">Workbench runtime is active. Use Terminal for process logs.</div>
      <div className="text-slate-500">Project: {projectId}</div>
      <div className="text-slate-500">Workspace: {workspaceRoot}</div>
    </div>
  )

  const problemsPanel = (
    <div className="h-full p-3 text-xs text-slate-300 space-y-2">
      <div className="font-medium text-slate-200">Problems</div>
      <div className="text-slate-400">No diagnostics from backend analyzer in this workspace.</div>
      <div className="text-slate-500">Enable project analyzer to populate this panel.</div>
    </div>
  )

  const debugPanel = (
    <div className="h-full p-3 text-xs text-slate-300 space-y-2">
      <div className="font-medium text-slate-200">Debug Console</div>
      <div className="text-slate-400">Debug adapter is scoped for P1. Current action: explicit capability gate.</div>
    </div>
  )

  const searchPanel = (
    <div className="h-full p-3 text-xs text-slate-300 space-y-2">
      <div className="font-medium text-slate-200">Search</div>
      <div className="text-slate-400">Use Command Palette for fast open and symbol navigation.</div>
      <div className="text-slate-500">Shortcuts: Ctrl+P, Ctrl+Shift+P, Ctrl+G.</div>
    </div>
  )

  const gitPanel = (
    <div className="h-full p-3 text-xs text-slate-300 space-y-2">
      <div className="font-medium text-slate-200">Source Control</div>
      <div className="text-slate-400">Git integration is available through project-level workflows.</div>
      <div className="text-slate-500">This panel will display working tree state after Git bridge activation.</div>
    </div>
  )

  const portsPanel = (
    <div className="h-full p-3 text-xs text-slate-300 space-y-2">
      <div className="font-medium text-slate-200">Ports</div>
      <div className="text-slate-400">No forwarded ports are currently active in this workspace.</div>
    </div>
  )

  return (
    <CommandPaletteProvider
      files={paletteFiles}
      onOpenFile={openFileByPath}
      onOpenFileDialog={handleOpenFile}
      onSaveFile={saveActiveFile}
      onSaveAll={saveAll}
      onNewFile={() => handleCreate(workspaceRoot, 'file')}
      onNewFolder={() => handleCreate(workspaceRoot, 'folder')}
      onSwitchProject={handleSwitchProject}
      onToggleSidebar={() => window.dispatchEvent(new Event('aethel.layout.toggleSidebar'))}
      onToggleTerminal={() => window.dispatchEvent(new Event('aethel.layout.toggleTerminal'))}
      onAIChat={() => window.dispatchEvent(new Event('aethel.layout.toggleAI'))}
      onRollbackLastAIPatch={() => window.dispatchEvent(new Event('aethel.editor.rollbackInlinePatch'))}
      onOpenSettings={() => pushMessage('Global IDE settings are managed under Admin > IDE Settings.')}
    >
      <IDELayout
        fileExplorer={
          <FileExplorerPro
            files={fileTree}
            isLoading={treeLoading}
            error={treeError}
            onFileSelect={handleFileSelect}
            onFileCreate={handleCreate}
            onFileDelete={handleDelete}
            onFileRename={handleRename}
            onRefresh={refreshTree}
            workspaceName={workspaceRoot === '/' ? 'workspace' : workspaceRoot.split(/[\\/]/).pop() || workspaceRoot}
            className="text-slate-200"
          />
        }
        aiChatPanel={<AIChatPanelContainer />}
        searchPanel={searchPanel}
        gitPanel={gitPanel}
        terminal={
          <Suspense fallback={<TerminalSkeleton />}>
            <MultiTerminalPanel />
          </Suspense>
        }
        outputPanel={outputPanel}
        problemsPanel={problemsPanel}
        debugPanel={debugPanel}
        portsPanel={portsPanel}
        statusBar={statusNode}
        onNewFile={() => handleCreate(workspaceRoot, 'file')}
        onNewFolder={() => handleCreate(workspaceRoot, 'folder')}
        onOpenFile={handleOpenFile}
        onOpenFolder={handleOpenFolder}
        onSwitchProject={handleSwitchProject}
        onSaveFile={saveActiveFile}
        onSaveAll={saveAll}
        onExport={handleExport}
        onRunProject={handleRun}
        onBuildProject={handleBuild}
        onDebugProject={handleDebug}
        onTogglePreview={handleRefreshPreview}
        onCommandPalette={() =>
          window.dispatchEvent(new CustomEvent('aethel.commandPalette.open', { detail: { mode: 'commands' } }))
        }
      >
        <div className="relative h-full flex flex-col">
          <TabBar />
          <div className="flex-1 grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div className="min-w-0 border-r border-slate-800">
              {activePath ? (
                <MonacoEditorPro
                  path={activePath}
                  projectId={projectId}
                  value={activeState?.content ?? ''}
                  language={activeState?.language || activeTab?.language || guessLanguage(activePath)}
                  onChange={handleEditorChange}
                  onSave={saveActiveFile}
                  enableAISuggestions
                />
              ) : (
                <EmptyEditorState />
              )}
            </div>
            <PreviewPanel
              key={`${activePath || 'preview'}-${previewKey}`}
              title="Preview"
              filePath={activePath || undefined}
              content={previewContent}
              projectId={projectId}
              onRefresh={handleRefreshPreview}
              isStale={isPreviewStale}
            />
          </div>
          <PromptDialog
            open={promptDialog.state.open}
            title={promptDialog.state.title}
            placeholder={promptDialog.state.placeholder}
            value={promptDialog.value}
            onChange={promptDialog.setValue}
            onCancel={() => promptDialog.closePrompt(null)}
            onConfirm={() => promptDialog.closePrompt(promptDialog.value.trim())}
          />
          <ConfirmDialog
            open={confirmDialog.state.open}
            message={confirmDialog.state.message}
            onCancel={() => confirmDialog.closeConfirm(false)}
            onConfirm={() => confirmDialog.closeConfirm(true)}
          />
        </div>
      </IDELayout>
    </CommandPaletteProvider>
  )
}

export default function IDEPage() {
  return (
    <TabProvider>
      <IDEPageInner />
    </TabProvider>
  )
}
