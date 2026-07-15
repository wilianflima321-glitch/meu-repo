import { NextRequest, NextResponse } from 'next/server'

import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { requireAuth } from '@/lib/auth-server'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  buildAethelToolchainReadinessSnapshot,
  coerceAethelToolchainLaneIds,
} from '@aethel/runtime/runtime-toolchain-readiness-snapshot'

const logger = createComponentLogger('api.runtime.toolchain-readiness')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const lanes = coerceAethelToolchainLaneIds(request.nextUrl.searchParams.get('lanes'))
    const snapshot = buildAethelToolchainReadinessSnapshot({ laneIds: lanes })

    logger.info('runtime_toolchain_readiness.snapshot', {
      userId: user.userId,
      laneCount: snapshot.laneCount,
      readyLaneCount: snapshot.readyLaneCount,
      blockedLaneCount: snapshot.blockedLaneCount,
      capabilityStatus: snapshot.capabilityStatus,
    })

    return NextResponse.json(snapshot, {
      headers: {
        'x-aethel-capability': snapshot.capability,
        'x-aethel-capability-status': snapshot.capabilityStatus,
      },
    })
  } catch (error) {
    logger.error('runtime_toolchain_readiness.failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
