'use client'

import { useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  Box,
  Camera,
  Eye,
  EyeOff,
  Focus,
  Lightbulb,
  Lock,
  Search,
  SunMedium,
  Unlock,
  Volume2,
  X,
} from 'lucide-react'
import type { ViewportSceneObject } from '@/components/viewport/AethelViewport3D'

const ROW_HEIGHT = 48

function getSemanticIcon(type?: string) {
  switch (type) {
    case 'light':
      return { Icon: Lightbulb, color: 'text-[var(--aethel-warning)]' }
    case 'sun':
      return { Icon: SunMedium, color: 'text-[var(--aethel-warning)]' }
    case 'camera':
      return { Icon: Camera, color: 'text-[var(--aethel-neon-cyan)]' }
    case 'audio':
      return { Icon: Volume2, color: 'text-[var(--aethel-success)]' }
    default:
      return { Icon: Box, color: 'text-[var(--aethel-primary)]' }
  }
}

export function SceneViewportOutliner({
  objects,
  selectedIds,
  onSelectionChange,
  onObjectsChange,
}: {
  objects: ViewportSceneObject[]
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  onObjectsChange: (objects: ViewportSceneObject[]) => void
}) {
  const [filterQuery, setFilterQuery] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const filteredObjects = useMemo(() => {
    if (!filterQuery.trim()) return objects
    const q = filterQuery.toLowerCase()
    return objects.filter((o) => o.name.toLowerCase().includes(q) || o.type?.toLowerCase().includes(q))
  }, [objects, filterQuery])

  const rowVirtualizer = useVirtualizer({
    count: filteredObjects.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
    getItemKey: (index) => filteredObjects[index]?.id ?? index,
  })

  // ── Multi-select handlers ──
  const handleItemClick = (e: React.MouseEvent, id: string) => {
    if (e.ctrlKey || e.metaKey) {
      // Toggle additive
      if (selectedIds.includes(id)) {
        onSelectionChange(selectedIds.filter((x) => x !== id))
      } else {
        onSelectionChange([...selectedIds, id])
      }
    } else if (e.shiftKey && selectedIds.length > 0) {
      // Range select
      const lastSelected = selectedIds[selectedIds.length - 1]
      const lastIdx = filteredObjects.findIndex((o) => o.id === lastSelected)
      const currentIdx = filteredObjects.findIndex((o) => o.id === id)
      if (lastIdx !== -1 && currentIdx !== -1) {
        const start = Math.min(lastIdx, currentIdx)
        const end = Math.max(lastIdx, currentIdx)
        const rangeIds = filteredObjects.slice(start, end + 1).map((o) => o.id)
        const merged = Array.from(new Set([...selectedIds, ...rangeIds]))
        onSelectionChange(merged)
        return
      }
      onSelectionChange([id])
    } else {
      onSelectionChange([id])
    }
  }

  // ── Batch operations ──
  const handleBatchLock = (lock: boolean) => {
    const set = new Set(selectedIds)
    onObjectsChange(objects.map((o) => (set.has(o.id) ? { ...o, locked: lock } : o)))
  }

  const handleBatchVisibility = (visible: boolean) => {
    const set = new Set(selectedIds)
    onObjectsChange(objects.map((o) => (set.has(o.id) ? { ...o, visible } : o)))
  }

  const handleBatchDelete = () => {
    const set = new Set(selectedIds)
    onObjectsChange(objects.filter((o) => !set.has(o.id)))
    onSelectionChange([])
  }

  return (
    <div className="flex h-full flex-col bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)]">
      {/* Header */}
      <div className="border-b border-[var(--aethel-border-subtle)] px-3 py-2.5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
            Hierarchy
          </p>
          <div className="flex items-center gap-1.5">
            <span className="rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] px-2 py-0.5 text-[9px] font-mono text-[var(--aethel-text-tertiary)]">
              {objects.length} items
            </span>
            {selectedIds.length > 0 && (
              <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] px-2 py-0.5 text-[9px] font-mono text-[var(--aethel-primary-light)]">
                {selectedIds.length} sel
              </span>
            )}
          </div>
        </div>

        {/* Quick Filter */}
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--aethel-text-quaternary)]" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter scene objects (Shift/Ctrl multi-select)…"
            className="w-full rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_70%,transparent)] py-1.5 pl-8 pr-7 text-xs text-[var(--aethel-text-primary)] placeholder:text-[var(--aethel-text-quaternary)] focus:border-[var(--aethel-primary)] focus:outline-none transition-colors"
          />
          {filterQuery && (
            <button
              type="button"
              onClick={() => setFilterQuery('')}
              aria-label="Clear filter"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Batch Operations Bar */}
        {selectedIds.length > 1 && (
          <div className="mt-2 flex items-center justify-between rounded-lg border border-[color-mix(in_srgb,var(--aethel-primary)_25%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_8%,transparent)] px-2 py-1 text-[10px]">
            <span className="font-mono text-[var(--aethel-primary-light)] font-medium">
              {selectedIds.length} selected
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleBatchLock(true)}
                className="rounded px-1.5 py-0.5 text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-primary)]"
              >
                Lock
              </button>
              <button
                type="button"
                onClick={() => handleBatchLock(false)}
                className="rounded px-1.5 py-0.5 text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-primary)]"
              >
                Unlock
              </button>
              <span className="text-[var(--aethel-border-subtle)]">|</span>
              <button
                type="button"
                onClick={() => handleBatchVisibility(true)}
                className="rounded px-1.5 py-0.5 text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-primary)]"
              >
                Show
              </button>
              <button
                type="button"
                onClick={() => handleBatchVisibility(false)}
                className="rounded px-1.5 py-0.5 text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-primary)]"
              >
                Hide
              </button>
              <span className="text-[var(--aethel-border-subtle)]">|</span>
              <button
                type="button"
                onClick={handleBatchDelete}
                className="rounded px-1.5 py-0.5 text-[var(--aethel-error)] hover:bg-[color-mix(in_srgb,var(--aethel-error)_15%,transparent)] font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* List */}
      <div ref={scrollRef} className="flex-1 overflow-auto px-2 py-2">
        {filteredObjects.length === 0 ? (
          <div className="flex h-full items-center justify-center px-3 text-center">
            <div className="max-w-[220px] rounded-2xl border border-dashed border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_62%,transparent)] px-4 py-5">
              <p className="text-xs font-semibold text-[var(--aethel-text-primary)]">
                {filterQuery ? 'No matching objects' : 'Scene graph is empty'}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--aethel-text-tertiary)]">
                {filterQuery ? 'Try another search term.' : 'Drop an asset or create a primitive to begin.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="relative w-full" style={{ height: rowVirtualizer.getTotalSize() }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const object = filteredObjects[virtualRow.index]
              if (!object) return null
              const active = selectedIds.includes(object.id)
              const { Icon, color } = getSemanticIcon(object.type)
              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  className="absolute left-0 top-0 w-full"
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  <div
                    className={[
                      'group mb-0.5 flex items-center gap-1.5 rounded-xl border px-2 py-2 text-xs transition-all duration-150',
                      active
                        ? 'border-[color-mix(in_srgb,var(--aethel-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_14%,transparent)] text-[var(--aethel-text-primary)] shadow-sm'
                        : 'border-transparent text-[var(--aethel-text-secondary)] hover:border-[var(--aethel-border-subtle)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_55%,transparent)]',
                    ].join(' ')}
                  >
                    {/* Tree depth guide line */}
                    <div
                      aria-hidden="true"
                      className="shrink-0 self-stretch w-[2px] rounded-full bg-[var(--aethel-border-subtle)] opacity-40"
                    />

                    <button
                      type="button"
                      aria-label={`Select ${object.name}`}
                      onClick={(e) => handleItemClick(e, object.id)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
                      <div className="min-w-0 flex-1">
                        <span className="block truncate font-medium leading-tight">{object.name}</span>
                        {object.type && (
                          <span className="text-[9px] text-[var(--aethel-text-quaternary)] capitalize">{object.type}</span>
                        )}
                      </div>
                      {object.asset && (
                        <span className="rounded border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] px-1 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[var(--aethel-text-quaternary)]">
                          {object.asset.format}
                        </span>
                      )}
                    </button>

                    {/* Row actions: Focus · Lock · Visibility */}
                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      {/* Focus / Solo */}
                      <button
                        type="button"
                        aria-label={`Focus camera on ${object.name}`}
                        title="Focus camera (F)"
                        className="rounded p-1 text-[var(--aethel-text-tertiary)] hover:bg-[color-mix(in_srgb,var(--aethel-neon-cyan)_18%,transparent)] hover:text-[var(--aethel-neon-cyan)] transition-colors"
                      >
                        <Focus className="h-3 w-3" />
                      </button>

                      {/* Lock/Unlock */}
                      <button
                        type="button"
                        aria-label={`${object.locked ? 'Unlock' : 'Lock'} ${object.name}`}
                        title={object.locked ? 'Unlock' : 'Lock transform'}
                        onClick={() =>
                          onObjectsChange(
                            objects.map((item) =>
                              item.id === object.id ? { ...item, locked: !item.locked } : item,
                            ),
                          )
                        }
                        className="rounded p-1 text-[var(--aethel-text-tertiary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_75%,transparent)] hover:text-[var(--aethel-text-primary)] transition-colors"
                      >
                        {object.locked ? (
                          <Lock className="h-3 w-3 text-[var(--aethel-warning)]" />
                        ) : (
                          <Unlock className="h-3 w-3" />
                        )}
                      </button>

                      {/* Eye toggle */}
                      <button
                        type="button"
                        aria-label={`${object.visible === false ? 'Show' : 'Hide'} ${object.name}`}
                        title={object.visible === false ? 'Show' : 'Hide'}
                        onClick={() =>
                          onObjectsChange(
                            objects.map((item) =>
                              item.id === object.id ? { ...item, visible: item.visible === false } : item,
                            ),
                          )
                        }
                        className="rounded p-1 text-[var(--aethel-text-tertiary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_75%,transparent)] hover:text-[var(--aethel-text-primary)] transition-colors"
                      >
                        {object.visible === false ? (
                          <EyeOff className="h-3 w-3 text-[var(--aethel-text-quaternary)]" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default SceneViewportOutliner
