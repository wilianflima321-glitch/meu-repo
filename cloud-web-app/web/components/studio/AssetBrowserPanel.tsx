'use client'

/**
 * AssetBrowserPanel — grid-based asset picker for the Studio workbench.
 *
 * Features:
 *  - Shimmer-loading skeleton while assets load
 *  - Thumbnail grid with hover glow
 *  - Drag-start payload compatible with the Viewport drop-zone
 *  - Search/filter bar
 *  - Asset type filter chips
 *
 * All colours reference --aethel-* design tokens.
 */

import { useCallback, useMemo, useState } from 'react'
import { Box, FileImage, FileVideo, Music, Search, Shapes } from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type AssetKind = 'mesh' | 'texture' | 'audio' | 'video' | 'material'

export interface StudioAsset {
  id: string
  name: string
  kind: AssetKind
  /** Relative URL to thumbnail image */
  thumbnailUrl?: string
  /** File size label e.g. "12.4 MB" */
  size?: string
  tags?: string[]
}

interface AssetBrowserPanelProps {
  assets?: StudioAsset[]
  isLoading?: boolean
  /** Called when an asset is double-clicked (open in inspector) */
  onOpen?: (asset: StudioAsset) => void
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const KIND_META: Record<AssetKind, { label: string; icon: React.ReactNode; color: string }> = {
  mesh:     { label: 'Mesh',     icon: <Box       className="h-4 w-4" />, color: 'var(--aethel-neon-cyan)'   },
  texture:  { label: 'Texture',  icon: <FileImage className="h-4 w-4" />, color: 'var(--aethel-accent)'      },
  audio:    { label: 'Audio',    icon: <Music     className="h-4 w-4" />, color: 'var(--aethel-warning)'     },
  video:    { label: 'Video',    icon: <FileVideo className="h-4 w-4" />, color: 'var(--aethel-info)'        },
  material: { label: 'Material', icon: <Shapes    className="h-4 w-4" />, color: 'var(--aethel-success)'     },
}

const ALL_KINDS: AssetKind[] = ['mesh', 'texture', 'audio', 'video', 'material']

// Demo assets shown when no real asset list is provided
const DEMO_ASSETS: StudioAsset[] = [
  { id: 'mesh-001', name: 'OrcBoss.fbx',      kind: 'mesh',     size: '8.2 MB',  tags: ['character'] },
  { id: 'mesh-002', name: 'EnvRock_A.fbx',    kind: 'mesh',     size: '1.4 MB',  tags: ['environment'] },
  { id: 'tex-001',  name: 'Cobble_D.png',     kind: 'texture',  size: '4.1 MB',  tags: ['environment'] },
  { id: 'tex-002',  name: 'MetalPlate_N.png', kind: 'texture',  size: '2.8 MB',  tags: ['prop'] },
  { id: 'mat-001',  name: 'GlassShatter.mat', kind: 'material', size: '0.1 MB',  tags: ['vfx'] },
  { id: 'aud-001',  name: 'Footstep_01.wav',  kind: 'audio',    size: '0.3 MB',  tags: ['sfx'] },
  { id: 'vid-001',  name: 'Cutscene_Intro.mp4', kind: 'video',  size: '42.0 MB', tags: ['cinematic'] },
  { id: 'mesh-003', name: 'TreasureChest.fbx', kind: 'mesh',    size: '3.5 MB',  tags: ['prop'] },
]

// ─────────────────────────────────────────────────────────────
// Skeleton tile
// ─────────────────────────────────────────────────────────────

function SkeletonTile() {
  return (
    <div
      className="overflow-hidden rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)]"
      aria-hidden
    >
      <div className="relative h-16 w-full aethel-shimmer" />
      <div className="space-y-1.5 p-2">
        <div className="h-2.5 w-3/4 rounded-full aethel-shimmer" />
        <div className="h-2 w-1/2 rounded-full aethel-shimmer opacity-60" />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Asset tile
// ─────────────────────────────────────────────────────────────

function AssetTile({
  asset,
  onOpen,
}: {
  asset: StudioAsset
  onOpen?: (a: StudioAsset) => void
}) {
  const meta = KIND_META[asset.kind]

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('application/aethel-asset', JSON.stringify({
      id: asset.id,
      name: asset.name,
      kind: asset.kind,
      thumbnailUrl: asset.thumbnailUrl,
    }))
  }, [asset])

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDoubleClick={() => onOpen?.(asset)}
      role="button"
      tabIndex={0}
      aria-label={`Asset: ${asset.name} (${meta.label})`}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen?.(asset) }}
      className="group cursor-grab overflow-hidden rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] transition-all duration-200 hover:border-[color-mix(in_srgb,var(--aethel-neon-cyan)_28%,transparent)] hover:shadow-[0_0_12px_color-mix(in_srgb,var(--aethel-neon-cyan)_8%,transparent)] active:cursor-grabbing focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--aethel-primary)]"
    >
      {/* Thumbnail area */}
      <div
        className="relative flex h-16 w-full items-center justify-center overflow-hidden"
        style={{ background: 'color-mix(in srgb, var(--aethel-surface-elevated) 60%, transparent)' }}
      >
        {asset.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset.thumbnailUrl}
            alt=""
            aria-hidden
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <span style={{ color: meta.color }}>{meta.icon}</span>
        )}

        {/* Kind chip overlaid bottom-right */}
        <span
          className="absolute bottom-1 right-1 rounded px-1 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em]"
          style={{
            color: meta.color,
            background: 'color-mix(in srgb, var(--aethel-surface-elevated) 80%, transparent)',
            border: `1px solid color-mix(in srgb, ${meta.color} 30%, transparent)`,
          }}
        >
          {asset.kind}
        </span>
      </div>

      {/* Meta */}
      <div className="px-2 py-1.5">
        <p className="truncate text-[10px] font-semibold text-[var(--aethel-text-primary)]" title={asset.name}>
          {asset.name}
        </p>
        {asset.size && (
          <p className="text-[9px] text-[var(--aethel-text-quaternary)]">{asset.size}</p>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

export function AssetBrowserPanel({
  assets,
  isLoading = false,
  onOpen,
}: AssetBrowserPanelProps) {
  const [query, setQuery] = useState('')
  const [activeKind, setActiveKind] = useState<AssetKind | null>(null)

  const source = assets ?? DEMO_ASSETS

  const filtered = useMemo(() => {
    let list = source
    if (activeKind) list = list.filter((a) => a.kind === activeKind)
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter((a) =>
        a.name.toLowerCase().includes(q) || a.tags?.some((t) => t.includes(q))
      )
    }
    return list
  }, [source, activeKind, query])

  return (
    <div className="flex h-full flex-col gap-2 text-[11px]">
      {/* Search */}
      <div className="relative shrink-0">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--aethel-text-quaternary)]" aria-hidden />
        <input
          type="search"
          placeholder="Filter assets…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Filter assets"
          className="w-full rounded-lg border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] py-1.5 pl-7 pr-3 text-[11px] text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-quaternary)] outline-none transition focus:border-[color-mix(in_srgb,var(--aethel-primary)_50%,transparent)] focus:ring-0"
        />
      </div>

      {/* Kind filter chips */}
      <div className="flex shrink-0 flex-wrap gap-1" role="group" aria-label="Filter by asset type">
        <button
          type="button"
          onClick={() => setActiveKind(null)}
          aria-pressed={activeKind === null}
          className={[
            'rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] transition',
            activeKind === null
              ? 'border-[color-mix(in_srgb,var(--aethel-primary)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] text-[var(--aethel-primary-light)]'
              : 'border-[var(--aethel-border-subtle)] text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-secondary)]',
          ].join(' ')}
        >
          All
        </button>
        {ALL_KINDS.map((k) => {
          const meta = KIND_META[k]
          const active = activeKind === k
          return (
            <button
              key={k}
              type="button"
              onClick={() => setActiveKind(active ? null : k)}
              aria-pressed={active}
              className={[
                'rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] transition',
                active
                  ? 'border-[color-mix(in_srgb,var(--aethel-neon-cyan)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-neon-cyan)_10%,transparent)] text-[var(--aethel-neon-cyan)]'
                  : 'border-[var(--aethel-border-subtle)] text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-secondary)]',
              ].join(' ')}
            >
              {meta.label}
            </button>
          )
        })}
      </div>

      {/* Grid */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2 pb-2">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonTile key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-8 text-center">
            <Shapes className="h-6 w-6 text-[var(--aethel-text-quaternary)]" aria-hidden />
            <p className="text-[10px] text-[var(--aethel-text-tertiary)]">No assets match your filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 pb-2" role="list" aria-label="Asset grid">
            {filtered.map((asset) => (
              <AssetTile key={asset.id} asset={asset} onOpen={onOpen} />
            ))}
          </div>
        )}
      </div>

      {/* Footer count */}
      <p className="shrink-0 text-[9px] text-[var(--aethel-text-quaternary)]" aria-live="polite">
        {isLoading ? 'Loading…' : `${filtered.length} of ${source.length} assets`}
      </p>
    </div>
  )
}
