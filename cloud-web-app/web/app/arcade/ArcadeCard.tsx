import Link from 'next/link'
import { Gamepad2, Play, Clock, Loader2 } from 'lucide-react'
import { CANONICAL_FOCUS } from '@/lib/canonical-spacing'
import type { ArcadeGame } from './arcade.types'

function StatusBadge({ status }: { status: string }) {
  if (status === 'playable') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--aethel-success-light)]">
        <Play className="h-3 w-3" /> Playable
      </span>
    )
  }
  if (status === 'building') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--aethel-info-light)]">
        <Loader2 className="h-3 w-3 animate-spin" /> Building
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--aethel-warning-light)]">
      <Clock className="h-3 w-3" /> [HELD] Build pending
    </span>
  )
}

export function ArcadeCard({ game }: { game: ArcadeGame }) {
  return (
    <Link
      href={`/arcade/${game.slug}`}
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_52%,transparent)] shadow-[var(--aethel-shadow-md)] transition hover:border-[var(--aethel-border-secondary)] ${CANONICAL_FOCUS}`}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)]">
        {game.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={game.thumbnailUrl}
            alt={game.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[var(--aethel-text-quaternary)]">
            <Gamepad2 className="h-10 w-10" />
          </div>
        )}
        <div className="absolute left-3 top-3">
          <StatusBadge status={game.status} />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="truncate text-base font-semibold text-[var(--aethel-text-primary)]">{game.title}</h3>
        <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">by {game.authorName}</p>
        {game.description ? (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">{game.description}</p>
        ) : null}

        {game.tags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {game.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[var(--aethel-border-subtle)] px-2 py-0.5 text-[10px] text-[var(--aethel-text-tertiary)]"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2 pt-4 text-[11px] text-[var(--aethel-text-tertiary)]">
          <span className="inline-flex items-center gap-1.5">
            <Play className="h-3.5 w-3.5" /> {game.plays} plays
          </span>
          <span className="font-semibold text-[var(--aethel-info-light)]">Open</span>
        </div>
      </div>
    </Link>
  )
}
