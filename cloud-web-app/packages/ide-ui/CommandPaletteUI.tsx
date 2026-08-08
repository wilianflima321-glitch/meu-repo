'use client'

import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { CommandItem, FileItem, PaletteMode, ScriptingNodeItem } from './CommandPalette.parts'
import {
  buildCommandResults,
  buildFileResults,
  buildGroupedAllResults,
  MODE_CONFIG,
  type FilteredPaletteItem,
  type ResultGroup,
} from './CommandPalette.search'
import { FilePreviewPanel } from './CommandPalette.preview'
import {
  CommandResultRow,
  FileResultRow,
  HierarchicalResultList,
  PaletteKeyboardHints,
} from './CommandPalette.rows'

// ---------------------------------------------------------------------------
// Main palette — Raycast-grade two-column layout: fuzzy-matched results on
// the left (grouped by source in Universal Search / `all` mode), a live
// preview (file contents, command shortcut, or scripting node summary) on
// the right. Search/scoring logic lives in `CommandPalette.search.ts`, row
// presentational components in `CommandPalette.rows.tsx`, and the preview
// panel in `CommandPalette.preview.tsx` — kept split out so this orchestrator
// stays under the 500 LoC component ceiling.
// ---------------------------------------------------------------------------

export function CommandPaletteUI({
  isOpen,
  mode,
  commands,
  files = [],
  scriptingNodes = [],
  close,
  executeCommand,
  onOpenFile,
  onInsertScriptingNode,
}: {
  isOpen: boolean
  mode: PaletteMode
  commands: CommandItem[]
  files?: FileItem[]
  scriptingNodes?: ScriptingNodeItem[]
  close: () => void
  executeCommand: (id: string) => Promise<void>
  onOpenFile?: (path: string) => void
  onInsertScriptingNode?: (nodeType: string) => void
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

  const groupedResults = useMemo<ResultGroup[]>(() => {
    if (mode !== 'all') return []
    return buildGroupedAllResults(query, commands, files, scriptingNodes)
  }, [mode, commands, files, scriptingNodes, query])

  const filteredItems = useMemo<FilteredPaletteItem[]>(() => {
    if (mode === 'commands') return buildCommandResults(query, commands)
    if (mode === 'files') return buildFileResults(query, files)
    if (mode === 'all') return groupedResults.flatMap((group) => group.items)
    return []
  }, [mode, commands, files, query, groupedResults])

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
      if ('action' in item) {
        await executeCommand(item.id)
      } else if ('path' in item) {
        onOpenFile?.(item.path)
      } else if ('type' in item) {
        onInsertScriptingNode?.(item.type)
      }
    },
    [filteredItems, close, executeCommand, onOpenFile, onInsertScriptingNode]
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
      {/* Backdrop — Deep blur glassmorphism vignette */}
      <div
        className="fixed inset-0 z-50 transition-opacity duration-200"
        style={{
          background: 'radial-gradient(circle at center, rgba(10,14,24,0.4) 0%, rgba(10,14,24,0.9) 100%)',
          backdropFilter: 'blur(16px)',
        }}
        onClick={close}
      />
      
      <div
        className="fixed left-1/2 top-[12%] z-50 w-[840px] max-w-[96vw] -translate-x-1/2"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div 
          className="overflow-hidden rounded-2xl shadow-2xl transition-all duration-300"
          style={{
            background: 'rgba(10,14,24,0.85)',
            border: '1px solid rgba(148,163,184,0.15)',
            boxShadow: '0 32px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05) inset, 0 8px 32px rgba(59,130,246,0.1)',
            backdropFilter: 'blur(32px)',
          }}
        >
          {/* Search bar */}
          <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
            {currentMode.prefix ? (
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded" style={{ color: 'var(--aethel-info)', background: 'color-mix(in srgb, var(--aethel-info) 10%, transparent)' }}>
                {currentMode.prefix}
              </span>
            ) : null}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={currentMode.placeholder}
              className="flex-1 bg-transparent text-base text-[var(--aethel-text-primary)] outline-none placeholder:text-[var(--aethel-text-tertiary)]"
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
              className="w-[45%] overflow-y-auto"
              style={{ borderRight: '1px solid rgba(148,163,184,0.1)', background: 'rgba(0,0,0,0.2)' }}
              role="listbox"
              aria-label="Palette results"
              aria-live="polite"
              aria-atomic="false"
            >
              {!filteredItems.length ? (
                <div className="px-4 py-8 text-center text-xs text-[var(--aethel-text-tertiary)]">
                  {mode === 'all' && !query ? 'Start typing to search everything…' : 'No results found'}
                </div>
              ) : null}

              {mode === 'all' ? (
                <HierarchicalResultList
                  groups={groupedResults}
                  selectedIndex={selectedIndex}
                  onSelect={handleSelect}
                  onHover={setSelectedIndex}
                />
              ) : (
                filteredItems.map((item, index) =>
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
                )
              )}
            </div>

            {/* Right: preview — 55% */}
            <div className="w-[55%] overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[rgba(255,255,255,0.02)] to-transparent pointer-events-none" />
              {showPreview && selectedItem ? (
                <FilePreviewPanel item={selectedItem} query={query} />
              ) : filteredItems.length > 0 ? (
                <div className="flex h-full items-center justify-center text-[11px] text-[var(--aethel-text-tertiary)]">
                  Select an item to preview
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-4 text-[var(--aethel-text-tertiary)]">
                  <div className="text-[12px] font-medium text-[var(--aethel-text-secondary)]">Universal Search</div>
                  <div className="flex gap-2 text-[10px] items-center">
                    <span className="rounded font-mono px-1.5 py-0.5" style={{ background: 'rgba(148,163,184,0.1)', color: 'var(--aethel-text-secondary)' }}>Ctrl+K</span>
                    <span>Search everything</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div 
            className="flex items-center justify-between px-4 py-2 text-[10px]"
            style={{ 
              borderTop: '1px solid rgba(148,163,184,0.1)',
              background: 'rgba(10,14,24,0.6)',
              color: 'var(--aethel-text-tertiary)'
            }}
          >
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <kbd className="rounded font-mono px-1.5 py-0.5" style={{ background: 'rgba(148,163,184,0.1)', color: 'var(--aethel-text-secondary)' }}>Ctrl+K</kbd> 
                Everything
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="rounded font-mono px-1.5 py-0.5" style={{ background: 'rgba(148,163,184,0.1)', color: 'var(--aethel-text-secondary)' }}>Ctrl+Shift+P</kbd> 
                Commands
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="rounded font-mono px-1.5 py-0.5" style={{ background: 'rgba(148,163,184,0.1)', color: 'var(--aethel-text-secondary)' }}>Ctrl+P</kbd> 
                Files
              </span>
            </div>
            <span className="font-mono">{filteredItems.length} results</span>
          </div>
        </div>
      </div>
    </>
  )
}
