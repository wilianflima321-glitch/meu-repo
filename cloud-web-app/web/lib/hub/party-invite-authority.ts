/**
 * I.4 — Party invite + deep-link token durable authority (disk-backed).
 * Invite substrate for Hub party; never invents fake invitees or live Agones sessions.
 * Layout:
 *   `.aethel/hub/party/invites/<inviteId>.json`
 *   `.aethel/hub/party/tokens/<token>.json`
 * Dedicated multiplayer session host / Agones allocation stays [HELD].
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash, randomBytes } from 'node:crypto'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('party-invite-authority')

export const PARTY_INVITE_TTL_MS = 30 * 60_000
export const DEEP_LINK_TOKEN_TTL_MS = 30 * 60_000

export type PartyInviteStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked'

export interface PartyInviteRecord {
  id: string
  hostUserId: string
  inviteeUserId: string
  gameId: string
  gameTitle?: string
  status: PartyInviteStatus
  /** Opaque deep-link token id (not Agones). */
  deepLinkToken?: string
  createdAt: string
  updatedAt: string
  expiresAt: string
}

export interface DeepLinkTokenRecord {
  token: string
  inviteId: string
  hostUserId: string
  inviteeUserId: string
  gameId: string
  /** Canonical join URI — client resolves assets; live session host [HELD]. */
  uri: string
  createdAt: string
  expiresAt: string
  consumedAt?: string
}

const PARTY_DIR_SEGMENTS = ['.aethel', 'hub', 'party'] as const

function getPartyRoot(): string {
  return process.env.AETHEL_HUB_PARTY_ROOT
    ? path.resolve(process.env.AETHEL_HUB_PARTY_ROOT)
    : path.resolve(process.cwd(), ...PARTY_DIR_SEGMENTS)
}

function sanitize(segment: string): string {
  return (
    String(segment || '')
      .trim()
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 80) || 'unknown'
  )
}

function invitePath(inviteId: string): string {
  return path.join(getPartyRoot(), 'invites', `${sanitize(inviteId)}.json`)
}

function tokenPath(token: string): string {
  return path.join(getPartyRoot(), 'tokens', `${sanitize(token)}.json`)
}

function newInviteId(): string {
  return `pty_${Date.now().toString(36)}_${randomBytes(6).toString('hex')}`
}

function newDeepLinkToken(): string {
  return `dlk_${randomBytes(18).toString('hex')}`
}

async function readJsonFile<T>(file: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(file, 'utf8')
    return JSON.parse(raw) as T
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code
    if (code === 'ENOENT') return null
    throw err
  }
}

async function writeJsonFile(file: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.tmp`
  await fs.writeFile(tmp, JSON.stringify(value, null, 2), 'utf8')
  await fs.rename(tmp, file)
}

/**
 * Build deep-link URI. Does not allocate Agones / dedicated session.
 */
export function buildPartyDeepLinkUri(input: {
  gameId: string
  inviteId: string
  token: string
}): string {
  const game = encodeURIComponent(String(input.gameId || '').trim())
  const invite = encodeURIComponent(String(input.inviteId || '').trim())
  const token = encodeURIComponent(String(input.token || '').trim())
  return `aethel://join?game=${game}&invite=${invite}&token=${token}`
}

/** Fingerprint helper for logs — never log raw tokens in full. */
export function fingerprintDeepLinkToken(token: string): string {
  return createHash('sha256').update(String(token || '')).digest('hex').slice(0, 12)
}

export type CreatePartyInviteInput = {
  hostUserId: string
  inviteeUserId: string
  gameId: string
  gameTitle?: string
  nowMs?: number
  ttlMs?: number
}

