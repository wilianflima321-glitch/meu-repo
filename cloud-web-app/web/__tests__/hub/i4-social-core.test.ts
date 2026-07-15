/**
 * Hub I.4 Social CORE — Report/Block authority + COPPA gates + honesty split.
 */

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import {
  evaluateHubHonesty,
  evaluateHubSocialGate,
} from '@/lib/hub/hub-honesty-capability'
import {
  computeAgeYearsFromBirthDate,
  COPPA_AGE_THRESHOLD_YEARS,
  evaluateCoppaAgeGate,
  evaluateSocialSafetyActionGate,
} from '@/lib/hub/coppa-age-gate'
import {
  evaluateSocialModerationHonesty,
  probeSocialModerationHonesty,
} from '@/lib/hub/social-moderation-capability'
import { getRouteMaturityEntry } from '@/lib/routes/route-maturity-registry'

describe('I.4 COPPA / age gate', () => {
  it('fails closed when age is unknown', () => {
    const gate = evaluateCoppaAgeGate({})
    expect(gate.allowed).toBe(false)
    expect(gate.code).toBe('AGE_UNKNOWN')
    expect(gate.requiresParentalConsent).toBe(true)
  })

  it('holds under-13 without parental consent; unlocks with consent', () => {
    const held = evaluateCoppaAgeGate({ ageYears: 12 })
    expect(held.allowed).toBe(false)
    expect(held.code).toBe('COPPA_UNDER_13')
    expect(held.ageYears).toBe(12)

    const ok = evaluateCoppaAgeGate({
      ageYears: 12,
      parentalConsentVerified: true,
    })
    expect(ok.allowed).toBe(true)
    expect(ok.code).toBe('COPPA_CONSENT_OK')
  })

  it('allows ages at or above COPPA threshold', () => {
    const gate = evaluateCoppaAgeGate({ ageYears: COPPA_AGE_THRESHOLD_YEARS })
    expect(gate.allowed).toBe(true)
    expect(gate.code).toBe('AGE_OK')
    expect(gate.requiresParentalConsent).toBe(false)
  })

  it('computes age from birthDate', () => {
    const nowMs = Date.parse('2026-07-13T00:00:00.000Z')
    expect(computeAgeYearsFromBirthDate('2010-07-13', nowMs)).toBe(16)
    expect(computeAgeYearsFromBirthDate('2014-07-14', nowMs)).toBe(11)
    expect(computeAgeYearsFromBirthDate('not-a-date', nowMs)).toBeNull()
  })

  it('allows safety actions only with actor identity', () => {
    expect(evaluateSocialSafetyActionGate({}).allowed).toBe(false)
    expect(evaluateSocialSafetyActionGate({ actorUserId: 'u1' }).allowed).toBe(true)
  })
})

describe('I.4 Report / Block durable authority', () => {
  const prevSocial = process.env.AETHEL_HUB_SOCIAL_ROOT
  let tmpSocial: string

  afterEach(async () => {
    if (prevSocial === undefined) delete process.env.AETHEL_HUB_SOCIAL_ROOT
    else process.env.AETHEL_HUB_SOCIAL_ROOT = prevSocial
    if (tmpSocial) {
      await fs.rm(tmpSocial, { recursive: true, force: true }).catch(() => undefined)
    }
  })

  it('persists blocks and reports empty-honest under .aethel/hub/social', async () => {
    tmpSocial = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-i4-social-'))
    process.env.AETHEL_HUB_SOCIAL_ROOT = tmpSocial

    const {
      upsertBlock,
      listBlocksForUser,
      isEitherBlocked,
      removeBlock,
      createReport,
      listReportsByReporter,
      probeSocialModerationWritable,
    } = await import('@/lib/hub/social-moderation-authority')

    expect(await listBlocksForUser('alice')).toEqual([])
    expect(await listReportsByReporter('alice')).toEqual([])

    const block = await upsertBlock({
      blockerId: 'alice',
      blockedId: 'bob',
      reason: 'harassment',
    })
    expect(block.blockerId).toBe('alice')
    expect(block.blockedId).toBe('bob')
    expect(await isEitherBlocked('alice', 'bob')).toBe(true)
    expect(await isEitherBlocked('bob', 'alice')).toBe(true)

    const listed = await listBlocksForUser('alice')
    expect(listed).toHaveLength(1)

    const report = await createReport({
      reporterId: 'alice',
      targetUserId: 'bob',
      reason: 'spam',
      details: 'bot messages',
      gameId: 'neon-runner',
    })
    expect(report.reason).toBe('spam')
    expect(report.status).toBe('open')
    expect(await listReportsByReporter('alice')).toHaveLength(1)

    expect(await removeBlock('alice', 'bob')).toBe(true)
    expect(await isEitherBlocked('alice', 'bob')).toBe(false)

    const probe = await probeSocialModerationWritable()
    expect(probe.writable).toBe(true)
  })

  it('rejects self-block and invalid report reason', async () => {
    tmpSocial = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-i4-social-'))
    process.env.AETHEL_HUB_SOCIAL_ROOT = tmpSocial

    const { upsertBlock, createReport } = await import(
      '@/lib/hub/social-moderation-authority'
    )

    await expect(upsertBlock({ blockerId: 'alice', blockedId: 'alice' })).rejects.toMatchObject({
      code: 'BLOCK_SELF_FORBIDDEN',
    })
    await expect(
      createReport({
        reporterId: 'alice',
        targetUserId: 'bob',
        reason: 'not-a-reason',
      }),
    ).rejects.toMatchObject({ code: 'REPORT_REASON_INVALID' })
  })
})

