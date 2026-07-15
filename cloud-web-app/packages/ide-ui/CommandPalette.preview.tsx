'use client'

import { useEffect, useState } from 'react'
import { CATEGORY_LABELS } from './CommandPalette.parts'
import type { FilteredCommandItem, FilteredFileItem, FilteredNodeItem } from './CommandPalette.search'

// ---------------------------------------------------------------------------
// File preview panel for the two-column Raycast-grade layout
// ---------------------------------------------------------------------------

export function FilePreviewPanel({
  item,
  query,
}: {
  item: FilteredFileItem | FilteredCommandItem | FilteredNodeItem | null
  query: string
}) {
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

  const nodeItem = item && 'type' in item && !('path' in item) ? item : null

  if (nodeItem) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <span className="rounded bg-[color-mix(in_srgb,var(--aethel-info)_14%,transparent)] px-1.5 py-0.5 text-[10px] capitalize text-[var(--aethel-info-light)]">
            {nodeItem.category} node
          </span>
        </div>
        <p className="text-sm font-medium text-[var(--aethel-text-primary)] leading-snug">{nodeItem.label}</p>
        {nodeItem.description && (
          <p className="text-xs text-[var(--aethel-text-secondary)] leading-relaxed">{nodeItem.description}</p>
        )}
        <p className="mt-auto text-[11px] text-[var(--aethel-text-tertiary)]">Press Enter to drop it into the active graph</p>
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