export async function createPartyInvite(
  input: CreatePartyInviteInput,
): Promise<{ invite: PartyInviteRecord; deepLink: DeepLinkTokenRecord }> {
  const hostUserId = String(input.hostUserId || '').trim()
  const inviteeUserId = String(input.inviteeUserId || '').trim()
  const gameId = String(input.gameId || '').trim().slice(0, 80)
  if (!hostUserId || !inviteeUserId || !gameId) {
    throw Object.assign(new Error('PARTY_INVITE_FIELDS_REQUIRED'), {
      code: 'PARTY_INVITE_FIELDS_REQUIRED',
    })
  }
  if (hostUserId === inviteeUserId) {
    throw Object.assign(new Error('PARTY_INVITE_SELF_FORBIDDEN'), {
      code: 'PARTY_INVITE_SELF_FORBIDDEN',
    })
  }

  const nowMs = input.nowMs ?? Date.now()
  const ttlMs = input.ttlMs ?? PARTY_INVITE_TTL_MS
  const nowIso = new Date(nowMs).toISOString()
  const expiresAt = new Date(nowMs + ttlMs).toISOString()
  const id = newInviteId()
  const token = newDeepLinkToken()
  const uri = buildPartyDeepLinkUri({ gameId, inviteId: id, token })

  const invite: PartyInviteRecord = {
    id,
    hostUserId,
    inviteeUserId,
    gameId,
    gameTitle: input.gameTitle ? String(input.gameTitle).trim().slice(0, 120) : undefined,
    status: 'pending',
    deepLinkToken: token,
    createdAt: nowIso,
    updatedAt: nowIso,
    expiresAt,
  }

  const deepLink: DeepLinkTokenRecord = {
    token,
    inviteId: id,
    hostUserId,
    inviteeUserId,
    gameId,
    uri,
    createdAt: nowIso,
    expiresAt: new Date(nowMs + (input.ttlMs ?? DEEP_LINK_TOKEN_TTL_MS)).toISOString(),
  }

  await writeJsonFile(invitePath(id), invite)
  await writeJsonFile(tokenPath(token), deepLink)
  log.info('party_invite_created', {
    inviteId: id,
    hostUserId,
    inviteeUserId,
    gameId,
    tokenFp: fingerprintDeepLinkToken(token),
  })
  return { invite, deepLink }
}

export async function getPartyInvite(inviteId: string): Promise<PartyInviteRecord | null> {
  const id = String(inviteId || '').trim()
  if (!id) return null
  return readJsonFile<PartyInviteRecord>(invitePath(id))
}

export async function listPartyInvitesForUser(userId: string): Promise<PartyInviteRecord[]> {
  const uid = String(userId || '').trim()
  if (!uid) return []
  const dir = path.join(getPartyRoot(), 'invites')
  try {
    const files = await fs.readdir(dir)
    const out: PartyInviteRecord[] = []
    for (const name of files) {
      if (!name.endsWith('.json')) continue
      const row = await readJsonFile<PartyInviteRecord>(path.join(dir, name))
      if (!row?.id) continue
      if (row.hostUserId === uid || row.inviteeUserId === uid) out.push(row)
    }
    return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code
    if (code === 'ENOENT') return []
    throw err
  }
}

export type AcceptPartyInviteInput = {
  inviteId: string
  actorUserId: string
  nowMs?: number
}

export async function acceptPartyInvite(
  input: AcceptPartyInviteInput,
): Promise<PartyInviteRecord> {
  const inviteId = String(input.inviteId || '').trim()
  const actorUserId = String(input.actorUserId || '').trim()
  const invite = await getPartyInvite(inviteId)
  if (!invite) {
    throw Object.assign(new Error('PARTY_INVITE_NOT_FOUND'), { code: 'PARTY_INVITE_NOT_FOUND' })
  }
  if (invite.inviteeUserId !== actorUserId) {
    throw Object.assign(new Error('PARTY_INVITE_NOT_INVITEE'), {
      code: 'PARTY_INVITE_NOT_INVITEE',
    })
  }
  const nowMs = input.nowMs ?? Date.now()
  if (Date.parse(invite.expiresAt) <= nowMs || invite.status === 'expired') {
    throw Object.assign(new Error('PARTY_INVITE_EXPIRED'), { code: 'PARTY_INVITE_EXPIRED' })
  }
  if (invite.status !== 'pending') {
    throw Object.assign(new Error('PARTY_INVITE_NOT_PENDING'), {
      code: 'PARTY_INVITE_NOT_PENDING',
    })
  }

  const next: PartyInviteRecord = {
    ...invite,
    status: 'accepted',
    updatedAt: new Date(nowMs).toISOString(),
  }
  await writeJsonFile(invitePath(inviteId), next)
  log.info('party_invite_accepted', { inviteId, actorUserId })
  return next
}

