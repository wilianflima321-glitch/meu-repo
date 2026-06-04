'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowRight, Book, Code2, Layers, Puzzle, Rocket, Search, ShieldCheck, Terminal, ChevronRight } from 'lucide-react'

import type { DocLink, DocSection } from './docs-content.data'

type DocsDirectoryClientProps = {
  sections: DocSection[]
  quickLinks: DocLink[]
}

const docIcons = {
  book: Book,
  code: Code2,
  layers: Layers,
  puzzle: Puzzle,
  rocket: Rocket,
  shield: ShieldCheck,
  terminal: Terminal,
} as const

export default function DocsDirectoryClient({
  sections,
  quickLinks,
}: DocsDirectoryClientProps) {
  const [query, setQuery] = useState('')
  const hasQuery = query.trim().length > 0

  const filteredSections = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return sections

    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          const haystack = `${section.title} ${section.description} ${item.title} ${item.summary}`.toLowerCase()
          return haystack.includes(normalized)
        }),
      }))
      .filter((section) => {
        const haystack = `${section.title} ${section.description}`.toLowerCase()
        return haystack.includes(normalized) || section.items.length > 0
      })
  }, [query, sections])

  const filteredQuickLinks = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return quickLinks

    return quickLinks.filter((item) => {
      const haystack = `${item.title} ${item.summary}`.toLowerCase()
      return haystack.includes(normalized)
    })
  }, [query, quickLinks])

  const totalResults = filteredSections.reduce((acc, section) => acc + section.items.length, 0)
  const visibleQuickLinks = hasQuery ? filteredQuickLinks : filteredQuickLinks.slice(0, 4)
  const overflowQuickLinks = hasQuery ? [] : filteredQuickLinks.slice(4)

  return (
    <>
      <div data-docs-directory="compact" className="mx-auto mt-8 max-w-3xl">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--aethel-text-tertiary)]" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search docs..."
            className="h-14 w-full rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] pl-12 pr-4 text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-tertiary)] transition-colors focus:border-[var(--aethel-primary)]/60 focus:outline-none"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--aethel-text-tertiary)]">
          <span>
            {query.trim()
              ? `${filteredSections.length} sections and ${totalResults} results for "${query}".`
              : `${sections.length} sections.`}
          </span>
          {hasQuery ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="border-b border-[var(--aethel-border-primary)] px-1 py-1 text-[11px] text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
            >
              Clear search
            </button>
          ) : null}
        </div>
      </div>

      <section className="mx-auto mt-12 max-w-6xl px-6">
        <div className="grid gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
          {filteredSections.map((section) => {
            const Icon = docIcons[section.icon]
            return (
              <article
                key={section.title}
                className="border-t border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)] py-5 transition-colors hover:border-[var(--aethel-border-secondary)]"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center">
                  <Icon className={`h-6 w-6 ${section.color}`} />
                </div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-[var(--aethel-text-primary)]">{section.title}</h2>
                  {hasQuery ? (
                    <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">{section.description}</p>
                  ) : null}
                </div>
                <Link
                  href={section.href}
                  className="inline-flex h-10 w-10 items-center justify-center border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] text-[var(--aethel-text-primary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_74%,transparent)]"
                  aria-label={`Open ${section.title}`}
                >
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <details open={hasQuery} className="mt-5 border-t border-[var(--aethel-border-primary)] pt-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)] transition hover:text-[var(--aethel-text-primary)]">
                  <span>{section.items.length} guides</span>
                  <ChevronRight className="h-4 w-4" />
                </summary>
                <ul className="mt-4 space-y-2">
                  {section.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="group block border-l border-transparent bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_38%,transparent)] px-3 py-2.5 transition-colors hover:border-[var(--aethel-border-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_56%,transparent)]"
                      >
                        <div className="flex items-center gap-2 text-sm font-medium text-[var(--aethel-text-primary)]">
                          <ChevronRight className="h-4 w-4 text-[var(--aethel-text-tertiary)] transition-transform group-hover:translate-x-0.5" />
                          {item.title}
                        </div>
                        {hasQuery ? (
                          <p className="mt-1 pl-6 text-xs leading-5 text-[var(--aethel-text-secondary)]">{item.summary}</p>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            </article>
            )
          })}
        </div>

        {!filteredSections.length ? (
          <div className="mt-8 border border-dashed border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_22%,transparent)] p-8 text-center">
            <p className="text-sm font-medium text-[var(--aethel-text-primary)]">No results for &quot;{query}&quot;.</p>
            <p className="mt-2 text-sm text-[var(--aethel-text-secondary)]">Try terms like API, IDE, Games, Films, or support.</p>
          </div>
        ) : null}
      </section>

      <section className="mx-auto mt-14 max-w-6xl px-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Useful now</h2>
          </div>
          <span className="text-xs uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">No placeholders</span>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {visibleQuickLinks.map((article) => (
            <Link
              key={article.href}
              href={article.href}
              className="border-t border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_22%,transparent)] py-4 transition-colors hover:border-[color-mix(in_srgb,var(--aethel-primary)_40%,transparent)]"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <Book className="h-5 w-5 text-[var(--aethel-text-tertiary)]" />
                    <span className="text-sm font-medium text-[var(--aethel-text-primary)]">{article.title}</span>
                  </div>
                  {hasQuery ? (
                    <p className="mt-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">{article.summary}</p>
                  ) : null}
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-[var(--aethel-text-tertiary)]" />
              </div>
            </Link>
          ))}
        </div>

        {overflowQuickLinks.length ? (
          <details className="mt-5 border-y border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_18%,transparent)] px-4 py-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)] transition hover:text-[var(--aethel-text-primary)]">
              <span>More useful links</span>
              <span>{overflowQuickLinks.length}</span>
            </summary>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {overflowQuickLinks.map((article) => (
                <Link
                  key={article.href}
                  href={article.href}
                  className="flex items-center justify-between gap-4 border-t border-[var(--aethel-border-subtle)] py-3 text-sm font-medium text-[var(--aethel-text-primary)] transition hover:border-[color-mix(in_srgb,var(--aethel-primary)_40%,transparent)]"
                >
                  <span>{article.title}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[var(--aethel-text-tertiary)]" />
                </Link>
              ))}
            </div>
          </details>
        ) : null}
      </section>
    </>
  )
}
