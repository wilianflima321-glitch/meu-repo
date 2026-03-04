import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { apiErrorToResponse } from '@/lib/api-errors'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { capabilityResponse } from '@/lib/server/capability-response'
import { listFullAccessGrants, revokeFullAccessGrant } from '@/lib/server/full-access-ledger'

export const dynamic = 'force-dynamic'

const CAPABILITY = 'STUDIO_FULL_ACCESS_REVOKE'

type RouteContext = { params: Promise<{ id: string }> }

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)
    const params = await context.params
    const grantId = typeof params.id === 'string' ? params.id.trim() : ''

    if (!grantId) {
      return capabilityResponse({
        error: 'FULL_ACCESS_GRANT_ID_REQUIRED',
        message: 'Grant id is required.',
        status: 400,
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        milestone: 'P1',
      })
    }

    const existing = await listFullAccessGrants({
      includeExpired: true,
      includeRevoked: true,
    })
    const target = existing.find((grant) => grant.grantId === grantId)

    if (!target) {
      return capabilityResponse({
        error: 'FULL_ACCESS_GRANT_NOT_FOUND',
        message: 'Full access grant not found.',
        status: 404,
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        milestone: 'P1',
        metadata: { grantId },
      })
    }

    if (target.userId !== user.userId) {
      return capabilityResponse({
        error: 'FULL_ACCESS_REVOKE_FORBIDDEN',
        message: 'You can only revoke grants issued to your own user context.',
        status: 403,
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        milestone: 'P1',
        metadata: { grantId },
      })
    }

    const revoked = await revokeFullAccessGrant({
      actorUserId: user.userId,
      grantId,
    })

    if (!revoked) {
      return capabilityResponse({
        error: 'FULL_ACCESS_GRANT_NOT_FOUND',
        message: 'Full access grant not found.',
        status: 404,
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        milestone: 'P1',
        metadata: { grantId },
      })
    }

    return capabilityResponse({
      error: 'NONE',
      message: 'Full access grant revoked.',
      status: 200,
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
      milestone: 'P1',
      metadata: {
        grant: {
          id: revoked.grantId,
          userId: revoked.userId,
          projectId: revoked.projectId,
          scope: revoked.scope,
          createdAt: revoked.createdAt,
          expiresAt: revoked.expiresAt,
          revokedAt: revoked.revokedAt,
          status: revoked.status,
        },
        samplePolicy: 'short_lived_scoped_audited',
      },
    })
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return capabilityResponse({
      error: 'STUDIO_FULL_ACCESS_REVOKE_FAILED',
      message: error instanceof Error ? error.message : 'Failed to revoke full access grant.',
      status: 500,
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
      milestone: 'P1',
    })
  }
}
