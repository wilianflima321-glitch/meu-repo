'use client'

import { CANONICAL_FOCUS, CANONICAL_MOTION } from '@/lib/canonical-spacing'
import Codicon from './Codicon'
import { ContextMenu, FileTreeNode, type ExplorerPresenceSummary, type FileNode } from './FileExplorerPro.parts'

type ExplorerContextMenuState = {
  x: number
  y: number
  file: FileNode
} | null

interface FileExplorerViewProps {
  workspaceName: string
  className?: string
  showSearch: boolean
  setShowSearch: (value: boolean) => void
  searchQuery: string
  setSearchQuery: (value: string) => void
  lastSyncAt: string | null
  effectiveLoading: boolean
  effectiveError: string | null
  filteredFiles: FileNode[]
  selectedFile: string | null
  expandedFolders: Set<string>
  contextMenu: ExplorerContextMenuState
  iconButtonClass: string
  onFileCreate?: (parentPath: string, type: 'file' | 'folder') => void
  onRefresh: () => void | Promise<void>
  onSelect: (file: FileNode) => void
  onToggleFolder: (folderId: string) => void
  onContextMenu: (event: React.MouseEvent, file: FileNode) => void
  getPresence: (node: FileNode) => ExplorerPresenceSummary | null
  onCloseContextMenu: () => void
  onContextAction: (action: string) => void
}

export function FileExplorerView({
  workspaceName,
  className = '',
  showSearch,
  setShowSearch,
  searchQuery,
  setSearchQuery,
  lastSyncAt,
  effectiveLoading,
  effectiveError,
  filteredFiles,
  selectedFile,
  expandedFolders,
  contextMenu,
  iconButtonClass,
  onFileCreate,
  onRefresh,
  onSelect,
  onToggleFolder,
  onContextMenu,
  getPresence,
  onCloseContextMenu,
  onContextAction,
}: FileExplorerViewProps) {
  return (
    <div className={`h-full flex flex-col ${className}`}>
      <ExplorerHeader
        workspaceName={workspaceName}
        showSearch={showSearch}
        setShowSearch={setShowSearch}
        iconButtonClass={iconButtonClass}
        onFileCreate={onFileCreate}
        onRefresh={onRefresh}
      />
      {lastSyncAt ? <ExplorerSyncStatus lastSyncAt={lastSyncAt} /> : null}
      {showSearch ? <ExplorerSearch query={searchQuery} setQuery={setSearchQuery} /> : null}

      <div className="flex-1 overflow-y-auto py-1">
        {effectiveError ? <ExplorerError message={effectiveError} /> : null}
        {effectiveLoading && !effectiveError ? <ExplorerLoading /> : null}
        {filteredFiles.map((node) => (
          <FileTreeNode
            key={node.id}
            node={node}
            depth={0}
            selectedFile={selectedFile}
            expandedFolders={expandedFolders}
            onSelect={onSelect}
            onToggle={onToggleFolder}
            onContextMenu={onContextMenu}
            getPresence={getPresence}
            presence={getPresence(node)}
          />
        ))}
        <ExplorerEmptyState
          isVisible={filteredFiles.length === 0 && !effectiveLoading && !effectiveError}
          searchQuery={searchQuery}
          onFileCreate={onFileCreate}
        />
      </div>

      {contextMenu ? (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          file={contextMenu.file}
          onClose={onCloseContextMenu}
          onAction={onContextAction}
        />
      ) : null}
    </div>
  )
}

function ExplorerHeader({
  workspaceName,
  showSearch,
  setShowSearch,
  iconButtonClass,
  onFileCreate,
  onRefresh,
}: Pick<FileExplorerViewProps, 'workspaceName' | 'showSearch' | 'setShowSearch' | 'iconButtonClass' | 'onFileCreate' | 'onRefresh'>) {
  return (
    <div className="density-header flex items-center justify-between px-2 border-b border-[var(--aethel-border-primary)]">
      <span className="text-xs font-semibold text-[var(--aethel-text-tertiary)] uppercase tracking-wider truncate">
        {workspaceName}
      </span>
      <div className="flex items-center gap-1">
        <IconButton active={showSearch} label="Toggle file search" title="Search files" icon="search" className={iconButtonClass} onClick={() => setShowSearch(!showSearch)} />
        <IconButton label="Create new file" title="New file" icon="new-file" className={iconButtonClass} onClick={() => onFileCreate?.('/', 'file')} />
        <IconButton label="Create new folder" title="New folder" icon="new-folder" className={iconButtonClass} onClick={() => onFileCreate?.('/', 'folder')} />
        <IconButton label="Refresh workspace files" title="Refresh" icon="refresh" className={iconButtonClass} onClick={onRefresh} />
      </div>
    </div>
  )
}

