'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Gamepad2, Sparkles } from 'lucide-react'
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'
import { ArcadeCard } from './ArcadeCard'
import { ArcadeCreatorPanel } from './ArcadeCreatorPanel'
import type { ArcadeGame } from './arcade.types'

export default function ArcadePage() {
  const [games, setGames] = useState<ArcadeGame[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const loadGames = useCallback(async () => {
    try {
      const response = await fetch('/api/arcade', { headers: { Accept: 'application/json' } })
      if (!response.ok) return
      const data = (await response.json()) as { games?: ArcadeGame[] }
      setGames(Array.isArray(data.games) ? data.games : [])
    } catch {
      // Honest empty arcade on failure.
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadGames()
  }, [loadGames])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return games
    return games.filter((game) =>
      [game.title, game.description ?? '', game.authorName, ...game.tags]
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }, [games, search])

  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <PublicHeader />

      <main id="main-content" className="relative z-10 pb-16">
        <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_58%,transparent)] p-6 shadow-[var(--aethel-shadow-lg)] lg:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_32%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--aethel-info-light)]">
              <Sparkles className="h-3.5 w-3.5" /> Arcade
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-[var(--aethel-text-primary)] sm:text-5xl">
              Play games built in Aethel.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--aethel-text-secondary)] sm:text-base">
              Published creations from the community. Playable builds run in your browser; others are published and waiting on a web build.
            </p>
            <div className="mt-6 max-w-md">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search games, tags, or creators..."
                className="h-12 w-full rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_70%,transparent)] px-4 text-sm text-[var(--aethel-text-primary)] outline-none placeholder:text-[var(--aethel-text-quaternary)] focus:border-[color-mix(in_srgb,var(--aethel-info)_55%,transparent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)]"
              />
            </div>
          </div>
        </section>

        <section className="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
          <ArcadeCreatorPanel onPublished={() => void loadGames()} />
        </section>

        <section className="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-72 animate-pulse rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)]"
                />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((game) => (
                <ArcadeCard key={game.slug} game={game} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] text-[var(--aethel-text-tertiary)]">
                <Gamepad2 className="h-7 w-7" />
              </div>
              <p className="mt-4 text-lg font-semibold text-[var(--aethel-text-primary)]">
                {search ? 'No games match your search' : 'No games published yet'}
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--aethel-text-tertiary)]">
                {search
                  ? 'Try a different title, tag, or creator.'
                  : 'Publish a project from the editor to feature it here — playable once its web build is ready.'}
              </p>
            </div>
          )}
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
