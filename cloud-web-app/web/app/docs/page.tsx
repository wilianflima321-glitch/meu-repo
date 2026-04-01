'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Book, Code2, Rocket, Layers, Terminal, Puzzle, Search, ChevronRight, ArrowRight } from 'lucide-react'
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'

type DocLink = {
  title: string
  href: string
  summary: string
}

type DocSection = {
  title: string
  description: string
  icon: typeof Rocket
  color: string
  bgColor: string
  href: string
  items: DocLink[]
}

const sections: DocSection[] = [
  {
    title: 'Primeiros passos',
    description: 'Entrada oficial para configurar ambiente, abrir o primeiro projeto e entender a shell do studio.',
    icon: Rocket,
    color: 'text-[var(--aethel-success)]',
    bgColor: 'bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)]',
    href: '/docs/getting-started',
    items: [
      {
        title: 'Comecar pelo studio',
        href: '/docs/getting-started',
        summary: 'Fluxo inicial para onboarding, runtime e primeiro valor.',
      },
    ],
  },
  {
    title: 'Referencia da API',
    description: 'Contratos das rotas principais, readiness endpoints e surfaces de integracao publica.',
    icon: Code2,
    color: 'text-[var(--aethel-primary-light)]',
    bgColor: 'bg-[var(--aethel-primary)]/10',
    href: '/docs/api',
    items: [
      {
        title: 'Endpoints e contratos',
        href: '/docs/api',
        summary: 'Visao da API publica e das rotas operacionais mais importantes.',
      },
    ],
  },
  {
    title: 'IDE e workbench',
    description: 'Como editor, chat, preview e operacao compartilham o mesmo fluxo dentro do studio.',
    icon: Layers,
    color: 'text-[var(--aethel-info)]',
    bgColor: 'bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)]',
    href: '/docs/ide',
    items: [
      {
        title: 'Workbench do produto',
        href: '/docs/ide',
        summary: 'Contexto do editor, preview runtime, estrutura do shell e superficie de trabalho.',
      },
    ],
  },
  {
    title: 'Games',
    description: 'Status atual do dominio Games, escopo suportado e lacunas antes de promocao de maturidade.',
    icon: Terminal,
    color: 'text-[var(--aethel-warning)]',
    bgColor: 'bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)]',
    href: '/docs/games',
    items: [
      {
        title: 'Estado do modulo Games',
        href: '/docs/games',
        summary: 'Limites atuais, runtime e proximas etapas antes de L3.',
      },
    ],
  },
  {
    title: 'Films',
    description: 'Timeline, story workbench e roadmap real do modulo Films sem inflar capability.',
    icon: Puzzle,
    color: 'text-[var(--aethel-info)]',
    bgColor: 'bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)]',
    href: '/docs/films',
    items: [
      {
        title: 'Estado do modulo Films',
        href: '/docs/films',
        summary: 'Como o sistema de filmes esta organizado hoje e o que ainda depende de integracoes externas.',
      },
    ],
  },
  {
    title: 'Operacao e suporte',
    description: 'Mudancas publicas, suporte e comunidade para acompanhar evolucao do produto.',
    icon: Book,
    color: 'text-[var(--aethel-primary-light)]',
    bgColor: 'bg-[var(--aethel-primary)]/10',
    href: '/docs/support',
    items: [
      {
        title: 'Changelog publico',
        href: '/docs/changelog',
        summary: 'Releases e ajustes publicados para acompanhar deltas de produto.',
      },
      {
        title: 'Suporte',
        href: '/docs/support',
        summary: 'Canais e fluxo de suporte do produto.',
      },
      {
        title: 'Comunidade',
        href: '/docs/community',
        summary: 'Espacos publicos e loops de feedback.',
      },
    ],
  },
]

const quickLinks: DocLink[] = [
  {
    title: 'Primeiro valor no dashboard',
    href: '/docs/getting-started',
    summary: 'Como a entrada do studio foi organizada para evitar um dashboard vazio e sem contexto.',
  },
  {
    title: 'API e readiness operacional',
    href: '/docs/api',
    summary: 'Onde olhar endpoints, health checks e superficies publicas com contrato mais estavel.',
  },
  {
    title: 'Workbench do IDE',
    href: '/docs/ide',
    summary: 'Como chat, editor e preview convivem no mesmo shell de produto.',
  },
  {
    title: 'Roadmap de Games',
    href: '/docs/games',
    summary: 'Estado atual do modulo Games sem claims infladas.',
  },
  {
    title: 'Roadmap de Films',
    href: '/docs/films',
    summary: 'Escopo real do modulo Films e dependencias externas.',
  },
  {
    title: 'Changelog e suporte',
    href: '/docs/changelog',
    summary: 'Onde acompanhar mudancas recentes e caminhos oficiais de suporte.',
  },
]

