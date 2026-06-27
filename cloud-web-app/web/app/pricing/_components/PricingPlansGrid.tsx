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
          Starter and Basic remain available, but the first choice should stay simple: validate an idea, build daily, or run larger work.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {featuredPlans.map((plan) => (
          <article key={plan.id} className={`aethel-card-lift relative flex h-full flex-col rounded-2xl border p-5 ${plan.popular ? 'border-[color-mix(in_srgb,var(--aethel-primary)_42%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] shadow-[var(--aethel-shadow-xl)] hover:border-[color-mix(in_srgb,var(--aethel-primary)_60%,transparent)]' : 'border-[color-mix(in_srgb,var(--aethel-border-secondary)_60%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_22%,transparent)] hover:border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)]'}`}>
            {plan.popular ? <div className="absolute -top-3.5 left-6 rounded-full border border-[color-mix(in_srgb,var(--aethel-primary)_38%,transparent)] bg-[var(--aethel-surface-primary)] px-4 py-1 text-xs font-bold text-[var(--aethel-primary-light)] shadow-[var(--aethel-shadow-md)]">Best balance</div> : null}

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
                { label: 'Projects', value: formatLimit(plan.limits.cloudProjectsMax) },
                { label: 'Storage', value: formatStorage(plan.limits.storage) },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-3">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--aethel-text-tertiary)]">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--aethel-text-primary)]">{item.value}</p>
                </div>
              ))}
            </div>

            <ul className="mb-6 flex-1 space-y-2.5 text-sm">
              {plan.features.slice(0, 4).map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-[var(--aethel-text-secondary)]">
                  <span className="mt-0.5 shrink-0 text-[var(--aethel-success)]"><Codicon name="check" /></span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <details className="mb-5 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_18%,transparent)] px-3 py-2">
              <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
                Limits
              </summary>
              <div className="mt-3 grid gap-2 text-xs text-[var(--aethel-text-secondary)]">
                <p>Daily tokens: <span className="font-semibold text-[var(--aethel-text-primary)]">{formatLimit(plan.limits.tokensPerDay)}</span></p>
                <p>Collaborators: <span className="font-semibold text-[var(--aethel-text-primary)]">{formatLimit(plan.limits.collaborators)}</span></p>
                {plan.features.length > 4 ? (
                  <p className="text-[var(--aethel-text-tertiary)]">{plan.features.length - 4} more plan details stay available after selection.</p>
                ) : null}
              </div>
            </details>

            <Link href={plan.id === 'free' ? '/register?plan=free&intent=studio' : `/dashboard?tab=billing&plan=${plan.id}&interval=${isAnnual ? 'year' : 'month'}`} className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] ${plan.popular ? 'bg-[var(--aethel-primary)] text-[var(--aethel-text-inverse)] shadow-[var(--aethel-shadow-md)] hover:bg-[var(--aethel-primary-dark)]' : 'bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-quaternary)]'}`} data-analytics-category="billing" data-analytics-action={plan.id === 'free' ? 'onboarding_start' : 'checkout_start'} data-analytics-label={`pricing_plan:${plan.id}:${isAnnual ? 'year' : 'month'}`} data-analytics-source="pricing-plan-card">
              {plan.id === 'free' ? 'Start free' : `Select ${plan.name}`}
            </Link>
          </article>
        ))}
      </div>

      {supportingPlans.length > 0 ? (
        <details className="mt-5 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_24%,transparent)] p-4">
          <summary className="cursor-pointer list-none">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Smaller steps</p>
                <p className="mt-1 text-sm text-[var(--aethel-text-secondary)]">Open smaller plans only if the three main paths feel too large.</p>
              </div>
              <span className="rounded-full border border-[var(--aethel-border-subtle)] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[var(--aethel-text-secondary)]">
                Open smaller plans
              </span>
            </div>
          </summary>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--aethel-border-subtle)] pt-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Supporting plans</p>
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
        </details>
      ) : null}
    </section>
  )
}
