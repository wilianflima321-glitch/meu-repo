'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { useSearchParams } from 'next/navigation'
import { API_BASE, type BillingReadiness } from '@/lib/api'
import StudioLayout from '@/components/studio/StudioLayout'
import { useToast } from '@/components/ui/Toast'
import {
  BillingCycleSwitch,
  BillingHeader,
  BillingIntegrationStrip,
  BillingLoadingRunboard,
  CheckoutReadinessWarning,
  PlanCard,
  UsageSection,
  fallbackPlans,
  fetcher,
  primaryPlanIds,
  type Currency,
  type PlansResponse,
} from './BillingPageClient.parts'

export function BillingPageClient() {
  const toast = useToast()
  const searchParams = useSearchParams()
  const [currency, setCurrency] = useState<Currency>('USD')
  const [billingCycle, setBillingCycle] = useState<'month' | 'year'>('month')
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [showUsage, setShowUsage] = useState(true)

  useEffect(() => {
    const tab = searchParams?.get('tab')
    if (tab === 'payg' || tab === 'usage' || tab === 'credits') {
      setShowUsage(true)
      if (tab === 'payg') {
        requestAnimationFrame(() => {
          document.getElementById('payg-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      }
    }
  }, [searchParams])

  const { data, isLoading, error } = useSWR<PlansResponse>(
    `${API_BASE}/billing/plans`,
    fetcher,
  )
  const { data: readiness } = useSWR<BillingReadiness>(
    `${API_BASE}/billing/readiness`,
    fetcher,
  )
  const plans = useMemo(() => {
    const loadedPlans = data?.plans ?? []
    return loadedPlans.length > 0 ? loadedPlans : fallbackPlans
  }, [data])
  const primaryPlans = useMemo(
    () => plans.filter((plan) => primaryPlanIds.includes(plan.id)),
    [plans],
  )
  const secondaryPlans = useMemo(
    () => plans.filter((plan) => !primaryPlanIds.includes(plan.id)),
    [plans],
  )
  const usingFallbackPlans = !data?.plans?.length
  const isSelfServeCheckoutBlocked = readiness?.checkoutReady !== true

  const handleSubscribe = async (planId: string) => {
    if (planId === 'enterprise') {
      window.location.href = '/contact-sales?source=billing-page-enterprise'
      return
    }

    setSelectedPlan(planId)
    try {
      const token = localStorage.getItem('aethel-token')
      if (!token) {
        toast.warning('Sign in to continue with a subscription.')
        window.location.href = '/login'
        return
      }
      if (isSelfServeCheckoutBlocked) {
        toast.warning(
          'Checkout is not available in this environment.',
          'Configure billing runtime before enabling self-serve upgrades.',
        )
        return
      }
      window.location.href = `/billing/checkout?plan=${encodeURIComponent(planId)}&interval=${billingCycle}`
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unexpected checkout error'
      toast.error('Could not complete the subscription.', message)
    } finally {
      setSelectedPlan(null)
    }
  }

  return (
    <StudioLayout
      title="Billing"
      subtitle="Usage control, cost predictability, and instant upgrades."
      maxWidth="7xl"
    >
      <div className="p-6">
        <BillingHeader currency={currency} onCurrencyChange={setCurrency} />
        {(isLoading || error || usingFallbackPlans) && (
          <BillingLoadingRunboard
            mode={error ? 'error' : isLoading ? 'syncing' : 'cached'}
            message={
              error
                ? 'Live billing could not be reached, so checkout stays guarded while the last known plan shape remains visible.'
                : isLoading
                  ? 'Live billing is syncing in the background. Plan selection stays visible, but checkout remains guarded until the provider confirms.'
                  : 'Using the public plan shape until live billing returns project-specific limits.'
            }
          />
        )}
        <BillingIntegrationStrip />
        <BillingCycleSwitch
          billingCycle={billingCycle}
          onChange={setBillingCycle}
        />
        <UsageSection
          showUsage={showUsage}
          onToggle={() => setShowUsage((previous) => !previous)}
        />
        {readiness?.checkoutReady === false && <CheckoutReadinessWarning />}
        <div
          data-billing-primary-decision="true"
          className="grid grid-cols-1 gap-4 md:grid-cols-3"
        >
          {primaryPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              billingCycle={billingCycle}
              currency={currency}
              isBusy={selectedPlan === plan.id}
              isCheckoutBlocked={
                isSelfServeCheckoutBlocked && plan.id !== 'enterprise'
              }
              onSubscribe={handleSubscribe}
              plan={plan}
            />
          ))}
        </div>
        {secondaryPlans.length > 0 && (
          <details className="mt-5 rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)] p-4">
            <summary className="cursor-pointer text-sm font-semibold text-[var(--aethel-text-primary)]">
              Compare starter, free, and enterprise options
            </summary>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-[var(--aethel-text-secondary)]">
              Secondary plans stay available for edge cases, testing, and
              sales-led rollout, but the main buying decision stays focused on
              the three production paths.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              {secondaryPlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  billingCycle={billingCycle}
                  currency={currency}
                  isBusy={selectedPlan === plan.id}
                  isCheckoutBlocked={
                    isSelfServeCheckoutBlocked && plan.id !== 'enterprise'
                  }
                  onSubscribe={handleSubscribe}
                  plan={plan}
                />
              ))}
            </div>
          </details>
        )}
        <p className="mt-8 text-center text-sm text-[var(--aethel-text-secondary)]">
          AI, execution, and deployment limits vary by plan. Upgrades and
          downgrades apply without manual migration.
        </p>
        <p className="mt-2 text-center text-xs text-[var(--aethel-text-tertiary)]">
          Secure checkout through Stripe | Cancel anytime
        </p>
      </div>
    </StudioLayout>
  )
}
