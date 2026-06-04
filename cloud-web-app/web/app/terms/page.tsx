import Link from 'next/link'
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'

const LAST_UPDATED_LABEL = 'April 25, 2026'

export const metadata = {
  title: 'Terms of Use | Aethel Studio',
  description: 'Current policies and terms of use for the Aethel platform.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <PublicHeader />

      <main className="px-6 py-14" data-terms-surface="compact">
        <section className="mx-auto max-w-4xl space-y-6">
          <header className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Legal documentation</p>
            <h1 className="text-3xl font-bold">Terms, plainly.</h1>
            <p className="text-sm text-[var(--aethel-text-secondary)]">
              Usage, responsibility, billing, and data rules before you share access or enable paid work.
            </p>
          </header>

          <article className="space-y-3 border-t border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)] py-5">
            <h2 className="text-lg font-semibold">Service scope</h2>
            <details>
              <summary className="cursor-pointer text-sm font-medium text-[var(--aethel-text-secondary)]">Open terms</summary>
              <p className="mt-3 text-sm text-[var(--aethel-text-secondary)]">
                Aethel provides automation tools, AI-assisted agents, integrations, and execution infrastructure. Some capabilities depend on plan, credentials, or workspace configuration.
              </p>
            </details>
          </article>

          <article className="space-y-3 border-t border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)] py-5">
            <h2 className="text-lg font-semibold">Acceptable use</h2>
            <details>
              <summary className="cursor-pointer text-sm font-medium text-[var(--aethel-text-secondary)]">Open acceptable-use rules</summary>
              <p className="mt-3 text-sm text-[var(--aethel-text-secondary)]">
                You may not use the service for illegal activity, spam, vulnerability abuse, or actions that violate applicable law. Aethel may suspend violating accounts.
              </p>
            </details>
          </article>

          <article className="space-y-3 border-t border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)] py-5">
            <h2 className="text-lg font-semibold">Billing and credits</h2>
            <details>
              <summary className="cursor-pointer text-sm font-medium text-[var(--aethel-text-secondary)]">Open billing terms</summary>
              <p className="mt-3 text-sm text-[var(--aethel-text-secondary)]">
                Paid plans and credits follow the billing dashboard. Custom integrations or premium support may carry additional charges.
              </p>
            </details>
          </article>

          <article className="space-y-3 border-t border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)] py-5">
            <h2 className="text-lg font-semibold">Data protection</h2>
            <details>
              <summary className="cursor-pointer text-sm font-medium text-[var(--aethel-text-secondary)]">Open data terms</summary>
              <p className="mt-3 text-sm text-[var(--aethel-text-secondary)]">
                Product data is processed under the privacy policy. Deletion or portability requests go through support.
              </p>
            </details>
          </article>

          <footer className="space-y-3 border-t border-[var(--aethel-border-subtle)] pt-4">
            <p className="text-xs text-[var(--aethel-text-tertiary)]">Last updated: {LAST_UPDATED_LABEL}</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 bg-[var(--aethel-surface-tertiary)] px-4 py-2 text-sm text-[var(--aethel-text-primary)] transition-colors hover:bg-[var(--aethel-surface-quaternary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]">
                Back to dashboard
              </Link>
              <a href="mailto:legal@aethel.ai" className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm text-[var(--aethel-text-secondary)] transition-colors hover:bg-[var(--aethel-surface-secondary)] hover:text-[var(--aethel-text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]">
                Legal contact
              </a>
              <Link href="/privacy" className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm text-[var(--aethel-text-secondary)] transition-colors hover:bg-[var(--aethel-surface-secondary)] hover:text-[var(--aethel-text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]">
                Privacy policy
              </Link>
            </div>
          </footer>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
