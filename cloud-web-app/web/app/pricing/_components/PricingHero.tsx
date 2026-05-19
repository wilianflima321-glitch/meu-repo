import Link from 'next/link'

type PricingHeroProps = {
  billingCycle: 'month' | 'year'
  onBillingCycleChange: (cycle: 'month' | 'year') => void
}

export function PricingHero({ billingCycle, onBillingCycleChange }: PricingHeroProps) {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-6 pt-16 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:items-center">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--aethel-primary)]/20 bg-[var(--aethel-primary)]/10 px-4 py-1.5 text-[13px] font-medium text-[var(--aethel-primary-light)]">
            Transparent plans
          </div>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">Clear plans for builders and teams.</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--aethel-text-secondary)]">
            Apps + Research are the current focus. Plans scale by volume, context, and collaboration depth.
          </p>

          <div className="mt-8 flex flex-wrap justify-start gap-3">
            <Link href="/dashboard?onboarding=1&source=pricing-hero" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--aethel-primary)] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-inverse)] transition-colors hover:bg-[var(--aethel-primary-dark)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]" data-analytics-category="project" data-analytics-action="onboarding_start" data-analytics-label="pricing_hero_start_studio" data-analytics-source="pricing">
              Start in Studio
            </Link>
            <Link href="/contact-sales" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--aethel-surface-tertiary)] px-5 py-3 text-sm font-medium text-[var(--aethel-text-primary)] transition-colors hover:bg-[var(--aethel-surface-quaternary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]" data-analytics-category="user" data-analytics-action="contact_sales_start" data-analytics-label="pricing_hero_contact_sales" data-analytics-source="pricing">
              Talk to sales
            </Link>
          </div>

          <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-1">
            <CycleButton active={billingCycle === 'month'} onClick={() => onBillingCycleChange('month')}>Monthly</CycleButton>
            <CycleButton active={billingCycle === 'year'} onClick={() => onBillingCycleChange('year')}>
              Annual
              <span className="rounded-full bg-[color-mix(in_srgb,var(--aethel-success)_20%,transparent)] px-2 py-0.5 text-[10px] font-bold text-[var(--aethel-success)]">-20%</span>
            </CycleButton>
          </div>
          <p className="mt-3 text-xs text-[var(--aethel-text-tertiary)]">Prices exclude taxes. Monthly or annual billing can be canceled anytime.</p>
        </div>

        <aside className="overflow-hidden rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] shadow-[0_24px_70px_rgba(2,8,23,0.35)]">
          <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] px-5 py-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Plan fit</p>
              <p className="mt-1 text-sm text-[var(--aethel-text-primary)]">Choose by workflow pressure, not hype.</p>
            </div>
            <div className="rounded-full border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] px-3 py-1 text-[11px] font-medium text-[var(--aethel-success-light)]">
              Apps + Research
            </div>
          </div>

          <div className="grid gap-3 border-b border-[var(--aethel-border-primary)] p-5">
            {[
              { label: 'Free', value: 'Validate the studio loop', detail: 'Small projects, first mission, no sales call.' },
              { label: 'Pro', value: 'Daily builder workflow', detail: 'More context, agents, preview, and collaboration.' },
              { label: 'Team', value: 'Shared delivery pressure', detail: 'Seats, governance, evidence, and release controls.' },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_70%,transparent)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full border border-[var(--aethel-border-secondary)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">{item.label}</span>
                  <span className="h-2 w-2 rounded-full bg-[var(--aethel-success)]" />
                </div>
                <p className="mt-3 text-sm font-semibold text-[var(--aethel-text-primary)]">{item.value}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--aethel-text-tertiary)]">{item.detail}</p>
              </div>
            ))}
          </div>

          <div className="space-y-4 px-5 py-5">
            <p className="text-sm leading-6 text-[var(--aethel-text-secondary)]">The right plan depends on team pace and how much of the main workflow you want from day one.</p>
            <div className="flex flex-wrap gap-2">
              {['Studio home', 'Workbench', 'Visible readiness'].map((label) => (
                <span key={label} className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_74%,transparent)] px-3 py-1 text-[11px] font-medium text-[var(--aethel-text-primary)]">{label}</span>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}

function CycleButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors ${active ? 'bg-[var(--aethel-text-primary)] text-[var(--aethel-surface-primary)]' : 'text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]'}`}>
      {children}
    </button>
  )
}
