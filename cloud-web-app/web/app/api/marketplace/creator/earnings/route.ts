import { NextRequest, NextResponse } from 'next/server'
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { requireAuth } from '@/lib/auth-server'
import { getCreatorEarningsSummary } from '@/lib/marketplace/payouts'
import { enforceRouteRateLimit, MARKETPLACE_READ_RATE_LIMIT } from '@/lib/server/route-rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request)

    const rateLimited = await enforceRouteRateLimit({
      req: request,
      capability: 'MARKETPLACE_CREATOR_EARNINGS',
      route: '/api/marketplace/creator/earnings',
      config: MARKETPLACE_READ_RATE_LIMIT,
      identifier: user.userId,
    })
    if (rateLimited) return rateLimited

    const summary = await getCreatorEarningsSummary(user.userId)

    return NextResponse.json(summary)
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError('Failed to load creator earnings summary')
  }
}
