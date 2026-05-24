import Link from 'next/link'
import { SurfaceQualityShell } from '@/components/product/SurfaceQualityShell'
import EngineSpineReadinessPanel from '@/components/studio/EngineSpineReadinessPanel'
import CreativeStudioShell from './CreativeStudioShell'
import { CREATIVE_STUDIO_ROUTES, isPrimaryCreativeStudioRoute } from './creative-studio-routes'
import StudioMissionControl from './StudioMissionControl'

const DOMAIN_LABELS = {
  world: 'Game and world',
  film: 'Film',
  audio: 'Audio',
  runtime: 'Runtime',
} as const

const primaryStudioRoutes = CREATIVE_STUDIO_ROUTES.filter(isPrimaryCreativeStudioRoute)
const advancedStudioRoutes = CREATIVE_STUDIO_ROUTES.filter((route) => !isPrimaryCreativeStudioRoute(route))

export default function CreativeStudioPage() {
  return (
    <CreativeStudioShell
      title="Creative Studio"
      subtitle="Mission-first routes for game, film, VFX, material, animation, and audio work."
      activeHref="/studio"
    >
      <div className="h-full overflow-y-auto bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--aethel-primary)_14%,transparent),transparent_34%),var(--aethel-surface-primary)] px-4 py-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SurfaceQualityShell
            eyebrow="Studio runboard"
            title="Plan, validate, then open the right editor."
            subtitle="Creative depth stays governed: Browser previews, Studio Local handles heavy work when attached, and Cloud Stream remains held until capability is real."
            status={[
              { label: 'Browser', value: 'preview', tone: 'available' },
              { label: 'Studio Local', value: 'held', tone: 'held' },
              { label: 'Cloud Stream', value: 'held', tone: 'held' },
            ]}
            primaryAction={<a href="#studio-primary-surfaces" className="rounded-full bg-[linear-gradient(135deg,rgba(79,70,229,0.95),rgba(14,165,233,0.9))] px-4 py-2 text-sm font-semibold text-[var(--aethel-text-primary)] shadow-[0_14px_32px_rgba(56,189,248,0.18)]">Open editor</a>}
            secondaryAction={<a href="#studio-runboard" className="rounded-full border border-[var(--aethel-border-subtle)] px-4 py-2 text-sm font-medium text-[var(--aethel-text-secondary)]">Validate plan</a>}
          >
            <div id="studio-runboard" className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
              <StudioMissionControl />
              <EngineSpineReadinessPanel />
            </div>
          </SurfaceQualityShell>

          <div id="studio-primary-surfaces" className="mt-8" />

          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
                Primary surfaces
              </p>
              <h3 className="mt-2 text-xl font-semibold text-[var(--aethel-text-primary)]">
                Start where most missions actually continue.
              </h3>
            </div>
            <span className="rounded-full border border-[var(--aethel-border-subtle)] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[var(--aethel-text-secondary)]">
              {primaryStudioRoutes.length} core entries
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {primaryStudioRoutes.map((route) => (
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

          <details className="mt-5 rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] p-4 shadow-[0_18px_70px_rgba(0,0,0,0.18)]">
            <summary className="cursor-pointer list-none">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
                    Advanced editors
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--aethel-text-primary)]">
                    Open specialized surfaces only when the mission asks for them.
                  </h3>
                </div>
                <span className="rounded-full border border-[var(--aethel-border-subtle)] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[var(--aethel-text-secondary)]">
                  {advancedStudioRoutes.length} available
                </span>
              </div>
            </summary>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {advancedStudioRoutes.map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  className="group flex h-full flex-col rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_42%,transparent)] p-4 transition hover:border-[var(--aethel-border-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_58%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
                  aria-label={`Open ${route.label}`}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="rounded-full border border-[var(--aethel-border-secondary)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
                      {DOMAIN_LABELS[route.domain]}
                    </span>
                    <span className="rounded-full bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-info-light)]">
                      {route.maturity}
                    </span>
                  </div>
                  <h4 className="text-base font-semibold text-[var(--aethel-text-primary)] transition-colors group-hover:text-[var(--aethel-primary-light)]">
                    {route.label}
                  </h4>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--aethel-text-secondary)]">
                    {route.description}
                  </p>
                </Link>
              ))}
            </div>
          </details>
        </div>
      </div>
    </CreativeStudioShell>
  )
}
