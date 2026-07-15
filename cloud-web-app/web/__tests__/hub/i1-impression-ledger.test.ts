/**
 * Hub I.1 impression ledger deepen — durable 2k CAC + budget gates + honesty flip.
 */

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import {
  buildDiscoveryFeed,
  DISCOVERY_LAUNCH_IMPRESSION_BUDGET,
  evaluateDiscoveryEligibility,
  evaluateDiscoveryFeedCapability,
  probeDiscoveryFeedEngine,
  type DiscoveryCandidate,
} from '@/lib/hub/discovery-feed-engine'
import {
  DISCOVERY_LAUNCH_DAILY_IMPRESSION_CAP,
  evaluateLaunchImpressionBudgetGate,
  getImpressionBudget,
  IMPRESSION_LEDGER_BUDGET,
  IMPRESSION_LEDGER_WINDOW_DAYS,
  probeImpressionLedgerWritable,
  recordServedImpression,
  type ImpressionBudgetSnapshot,
} from '@/lib/hub/impression-ledger-authority'
import { evaluateHubHonesty } from '@/lib/hub/hub-honesty-capability'
import { getRouteMaturityEntry } from '@/lib/routes/route-maturity-registry'

const NOW = Date.parse('2026-07-13T12:00:00.000Z')

function candidate(
  partial: Partial<DiscoveryCandidate> & Pick<DiscoveryCandidate, 'gameId' | 'title'>,
): DiscoveryCandidate {
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

function exhaustedBudget(gameId: string): ImpressionBudgetSnapshot {
  return {
    gameId,
    impressionsLogged: DISCOVERY_LAUNCH_IMPRESSION_BUDGET,
    remaining: 0,
    budget: DISCOVERY_LAUNCH_IMPRESSION_BUDGET,
    windowDays: IMPRESSION_LEDGER_WINDOW_DAYS,
    dailyServed: 0,
    dailyCap: DISCOVERY_LAUNCH_DAILY_IMPRESSION_CAP,
    dailyRemaining: DISCOVERY_LAUNCH_DAILY_IMPRESSION_CAP,
    exhausted: true,
  }
}

describe('I.1 impression ledger authority', () => {
  const prev = process.env.AETHEL_HUB_IMPRESSIONS_ROOT
  let tmp: string

  afterEach(async () => {
    if (prev === undefined) delete process.env.AETHEL_HUB_IMPRESSIONS_ROOT
    else process.env.AETHEL_HUB_IMPRESSIONS_ROOT = prev
    if (tmp) {
      await fs.rm(tmp, { recursive: true, force: true }).catch(() => undefined)
    }
  })

  it('persists unique served impressions and enforces 2k budget', async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-i1-impressions-'))
    process.env.AETHEL_HUB_IMPRESSIONS_ROOT = tmp

    expect(IMPRESSION_LEDGER_BUDGET).toBe(2000)
    expect(IMPRESSION_LEDGER_WINDOW_DAYS).toBe(30)

    const first = await recordServedImpression({
      gameId: 'neon-runner',
      viewerKey: 'sess_a',
      nowMs: NOW,
    })
    expect(first.counted).toBe(true)
    expect(first.snapshot.impressionsLogged).toBe(1)
    expect(first.snapshot.remaining).toBe(1999)

    const dedupe = await recordServedImpression({
      gameId: 'neon-runner',
      viewerKey: 'sess_a',
      nowMs: NOW,
    })
    expect(dedupe.counted).toBe(false)
    if (!dedupe.counted) expect(dedupe.code).toBe('DEDUPED')
    expect(dedupe.snapshot.impressionsLogged).toBe(1)

    const second = await recordServedImpression({
      gameId: 'neon-runner',
      viewerKey: 'sess_b',
      nowMs: NOW,
    })
    expect(second.counted).toBe(true)
    expect(second.snapshot.impressionsLogged).toBe(2)

    const snap = await getImpressionBudget('neon-runner', { nowMs: NOW })
    expect(snap.impressionsLogged).toBe(2)
    expect(snap.remaining).toBe(1998)

    const probe = await probeImpressionLedgerWritable()
    expect(probe.writable).toBe(true)
  })

  it('rejects when budget exhausted and when viewer key missing', async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-i1-impressions-'))
    process.env.AETHEL_HUB_IMPRESSIONS_ROOT = tmp

    const file = path.join(tmp, 'spent.json')
    await fs.writeFile(
      file,
      JSON.stringify(
        {
          gameId: 'spent',
          budget: 2,
          windowDays: 30,
          dailyCap: 200,
          events: [
            { viewerKey: 'a', at: '2026-07-13T10:00:00.000Z' },
            { viewerKey: 'b', at: '2026-07-13T11:00:00.000Z' },
          ],
          updatedAt: '2026-07-13T11:00:00.000Z',
        },
        null,
        2,
      ),
      'utf8',
    )

    const exhausted = await recordServedImpression({
      gameId: 'spent',
      viewerKey: 'sess_c',
      nowMs: NOW,
    })
    expect(exhausted.counted).toBe(false)
    if (!exhausted.counted) expect(exhausted.code).toBe('BUDGET_EXHAUSTED')

    const missing = await recordServedImpression({
      gameId: 'neon-runner',
      viewerKey: '',
      nowMs: NOW,
    })
    expect(missing.counted).toBe(false)
    if (!missing.counted) expect(missing.code).toBe('VIEWER_KEY_REQUIRED')
  })

  it('enforces daily cap without inventing counts', async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-i1-impressions-'))
    process.env.AETHEL_HUB_IMPRESSIONS_ROOT = tmp

    const events = Array.from({ length: DISCOVERY_LAUNCH_DAILY_IMPRESSION_CAP }, (_, i) => ({
      viewerKey: `sess_${i}`,
      at: '2026-07-13T08:00:00.000Z',
    }))
    await fs.writeFile(
      path.join(tmp, 'capped.json'),
      JSON.stringify(
        {
          gameId: 'capped',
          budget: 2000,
          windowDays: 30,
          dailyCap: DISCOVERY_LAUNCH_DAILY_IMPRESSION_CAP,
          events,
          updatedAt: '2026-07-13T08:00:00.000Z',
        },
        null,
        2,
      ),
      'utf8',
    )

    const blocked = await recordServedImpression({
      gameId: 'capped',
      viewerKey: 'sess_new',
      nowMs: NOW,
    })
    expect(blocked.counted).toBe(false)
    if (!blocked.counted) expect(blocked.code).toBe('DAILY_CAP')
    expect(blocked.snapshot.impressionsLogged).toBe(DISCOVERY_LAUNCH_DAILY_IMPRESSION_CAP)
  })
})

