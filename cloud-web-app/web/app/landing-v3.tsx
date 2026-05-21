import Link from 'next/link'
import { ArrowRight, Clock3, Link2, Sparkles } from 'lucide-react'
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'
import LandingMissionBox from '@/app/landing-v3-mission-box'
import LandingStudioProof from '@/app/landing-v3-studio-proof'

const START_MODES = [
  {
    title: 'Apps / Sites',
    description: 'Build a product, landing page, auth, billing, and deploy path.',
    href: '/dashboard?onboarding=1&source=home-apps',
  },
  {
    title: 'Research',
    description: 'Research competitors, validate decisions, and prepare a launch brief.',
    href: '/dashboard?onboarding=1&source=home-research',
  },
  {
    title: 'Cloud / DevOps',
    description: 'Configure domains, environments, deployment, and costs.',
    href: '/dashboard?onboarding=1&source=home-cloud',
  },
  {
    title: 'Growth / Ops',
    description: 'Connect analytics, CRM, support, and automations.',
    href: '/dashboard?onboarding=1&source=home-growth',
  },
  {
    title: 'Games',
    description: 'Organize worlds, assets, builds, and previews.',
    href: '/dashboard?onboarding=1&source=home-games',
  },
  {
    title: 'Films / Media',
    description: 'Plan shots, assets, render passes, and approvals.',
    href: '/dashboard?onboarding=1&source=home-media',
  },
]

const OPERATION_SIGNALS = [
  {
    title: 'Agent replay cockpit',
    state: 'Visible',
    detail: 'Browser Operator runs expose timeline, approvals, blockers, and evidence refs.',
    href: '/ide?panel=agents&view=replay',
    tone: 'success',
  },
  {
    title: 'Cost transparency',
    state: 'Live',
    detail: 'Dashboard and IDE surfaces show spend posture instead of hiding agent cost.',
    href: '/dashboard?tab=overview&source=cost-visibility',
    tone: 'info',
  },
  {
    title: 'Studio Local bridge',
    state: 'Beta',
    detail: 'Native runtime capability is disclosed before heavy work moves off the browser.',
    href: '/download',
    tone: 'warning',
  },
] as const

const CONNECTED_TOOLS = ['GitHub', 'Vercel', 'Cloudflare', 'Stripe', 'Notion']

const STUDIO_SIGNALS = [
  'Mission intake without clutter',
  'Operator, preview, and evidence in one flow',
  'Studio Cloud and Studio Local share one grammar',
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
                AI Workforce IDE
              </div>

              <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-[var(--aethel-text-primary)] sm:text-5xl lg:text-[3.75rem] lg:leading-[1.04]">
                The AI workforce for builders who need evidence, not hype.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--aethel-text-secondary)] sm:text-base">
                Start with one mission. Aethel coordinates agents, cost, replay, Studio Cloud, and Studio Local while work stays inspectable from idea to artifact.
              </p>

              <LandingMissionBox />

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/dashboard?onboarding=1&source=landing-primary-cta"
                  className="inline-flex items-center justify-center rounded-2xl bg-[var(--aethel-primary)] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-primary)] transition hover:brightness-110"
                >
                  Start free in Mission Control
                </Link>
                <Link
                  href="/honest-status"
                  className="inline-flex items-center justify-center rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_68%,transparent)] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
                >
                  See what is ready today
                </Link>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {START_MODES.slice(0, 3).map((mode) => (
                  <Link
                    key={mode.title}
                    href={mode.href}
                    className="group inline-flex items-center gap-2 rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_52%,transparent)] px-3 py-2 text-xs font-medium text-[var(--aethel-text-secondary)] transition hover:border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] hover:text-[var(--aethel-text-primary)]"
                  >
                    {mode.title}
                    <ArrowRight className="h-3.5 w-3.5 text-[var(--aethel-text-quaternary)] transition group-hover:text-[var(--aethel-info-light)]" />
                  </Link>
                ))}
              </div>
            </div>

            <aside className="space-y-4">
              <details className="rounded-[30px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(8,10,16,0.94))] p-5 shadow-[0_22px_70px_rgba(2,6,23,0.36)]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <span>
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
                      Product proof
                    </span>
                    <span className="mt-2 block text-base font-semibold text-[var(--aethel-text-primary)]">Why trust this run?</span>
                  </span>
                  <Clock3 className="h-4 w-4 text-[var(--aethel-text-quaternary)]" />
                </summary>
                <div className="mt-4 space-y-3">
                  {OPERATION_SIGNALS.map((mission) => (
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
              </details>

              <div className="rounded-[30px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,rgba(15,23,42,0.78),rgba(8,10,16,0.92))] p-5 shadow-[0_20px_70px_rgba(2,6,23,0.32)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Studio depth</p>
                    <p className="mt-2 text-base font-semibold text-[var(--aethel-text-primary)]">Cloud now. Local runtime when the task requires it.</p>
                  </div>
                  <Link
                    href="/ide"
                    className="inline-flex items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--aethel-info)_22%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-3 py-2 text-xs font-semibold text-[var(--aethel-info-light)] transition hover:border-[color-mix(in_srgb,var(--aethel-info)_36%,transparent)]"
                  >
                    Open Studio
                  </Link>
                </div>
                <LandingStudioProof />
                <Link
                  href="/download"
                  className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--aethel-primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_10%,transparent)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--aethel-primary-light)] transition hover:border-[color-mix(in_srgb,var(--aethel-primary)_42%,transparent)]"
                >
                  Download Studio Local beta
                </Link>
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
                  <h2 className="mt-2 text-2xl font-semibold text-[var(--aethel-text-primary)]">Choose an entry mode, not a wall of features.</h2>
                </div>
                <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_66%,transparent)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--aethel-text-secondary)]">
                  6 modes
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
              <p className="mt-2 text-2xl font-semibold text-[var(--aethel-text-primary)]">Aethel works best when your tools are already nearby.</p>
              <p className="mt-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">
                Navigate, configure, research, and publish in one workflow instead of a pile of disconnected products.
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
                Web Light to enter. Mission Control to orient. Studio to execute. Local runtime to break past browser limits.
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="grid gap-4 rounded-[34px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,rgba(15,23,42,0.78),rgba(8,10,16,0.92))] p-6 shadow-[0_26px_90px_rgba(2,6,23,0.38)] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:p-8">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Next step</p>
              <h2 className="mt-3 text-3xl font-semibold text-[var(--aethel-text-primary)]">Enter through the light workflow. Go deeper only when it makes sense.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--aethel-text-secondary)]">
                No old marketing wall. No heavy cockpit too early. One product with progressive depth.
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
              <Link
                href="/download"
                className="inline-flex items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--aethel-info)_24%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_8%,transparent)] px-5 py-3 text-sm font-semibold text-[var(--aethel-info-light)] transition hover:border-[color-mix(in_srgb,var(--aethel-info)_38%,transparent)]"
              >
                Download Studio Local
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
