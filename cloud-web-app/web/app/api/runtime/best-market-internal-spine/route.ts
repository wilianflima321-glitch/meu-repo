import { NextRequest, NextResponse } from 'next/server'

import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { requireAuth } from '@/lib/auth-server'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { createComponentLogger } from '@/lib/observability/logger'
import { buildBestMarketInternalSpineReport } from '@/lib/runtime/best-market-internal-spine'

const logger = createComponentLogger('api.runtime.best-market-internal-spine')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const mission = request.nextUrl.searchParams.get('mission') ?? undefined
    const report = buildBestMarketInternalSpineReport({ mission })
    const p0GapCount = report.gaps.filter((gap) => gap.severity === 'p0').length

    logger.info('best_market_internal_spine.snapshot', {
      userId: user.userId,
      state: report.state,
      domains: report.domains.length,
      gaps: report.gaps.length,
      p0GapCount,
    })

    return NextResponse.json(report, {
      headers: {
        'x-aethel-capability': report.capability,
        'x-aethel-capability-status': report.state,
        'x-aethel-p0-gaps': String(p0GapCount),
      },
    })
  } catch (error) {
    logger.error('best_market_internal_spine.failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
