import { capabilityResponse } from '@/lib/server/capability-response'
import { readPaymentGatewayConfig, type PaymentGatewayConfig } from '@/lib/server/payment-gateway-config'
import { getBillingProviderConfig, type BillingProviderConfig } from '@/lib/server/billing-provider-config'
import { getStripeReadiness, type StripeReadiness } from '@/lib/server/stripe-readiness'

export type BillingRuntimeState = {
  status: 'ready' | 'partial'
  gateway: PaymentGatewayConfig
  provider: BillingProviderConfig
  stripe: StripeReadiness
  checkoutReady: boolean
  portalReady: boolean
  webhookReady: boolean
  blockers: string[]
  instructions: string[]
  recommendedCommands: string[]
}

export async function getBillingRuntimeState(): Promise<BillingRuntimeState> {
  const gateway = await readPaymentGatewayConfig()
  const provider = getBillingProviderConfig(gateway.activeGateway)
  const stripe = getStripeReadiness()

  const checkoutReady =
    gateway.checkoutEnabled &&
    gateway.activeGateway === 'stripe' &&
    stripe.configured

  const portalReady =
    gateway.activeGateway === 'stripe' &&
    stripe.secretKeyConfigured

  const webhookReady =
    gateway.activeGateway === 'stripe' &&
    stripe.secretKeyConfigured &&
    stripe.webhookSecretConfigured

  const status = checkoutReady && portalReady && webhookReady ? 'ready' : 'partial'
  const blockers: string[] = []
  const instructions: string[] = []
  const recommendedCommands: string[] = []

  if (gateway.activeGateway !== 'stripe') {
    blockers.push('ACTIVE_GATEWAY_NOT_STRIPE')
    instructions.push('Switch the active billing gateway to Stripe before promoting checkout.')
  }

  if (!gateway.checkoutEnabled) {
    blockers.push('CHECKOUT_DISABLED')
    instructions.push('Enable checkout in the payment gateway config before using public plan selection.')
  }

  if (!stripe.secretKeyConfigured) {
    blockers.push('STRIPE_SECRET_KEY_MISSING')
    instructions.push('Provide STRIPE_SECRET_KEY in the runtime environment.')
  }
  if (!stripe.publishableKeyConfigured) {
    blockers.push('STRIPE_PUBLISHABLE_KEY_MISSING')
    instructions.push('Provide STRIPE_PUBLISHABLE_KEY so browser checkout can initialize cleanly.')
  }
  if (!stripe.webhookSecretConfigured) {
    blockers.push('STRIPE_WEBHOOK_SECRET_MISSING')
    instructions.push('Provide STRIPE_WEBHOOK_SECRET and register the webhook endpoint before claiming billing-ready.')
  }
  if (!stripe.pricesReady) {
    blockers.push('STRIPE_PRICE_IDS_INCOMPLETE')
    instructions.push('Configure all canonical Stripe price IDs so plan routing matches the published pricing table.')
  }

  if (status === 'ready') {
    instructions.push('Billing runtime is ready for live checkout, portal, and webhook flow validation.')
    recommendedCommands.push('Open /pricing and validate checkout end-to-end')
  } else {
    recommendedCommands.push('npm run setup:billing-runtime')
    recommendedCommands.push('Populate Stripe envs in cloud-web-app/web/.env.local')
    recommendedCommands.push('GET /api/billing/readiness')
  }

  return {
    status,
    gateway,
    provider,
    stripe,
    checkoutReady,
    portalReady,
    webhookReady,
    blockers,
    instructions,
    recommendedCommands: Array.from(new Set(recommendedCommands)),
  }
}

type BillingCapabilityKind = 'checkout' | 'portal' | 'webhook'

export function billingRuntimeCapabilityResponse(
  kind: BillingCapabilityKind,
  state: BillingRuntimeState
) {
  const capability =
    kind === 'checkout'
      ? 'PAYMENT_GATEWAY_RUNTIME'
      : kind === 'portal'
        ? 'BILLING_PORTAL_RUNTIME'
        : 'BILLING_WEBHOOK_RUNTIME'

  const readinessFlag =
    kind === 'checkout'
      ? state.checkoutReady
      : kind === 'portal'
        ? state.portalReady
        : state.webhookReady

  const message =
    kind === 'checkout'
      ? 'Checkout runtime is not fully configured yet.'
      : kind === 'portal'
        ? 'Billing portal runtime is not fully configured yet.'
        : 'Billing webhook runtime is not fully configured yet.'

  return capabilityResponse({
    error: 'PAYMENT_GATEWAY_RUNTIME_UNAVAILABLE',
    message,
    status: 503,
    capability,
    capabilityStatus: 'PARTIAL',
    milestone: 'P1',
    metadata: {
      status: state.status,
      activeGateway: state.gateway.activeGateway,
      provider: state.provider.id,
      providerLabel: state.provider.label,
      setupEnv: state.provider.setupEnv,
      webhookPath: state.provider.webhookPath,
      checkoutEnabled: state.gateway.checkoutEnabled,
      checkoutReady: state.checkoutReady,
      portalReady: state.portalReady,
      webhookReady: state.webhookReady,
      stripeConfigured: state.stripe.configured,
      stripeSecretKeyConfigured: state.stripe.secretKeyConfigured,
      stripePublishableKeyConfigured: state.stripe.publishableKeyConfigured,
      stripeWebhookSecretConfigured: state.stripe.webhookSecretConfigured,
      stripePricesReady: state.stripe.pricesReady,
      stripeConfiguredPriceCount: state.stripe.configuredPriceCount,
      stripeRequiredPriceCount: state.stripe.requiredPriceCount,
      missingEnv: state.stripe.missingEnv,
      blockers: state.blockers,
      instructions: state.instructions,
      recommendedCommands: state.recommendedCommands,
      requestedSurface: kind,
      readinessFlag,
    },
  })
}
