/**
 * Hub RTv1 / I.5 — F2P taxonomy + tag↔theme tokens.
 * Filters real PublishedGame tags; empty tabs stay empty-honest (no fake catalog).
 */

export type HubPrimaryTabId =
  | 'all'
  | 'f2p'
  | 'free-cosmetics'
  | 'open-source'
  | 'new-rising'

export interface HubPrimaryTab {
  id: HubPrimaryTabId
  label: string
  /** Honest empty copy when filter yields zero rows */
  emptyCopy: string
  /** Tag / keyword matchers (lowercase). Empty = no tag filter (all / new-rising). */
  matchers: string[]
  /** When true, tab is structural UI only until I.1 discovery feed ships */
  discoveryHeld?: boolean
  /** When true, tab depends on Universal Store free cosmetics (Wave H) */
  cosmeticsHeld?: boolean
}

export interface HubMicroTag {
  id: string
  label: string
  matchers: string[]
  /** Law X CSS custom-property overrides (subtle accent shift) */
  theme: {
    accent: string
    accentMuted: string
  }
}

/** Primary Hub tabs — always visible (XIV.5). */
export const HUB_PRIMARY_TABS: readonly HubPrimaryTab[] = [
  {
    id: 'all',
    label: 'All Games',
    emptyCopy: 'No games published yet. Publish a project from the editor to feature it here.',
    matchers: [],
  },
  {
    id: 'f2p',
    label: 'Free to Play',
    emptyCopy:
      'No Free to Play titles match yet. Tag a published game with f2p / free-to-play — empty is honest, not a fake store.',
    matchers: ['f2p', 'free', 'free-to-play', 'free to play', 'freeware'],
  },
  {
    id: 'free-cosmetics',
    label: 'Free Cosmetics',
    emptyCopy:
      'Free Cosmetics tab is empty until Universal Store listings (Wave H) ship. No placeholder SKUs.',
    matchers: ['free-cosmetics', 'free cosmetics', 'cosmetic-free'],
    cosmeticsHeld: true,
  },
  {
    id: 'open-source',
    label: 'Open Source Assets',
    emptyCopy:
      'No open-source tagged titles yet. Tag with open-source / oss / mit — empty is honest.',
    matchers: ['open-source', 'opensource', 'open source', 'oss', 'mit', 'gpl'],
  },
  {
    id: 'new-rising',
    label: 'New & Rising',
    emptyCopy:
      'No titles pass I.1 discovery gates yet (30-day launch window + Compression Mandate). Empty is honest — no fake ranked rows.',
    matchers: [],
    /** Structural hint — Arcade/HubF2PTabs clear [HELD] when discoveryFeedReady. */
    discoveryHeld: true,
  },
] as const

/** Sidebar micro-tags with subtle Law X theme tokens (XIV.5). */
export const HUB_MICRO_TAGS: readonly HubMicroTag[] = [
  {
    id: 'sci-fi',
    label: 'Sci-Fi',
    matchers: ['sci-fi', 'scifi', 'science fiction', 'cyberpunk', 'space'],
    theme: {
      accent: 'var(--aethel-info)',
      accentMuted: 'color-mix(in srgb, var(--aethel-info) 18%, transparent)',
    },
  },
  {
    id: 'horror',
    label: 'Horror',
    matchers: ['horror', 'scary', 'survival-horror'],
    theme: {
      accent: 'var(--aethel-error)',
      accentMuted: 'color-mix(in srgb, var(--aethel-error) 14%, transparent)',
    },
  },
  {
    id: 'multiplayer',
    label: 'Multiplayer',
    matchers: ['multiplayer', 'mp', 'pvp', 'coop', 'co-op'],
    theme: {
      accent: 'var(--aethel-success)',
      accentMuted: 'color-mix(in srgb, var(--aethel-success) 14%, transparent)',
    },
  },
  {
    id: 'lightweight',
    label: 'Lightweight',
    matchers: ['lightweight', 'light', 'casual', 'web-first'],
    theme: {
      accent: 'var(--aethel-accent)',
      accentMuted: 'color-mix(in srgb, var(--aethel-accent) 14%, transparent)',
    },
  },
  {
    id: 'coop',
    label: 'Co-op',
    matchers: ['coop', 'co-op', 'cooperative'],
    theme: {
      accent: 'var(--aethel-warning)',
      accentMuted: 'color-mix(in srgb, var(--aethel-warning) 14%, transparent)',
    },
  },
] as const

export type HubCatalogItem = {
  slug: string
  title: string
  description?: string | null
  tags: string[]
  publishedAt?: string | null
  plays?: number
}

function normalizeHaystack(item: HubCatalogItem): string {
  return [item.title, item.description ?? '', ...item.tags].join(' ').toLowerCase()
}

function matchesAny(haystack: string, matchers: string[]): boolean {
  if (matchers.length === 0) return true
  return matchers.some((m) => haystack.includes(m.toLowerCase()))
}

export function getHubPrimaryTab(id: HubPrimaryTabId): HubPrimaryTab {
  return HUB_PRIMARY_TABS.find((t) => t.id === id) ?? HUB_PRIMARY_TABS[0]
}

export function getHubMicroTag(id: string | null | undefined): HubMicroTag | null {
  if (!id) return null
  return HUB_MICRO_TAGS.find((t) => t.id === id) ?? null
}

/**
 * Filter catalog for a primary tab. Empty result is honest — never invent rows.
 * New & Rising without discovery engine: recency only (not marketed as ranked).
 * Prefer GET /api/hub/feed when I.1 discoveryFeedReady for ranked eligibility.
 */
export function filterHubCatalogByTab(
  items: HubCatalogItem[],
  tabId: HubPrimaryTabId,
): HubCatalogItem[] {
  const tab = getHubPrimaryTab(tabId)

  if (tabId === 'all') return items

  if (tabId === 'new-rising') {
    // Fallback recency sort — Arcade swaps to discovery feed when I.1 live.
    return [...items].sort((a, b) => {
      const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0
      const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0
      if (tb !== ta) return tb - ta
      return (b.plays ?? 0) - (a.plays ?? 0)
    })
  }

  if (tab.cosmeticsHeld) {
    // Universal Store free cosmetics not shipped — always empty-honest.
    return []
  }

  return items.filter((item) => matchesAny(normalizeHaystack(item), tab.matchers))
}

/** Filter by sidebar micro-tag. Empty = honest empty, never fake rows. */
export function filterHubCatalogByMicroTag(
  items: HubCatalogItem[],
  tagId: string | null | undefined,
): HubCatalogItem[] {
  const tag = getHubMicroTag(tagId)
  if (!tag) return items
  return items.filter((item) => matchesAny(normalizeHaystack(item), tag.matchers))
}

/** Collect unique tags present in catalog for taxonomy chips (real only). */
export function collectPresentMicroTagIds(items: HubCatalogItem[]): string[] {
  return HUB_MICRO_TAGS.filter((tag) =>
    items.some((item) => matchesAny(normalizeHaystack(item), tag.matchers)),
  ).map((t) => t.id)
}
