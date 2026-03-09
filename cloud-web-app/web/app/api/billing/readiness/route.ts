import { NextResponse } from 'next/server'
import { getBillingRuntimeState } from '@/lib/server/billing-runtime'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const runtime = await getBillingRuntimeState()

    return NextResponse.json({
      status: runtime.status,
      checkoutReady: runtime.checkoutReady,
      portalReady: runtime.portalReady,
      webhookReady: runtime.webhookReady,
      gateway: runtime.gateway,
      provider: runtime.provider,
      stripe: runtime.stripe,
      blockers: runtime.blockers,
      instructions: runtime.instructions,
      recommendedCommands: runtime.recommendedCommands,
    })
  } catch (error) {
    console.error('[billing/readiness] failed:', error)
    return NextResponse.json(
      {
        status: 'unavailable',
        checkoutReady: false,
        blockers: ['BILLING_READINESS_UNAVAILABLE'],
        instructions: ['Billing readiness could not be loaded.'],
        recommendedCommands: ['GET /api/billing/readiness'],
        error: 'BILLING_READINESS_UNAVAILABLE',
      },
      { status: 500 }
    )
  }
}
