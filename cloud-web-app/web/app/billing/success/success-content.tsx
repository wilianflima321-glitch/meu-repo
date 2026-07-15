'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AethelAPIClient, APIError, type BillingReadiness, type BillingSubscriptionStatus } from '@/lib/api'
import { useBrowserSearch } from '@/lib/navigation/use-browser-pathname'

function getErrorMessage(error: unknown) {
  if (error instanceof APIError) return error.message
  if (error instanceof Error) return error.message
  return 'Could not load the billing confirmation state.'
}

export default function BillingSuccessContent() {
  const search = useBrowserSearch()
  const searchParams = useMemo(() => new URLSearchParams(search), [search])
  const requestedPlan = searchParams.get('plan')
  const [loading, setLoading] = useState(true)
  const [readiness, setReadiness] = useState<BillingReadiness | null>(null)
  const [subscription, setSubscription] = useState<BillingSubscriptionStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [readinessData, subscriptionData] = await Promise.all([
          AethelAPIClient.getBillingReadiness(),
          AethelAPIClient.getBillingSubscription(),
        ])
        if (cancelled) return
        setReadiness(readinessData)
        setSubscription(subscriptionData)
      } catch (nextError) {
        if (cancelled) return
        setError(getErrorMessage(nextError))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--aethel-surface-primary)] p-6 text-[var(--aethel-text-primary)]">
      <div className="w-full max-w-xl rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-6">
        <h1 className="mb-2 text-2xl font-semibold">Checkout completed</h1>
        <p className="mb-4 text-sm text-[var(--aethel-text-secondary)]">
          We received the checkout result. Plan access turns on after payment confirmation.
        </p>

        {requestedPlan && (
          <div className="mb-4 rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/60 px-3 py-2 text-sm text-[var(--aethel-text-secondary)]">
            Requested plan: <span className="font-medium text-[var(--aethel-text-primary)]">{requestedPlan}</span>
          </div>
        )}

        {loading ? (
          <div className="rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/60 px-3 py-3 text-sm text-[var(--aethel-text-secondary)]">
            Checking payment status...
          </div>
        ) : error ? (
          <div className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[var(--aethel-error)]/10 px-3 py-3 text-sm text-[var(--aethel-error-light)]">
            {error}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/60 px-3 py-3 text-sm text-[var(--aethel-text-secondary)]">
              <p>
                Payment setup:
                <span className="ml-2 font-medium text-[var(--aethel-text-primary)]">{readiness?.status || 'unknown'}</span>
              </p>
              <details className="mt-2 text-xs text-[var(--aethel-text-secondary)]">
                <summary className="cursor-pointer list-none font-medium text-[var(--aethel-text-tertiary)]">Show payment checks</summary>
                <p className="mt-1">
                  checkout={String(Boolean(readiness?.checkoutReady))} portal={String(Boolean(readiness?.portalReady))} webhook={String(Boolean(readiness?.webhookReady))}
                </p>
                {readiness?.provider ? (
                  <p className="mt-1">
                    provider={readiness.provider.label}
                    {readiness.stripe
                      ? ` | publishable=${String(readiness.stripe.publishableKeyConfigured)} | prices=${readiness.stripe.configuredPriceCount}/${readiness.stripe.requiredPriceCount}`
                      : ''}
                  </p>
                ) : null}
              </details>
            </div>
            <div className="rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/60 px-3 py-3 text-sm text-[var(--aethel-text-secondary)]">
              <p>
                Current plan:
                <span className="ml-2 font-medium text-[var(--aethel-text-primary)]">{subscription?.plan || 'unknown'}</span>
              </p>
              <p className="mt-1 text-xs text-[var(--aethel-text-secondary)]">
                Subscription status: {subscription?.subscription?.status || 'not active yet'}
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-2">
          <Link href="/billing" className="rounded bg-[var(--aethel-primary-dark)] px-4 py-2 text-sm text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-primary)]">
            Open billing
          </Link>
          <Link href="/dashboard" className="rounded border border-[var(--aethel-border-secondary)] px-4 py-2 text-sm hover:bg-[var(--aethel-surface-tertiary)]">
            Open dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}
