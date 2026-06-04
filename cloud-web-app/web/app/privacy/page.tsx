import Link from 'next/link'
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'

const LAST_UPDATED_LABEL = 'April 25, 2026'

export const metadata = {
  title: 'Privacy Policy | Aethel Studio',
  description: 'How Aethel processes, protects, and limits product data.',
}

const sections = [
  {
    title: 'Data we collect',
    body: 'Aethel collects account information, operational telemetry, and product usage data needed to run the service, improve reliability, and support customer requests. We do not collect data without a stated product or legal purpose.',
  },
  {
    title: 'How data is used',
    body: 'Data is used to authenticate users, operate product features, audit changes, improve performance, and support safety reviews. Code or workspace content is sent to AI providers only when a user requests an AI action or an enabled workflow requires it.',
  },
  {
    title: 'Storage and security',
    body: 'Data is encrypted in transit and, where applicable, at rest. Sensitive credentials should be stored in a vault or managed secret provider when that capability is enabled for the workspace.',
  },
  {
    title: 'User rights',
    body: 'Users may request export, correction, or deletion of eligible data. Privacy requests are handled through the support and privacy channels according to applicable legal timelines.',
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <PublicHeader />

      <main className="px-6 py-14">
        <section
          className="mx-auto max-w-4xl space-y-6"
          data-privacy-surface="compact"
        >
          <header className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">
              Legal documentation
            </p>
            <h1 className="text-3xl font-bold">Data use, plainly.</h1>
            <p className="text-sm leading-6 text-[var(--aethel-text-secondary)]">
              A clear operational view of what data Aethel collects, why it is
              used, and how privacy requests are handled.
            </p>
          </header>

          <div className="grid gap-4">
            {sections.map((section) => (
              <details
                key={section.title}
                className="border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-6"
              >
                <summary className="cursor-pointer text-lg font-semibold">
                  {section.title}
                </summary>
                <p className="mt-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">
                  {section.body}
                </p>
              </details>
            ))}
          </div>

          <footer className="space-y-3 border-t border-[var(--aethel-border-subtle)] pt-4">
            <p className="text-xs text-[var(--aethel-text-tertiary)]">
              Last updated: {LAST_UPDATED_LABEL}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/terms"
                className="inline-flex items-center justify-center gap-2 bg-[var(--aethel-surface-tertiary)] px-4 py-2 text-sm text-[var(--aethel-text-primary)] transition-colors hover:bg-[var(--aethel-surface-quaternary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
              >
                Terms of use
              </Link>
              <a
                href="mailto:privacy@aethel.ai"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm text-[var(--aethel-text-secondary)] transition-colors hover:bg-[var(--aethel-surface-secondary)] hover:text-[var(--aethel-text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
              >
                Privacy contact
              </a>
            </div>
          </footer>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
