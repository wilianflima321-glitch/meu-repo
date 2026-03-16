'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AethelAPIClient, APIError, type BillingReadiness } from '@/lib/api'

function getErrorMessage(error: unknown) {
  if (error instanceof APIError) return error.message
  if (error instanceof Error) return error.message
  return 'Unable to load billing cancellation state.'
}

export default function BillingCancelPage() {
  const [loading, setLoading] = useState(true)
  const [readiness, setReadiness] = useState<BillingReadiness | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const readinessData = await AethelAPIClient.getBillingReadiness()
        if (cancelled) return
        setReadiness(readinessData)
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
    <main className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)] flex items-center justify-center p-6">
      <div className="max-w-xl w-full rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-6">
        <h1 className="text-2xl font-semibold mb-2">Checkout canceled</h1>
        <p className="text-sm text-[var(--aethel-text-secondary)] mb-4">
          No billing change should be assumed from this page. You can return to billing and retry when the runtime is ready.
        </p>

        {loading ? (
          <div className="rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/60 px-3 py-3 text-sm text-[var(--aethel-text-secondary)]">
            Loading billing readiness...
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-500/30 bg-[var(--aethel-error)]/10 px-3 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : (
          <div className="rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/60 px-3 py-3 text-sm text-[var(--aethel-text-secondary)]">
            <p>
              Billing readiness:
              <span className="ml-2 font-medium text-[var(--aethel-text-primary)]">{readiness?.status || 'unknown'}</span>
            </p>
            <p className="mt-1 text-xs text-[var(--aethel-text-secondary)]">
              checkout={String(Boolean(readiness?.checkoutReady))} portal={String(Boolean(readiness?.portalReady))} webhook={String(Boolean(readiness?.webhookReady))}
            </p>
            {readiness?.provider ? (
              <p className="mt-1 text-xs text-[var(--aethel-text-secondary)]">
                provider={readiness.provider.label}
                {readiness.stripe
                  ? ` | publishable=${String(readiness.stripe.publishableKeyConfigured)} | prices=${readiness.stripe.configuredPriceCount}/${readiness.stripe.requiredPriceCount}`
                  : ''}
              </p>
            ) : null}
          </div>
        )}

        <div className="mt-6 flex gap-2">
          <Link href="/billing" className="px-4 py-2 rounded bg-[var(--aethel-primary-dark)] hover:bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)] text-sm">
            Return to billing
          </Link>
          <Link href="/pricing" className="px-4 py-2 rounded border border-[var(--aethel-border-secondary)] hover:bg-[var(--aethel-surface-tertiary)] text-sm">
            Review plans
          </Link>
        </div>
      </div>
    </main>
  )
}
