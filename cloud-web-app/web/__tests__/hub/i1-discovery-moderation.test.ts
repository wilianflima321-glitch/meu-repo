/**
 * Hub I.1 AI moderation discovery deepen — deterministic + optional BYOK LLM + honesty flip.
 */

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import {
  buildDiscoveryFeed,
  evaluateDiscoveryFeedCapability,
  probeDiscoveryFeedEngine,
  type DiscoveryCandidate,
} from '@/lib/hub/discovery-feed-engine'
import {
  evaluateDiscoveryModerationHonesty,
  probeDiscoveryModerationHonesty,
} from '@/lib/hub/discovery-moderation-capability'
import {
  getDiscoveryModeration,
  probeDiscoveryModerationWritable,
  upsertDiscoveryModeration,
} from '@/lib/hub/discovery-moderation-authority'
import {
  evaluateDiscoveryContentModeration,
  persistDiscoveryContentModeration,
  runDiscoveryModerationLlmReview,
  smokeDiscoveryModerationPipeline,
} from '@/lib/hub/discovery-moderation-engine'
import { createMockDiscoveryModerationProvider } from '@/lib/hub/discovery-moderation-llm-provider'
import { evaluateHubHonesty } from '@/lib/hub/hub-honesty-capability'
import {
  __resetCreativeCostGuardForTests,
  createMemoryCostGuardLedger,
} from '@/lib/production/creative-cost-guard'
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

describe('I.1 discovery content moderation deterministic', () => {
  it('approves clean listings and rejects deny-list hits', () => {
    const ok = evaluateDiscoveryContentModeration({
      gameId: 'neon-runner',
      title: 'Neon Runner',
      tags: ['f2p', 'sci-fi'],
    })
    expect(ok.status).toBe('approved')
    expect(ok.deterministic).toBe(true)
    expect(ok.codes).toContain('DETERMINISTIC_CLEAR')

    const denied = evaluateDiscoveryContentModeration({
      gameId: 'bad',
      title: 'phishing kit demo',
      tags: ['f2p'],
    })
    expect(denied.status).toBe('rejected')
    expect(denied.codes).toContain('DENY_LIST')
    expect(denied.matchedDenyTerms.length).toBeGreaterThan(0)

    const tagDenied = evaluateDiscoveryContentModeration({
      gameId: 'tag-bad',
      title: 'Odd Title',
      tags: ['csam'],
    })
    expect(tagDenied.status).toBe('rejected')
    expect(tagDenied.matchedDenyTags).toContain('csam')
  })

  it('routes thin listings to manual_review', () => {
    const thin = evaluateDiscoveryContentModeration({
      gameId: 'ab',
      title: 'ab',
    })
    expect(thin.status).toBe('manual_review')
    expect(thin.codes).toContain('THIN_LISTING')
  })

  it('smokeDiscoveryModerationPipeline passes', () => {
    expect(smokeDiscoveryModerationPipeline()).toBe(true)
  })
})

describe('I.1 discovery moderation authority', () => {
  const prev = process.env.AETHEL_HUB_DISCOVERY_MODERATION_ROOT
  let tmp: string

  afterEach(async () => {
    if (prev === undefined) delete process.env.AETHEL_HUB_DISCOVERY_MODERATION_ROOT
    else process.env.AETHEL_HUB_DISCOVERY_MODERATION_ROOT = prev
    if (tmp) {
      await fs.rm(tmp, { recursive: true, force: true }).catch(() => undefined)
    }
  })

  it('persists status and probe reports writable', async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-i1-discmod-'))
    process.env.AETHEL_HUB_DISCOVERY_MODERATION_ROOT = tmp

    const probe = await probeDiscoveryModerationWritable()
    expect(probe.writable).toBe(true)

    const { record, reused } = await persistDiscoveryContentModeration({
      gameId: 'neon-runner',
      title: 'Neon Runner',
      tags: ['f2p'],
    })
    expect(reused).toBe(false)
    expect(record.status).toBe('approved')

    const again = await persistDiscoveryContentModeration({
      gameId: 'neon-runner',
      title: 'Neon Runner',
      tags: ['f2p'],
    })
    expect(again.reused).toBe(true)

    const loaded = await getDiscoveryModeration('neon-runner')
    expect(loaded?.status).toBe('approved')

    await upsertDiscoveryModeration({
      gameId: 'flagged-title',
      status: 'flagged',
      codes: ['MANUAL'],
      reasons: ['ops'],
      source: 'manual',
    })
    expect((await getDiscoveryModeration('flagged-title'))?.status).toBe('flagged')
  })
})

