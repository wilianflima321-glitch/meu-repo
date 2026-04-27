import Link from 'next/link'
import Image from 'next/image'

const FOOTER_SECTIONS = [
  {
    title: 'Produto',
    links: [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'IDE', href: '/ide' },
      { label: 'Planos', href: '/pricing' },
      { label: 'Roadmap', href: '/roadmap' },
      { label: 'Documentacao', href: '/docs' },
    ],
  },
  {
    title: 'Empresa',
    links: [
      { label: 'Contato', href: '/contact-sales' },
      { label: 'Clientes', href: '/customers' },
      { label: 'Status', href: '/status' },
      { label: 'Seguranca', href: '/security' },
      { label: 'Compliance', href: '/compliance' },
      { label: 'Termos', href: '/terms' },
      { label: 'Privacidade', href: '/privacy' },
    ],
  },
  {
    title: 'Recursos',
    links: [
      { label: 'Procurement pack', href: '/docs/procurement-starter-pack' },
      { label: 'Security policy', href: '/security-policy' },
      { label: 'Changelog', href: '/docs/changelog' },
      { label: 'Ajuda', href: '/docs/support' },
      { label: 'Comunidade', href: '/docs/community' },
      { label: 'Download', href: '/download' },
      { label: 'Marketplace', href: '/marketplace' },
    ],
  },
]

const COPYRIGHT_YEAR = 2026

export default function PublicFooter() {
  return (
    <footer className="bg-gradient-to-b from-[var(--aethel-surface-primary)] via-[var(--aethel-surface-primary)] to-[var(--aethel-surface-secondary)]" role="contentinfo">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12 rounded-[28px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02),rgba(14,165,233,0.06))] px-6 py-6 shadow-[0_24px_70px_rgba(2,6,23,0.24)] lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Plataforma studio-grade</p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--aethel-text-primary)] sm:text-3xl">
                Do briefing ao preview no mesmo sistema de trabalho.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--aethel-text-secondary)]">
                Apps + Pesquisa continuam no centro do produto, com IA, preview e readiness no mesmo fluxo.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Fluxo', value: 'Studio unico' },
                { label: 'Preview', value: 'Runtime + fallback' },
                { label: 'Governanca', value: 'Readiness visivel' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-4 py-4"
                >
                  <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">{item.label}</div>
                  <div className="mt-2 text-sm font-semibold text-[var(--aethel-text-primary)]">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          {/* Brand column */}
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5">
              <Image src="/branding/aethel-icon-source.png" alt="" width={28} height={28} sizes="28px" className="rounded-lg" />
              <span className="text-lg font-bold text-[var(--aethel-text-primary)]">Aethel Studio</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-[var(--aethel-text-tertiary)]">
              Studio multi-agent para sair da ideia e chegar em software validavel com mais rapidez e controle.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {['Apps', 'Pesquisa', 'Preview', 'Governanca'].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-secondary)]"
                >
                  {item}
                </span>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-quaternary)]">
              <Link href="/security" className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-3 py-1 transition hover:text-[var(--aethel-text-primary)]">MFA live</Link>
              <Link href="/compliance" className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-3 py-1 transition hover:text-[var(--aethel-text-primary)]">GDPR roadmap</Link>
              <Link href="/roadmap" className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-3 py-1 transition hover:text-[var(--aethel-text-primary)]">Roadmap publico</Link>
              <Link href="/docs/procurement-starter-pack" className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-3 py-1 transition hover:text-[var(--aethel-text-primary)]">Procurement pack</Link>
              <Link href="/contact-sales" className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-3 py-1 transition hover:text-[var(--aethel-text-primary)]">SSO/SAML consultivo</Link>
            </div>
            <div className="mt-6 flex items-center gap-4">
              <a
                href="https://github.com/wilianflima321-glitch/meu-repo"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] hover:text-[var(--aethel-text-primary)]"
                aria-label="GitHub"
              >
                <svg className="h-4.5 w-4.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </a>
              <Link
                href="/docs"
                className="flex h-9 min-w-[96px] items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-3 text-xs font-medium text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] hover:text-[var(--aethel-text-primary)]"
              >
                Documentacao
              </Link>
              <Link
                href="/roadmap"
                className="flex h-9 min-w-[88px] items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-3 text-xs font-medium text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] hover:text-[var(--aethel-text-primary)]"
              >
                Roadmap
              </Link>
              <Link
                href="/docs/procurement-starter-pack"
                className="flex h-9 min-w-[132px] items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-3 text-xs font-medium text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] hover:text-[var(--aethel-text-primary)]"
              >
                Procurement pack
              </Link>
              <Link
                href="/status"
                className="flex h-9 min-w-[72px] items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-3 text-xs font-medium text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] hover:text-[var(--aethel-text-primary)]"
              >
                Status
              </Link>
            </div>
          </div>

          {/* Link columns */}
          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">{section.title}</h3>
              <ul className="mt-4 space-y-3">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-[var(--aethel-text-secondary)] transition-colors hover:text-[var(--aethel-text-primary)]">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[var(--aethel-border-primary)] pt-8 sm:flex-row">
          <p className="text-xs text-[var(--aethel-text-tertiary)]">&copy; {COPYRIGHT_YEAR} Aethel Engine. Todos os direitos reservados.</p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-[var(--aethel-success)]" />
              <span className="text-xs text-[var(--aethel-text-tertiary)]">Fluxo studio-grade, atualizado continuamente</span>
            </div>
            <Link href="/status" className="text-xs text-[var(--aethel-text-tertiary)] transition-colors hover:text-[var(--aethel-text-primary)]">
              Ver status operacional
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
