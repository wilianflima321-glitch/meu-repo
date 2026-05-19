'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AethelAPIClient, type BillingReadiness } from '@/lib/api'
import { BillingErrorAlert } from './_components/BillingErrorAlert'
import { BillingInvoicesHeader } from './_components/BillingInvoicesHeader'
import { BillingInvoicesTable } from './_components/BillingInvoicesTable'
import { BillingPaymentMethods } from './_components/BillingPaymentMethods'
import { BillingReadinessCard } from './_components/BillingReadinessCard'
import { BillingSubscriptionCard } from './_components/BillingSubscriptionCard'
import type { BillingData } from './_components/billing-invoices-types'
import { formatUnixDate, getErrorMessage } from './_components/billing-invoices-utils'

export default function InvoicesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [billingData, setBillingData] = useState<BillingData | null>(null)
  const [readiness, setReadiness] = useState<BillingReadiness | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [portalData, readinessData] = await Promise.all([
        fetch('/api/billing/portal', { cache: 'no-store' }).then(async (res) => {
          const payload = await res.json().catch(() => null)
          if (!res.ok) {
            const message = (payload && typeof payload === 'object' && ('message' in payload || 'error' in payload) ? String((payload as { message?: unknown; error?: unknown }).message || (payload as { error?: unknown }).error) : null) || `HTTP ${res.status}`
            throw new Error(message)
          }
          return payload as BillingData
        }),
        AethelAPIClient.getBillingReadiness(),
      ])

      setBillingData(portalData)
      setReadiness(readinessData)
    } catch (nextError) {
      setError(getErrorMessage(nextError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openPortal = useCallback(async () => {
    setPortalLoading(true)
    setError(null)
    try {
      const result = await AethelAPIClient.openBillingPortal()
      if (result.url && typeof window !== 'undefined') {
        window.location.href = result.url
        return
      }
      throw new Error('Billing portal URL was not returned.')
    } catch (nextError) {
      setError(getErrorMessage(nextError))
    } finally {
      setPortalLoading(false)
    }
  }, [])

  const subscriptionPeriodLabel = useMemo(() => {
    if (!billingData?.subscription) return null
    if (billingData.subscription.cancelAtPeriodEnd) return `Cancels on ${formatUnixDate(billingData.subscription.currentPeriodEnd)}`
    return `Next billing: ${formatUnixDate(billingData.subscription.currentPeriodEnd)}`
  }, [billingData?.subscription])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
        <div className="text-sm text-[var(--aethel-text-secondary)]">Loading billing data...</div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <BillingInvoicesHeader onRefresh={() => void load()} onBack={() => router.push('/billing')} />
        <BillingErrorAlert error={error} />
        <BillingReadinessCard readiness={readiness} />
        <BillingSubscriptionCard billingData={billingData} readiness={readiness} portalLoading={portalLoading} onOpenPortal={() => void openPortal()} subscriptionPeriodLabel={subscriptionPeriodLabel} />
        <BillingPaymentMethods billingData={billingData} readiness={readiness} portalLoading={portalLoading} onOpenPortal={() => void openPortal()} />
        <BillingInvoicesTable billingData={billingData} />
      </div>
    </main>
  )
}
