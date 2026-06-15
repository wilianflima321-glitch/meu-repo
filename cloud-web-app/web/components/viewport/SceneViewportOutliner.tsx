'use client'

import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Box, Camera, Eye, EyeOff, Sparkles } from 'lucide-react'
import type { ViewportSceneObject } from '@/components/viewport/AethelViewport3D'

// Frente A8: each hierarchy row is a fixed-height block (border + padding).
// Keep this in sync with the row markup below so the virtualizer estimates
// scroll geometry accurately.
const ROW_HEIGHT = 46

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
  const scrollRef = useRef<HTMLDivElement>(null)
  const rowVirtualizer = useVirtualizer({
    count: objects.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
    getItemKey: (index) => objects[index]?.id ?? index,
  })

  return (
    <div className="flex h-full flex-col bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)]">
      <div className="border-b border-[var(--aethel-border-primary)] px-3 py-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">Hierarchy</p>
            <p className="mt-1 text-xs text-[var(--aethel-text-quaternary)]">Scene graph connected to selection and inspector.</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="rounded-full border border-[var(--aethel-border-subtle)] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">
              {objects.length} items
            </span>
            <span className="rounded-full border border-[var(--aethel-border-subtle)] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">
              {selectedIds.length} selected
            </span>
          </div>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-auto px-2 py-2">
        {objects.length === 0 ? (
          <div className="flex h-full items-center justify-center px-3 text-center">
            <div className="max-w-[220px] rounded-2xl border border-dashed border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_62%,transparent)] px-4 py-5">
              <p className="text-sm font-semibold text-[var(--aethel-text-primary)]">Scene graph is empty</p>
              <p className="mt-2 text-xs leading-5 text-[var(--aethel-text-tertiary)]">Drop an asset or create a primitive to begin editing.</p>
            </div>
          </div>
        ) : (
          <div className="relative w-full" style={{ height: rowVirtualizer.getTotalSize() }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const object = objects[virtualRow.index]
              if (!object) return null
              const active = selectedIds.includes(object.id)
              const Icon = object.type === 'light' ? Sparkles : object.type === 'camera' ? Camera : Box
              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  className="absolute left-0 top-0 w-full"
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  <div className="mb-1 rounded-xl border border-transparent bg-transparent p-1 hover:border-[var(--aethel-border-subtle)]">
                    <div className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition ${active ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_16%,transparent)] text-[var(--aethel-text-primary)]' : 'text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_55%,transparent)]'}`}>
                      <button
                        type="button"
                        aria-label={`Select ${object.name}`}
                        onClick={() => onSelectionChange([object.id])}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        <Icon className="h-4 w-4" />
                        <span className="truncate">{object.name}</span>
                        {object.asset ? (
                          <span className="rounded-full border border-[var(--aethel-border-subtle)] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">
                            {object.asset.format}
                          </span>
                        ) : null}
                      </button>
                      <button
                        type="button"
                        aria-label={`${object.visible === false ? 'Show' : 'Hide'} ${object.name}`}
                        onClick={() => onObjectsChange(objects.map((item) => item.id === object.id ? { ...item, visible: item.visible === false } : item))}
                        className="rounded-md p-1 text-[var(--aethel-text-tertiary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_75%,transparent)] hover:text-[var(--aethel-text-primary)]"
                      >
                        {object.visible === false ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
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
