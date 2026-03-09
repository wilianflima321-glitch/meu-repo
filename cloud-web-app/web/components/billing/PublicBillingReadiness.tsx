'use client'

import { useEffect, useState } from 'react'
import { AethelAPIClient, type BillingReadiness } from '@/lib/api'

function ReadinessBadge({
  label,
  ready,
}: {
  label: string
  ready: boolean | undefined
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${ready ? 'text-emerald-300' : 'text-amber-200'}`}>
        {ready ? 'Ready' : 'Partial'}
      </p>
    </div>
  )
}

export default function PublicBillingReadiness() {
  const [readiness, setReadiness] = useState<BillingReadiness | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    AethelAPIClient.getBillingReadiness()
      .then((data) => {
        if (!cancelled) setReadiness(data)
      })
      .catch(() => {
        if (!cancelled) setReadiness(null)
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
      <section className="mx-auto mt-20 max-w-5xl rounded-3xl border border-slate-800 bg-slate-950/80 p-8">
        <p className="text-sm text-slate-400">Checking live billing readiness...</p>
      </section>
    )
  }

  if (!readiness) {
    return (
      <section className="mx-auto mt-20 max-w-5xl rounded-3xl border border-amber-500/20 bg-amber-500/10 p-8">
        <h2 className="text-2xl font-semibold text-white">Billing readiness unavailable</h2>
        <p className="mt-3 text-sm leading-7 text-amber-100/85">
          Pricing remains canonical, but this environment did not return a live billing readiness payload.
        </p>
      </section>
    )
  }

  return (
    <section className="mx-auto mt-20 max-w-5xl rounded-3xl border border-amber-500/20 bg-amber-500/10 p-8">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Live billing readiness</h2>
          <p className="mt-3 text-sm leading-7 text-amber-100/85">
            Pricing is already canonical. Conversion still depends on live checkout/runtime readiness in this environment.
          </p>
          <p className="mt-3 text-xs text-amber-100/70">
            status={readiness.status} | gateway={readiness.gateway?.activeGateway || 'unknown'} | provider={readiness.provider?.label || 'unknown'}
          </p>
        </div>
        <div className="grid min-w-[260px] grid-cols-3 gap-3">
          <ReadinessBadge label="Checkout" ready={readiness.checkoutReady} />
          <ReadinessBadge label="Portal" ready={readiness.portalReady} />
          <ReadinessBadge label="Webhook" ready={readiness.webhookReady} />
        </div>
      </div>

      {readiness.provider ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Billing provider</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {readiness.provider.label}
            </span>
            {readiness.provider.webhookPath ? (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-300">
                webhook {readiness.provider.webhookPath}
              </span>
            ) : null}
          </div>
          {readiness.provider.setupEnv.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {readiness.provider.setupEnv.map((envKey) => (
                <span
                  key={envKey}
                  className="rounded-full border border-slate-700 bg-slate-900/60 px-2.5 py-1 text-[11px] text-slate-200"
                >
                  {envKey}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-400">No provider setup env is required in this runtime.</p>
          )}
          {readiness.stripe ? (
            <div className="mt-3 text-xs text-slate-400">
              publishable={String(readiness.stripe.publishableKeyConfigured)} | prices={readiness.stripe.configuredPriceCount}/{readiness.stripe.requiredPriceCount}
            </div>
          ) : null}
        </div>
      ) : null}

      {readiness.stripe?.missingEnv?.length ? (
        <div className="mt-5 rounded-2xl border border-amber-500/20 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-amber-200">Missing runtime env</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {readiness.stripe.missingEnv.map((envKey) => (
              <span
                key={envKey}
                className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-100"
              >
                {envKey}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {readiness.instructions?.length ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Next actions</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            {readiness.instructions.map((instruction) => (
              <li key={instruction}>- {instruction}</li>
            ))}
          </ul>
          {readiness.recommendedCommands?.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {readiness.recommendedCommands.map((command) => (
                <code
                  key={command}
                  className="rounded-full border border-slate-700 bg-slate-900/60 px-2.5 py-1 text-[11px] text-cyan-300"
                >
                  {command}
                </code>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
