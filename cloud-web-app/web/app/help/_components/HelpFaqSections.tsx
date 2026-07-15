import Link from 'next/link'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { helpIcons } from './help-icons'
import type { HelpCategory } from './help-types'

interface HelpFaqSectionsProps {
  categories: HelpCategory[]
  expandedCategory: string | null
  expandedFaq: string | null
  helpful?: Record<string, boolean | null>
  onHelpful?: (question: string, isHelpful: boolean) => void
  onToggleCategory: (category: string) => void
  onToggleFaq: (question: string) => void
}

export function HelpFaqSections({
  categories,
  expandedCategory,
  expandedFaq,
  onToggleCategory,
  onToggleFaq,
}: HelpFaqSectionsProps) {
  return (
    <section className="mx-auto mt-12 max-w-6xl px-6 pb-10">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold tracking-[-0.02em] text-[var(--aethel-text-primary)]">
          Frequently asked questions
        </h2>
        <span className="text-xs uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">
          Continuously updated
        </span>
      </div>
      <div className="mt-6 space-y-4">
        {categories.map((category) => {
          const Icon = helpIcons[category.icon]
          return (
            <div
              key={category.name}
              className="overflow-hidden border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] shadow-[0_18px_60px_rgba(0,0,0,0.18)]"
            >
              <button
                type="button"
                onClick={() => onToggleCategory(category.name)}
                className="flex w-full items-center gap-4 bg-transparent p-5 text-left text-[var(--aethel-text-primary)] transition-colors hover:bg-white/[0.03]"
              >
                <div className="flex h-10 w-10 items-center justify-center bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="flex-1 font-medium text-[var(--aethel-text-primary)]">
                  {category.name}
                </span>
                <span className="text-xs text-[var(--aethel-text-tertiary)]">
                  {category.faqs.length} questions
                </span>
                <ChevronDown
                  className={`h-5 w-5 text-[var(--aethel-text-secondary)] transition-transform ${expandedCategory === category.name ? 'rotate-180' : ''}`}
                />
              </button>
              {expandedCategory === category.name && (
                <div className="border-t border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_55%,transparent)]">
                  {category.faqs.map((faq) => (
                    <div
                      key={faq.question}
                      className="border-b border-[var(--aethel-border-primary)] last:border-0"
                    >
                      <button
                        type="button"
                        onClick={() => onToggleFaq(faq.question)}
                        className="flex w-full items-center justify-between gap-4 bg-transparent px-6 py-4 text-left text-[var(--aethel-text-primary)] transition-colors hover:bg-white/[0.03]"
                      >
                        <span className="text-sm text-[var(--aethel-text-primary)]">
                          {faq.question}
                        </span>
                        <ChevronRight
                          className={`h-4 w-4 text-[var(--aethel-text-tertiary)] transition-transform ${expandedFaq === faq.question ? 'rotate-90' : ''}`}
                        />
                      </button>
                      {expandedFaq === faq.question && (
                        <div className="px-6 pb-5">
                          <p className="max-w-3xl text-sm leading-6 text-[var(--aethel-text-secondary)]">
                            {faq.answer}
                          </p>
                          <Link
                            href="/docs/support"
                            className="mt-4 inline-flex border-t border-[var(--aethel-border-primary)] pt-4 text-xs font-semibold text-[var(--aethel-text-secondary)] transition hover:text-[var(--aethel-text-primary)]"
                          >
                            Still need help? Contact support
                          </Link>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
