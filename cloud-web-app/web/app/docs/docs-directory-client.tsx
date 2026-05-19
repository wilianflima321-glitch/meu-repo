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

  return (
    <>
      <div className="mx-auto mt-8 max-w-3xl">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--aethel-text-tertiary)]" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar guia, modulo, API ou superficie..."
            className="h-14 w-full rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] pl-12 pr-4 text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-tertiary)] transition-colors focus:border-[var(--aethel-primary)]/60 focus:outline-none"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--aethel-text-tertiary)]">
          <span>
            {query.trim()
              ? `${filteredSections.length} secoes e ${totalResults} resultados para "${query}".`
              : `${sections.length} secoes publicas organizadas para onboarding, trust, runtime e suporte.`}
          </span>
          {query.trim() ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="rounded-full border border-[var(--aethel-border-primary)] px-3 py-1 text-[11px] text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
            >
              Limpar busca
            </button>
          ) : null}
        </div>
      </div>

      <section className="mx-auto mt-12 max-w-6xl px-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredSections.map((section) => {
            const Icon = docIcons[section.icon]
            return (
              <article
                key={section.title}
                className="rounded-[24px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-6 shadow-[0_20px_50px_rgba(2,8,23,0.22)] transition-colors hover:border-[var(--aethel-border-secondary)]"
              >
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${section.bgColor}`}>
                  <Icon className={`h-6 w-6 ${section.color}`} />
                </div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-[var(--aethel-text-primary)]">{section.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">{section.description}</p>
                </div>
                <Link
                  href={section.href}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] text-[var(--aethel-text-primary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_84%,transparent)]"
                  aria-label={`Abrir ${section.title}`}
                >
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <ul className="mt-5 space-y-3 border-t border-[var(--aethel-border-primary)] pt-5">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="group block rounded-2xl border border-transparent bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_64%,transparent)] p-3 transition-colors hover:border-[var(--aethel-border-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_76%,transparent)]"
                    >
                      <div className="flex items-center gap-2 text-sm font-medium text-[var(--aethel-text-primary)]">
                        <ChevronRight className="h-4 w-4 text-[var(--aethel-text-tertiary)] transition-transform group-hover:translate-x-0.5" />
                        {item.title}
                      </div>
                      <p className="mt-1 pl-6 text-xs leading-5 text-[var(--aethel-text-secondary)]">{item.summary}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </article>
            )
          })}
        </div>

        {!filteredSections.length ? (
          <div className="mt-8 rounded-[24px] border border-dashed border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_28%,transparent)] p-8 text-center">
            <p className="text-sm font-medium text-[var(--aethel-text-primary)]">Nenhum resultado para &quot;{query}&quot;.</p>
            <p className="mt-2 text-sm text-[var(--aethel-text-secondary)]">Tente termos como API, IDE, Games, Films ou suporte.</p>
          </div>
        ) : null}
      </section>

      <section className="mx-auto mt-14 max-w-6xl px-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Leituras mais uteis agora</h2>
            <p className="mt-2 text-sm text-[var(--aethel-text-secondary)]">Links curtos para as paginas que realmente existem hoje.</p>
          </div>
          <span className="text-xs uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Sem placeholders</span>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {filteredQuickLinks.map((article) => (
            <Link
              key={article.href}
              href={article.href}
              className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-5 transition-colors hover:border-[color-mix(in_srgb,var(--aethel-primary)_40%,transparent)]"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <Book className="h-5 w-5 text-[var(--aethel-text-tertiary)]" />
                    <span className="text-sm font-medium text-[var(--aethel-text-primary)]">{article.title}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">{article.summary}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-[var(--aethel-text-tertiary)]" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
