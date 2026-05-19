import Codicon from '@/components/ide/Codicon'
import { FAQ_ITEMS } from './pricing-content'

export function PricingFaq({ openFaq, onToggle }: { openFaq: number | null; onToggle: (index: number) => void }) {
  return (
    <section className="mx-auto mt-24 w-full max-w-3xl px-4 pb-24 sm:px-6">
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-info)]">FAQ</p>
        <h2 className="mt-3 text-3xl font-bold text-[var(--aethel-text-primary)]">Frequently asked questions</h2>
      </div>

      <div className="mt-10 space-y-3">
        {FAQ_ITEMS.map((item, i) => (
          <div key={item.q} className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)] transition-colors hover:border-[color-mix(in_srgb,var(--aethel-border-secondary)_50%,transparent)]">
            <button type="button" onClick={() => onToggle(i)} className="flex w-full items-center justify-between p-5 text-left" aria-expanded={openFaq === i}>
              <span className="text-sm font-medium text-[var(--aethel-text-primary)]">{item.q}</span>
              <span className={`ml-4 flex-shrink-0 text-[var(--aethel-text-tertiary)] transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`}><Codicon name="chevron-down" /></span>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-48 pb-5' : 'max-h-0'}`}>
              <p className="px-5 text-sm leading-relaxed text-[var(--aethel-text-secondary)]">{item.a}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
