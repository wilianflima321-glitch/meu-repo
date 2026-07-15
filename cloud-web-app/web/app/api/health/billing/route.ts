import { NextResponse } from 'next/server'
import { getBillingRuntimeState } from '@/lib/server/billing-runtime'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const runtime = await getBillingRuntimeState()
    return NextResponse.json(
      {
        status: runtime.status,
        checkoutReady: runtime.checkoutReady,
        portalReady: runtime.portalReady,
        webhookReady: runtime.webhookReady,
        gateway: runtime.gateway,
        provider: runtime.provider,
        stripe: runtime.stripe,
        blockers: runtime.blockers,
      },
      { status: runtime.checkoutReady ? 200 : 503 }
    )
  } catch {
    return NextResponse.json(
      {
        status: 'unavailable',
        checkoutReady: false,
        blockers: ['BILLING_HEALTH_UNAVAILABLE'],
        error: 'BILLING_HEALTH_UNAVAILABLE',
      },
      { status: 500 }
    )
  }
}