describe('I.1 discovery respects impression budget', () => {
  it('demotes launch lane when budget exhausted; retention remains', () => {
    const elig = evaluateDiscoveryEligibility(
      candidate({ gameId: 'spent', title: 'Spent' }),
      {
        nowMs: NOW,
        impressionLedgerReady: true,
        impressionBudget: exhaustedBudget('spent'),
      },
    )
    expect(elig.eligible).toBe(true)
    expect(elig.lanes).not.toContain('launch')
    expect(elig.lanes).toContain('retention')
    expect(elig.codes).toContain('BUDGET_EXHAUSTED')
  })

  it('ranks with real impressionsLogged; launchOnly empty-honest when exhausted', () => {
    const feed = buildDiscoveryFeed(
      [
        candidate({
          gameId: 'spent',
          title: 'Spent',
          publishedAt: '2026-07-10T12:00:00.000Z',
        }),
        candidate({
          gameId: 'fresh',
          title: 'Fresh',
          publishedAt: '2026-07-11T12:00:00.000Z',
        }),
      ],
      {
        nowMs: NOW,
        impressionLedgerReady: true,
        impressionBudgets: {
          spent: exhaustedBudget('spent'),
          fresh: {
            gameId: 'fresh',
            impressionsLogged: 12,
            remaining: DISCOVERY_LAUNCH_IMPRESSION_BUDGET - 12,
            budget: DISCOVERY_LAUNCH_IMPRESSION_BUDGET,
            windowDays: 30,
            dailyServed: 12,
            dailyCap: 200,
            dailyRemaining: 188,
            exhausted: false,
          },
        },
      },
    )

    expect(feed.gates.impressionLedger).toBe('IMPLEMENTED')
    expect(feed.items[0].gameId).toBe('fresh')
    expect(feed.items[0].lane).toBe('launch')
    expect(feed.items[0].impressionsLogged).toBe(12)
    expect(feed.items[0].launchImpressionBudget).toBe(1988)
    expect(feed.items[0].impressionLedger).toBe('IMPLEMENTED')

    const spent = feed.items.find((i) => i.gameId === 'spent')
    expect(spent?.lane).toBe('retention')
    expect(spent?.badges).toContain('Launch budget exhausted')

    const launchOnly = buildDiscoveryFeed(
      [candidate({ gameId: 'spent', title: 'Spent' })],
      {
        nowMs: NOW,
        impressionLedgerReady: true,
        launchBudgetOnly: true,
        impressionBudgets: { spent: exhaustedBudget('spent') },
      },
    )
    expect(launchOnly.empty).toBe(true)
    expect(launchOnly.emptyCopy).toMatch(/honest/i)
    expect(launchOnly.emptyCopy).toMatch(/budget/i)
  })

  it('budget gate fails closed when ledger HELD or remaining 0', () => {
    expect(evaluateLaunchImpressionBudgetGate({}).allowed).toBe(false)
    expect(
      evaluateLaunchImpressionBudgetGate({
        impressionLedgerReady: true,
        remaining: 0,
      }).code,
    ).toBe('BUDGET_EXHAUSTED')
    expect(
      evaluateLaunchImpressionBudgetGate({
        impressionLedgerReady: true,
        remaining: 10,
      }).allowed,
    ).toBe(true)
  })
})

