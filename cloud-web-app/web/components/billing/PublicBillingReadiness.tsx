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
    <div className="rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_74%,transparent)] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-[var(--aethel-text-quaternary)]">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${ready ? 'text-[var(--aethel-success-light)]' : 'text-[var(--aethel-warning-light)]'}`}>
        {ready ? 'Pronto' : 'Parcial'}
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
      <section className="mx-auto mt-20 max-w-5xl rounded-3xl border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,rgba(16,22,34,0.94),rgba(10,14,24,0.92))] p-8 shadow-[0_24px_80px_rgba(2,6,23,0.42)]">
        <p className="text-sm text-[var(--aethel-text-tertiary)]">Verificando prontidao de billing ao vivo...</p>
      </section>
    )
  }

  if (!readiness) {
    return (
      <section className="mx-auto mt-20 max-w-5xl rounded-3xl border border-[color-mix(in_srgb,var(--aethel-warning)_25%,transparent)] bg-[var(--aethel-warning)]/10 p-8">
        <h2 className="text-2xl font-semibold text-[var(--aethel-text-primary)]">Prontidao de billing indisponivel</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--aethel-warning-light)]/85">
          Os planos continuam canonicos, mas este ambiente nao retornou um payload de prontidao de billing ao vivo.
        </p>
      </section>
    )
  }

  return (
    <section className="mx-auto mt-20 max-w-5xl rounded-3xl border border-[color-mix(in_srgb,var(--aethel-warning)_25%,transparent)] bg-[var(--aethel-warning)]/10 p-8">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--aethel-text-primary)]">Prontidao de billing ao vivo</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--aethel-warning-light)]/85">
            Os planos ja sao canonicos. A conversao ainda depende do checkout/runtime ao vivo neste ambiente.
          </p>
          <p className="mt-3 text-xs text-[var(--aethel-warning-light)]/70">
            status={readiness.status} | gateway={readiness.gateway?.activeGateway || 'desconhecido'} | provider={readiness.provider?.label || 'desconhecido'}
          </p>
        </div>
        <div className="grid min-w-[260px] grid-cols-3 gap-3">
          <ReadinessBadge label="Checkout" ready={readiness.checkoutReady} />
          <ReadinessBadge label="Portal" ready={readiness.portalReady} />
          <ReadinessBadge label="Webhook" ready={readiness.webhookReady} />
        </div>
      </div>

      {readiness.provider ? (
        <div className="mt-5 rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--aethel-text-secondary)]">Provedor de billing</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[var(--aethel-text-primary)]">
            <span className="rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-3 py-1">
              {readiness.provider.label}
            </span>
            {readiness.provider.webhookPath ? (
              <span className="rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-3 py-1 text-[var(--aethel-text-secondary)]">
                webhook {readiness.provider.webhookPath}
              </span>
            ) : null}
          </div>
          {readiness.provider.setupEnv.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {readiness.provider.setupEnv.map((envKey) => (
                <span
                  key={envKey}
                  className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_74%,transparent)] px-2.5 py-1 text-[11px] text-[var(--aethel-text-secondary)]"
                >
                  {envKey}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-[var(--aethel-text-tertiary)]">Nenhuma variavel de ambiente adicional e necessaria neste runtime.</p>
          )}
          {readiness.stripe ? (
            <div className="mt-3 text-xs text-[var(--aethel-text-tertiary)]">
              publishable={String(readiness.stripe.publishableKeyConfigured)} | prices={readiness.stripe.configuredPriceCount}/{readiness.stripe.requiredPriceCount}
            </div>
          ) : null}
        </div>
      ) : null}

      {readiness.stripe?.missingEnv?.length ? (
        <div className="mt-5 rounded-2xl border border-[color-mix(in_srgb,var(--aethel-warning)_25%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--aethel-warning-light)]">Variaveis de ambiente ausentes</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {readiness.stripe.missingEnv.map((envKey) => (
              <span
                key={envKey}
                className="rounded-full border border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)] bg-[var(--aethel-warning)]/10 px-2.5 py-1 text-[11px] text-[var(--aethel-warning-light)]"
              >
                {envKey}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {readiness.instructions?.length ? (
        <div className="mt-5 rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--aethel-text-secondary)]">Proximas acoes</p>
          <ul className="mt-3 space-y-2 text-sm text-[var(--aethel-text-secondary)]">
            {readiness.instructions.map((instruction) => (
              <li key={instruction}>- {instruction}</li>
            ))}
          </ul>
          {readiness.recommendedCommands?.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {readiness.recommendedCommands.map((command) => (
                <code
                  key={command}
                  className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_74%,transparent)] px-2.5 py-1 text-[11px] text-[var(--aethel-info-light)]"
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
