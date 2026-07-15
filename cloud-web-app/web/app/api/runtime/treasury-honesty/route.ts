import { NextRequest, NextResponse } from 'next/server'

import { requireAuth } from '@/lib/auth-server'
import { evaluateTreasuryHonesty } from '@/lib/treasury/treasury-capability'
import { getBillingRuntimeState } from '@/lib/server/billing-runtime'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('api/runtime/treasury-honesty/route')

export const dynamic = 'force-dynamic'

/**
 * Wave H — honest Treasury / Coins / marketplace fiat capability report.
 */
export async function GET(req: NextRequest) {
  try {
    requireAuth(req)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const billing = await getBillingRuntimeState()
  const report = evaluateTreasuryHonesty({
    stripeCheckoutConfigured: billing.checkoutReady,
  })

  log.info('treasury_honesty_api', {
    coins: report.aethelCoins.status,
    payout: report.inAppPayout.status,
    checkout: report.marketplaceCheckout.status,
  })

  return NextResponse.json({
    mock: false,
    wave: 'H',
    report,
  })
}
