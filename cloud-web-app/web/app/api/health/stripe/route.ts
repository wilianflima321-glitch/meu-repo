import { NextResponse } from 'next/server'
import { getBillingRuntimeState } from '@/lib/server/billing-runtime'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const runtime = await getBillingRuntimeState()
    const healthy = runtime.checkoutReady

    return NextResponse.json(
      {
        healthy,
        gateway: runtime.gateway.activeGateway,
        provider: runtime.provider.id,
        providerLabel: runtime.provider.label,
        checkoutEnabled: runtime.gateway.checkoutEnabled,
        checkoutReady: runtime.checkoutReady,
        portalReady: runtime.portalReady,
        webhookReady: runtime.webhookReady,
        setupEnv: runtime.provider.setupEnv,
        webhookPath: runtime.provider.webhookPath,
        publishableKeyConfigured: runtime.stripe.publishableKeyConfigured,
        pricesReady: runtime.stripe.pricesReady,
        configuredPriceCount: runtime.stripe.configuredPriceCount,
        requiredPriceCount: runtime.stripe.requiredPriceCount,
        missingEnv: runtime.stripe.missingEnv,
      },
      { status: healthy ? 200 : 503 }
    )
  } catch (error) {
    console.error('[health/stripe] failed:', error)
    return NextResponse.json(
      {
        healthy: false,
        error: 'STRIPE_HEALTH_UNAVAILABLE',
      },
      { status: 500 }
    )
  }
}
