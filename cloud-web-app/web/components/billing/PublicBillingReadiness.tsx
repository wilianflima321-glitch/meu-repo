'use client'

import { useEffect, useState } from 'react'
import { AethelAPIClient, type BillingReadiness } from '@/lib/api'

function StatusBadge({
  label,
  ready,
}: {
  label: string
  ready: boolean | undefined
}) {
  return (
    <div className="border-l border-[var(--aethel-border-subtle)] px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--aethel-text-quaternary)]">
        {label}
      </p>
      <p
        className={`mt-1 text-sm font-semibold ${
          ready
            ? 'text-[var(--aethel-success-light)]'
            : 'text-[var(--aethel-warning-light)]'
        }`}
      >
        {ready ? 'Ready' : 'Paused'}
      </p>
    </div>
  )
}

export default function PublicBillingReadiness() {
  const [billing, setBilling] = useState<BillingReadiness | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    AethelAPIClient.getBillingReadiness()
      .then((data) => {
        if (!cancelled) setBilling(data)
      })
      .catch(() => {
        if (!cancelled) setBilling(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <section className="mx-auto max-w-5xl border-y border-[var(--aethel-border-primary)] px-6 py-7">
        <p className="text-sm text-[var(--aethel-text-tertiary)]">
          Checking checkout status...
        </p>
      </section>
    )
  }

  if (!billing) {
    return (
      <section className="mx-auto max-w-5xl border-y border-[color-mix(in_srgb,var(--aethel-warning)_28%,transparent)] px-6 py-7">
        <h2 className="text-xl font-semibold text-[var(--aethel-text-primary)]">
          Billing status unavailable
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--aethel-warning-light)]/85">
          Plan information is visible, but this environment did not return live
          checkout status.
        </p>
      </section>
    )
  }

  const missingEnv = billing.stripe?.missingEnv ?? []

  return (
    <section className="mx-auto max-w-5xl border-y border-[var(--aethel-border-primary)] px-6 py-7">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--aethel-text-primary)]">
            Checkout status
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">
            Plans are visible. Checkout opens only when payment services are
            connected.
          </p>
        </div>
        <div className="grid min-w-[260px] grid-cols-3 gap-2">
          <StatusBadge label="Checkout" ready={billing.checkoutReady} />
          <StatusBadge label="Portal" ready={billing.portalReady} />
          <StatusBadge label="Webhook" ready={billing.webhookReady} />
        </div>
      </div>

      <details className="mt-5 border-t border-[var(--aethel-border-primary)] pt-4">
        <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-secondary)]">
          Open setup details
        </summary>
        <div className="mt-4 grid gap-4 text-xs leading-6 text-[var(--aethel-text-tertiary)]">
          <p>
            status={billing.status} | gateway=
            {billing.gateway?.activeGateway || 'unknown'} | provider=
            {billing.provider?.label || 'unknown'}
          </p>

          {billing.provider ? (
            <p>
              provider={billing.provider.label}
              {billing.provider.webhookPath
                ? ` | webhook=${billing.provider.webhookPath}`
                : ''}
            </p>
          ) : null}

          {billing.stripe ? (
            <p>
              publishable=
              {String(billing.stripe.publishableKeyConfigured)} | prices=
              {billing.stripe.configuredPriceCount}/
              {billing.stripe.requiredPriceCount}
            </p>
          ) : null}

          {missingEnv.length ? (
            <p>missing={missingEnv.join(', ')}</p>
          ) : (
            <p>No additional environment variable is required here.</p>
          )}

          {billing.instructions?.length ? (
            <ul className="grid gap-2">
              {billing.instructions.map((instruction) => (
                <li key={instruction}>- {instruction}</li>
              ))}
            </ul>
          ) : null}

          {billing.recommendedCommands?.length ? (
            <p>commands={billing.recommendedCommands.join(' | ')}</p>
          ) : null}
        </div>
      </details>
    </section>
  )
}