describe('I.4 social honesty split (moderation vs party)', () => {
  const prevSocial = process.env.AETHEL_HUB_SOCIAL_ROOT
  const prevPresence = process.env.AETHEL_HUB_PRESENCE_ROOT
  const prevParty = process.env.AETHEL_HUB_PARTY_ROOT
  let tmpSocial: string

  afterEach(async () => {
    if (prevSocial === undefined) delete process.env.AETHEL_HUB_SOCIAL_ROOT
    else process.env.AETHEL_HUB_SOCIAL_ROOT = prevSocial
    if (prevPresence === undefined) delete process.env.AETHEL_HUB_PRESENCE_ROOT
    else process.env.AETHEL_HUB_PRESENCE_ROOT = prevPresence
    if (prevParty === undefined) delete process.env.AETHEL_HUB_PARTY_ROOT
    else process.env.AETHEL_HUB_PARTY_ROOT = prevParty
    if (tmpSocial) {
      await fs.rm(tmpSocial, { recursive: true, force: true }).catch(() => undefined)
    }
  })

  it('holds party marketing when only moderation is ready', () => {
    const social = evaluateSocialModerationHonesty({
      moderationStoreWritable: true,
      coppaGateReady: true,
      socialPartyReady: false,
    })
    expect(social.socialModerationReady).toBe(true)
    expect(social.socialPartyReady).toBe(false)
    expect(social.marketingSocialModerationAllowed).toBe(true)
    expect(social.marketingSocialPartyAllowed).toBe(false)

    const hub = evaluateHubHonesty({
      arcadeCatalogAvailable: true,
      hasPublishedGames: true,
      socialModerationReady: true,
      socialPartyReady: false,
    })
    expect(hub.social.status).toBe('PARTIAL')
    expect(hub.marketingSocialModerationAllowed).toBe(true)
    expect(hub.marketingSocialPartyAllowed).toBe(false)
    expect(hub.productCopy).toMatch(/party.*\[HELD\]/i)

    const gate = evaluateHubSocialGate({
      socialModerationReady: true,
      socialPartyReady: false,
    })
    expect(gate.allowed).toBe(false)
    expect(gate.code).toBe('SOCIAL_PARTY_HELD')
  })

  it('unlocks party marketing only when moderation + party ready', () => {
    const hub = evaluateHubHonesty({
      arcadeCatalogAvailable: true,
      hasPublishedGames: true,
      socialModerationReady: true,
      socialPartyReady: true,
    })
    expect(hub.social.status).toBe('IMPLEMENTED')
    expect(hub.marketingSocialModerationAllowed).toBe(true)
    expect(hub.marketingSocialPartyAllowed).toBe(true)

    expect(
      evaluateHubSocialGate({
        socialModerationReady: true,
        socialPartyReady: true,
      }).allowed,
    ).toBe(true)
  })

  it('probes writable social root and keeps party HELD without presence/party roots', async () => {
    tmpSocial = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-i4-probe-'))
    process.env.AETHEL_HUB_SOCIAL_ROOT = tmpSocial
    // Force presence/party probes to fail so party stays HELD in this suite.
    const blocker = path.join(tmpSocial, 'not-a-dir')
    await fs.writeFile(blocker, 'x', 'utf8')
    process.env.AETHEL_HUB_PRESENCE_ROOT = path.join(blocker, 'presence')
    process.env.AETHEL_HUB_PARTY_ROOT = path.join(blocker, 'party')

    const probe = await probeSocialModerationHonesty()
    expect(probe.socialModerationReady).toBe(true)
    expect(probe.socialPartyReady).toBe(false)
    expect(probe.marketingSocialPartyAllowed).toBe(false)
  })

  it('registers /arcade maturity with I.4 Report/Block and Agones HELD', () => {
    const arcade = getRouteMaturityEntry('/arcade')
    expect(arcade?.notes).toMatch(/I\.4 Report\/Block\/COPPA/i)
    expect(arcade?.notes).toMatch(/Agones|party|presence/i)
    expect(arcade?.notes).toMatch(/\[HELD\]/)
  })
})
