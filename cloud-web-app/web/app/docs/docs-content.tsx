import Link from 'next/link'

import PublicFooter from '@/components/ui/PublicFooter'
import PublicHeader from '@/components/ui/PublicHeader'

import { DOC_QUICK_LINKS, DOC_SECTIONS } from './docs-content.data'
import DocsDirectoryClient from './docs-directory-client'

export default function DocsContent() {
  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <PublicHeader />

      <main className="relative z-10">
        <section data-docs-hero="search-first" className="mx-auto max-w-6xl px-6 pt-12">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--aethel-primary)]/20 bg-[var(--aethel-primary)]/10 px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-primary-light)]">
                Docs
              </div>
              <h1 className="mt-5 text-4xl font-bold sm:text-5xl">Find the right guide. Then act.</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--aethel-text-secondary)]">
                Search guides, check status, and jump to the next product action.
              </p>
            </div>

            <div className="border-y border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-5 shadow-[0_18px_44px_rgba(2,8,23,0.22)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Start here</p>
              <div className="mt-4 text-sm">
                <Link href="/docs/getting-started" className="block border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/55 px-4 py-3 font-semibold text-[var(--aethel-text-primary)] transition hover:border-[var(--aethel-primary)]/50">
                  Getting started
                </Link>
                <details className="mt-3 border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_44%,transparent)] px-4 py-3">
                  <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
                    More paths
                  </summary>
                  <div className="mt-3 grid gap-2">
                    <Link href="/docs/ide" className="text-sm font-semibold text-[var(--aethel-text-secondary)] transition hover:text-[var(--aethel-text-primary)]">
                      IDE and agents
                    </Link>
                    <Link href="/docs/procurement-starter-pack" className="text-sm font-semibold text-[var(--aethel-text-secondary)] transition hover:text-[var(--aethel-text-primary)]">
                      Procurement pack
                    </Link>
                  </div>
                </details>
              </div>
            </div>
          </div>
        </section>

        <DocsDirectoryClient sections={DOC_SECTIONS} quickLinks={DOC_QUICK_LINKS} />

        <section className="mx-auto mt-10 max-w-6xl px-6 pb-20">
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--aethel-border-subtle)] pt-6 text-sm">
            <span className="text-[var(--aethel-text-tertiary)]">Need the latest release notes or support?</span>
            <div className="flex flex-wrap gap-4 font-semibold text-[var(--aethel-text-secondary)]">
              <Link href="/docs/changelog" className="transition hover:text-[var(--aethel-text-primary)]">Changelog</Link>
              <Link href="/docs/support" className="transition hover:text-[var(--aethel-text-primary)]">Support</Link>
              <Link href="/docs/community" className="transition hover:text-[var(--aethel-text-primary)]">Community</Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
