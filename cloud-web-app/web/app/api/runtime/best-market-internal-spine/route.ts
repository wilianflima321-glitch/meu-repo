import { NextRequest, NextResponse } from 'next/server'

import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { requireAuth } from '@/lib/auth-server'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  buildBestMarketInternalSpineReport,
  coerceBestMarketInternalSpineInputFromSearchParams,
} from '@/lib/runtime/best-market-internal-spine'

const logger = createComponentLogger('api.runtime.best-market-internal-spine')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const input = coerceBestMarketInternalSpineInputFromSearchParams(request.nextUrl.searchParams)
    const report = buildBestMarketInternalSpineReport(input)

    logger.info('best_market_internal_spine.snapshot', {
      userId: user.userId,
      state: report.state,
      domains: report.domainCount,
      gaps: report.gaps.length,
      p0GapCount: report.p0GapCount,
      heldOrBlockedDomainCount: report.heldOrBlockedDomainCount,
    })

    return NextResponse.json(report, {
      headers: {
        'x-aethel-capability': report.capability,
        'x-aethel-capability-status': report.state,
        'x-aethel-domain-count': String(report.domainCount),
        'x-aethel-held-domains': String(report.heldOrBlockedDomainCount),
        'x-aethel-p0-gaps': String(report.p0GapCount),
      },
    })
  } catch (error) {
    logger.error('best_market_internal_spine.failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
