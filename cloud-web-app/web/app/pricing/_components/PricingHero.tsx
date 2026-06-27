import Link from 'next/link'

type PricingHeroProps = {
  billingCycle: 'month' | 'year'
  onBillingCycleChange: (cycle: 'month' | 'year') => void
}

export function PricingHero({ billingCycle, onBillingCycleChange }: PricingHeroProps) {
  return (
    <section
      className="mx-auto max-w-7xl px-4 pb-6 pt-16 sm:px-6 lg:px-8"
      data-pricing-hero="compact"
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:items-center">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 border-l border-[var(--aethel-primary)]/40 bg-[var(--aethel-primary)]/8 pl-3 text-[13px] font-medium text-[var(--aethel-primary-light)]">
            Transparent plans
          </div>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">Simple plans for real work.</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--aethel-text-secondary)]">
            Start small. Add seats, context, and controls when the team needs them.
          </p>

          <div className="mt-8 flex flex-wrap justify-start gap-3">
            <Link href="/dashboard?onboarding=1&source=pricing-hero" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--aethel-primary)] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-inverse)] transition-colors hover:bg-[var(--aethel-primary-dark)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]" data-analytics-category="project" data-analytics-action="onboarding_start" data-analytics-label="pricing_hero_start_studio" data-analytics-source="pricing">
              Start in Studio
            </Link>
            <Link href="/contact-sales" className="inline-flex items-center justify-center gap-2 border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] px-5 py-3 text-sm font-medium text-[var(--aethel-text-primary)] transition-colors hover:bg-[var(--aethel-surface-quaternary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]" data-analytics-category="user" data-analytics-action="contact_sales_start" data-analytics-label="pricing_hero_contact_sales" data-analytics-source="pricing">
              Talk to sales
            </Link>
          </div>

          {/* Sliding pill billing toggle (Vercel-style) */}
          <div
            role="group"
            aria-label="Billing cycle"
            className="mt-8 inline-flex items-center gap-0 rounded-xl border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-1 backdrop-blur-sm"
          >
            <div className="relative flex">
              {/* sliding background pill */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 rounded-lg bg-[var(--aethel-surface-quaternary)] shadow-sm transition-all duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
                style={{
                  left: billingCycle === 'month' ? '0%' : '50%',
                  width: '50%',
                }}
              />
              <CycleButton active={billingCycle === 'month'} onClick={() => onBillingCycleChange('month')}>Monthly</CycleButton>
              <CycleButton active={billingCycle === 'year'} onClick={() => onBillingCycleChange('year')}>
                Annual
                <span className="ml-1.5 rounded bg-[color-mix(in_srgb,var(--aethel-success)_20%,transparent)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--aethel-success)]">−20%</span>
              </CycleButton>
            </div>
          </div>
          <p className="mt-3 text-xs text-[var(--aethel-text-tertiary)]">Prices exclude taxes. Monthly or annual billing can be canceled anytime.</p>
        </div>

        <aside className="overflow-hidden border-y border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_22%,transparent)] shadow-[0_18px_48px_rgba(2,8,23,0.2)]">
          <details className="p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 border-y border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_50%,transparent)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-secondary)]">
              <span>Open plan fit guide</span>
              <span className="border border-[var(--aethel-border-subtle)] px-2 py-0.5 text-[10px] text-[var(--aethel-text-tertiary)]">
                3 paths
              </span>
            </summary>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {[
                { label: 'Free', value: 'Validate' },
                { label: 'Pro', value: 'Build daily' },
                { label: 'Team', value: 'Govern releases' },
              ].map((item) => (
                <div key={item.label} className="border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_62%,transparent)] px-3 py-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
                    {item.label}
                  </span>
                  <p className="mt-2 text-sm font-semibold text-[var(--aethel-text-primary)]">{item.value}</p>
                </div>
              ))}
            </div>
          </details>
        </aside>
      </div>
    </section>
  )
}

function CycleButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative z-10 flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-medium transition-colors duration-150 ${active ? 'text-[var(--aethel-text-primary)]' : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'}`}
    >
      {children}
    </button>
  )
}
