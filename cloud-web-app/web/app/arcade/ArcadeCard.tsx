'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  Gamepad2,
  Play,
  Clock,
  Loader2,
  Monitor,
  Users,
  Star,
  Globe,
  ChevronRight,
  Cpu,
  Zap,
} from 'lucide-react'
import { CANONICAL_FOCUS } from '@/lib/canonical-spacing'
import type { ArcadeGame } from './arcade.types'

// ── Status badge (Web Ready / Desktop Exclusive / Building / Held) ────────────

function StatusBadge({
  status,
  noWebDemo,
  listingLabel,
}: {
  status: string
  noWebDemo?: boolean
  listingLabel?: ArcadeGame['listingLabel']
}) {
  if (noWebDemo || listingLabel === 'desktop_exclusive') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_14%,transparent)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--aethel-info-light)] backdrop-blur-sm">
        <Monitor className="h-3 w-3" /> Desktop Exclusive
      </span>
    )
  }
  if (status === 'playable') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_14%,transparent)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--aethel-success-light)] backdrop-blur-sm">
        <Globe className="h-3 w-3" /> Web Ready
      </span>
    )
  }
  if (status === 'building') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_14%,transparent)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--aethel-info-light)] backdrop-blur-sm">
        <Loader2 className="h-3 w-3 animate-spin" /> Building
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_14%,transparent)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--aethel-warning-light)] backdrop-blur-sm">
      <Clock className="h-3 w-3" /> Build pending
    </span>
  )
}

// ── Platform capability chip ─────────────────────────────────────────────────

function PlatformChip({ noWebDemo }: { noWebDemo?: boolean }) {
  if (noWebDemo) {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-[color-mix(in_srgb,var(--aethel-primary)_25%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_10%,transparent)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--aethel-primary-light)]">
        <Cpu className="h-2.5 w-2.5" /> Tauri · Vulkan
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded border border-[color-mix(in_srgb,var(--aethel-neon-cyan)_25%,transparent)] bg-[color-mix(in_srgb,var(--aethel-neon-cyan)_10%,transparent)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--aethel-neon-cyan)]">
      <Zap className="h-2.5 w-2.5" /> WebGL2 · Instant
    </span>
  )
}

// ── Main ArcadeCard ──────────────────────────────────────────────────────────

export function ArcadeCard({ game }: { game: ArcadeGame }) {
  const [isHovered, setIsHovered] = useState(false)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
    hoverTimer.current = setTimeout(() => setShowPreview(true), 300)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    setShowPreview(false)
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current)
      hoverTimer.current = null
    }
  }, [])

  // Format play count to be readable (e.g. 12400 → 12.4k)
  const formattedPlays =
    game.plays >= 1000
      ? `${(game.plays / 1000).toFixed(1)}k`
      : String(game.plays)

  return (
    <Link
      href={`/arcade/${game.slug}`}
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_52%,transparent)] shadow-[var(--aethel-shadow-md)] transition-all duration-300 hover:border-[var(--aethel-border-secondary)] hover:shadow-[0_8px_32px_color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] ${CANONICAL_FOCUS}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* ── Thumbnail / preview zone ─────────────────────── */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)]">
        {game.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={game.thumbnailUrl}
            alt={game.title}
            className={`h-full w-full object-cover transition-transform duration-500 ${isHovered ? 'scale-[1.06]' : 'scale-100'}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[var(--aethel-text-quaternary)]">
            <Gamepad2 className="h-10 w-10" />
          </div>
        )}

        {/* Gradient overlay — always present, stronger on hover */}
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            background:
              'linear-gradient(to top, color-mix(in srgb, var(--aethel-surface-primary) 85%, transparent) 0%, transparent 55%)',
            opacity: isHovered ? 1 : 0.6,
          }}
        />

        {/* Status badge — top-left */}
        <div className="absolute left-3 top-3 z-10">
          <StatusBadge
            status={game.status}
            noWebDemo={game.noWebDemo}
            listingLabel={game.listingLabel}
          />
        </div>

        {/* Play overlay button — appears on hover */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${showPreview ? 'opacity-100' : 'opacity-0'}`}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--aethel-primary)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_22%,transparent)] backdrop-blur-sm transition-transform duration-200 group-hover:scale-110">
            <Play className="h-6 w-6 translate-x-0.5 text-[var(--aethel-text-primary)]" />
          </div>
        </div>

        {/* Platform chip — bottom-right of thumbnail */}
        <div className="absolute bottom-2 right-2 z-10">
          <PlatformChip noWebDemo={game.noWebDemo} />
        </div>
      </div>

      {/* ── Card body ────────────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        {/* Title + author */}
        <div>
          <h3 className="truncate text-[15px] font-bold leading-tight tracking-tight text-[var(--aethel-text-primary)]">
            {game.title}
          </h3>
          <p className="mt-0.5 text-[11px] text-[var(--aethel-text-tertiary)]">
            by {game.authorName}
          </p>
        </div>

        {/* Description — 2 line clamp */}
        {game.description && (
          <p className="line-clamp-2 text-xs leading-[1.65] text-[var(--aethel-text-secondary)]">
            {game.description}
          </p>
        )}

        {/* Genre/tag pills — max 3 */}
        {game.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {game.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] px-2 py-0.5 text-[10px] font-medium text-[var(--aethel-text-tertiary)]"
              >
                {tag}
              </span>
            ))}
            {game.tags.length > 3 && (
              <span className="rounded-full border border-[var(--aethel-border-subtle)] px-2 py-0.5 text-[10px] text-[var(--aethel-text-quaternary)]">
                +{game.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer — stats + CTA */}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-[var(--aethel-border-subtle)] pt-3 text-[11px] text-[var(--aethel-text-tertiary)]">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {formattedPlays} plays
            </span>
            {game.publishedAt && (
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5" />
                New
              </span>
            )}
          </div>
          <span
            className={`inline-flex items-center gap-1 font-semibold transition-colors duration-200 ${isHovered ? 'text-[var(--aethel-primary-light)]' : 'text-[var(--aethel-text-tertiary)]'}`}
          >
            Open <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  )
}
