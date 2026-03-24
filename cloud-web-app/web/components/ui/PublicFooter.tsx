import Link from 'next/link'
import Image from 'next/image'

const FOOTER_SECTIONS = [
  {
    title: 'Produto',
    links: [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'IDE', href: '/ide' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Docs', href: '/docs' },
    ],
  },
  {
    title: 'Empresa',
    links: [
      { label: 'Contato', href: '/contact-sales' },
      { label: 'Status', href: '/status' },
      { label: 'Termos', href: '/terms' },
      { label: 'Privacidade', href: '/privacy' },
    ],
  },
  {
    title: 'Recursos',
    links: [
      { label: 'Ajuda', href: '/help' },
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
        <div className="mb-12 rounded-[28px] border border-white/[0.08] bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02),rgba(14,165,233,0.06))] px-6 py-6 shadow-[0_24px_70px_rgba(2,6,23,0.24)] lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Studio-grade platform</p>
              <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                Do briefing ao preview no mesmo sistema de trabalho.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-300">
                Apps + Research continuam no centro do produto, com IA, preview e readiness no mesmo fluxo.
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
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-4"
                >
                  <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{item.label}</div>
                  <div className="mt-2 text-sm font-semibold text-white">{item.value}</div>
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
              <span className="text-lg font-bold text-white">Aethel Studio</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-zinc-400">
              Studio multi-agent para sair da ideia e chegar em software validavel com mais rapidez e controle.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {['Apps', 'Research', 'Preview', 'Governanca'].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-300"
                >
                  {item}
                </span>
              ))}
            </div>
            <div className="mt-6 flex items-center gap-4">
              <a
                href="https://github.com/wilianflima321-glitch/meu-repo"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05] text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="GitHub"
              >
                <svg className="h-4.5 w-4.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </a>
              <Link
                href="/docs"
                className="flex h-9 min-w-[72px] items-center justify-center rounded-xl bg-white/[0.05] px-3 text-xs font-medium text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                Docs
              </Link>
              <Link
                href="/status"
                className="flex h-9 min-w-[72px] items-center justify-center rounded-xl bg-white/[0.05] px-3 text-xs font-medium text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                Status
              </Link>
            </div>
          </div>

          {/* Link columns */}
          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">{section.title}</h3>
              <ul className="mt-4 space-y-3">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-zinc-300 transition-colors hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-8 sm:flex-row">
          <p className="text-xs text-zinc-400">&copy; {COPYRIGHT_YEAR} Aethel Engine. Todos os direitos reservados.</p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-zinc-400">Studio-grade workflow, atualizado continuamente</span>
            </div>
            <Link href="/status" className="text-xs text-zinc-400 transition-colors hover:text-white">
              Ver status operacional
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
