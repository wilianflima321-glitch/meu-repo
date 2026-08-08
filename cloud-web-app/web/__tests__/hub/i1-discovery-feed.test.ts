/**
 * Hub I.1 Discovery Feed engine CORE — gates + retention scorer + honesty flip.
 */

import { describe, expect, it } from 'vitest'

import {
  buildDiscoveryFeed,
  DISCOVERY_LAUNCH_IMPRESSION_BUDGET,
  DISCOVERY_LAUNCH_WINDOW_DAYS,
  DISCOVERY_MAX_DEMO_BUNDLE_BYTES,
  evaluateCompressionMandateGate,
  evaluateDiscoveryAiModerationGate,
  evaluateDiscoveryEligibility,
  evaluateDiscoveryFeedCapability,
  evaluateLaunchWindowGate,
  isDiscoveryFeedUiUnlocked,
  probeDiscoveryFeedEngine,
  smokeCompressionMandateGate,
  smokeLaunchWindowGate,
  type DiscoveryCandidate,
} from '@/lib/hub/discovery-feed-engine'
import { scoreRetention } from '@/lib/hub/retention-scorer'
import {
  evaluateHubDiscoveryGate,
  evaluateHubHonesty,
} from '@/lib/hub/hub-honesty-capability'
import {
  evaluateLiveOpsF2Honesty,
  probeLiveOpsF2Honesty,
} from '@/lib/liveops/liveops-f2-capability'
import { getRouteMaturityEntry } from '@/lib/routes/route-maturity-registry'

const NOW = Date.parse('2026-07-13T12:00:00.000Z')

function candidate(partial: Partial<DiscoveryCandidate> & Pick<DiscoveryCandidate, 'gameId' | 'title'>): DiscoveryCandidate {
  return {
    status: 'playable',
    visibility: 'public',
    tags: ['f2p', 'sci-fi'],
    plays: 10,
    publishedAt: '2026-07-01T12:00:00.000Z',
    compressionMandatePassed: true,
    demoBundleBytes: 40 * 1024 * 1024,
    ...partial,
  }
}

describe('I.1 discovery gates', () => {
  it('enforces 30-day launch window', () => {
    const ok = evaluateLaunchWindowGate({
      publishedAt: '2026-07-01T12:00:00.000Z',
      nowMs: NOW,
    })
    expect(ok.inWindow).toBe(true)
    expect(DISCOVERY_LAUNCH_WINDOW_DAYS).toBe(30)

    const expired = evaluateLaunchWindowGate({
      publishedAt: '2026-05-01T12:00:00.000Z',
      nowMs: NOW,
    })
    expect(expired.inWindow).toBe(false)
    expect(expired.code).toBe('LAUNCH_WINDOW_EXPIRED')

    const missing = evaluateLaunchWindowGate({ publishedAt: null, nowMs: NOW })
    expect(missing.inWindow).toBe(false)
    expect(missing.code).toBe('PUBLISH_DATE_MISSING')
  })

  it('enforces Compression Mandate fail-closed', () => {
    expect(evaluateCompressionMandateGate({}).passed).toBe(false)
    expect(evaluateCompressionMandateGate({ compressionMandatePassed: false }).code).toBe(
      'COMPRESSION_MANDATE',
    )
    expect(
      evaluateCompressionMandateGate({
        compressionMandatePassed: true,
        demoBundleBytes: DISCOVERY_MAX_DEMO_BUNDLE_BYTES + 1,
      }).code,
    ).toBe('DEMO_BUNDLE_OVERSIZE')
    expect(
      evaluateCompressionMandateGate({
        compressionMandatePassed: true,
        demoBundleBytes: 12 * 1024 * 1024,
      }).passed,
    ).toBe(true)
  })

  it('holds AI moderation claim when moderator missing; blocks when ready and not approved', () => {
    const held = evaluateDiscoveryAiModerationGate({})
    expect(held.claimHeld).toBe(true)
    expect(held.passed).toBeNull()
    expect(held.code).toBe('AI_MODERATION_HELD')

    const blocked = evaluateDiscoveryAiModerationGate({
      aiModerationReady: true,
      aiModerationStatus: 'pending',
    })
    expect(blocked.passed).toBe(false)
    expect(blocked.claimHeld).toBe(false)

    const ok = evaluateDiscoveryAiModerationGate({
      aiModerationReady: true,
      aiModerationStatus: 'approved',
    })
    expect(ok.passed).toBe(true)
  })
})

