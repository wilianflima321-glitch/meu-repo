/**
 * Hub RTv1 honesty CORE — I.5/I.6 taxonomy + fail-closed gates.
 */

import { describe, expect, it } from 'vitest'
import {
  evaluateHubCheckoutGate,
  evaluateHubDiscoveryGate,
  evaluateHubHonesty,
  evaluateHubSocialGate,
  evaluateVerifiedReviewGate,
} from '@/lib/hub/hub-honesty-capability'
import {
  collectPresentMicroTagIds,
  filterHubCatalogByMicroTag,
  filterHubCatalogByTab,
  HUB_PRIMARY_TABS,
} from '@/lib/hub/taxonomy'
import { resolveMaturityBadgeForPath } from '@/lib/routes/maturity-badge-resolver'
import { getRouteMaturityEntry } from '@/lib/routes/route-maturity-registry'

const FIXTURE = [
  {
    slug: 'neon-runner',
    title: 'Neon Runner',
    description: 'Cyberpunk dash',
    tags: ['f2p', 'sci-fi', 'cyberpunk'],
    publishedAt: '2026-07-10T12:00:00.000Z',
    plays: 12,
  },
  {
    slug: 'haunted-cabin',
    title: 'Haunted Cabin',
    description: 'Solo horror',
    tags: ['horror'],
    publishedAt: '2026-07-01T12:00:00.000Z',
    plays: 3,
  },
  {
    slug: 'oss-kit',
    title: 'OSS Kit',
    description: 'MIT starter',
    tags: ['open-source', 'mit'],
    publishedAt: '2026-06-01T12:00:00.000Z',
    plays: 40,
  },
]

describe('Hub RTv1 honesty capability', () => {
  it('holds discovery, reviews, social, checkout, coins by default', () => {
    const report = evaluateHubHonesty({
      arcadeCatalogAvailable: true,
      hasPublishedGames: true,
    })
    expect(report.taxonomy.status).toBe('IMPLEMENTED')
    expect(report.showcase.status).toBe('IMPLEMENTED')
    expect(report.discovery.status).toBe('HELD')
    expect(report.reviews.status).toBe('HELD')
    expect(report.social.status).toBe('HELD')
    expect(report.hubCheckout.status).toBe('HELD')
    expect(report.crossPlay.status).toBe('HELD')
    expect(report.marketingDiscoveryAllowed).toBe(false)
    expect(report.marketingVerifiedReviewsAllowed).toBe(false)
    expect(report.marketingSocialPartyAllowed).toBe(false)
    expect(report.marketingHubCheckoutAllowed).toBe(false)
    expect(report.marketingCoinsAllowed).toBe(false)
    expect(report.marketingCrossPlayAllowed).toBe(false)
    expect(report.productCopy).toMatch(/\[HELD\]/)
  })

  it('unlocks marketing flags only when surfaces are live', () => {
    const report = evaluateHubHonesty({
      arcadeCatalogAvailable: true,
      hasPublishedGames: true,
      playtimeTelemetryReady: true,
      reviewsStoreReady: true,
      discoveryFeedReady: true,
      socialModerationReady: true,
      socialPartyReady: true,
      hubCheckoutAudited: true,
      crossPlayReady: true,
    })
    expect(report.discovery.status).toBe('IMPLEMENTED')
    expect(report.reviews.status).toBe('IMPLEMENTED')
    expect(report.social.status).toBe('IMPLEMENTED')
    expect(report.hubCheckout.status).toBe('IMPLEMENTED')
    expect(report.crossPlay.status).toBe('IMPLEMENTED')
    expect(report.marketingDiscoveryAllowed).toBe(true)
    expect(report.marketingVerifiedReviewsAllowed).toBe(true)
    expect(report.marketingSocialModerationAllowed).toBe(true)
    expect(report.marketingSocialPartyAllowed).toBe(true)
    expect(report.marketingHubCheckoutAllowed).toBe(true)
    expect(report.marketingCoinsAllowed).toBe(true)
    expect(report.marketingCrossPlayAllowed).toBe(true)
  })

  it('flips Report/Block marketing without unlocking party', () => {
    const report = evaluateHubHonesty({
      arcadeCatalogAvailable: true,
      hasPublishedGames: true,
      socialModerationReady: true,
      socialPartyReady: false,
    })
    expect(report.social.status).toBe('PARTIAL')
    expect(report.marketingSocialModerationAllowed).toBe(true)
    expect(report.marketingSocialPartyAllowed).toBe(false)
  })

  it('keeps reviews fail-closed when F.2 playtime is live but GameReview store is not', () => {
    const report = evaluateHubHonesty({
      arcadeCatalogAvailable: true,
      hasPublishedGames: true,
      playtimeTelemetryReady: true,
      reviewsStoreReady: false,
    })
    expect(report.reviews.status).toBe('PARTIAL')
    expect(report.reviews.connectable).toBe(false)
    expect(report.reviews.heldReason).toBe('reviews_store_held')
    expect(report.marketingVerifiedReviewsAllowed).toBe(false)
    expect(report.discovery.status).toBe('HELD')
    expect(report.marketingDiscoveryAllowed).toBe(false)
  })
})

