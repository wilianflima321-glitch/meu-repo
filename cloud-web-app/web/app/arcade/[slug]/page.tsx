'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, Gamepad2, Monitor, Play } from 'lucide-react'
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'
import MaturityBadge from '@/components/ui/MaturityBadge'
import { HubHonestyBadge } from '@/components/hub/HubHonestyBadge'
import { ShowcaseHonestyPanels } from '@/components/hub/ShowcaseHonestyPanels'
import { CANONICAL_FOCUS } from '@/lib/canonical-spacing'
import { useArcadePlaytimeSession } from '@/lib/liveops/useArcadePlaytimeSession'
import type { ArcadeGameDetail } from '../arcade.types'

type LoadState = 'loading' | 'ready' | 'notfound' | 'error'

export default function ArcadeDetailPage() {
  const params = useParams<{ slug: string }>()
  const slug = typeof params?.slug === 'string' ? params.slug : Array.isArray(params?.slug) ? params.slug[0] : ''

  const [game, setGame] = useState<ArcadeGameDetail | null>(null)
  const [state, setState] = useState<LoadState>('loading')
  const [playing, setPlaying] = useState(false)

  const playUrl = game?.demoPlayUrl ?? game?.playUrl ?? null
  const sessionActive = Boolean(playing && game?.playable && playUrl && game?.slug)

  // F.2 — real playtime telemetry while Arcade Instant Play is active.
  useArcadePlaytimeSession({
    gameId: game?.slug,
    active: sessionActive,
  })

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    void (async () => {
      try {
        const response = await fetch(`/api/arcade/${encodeURIComponent(slug)}`, { headers: { Accept: 'application/json' } })
        if (response.status === 404) {
          if (!cancelled) setState('notfound')
          return
        }
        if (!response.ok) {
          if (!cancelled) setState('error')
          return
        }
        const data = (await response.json()) as { game?: ArcadeGameDetail }
        if (cancelled) return
        if (!data.game) {
          setState('notfound')
          return
        }
        setGame(data.game)
        setState('ready')
      } catch {
        if (!cancelled) setState('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  const startPlaying = () => {
    setPlaying(true)
    // Best-effort play counter; never blocks playback.
    void fetch(`/api/arcade/${encodeURIComponent(slug)}`, { method: 'POST' }).catch(() => {})
  }

  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <PublicHeader />

      <main id="main-content" className="relative z-10 mx-auto max-w-5xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/arcade"
            className={`inline-flex items-center gap-2 rounded-lg px-1 text-sm text-[var(--aethel-text-tertiary)] transition hover:text-[var(--aethel-text-primary)] ${CANONICAL_FOCUS}`}
          >
            <ArrowLeft className="h-4 w-4" /> Back to Game Hub
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <MaturityBadge path="/arcade" />
            <HubHonestyBadge compact />
          </div>
        </div>

        {state === 'loading' ? (
          <div className="mt-6 h-[420px] animate-pulse rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)]" />
        ) : null}

        {state === 'notfound' ? (
          <div className="mt-6 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] px-6 py-16 text-center">
            <p className="text-lg font-semibold text-[var(--aethel-text-primary)]">Game not found</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--aethel-text-tertiary)]">
              This game may have been unpublished or set to private.
            </p>
          </div>
        ) : null}

        {state === 'error' ? (
          <div className="mt-6 rounded-2xl border border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] px-6 py-12 text-center">
            <p className="text-sm text-[var(--aethel-error-light)]">Could not load this game. Please try again.</p>
          </div>
        ) : null}

        {state === 'ready' && game ? (
          <>
            <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_44%,transparent)] shadow-[var(--aethel-shadow-lg)]">
              <div className="relative aspect-[16/9] w-full bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)]">
                {playing && game.playable && playUrl ? (
                  <iframe
                    src={playUrl}
                    title={game.title}
                    className="h-full w-full border-0"
                    allow="autoplay; fullscreen; gamepad; xr-spatial-tracking"
                    sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-popups"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-6 text-center">
                    {game.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={game.thumbnailUrl} alt={game.title} className="absolute inset-0 h-full w-full object-cover opacity-40" />
                    ) : null}
                    <div className="relative">
                      {game.playable && playUrl ? (
                        <button
                          type="button"
                          onClick={startPlaying}
                          className={`inline-flex items-center gap-2 rounded-xl bg-[var(--aethel-primary)] px-6 py-3 text-sm font-semibold text-[var(--aethel-text-inverse)] shadow-[var(--aethel-shadow-md)] transition hover:brightness-110 ${CANONICAL_FOCUS}`}
                        >
                          <Play className="h-4 w-4" /> Play now
                        </button>
                      ) : game.noWebDemo || game.listingLabel === 'desktop_exclusive' ? (
                        <div className="inline-flex items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] px-5 py-3 text-sm font-semibold text-[var(--aethel-info-light)]">
                          <Monitor className="h-4 w-4" /> Desktop Exclusive — no web demo
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] px-5 py-3 text-sm font-semibold text-[var(--aethel-warning-light)]">
                          <Clock className="h-4 w-4" /> Build pending — not yet playable
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-[var(--aethel-text-primary)]">
                  <Gamepad2 className="h-5 w-5 text-[var(--aethel-info-light)]" /> {game.title}
                </h1>
                <p className="mt-1 text-sm text-[var(--aethel-text-tertiary)]">
                  by {game.authorName} · {game.plays} plays
                </p>
              </div>
              {game.playable && playUrl && !playing ? (
                <button
                  type="button"
                  onClick={startPlaying}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-xl bg-[var(--aethel-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--aethel-text-inverse)] transition hover:brightness-110 ${CANONICAL_FOCUS}`}
                >
                  <Play className="h-4 w-4" /> Play
                </button>
              ) : null}
            </div>

            {game.description ? (
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--aethel-text-secondary)]">{game.description}</p>
            ) : null}

            {game.tags.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {game.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[var(--aethel-border-subtle)] px-3 py-1 text-xs text-[var(--aethel-text-tertiary)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}

            {game.noWebDemo || game.listingLabel === 'desktop_exclusive' ? (
              <p className="mt-6 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] px-4 py-3 text-xs leading-5 text-[var(--aethel-text-tertiary)]">
                <span className="font-semibold text-[var(--aethel-info-light)]">Desktop Exclusive</span>
                {' '}No Instant Play web demo is listed for this title. Hub discovery Instant Play stays
                closed — download/desktop path only (no fake browser play CTA).
              </p>
            ) : !game.playable ? (
              <p className="mt-6 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] px-4 py-3 text-xs leading-5 text-[var(--aethel-text-tertiary)]">
                <span className="font-semibold text-[var(--aethel-warning-light)]">[HELD]</span>
                {' '}This game is published but its browser build is not ready yet. No fake Install —
                the creator needs a real Web export (and Law XV bake evidence) before Arcade play.
              </p>
            ) : null}

            <ShowcaseHonestyPanels
              playable={game.playable}
              tags={game.tags}
              gameId={game.slug}
              noWebDemo={game.noWebDemo === true}
            />
          </>
        ) : null}
      </main>

      <PublicFooter />
    </div>
  )
}
