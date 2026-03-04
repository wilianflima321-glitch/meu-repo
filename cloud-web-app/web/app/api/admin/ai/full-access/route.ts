import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/rbac'
import { listFullAccessGrants } from '@/lib/server/full-access-ledger'

export const dynamic = 'force-dynamic'

const CAPABILITY = 'ADMIN_FULL_ACCESS_AUDIT'

export const GET = withAdminAuth(async (request) => {
  const includeInactive = new URL(request.url).searchParams.get('includeInactive') === 'true'
  const grants = await listFullAccessGrants({
    includeExpired: includeInactive,
    includeRevoked: includeInactive,
  })

  const active = grants.filter((grant) => grant.status === 'active').length
  const revoked = grants.filter((grant) => grant.status === 'revoked').length
  const expired = grants.filter((grant) => grant.status === 'expired').length

  return NextResponse.json(
    {
      success: true,
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
      message: 'Full access audit snapshot loaded.',
      summary: {
        total: grants.length,
        active,
        revoked,
        expired,
      },
      grants: grants.slice(0, 200).map((grant) => ({
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
      })),
      updatedAt: new Date().toISOString(),
    },
    {
      headers: {
        'x-aethel-capability': CAPABILITY,
        'x-aethel-capability-status': 'PARTIAL',
      },
    }
  )
}, 'ops:agents:view')

