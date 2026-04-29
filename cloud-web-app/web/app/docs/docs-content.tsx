import Link from 'next/link'

import PublicFooter from '@/components/ui/PublicFooter'
import PublicHeader from '@/components/ui/PublicHeader'

import { DOC_QUICK_LINKS, DOC_SECTIONS } from './docs-content.data'
import DocsDirectoryClient from './docs-directory-client'

export default function DocsContent() {
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
                <p>Use a busca para filtrar guias existentes e entrar mais rapido em Primeiros passos, API, trust, roadmap, IDE, Games, Films e changelog.</p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] px-3 py-1 text-[11px] text-[var(--aethel-text-primary)]">Primeiros passos</span>
                  <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] px-3 py-1 text-[11px] text-[var(--aethel-text-primary)]">API</span>
                  <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] px-3 py-1 text-[11px] text-[var(--aethel-text-primary)]">Trust</span>
                  <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] px-3 py-1 text-[11px] text-[var(--aethel-text-primary)]">Roadmap</span>
                  <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] px-3 py-1 text-[11px] text-[var(--aethel-text-primary)]">IDE</span>
                  <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] px-3 py-1 text-[11px] text-[var(--aethel-text-primary)]">Suporte</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <DocsDirectoryClient sections={DOC_SECTIONS} quickLinks={DOC_QUICK_LINKS} />

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
