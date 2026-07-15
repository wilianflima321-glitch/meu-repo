/**
 * Hub I.4 party / rich presence / deep-link deepen —
 * durable substrate + COPPA/block gates + marketing flip (Agones HELD).
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
  evaluateSocialModerationHonesty,
  probeSocialModerationHonesty,
} from '@/lib/hub/social-moderation-capability'
import { evaluatePartyParticipationGate } from '@/lib/hub/social-party-gates'
import {
  buildPartyDeepLinkUri,
  createPartyInvite,
  validateDeepLinkToken,
} from '@/lib/hub/party-invite-authority'
import {
  isPresenceFresh,
  upsertPresence,
  PRESENCE_TTL_MS,
} from '@/lib/hub/rich-presence-authority'
import { getRouteMaturityEntry } from '@/lib/routes/route-maturity-registry'

describe('I.4 rich presence authority', () => {
  const prev = process.env.AETHEL_HUB_PRESENCE_ROOT
  let tmp: string

  afterEach(async () => {
    if (prev === undefined) delete process.env.AETHEL_HUB_PRESENCE_ROOT
    else process.env.AETHEL_HUB_PRESENCE_ROOT = prev
    if (tmp) await fs.rm(tmp, { recursive: true, force: true }).catch(() => undefined)
  })

  it('persists heartbeat and expires stale as offline', async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-i4-presence-'))
    process.env.AETHEL_HUB_PRESENCE_ROOT = tmp

    const { upsertPresence: upsert, getPresence: get, probeRichPresenceWritable } = await import(
      '@/lib/hub/rich-presence-authority'
    )

    expect(await get('alice')).toBeNull()

    const now = Date.parse('2026-07-13T12:00:00.000Z')
    const row = await upsert({
      userId: 'alice',
      status: 'in_game',
      gameId: 'neon-runner',
      gameTitle: 'Neon Runner',
      joinable: true,
      nowMs: now,
      ttlMs: 1000,
    })
    expect(row.status).toBe('in_game')
    expect(row.joinable).toBe(true)
    expect(isPresenceFresh(row, now + 500)).toBe(true)

    const stale = await get('alice', now + 2000)
    expect(stale?.status).toBe('offline')
    expect(stale?.joinable).toBe(false)

    const probe = await probeRichPresenceWritable()
    expect(probe.writable).toBe(true)
  })
})

describe('I.4 party invite + deep-link tokens', () => {
  const prev = process.env.AETHEL_HUB_PARTY_ROOT
  let tmp: string

  afterEach(async () => {
    if (prev === undefined) delete process.env.AETHEL_HUB_PARTY_ROOT
    else process.env.AETHEL_HUB_PARTY_ROOT = prev
    if (tmp) await fs.rm(tmp, { recursive: true, force: true }).catch(() => undefined)
  })

  it('mints invite + aethel:// deep-link and validates without Agones', async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-i4-party-'))
    process.env.AETHEL_HUB_PARTY_ROOT = tmp

    const { createPartyInvite: create, validateDeepLinkToken: validate, listPartyInvitesForUser } =
      await import('@/lib/hub/party-invite-authority')

    expect(await listPartyInvitesForUser('alice')).toEqual([])

    const { invite, deepLink } = await create({
      hostUserId: 'alice',
      inviteeUserId: 'bob',
      gameId: 'neon-runner',
      gameTitle: 'Neon Runner',
    })
    expect(invite.status).toBe('pending')
    expect(deepLink.uri).toBe(
      buildPartyDeepLinkUri({
        gameId: 'neon-runner',
        inviteId: invite.id,
        token: deepLink.token,
      }),
    )

    const ok = await validate(deepLink.token)
    expect(ok.valid).toBe(true)
    expect(ok.code).toBe('OK')
    expect(ok.dedicatedSessionHeld).toBe(true)
    expect(ok.dedicatedSessionReason).toMatch(/Agones/i)

    const listed = await listPartyInvitesForUser('bob')
    expect(listed).toHaveLength(1)
  })

  it('rejects self-invite', async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-i4-party-'))
    process.env.AETHEL_HUB_PARTY_ROOT = tmp
    await expect(
      createPartyInvite({
        hostUserId: 'alice',
        inviteeUserId: 'alice',
        gameId: 'neon-runner',
      }),
    ).rejects.toMatchObject({ code: 'PARTY_INVITE_SELF_FORBIDDEN' })
  })
})

describe('I.4 party participation gates (COPPA + block)', () => {
  const prevSocial = process.env.AETHEL_HUB_SOCIAL_ROOT
  let tmpSocial: string

  afterEach(async () => {
    if (prevSocial === undefined) delete process.env.AETHEL_HUB_SOCIAL_ROOT
    else process.env.AETHEL_HUB_SOCIAL_ROOT = prevSocial
    if (tmpSocial) {
      await fs.rm(tmpSocial, { recursive: true, force: true }).catch(() => undefined)
    }
  })

  it('fails closed without party readiness, COPPA, or when blocked', async () => {
    const held = await evaluatePartyParticipationGate({
      socialModerationReady: true,
      socialPartyReady: false,
      actorUserId: 'alice',
      coppa: { ageYears: 20 },
    })
    expect(held.allowed).toBe(false)
    expect(held.code).toBe('SOCIAL_PARTY_HELD')
    expect(held.dedicatedSessionHeld).toBe(true)

    const under13 = await evaluatePartyParticipationGate({
      socialModerationReady: true,
      socialPartyReady: true,
      actorUserId: 'alice',
      requireCoppa: true,
      coppa: { ageYears: 12 },
    })
    expect(under13.allowed).toBe(false)
    expect(under13.code).toBe('COPPA_UNDER_13')

    tmpSocial = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-i4-block-'))
    process.env.AETHEL_HUB_SOCIAL_ROOT = tmpSocial
    const { upsertBlock } = await import('@/lib/hub/social-moderation-authority')
    await upsertBlock({ blockerId: 'alice', blockedId: 'bob' })

    const blocked = await evaluatePartyParticipationGate({
      socialModerationReady: true,
      socialPartyReady: true,
      actorUserId: 'alice',
      otherUserId: 'bob',
      requireCoppa: true,
      coppa: { ageYears: 20 },
    })
    expect(blocked.allowed).toBe(false)
    expect(blocked.code).toBe('SOCIAL_BLOCKED')
  })
})

describe('I.4 party honesty flip (presence + invite substrate)', () => {
  const prevSocial = process.env.AETHEL_HUB_SOCIAL_ROOT
  const prevPresence = process.env.AETHEL_HUB_PRESENCE_ROOT
  const prevParty = process.env.AETHEL_HUB_PARTY_ROOT
  let tmpSocial: string
  let tmpPresence: string
  let tmpParty: string

  afterEach(async () => {
    if (prevSocial === undefined) delete process.env.AETHEL_HUB_SOCIAL_ROOT
    else process.env.AETHEL_HUB_SOCIAL_ROOT = prevSocial
    if (prevPresence === undefined) delete process.env.AETHEL_HUB_PRESENCE_ROOT
    else process.env.AETHEL_HUB_PRESENCE_ROOT = prevPresence
    if (prevParty === undefined) delete process.env.AETHEL_HUB_PARTY_ROOT
    else process.env.AETHEL_HUB_PARTY_ROOT = prevParty
    for (const dir of [tmpSocial, tmpPresence, tmpParty]) {
      if (dir) await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined)
    }
  })

  it('holds party marketing until presence + invite writable', () => {
    const held = evaluateSocialModerationHonesty({
      moderationStoreWritable: true,
      coppaGateReady: true,
      presenceStoreWritable: false,
      partyInviteStoreWritable: false,
    })
    expect(held.socialModerationReady).toBe(true)
    expect(held.socialPartyReady).toBe(false)
    expect(held.marketingSocialPartyAllowed).toBe(false)
    expect(held.dedicatedSessionHeld).toBe(true)

    const live = evaluateSocialModerationHonesty({
      moderationStoreWritable: true,
      coppaGateReady: true,
      presenceStoreWritable: true,
      partyInviteStoreWritable: true,
    })
    expect(live.socialPartyReady).toBe(true)
    expect(live.marketingSocialPartyAllowed).toBe(true)
    expect(live.claim).toMatch(/Agones/i)
    expect(live.party.notes.some((n) => /Agones/i.test(n))).toBe(true)

    const hub = evaluateHubHonesty({
      arcadeCatalogAvailable: true,
      hasPublishedGames: true,
      socialModerationReady: true,
      socialPartyReady: true,
    })
    expect(hub.social.status).toBe('IMPLEMENTED')
    expect(hub.marketingSocialPartyAllowed).toBe(true)
    expect(hub.productCopy).toMatch(/Agones/i)
    expect(evaluateHubSocialGate({ socialModerationReady: true, socialPartyReady: true }).allowed).toBe(
      true,
    )
  })

  it('probe flips party only when all three roots writable', async () => {
    tmpSocial = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-i4-s-'))
    tmpPresence = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-i4-p-'))
    tmpParty = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-i4-t-'))
    process.env.AETHEL_HUB_SOCIAL_ROOT = tmpSocial
    process.env.AETHEL_HUB_PRESENCE_ROOT = tmpPresence
    process.env.AETHEL_HUB_PARTY_ROOT = tmpParty

    const live = await probeSocialModerationHonesty()
    expect(live.socialModerationReady).toBe(true)
    expect(live.socialPartyReady).toBe(true)
    expect(live.marketingSocialPartyAllowed).toBe(true)
    expect(live.dedicatedSessionHeld).toBe(true)

    // Presence missing → party stays HELD
    process.env.AETHEL_HUB_PRESENCE_ROOT = path.join(tmpPresence, 'no', 'such', 'readonly-trap')
    // Point at a file path that cannot be a directory root writable mkdir of parent may still work...
    // Use a path under a file to force failure:
    const blocker = path.join(tmpPresence, 'blocker-file')
    await fs.writeFile(blocker, 'x', 'utf8')
    process.env.AETHEL_HUB_PRESENCE_ROOT = path.join(blocker, 'nested')

    const held = await probeSocialModerationHonesty()
    expect(held.socialModerationReady).toBe(true)
    expect(held.socialPartyReady).toBe(false)
    expect(held.marketingSocialPartyAllowed).toBe(false)
  })

  it('registers /arcade maturity with presence/party and Agones HELD', () => {
    const arcade = getRouteMaturityEntry('/arcade')
    expect(arcade?.notes).toMatch(/presence\/party invite\/deep-link/i)
    expect(arcade?.notes).toMatch(/Agones/i)
    expect(arcade?.notes).toMatch(/\[HELD\]/)
  })
})

describe('I.4 deep-link helpers smoke', () => {
  it('builds canonical aethel://join URI', () => {
    const uri = buildPartyDeepLinkUri({
      gameId: 'sword-game',
      inviteId: 'pty_1',
      token: 'dlk_abc',
    })
    expect(uri).toBe('aethel://join?game=sword-game&invite=pty_1&token=dlk_abc')
  })

  it('exports presence TTL constant', () => {
    expect(PRESENCE_TTL_MS).toBeGreaterThan(0)
  })

  it('upsertPresence rejects empty identity', async () => {
    await expect(upsertPresence({ userId: '' })).rejects.toMatchObject({
      code: 'PRESENCE_IDENTITY_REQUIRED',
    })
  })

  it('validateDeepLinkToken fails closed on missing token', async () => {
    const result = await validateDeepLinkToken('')
    expect(result.valid).toBe(false)
    expect(result.code).toBe('TOKEN_MISSING')
    expect(result.dedicatedSessionHeld).toBe(true)
  })
})
