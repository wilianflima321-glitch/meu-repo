/**
 * Block 6H.8 — billing threshold email evaluate + capability honesty.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  resolveBillingEmailCapability,
  whichBillingThresholdsCrossed,
} from '@/lib/billing/billing-threshold-emails'

describe('billing-threshold-emails (6H.8)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('flags Fast/Premium 80% and PAYG 50/100', () => {
    expect(
      whichBillingThresholdsCrossed({
        fastUsed: 800,
        fastLimit: 1000,
        premiumUsed: 0,
        premiumLimit: 1000,
        paygEnabled: false,
        spendCapUsdCents: null,
        accruedUsdCents: 0,
      }),
    ).toEqual(['fast80'])

    expect(
      whichBillingThresholdsCrossed({
        fastUsed: 0,
        fastLimit: 1000,
        premiumUsed: 900,
        premiumLimit: 1000,
        paygEnabled: true,
        spendCapUsdCents: 2500,
        accruedUsdCents: 1250,
      }),
    ).toEqual(['prem80', 'payg50'])

    expect(
      whichBillingThresholdsCrossed({
        fastUsed: 0,
        fastLimit: 1000,
        premiumUsed: 0,
        premiumLimit: 1000,
        paygEnabled: true,
        spendCapUsdCents: 2500,
        accruedUsdCents: 2500,
      }),
    ).toEqual(['payg100'])
  })

  it('does not warn below thresholds or unlimited pools', () => {
    expect(
      whichBillingThresholdsCrossed({
        fastUsed: 799,
        fastLimit: 1000,
        premiumUsed: 0,
        premiumLimit: -1,
        paygEnabled: true,
        spendCapUsdCents: 2500,
        accruedUsdCents: 1249,
      }),
    ).toEqual([])
  })

  it('HELD without transactional email keys; IMPLEMENTED with Resend', () => {
    vi.stubEnv('EMAIL_PROVIDER', '')
    vi.stubEnv('RESEND_API_KEY', '')
    vi.stubEnv('SENDGRID_API_KEY', '')
    vi.stubEnv('EMAIL_API_KEY', '')
    expect(resolveBillingEmailCapability().status).toBe('HELD')

    vi.stubEnv('RESEND_API_KEY', 're_test_key')
    expect(resolveBillingEmailCapability()).toMatchObject({
      status: 'IMPLEMENTED',
      provider: 'resend',
    })
  })

  it('templates exist for 6H.8 kinds', async () => {
    const { EmailTemplates } = await import('@/lib/email-system.templates')
    expect(EmailTemplates.usage_pool_80.subject({ poolLabel: 'Fast', poolPercent: 82 })).toContain(
      'Fast',
    )
    expect(EmailTemplates.payg_cap_50.subject({ capUsd: '25.00' })).toContain('50%')
    expect(EmailTemplates.payg_cap_100.subject({ capUsd: '25.00' })).toContain('spend cap')
    const html = EmailTemplates.usage_pool_80.html({
      name: 'Renato',
      poolLabel: 'Fast',
      poolPercent: 85,
      periodKey: '2026-07',
      usageUrl: 'https://aethel.dev/billing',
    })
    expect(html).toContain('IDE stays open')
    expect(html).toContain('https://aethel.dev/billing')
  })
})
