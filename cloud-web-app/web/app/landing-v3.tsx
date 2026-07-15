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
]

const PROOF_POINTS = [
  { label: 'Agents', value: 'scope locked' },
  { label: 'Cost', value: 'visible' },
  { label: 'Receipts', value: 'close' },
] as const

export default function LandingPageV3() {
  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <PublicHeader />

      <main id="main-content">
        {/* Hero */}
        <section
          data-landing-minimal-hero
          className="mx-auto max-w-6xl px-4 pb-16 pt-20 sm:px-6 lg:px-8 lg:pb-20 lg:pt-28"
        >
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_56%,transparent)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">
              <Sparkles className="h-3.5 w-3.5 text-[var(--aethel-info-light)]" />
              AI product studio
            </div>

            <h1 className="mx-auto mt-8 max-w-4xl text-5xl font-semibold tracking-[-0.055em] text-[var(--aethel-text-primary)] sm:text-6xl lg:text-[5rem] lg:leading-[0.98]">
              The AI <span className="font-serif italic tracking-[-0.03em]">workforce</span> for builders who need{' '}
              <span className="font-serif italic tracking-[-0.03em]">evidence</span>, not hype.
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-[var(--aethel-text-secondary)] sm:text-lg">
              Describe what you want to build, preview the result, and keep the change trail close.
            </p>

            <div className="mx-auto">
              <LandingMissionBox />
            </div>
          </div>
        </section>

        {/* Screenshot */}
        <section data-landing-product-proof className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] shadow-[var(--aethel-shadow-xl)]">
            {/* Proof point pills: no internal labels */}
            <div className="flex flex-wrap items-center gap-2 border-b border-[var(--aethel-border-subtle)] px-4 py-3 sm:px-5">
              {PROOF_POINTS.map((point) => (
                <span
                  key={point.label}
                  className="rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_48%,transparent)] px-3 py-1 text-[11px] font-semibold text-[var(--aethel-text-secondary)]"
                >
                  {point.label}: {point.value}
                </span>
              ))}
            </div>
            <Image
              src="/product-proof/studio-home.png"
              alt="Aethel Studio showing the active project, agent status, receipts, live preview, and next actions."
              width={1500}
              height={900}
              sizes="(min-width: 1280px) 1180px, calc(100vw - 32px)"
              className="h-auto w-full"
            />
          </div>
        </section>

        {/* Start points */}
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="grid gap-5 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
                Start points
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--aethel-text-primary)] sm:text-4xl">
                Choose the entry, then open deeper tools only when needed.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--aethel-text-secondary)]">
                Keep the first decision small. Advanced creative, cloud, and runtime paths stay close but quiet.
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] p-4 shadow-[var(--aethel-shadow-lg)] sm:p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                {START_MODES.map((mode) => (
                  <Link
                    key={mode.title}
                    href={mode.href}
                    className="group rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_46%,transparent)] px-4 py-4 transition hover:border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_58%,transparent)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-[var(--aethel-text-primary)]">{mode.title}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-[var(--aethel-text-quaternary)] transition group-hover:text-[var(--aethel-info-light)]" />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[var(--aethel-text-tertiary)]">{mode.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_36%,transparent)] p-6 shadow-[var(--aethel-shadow-xl)] sm:p-8 lg:flex lg:items-center lg:justify-between lg:gap-8">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
                Get started
              </p>
              <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-[var(--aethel-text-primary)]">
                Start light. Keep receipts close.
              </h2>
            </div>
            <div className="mt-5 flex flex-wrap gap-3 lg:mt-0 lg:justify-end">
              <Link
                href="/dashboard?onboarding=1&source=landing-primary-cta"
                className="inline-flex items-center justify-center rounded-2xl bg-[var(--aethel-text-primary)] px-5 py-3 text-sm font-semibold text-[var(--aethel-surface-primary)] transition hover:bg-[var(--aethel-text-secondary)]"
              >
                Open dashboard
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
