'use client'

import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import Codicon from './Codicon'
import {
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  fuzzyMatch,
  highlightMatches,
  type CommandItem,
  type FileItem,
  type PaletteMode,
} from './CommandPalette.parts'

type FilteredCommandItem = CommandItem & {
  labelMatch: ReturnType<typeof fuzzyMatch>
  descriptionMatch: ReturnType<typeof fuzzyMatch>
  match: boolean
  score: number
}

type FilteredFileItem = FileItem & {
  nameMatch: ReturnType<typeof fuzzyMatch>
  pathMatch: ReturnType<typeof fuzzyMatch>
  match: boolean
  score: number
}

type FilteredPaletteItem = FilteredCommandItem | FilteredFileItem

const MODE_CONFIG: Record<PaletteMode, { placeholder: string; prefix: string }> = {
  commands: { placeholder: 'Type a command...', prefix: '>' },
  files: { placeholder: 'Search files...', prefix: '' },
  symbols: { placeholder: 'Go to symbol...', prefix: '@' },
  lines: { placeholder: 'Go to line...', prefix: ':' },
}

function buildCommandResults(query: string, commands: CommandItem[]): FilteredCommandItem[] {
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

function buildFileResults(query: string, files: FileItem[]): FilteredFileItem[] {
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

// ---------------------------------------------------------------------------
// File preview panel for the two-column Raycast-grade layout
// ---------------------------------------------------------------------------

function FilePreviewPanel({ item, query }: { item: FilteredFileItem | FilteredCommandItem | null; query: string }) {
  const [previewContent, setPreviewContent] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fileItem = item && 'path' in item ? item : null

  useEffect(() => {
    setPreviewContent(null)
    if (!fileItem) return
    setIsLoading(true)
    const controller = new AbortController()
    fetch(`/api/files/preview?path=${encodeURIComponent(fileItem.path)}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.text() : null))
      .then((text) => { if (text !== null) setPreviewContent(text) })
      .catch(() => {/* preview unavailable */})
      .finally(() => setIsLoading(false))
    return () => controller.abort()
  }, [fileItem?.path])

  const commandItem = item && 'action' in item ? item : null

  if (commandItem) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <span className="rounded bg-[color-mix(in_srgb,var(--aethel-info)_14%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--aethel-info-light)]">
            {CATEGORY_LABELS[commandItem.category]}
          </span>
        </div>
        <p className="text-sm font-medium text-[var(--aethel-text-primary)] leading-snug">
          {commandItem.label}
        </p>
        {commandItem.description && (
          <p className="text-xs text-[var(--aethel-text-secondary)] leading-relaxed">{commandItem.description}</p>
        )}
        {commandItem.shortcut && (
          <div className="mt-auto flex items-center gap-1.5 text-[11px] text-[var(--aethel-text-tertiary)]">
            <span>Shortcut</span>
            <kbd className="rounded bg-[var(--aethel-surface-tertiary)] px-1.5 py-0.5">{commandItem.shortcut}</kbd>
          </div>
        )}
      </div>
    )
  }

  if (!fileItem) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-4 text-[var(--aethel-text-tertiary)]">
        <div className="text-[11px]">Select a file to preview</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="border-b border-[var(--aethel-border-secondary)]/50 px-3 py-2">
        <p className="truncate text-xs font-medium text-[var(--aethel-text-primary)]">{fileItem.name}</p>
        <p className="truncate text-[10px] text-[var(--aethel-text-tertiary)]">{fileItem.path}</p>
      </div>
      <div className="max-h-[360px] overflow-y-auto px-3 py-2">
        {isLoading ? (
          <div className="space-y-2 pt-1" aria-label="Loading file preview" aria-busy="true">
            {[100, 72, 88, 56, 80, 64].map((w, i) => (
              <div key={i} className="aethel-shimmer h-2.5 rounded" style={{ width: `${w}%` }} />
            ))}
          </div>
        ) : previewContent ? (
          <PreviewHighlighted content={previewContent} query={query} />
        ) : (
          <p className="text-[11px] italic text-[var(--aethel-text-tertiary)]">Preview unavailable</p>
        )}
      </div>
    </div>
  )
}

function PreviewHighlighted({ content, query }: { content: string; query: string }) {
  const lines = content.split('\n').slice(0, 120)
  const lowerQuery = query.toLowerCase()

  return (
    <pre className="font-mono text-[10px] leading-[1.6] text-[var(--aethel-text-secondary)] whitespace-pre-wrap break-all">
      {lines.map((line, i) => {
        if (lowerQuery && line.toLowerCase().includes(lowerQuery)) {
          const idx = line.toLowerCase().indexOf(lowerQuery)
          return (
            <span key={i} className="block bg-[color-mix(in_srgb,var(--aethel-neon-amber)_8%,transparent)]">
              {line.slice(0, idx)}
              <mark className="bg-[color-mix(in_srgb,var(--aethel-neon-amber)_30%,transparent)] text-[var(--aethel-neon-amber)] rounded-[2px]">
                {line.slice(idx, idx + lowerQuery.length)}
              </mark>
              {line.slice(idx + lowerQuery.length)}
            </span>
          )
        }
        return <span key={i} className="block">{line || '\u00a0'}</span>
      })}
    </pre>
  )
}

// ---------------------------------------------------------------------------
// Main palette
// ---------------------------------------------------------------------------

export function CommandPaletteUI({
  isOpen,
  mode,
  commands,
  files = [],
  close,
  executeCommand,
  onOpenFile,
}: {
  isOpen: boolean
  mode: PaletteMode
  commands: CommandItem[]
  files?: FileItem[]
  close: () => void
  executeCommand: (id: string) => Promise<void>
  onOpenFile?: (path: string) => void
}) {
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

  const filteredItems = useMemo<FilteredPaletteItem[]>(() => {
    if (mode === 'commands') return buildCommandResults(query, commands)
    if (mode === 'files') return buildFileResults(query, files)
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

  const currentMode = MODE_CONFIG[mode]
  const selectedItem = filteredItems[selectedIndex] ?? null
  // Show the two-column preview panel — always on in files mode, on in commands
  // mode so users can see the description/shortcut without hovering.
  const showPreview = filteredItems.length > 0

  return (
    <>
      <div className="fixed inset-0 z-50 bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)] backdrop-blur-[1px]" onClick={close} />
      <div
        className="fixed left-1/2 top-[10%] z-50 w-[900px] max-w-[96vw] -translate-x-1/2"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="overflow-hidden rounded-xl border border-[var(--aethel-border-secondary)]/80 bg-[var(--aethel-surface-primary)] shadow-2xl">
          {/* Search bar */}
          <div className="flex items-center gap-2 border-b border-[var(--aethel-border-secondary)]/70 px-3 py-2.5">
            {currentMode.prefix ? <span className="font-mono text-xs text-[var(--aethel-info-light)]">{currentMode.prefix}</span> : null}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={currentMode.placeholder}
              className="flex-1 bg-transparent text-sm text-[var(--aethel-text-primary)] outline-none placeholder:text-[var(--aethel-text-tertiary)]"
              autoComplete="off"
              spellCheck={false}
              aria-label="Command palette input"
            />
            <PaletteKeyboardHints />
          </div>

          {/* Two-column body */}
          <div className="flex" style={{ height: '380px' }}>
            {/* Left: results list — 40% */}
            <div
              ref={listRef}
              className="w-[40%] overflow-y-auto border-r border-[var(--aethel-border-secondary)]/50"
              role="listbox"
              aria-label="Palette results"
            >
              {!filteredItems.length ? (
                <div className="px-4 py-8 text-center text-xs text-[var(--aethel-text-tertiary)]">No result found</div>
              ) : null}

              {filteredItems.map((item, index) =>
                mode === 'commands' && 'action' in item ? (
                  <CommandResultRow
                    key={item.id}
                    item={item}
                    selected={index === selectedIndex}
                    onSelect={() => handleSelect(index)}
                    onHover={() => setSelectedIndex(index)}
                  />
                ) : mode === 'files' && 'path' in item ? (
                  <FileResultRow
                    key={item.path}
                    item={item}
                    selected={index === selectedIndex}
                    onSelect={() => handleSelect(index)}
                    onHover={() => setSelectedIndex(index)}
                  />
                ) : null
              )}
            </div>

            {/* Right: preview — 60% */}
            <div className="w-[60%] overflow-hidden text-[var(--aethel-text-secondary)]">
              {showPreview ? (
                <FilePreviewPanel item={selectedItem} query={query} />
              ) : (
                <div className="flex h-full items-center justify-center text-[11px] text-[var(--aethel-text-tertiary)]">
                  Start typing to search
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[var(--aethel-border-secondary)]/70 px-3 py-1.5 text-[10px] text-[var(--aethel-text-tertiary)]">
            <div className="flex items-center gap-3">
              <span>
                <kbd className="rounded bg-[var(--aethel-surface-tertiary)] px-1 py-0.5">Ctrl+Shift+P</kbd> Commands
              </span>
              <span>
                <kbd className="rounded bg-[var(--aethel-surface-tertiary)] px-1 py-0.5">Ctrl+P</kbd> Files
              </span>
            </div>
            <span>{filteredItems.length} results</span>
          </div>
        </div>
      </div>
    </>
  )
}

function PaletteKeyboardHints() {
  return (
    <div className="hidden items-center gap-2 text-[10px] text-[var(--aethel-text-tertiary)] md:flex">
      <kbd className="rounded bg-[var(--aethel-surface-tertiary)] px-1.5 py-0.5">Up/Down</kbd>
      <span>Navigate</span>
      <kbd className="rounded bg-[var(--aethel-surface-tertiary)] px-1.5 py-0.5">Enter</kbd>
      <span>Select</span>
      <kbd className="rounded bg-[var(--aethel-surface-tertiary)] px-1.5 py-0.5">Esc</kbd>
      <span>Close</span>
    </div>
  )
}

function CommandResultRow({
  item,
  selected,
  onSelect,
  onHover,
}: {
  item: FilteredCommandItem
  selected: boolean
  onSelect: () => void
  onHover: () => void
}) {
  const icon = item.icon || CATEGORY_ICONS[item.category]
  return (
    <button
      type="button"
      aria-label={`Select command ${item.label}`}
      onClick={onSelect}
      onMouseEnter={onHover}
      role="option"
      aria-selected={selected}
      className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
        selected ? 'bg-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)]' : 'hover:bg-[var(--aethel-surface-tertiary)]/70'
      }`}
    >
      <Codicon name={icon} className="text-[var(--aethel-text-tertiary)]" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs text-[var(--aethel-text-primary)]">{highlightMatches(item.label, item.labelMatch.indices)}</div>
        {item.description ? <div className="truncate text-[11px] text-[var(--aethel-text-tertiary)]">{item.description}</div> : null}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-[var(--aethel-text-tertiary)]">{CATEGORY_LABELS[item.category]}</span>
        {item.shortcut ? <kbd className="rounded bg-[var(--aethel-surface-tertiary)] px-1.5 py-0.5 text-[10px] text-[var(--aethel-text-tertiary)]">{item.shortcut}</kbd> : null}
      </div>
    </button>
  )
}

function FileResultRow({
  item,
  selected,
  onSelect,
  onHover,
}: {
  item: FilteredFileItem
  selected: boolean
  onSelect: () => void
  onHover: () => void
}) {
  const icon = item.type === 'folder' ? 'folder' : 'symbol-file'
  return (
    <button
      type="button"
      aria-label={`Open file ${item.name}`}
      onClick={onSelect}
      onMouseEnter={onHover}
      role="option"
      aria-selected={selected}
      className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
        selected ? 'bg-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)]' : 'hover:bg-[var(--aethel-surface-tertiary)]/70'
      }`}
    >
      <Codicon name={icon} className="text-[var(--aethel-text-tertiary)]" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs text-[var(--aethel-text-primary)]">{highlightMatches(item.name, item.nameMatch.indices)}</div>
        <div className="truncate text-[11px] text-[var(--aethel-text-tertiary)]">{item.path}</div>
      </div>
      {item.modified ? <span className="text-xs text-[var(--aethel-warning-light)]">M</span> : null}
      {item.gitStatus ? <span className="text-xs text-[var(--aethel-text-tertiary)]">{item.gitStatus}</span> : null}
    </button>
  )
}
