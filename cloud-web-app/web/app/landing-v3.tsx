import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Clock3, Link2, Sparkles } from 'lucide-react'
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'
import LandingMissionBox from '@/app/landing-v3-mission-box'

const START_MODES = [
  {
    title: 'Apps / Sites',
    description: 'Criar produto, landing, auth, billing e deploy.',
    href: '/dashboard?onboarding=1&source=home-apps',
  },
  {
    title: 'Research',
    description: 'Pesquisar concorrentes, validar decisoes e montar brief.',
    href: '/dashboard?onboarding=1&source=home-research',
  },
  {
    title: 'Cloud / DevOps',
    description: 'Configurar dominio, ambiente, deploy e custos.',
    href: '/dashboard?onboarding=1&source=home-cloud',
  },
  {
    title: 'Growth / Ops',
    description: 'Conectar analytics, CRM, suporte e automacoes.',
    href: '/dashboard?onboarding=1&source=home-growth',
  },
  {
    title: 'Games',
    description: 'Organizar worlds, assets, build e preview.',
    href: '/dashboard?onboarding=1&source=home-games',
  },
  {
    title: 'Films / Media',
    description: 'Planejar shots, assets, render e aprovacoes.',
    href: '/dashboard?onboarding=1&source=home-media',
  },
]

const RECENT_MISSIONS = [
  {
    title: 'Fix failing deployment',
    state: 'Ready for review',
    detail: 'Preview publicada e aguardando aprovacao.',
    href: '/dashboard?tab=overview&source=resume-review',
    tone: 'success',
  },
  {
    title: 'Launch marketing site',
    state: 'In progress',
    detail: 'Plano ativo com studio e agentes em execucao.',
    href: '/dashboard?tab=overview&source=resume-launch',
    tone: 'info',
  },
  {
    title: 'Research competitor matrix',
    state: 'Blocked',
    detail: 'Falta conectar uma fonte antes de continuar.',
    href: '/dashboard?tab=overview&source=resume-research',
    tone: 'warning',
  },
] as const

const CONNECTED_TOOLS = ['GitHub', 'Vercel', 'Cloudflare', 'Stripe', 'Notion']

const STUDIO_SIGNALS = [
  'Mission intake sem poluicao',
  'Operator, preview e evidence no mesmo fluxo',
  'Studio Cloud e Studio Local com a mesma gramatica',
]

function toneClass(tone: 'success' | 'info' | 'warning') {
  if (tone === 'success') {
    return 'border-[color-mix(in_srgb,var(--aethel-success)_26%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]'
  }

  if (tone === 'warning') {
    return 'border-[color-mix(in_srgb,var(--aethel-warning)_26%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning-light)]'
  }

  return 'border-[color-mix(in_srgb,var(--aethel-info)_26%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]'
}

