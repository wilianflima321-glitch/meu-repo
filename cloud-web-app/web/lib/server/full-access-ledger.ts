import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

const LEDGER_ROOT = path.resolve(process.cwd(), '.aethel', 'full-access')
const LEDGER_FILE = path.join(LEDGER_ROOT, 'ledger.ndjson')
const DEFAULT_DURATION_MINUTES = 15
const MIN_DURATION_MINUTES = 5
const MAX_DURATION_MINUTES = 60
const MAX_SCOPE_ITEMS = 12
const MAX_REASON_LENGTH = 500

type FullAccessEventType = 'grant' | 'revoke'

type FullAccessEventPayload = {
  grantId: string
  userId: string
  projectId: string | null
  scope: string[]
  reason: string
  durationMinutes: number
  createdAt: string
  expiresAt: string
  revokedAt?: string | null
  revokedBy?: string | null
}

type FullAccessLedgerRow = {
  timestamp: string
  eventId: string
  prevHash: string | null
  eventHash: string
  eventType: FullAccessEventType
  actorUserId: string
  payload: FullAccessEventPayload
}

export type FullAccessGrantRecord = {
  grantId: string
  userId: string
  projectId: string | null
  scope: string[]
  reason: string
  durationMinutes: number
  createdAt: string
  expiresAt: string
  revokedAt: string | null
  revokedBy: string | null
  status: 'active' | 'expired' | 'revoked'
}

export type FullAccessGrantInput = {
  actorUserId: string
  userId: string
  projectId?: string | null
  scope?: string[]
  reason: string
  durationMinutes?: number
}

export type RevokeFullAccessGrantInput = {
  actorUserId: string
  grantId: string
}

type ActiveGrantQuery = {
  userId: string
  projectId?: string | null
  requiredScopes?: string[]
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
  return `{${entries
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
    .join(',')}}`
}

function computeEventHash(input: {
  timestamp: string
  eventId: string
  prevHash: string | null
  eventType: FullAccessEventType
  actorUserId: string
  payload: FullAccessEventPayload
}): string {
  const canonical = stableStringify(input)
  return crypto.createHash('sha256').update(canonical).digest('hex')
}

function parseLedgerRow(line: string): FullAccessLedgerRow | null {
  if (!line.trim()) return null
  try {
    const parsed = JSON.parse(line) as FullAccessLedgerRow
    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.timestamp !== 'string') return null
    if (typeof parsed.eventId !== 'string') return null
    if (typeof parsed.eventHash !== 'string') return null
    if (parsed.eventType !== 'grant' && parsed.eventType !== 'revoke') return null
    return parsed
  } catch {
    return null
  }
}

async function readLastHash(): Promise<string | null> {
  const raw = await fs.readFile(LEDGER_FILE, 'utf8').catch(() => null)
  if (!raw) return null
  const lines = raw.split(/\r?\n/)
  for (let idx = lines.length - 1; idx >= 0; idx -= 1) {
    const row = parseLedgerRow(lines[idx])
    if (!row) continue
    return row.eventHash || null
  }
  return null
}

function sanitizeReason(reason: string): string {
  return reason.trim().slice(0, MAX_REASON_LENGTH)
}

function normalizeDuration(durationMinutes?: number): number {
  if (!Number.isFinite(durationMinutes)) return DEFAULT_DURATION_MINUTES
  const rounded = Math.round(Number(durationMinutes))
  return Math.max(MIN_DURATION_MINUTES, Math.min(rounded, MAX_DURATION_MINUTES))
}

function normalizeScope(scope?: string[], projectId?: string | null): string[] {
  const normalized = Array.isArray(scope)
    ? scope
        .map((item) => (typeof item === 'string' ? item.trim().toLowerCase() : ''))
        .filter(Boolean)
        .filter((item) => /^[a-z0-9:_-]{2,80}$/.test(item))
        .slice(0, MAX_SCOPE_ITEMS)
    : []

  if (normalized.length > 0) return [...new Set(normalized)]
  if (projectId) return [`project:${projectId}`, 'workspace:apply']
  return ['workspace:apply']
}

function scopeMatches(grantScope: string[], required: string): boolean {
  if (!required) return true
  if (grantScope.includes('*')) return true
  if (grantScope.includes(required)) return true
  const [requiredDomain] = required.split(':')
  if (requiredDomain && grantScope.includes(`${requiredDomain}:*`)) return true
  return false
}

async function appendLedgerEvent(input: {
  eventType: FullAccessEventType
  actorUserId: string
  payload: FullAccessEventPayload
}): Promise<FullAccessLedgerRow> {
  await fs.mkdir(LEDGER_ROOT, { recursive: true })
  const timestamp = new Date().toISOString()
  const eventId = crypto.randomUUID()
  const prevHash = await readLastHash()
  const eventHash = computeEventHash({
    timestamp,
    eventId,
    prevHash,
    eventType: input.eventType,
    actorUserId: input.actorUserId,
    payload: input.payload,
  })

  const row: FullAccessLedgerRow = {
    timestamp,
    eventId,
    prevHash,
    eventHash,
    eventType: input.eventType,
    actorUserId: input.actorUserId,
    payload: input.payload,
  }
  await fs.appendFile(LEDGER_FILE, `${JSON.stringify(row)}\n`, 'utf8')
  return row
}

