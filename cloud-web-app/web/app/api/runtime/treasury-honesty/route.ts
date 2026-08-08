import { NextRequest, NextResponse } from 'next/server'

import { requireAuth } from '@/lib/auth-server'
import { evaluateTreasuryHonesty } from '@/lib/treasury/treasury-capability'
import { getBillingRuntimeState } from '@/lib/server/billing-runtime'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('api/runtime/treasury-honesty/route')

export const dynamic = 'force-dynamic'

/**
 * Wave H / RTv1-c — honest Treasury / Coins / Hub checkout audit status.
 * Returns full H.1+ checklist with HELD reasons — never offers checkout CTAs.
 * FORCE_HUB_CHECKOUT env is detected and reported as ignored.
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
    hubCheckoutAudited: report.hubCheckoutAudited,
    heldAuditItems: report.treasuryAudit.heldItems.length,
  })

  return NextResponse.json({
    mock: false,
    wave: 'H',
    hubCheckoutAudited: report.hubCheckoutAudited,
    marketingHubCheckoutAllowed: report.marketingHubCheckoutAllowed,
    marketingCoinsAllowed: report.marketingCoinsAllowed,
    audit: {
      claim: report.treasuryAudit.claim,
      productCopy: report.treasuryAudit.productCopy,
      certificatePresent: report.treasuryAudit.certificatePresent,
      certificateAuditor: report.treasuryAudit.certificateAuditor,
      certificateAuditedAt: report.treasuryAudit.certificateAuditedAt,
      forbiddenForceEnvPresent: report.treasuryAudit.forbiddenForceEnvPresent,
      forbiddenForceEnvKeys: report.treasuryAudit.forbiddenForceEnvKeys,
      checklist: report.treasuryAudit.checklist,
      heldItems: report.treasuryAudit.heldItems,
    },
    report,
  })
}
