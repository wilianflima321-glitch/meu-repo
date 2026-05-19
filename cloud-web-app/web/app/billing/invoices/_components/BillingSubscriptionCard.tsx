import type { BillingData, BillingInvoicesSharedProps } from './billing-invoices-types'
import { formatIsoDate, StatusPill } from './billing-invoices-utils'

type BillingSubscriptionCardProps = BillingInvoicesSharedProps & {
  billingData: BillingData | null
  subscriptionPeriodLabel: string | null
}

export function BillingSubscriptionCard({ billingData, readiness, portalLoading, onOpenPortal, subscriptionPeriodLabel }: BillingSubscriptionCardProps) {
  return (
    <>
      {billingData?.subscription ? (
        <section className="mb-6 rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-[var(--aethel-text-secondary)]">Current plan</p>
              <h2 className="mt-1 text-xl font-semibold">{billingData.plan}</h2>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusPill status={billingData.subscription.status} />
                {subscriptionPeriodLabel ? <span className="text-sm text-[var(--aethel-text-secondary)]">{subscriptionPeriodLabel}</span> : null}
              </div>
            </div>
            <button type="button" onClick={onOpenPortal} disabled={portalLoading || readiness?.portalReady === false} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--aethel-primary-dark)] px-4 py-2 text-sm text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-primary)] disabled:cursor-not-allowed disabled:opacity-60">
              {portalLoading ? 'Opening...' : readiness?.portalReady === false ? 'Portal unavailable' : 'Manage subscription'}
            </button>
          </div>
        </section>
      ) : null}
      {billingData?.trial?.isActive ? (
        <section className="mb-6 rounded-xl border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] p-4 text-sm text-[var(--aethel-info-light)]">
          Trial active. {billingData.trial.daysRemaining} days remaining. Ends on {formatIsoDate(billingData.trial.endsAt)}.
        </section>
      ) : null}
    </>
  )
}
