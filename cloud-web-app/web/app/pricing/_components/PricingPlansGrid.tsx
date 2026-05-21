import Link from 'next/link'
import Codicon from '@/components/ide/Codicon'
import { formatLimit, formatStorage, type PricingPlan } from './pricing-utils'

type PricingPlansGridProps = {
  corePlans: PricingPlan[]
  isAnnual: boolean
}

export function PricingPlansGrid({ corePlans, isAnnual }: PricingPlansGridProps) {
  const featuredPlans = corePlans.filter((plan) => ['free', 'pro', 'studio'].includes(plan.id))
  const supportingPlans = corePlans.filter((plan) => !featuredPlans.some((featuredPlan) => featuredPlan.id === plan.id))

  return (
    <section className="mx-auto mt-10 max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Most common paths</p>
          <h2 className="mt-2 text-2xl font-bold text-[var(--aethel-text-primary)]">Pick the pressure level first.</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-[var(--aethel-text-secondary)]">
          Starter and Basic remain available for smaller steps, but the first decision should stay simple: validate, build daily, or run a governed studio.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {featuredPlans.map((plan) => (
          <article key={plan.id} className={`relative flex h-full flex-col rounded-[24px] border p-5 transition-all ${plan.popular ? 'border-[color-mix(in_srgb,var(--aethel-primary)_40%,transparent)] bg-gradient-to-b from-[color-mix(in_srgb,var(--aethel-primary)_22%,transparent)] to-transparent shadow-xl' : 'border-[color-mix(in_srgb,var(--aethel-border-secondary)_60%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_22%,transparent)] hover:border-[color-mix(in_srgb,var(--aethel-border-secondary)_80%,transparent)]'}`}>
            {plan.popular ? <div className="absolute -top-3.5 left-6 rounded-full bg-[linear-gradient(135deg,var(--aethel-primary),var(--aethel-info))] px-4 py-1 text-xs font-bold text-[var(--aethel-text-primary)] shadow-lg">Best balance</div> : null}

            <div className="mb-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">{plan.id}</p>
              <h2 className="mt-1 text-xl font-bold text-[var(--aethel-text-primary)]">{plan.name}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">{plan.description}</p>
            </div>

            <div className="mb-5 border-b border-[var(--aethel-border-subtle)] pb-5">
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-[var(--aethel-text-primary)]">R${plan.displayPriceBRL}</span>
                <span className="pb-1 text-xs text-[var(--aethel-text-tertiary)]">/{isAnnual ? 'year' : 'month'}</span>
              </div>
              <p className="mt-1 text-[11px] text-[var(--aethel-text-tertiary)]">US${plan.displayPrice}/{isAnnual ? 'year' : 'month'}</p>
              <p className="mt-2 text-[11px] text-[var(--aethel-text-tertiary)]">{isAnnual ? 'Annual' : 'Monthly'} billing; taxes not included</p>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-2">
              {[
                { label: 'Projects', value: formatLimit(plan.limits.projects) },
                { label: 'Storage', value: formatStorage(plan.limits.storage) },
                { label: 'Daily tokens', value: formatLimit(plan.limits.tokensPerDay) },
                { label: 'Collaboration', value: formatLimit(plan.limits.collaborators) },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-3">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--aethel-text-tertiary)]">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--aethel-text-primary)]">{item.value}</p>
                </div>
              ))}
            </div>

            <ul className="mb-6 flex-1 space-y-2.5 text-sm">
              {plan.features.slice(0, 6).map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-[var(--aethel-text-secondary)]">
                  <span className="mt-0.5 shrink-0 text-[var(--aethel-success)]"><Codicon name="check" /></span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Link href={plan.id === 'free' ? '/register?plan=free&intent=studio' : `/dashboard?tab=billing&plan=${plan.id}&interval=${isAnnual ? 'year' : 'month'}`} className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] ${plan.popular ? 'bg-[var(--aethel-primary)] text-[var(--aethel-text-inverse)] shadow-lg hover:bg-[var(--aethel-primary-dark)]' : 'bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-quaternary)]'}`} data-analytics-category="billing" data-analytics-action={plan.id === 'free' ? 'onboarding_start' : 'checkout_start'} data-analytics-label={`pricing_plan:${plan.id}:${isAnnual ? 'year' : 'month'}`} data-analytics-source="pricing-plan-card">
              {plan.id === 'free' ? 'Start free' : `Select ${plan.name}`}
            </Link>
          </article>
        ))}
      </div>

      {supportingPlans.length > 0 ? (
        <div className="mt-5 rounded-[24px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_24%,transparent)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Smaller steps</p>
              <p className="mt-1 text-sm text-[var(--aethel-text-secondary)]">Use these when budget is tighter than collaboration pressure.</p>
            </div>
            <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
              {supportingPlans.map((plan) => (
                <Link
                  key={plan.id}
                  href={`/dashboard?tab=billing&plan=${plan.id}&interval=${isAnnual ? 'year' : 'month'}`}
                  className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_54%,transparent)] px-4 py-3 text-sm transition hover:border-[var(--aethel-border-secondary)]"
                >
                  <span className="font-semibold text-[var(--aethel-text-primary)]">{plan.name}</span>
                  <span className="ml-2 text-[var(--aethel-text-secondary)]">R${plan.displayPriceBRL}/{isAnnual ? 'year' : 'month'}</span>
                  <span className="mt-1 block text-xs leading-5 text-[var(--aethel-text-tertiary)]">{plan.description}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