describe('I.1 retention scorer', () => {
  it('scores from real plays + recency without inventing D1', () => {
    const result = scoreRetention({
      plays: 1000,
      publishedAt: '2026-07-01T12:00:00.000Z',
      tagOverlap: 2,
      nowMs: NOW,
    })
    expect(result.score).toBeGreaterThan(0)
    expect(result.provisional).toBe(true)
    expect(result.heldSignals).toContain('d1_return_rate')
    expect(result.notes.join(' ')).toMatch(/HELD|Provisional/i)
  })
})

describe('I.1 discovery feed engine', () => {
  it('returns empty-honest when no candidates pass gates', () => {
    const feed = buildDiscoveryFeed(
      [
        candidate({
          gameId: 'no-cook',
          title: 'No Cook',
          compressionMandatePassed: false,
        }),
      ],
      { nowMs: NOW },
    )
    expect(feed.empty).toBe(true)
    expect(feed.items).toEqual([])
    expect(feed.mock).toBe(false)
    expect(feed.emptyCopy).toMatch(/honest/i)
    expect(feed.gates.impressionLedger).toBe('IMPLEMENTED')
    expect(feed.gates.promotedLane).toBe('HELD')
    expect(feed.gates.aiModerationClaim).toBe('HELD')
  })

  it('ranks eligible titles with real ledger fields; launch boost in window', () => {
    const feed = buildDiscoveryFeed(
      [
        candidate({
          gameId: 'neon-runner',
          title: 'Neon Runner',
          plays: 50,
          publishedAt: '2026-07-10T12:00:00.000Z',
        }),
        candidate({
          gameId: 'old-classic',
          title: 'Old Classic',
          plays: 5000,
          publishedAt: '2025-01-01T12:00:00.000Z',
        }),
        candidate({
          gameId: 'blocked',
          title: 'Blocked',
          compressionMandatePassed: false,
        }),
      ],
      { nowMs: NOW },
    )

    expect(feed.empty).toBe(false)
    expect(feed.items.map((i) => i.gameId)).toEqual(['neon-runner', 'old-classic'])
    expect(feed.items[0].lane).toBe('launch')
    expect(feed.items[1].lane).toBe('retention')
    expect(feed.items[0].rankScore).toBeGreaterThan(feed.items[1].rankScore)
    expect(feed.items[0].impressionsLogged).toBe(0)
    expect(feed.items[0].impressionLedger).toBe('IMPLEMENTED')
    expect(feed.items[0].launchImpressionBudget).toBe(DISCOVERY_LAUNCH_IMPRESSION_BUDGET)
    expect(feed.lanes.promoted).toBe(0)
    expect(feed.items.every((i) => i.badges.includes('AI moderation [HELD]'))).toBe(true)
    expect(feed.items.every((i) => i.badges.includes('2k impression ledger'))).toBe(true)
  })

  it('can hold impression ledger claim when explicitly disabled', () => {
    const feed = buildDiscoveryFeed(
      [candidate({ gameId: 'neon-runner', title: 'Neon Runner' })],
      { nowMs: NOW, impressionLedgerReady: false },
    )
    expect(feed.gates.impressionLedger).toBe('HELD')
    expect(feed.items[0].impressionsLogged).toBeNull()
    expect(feed.items[0].impressionLedger).toBe('HELD')
  })

  it('excludes unapproved titles when AI moderation path is ready', () => {
    const feed = buildDiscoveryFeed(
      [
        candidate({
          gameId: 'clean',
          title: 'Clean',
          aiModerationStatus: 'approved',
        }),
        candidate({
          gameId: 'flagged',
          title: 'Flagged',
          aiModerationStatus: 'flagged',
        }),
      ],
      { nowMs: NOW, aiModerationReady: true },
    )
    expect(feed.items.map((i) => i.gameId)).toEqual(['clean'])
    expect(feed.gates.aiModerationClaim).toBe('IMPLEMENTED')
  })

  it('eligibility requires compression; launch lane only inside window', () => {
    const launch = evaluateDiscoveryEligibility(
      candidate({ gameId: 'a', title: 'A', publishedAt: '2026-07-05T00:00:00.000Z' }),
      { nowMs: NOW },
    )
    expect(launch.eligible).toBe(true)
    expect(launch.lanes).toContain('launch')
    expect(launch.lanes).toContain('retention')

    const retentionOnly = evaluateDiscoveryEligibility(
      candidate({ gameId: 'b', title: 'B', publishedAt: '2025-06-01T00:00:00.000Z' }),
      { nowMs: NOW },
    )
    expect(retentionOnly.eligible).toBe(true)
    expect(retentionOnly.lanes).not.toContain('launch')
    expect(retentionOnly.lanes).toContain('retention')
  })
})

