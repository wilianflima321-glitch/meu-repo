import Link from 'next/link'
import EngineSpineReadinessPanel from '@/components/studio/EngineSpineReadinessPanel'
import CreativeStudioShell from './CreativeStudioShell'
import { CREATIVE_STUDIO_ROUTES } from './creative-studio-routes'
import StudioMissionControl from './StudioMissionControl'

const DOMAIN_LABELS = {
  world: 'Game and world',
  film: 'Film',
  audio: 'Audio',
  runtime: 'Runtime',
} as const

export default function CreativeStudioPage() {
  return (
    <CreativeStudioShell
      title="Creative Studio"
      subtitle="Mission-first routes for game, film, VFX, material, animation, and audio work."
      activeHref="/studio"
    >
      <div className="h-full overflow-y-auto bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--aethel-primary)_14%,transparent),transparent_34%),var(--aethel-surface-primary)] px-4 py-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 max-w-3xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--aethel-primary-light)]">
              Progressive creative depth
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-[var(--aethel-text-primary)]">
              Use the right surface only when the mission needs it.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">
              The hub keeps the product calm for beginners, while giving agents and advanced users direct entry into the editors that were previously hidden behind legacy routes.
            </p>
          </div>

          <StudioMissionControl />

          <EngineSpineReadinessPanel />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {CREATIVE_STUDIO_ROUTES.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className="group flex h-full flex-col rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_62%,transparent)] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.22)] transition-all hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--aethel-primary)_48%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_82%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
                aria-label={`Open ${route.label}`}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className="rounded-full border border-[var(--aethel-border-secondary)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
                    {DOMAIN_LABELS[route.domain]}
                  </span>
                  <span className="rounded-full bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-info-light)]">
                    {route.maturity}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-[var(--aethel-text-primary)] transition-colors group-hover:text-[var(--aethel-primary-light)]">
                  {route.label}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-[var(--aethel-text-secondary)]">
                  {route.description}
                </p>
                <div className="mt-5 flex items-center justify-between border-t border-[var(--aethel-border-subtle)] pt-4">
                  <span className="text-xs font-semibold text-[var(--aethel-primary-light)]">
                    Open editor
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
                    {route.shortLabel}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </CreativeStudioShell>
  )
}
