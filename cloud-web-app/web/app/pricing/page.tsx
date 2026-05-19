'use client'

import { useMemo, useState } from 'react'
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
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/4 top-0 h-[600px] w-[600px] rounded-full bg-[var(--aethel-primary-dark)]/[0.07] blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-[var(--aethel-info)]/[0.05] blur-[150px]" />
      </div>

      <PublicHeader />

      <main className="relative z-10">
        <PricingHero billingCycle={billingCycle} onBillingCycleChange={changeBillingCycle} />
        <PricingPlansGrid corePlans={corePlans} isAnnual={isAnnual} />
        <PricingEnterpriseCard enterprisePlan={enterprisePlan} isAnnual={isAnnual} />
        <PricingComparisonTable corePlans={corePlans} />
        <PricingReadiness />
        <PricingFaq openFaq={openFaq} onToggle={(index) => setOpenFaq(openFaq === index ? null : index)} />
      </main>

      <PublicFooter />
    </div>
  )
}
