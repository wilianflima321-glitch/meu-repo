import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  resolvePaygInvoiceCapability,
  isStripePaygFlushConfigured,
} from '@/lib/billing/payg-invoice-flush'
import { PAYG_BILL_THRESHOLD_USD_CENTS } from '@/lib/billing/payg-constants'
import type { PaygSnapshot } from '@/lib/billing/payg-policy'

vi.mock('@/lib/env', () => ({
  optionalEnv: (key: string) => (key === 'STRIPE_SECRET_KEY' ? 'sk_test_mock' : undefined),
  requireEnv: (key: string) => {
    if (key === 'STRIPE_SECRET_KEY') return 'sk_test_mock'
    throw new Error(`missing ${key}`)
  },
}))

describe('Block 6C.4 PAYG invoice capability honesty', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('HELD without payment method', () => {
    const snap: PaygSnapshot = {
      enabled: true,
      spendCapUsdCents: 2500,
      accruedUsdCents: 0,
      periodKey: '2026-07',
      hasPaymentMethod: false,
    }
    const cap = resolvePaygInvoiceCapability(snap)
    expect(cap.status).toBe('HELD')
    expect(cap.message.toLowerCase()).toContain('card')
  })

  it('IMPLEMENTED when PM + Stripe secret present', () => {
    expect(isStripePaygFlushConfigured()).toBe(true)
    const snap: PaygSnapshot = {
      enabled: true,
      spendCapUsdCents: 5000,
      accruedUsdCents: PAYG_BILL_THRESHOLD_USD_CENTS,
      periodKey: '2026-07',
      hasPaymentMethod: true,
    }
    const cap = resolvePaygInvoiceCapability(snap)
    expect(cap.status).toBe('IMPLEMENTED')
  })

  it('setup-payment-method route exists as Checkout setup mode', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const src = fs.readFileSync(
      path.join(process.cwd(), 'app/api/billing/payg/setup-payment-method/route.ts'),
      'utf8',
    )
    expect(src).toContain("mode: 'setup'")
    expect(src).toContain('payg_payment_method_setup')
  })

  it('webhook persists stripePaymentMethodId for PAYG setup', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const src = fs.readFileSync(path.join(process.cwd(), 'app/api/billing/webhook/route.ts'), 'utf8')
    expect(src).toContain('payg_payment_method_setup')
    expect(src).toContain('stripePaymentMethodId')
  })

  it('cron flush requires CRON_SECRET bearer', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const src = fs.readFileSync(path.join(process.cwd(), 'app/api/cron/payg-flush/route.ts'), 'utf8')
    expect(src).toContain('CRON_SECRET')
    expect(src).toContain('force: true')
  })
})
