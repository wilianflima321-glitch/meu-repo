export type BillingProviderId = 'stripe' | 'disabled'

export type BillingProviderConfig = {
  id: BillingProviderId
  label: string
  setupEnv: string[]
  surfaces: Array<'checkout' | 'portal' | 'webhook'>
  webhookPath: string | null
}

const STRIPE_SETUP_ENV = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_STARTER',
  'STRIPE_PRICE_BASIC',
  'STRIPE_PRICE_PRO',
  'STRIPE_PRICE_STUDIO',
  'STRIPE_PRICE_ENTERPRISE',
  'STRIPE_PRICE_STARTER_ANNUAL',
  'STRIPE_PRICE_BASIC_ANNUAL',
  'STRIPE_PRICE_PRO_ANNUAL',
  'STRIPE_PRICE_STUDIO_ANNUAL',
  'STRIPE_PRICE_ENTERPRISE_ANNUAL',
] as const

export function getBillingProviderConfig(provider: BillingProviderId): BillingProviderConfig {
  if (provider === 'disabled') {
    return {
      id: 'disabled',
      label: 'Disabled',
      setupEnv: [],
      surfaces: [],
      webhookPath: null,
    }
  }

  return {
    id: 'stripe',
    label: 'Stripe',
    setupEnv: [...STRIPE_SETUP_ENV],
    surfaces: ['checkout', 'portal', 'webhook'],
    webhookPath: '/api/billing/webhook',
  }
}
