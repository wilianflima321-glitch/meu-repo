import type { BillingReadiness } from '@/lib/api'
import { StatusPill } from './billing-invoices-utils'

export function BillingReadinessCard({ readiness }: { readiness: BillingReadiness | null }) {
  if (!readiness) return null

  const missingEnv = readiness.stripe?.missingEnv ?? []

  return (
    <div className="mb-6 rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)]/70 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill status={readiness.checkoutReady ? 'active' : 'incomplete'} />
        <span className="text-sm text-[var(--aethel-text-secondary)]">checkout {readiness.checkoutReady ? 'ready' : 'partial'}</span>
        <StatusPill status={readiness.portalReady ? 'active' : 'incomplete'} />
        <span className="text-sm text-[var(--aethel-text-secondary)]">portal {readiness.portalReady ? 'ready' : 'partial'}</span>
        <StatusPill status={readiness.webhookReady ? 'active' : 'incomplete'} />
        <span className="text-sm text-[var(--aethel-text-secondary)]">webhook {readiness.webhookReady ? 'ready' : 'partial'}</span>
      </div>
      {readiness.provider ? (
        <p className="mt-3 text-xs text-[var(--aethel-text-secondary)]">
          provider={readiness.provider.label}
          {readiness.provider.webhookPath ? ` | webhook ${readiness.provider.webhookPath}` : ''}
          {readiness.stripe ? ` | publishable=${String(readiness.stripe.publishableKeyConfigured)} | prices=${readiness.stripe.configuredPriceCount}/${readiness.stripe.requiredPriceCount}` : ''}
        </p>
      ) : null}
      {missingEnv.length > 0 ? <p className="mt-3 text-xs text-[var(--aethel-text-secondary)]">Missing Stripe variables: {missingEnv.join(', ')}.</p> : null}
    </div>
  )
}