export default function DocsPage() {
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
  }, [query])

  const filteredQuickLinks = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return quickLinks

    return quickLinks.filter((item) => {
      const haystack = `${item.title} ${item.summary}`.toLowerCase()
      return haystack.includes(normalized)
    })
  }, [query])

  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/3 top-0 h-[600px] w-[600px] rounded-full bg-[var(--aethel-primary-dark)]/[0.06] blur-[170px]" />
        <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-[var(--aethel-info)]/[0.05] blur-[160px]" />
      </div>

      <PublicHeader />

      <main className="relative z-10">
        <section className="mx-auto max-w-6xl px-6 pt-12">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--aethel-primary)]/20 bg-[var(--aethel-primary)]/10 px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-primary-light)]">
                Documentacao oficial
              </div>
              <h1 className="mt-5 text-4xl font-bold sm:text-5xl">Docs organizadas para uso real do produto</h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-[var(--aethel-text-secondary)]">
                Aqui a documentacao aponta para rotas e superficies que existem de verdade. Nada de indice inflado com paginas fantasmas.
              </p>
            </div>

            <div className="rounded-[28px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_35%,transparent)] p-5 shadow-[0_24px_60px_rgba(2,8,23,0.32)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Acesso rapido</p>
              <div className="mt-4 space-y-3 text-sm text-[var(--aethel-text-secondary)]">
                <p>Use a busca para filtrar guias existentes e entrar mais rapido em Primeiros passos, API, IDE, Games, Films e changelog.</p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] px-3 py-1 text-[11px] text-[var(--aethel-text-primary)]">Primeiros passos</span>
                  <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] px-3 py-1 text-[11px] text-[var(--aethel-text-primary)]">API</span>
                  <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] px-3 py-1 text-[11px] text-[var(--aethel-text-primary)]">IDE</span>
                  <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] px-3 py-1 text-[11px] text-[var(--aethel-text-primary)]">Suporte</span>
                </div>
              </div>
            </div>
          </div>

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
          </div>
        </section>

        <section className="mx-auto mt-12 max-w-6xl px-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredSections.map((section) => (
              <article
                key={section.title}
                className="rounded-[24px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-6 shadow-[0_20px_50px_rgba(2,8,23,0.22)] transition-colors hover:border-[var(--aethel-border-secondary)]"
              >
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${section.bgColor}`}>
                  <section.icon className={`h-6 w-6 ${section.color}`} />
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
            ))}
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

        <section className="mx-auto mt-12 max-w-6xl px-6 pb-20">
          <div className="grid gap-6 md:grid-cols-3">
            <Link
              href="/docs/changelog"
              className="rounded-2xl border border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--aethel-primary)_18%,transparent),color-mix(in_srgb,var(--aethel-info)_10%,transparent))] p-6 text-[var(--aethel-text-primary)] transition-colors hover:border-[var(--aethel-primary)]/50"
            >
              <h3 className="text-lg font-semibold">Changelog</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-primary)]">
                Acompanhe releases, gates e melhorias publicas do studio.
              </p>
            </Link>
            <Link
              href="/docs/support"
              className="rounded-2xl border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--aethel-success)_18%,transparent),color-mix(in_srgb,var(--aethel-success)_8%,transparent))] p-6 text-[var(--aethel-text-primary)] transition-colors hover:border-[color-mix(in_srgb,var(--aethel-success)_50%,transparent)]"
            >
              <h3 className="text-lg font-semibold">Suporte</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-primary)]">
                Entre em contato com o time ou veja os caminhos oficiais de suporte.
              </p>
            </Link>
            <Link
              href="/docs/community"
              className="rounded-2xl border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-gradient-to-br from-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] to-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] p-6 text-[var(--aethel-text-primary)] transition-colors hover:border-[color-mix(in_srgb,var(--aethel-warning)_50%,transparent)]"
            >
              <h3 className="text-lg font-semibold">Comunidade</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-primary)]">
                Descubra os loops de feedback e espacos publicos do produto.
              </p>
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}

