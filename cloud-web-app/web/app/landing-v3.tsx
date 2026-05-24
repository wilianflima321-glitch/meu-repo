import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'
import LandingMissionBox from '@/app/landing-v3-mission-box'

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

const PRIMARY_START_MODES = START_MODES.slice(0, 3)
const SECONDARY_START_MODES = START_MODES.slice(3)

const PROOF_POINTS = [
  { label: 'Agents', value: 'scope locked' },
  { label: 'Cost', value: 'visible' },
  { label: 'Evidence', value: 'one tap' },
] as const

export default function LandingPageV3() {
  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <PublicHeader />

      <main id="main-content">
        <section
          data-landing-minimal-hero
          className="mx-auto max-w-6xl px-4 pb-16 pt-20 sm:px-6 lg:px-8 lg:pb-20 lg:pt-28"
        >
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_56%,transparent)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">
              <Sparkles className="h-3.5 w-3.5 text-[var(--aethel-info-light)]" />
              AI Workforce IDE
            </div>

            <h1 className="mx-auto mt-8 max-w-4xl text-5xl font-semibold tracking-[-0.055em] text-[var(--aethel-text-primary)] sm:text-6xl lg:text-[5rem] lg:leading-[0.98]">
              The AI <span className="font-serif italic tracking-[-0.03em]">workforce</span> for builders who need{' '}
              <span className="font-serif italic tracking-[-0.03em]">evidence</span>.
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-[var(--aethel-text-secondary)] sm:text-lg">
              Describe one mission. Aethel coordinates agents, cost, replay, and Studio handoff without turning the first screen into a cockpit.
            </p>

            <div className="mx-auto">
              <LandingMissionBox />
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm">
              <Link
                href="/honest-status"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)] px-4 py-2 font-semibold text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
              >
                See readiness
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <span className="text-[var(--aethel-text-quaternary)]">No AAA claims. No hidden cost.</span>
            </div>
          </div>
        </section>

        <section data-landing-product-proof className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[34px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] shadow-[0_30px_110px_rgba(2,6,23,0.42)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--aethel-border-subtle)] px-4 py-3 sm:px-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
                FIG 1 - Mission Control
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {PROOF_POINTS.map((point) => (
                  <span
                    key={point.label}
                    className="rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_48%,transparent)] px-3 py-1 text-[11px] font-semibold text-[var(--aethel-text-secondary)]"
                  >
                    {point.label}: {point.value}
                  </span>
                ))}
              </div>
            </div>
            <Image
              src="/product-proof/studio-home.webp"
              alt="Aethel Mission Control showing the active project, agent state, evidence, preview, and next actions."
              width={1500}
              height={900}
              sizes="(min-width: 1280px) 1180px, calc(100vw - 32px)"
              className="h-auto w-full"
            />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="grid gap-5 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Start points</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--aethel-text-primary)] sm:text-4xl">
                Choose the entry, then let the workspace get deeper only when needed.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--aethel-text-secondary)]">
                The first decision is intentionally small. Advanced creative, cloud, and runtime paths stay available without stealing the first scan.
              </p>
            </div>

            <div className="rounded-[30px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] p-4 shadow-[0_20px_70px_rgba(2,6,23,0.24)] sm:p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                {PRIMARY_START_MODES.map((mode) => (
                  <Link
                    key={mode.title}
                    href={mode.href}
                    className="group rounded-[24px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_46%,transparent)] px-4 py-4 transition hover:border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_58%,transparent)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-[var(--aethel-text-primary)]">{mode.title}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-[var(--aethel-text-quaternary)] transition group-hover:text-[var(--aethel-info-light)]" />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[var(--aethel-text-tertiary)]">{mode.description}</p>
                  </Link>
                ))}
              </div>

              <details className="mt-4 rounded-[22px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_34%,transparent)] px-4 py-3">
                <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-secondary)]">
                  More modes
                </summary>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {SECONDARY_START_MODES.map((mode) => (
                    <Link
                      key={mode.title}
                      href={mode.href}
                      className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_36%,transparent)] px-3 py-3 transition hover:border-[color-mix(in_srgb,var(--aethel-info)_26%,transparent)]"
                    >
                      <span className="block text-sm font-semibold text-[var(--aethel-text-primary)]">{mode.title}</span>
                      <span className="mt-1 block text-xs leading-5 text-[var(--aethel-text-tertiary)]">{mode.description}</span>
                    </Link>
                  ))}
                </div>
              </details>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="rounded-[34px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_36%,transparent)] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.28)] sm:p-8 lg:flex lg:items-center lg:justify-between lg:gap-8">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Next step</p>
              <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-[var(--aethel-text-primary)]">
                Start light. Keep proof close. Open the cockpit only when the mission needs it.
              </h2>
            </div>
            <div className="mt-5 flex flex-wrap gap-3 lg:mt-0 lg:justify-end">
              <Link
                href="/dashboard?onboarding=1&source=landing-primary-cta"
                className="inline-flex items-center justify-center rounded-2xl bg-[var(--aethel-text-primary)] px-5 py-3 text-sm font-semibold text-[var(--aethel-surface-primary)] transition hover:bg-[var(--aethel-text-secondary)]"
              >
                Start a mission
              </Link>
              <Link
                href="/ide"
                className="inline-flex items-center justify-center rounded-2xl border border-[var(--aethel-border-subtle)] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
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