describe('I.1 honesty probes flip discovery readiness', () => {
  it('probeDiscoveryFeedEngine reports ready from gate smokes; ledger + AI-mod stay opt-in fail-closed', () => {
    const bare = probeDiscoveryFeedEngine()
    expect(bare.ready).toBe(true)
    expect(bare.compressionGateReady).toBe(true)
    expect(bare.aiModerationReady).toBe(false)
    // 2k ledger claim must not default true without a writable probe.
    expect(bare.impressionLedgerReady).toBe(false)
    expect(bare.promotedLaneReady).toBe(false)

    const bareCap = evaluateDiscoveryFeedCapability(bare)
    expect(bareCap.discoveryFeedReady).toBe(true)
    expect(bareCap.marketingDiscoveryAllowed).toBe(true)
    expect(bareCap.marketingLaunchImpressionsAllowed).toBe(false)
    expect(bareCap.marketingAiModeratedDiscoveryAllowed).toBe(false)

    const withLedger = probeDiscoveryFeedEngine({ impressionLedgerWritable: true })
    expect(withLedger.impressionLedgerReady).toBe(true)
    expect(evaluateDiscoveryFeedCapability(withLedger).marketingLaunchImpressionsAllowed).toBe(
      true,
    )

    const withMod = probeDiscoveryFeedEngine({
      impressionLedgerWritable: true,
      discoveryModerationWritable: true,
    })
    expect(withMod.aiModerationReady).toBe(true)
    expect(evaluateDiscoveryFeedCapability(withMod).marketingAiModeratedDiscoveryAllowed).toBe(
      true,
    )
  })

  it('smoke gates prove fail-closed contracts at runtime (not hardcoded literals)', () => {
    expect(smokeCompressionMandateGate()).toBe(true)
    expect(smokeLaunchWindowGate()).toBe(true)
  })

  it('fails closed end-to-end when Compression Mandate smoke fails — BLOCKER 3-6 regression guard', () => {
    const brokenProbe = probeDiscoveryFeedEngine({ compressionGateSmokePassed: false })
    expect(brokenProbe.ready).toBe(false)
    expect(brokenProbe.compressionGateReady).toBe(false)

    const cap = evaluateDiscoveryFeedCapability(brokenProbe)
    expect(cap.status).toBe('HELD')
    expect(cap.connectable).toBe(false)
    expect(cap.marketingDiscoveryAllowed).toBe(false)
    expect(cap.marketingLaunchImpressionsAllowed).toBe(false)
    expect(cap.marketingAiModeratedDiscoveryAllowed).toBe(false)

    const hub = evaluateHubHonesty({
      arcadeCatalogAvailable: true,
      hasPublishedGames: true,
      discoveryFeedReady: brokenProbe.ready,
      impressionLedgerReady: true,
      playtimeTelemetryReady: true,
      reviewsStoreReady: true,
    })
    expect(hub.discovery.status).toBe('HELD')
    expect(hub.marketingDiscoveryAllowed).toBe(false)
  })

  it('fails closed end-to-end when 30-day launch window smoke fails — BLOCKER 3-6 regression guard', () => {
    const brokenProbe = probeDiscoveryFeedEngine({ launchWindowSmokePassed: false })
    expect(brokenProbe.ready).toBe(false)
    // Compression smoke may still pass; overall readiness must stay HELD.
    expect(brokenProbe.compressionGateReady).toBe(true)

    const cap = evaluateDiscoveryFeedCapability(brokenProbe)
    expect(cap.status).toBe('HELD')
    expect(cap.marketingDiscoveryAllowed).toBe(false)
    expect(isDiscoveryFeedUiUnlocked({ marketingDiscoveryAllowed: cap.marketingDiscoveryAllowed })).toBe(
      false,
    )
  })

  it('Arcade UI unlock never OR-bypasses marketing honesty with raw discoveryFeedReady — BLOCKER 3-6', () => {
    expect(
      isDiscoveryFeedUiUnlocked({
        marketingDiscoveryAllowed: false,
      }),
    ).toBe(false)
    expect(
      isDiscoveryFeedUiUnlocked({
        marketingDiscoveryAllowed: undefined,
      }),
    ).toBe(false)
    expect(
      isDiscoveryFeedUiUnlocked({
        marketingDiscoveryAllowed: true,
      }),
    ).toBe(true)
  })

  it('hub honesty unlocks marketingDiscoveryAllowed when discoveryFeedReady', () => {
    expect(evaluateHubDiscoveryGate({}).allowed).toBe(false)
    expect(evaluateHubDiscoveryGate({ discoveryFeedReady: true }).allowed).toBe(true)

    const held = evaluateHubHonesty({
      arcadeCatalogAvailable: true,
      hasPublishedGames: true,
    })
    expect(held.discovery.status).toBe('HELD')
    expect(held.marketingDiscoveryAllowed).toBe(false)

    const live = evaluateHubHonesty({
      arcadeCatalogAvailable: true,
      hasPublishedGames: true,
      discoveryFeedReady: true,
      impressionLedgerReady: true,
      playtimeTelemetryReady: true,
      reviewsStoreReady: true,
    })
    expect(live.discovery.status).toBe('IMPLEMENTED')
    expect(live.marketingDiscoveryAllowed).toBe(true)
    expect(live.productCopy).toMatch(/Discovery|Compression|30|2k/i)
    expect(live.discovery.notes.join(' ')).toMatch(/Promoted \[HELD\]|AI moderation/)
  })

  it('probeLiveOpsF2Honesty flips discoveryFeedReady when engine ships', async () => {
    const withFlag = evaluateLiveOpsF2Honesty({
      spoolModuleReady: true,
      playtimeIngestReady: true,
      playerStatsWritable: true,
      discoveryFeedReady: true,
      impressionLedgerReady: true,
      reviewsStoreReady: true,
    })
    expect(withFlag.discoveryFeedReady).toBe(true)
    expect(withFlag.impressionLedgerReady).toBe(true)
    expect(withFlag.discoveryFeed.status).toBe('IMPLEMENTED')

    const report = await probeLiveOpsF2Honesty()
    expect(report.discoveryFeedReady).toBe(true)
    expect(report.impressionLedgerReady).toBe(true)
    expect(report.discoveryFeed.connectable).toBe(true)
    expect(report.reviewsStoreReady).toBe(true)
  })

  it('registers Arcade maturity noting I.1 discovery gates', () => {
    const arcade = getRouteMaturityEntry('/arcade')
    expect(arcade?.notes).toMatch(/I\.1 discovery/i)
    expect(arcade?.notes).toMatch(/HELD/i)
  })
})
