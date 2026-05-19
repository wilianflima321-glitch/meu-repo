export function PromotionsHeader({ lastUpdated, onRefresh }: { lastUpdated: Date | null; onRefresh: () => void }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">Promotions and coupons</h1>
        <p className="text-sm text-[var(--aethel-text-secondary)]">Complete Stripe-backed promotion management from the admin panel.</p>
        {lastUpdated && <p className="text-xs text-[var(--aethel-text-tertiary)]">Updated at {lastUpdated.toLocaleString('en-US')}</p>}
      </div>
      <button type="button" onClick={onRefresh} className="rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] px-3 py-2 text-sm text-[var(--aethel-text-secondary)]">
        Refresh
      </button>
    </div>
  )
}
