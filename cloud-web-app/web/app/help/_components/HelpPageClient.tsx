'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, MessageSquare, Search } from 'lucide-react'
import { HELP_CATEGORIES, HELP_QUICK_LINKS } from './help-content'
import { HelpFaqSections } from './HelpFaqSections'
import { HelpQuickLinks } from './HelpQuickLinks'

export function HelpPageClient() {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Getting started')
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null)
  const [helpful, setHelpful] = useState<Record<string, boolean | null>>({})

  const filteredCategories = useMemo(() => {
    const term = searchQuery.trim().toLowerCase()
    return HELP_CATEGORIES.map((category) => ({
      ...category,
      faqs: category.faqs.filter((faq) => !term || faq.question.toLowerCase().includes(term) || faq.answer.toLowerCase().includes(term)),
    })).filter((category) => !term || category.faqs.length > 0)
  }, [searchQuery])

  return (
    <main className="relative z-10">
      <section className="mx-auto max-w-[960px] px-6 pt-14 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-200">
          Help center
        </div>
        <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Find the next answer fast.</h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[var(--aethel-text-secondary)]">
          Search the operating help surface. Short answers first, deeper escalation only when needed.
        </p>

        <div className="mx-auto mt-8 max-w-xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--aethel-text-tertiary)]" />
            <input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-14 w-full rounded-[18px] border border-slate-700 bg-slate-950/70 pl-12 pr-4 text-[var(--aethel-text-primary)] shadow-[0_20px_70px_rgba(0,0,0,0.24)] placeholder:text-[var(--aethel-text-tertiary)] focus:border-sky-300/60 focus:outline-none focus:ring-2 focus:ring-sky-300/15"
            />
          </div>
        </div>
      </section>

      <HelpQuickLinks links={HELP_QUICK_LINKS} />
      <HelpFaqSections
        categories={filteredCategories}
        expandedCategory={expandedCategory}
        expandedFaq={expandedFaq}
        helpful={helpful}
        onHelpful={(question, isHelpful) => setHelpful((previous) => ({ ...previous, [question]: isHelpful }))}
        onToggleCategory={(category) => setExpandedCategory((current) => (current === category ? null : category))}
        onToggleFaq={(question) => setExpandedFaq((current) => (current === question ? null : question))}
      />

      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="rounded-3xl border border-sky-400/20 bg-slate-950/60 p-8 text-center shadow-[0_24px_90px_rgba(0,0,0,0.22)]">
          <h3 className="text-2xl font-semibold text-[var(--aethel-text-primary)]">Still need help?</h3>
          <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--aethel-text-secondary)]">
            Our team can help by email or community. For enterprise procurement, contact sales directly.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/contact" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--aethel-primary)] px-6 py-3 text-sm font-semibold text-[var(--aethel-text-inverse)] transition-colors hover:bg-[var(--aethel-primary-dark)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)]">
              <MessageSquare className="h-4 w-4" />
              Open a ticket
            </Link>
            <Link href="/contact-sales" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--aethel-surface-tertiary)] px-6 py-3 text-sm font-semibold text-[var(--aethel-text-primary)] transition-colors hover:bg-[var(--aethel-surface-quaternary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)]">
              Talk to sales
            </Link>
            <Link href="https://discord.gg/aethel" target="_blank" className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-[var(--aethel-text-secondary)] transition-colors hover:bg-[var(--aethel-surface-secondary)] hover:text-[var(--aethel-text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)]">
              <ExternalLink className="h-4 w-4" />
              Discord
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
