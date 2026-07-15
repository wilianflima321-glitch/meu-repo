/**
 * Block 8 / Decision #64 — Library-first Foley intake (Treasury + Freesound).
 * Generative SFX is never the default path.
 */

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('audio-library-search')

export type AudioLibrarySource = 'treasury' | 'freesound' | 'first-party' | 'local' | 'partner'

export interface AudioLibraryHit {
  id: string
  title: string
  source: AudioLibrarySource
  license: string
  tags: string[]
  /** Present when a real download URL is known — never invent playable URLs. */
  sourceUrl: string | null
  hash: string | null
  metasoundsGraphId: string | null
  durationSec: number | null
  foleyEligible: true
}

export interface AudioLibrarySearchResult {
  query: string
  hits: AudioLibraryHit[]
  routing: 'library-first'
  generativeFoleyAllowed: false
  generativeCreditsDebited: 0
  planBHint: string
  honestyBadge: 'library-first'
}

export type FoleyProviderLane =
  | { lane: 'library'; generativeDefault: false }
  | { lane: 'generative-plan-b'; generativeDefault: true; requiresCostGuard: true }

/** First-party Treasury Foley pack — metadata only until CDN URL is wired. */
const TREASURY_FOLEY_PACK: AudioLibraryHit[] = [
  {
    id: 'treasury-foley-footstep-stone-01',
    title: 'Footstep Stone 01',
    source: 'first-party',
    license: 'Aethel-First-Party',
    tags: ['footstep', 'stone', 'foley', 'walk'],
    sourceUrl: null,
    hash: 'sha256:treasury-footstep-stone-01',
    metasoundsGraphId: 'ms-footstep-stone',
    durationSec: 0.18,
    foleyEligible: true,
  },
  {
    id: 'treasury-foley-sword-swing-01',
    title: 'Sword Swing 01',
    source: 'treasury',
    license: 'Aethel-First-Party',
    tags: ['sword', 'weapon', 'whoosh', 'foley'],
    sourceUrl: null,
    hash: 'sha256:treasury-sword-swing-01',
    metasoundsGraphId: 'ms-sword-swing',
    durationSec: 0.4,
    foleyEligible: true,
  },
  {
    id: 'treasury-foley-rain-loop-01',
    title: 'Rain Loop Soft',
    source: 'treasury',
    license: 'Aethel-First-Party',
    tags: ['rain', 'weather', 'ambient', 'foley'],
    sourceUrl: null,
    hash: 'sha256:treasury-rain-loop-01',
    metasoundsGraphId: 'ms-rain-loop',
    durationSec: 8,
    foleyEligible: true,
  },
  {
    id: 'treasury-foley-gunshot-01',
    title: 'Gunshot Dry',
    source: 'treasury',
    license: 'Aethel-First-Party',
    tags: ['gunshot', 'weapon', 'impact', 'foley'],
    sourceUrl: null,
    hash: 'sha256:treasury-gunshot-01',
    metasoundsGraphId: 'ms-gunshot',
    durationSec: 0.6,
    foleyEligible: true,
  },
  {
    id: 'treasury-foley-roar-monster-01',
    title: 'Monster Roar Low',
    source: 'treasury',
    license: 'Aethel-First-Party',
    tags: ['roar', 'monster', 'creature', 'foley'],
    sourceUrl: null,
    hash: 'sha256:treasury-roar-monster-01',
    metasoundsGraphId: 'ms-monster-roar',
    durationSec: 1.8,
    foleyEligible: true,
  },
]

/** Curated Freesound-style CC entries — partner search adapter surface (no fake download). */
const FREESOUND_CATALOG: AudioLibraryHit[] = [
  {
    id: 'fs-cc0-impact-wood-01',
    title: 'Wood Impact (CC0 catalog stub)',
    source: 'freesound',
    license: 'CC0',
    tags: ['impact', 'wood', 'foley', 'footstep'],
    sourceUrl: null,
    hash: null,
    metasoundsGraphId: null,
    durationSec: 0.25,
    foleyEligible: true,
  },
  {
    id: 'fs-cc-by-ui-click-01',
    title: 'UI Click Soft (CC-BY catalog stub)',
    source: 'freesound',
    license: 'CC-BY',
    tags: ['ui', 'click', 'foley'],
    sourceUrl: null,
    hash: null,
    metasoundsGraphId: null,
    durationSec: 0.08,
    foleyEligible: true,
  },
]

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1)
}

function scoreClip(clip: AudioLibraryHit, tokens: string[]): number {
  const hay = `${clip.title} ${clip.tags.join(' ')}`.toLowerCase()
  let score = 0
  for (const t of tokens) {
    if (hay.includes(t)) score += 2
  }
  if (clip.source === 'treasury' || clip.source === 'first-party') score += 1
  return score
}

/**
 * Search Treasury first, then Freesound/partner catalog. Never routes to Suno/ElevenLabs.
 * Accepts a plain query string (Block 8 test contract) or structured input.
 */
export function searchAudioLibrary(
  queryOrInput: string | { query: string; tags?: string[]; limit?: number },
): AudioLibrarySearchResult {
  const query = typeof queryOrInput === 'string' ? queryOrInput : queryOrInput.query
  const limit =
    typeof queryOrInput === 'string'
      ? 8
      : Math.max(1, Math.min(24, queryOrInput.limit ?? 8))
  const tokens = tokenize(query || '')
  const pool = [...TREASURY_FOLEY_PACK, ...FREESOUND_CATALOG]

  const ranked = pool
    .map((clip) => ({ clip, score: scoreClip(clip, tokens) }))
    .filter((r) => r.score > 0 || tokens.length === 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.clip)

  const hits =
    ranked.length > 0 ? ranked : TREASURY_FOLEY_PACK.slice(0, Math.min(limit, 3))

  const result: AudioLibrarySearchResult = {
    query,
    hits,
    routing: 'library-first',
    generativeFoleyAllowed: false,
    generativeCreditsDebited: 0,
    planBHint:
      'Generative audio (Suno/ElevenLabs) is Plan B for exclusive sung score + speech only — never default Foley.',
    honestyBadge: 'library-first',
  }

  log.info('audio_library_search', {
    query,
    hits: hits.length,
    sources: [...new Set(hits.map((h) => h.source))],
  })

  return result
}

/** #64 router — Foley stays on library; score/speech may use Plan B gen. */
export function resolveFoleyProviderLane(
  domain: 'foley' | 'score' | 'speech' | string,
): FoleyProviderLane {
  if (domain === 'score' || domain === 'speech') {
    return { lane: 'generative-plan-b', generativeDefault: true, requiresCostGuard: true }
  }
  return { lane: 'library', generativeDefault: false }
}

export function listTreasuryFoleyPack(): readonly AudioLibraryHit[] {
  return TREASURY_FOLEY_PACK
}
