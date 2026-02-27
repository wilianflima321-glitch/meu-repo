'use client'

import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import IDELayout from '@/components/ide/IDELayout'
import FileExplorerPro from '@/components/ide/FileExplorerPro'
import PreviewPanel from '@/components/ide/PreviewPanel'
import AIChatPanelContainer from '@/components/ide/AIChatPanelContainer'
import TabBar, { TabProvider, useTabBar } from '@/components/editor/TabBar'
import MonacoEditorPro from '@/components/editor/MonacoEditorPro'
import CommandPaletteProvider from '@/components/ide/CommandPalette'
import { WorkbenchContextBanner } from '@/components/ide/WorkbenchContextBanner'
import { WorkbenchStatusBar } from '@/components/ide/WorkbenchStatusBar'
import {
  ConfirmDialog,
  PromptDialog,
  useConfirmDialog,
  usePromptDialog,
  useStatusMessage,
} from '@/components/ide/WorkbenchDialogs'
import {
  DebugPanel,
  GitPanel,
  OutputPanel,
  PortsPanel,
  ProblemsPanel,
  SearchPanel,
} from '@/components/ide/WorkbenchPanels'
import {
  ENTRY_BOTTOM_MAP,
  ENTRY_SIDEBAR_MAP,
  WorkbenchEntry,
  buildContextBannerMessage,
} from '@/components/ide/workbench-context'
import {
  EmptyEditorState,
  FileNode,
  FileState,
  TerminalSkeleton,
  WORKBENCH_PROJECT_STORAGE_KEY,
  dirname,
  flattenFiles,
  getExtension,
  guessLanguage,
  isPathWithin,
  joinPath,
  mapTreeEntry,
  normalizeWorkspaceRoot,
  sanitizeProjectId,
} from '@/components/ide/workbench-utils'
import { getExecutionTarget } from '@/lib/execution-target'

const MultiTerminalPanel = dynamic(
  () => import('@/components/terminal/XTerminal').then((mod) => ({ default: mod.MultiTerminalPanel })),
  {
    ssr: false,
    loading: () => <TerminalSkeleton />,
  }
)

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
  const router = useRouter()
  const searchParams = useSearchParams()
  const executionTarget = useMemo(() => getExecutionTarget(), [])
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
  const [showContextBanner, setShowContextBanner] = useState(true)
  const startupFileHandledRef = useRef(false)
  const startupEntryHandledRef = useRef(false)
  const startupSessionHandledRef = useRef(false)

  const activeTab = tabs.find((tab) => tab.id === activeTabId) || null
  const activePath = activeTab?.path || null
  const activeState = activePath ? fileStates[activePath] : null
  const unsavedCount = useMemo(
    () => Object.values(fileStates).filter((state) => state.content !== state.savedContent).length,
    [fileStates]
  )

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

  const contextBannerMessage = useMemo(
    () =>
      buildContextBannerMessage({
        entry: startupEntry,
        sessionId: startupSessionId,
        taskId: startupTaskId,
      }),
    [startupEntry, startupSessionId, startupTaskId]
  )

  useEffect(() => {
    if (!showContextBanner || !contextBannerMessage) return
    const timeout = window.setTimeout(() => setShowContextBanner(false), 12000)
    return () => window.clearTimeout(timeout)
  }, [showContextBanner, contextBannerMessage])

  const statusNode = (
    <WorkbenchStatusBar
      statusMessage={statusMessage}
      projectId={projectId}
      workspaceRoot={workspaceRoot}
      activePath={activePath}
      isActiveDirty={!!activeState && activeState.content !== activeState.savedContent}
      unsavedCount={unsavedCount}
      studioSessionId={startupSessionId}
      executionTarget={executionTarget}
    />
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
      onOpenSettings={() => router.push('/settings')}
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
            onOpenStudioHome={() => router.push('/dashboard')}
            workspaceName={workspaceRoot === '/' ? 'workspace' : workspaceRoot.split(/[\\/]/).pop() || workspaceRoot}
            className="text-slate-200"
          />
        }
        aiChatPanel={<AIChatPanelContainer />}
        searchPanel={<SearchPanel />}
        gitPanel={<GitPanel />}
        terminal={
          <Suspense fallback={<TerminalSkeleton />}>
            <MultiTerminalPanel />
          </Suspense>
        }
        outputPanel={<OutputPanel projectId={projectId} workspaceRoot={workspaceRoot} />}
        problemsPanel={<ProblemsPanel />}
        debugPanel={<DebugPanel />}
        portsPanel={<PortsPanel />}
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
        onSettings={() => router.push('/settings')}
      >
        <div className="relative h-full flex flex-col">
          <WorkbenchContextBanner
            show={showContextBanner}
            message={contextBannerMessage}
            onDismiss={() => setShowContextBanner(false)}
          />
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
                <EmptyEditorState
                  onOpenFile={handleOpenFile}
                  onNewFile={() => {
                    void handleCreate(workspaceRoot, 'file')
                  }}
                  onOpenStudioHome={() => router.push('/dashboard')}
                />
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
