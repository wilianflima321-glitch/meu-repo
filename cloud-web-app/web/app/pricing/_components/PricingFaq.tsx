import Codicon from '@aethel/ide-ui/Codicon'
import { FAQ_ITEMS } from './pricing-content'

export function PricingFaq({ openFaq, onToggle }: { openFaq: number | null; onToggle: (index: number) => void }) {
  return (
    <section className="mx-auto mt-24 w-full max-w-3xl px-4 pb-24 sm:px-6">
      <details className="rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_24%,transparent)]">
        <summary className="cursor-pointer list-none px-6 py-5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-info)]">FAQ</p>
          <h2 className="mt-3 text-3xl font-bold text-[var(--aethel-text-primary)]">Frequently asked questions</h2>
          <p className="mt-2 text-sm text-[var(--aethel-text-tertiary)]">Open only if you need policy, limits, or billing details.</p>
        </summary>

        <div className="space-y-3 px-4 pb-5">
          {FAQ_ITEMS.map((item, i) => (
            <div
              key={item.q}
              className={`overflow-hidden rounded-xl border transition-all duration-200 ${openFaq === i ? 'border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)]' : 'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)] hover:border-[color-mix(in_srgb,var(--aethel-border-secondary)_50%,transparent)]'}`}
            >
              <button type="button" onClick={() => onToggle(i)} className="flex w-full items-center justify-between p-5 text-left" aria-expanded={openFaq === i}>
                <span className={`text-sm font-medium transition-colors ${openFaq === i ? 'text-[var(--aethel-info-light)]' : 'text-[var(--aethel-text-primary)]'}`}>{item.q}</span>
                <span className={`ml-4 flex-shrink-0 text-[var(--aethel-text-tertiary)] transition-transform duration-200 ${openFaq === i ? 'rotate-180 text-[var(--aethel-info)]' : ''}`}><Codicon name="chevron-down" /></span>
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-64 pb-5' : 'max-h-0'}`}>
                <div className="mx-5 mb-1 border-l-2 border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)] pl-3">
                  <p className="text-sm leading-relaxed text-[var(--aethel-text-secondary)]">{item.a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </details>
    </section>
  )
}
