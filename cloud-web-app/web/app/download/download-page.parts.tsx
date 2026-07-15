import Link from 'next/link'
import { ArrowRight, Download, Monitor } from 'lucide-react'

import StudioLocalReleaseReadinessMatrix from '@/components/studio/StudioLocalReleaseReadinessMatrix'
import {
  STUDIO_LOCAL_RELEASE_MANIFEST,
  type RuntimeReleaseStatus,
  type StudioLocalPlatformId,
} from '@/lib/studio-local/release-manifest'

export const PLATFORMS = STUDIO_LOCAL_RELEASE_MANIFEST.platforms
const TARGETS = STUDIO_LOCAL_RELEASE_MANIFEST.targets

const JOB_POLICIES = [
  'Checks device fit before heavy local work',
  'Resumes jobs safely after restart',
  'Keeps local work observable',
]

function statusClass(status: RuntimeReleaseStatus) {
  if (status === 'available') return 'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]'
  if (status === 'beta') return 'border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning-light)]'
  if (status === 'held') return 'border-[color-mix(in_srgb,var(--aethel-error)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] text-[var(--aethel-error-light)]'
  return 'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_64%,transparent)] text-[var(--aethel-text-tertiary)]'
}

function publicRuntimeCopy(value: string) {
  return value
    .replace(/Studio\s+Local/g, 'desktop app')
    .replace(/Studio\s+Cloud/g, 'cloud runtime')
    .replace(/Web\s+Light/g, 'web app')
    .replace(/readiness/gi, 'status')
}

export function DownloadHero() {
  return (
    <div className="border-y border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)] py-6 sm:py-8 lg:py-10">
      <div className="inline-flex items-center gap-2 border-l border-[color-mix(in_srgb,var(--aethel-info)_44%,transparent)] pl-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--aethel-info-light)]">
        <Monitor className="h-3.5 w-3.5" />
        Desktop beta
      </div>

      <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-[3.6rem] lg:leading-[1.04]">
        Desktop power when the browser is not enough.
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--aethel-text-secondary)] sm:text-base">
        Use the native app for heavier renders, assets, shaders, and local jobs.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/contact-sales?intent=studio-local-beta"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--aethel-primary)] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-inverse)] shadow-lg shadow-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)] transition hover:bg-[var(--aethel-primary-dark)]"
        >
          Request desktop beta
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/docs/getting-started"
          className="inline-flex items-center justify-center gap-2 border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_68%,transparent)] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
        >
          Read setup guide
        </Link>
      </div>

      <details className="mt-7 border-t border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_30%,transparent)] p-4">
        <summary className="cursor-pointer text-sm font-semibold text-[var(--aethel-text-secondary)]">
          Open release details
        </summary>
        <StudioLocalReleaseReadinessMatrix className="mt-4" />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {TARGETS.map((target) => (
            <div key={target.label} className="border-t border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] p-4">
              <span className={`inline-flex border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${statusClass(target.status)}`}>
                {target.status}
              </span>
              <h2 className="mt-3 text-sm font-semibold">{publicRuntimeCopy(target.label)}</h2>
              <p className="mt-2 text-xs leading-5 text-[var(--aethel-text-tertiary)]">{publicRuntimeCopy(target.detail)}</p>
              {target.fallbackReason && (
                <p className="mt-2 border-l border-[var(--aethel-border-subtle)] bg-[rgba(2,6,23,0.28)] px-3 py-2 text-[11px] leading-5 text-[var(--aethel-text-tertiary)]">
                  Fallback: {publicRuntimeCopy(target.fallbackReason)}
                </p>
              )}
              {target.costNote && (
                <p className="mt-2 text-[11px] leading-5 text-[var(--aethel-text-quaternary)]">{publicRuntimeCopy(target.costNote)}</p>
              )}
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}

export function DesktopTargetPanel({
  selectedPlatform,
  onSelectPlatform,
}: {
  selectedPlatform: StudioLocalPlatformId
  onSelectPlatform: (platform: StudioLocalPlatformId) => void
}) {
  const current = PLATFORMS[selectedPlatform]

  return (
      <aside className="rounded-xl border border-[var(--aethel-border-primary)] bg-[rgba(8,10,16,0.84)] p-5 shadow-[0_26px_80px_rgba(2,6,23,0.28)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Release channel</p>
          <h2 className="mt-2 text-xl font-semibold">Choose your desktop target</h2>
        </div>
        <Download className="h-5 w-5 text-[var(--aethel-info-light)]" />
      </div>

      <div className="mt-5 grid gap-2">
        {(Object.keys(PLATFORMS) as StudioLocalPlatformId[]).map((platform) => (
          <button
            key={platform}
            type="button"
            onClick={() => onSelectPlatform(platform)}
            className={`rounded-xl border px-4 py-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-info)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] ${selectedPlatform === platform ? 'border-[color-mix(in_srgb,var(--aethel-info)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_9%,transparent)] -translate-y-px shadow-[0_0_0_1px_rgba(56,189,248,0.18),0_8px_20px_rgba(0,0,0,0.25),inset_0_0_16px_rgba(56,189,248,0.04)]' : 'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)] hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--aethel-info)_22%,transparent)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)]'}`}
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              {PLATFORMS[platform].name}
              <span className={`border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] ${statusClass(PLATFORMS[platform].status)}`}>
                {PLATFORMS[platform].status}
              </span>
            </span>
            <span className="mt-1 block text-xs text-[var(--aethel-text-tertiary)]">{PLATFORMS[platform].requirements}</span>
          </button>
        ))}
      </div>

      <details className="mt-5 border-t border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_38%,transparent)] p-4">
        <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
          Developer release notes
        </summary>
        <p className="mt-3 font-mono text-sm text-[var(--aethel-text-primary)]">{current.artifact}</p>
        <p className="mt-3 text-xs leading-5 text-[var(--aethel-text-tertiary)]">
          {publicRuntimeCopy(current.readiness)}
        </p>
        <code className="mt-3 block overflow-x-auto border border-[var(--aethel-border-subtle)] bg-[rgba(2,6,23,0.62)] px-3 py-2 text-xs text-[var(--aethel-text-secondary)]">
          {current.command}
        </code>
      </details>
    </aside>
  )
}

export function RuntimeRoutingDetails() {
  return (
    <details className="mt-6 border-y border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_32%,transparent)] py-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-[var(--aethel-text-primary)] [&::-webkit-details-marker]:hidden">
        Desktop safety details
      </summary>
      <ul className="mt-4 grid gap-2 text-sm text-[var(--aethel-text-secondary)] sm:grid-cols-3">
        {JOB_POLICIES.map((item) => (
          <li key={item} className="border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_30%,transparent)] px-4 py-3">
            {item}
          </li>
        ))}
      </ul>
    </details>
  )
}

export function DownloadStatusCallout() {
  return (
    <section className="mt-6 border-y border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] py-6 lg:py-8">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
            Release status
          </div>
          <h2 className="mt-3 text-2xl font-semibold">Desktop beta first. Signed installers next.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--aethel-text-secondary)]">
            This page stays honest until signed artifacts are published.
          </p>
        </div>
        <Link
          href="/honest-status"
          className="inline-flex items-center justify-center gap-2 border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_68%,transparent)] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
        >
          See status
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}