function IconButton({
  label,
  title,
  icon,
  className,
  active = false,
  onClick,
}: {
  label: string
  title: string
  icon: 'search' | 'new-file' | 'new-folder' | 'refresh'
  className: string
  active?: boolean
  onClick: () => void | Promise<void>
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`${className} ${active ? 'text-[var(--aethel-info-light)]' : 'text-[var(--aethel-text-tertiary)]'}`}
      title={title}
    >
      <Codicon name={icon} />
    </button>
  )
}

function ExplorerSyncStatus({ lastSyncAt }: { lastSyncAt: string }) {
  return (
    <div className="px-2 py-1 border-b border-[var(--aethel-border-primary)] text-[10px] text-[var(--aethel-text-tertiary)]" aria-live="polite">
      Last synced: {new Date(lastSyncAt).toLocaleTimeString()}
    </div>
  )
}

function ExplorerSearch({ query, setQuery }: { query: string; setQuery: (value: string) => void }) {
  return (
    <div className="px-2 py-2 border-b border-[var(--aethel-border-primary)]">
      <div className="relative">
        <Codicon name="search" className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--aethel-text-tertiary)]" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search files..."
          className={`w-full rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)] py-1.5 pl-8 pr-3 text-xs text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-quaternary)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`}
          autoFocus
          aria-label="Search files in explorer"
        />
      </div>
    </div>
  )
}

function ExplorerError({ message }: { message: string }) {
  return (
    <div className="px-3 py-2">
      <div
        className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-error)_32%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] px-3 py-2 text-xs text-[var(--aethel-error-light)]"
        role="alert"
        aria-live="polite"
      >
        {message}
      </div>
    </div>
  )
}

function ExplorerLoading() {
  return (
    <div className="px-3 py-2" aria-live="polite">
      <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_54%,transparent)] px-3 py-3 text-xs text-[var(--aethel-text-secondary)]">
        <p className="mb-2 font-medium text-[var(--aethel-text-primary)]">Loading workspace tree...</p>
        <div className="space-y-1.5">
          <div className="h-2 rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_82%,transparent)]" />
          <div className="h-2 w-5/6 rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_82%,transparent)]" />
          <div className="h-2 w-2/3 rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_82%,transparent)]" />
        </div>
      </div>
    </div>
  )
}

function ExplorerEmptyState({
  isVisible,
  searchQuery,
  onFileCreate,
}: {
  isVisible: boolean
  searchQuery: string
  onFileCreate?: (parentPath: string, type: 'file' | 'folder') => void
}) {
  if (!isVisible) return null
  if (searchQuery) {
    return (
      <div className="px-3 py-3">
        <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_54%,transparent)] px-3 py-3 text-center text-xs text-[var(--aethel-text-secondary)]">
          <p className="mb-1 font-medium text-[var(--aethel-text-primary)]">No files found</p>
          <p>{`"${searchQuery}"`}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex items-center justify-center px-4 text-center">
      <div className="max-w-xs">
        <div className="text-xs font-medium text-[var(--aethel-text-secondary)] mb-1">Empty workspace</div>
        <div className="text-[11px] text-[var(--aethel-text-tertiary)] mb-3">
          Create a file or folder to start editing in this project.
        </div>
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            aria-label="Create new file"
            onClick={() => onFileCreate?.('/', 'file')}
            className={`rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)]/70 px-2.5 py-1.5 text-[11px] text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-quaternary)]/80 ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`}
          >
            New file
          </button>
          <button
            type="button"
            aria-label="Create new folder in empty workspace"
            onClick={() => onFileCreate?.('/', 'folder')}
            className={`rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)]/70 px-2.5 py-1.5 text-[11px] text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-quaternary)]/80 ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`}
          >
            New folder
          </button>
        </div>
      </div>
    </div>
  )
}