describe('I.1 impression ledger honesty flip', () => {
  it('probe flips impressionLedgerReady and marketingLaunchImpressionsAllowed', () => {
    const probe = probeDiscoveryFeedEngine({ impressionLedgerWritable: true })
    expect(probe.ready).toBe(true)
    expect(probe.impressionLedgerReady).toBe(true)
    expect(probe.promotedLaneReady).toBe(false)
    expect(probe.aiModerationReady).toBe(false)

    const cap = evaluateDiscoveryFeedCapability(probe)
    expect(cap.marketingDiscoveryAllowed).toBe(true)
    expect(cap.marketingLaunchImpressionsAllowed).toBe(true)
    expect(cap.marketingAiModeratedDiscoveryAllowed).toBe(false)
    expect(cap.notes.join(' ')).toMatch(/2k impression ledger live/i)
    expect(cap.notes.join(' ')).toMatch(/Promoted \[HELD\]/i)
  })

  it('hub honesty notes flip 2k claim only when ledger ready', () => {
    const rankingOnly = evaluateHubHonesty({
      arcadeCatalogAvailable: true,
      hasPublishedGames: true,
      discoveryFeedReady: true,
    })
    expect(rankingOnly.marketingDiscoveryAllowed).toBe(true)
    expect(rankingOnly.discovery.notes.join(' ')).toMatch(/2k impression ledger/i)
    expect(rankingOnly.discovery.notes.join(' ')).toMatch(/\[HELD\]/)

    const withLedger = evaluateHubHonesty({
      arcadeCatalogAvailable: true,
      hasPublishedGames: true,
      discoveryFeedReady: true,
      impressionLedgerReady: true,
    })
    expect(withLedger.discovery.notes.join(' ')).toMatch(/2k impression ledger live/i)
    expect(withLedger.discovery.notes.join(' ')).not.toMatch(/2k impression ledger \/ Lane C/)
    expect(withLedger.discovery.notes.join(' ')).toMatch(/Promoted \[HELD\]/i)
    expect(withLedger.productCopy).toMatch(/2k/i)
  })

  it('registers Arcade maturity noting impression ledger live', () => {
    const arcade = getRouteMaturityEntry('/arcade')
    expect(arcade?.notes).toMatch(/2k impression ledger/i)
    expect(arcade?.notes).toMatch(/HELD/i)
  })
})
