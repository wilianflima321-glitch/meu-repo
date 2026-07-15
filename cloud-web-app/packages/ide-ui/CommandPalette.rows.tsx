'use client'

import Codicon from './Codicon'
import { CATEGORY_ICONS, CATEGORY_LABELS, highlightMatches } from './CommandPalette.parts'
import type { FilteredCommandItem, FilteredFileItem, FilteredNodeItem, ResultGroup } from './CommandPalette.search'

export function PaletteKeyboardHints() {
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

export function CommandResultRow({
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

export function NodeResultRow({
  item,
  selected,
  onSelect,
  onHover,
}: {
  item: FilteredNodeItem
  selected: boolean
  onSelect: () => void
  onHover: () => void
}) {
  return (
    <button
      type="button"
      aria-label={`Insert scripting node ${item.label}`}
      onClick={onSelect}
      onMouseEnter={onHover}
      role="option"
      aria-selected={selected}
      className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
        selected ? 'bg-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)]' : 'hover:bg-[var(--aethel-surface-tertiary)]/70'
      }`}
    >
      <Codicon name="symbol-method" className="text-[var(--aethel-text-tertiary)]" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs text-[var(--aethel-text-primary)]">{highlightMatches(item.label, item.labelMatch.indices)}</div>
        {item.description ? <div className="truncate text-[11px] text-[var(--aethel-text-tertiary)]">{item.description}</div> : null}
      </div>
      <span className="text-[10px] capitalize text-[var(--aethel-text-tertiary)]">{item.category}</span>
    </button>
  )
}

export function FileResultRow({
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

/**
 * Renders Universal Search (FASE 3.5) results as labeled groups (Commands /
 * Scripting nodes / Files) while keeping a single continuous selection index
 * across all of them — arrow keys move through the whole hierarchy without
 * the user ever needing the mouse.
 */
export function HierarchicalResultList({
  groups,
  selectedIndex,
  onSelect,
  onHover,
}: {
  groups: ResultGroup[]
  selectedIndex: number
  onSelect: (index: number) => void
  onHover: (index: number) => void
}) {
  let runningIndex = -1
  return (
    <>
      {groups.map((group) => (
        <div key={group.label}>
          <div className="sticky top-0 bg-[var(--aethel-surface-primary)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--aethel-text-quaternary)]">
            {group.label}
          </div>
          {group.items.map((item) => {
            runningIndex += 1
            const index = runningIndex
            if ('action' in item) {
              return (
                <CommandResultRow
                  key={item.id}
                  item={item}
                  selected={index === selectedIndex}
                  onSelect={() => onSelect(index)}
                  onHover={() => onHover(index)}
                />
              )
            }
            if ('path' in item) {
              return (
                <FileResultRow
                  key={item.path}
                  item={item}
                  selected={index === selectedIndex}
                  onSelect={() => onSelect(index)}
                  onHover={() => onHover(index)}
                />
              )
            }
            return (
              <NodeResultRow
                key={item.type}
                item={item}
                selected={index === selectedIndex}
                onSelect={() => onSelect(index)}
                onHover={() => onHover(index)}
              />
            )
          })}
        </div>
      ))}
    </>
  )
}