describe('I.1 discovery moderation optional LLM (mock provider only)', () => {
  const prev = process.env.AETHEL_HUB_DISCOVERY_MODERATION_ROOT
  let tmp: string

  afterEach(async () => {
    __resetCreativeCostGuardForTests()
    if (prev === undefined) delete process.env.AETHEL_HUB_DISCOVERY_MODERATION_ROOT
    else process.env.AETHEL_HUB_DISCOVERY_MODERATION_ROOT = prev
    if (tmp) {
      await fs.rm(tmp, { recursive: true, force: true }).catch(() => undefined)
    }
  })

  it('fails closed on free tier without BYOK — no platform invent', async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-i1-discmod-llm-'))
    process.env.AETHEL_HUB_DISCOVERY_MODERATION_ROOT = tmp
    const adapter = createMemoryCostGuardLedger()
    const provider = createMockDiscoveryModerationProvider({ verdict: 'approved' })

    const result = await runDiscoveryModerationLlmReview({
      candidate: { gameId: 'thin', title: 'ab' },
      adapter,
      provider,
      userId: 'u1',
      planId: 'free',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('BYOK_REQUIRED')
      expect(result.status).toBe('manual_review')
    }
  })

  it('runs mock LLM critic behind BYOK CostGuard', async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-i1-discmod-llm-'))
    process.env.AETHEL_HUB_DISCOVERY_MODERATION_ROOT = tmp
    const adapter = createMemoryCostGuardLedger()
    adapter.enableByok('u1')
    const provider = createMockDiscoveryModerationProvider({
      verdict: 'approved',
      reason: 'mock_clear',
      tokenWeight: 20,
    })

    const result = await runDiscoveryModerationLlmReview({
      candidate: { gameId: 'thin', title: 'ab' },
      adapter,
      provider,
      userId: 'u1',
      planId: 'free',
      byokProfileId: 'byok-1',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.status).toBe('approved')
      expect(result.funding).toBe('byok')
      expect(result.provider).toBe('mock-discovery-moderation')
    }
  })

  it('skips LLM when deterministic already decided', async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-i1-discmod-llm-'))
    process.env.AETHEL_HUB_DISCOVERY_MODERATION_ROOT = tmp
    const adapter = createMemoryCostGuardLedger()
    adapter.enableByok('u1')
    let called = 0
    const provider = createMockDiscoveryModerationProvider(() => {
      called += 1
      return {
        verdict: 'approved',
        reason: 'should_not_run',
        tokenWeight: 10,
        provider: 'mock-discovery-moderation',
      }
    })

    const result = await runDiscoveryModerationLlmReview({
      candidate: { gameId: 'neon', title: 'Neon Runner', tags: ['f2p'] },
      adapter,
      provider,
      userId: 'u1',
      byokProfileId: 'byok-1',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('LLM_NOT_NEEDED')
    expect(called).toBe(0)
  })
})

describe('I.1 AI moderation feed gate + honesty flip', () => {
  it('excludes unapproved when path ready; empty-honest when all blocked', () => {
    const feed = buildDiscoveryFeed(
      [
        candidate({
          gameId: 'clean',
          title: 'Clean',
          aiModerationStatus: 'approved',
        }),
        candidate({
          gameId: 'pending',
          title: 'Pending',
          aiModerationStatus: 'pending',
        }),
      ],
      { nowMs: NOW, aiModerationReady: true },
    )
    expect(feed.items.map((i) => i.gameId)).toEqual(['clean'])
    expect(feed.gates.aiModerationClaim).toBe('IMPLEMENTED')
    expect(feed.items[0].badges).toContain('AI moderated')

    const empty = buildDiscoveryFeed(
      [
        candidate({
          gameId: 'blocked',
          title: 'Blocked',
          aiModerationStatus: 'rejected',
        }),
      ],
      { nowMs: NOW, aiModerationReady: true },
    )
    expect(empty.empty).toBe(true)
    expect(empty.emptyCopy).toMatch(/AI moderation/i)
  })

  it('flips marketingAiModeratedDiscoveryAllowed only when probe ready', () => {
    const held = evaluateDiscoveryModerationHonesty({
      moderationStoreWritable: false,
      pipelineSmokePassed: true,
    })
    expect(held.aiModerationReady).toBe(false)
    expect(held.marketingAiModeratedDiscoveryAllowed).toBe(false)

    const live = evaluateDiscoveryModerationHonesty({
      moderationStoreWritable: true,
      pipelineSmokePassed: true,
    })
    expect(live.aiModerationReady).toBe(true)
    expect(live.marketingAiModeratedDiscoveryAllowed).toBe(true)

    const probe = probeDiscoveryFeedEngine({
      impressionLedgerWritable: true,
      discoveryModerationWritable: true,
    })
    expect(probe.aiModerationReady).toBe(true)
    const cap = evaluateDiscoveryFeedCapability(probe)
    expect(cap.marketingAiModeratedDiscoveryAllowed).toBe(true)

    const hub = evaluateHubHonesty({
      discoveryFeedReady: true,
      impressionLedgerReady: true,
      aiModerationReady: true,
    })
    expect(hub.marketingAiModeratedDiscoveryAllowed).toBe(true)
    expect(hub.discovery.notes.join(' ')).toMatch(/AI moderation path live/i)
    expect(hub.discovery.notes.join(' ')).toMatch(/Promoted \[HELD\]/)
  })

  it('probeDiscoveryModerationHonesty flips when store writable', async () => {
    const prev = process.env.AETHEL_HUB_DISCOVERY_MODERATION_ROOT
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-i1-discmod-probe-'))
    process.env.AETHEL_HUB_DISCOVERY_MODERATION_ROOT = tmp
    try {
      const report = await probeDiscoveryModerationHonesty()
      expect(report.aiModerationReady).toBe(true)
      expect(report.marketingAiModeratedDiscoveryAllowed).toBe(true)
    } finally {
      if (prev === undefined) delete process.env.AETHEL_HUB_DISCOVERY_MODERATION_ROOT
      else process.env.AETHEL_HUB_DISCOVERY_MODERATION_ROOT = prev
      await fs.rm(tmp, { recursive: true, force: true }).catch(() => undefined)
    }
  })

  it('registers Arcade maturity noting AI-mod gate', () => {
    const arcade = getRouteMaturityEntry('/arcade')
    expect(arcade?.notes).toMatch(/AI-mod/i)
    expect(arcade?.notes).toMatch(/Promoted|Hub checkout \[HELD\]/i)
  })
})
