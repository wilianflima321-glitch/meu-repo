import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { apiErrorToResponse } from '@/lib/api-errors'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { capabilityResponse } from '@/lib/server/capability-response'
import {
  createFullAccessGrant,
  listFullAccessGrants,
  type FullAccessGrantRecord,
} from '@/lib/server/full-access-ledger'

export const dynamic = 'force-dynamic'

const CAPABILITY = 'STUDIO_FULL_ACCESS_GRANT'

type FullAccessGrantBody = {
  projectId?: unknown
  scope?: unknown
  reason?: unknown
  durationMinutes?: unknown
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asOptionalString(value: unknown): string | undefined {
  const normalized = asString(value)
  return normalized ? normalized : undefined
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function normalizeScope(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const out = value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .slice(0, 20)
  return out.length > 0 ? out : undefined
}

function serializeGrant(grant: FullAccessGrantRecord) {
  return {
    id: grant.grantId,
    userId: grant.userId,
    projectId: grant.projectId,
    scope: grant.scope,
    reason: grant.reason,
    durationMinutes: grant.durationMinutes,
    createdAt: grant.createdAt,
    expiresAt: grant.expiresAt,
    revokedAt: grant.revokedAt,
    revokedBy: grant.revokedBy,
    status: grant.status,
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)
    const includeInactive = request.nextUrl.searchParams.get('includeInactive') === 'true'
    const grants = await listFullAccessGrants({
      userId: user.userId,
      includeExpired: includeInactive,
      includeRevoked: includeInactive,
    })

    return capabilityResponse({
      error: 'NONE',
      message: 'Full access grants loaded.',
      status: 200,
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
      milestone: 'P1',
      metadata: {
        grants: grants.map(serializeGrant),
        activeCount: grants.filter((grant) => grant.status === 'active').length,
        includeInactive,
        governance: {
          scopeRequired: true,
          shortLived: true,
          auditTrail: 'ndjson-hash-chain',
        },
      },
    })
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return capabilityResponse({
      error: 'STUDIO_FULL_ACCESS_LIST_FAILED',
      message: error instanceof Error ? error.message : 'Failed to load full access grants.',
      status: 500,
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
      milestone: 'P1',
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)
    const body = (await request.json().catch(() => null)) as FullAccessGrantBody | null

    if (!body || typeof body !== 'object') {
      return capabilityResponse({
        error: 'INVALID_BODY',
        message: 'Invalid JSON body.',
        status: 400,
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        milestone: 'P1',
      })
    }

    const reason = asString(body.reason)
    if (!reason) {
      return capabilityResponse({
        error: 'FULL_ACCESS_REASON_REQUIRED',
        message: 'reason is required for full-access grant.',
        status: 400,
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        milestone: 'P1',
      })
    }

    const grant = await createFullAccessGrant({
      actorUserId: user.userId,
      userId: user.userId,
      projectId: asOptionalString(body.projectId) || null,
      reason,
      durationMinutes: asNumber(body.durationMinutes),
      scope: normalizeScope(body.scope),
    })

    return capabilityResponse({
      error: 'NONE',
      message: 'Full access grant issued.',
      status: 201,
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
      milestone: 'P1',
      metadata: {
        grant: serializeGrant(grant),
        samplePolicy: 'short_lived_scoped_audited',
      },
    })
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return capabilityResponse({
      error: 'STUDIO_FULL_ACCESS_GRANT_FAILED',
      message: error instanceof Error ? error.message : 'Failed to issue full access grant.',
      status: 500,
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
      milestone: 'P1',
    })
  }
}
