import Link from 'next/link'
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'

const LAST_UPDATED_LABEL = '25/04/2026'

export const metadata = {
  title: 'Terms of Use | Aethel Studio',
  description: 'Current policies and terms of use for the Aethel platform.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/3 top-0 h-[600px] w-[600px] rounded-full bg-[var(--aethel-primary-dark)]/[0.05] blur-[160px]" />
        <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)]/[0.05] blur-[160px]" />
      </div>

      <PublicHeader />

      <main className="relative z-10 px-6 py-14">
        <section className="mx-auto max-w-4xl space-y-6">
          <header className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Documentation legal</p>
            <h1 className="text-3xl font-bold">Aethel Studio Terms of Use</h1>
            <p className="text-sm text-[var(--aethel-text-secondary)]">
              This page describes usage policies, responsibilities, and billing rules.
              Review it before enabling paid features or sharing access with your team.
            </p>
          </header>

          <article className="space-y-3 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-6">
            <h2 className="text-lg font-semibold">Service scope</h2>
            <p className="text-sm text-[var(--aethel-text-secondary)]">
              Aethel provides automation tools, AI-assisted agents, integrations
              and execution infrastructure. Some capabilities may depend on specific plans
              or external credential configuration.
            </p>
          </article>

          <article className="space-y-3 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-6">
            <h2 className="text-lg font-semibold">Acceptable use</h2>
            <p className="text-sm text-[var(--aethel-text-secondary)]">
              You may not use the services for illegal activity, spam, exploitation of
              vulnerabilities, or any action that violates local or international law.
              Aethel may suspend accounts that violate these guidelines.
            </p>
          </article>

          <article className="space-y-3 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-6">
            <h2 className="text-lg font-semibold">Billing and credits</h2>
            <p className="text-sm text-[var(--aethel-text-secondary)]">
              Paid plans and additional credits follow the policies described in the billing dashboard.
              Additional charges may apply for custom integrations or premium support.
            </p>
          </article>

          <article className="space-y-3 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-6">
            <h2 className="text-lg font-semibold">Data protection</h2>
            <p className="text-sm text-[var(--aethel-text-secondary)]">
              Data collected while using the platform is processed according to the
              privacy policy. Deletion or portability requests can be made through support.
            </p>
          </article>

          <footer className="space-y-3 border-t border-[var(--aethel-border-subtle)] pt-4">
            <p className="text-xs text-[var(--aethel-text-tertiary)]">Last updated: {LAST_UPDATED_LABEL}</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-quaternary)] rounded-xl px-4 py-2 text-sm">
                Back to dashboard
              </Link>
              <a href="mailto:legal@aethel.ai" className="inline-flex items-center justify-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-secondary)] hover:text-[var(--aethel-text-primary)] rounded-xl px-4 py-2 text-sm">
                Legal contact
              </a>
              <Link href="/privacy" className="inline-flex items-center justify-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-secondary)] hover:text-[var(--aethel-text-primary)] rounded-xl px-4 py-2 text-sm">
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
