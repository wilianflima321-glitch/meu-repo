import { NextRequest, NextResponse } from 'next/server'

import { requireAuth } from '@/lib/auth-server'
import { probeSharedSubstrateHonesty } from '@/lib/production/shared-substrate-honesty'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('api/runtime/shared-substrate-honesty/route')

export const dynamic = 'force-dynamic'

/** Engine + Finance shared substrate honesty — fail-closed; no HFT marketing. */
export async function GET(req: NextRequest) {
  try {
    requireAuth(req)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const report = probeSharedSubstrateHonesty()

  log.info('shared_substrate_honesty_api', {
    sharedSubstrateReady: report.sharedSubstrateReady,
    vanguardQuantFinanceReady: report.vanguardQuantFinanceReady,
  })

  return NextResponse.json({
    mock: false,
    letter: 'sf',
    focus: 'engine-finance-shared-substrate',
    report,
  })
}
