import type { BillingData, BillingInvoicesSharedProps } from './billing-invoices-types'
import { StatusPill } from './billing-invoices-utils'

type BillingPaymentMethodsProps = BillingInvoicesSharedProps & {
  billingData: BillingData | null
}

export function BillingPaymentMethods({ billingData, readiness, portalLoading, onOpenPortal }: BillingPaymentMethodsProps) {
  if (!billingData?.paymentMethods?.length) return null

  return (
    <section className="mb-6 rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Payment methods</h2>
          <p className="mt-1 text-sm text-[var(--aethel-text-secondary)]">Payment methods registered in Stripe for this customer.</p>
        </div>
        <button type="button" onClick={onOpenPortal} disabled={portalLoading || readiness?.portalReady === false} className="text-sm text-[var(--aethel-primary-light)] hover:text-[var(--aethel-primary-light)] disabled:cursor-not-allowed disabled:opacity-60">
          Update in portal
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {billingData.paymentMethods.map((pm) => (
          <div key={pm.id} className="flex items-center justify-between rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/70 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-[var(--aethel-text-primary)]">{(pm.brand || 'card').toUpperCase()} ending in {pm.last4 || '----'}</p>
              <p className="text-xs text-[var(--aethel-text-secondary)]">Expires {String(pm.expMonth || '').padStart(2, '0')}/{pm.expYear || '----'}</p>
            </div>
            {pm.isDefault ? <StatusPill status="active" /> : null}
          </div>
        ))}
      </div>
    </section>
  )
}
