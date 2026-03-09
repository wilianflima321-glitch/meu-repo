import { optionalEnv } from '@/lib/env'

const REQUIRED_PRICE_KEYS = [
  'STRIPE_PRICE_STARTER',
  'STRIPE_PRICE_BASIC',
  'STRIPE_PRICE_PRO',
  'STRIPE_PRICE_STUDIO',
  'STRIPE_PRICE_ENTERPRISE',
] as const

export type StripeReadiness = {
  configured: boolean
  secretKeyConfigured: boolean
  publishableKeyConfigured: boolean
  webhookSecretConfigured: boolean
  pricesReady: boolean
  configuredPriceCount: number
  requiredPriceCount: number
  missingEnv: string[]
  configuredPrices: string[]
}

function isRuntimeConfigured(value: string | undefined) {
  const normalized = String(value ?? '').trim()
  if (!normalized) return false
  const lowered = normalized.toLowerCase()
  if (lowered.includes('replace_me') || lowered.includes('replace-with')) return false
  if (normalized.endsWith('...')) return false
  return true
}

export function getStripeReadiness(): StripeReadiness {
  const secretKeyConfigured = isRuntimeConfigured(optionalEnv('STRIPE_SECRET_KEY'))
  const publishableKeyConfigured = isRuntimeConfigured(optionalEnv('STRIPE_PUBLISHABLE_KEY'))
  const webhookSecretConfigured = isRuntimeConfigured(optionalEnv('STRIPE_WEBHOOK_SECRET'))
  const configuredPrices = REQUIRED_PRICE_KEYS.filter((key) => isRuntimeConfigured(optionalEnv(key)))
  const requiredPriceCount = REQUIRED_PRICE_KEYS.length
  const configuredPriceCount = configuredPrices.length
  const pricesReady = configuredPriceCount === requiredPriceCount
  const missingEnv = [
    ...(secretKeyConfigured ? [] : ['STRIPE_SECRET_KEY']),
    ...(publishableKeyConfigured ? [] : ['STRIPE_PUBLISHABLE_KEY']),
    ...(webhookSecretConfigured ? [] : ['STRIPE_WEBHOOK_SECRET']),
    ...REQUIRED_PRICE_KEYS.filter((key) => !isRuntimeConfigured(optionalEnv(key))),
  ]

  return {
    configured: secretKeyConfigured && publishableKeyConfigured && pricesReady,
    secretKeyConfigured,
    publishableKeyConfigured,
    webhookSecretConfigured,
    pricesReady,
    configuredPriceCount,
    requiredPriceCount,
    missingEnv,
    configuredPrices,
  }
}