export type ValidateDeepLinkResult = {
  valid: boolean
  code:
    | 'OK'
    | 'TOKEN_MISSING'
    | 'TOKEN_NOT_FOUND'
    | 'TOKEN_EXPIRED'
    | 'TOKEN_CONSUMED'
    | 'INVITE_MISSING'
  reason: string
  deepLink?: DeepLinkTokenRecord
  invite?: PartyInviteRecord
  /** Live dedicated session / Agones resolve — always HELD in this ship. */
  dedicatedSessionHeld: true
  dedicatedSessionReason: string
}

export async function validateDeepLinkToken(
  token: string,
  nowMs: number = Date.now(),
): Promise<ValidateDeepLinkResult> {
  const t = String(token || '').trim()
  const heldNote =
    'Deep-link token substrate live — dedicated multiplayer session host / Agones allocation [HELD]'
  if (!t) {
    return {
      valid: false,
      code: 'TOKEN_MISSING',
      reason: 'Deep-link token required',
      dedicatedSessionHeld: true,
      dedicatedSessionReason: heldNote,
    }
  }

  const deepLink = await readJsonFile<DeepLinkTokenRecord>(tokenPath(t))
  if (!deepLink?.token) {
    return {
      valid: false,
      code: 'TOKEN_NOT_FOUND',
      reason: 'Unknown deep-link token',
      dedicatedSessionHeld: true,
      dedicatedSessionReason: heldNote,
    }
  }
  if (deepLink.consumedAt) {
    return {
      valid: false,
      code: 'TOKEN_CONSUMED',
      reason: 'Deep-link token already consumed',
      deepLink,
      dedicatedSessionHeld: true,
      dedicatedSessionReason: heldNote,
    }
  }
  if (Date.parse(deepLink.expiresAt) <= nowMs) {
    return {
      valid: false,
      code: 'TOKEN_EXPIRED',
      reason: 'Deep-link token expired',
      deepLink,
      dedicatedSessionHeld: true,
      dedicatedSessionReason: heldNote,
    }
  }

  const invite = await getPartyInvite(deepLink.inviteId)
  if (!invite) {
    return {
      valid: false,
      code: 'INVITE_MISSING',
      reason: 'Invite backing deep-link missing',
      deepLink,
      dedicatedSessionHeld: true,
      dedicatedSessionReason: heldNote,
    }
  }

  return {
    valid: true,
    code: 'OK',
    reason: 'Deep-link token valid — invite substrate ready; live session host [HELD]',
    deepLink,
    invite,
    dedicatedSessionHeld: true,
    dedicatedSessionReason: heldNote,
  }
}

/** Probe used by Hub honesty — confirms durable party/invite root is writable. */
export async function probePartyInviteWritable(): Promise<{
  writable: boolean
  root: string
  reason?: string
}> {
  const root = getPartyRoot()
  try {
    await fs.mkdir(root, { recursive: true })
    await fs.mkdir(path.join(root, 'invites'), { recursive: true })
    await fs.mkdir(path.join(root, 'tokens'), { recursive: true })
    const probe = path.join(root, `.probe_${process.pid}`)
    await fs.writeFile(probe, 'ok', 'utf8')
    await fs.unlink(probe)
    return { writable: true, root }
  } catch (err) {
    return {
      writable: false,
      root,
      reason: err instanceof Error ? err.message : String(err),
    }
  }
}

export function getPartyInviteRoot(): string {
  return getPartyRoot()
}
