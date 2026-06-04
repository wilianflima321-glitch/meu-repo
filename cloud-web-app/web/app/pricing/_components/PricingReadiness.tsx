import PublicBillingReadiness from '@/components/billing/PublicBillingReadiness'

export function PricingReadiness() {
  return (
    <div className="mx-auto mt-12 max-w-3xl px-4 sm:px-6">
      <div className="mb-4 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Operational transparency</p>
        <h2 className="mt-2 text-2xl font-bold text-[var(--aethel-text-primary)]">Live checkout status</h2>
      </div>
      <PublicBillingReadiness />
      <p className="mt-3 text-center text-xs text-[var(--aethel-text-tertiary)]">Payments are processed by Stripe when credentials are configured.</p>
    </div>
  )
}
