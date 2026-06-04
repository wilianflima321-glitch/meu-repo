'use client'

import { Suspense, useMemo, useState } from 'react'
import PublicFooter from '@/components/ui/PublicFooter'
import PublicHeader from '@/components/ui/PublicHeader'
import { analytics } from '@/lib/analytics'
import { PLANS } from '@/lib/plans'
import { PricingComparisonTable } from './_components/PricingComparisonTable'
import { PricingEnterpriseCard } from './_components/PricingEnterpriseCard'
import { PricingFaq } from './_components/PricingFaq'
import { PricingHero } from './_components/PricingHero'
import { PricingPlansGrid } from './_components/PricingPlansGrid'
import { PricingReadiness } from './_components/PricingReadiness'

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'month' | 'year'>('month')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const isAnnual = billingCycle === 'year'

  const plans = useMemo(() => {
    return PLANS.map((plan) => {
      const annualFallback = Number((plan.price * 12 * 0.8).toFixed(2))
      const annualBRLFallback = Math.round((plan.priceBRL || 0) * 12 * 0.8)
      return {
        ...plan,
        displayPrice: isAnnual ? (plan.priceAnnual ?? annualFallback) : plan.price,
        displayPriceBRL: isAnnual ? (plan.priceAnnualBRL ?? annualBRLFallback) : plan.priceBRL,
      }
    })
  }, [isAnnual])

  const enterprisePlan = plans.find((plan) => plan.id === 'enterprise')
  const corePlans = plans.filter((plan) => plan.id !== 'enterprise')

  const changeBillingCycle = (cycle: 'month' | 'year') => {
    setBillingCycle(cycle)
    analytics?.track('billing', 'pricing_cycle_change', {
      label: cycle,
      metadata: { source: 'pricing_toggle' },
    })
  }

  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <PublicHeader />

      <main className="relative z-10">
        <PricingHero billingCycle={billingCycle} onBillingCycleChange={changeBillingCycle} />
        <PricingPlansGrid corePlans={corePlans} isAnnual={isAnnual} />
        <PricingEnterpriseCard enterprisePlan={enterprisePlan} isAnnual={isAnnual} />
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <details className="border-y border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_36%,transparent)] px-5 py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">
              <span>Billing details and limits</span>
              <span className="text-[10px] normal-case tracking-normal text-[var(--aethel-text-quaternary)]">
                Compare only if needed
              </span>
            </summary>
            <Suspense fallback={<div className="mt-6 h-28 animate-pulse rounded-xl bg-[var(--aethel-surface-secondary)]" />}>
              <div className="mt-6 space-y-8">
                <PricingComparisonTable corePlans={corePlans} />
                <PricingReadiness />
              </div>
            </Suspense>
          </details>
        </section>
        <PricingFaq openFaq={openFaq} onToggle={(index) => setOpenFaq(openFaq === index ? null : index)} />
      </main>

      <PublicFooter />
    </div>
  )
}
