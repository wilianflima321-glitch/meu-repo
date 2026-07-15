'use client'

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Gamepad2, Sparkles } from 'lucide-react'
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'
import MaturityBadge from '@/components/ui/MaturityBadge'
import { HubHonestyBadge } from '@/components/hub/HubHonestyBadge'
import { HubF2PTabs } from '@/components/hub/HubF2PTabs'
import { DiscoveryFeedPanel } from '@/components/hub/DiscoveryFeedPanel'
import {
  collectPresentMicroTagIds,
  filterHubCatalogByMicroTag,
  filterHubCatalogByTab,
  getHubMicroTag,
  getHubPrimaryTab,
  type HubPrimaryTabId,
} from '@/lib/hub/taxonomy'
import { ArcadeCard } from './ArcadeCard'
import { ArcadeCreatorPanel } from './ArcadeCreatorPanel'
import type { ArcadeGame } from './arcade.types'

type DiscoveryFeedGame = {
  gameId: string
  title: string
  tags: string[]
  publishedAt: string | null
  plays: number
}

export default function ArcadePage() {
  const [games, setGames] = useState<ArcadeGame[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<HubPrimaryTabId>('all')
  const [activeMicroTag, setActiveMicroTag] = useState<string | null>(null)
  const [discoveryFeedReady, setDiscoveryFeedReady] = useState(false)
  const [discoveryItems, setDiscoveryItems] = useState<DiscoveryFeedGame[]>([])
  const [discoveryEmptyCopy, setDiscoveryEmptyCopy] = useState(
    'No titles pass discovery gates yet. Empty is honest — no fake ranked rows.',
  )
  const [discoveryLoading, setDiscoveryLoading] = useState(false)

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

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/runtime/hub-honesty', { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as {
          report?: { marketingDiscoveryAllowed?: boolean }
          f2?: { discoveryFeedReady?: boolean }
        }
        if (cancelled) return
        const ready =
          data.report?.marketingDiscoveryAllowed === true ||
          data.f2?.discoveryFeedReady === true
        setDiscoveryFeedReady(ready)
      } catch {
        // Fail-closed: keep discoveryFeedReady false.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!discoveryFeedReady || activeTab !== 'new-rising') return
    let cancelled = false
    setDiscoveryLoading(true)
    void (async () => {
      try {
        const res = await fetch('/api/hub/feed?limit=48', { cache: 'no-store' })
        if (!res.ok) throw new Error(`feed ${res.status}`)
        const data = (await res.json()) as {
          empty?: boolean
          emptyCopy?: string
          items?: DiscoveryFeedGame[]
        }
        if (cancelled) return
        setDiscoveryItems(Array.isArray(data.items) ? data.items : [])
        if (data.emptyCopy) setDiscoveryEmptyCopy(data.emptyCopy)
      } catch {
        if (!cancelled) {
          setDiscoveryItems([])
          setDiscoveryEmptyCopy(
            'Discovery feed unavailable — empty-honest, no fake ranked rows.',
          )
        }
      } finally {
        if (!cancelled) setDiscoveryLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [discoveryFeedReady, activeTab])

  const presentMicroTagIds = useMemo(() => collectPresentMicroTagIds(games), [games])
  const activeTheme = getHubMicroTag(activeMicroTag)
  const useDiscoveryLane = discoveryFeedReady && activeTab === 'new-rising'

  const filtered = useMemo(() => {
    if (useDiscoveryLane) {
      const bySlug = new Map(games.map((g) => [g.slug, g]))
      const q = search.trim().toLowerCase()
      let list: ArcadeGame[] = discoveryItems.map((item) => {
        const existing = bySlug.get(item.gameId)
        if (existing) return existing
        return {
          slug: item.gameId,
          title: item.title,
          description: null,
          thumbnailUrl: null,
          tags: item.tags,
          status: 'playable',
          plays: item.plays,
          authorName: 'Aethel creator',
          publishedAt: item.publishedAt,
        }
      })
      list = filterHubCatalogByMicroTag(list, activeMicroTag) as ArcadeGame[]
      if (!q) return list
      return list.filter((game) =>
        [game.title, game.description ?? '', game.authorName, ...game.tags]
          .join(' ')
          .toLowerCase()
          .includes(q),
      )
    }

    const q = search.trim().toLowerCase()
    let list = filterHubCatalogByTab(games, activeTab) as ArcadeGame[]
    list = filterHubCatalogByMicroTag(list, activeMicroTag) as ArcadeGame[]
    if (!q) return list
    return list.filter((game) =>
      [game.title, game.description ?? '', game.authorName, ...game.tags]
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }, [
    games,
    search,
    activeTab,
    activeMicroTag,
    useDiscoveryLane,
    discoveryItems,
  ])

  const tabMeta = getHubPrimaryTab(activeTab)
  const emptyCopy = useDiscoveryLane ? discoveryEmptyCopy : tabMeta.emptyCopy
  const gridLoading = loading || (useDiscoveryLane && discoveryLoading)

  const heroStyle: CSSProperties | undefined = activeTheme
    ? {
        background: `linear-gradient(135deg, ${activeTheme.theme.accentMuted}, color-mix(in srgb, var(--aethel-surface-secondary) 58%, transparent))`,
      }
    : undefined

  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <PublicHeader />

      <main id="main-content" className="relative z-10 pb-16">
        <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
          <div
            className="rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_58%,transparent)] p-6 shadow-[var(--aethel-shadow-lg)] lg:p-8"
            style={heroStyle}
          >
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_32%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--aethel-info-light)]">
                <Sparkles className="h-3.5 w-3.5" /> Game Hub · Arcade
              </div>
              <MaturityBadge path="/arcade" />
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-[var(--aethel-text-primary)] sm:text-5xl">
              Play games built in Aethel.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--aethel-text-secondary)] sm:text-base">
              Published creations from the community. F2P tabs filter real tags or stay empty — no fake store.
              Discovery ranks compression-eligible titles in the launch window (empty when none). Hub checkout remains
              [HELD].
            </p>
            <div className="mt-5">
              <HubHonestyBadge />
            </div>
            <div className="mt-6 max-w-md">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search games, tags, or creators..."
                className="h-12 w-full rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_70%,transparent)] px-4 text-sm text-[var(--aethel-text-primary)] outline-none placeholder:text-[var(--aethel-text-quaternary)] focus:border-[color-mix(in_srgb,var(--aethel-info)_55%,transparent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)]"
              />
            </div>
            <div className="mt-6">
              <HubF2PTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                activeMicroTag={activeMicroTag}
                onMicroTagChange={setActiveMicroTag}
                presentMicroTagIds={presentMicroTagIds}
                discoveryFeedReady={discoveryFeedReady}
              />
            </div>
          </div>
        </section>

        <section className="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
          <ArcadeCreatorPanel onPublished={() => void loadGames()} />
        </section>

        {discoveryFeedReady && activeTab === 'new-rising' ? (
          <section className="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
            <DiscoveryFeedPanel enabled limit={8} />
          </section>
        ) : null}

        <section className="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
          {gridLoading ? (
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
                {search
                  ? 'No games match your search'
                  : activeTab !== 'all' || activeMicroTag
                    ? 'Nothing in this filter'
                    : 'No games published yet'}
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--aethel-text-tertiary)]">
                {search
                  ? 'Try a different title, tag, or creator.'
                  : activeTab !== 'all' || activeMicroTag
                    ? emptyCopy
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