export default function LandingPageV3() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(79,70,229,0.12),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.08),transparent_24%),var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[12%] top-0 h-[560px] w-[560px] rounded-full bg-[color-mix(in_srgb,var(--aethel-primary)_10%,transparent)] blur-[180px]" />
        <div className="absolute bottom-0 right-[10%] h-[480px] w-[480px] rounded-full bg-[color-mix(in_srgb,var(--aethel-info)_8%,transparent)] blur-[170px]" />
      </div>

      <PublicHeader />

      <main id="main-content" className="relative z-10">
        <section className="mx-auto max-w-7xl px-4 pb-14 pt-10 sm:px-6 lg:px-8 lg:pt-14">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_360px] xl:items-start">
            <div className="rounded-[36px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,rgba(8,10,16,0.92),rgba(15,23,42,0.84))] p-6 shadow-[0_28px_100px_rgba(2,6,23,0.42)] sm:p-8 lg:p-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--aethel-info-light)]">
                <Sparkles className="h-3.5 w-3.5" />
                Agent OS
              </div>

              <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-[var(--aethel-text-primary)] sm:text-5xl lg:text-[3.75rem] lg:leading-[1.04]">
                Ask Aethel to build, research, fix or operate anything.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--aethel-text-secondary)] sm:text-base">
                Entre por uma missao clara. Continue no Mission Control. Aprofunde no Studio so quando a tarefa pedir.
              </p>

              <LandingMissionBox />

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/dashboard?onboarding=1&source=landing-primary-cta"
                  className="inline-flex items-center justify-center rounded-2xl bg-[var(--aethel-primary)] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-primary)] transition hover:brightness-110"
                >
                  Start in Mission Control
                </Link>
                <Link
                  href="/ide"
                  className="inline-flex items-center justify-center rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_68%,transparent)] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
                >
                  Open Studio
                </Link>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {START_MODES.slice(0, 3).map((mode) => (
                  <Link
                    key={mode.title}
                    href={mode.href}
                    className="group rounded-[24px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_52%,transparent)] px-4 py-4 transition hover:border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[var(--aethel-text-primary)]">{mode.title}</p>
                      <ArrowRight className="h-4 w-4 text-[var(--aethel-text-quaternary)] transition group-hover:text-[var(--aethel-info-light)]" />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[var(--aethel-text-tertiary)]">{mode.description}</p>
                  </Link>
                ))}
              </div>
            </div>

            <aside className="space-y-4">
              <div className="rounded-[30px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(8,10,16,0.94))] p-5 shadow-[0_22px_70px_rgba(2,6,23,0.36)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
                      Continue mission
                    </p>
                    <p className="mt-2 text-base font-semibold text-[var(--aethel-text-primary)]">Retome sem reexplicar tudo</p>
                  </div>
                  <Clock3 className="h-4 w-4 text-[var(--aethel-text-quaternary)]" />
                </div>
                <div className="mt-4 space-y-3">
                  {RECENT_MISSIONS.map((mission) => (
                    <Link
                      key={mission.title}
                      href={mission.href}
                      className="block rounded-[22px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)] px-4 py-3 transition hover:border-[var(--aethel-border-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-[var(--aethel-text-primary)]">{mission.title}</p>
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${toneClass(mission.tone)}`}>
                          {mission.state}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-[var(--aethel-text-tertiary)]">{mission.detail}</p>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded-[30px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,rgba(15,23,42,0.78),rgba(8,10,16,0.92))] p-5 shadow-[0_20px_70px_rgba(2,6,23,0.32)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Studio depth</p>
                    <p className="mt-2 text-base font-semibold text-[var(--aethel-text-primary)]">Cloud agora. Local quando a tarefa exigir.</p>
                  </div>
                  <Link
                    href="/ide"
                    className="inline-flex items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--aethel-info)_22%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-3 py-2 text-xs font-semibold text-[var(--aethel-info-light)] transition hover:border-[color-mix(in_srgb,var(--aethel-info)_36%,transparent)]"
                  >
                    Open Studio
                  </Link>
                </div>
                <div className="mt-4 overflow-hidden rounded-[24px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_58%,transparent)]">
                  <Image
                    src="/screenshots/editor.png"
                    alt="Aethel Studio preview"
                    width={1280}
                    height={760}
                    className="h-auto w-full object-cover"
                    priority
                  />
                </div>
                <ul className="mt-4 space-y-2 text-xs text-[var(--aethel-text-secondary)]">
                  {STUDIO_SIGNALS.map((signal) => (
                    <li key={signal} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--aethel-info)]" />
                      {signal}
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[30px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)] p-6 shadow-[0_20px_70px_rgba(2,6,23,0.28)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Start points</p>
                  <h2 className="mt-2 text-2xl font-semibold text-[var(--aethel-text-primary)]">Escolha um modo de entrada, nao um mar de features.</h2>
                </div>
                <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_66%,transparent)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--aethel-text-secondary)]">
                  6 modos
                </span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {START_MODES.map((mode) => (
                  <Link
                    key={mode.title}
                    href={mode.href}
                    className="rounded-[24px] border border-[var(--aethel-border-subtle)] bg-[linear-gradient(180deg,rgba(15,23,42,0.52),rgba(8,10,16,0.68))] px-4 py-4 transition hover:border-[color-mix(in_srgb,var(--aethel-primary)_24%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)]"
                  >
                    <div className="text-sm font-semibold text-[var(--aethel-text-primary)]">{mode.title}</div>
                    <div className="mt-2 text-xs leading-5 text-[var(--aethel-text-tertiary)]">{mode.description}</div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-[30px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)] p-6 shadow-[0_20px_70px_rgba(2,6,23,0.28)]">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
                <Link2 className="h-3.5 w-3.5" />
                Connected tools
              </div>
              <p className="mt-2 text-2xl font-semibold text-[var(--aethel-text-primary)]">Aethel funciona melhor quando suas ferramentas ja estao por perto.</p>
              <p className="mt-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">
                Navegue, configure, pesquise e publique no mesmo fluxo sem virar uma colecao de produtos soltos.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                {CONNECTED_TOOLS.map((tool) => (
                  <span
                    key={tool}
                    className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-3 py-2 text-sm font-medium text-[var(--aethel-text-secondary)]"
                  >
                    {tool}
                  </span>
                ))}
              </div>
              <div className="mt-6 rounded-[22px] border border-[color-mix(in_srgb,var(--aethel-info)_22%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_8%,transparent)] px-4 py-4 text-sm leading-6 text-[var(--aethel-text-secondary)]">
                Web Light para entrar. Mission Control para orientar. Studio para executar. Local para romper o teto do browser.
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="grid gap-4 rounded-[34px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,rgba(15,23,42,0.78),rgba(8,10,16,0.92))] p-6 shadow-[0_26px_90px_rgba(2,6,23,0.38)] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:p-8">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Next step</p>
              <h2 className="mt-3 text-3xl font-semibold text-[var(--aethel-text-primary)]">Entre pelo fluxo leve. Aprofunde so quando fizer sentido.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--aethel-text-secondary)]">
                Sem landing de marketing antiga. Sem cockpit pesado cedo demais. Um unico produto, com profundidade progressiva.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                href="/dashboard?onboarding=1&source=home-bottom-start"
                className="inline-flex items-center justify-center rounded-2xl bg-[var(--aethel-primary)] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-primary)] transition hover:brightness-110"
              >
                Start a mission
              </Link>
              <Link
                href="/ide"
                className="inline-flex items-center justify-center rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_68%,transparent)] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
              >
                Open Studio
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
