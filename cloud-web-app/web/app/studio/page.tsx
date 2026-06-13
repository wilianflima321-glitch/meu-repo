import { Suspense } from 'react'
import Link from 'next/link'
import { SurfaceQualityShell } from '@/components/product/SurfaceQualityShell'
import EngineSpineReadinessPanel from '@/components/studio/EngineSpineReadinessPanel'
import CreativeStudioShell from './CreativeStudioShell'
import { CREATIVE_STUDIO_ROUTES, groupCreativeStudioRoutes, isPrimaryCreativeStudioRoute, getCreativeStudioRouteNavigationHref } from './creative-studio-routes'
import StudioMissionControl from './StudioMissionControl'

const DOMAIN_LABELS = {
  world: 'Game and world',
  film: 'Film',
  audio: 'Audio',
  runtime: 'Runtime',
} as const

const primaryStudioRoutes = CREATIVE_STUDIO_ROUTES.filter(isPrimaryCreativeStudioRoute)
const advancedStudioRoutes = CREATIVE_STUDIO_ROUTES.filter((route) => !isPrimaryCreativeStudioRoute(route))
const advancedStudioGroups = groupCreativeStudioRoutes(advancedStudioRoutes)

export default function CreativeStudioPage() {
  return (
    <CreativeStudioShell
      title="Creative Studio"
      subtitle="Plan creative work, validate it, then open the editor that matters."
      activeHref="/studio"
    >
      <div className="h-full overflow-y-auto bg-[var(--aethel-surface-primary)] px-4 py-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SurfaceQualityShell
            eyebrow="Studio"
            title="Plan, validate, then open the right editor."
            subtitle="Preview in the browser. Use local or cloud only when the required setup is actually ready."
            status={[
              { label: 'Preview ready', tone: 'available' },
              { label: 'Local tools optional', tone: 'neutral' },
              { label: 'Cloud review locked', tone: 'neutral' },
            ]}
            primaryAction={<a href="#studio-primary-surfaces" className="rounded-full bg-[var(--aethel-text-primary)] px-4 py-2 text-sm font-semibold text-[var(--aethel-surface-primary)] shadow-[0_14px_32px_rgba(2,6,23,0.16)]">Open editor</a>}
            secondaryAction={<a href="#studio-status" className="rounded-full border border-[var(--aethel-border-subtle)] px-4 py-2 text-sm font-medium text-[var(--aethel-text-secondary)]">Status</a>}
          >
            <Suspense fallback={<div className="h-32 rounded-2xl bg-[var(--aethel-surface-secondary)]" />}>
              <StudioMissionControl />
            </Suspense>
            <details id="studio-status" className="mt-3 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)]">
              <summary className="cursor-pointer list-none px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]">Engine module status</summary>
              <div className="px-5 pb-5">
                <Suspense fallback={<div className="h-48 rounded-2xl bg-[var(--aethel-surface-secondary)]" />}>
                  <EngineSpineReadinessPanel />
                </Suspense>
              </div>
            </details>
          </SurfaceQualityShell>

          <div id="studio-primary-surfaces" className="mt-8" />

          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
                Core editors
              </p>
              <h3 className="mt-2 text-xl font-semibold text-[var(--aethel-text-primary)]">
                Choose the right editor.
              </h3>
            </div>
            <span className="rounded-full border border-[var(--aethel-border-subtle)] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[var(--aethel-text-secondary)]">
              {primaryStudioRoutes.length} core entries
            </span>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] shadow-[0_18px_70px_rgba(0,0,0,0.14)]" data-studio-surface-board="operator-density" data-studio-primary-lanes="5">
            <div className="grid grid-cols-[minmax(170px,1fr)_112px_96px_minmax(130px,0.55fr)] gap-3 border-b border-[var(--aethel-border-subtle)] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)] max-md:hidden">
              <span>Editor</span>
              <span>Domain</span>
              <span>Maturity</span>
              <span>Action</span>
            </div>
            {primaryStudioRoutes.map((route) => (
              <Link
                key={route.href}
                href={getCreativeStudioRouteNavigationHref(route)}
                className="group grid gap-3 border-b border-[var(--aethel-border-subtle)] px-4 py-4 transition hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_58%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] last:border-b-0 md:grid-cols-[minmax(170px,1fr)_112px_96px_minmax(130px,0.55fr)] md:items-center"
                aria-label={`Open ${route.label}`}
                data-studio-editor-group={route.group}
                data-studio-editor-route={route.href}
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
                    Specialized editors for advanced needs.
                  </h3>
                </div>
                <span className="rounded-full border border-[var(--aethel-border-subtle)] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[var(--aethel-text-secondary)]">
                  {advancedStudioRoutes.length} available
                </span>
              </div>
            </summary>
            <div className="mt-4 space-y-4">
              {advancedStudioGroups.map((group) => (
                <section
                  key={group.id}
                  className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_34%,transparent)] p-3"
                  data-studio-editor-group={group.id}
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold text-[var(--aethel-text-primary)]">{group.label}</h4>
                      <p className="mt-1 text-[11px] leading-4 text-[var(--aethel-text-tertiary)]">{group.description}</p>
                    </div>
                    <span className="rounded-full border border-[var(--aethel-border-subtle)] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
                      {group.routes.length} editor{group.routes.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {group.routes.map((route) => (
                      <Link
                        key={route.href}
                        href={getCreativeStudioRouteNavigationHref(route)}
                        className="group flex h-full flex-col rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_42%,transparent)] p-4 transition hover:border-[var(--aethel-border-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_58%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
                        aria-label={`Open ${route.label}`}
                        data-studio-editor-group={route.group}
                        data-studio-editor-route={route.href}
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
                </section>
              ))}
            </div>
          </details>
        </div>
      </div>
    </CreativeStudioShell>
  )
}
