import type { BillingRuntimeSnapshot } from './payments-types'

export function PaymentsRuntimeCard({ runtime }: { runtime: BillingRuntimeSnapshot | null }) {
  if (!runtime) return null
  return (
    <div className="mb-6 rounded border border-[color-mix(in_srgb,var(--aethel-border-primary)_70%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_50%,transparent)] p-3 text-xs text-[var(--aethel-text-secondary)]">
      Runtime: <span>{runtime.status}</span> | provider <span>{runtime.provider?.label || 'unknown'}</span> | checkout <span>{String(Boolean(runtime.checkoutReady))}</span> | portal <span>{String(Boolean(runtime.portalReady))}</span> | webhook <span>{String(Boolean(runtime.webhookReady))}</span>
      {runtime.stripe ? (
        <>
          {' '}| publishable <span>{String(runtime.stripe.publishableKeyConfigured)}</span> | prices <span>{runtime.stripe.configuredPriceCount}/{runtime.stripe.requiredPriceCount}</span>
        </>
      ) : null}
      {runtime.stripe?.missingEnv?.length ? <div className="mt-2 text-[var(--aethel-warning)]">Missing env: {runtime.stripe.missingEnv.join(', ')}</div> : null}
    </div>
  )
}