describe('Hub RTv1 fail-closed gates', () => {
  it('blocks verified reviews without F.2 playtime', () => {
    const held = evaluateVerifiedReviewGate({})
    expect(held.allowed).toBe(false)
    expect(held.code).toBe('REVIEWS_HELD')

    const storeHeld = evaluateVerifiedReviewGate({
      playtimeTelemetryReady: true,
      playtimeSeconds: 7200,
    })
    expect(storeHeld.allowed).toBe(false)
    expect(storeHeld.code).toBe('REVIEWS_STORE_HELD')

    const short = evaluateVerifiedReviewGate({
      playtimeTelemetryReady: true,
      reviewsStoreReady: true,
      playtimeSeconds: 100,
    })
    expect(short.allowed).toBe(false)
    expect(short.code).toBe('PLAYTIME_GATE')

    const ok = evaluateVerifiedReviewGate({
      playtimeTelemetryReady: true,
      reviewsStoreReady: true,
      playtimeSeconds: 7200,
    })
    expect(ok.allowed).toBe(true)
  })

  it('blocks Hub checkout and social and discovery by default', () => {
    expect(evaluateHubCheckoutGate().allowed).toBe(false)
    expect(evaluateHubCheckoutGate().code).toBe('HUB_CHECKOUT_HELD')
    expect(evaluateHubSocialGate().allowed).toBe(false)
    expect(evaluateHubSocialGate().code).toBe('SOCIAL_HELD')
    expect(
      evaluateHubSocialGate({ socialModerationReady: true }).code,
    ).toBe('SOCIAL_PARTY_HELD')
    expect(evaluateHubDiscoveryGate().allowed).toBe(false)
    expect(evaluateHubDiscoveryGate().code).toBe('DISCOVERY_HELD')
  })
})

describe('Hub I.5 taxonomy filters', () => {
  it('exposes primary F2P tabs', () => {
    expect(HUB_PRIMARY_TABS.map((t) => t.id)).toEqual([
      'all',
      'f2p',
      'free-cosmetics',
      'open-source',
      'new-rising',
    ])
  })

  it('filters F2P and open-source from real tags; empty is honest', () => {
    const f2p = filterHubCatalogByTab(FIXTURE, 'f2p')
    expect(f2p.map((g) => g.slug)).toEqual(['neon-runner'])

    const oss = filterHubCatalogByTab(FIXTURE, 'open-source')
    expect(oss.map((g) => g.slug)).toEqual(['oss-kit'])

    const cosmetics = filterHubCatalogByTab(FIXTURE, 'free-cosmetics')
    expect(cosmetics).toEqual([])

    const horror = filterHubCatalogByMicroTag(FIXTURE, 'horror')
    expect(horror.map((g) => g.slug)).toEqual(['haunted-cabin'])

    const none = filterHubCatalogByMicroTag(FIXTURE, 'lightweight')
    expect(none).toEqual([])
  })

  it('sorts New & Rising by recency without claiming discovery algo when engine not wired', () => {
    const rising = filterHubCatalogByTab(FIXTURE, 'new-rising')
    expect(rising[0].slug).toBe('neon-runner')
    expect(rising.map((g) => g.slug)).toEqual(['neon-runner', 'haunted-cabin', 'oss-kit'])
  })

  it('collects only micro-tags present in catalog', () => {
    const ids = collectPresentMicroTagIds(FIXTURE)
    expect(ids).toContain('sci-fi')
    expect(ids).toContain('horror')
    expect(ids).not.toContain('lightweight')
  })
})

describe('Hub route maturity', () => {
  it('registers /arcade and /hub with maturity badges', () => {
    const arcade = getRouteMaturityEntry('/arcade')
    expect(arcade?.maturity).toBe('BETA')
    expect(arcade?.notes).toMatch(/Hub|Showcase|HELD/i)
    expect(arcade?.notes).toMatch(/I\.2|GameReview|2h/i)
    expect(arcade?.notes).toMatch(/I\.1 discovery/i)
    expect(arcade?.notes).toMatch(/I\.4 Report\/Block\/COPPA/i)
    expect(arcade?.notes).toMatch(/I\.8/i)

    const hub = getRouteMaturityEntry('/hub')
    expect(hub?.maturity).toBe('BETA')
    expect(hub?.notes).toMatch(/arcade/i)

    const badge = resolveMaturityBadgeForPath('/arcade')
    expect(badge).not.toBeNull()
    expect(badge?.maturity).toBe('BETA')
  })
})
