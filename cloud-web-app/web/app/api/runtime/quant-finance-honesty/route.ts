import { NextRequest, NextResponse } from 'next/server'

import { requireAuth } from '@/lib/auth-server'
import { probeQuantFinanceHonesty } from '@/lib/production/quant-finance-honesty'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('api/runtime/quant-finance-honesty/route')

export const dynamic = 'force-dynamic'

/**
 * Onda N — Vanguard Quant honesty.
 * Fail-closed: vanguardQuantReady and investmentGrade are always false today.
 */
export async function GET(req: NextRequest) {
  try {
    requireAuth(req)
  } catch {
    return NextResponse.json({ error: 'Unauthorized', mock: false }, { status: 401 })
  }

  const report = probeQuantFinanceHonesty()

  log.info('quant_finance_honesty_api', {
    stamp: report.stamp,
    vanguardQuantReady: report.vanguardQuantReady,
    investmentGrade: report.investmentGrade,
    notImplemented: report.capabilities.filter((c) => c.status === 'NOT_IMPLEMENTED').length,
  })

  return NextResponse.json({
    mock: false,
    report,
    marketingAllowed: false,
  })
}