async function readAllLedgerRows(): Promise<FullAccessLedgerRow[]> {
  const raw = await fs.readFile(LEDGER_FILE, 'utf8').catch(() => '')
  if (!raw) return []
  return raw
    .split(/\r?\n/)
    .map((line) => parseLedgerRow(line))
    .filter((row): row is FullAccessLedgerRow => Boolean(row))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
}

function materializeGrants(rows: FullAccessLedgerRow[], now = Date.now()): FullAccessGrantRecord[] {
  const grants = new Map<string, FullAccessGrantRecord>()

  for (const row of rows) {
    if (row.eventType === 'grant') {
      grants.set(row.payload.grantId, {
        grantId: row.payload.grantId,
        userId: row.payload.userId,
        projectId: row.payload.projectId,
        scope: row.payload.scope,
        reason: row.payload.reason,
        durationMinutes: row.payload.durationMinutes,
        createdAt: row.payload.createdAt,
        expiresAt: row.payload.expiresAt,
        revokedAt: row.payload.revokedAt || null,
        revokedBy: row.payload.revokedBy || null,
        status: 'active',
      })
      continue
    }

    if (row.eventType === 'revoke') {
      const current = grants.get(row.payload.grantId)
      if (!current) continue
      current.revokedAt = row.payload.revokedAt || row.timestamp
      current.revokedBy = row.payload.revokedBy || row.actorUserId
      current.status = 'revoked'
    }
  }

  for (const grant of grants.values()) {
    if (grant.status === 'revoked') continue
    if (new Date(grant.expiresAt).getTime() <= now) {
      grant.status = 'expired'
    } else {
      grant.status = 'active'
    }
  }

  return [...grants.values()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function listFullAccessGrants(params?: {
  userId?: string
  includeExpired?: boolean
  includeRevoked?: boolean
}): Promise<FullAccessGrantRecord[]> {
  const rows = await readAllLedgerRows()
  const allGrants = materializeGrants(rows)

  return allGrants.filter((grant) => {
    if (params?.userId && grant.userId !== params.userId) return false
    if (!params?.includeExpired && grant.status === 'expired') return false
    if (!params?.includeRevoked && grant.status === 'revoked') return false
    return true
  })
}

export async function createFullAccessGrant(input: FullAccessGrantInput): Promise<FullAccessGrantRecord> {
  const reason = sanitizeReason(input.reason)
  if (!reason) {
    throw new Error('FULL_ACCESS_REASON_REQUIRED')
  }

  const projectId = input.projectId?.trim() || null
  const durationMinutes = normalizeDuration(input.durationMinutes)
  const now = new Date()
  const createdAt = now.toISOString()
  const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000).toISOString()
  const grantId = `fa_${crypto.randomUUID()}`
  const payload: FullAccessEventPayload = {
    grantId,
    userId: input.userId,
    projectId,
    scope: normalizeScope(input.scope, projectId),
    reason,
    durationMinutes,
    createdAt,
    expiresAt,
  }

  await appendLedgerEvent({
    eventType: 'grant',
    actorUserId: input.actorUserId,
    payload,
  })

  return {
    grantId,
    userId: input.userId,
    projectId,
    scope: payload.scope,
    reason: payload.reason,
    durationMinutes,
    createdAt,
    expiresAt,
    revokedAt: null,
    revokedBy: null,
    status: 'active',
  }
}

export async function revokeFullAccessGrant(
  input: RevokeFullAccessGrantInput
): Promise<FullAccessGrantRecord | null> {
  const rows = await readAllLedgerRows()
  const grants = materializeGrants(rows, Date.now())
  const target = grants.find((grant) => grant.grantId === input.grantId)
  if (!target) return null
  if (target.status === 'revoked') return target

  const revokedAt = new Date().toISOString()
  await appendLedgerEvent({
    eventType: 'revoke',
    actorUserId: input.actorUserId,
    payload: {
      grantId: target.grantId,
      userId: target.userId,
      projectId: target.projectId,
      scope: target.scope,
      reason: target.reason,
      durationMinutes: target.durationMinutes,
      createdAt: target.createdAt,
      expiresAt: target.expiresAt,
      revokedAt,
      revokedBy: input.actorUserId,
    },
  })

  return {
    ...target,
    revokedAt,
    revokedBy: input.actorUserId,
    status: 'revoked',
  }
}

export function isFullAccessGrantActive(grant: FullAccessGrantRecord): boolean {
  return grant.status === 'active' && new Date(grant.expiresAt).getTime() > Date.now()
}

export async function findActiveFullAccessGrant(params: ActiveGrantQuery): Promise<FullAccessGrantRecord | null> {
  const grants = await listFullAccessGrants({
    userId: params.userId,
    includeExpired: false,
    includeRevoked: false,
  })
  const requiredScopes = params.requiredScopes?.filter(Boolean) ?? []

  for (const grant of grants) {
    if (!isFullAccessGrantActive(grant)) continue
    if (params.projectId && grant.projectId && grant.projectId !== params.projectId) continue
    if (requiredScopes.length > 0 && !requiredScopes.every((required) => scopeMatches(grant.scope, required))) {
      continue
    }
    return grant
  }

  return null
}
