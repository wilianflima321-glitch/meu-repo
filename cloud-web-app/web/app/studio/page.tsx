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
      <div className="h-full overflow-y-auto bg-[var(--aethel-surface-primary)] px-4 py-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SurfaceQualityShell
            eyebrow="Studio runboard"
            title="Plan, validate, then open the right editor."
            subtitle="Creative depth stays governed: preview now, optimize locally when attached, request cloud review only when capability and cost are real."
            status={[
              { label: 'Preview ready', tone: 'available' },
              { label: 'Local optimizer optional', tone: 'neutral' },
              { label: 'Cloud review gated', tone: 'neutral' },
            ]}
            primaryAction={<a href="#studio-primary-surfaces" className="rounded-full bg-[var(--aethel-text-primary)] px-4 py-2 text-sm font-semibold text-[var(--aethel-surface-primary)] shadow-[0_14px_32px_rgba(2,6,23,0.16)]">Open editor</a>}
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
                Choose the surface that moves the mission forward.
              </h3>
            </div>
            <span className="rounded-full border border-[var(--aethel-border-subtle)] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[var(--aethel-text-secondary)]">
              {primaryStudioRoutes.length} core entries
            </span>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] shadow-[0_18px_70px_rgba(0,0,0,0.14)]" data-studio-surface-board="operator-density">
            <div className="grid grid-cols-[minmax(170px,1fr)_112px_96px_minmax(130px,0.55fr)] gap-3 border-b border-[var(--aethel-border-subtle)] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)] max-md:hidden">
              <span>Surface</span>
              <span>Domain</span>
              <span>Maturity</span>
              <span>Action</span>
            </div>
            {primaryStudioRoutes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className="group grid gap-3 border-b border-[var(--aethel-border-subtle)] px-4 py-4 transition hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_58%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] last:border-b-0 md:grid-cols-[minmax(170px,1fr)_112px_96px_minmax(130px,0.55fr)] md:items-center"
                aria-label={`Open ${route.label}`}
              >
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-[var(--aethel-text-primary)] transition-colors group-hover:text-[var(--aethel-primary-light)]">
                    {route.label}
                  </h3>
                  <p className="mt-1 line-clamp-1 text-xs leading-5 text-[var(--aethel-text-secondary)]">
                    {route.description}
                  </p>
                </div>
                <span className="w-fit rounded-full border border-[var(--aethel-border-secondary)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
                  {DOMAIN_LABELS[route.domain]}
                </span>
                <span className="w-fit rounded-full bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-info-light)]">
                  {route.maturity}
                </span>
                <span className="text-xs font-semibold text-[var(--aethel-primary-light)]">
                  Open editor
                </span>
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
