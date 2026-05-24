import Image from 'next/image'
import Link from 'next/link'

const FOOTER_SECTIONS = [
  {
    title: 'Product',
    links: [
      { label: 'Mission Control', href: '/dashboard' },
      { label: 'Studio IDE', href: '/ide' },
      { label: 'Marketplace', href: '/marketplace' },
      { label: 'Pricing', href: '/pricing' },
    ],
  },
  {
    title: 'Trust',
    links: [
      { label: 'Status', href: '/status' },
      { label: 'Security', href: '/security' },
      { label: 'Compliance', href: '/compliance' },
      { label: 'Reliability', href: '/reliability' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '/docs' },
      { label: 'Help center', href: '/help' },
      { label: 'Roadmap', href: '/roadmap' },
      { label: 'Compare', href: '/compare' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Contact', href: '/contact' },
      { label: 'Sales', href: '/contact-sales' },
      { label: 'Terms', href: '/terms' },
      { label: 'Privacy', href: '/privacy' },
    ],
  },
]

const TRUST_SIGNALS = ['Apps + Research GA', 'Game/Film R&D alpha', 'Evidence-led']

export default function PublicFooter() {
  return (
    <footer role="contentinfo" className="border-t border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_96%,black)]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-9 lg:grid-cols-[minmax(260px,1.35fr)_repeat(4,minmax(120px,1fr))]">
          <div className="max-w-sm">
            <Link href="/" className="inline-flex items-center gap-3 rounded-2xl text-[var(--aethel-text-primary)] outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)]">
              <Image src="/branding/aethel-mark.svg" alt="" width={30} height={30} sizes="30px" className="rounded-xl shadow-[0_0_0_1px_var(--aethel-border-primary)]" />
              <span className="text-sm font-semibold">Aethel Studio</span>
            </Link>
            <p className="mt-4 text-sm leading-6 text-[var(--aethel-text-tertiary)]">
              A mission-first AI workspace for apps, research, previews, evidence, and governed agent work. Creative game and film systems remain clearly marked as R&D alpha until runtime evidence is complete.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {TRUST_SIGNALS.map((item) => (
                <span key={item} className="rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_46%,transparent)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
                  {item}
                </span>
              ))}
            </div>
          </div>

          {FOOTER_SECTIONS.map((section) => (
            <nav key={section.title} aria-label={section.title} className="min-w-0">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--aethel-text-quaternary)]">{section.title}</h3>
              <ul className="mt-4 grid gap-3">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-[var(--aethel-text-secondary)] transition hover:text-[var(--aethel-text-primary)]">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-9 flex flex-col gap-4 border-t border-[var(--aethel-border-primary)] pt-5 text-xs text-[var(--aethel-text-quaternary)] sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; 2026 Aethel Engine. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/status" className="inline-flex items-center gap-2 text-[var(--aethel-text-secondary)] transition hover:text-[var(--aethel-text-primary)]">
              <span className="h-2 w-2 rounded-full bg-[var(--aethel-success)]" />
              Public status
            </Link>
            <Link href="/honest-status" className="text-[var(--aethel-text-secondary)] transition hover:text-[var(--aethel-text-primary)]">
              Maturity map
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
