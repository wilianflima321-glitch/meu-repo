import { COMPARISON_ROWS } from './pricing-content'
import type { PricingPlan } from './pricing-utils'

export function PricingComparisonTable({ corePlans }: { corePlans: PricingPlan[] }) {
  return (
    <section className="mx-auto mt-12 max-w-7xl px-4 sm:px-6 lg:px-8">
      <details className="overflow-hidden rounded-[28px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,var(--aethel-panel),var(--aethel-panel-strong))] shadow-[0_24px_70px_rgba(2,8,23,0.35)]">
        <summary className="cursor-pointer list-none border-b border-[var(--aethel-border-primary)] px-6 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Detailed comparison</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-bold text-[var(--aethel-text-primary)]">Compare the most-used plans</h2>
            <span className="rounded-full border border-[var(--aethel-border-subtle)] px-3 py-1 text-xs text-[var(--aethel-text-secondary)]">
              Open table
            </span>
          </div>
        </summary>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-[var(--aethel-border-primary)] text-[11px] uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
                <th className="px-6 py-4 font-semibold">Capacity</th>
                {corePlans.map((plan) => <th key={plan.id} className="px-6 py-4 font-semibold text-[var(--aethel-text-primary)]">{plan.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.label} className="border-b border-[var(--aethel-border-subtle)]">
                  <td className="px-6 py-4 text-sm font-medium text-[var(--aethel-text-primary)]">{row.label}</td>
                  {corePlans.map((plan) => <td key={`${row.label}-${plan.id}`} className="px-6 py-4 text-sm text-[var(--aethel-text-secondary)]">{row.getValue(plan)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}
