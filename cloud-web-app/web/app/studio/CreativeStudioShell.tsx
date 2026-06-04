'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import StudioLayout from '@/components/studio/StudioLayout'
import MaturityBadge from '@/components/ui/MaturityBadge'
import { useBrowserPathname } from '@/lib/navigation/use-browser-pathname'
import { CREATIVE_STUDIO_ROUTES, groupCreativeStudioRoutes, isPrimaryCreativeStudioRoute, getCreativeStudioRouteNavigationHref } from './creative-studio-routes'

interface CreativeStudioShellProps {
  title: string
  subtitle: string
  activeHref?: string
  children: ReactNode
}

function creativeTabClass(active: boolean): string {
  return active
    ? 'border-[color-mix(in_srgb,var(--aethel-primary)_50%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] text-[var(--aethel-primary-light)]'
    : 'border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_45%,transparent)] text-[var(--aethel-text-tertiary)] hover:border-[var(--aethel-border-secondary)] hover:bg-[var(--aethel-surface-secondary)] hover:text-[var(--aethel-text-secondary)]'
}

function maturityGuidance(maturity?: string) {
  if (maturity === 'BETA') {
    return {
      label: 'Beta editor',
      detail: 'Edit here. Heavy jobs wait for runtime.',
    }
  }

  if (maturity === 'ALPHA') {
    return {
      label: 'Alpha editor',
      detail: 'Draft and review. Ship only with receipts.',
    }
  }

  return {
    label: 'Creative hub',
    detail: 'Pick a lane. Open deeper editors only when needed.',
  }
}

export function CreativeStudioLoading({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[420px] items-center justify-center bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-tertiary)]">
      <div className="flex items-center gap-3 rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_55%,transparent)] px-5 py-4 shadow-[0_18px_60px_rgba(0,0,0,0.24)]">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--aethel-border-secondary)] border-t-[var(--aethel-primary-light)]" />
        <span className="text-xs font-semibold uppercase tracking-[0.16em]">
          Loading {label}
        </span>
      </div>
    </div>
  )
}

export default function CreativeStudioShell({
  title,
  subtitle: _subtitle,
  activeHref,
  children,
}: CreativeStudioShellProps) {
  const pathname = useBrowserPathname()
  const currentHref = activeHref ?? pathname
  const currentRoute = CREATIVE_STUDIO_ROUTES.find((route) => route.href === currentHref || route.href === pathname)
  const currentGuidance = maturityGuidance(currentRoute?.maturity)
  const primaryCreativeRoutes = CREATIVE_STUDIO_ROUTES.filter(isPrimaryCreativeStudioRoute)
  const secondaryCreativeRoutes = CREATIVE_STUDIO_ROUTES.filter((route) => !isPrimaryCreativeStudioRoute(route))
  const secondaryCreativeGroups = groupCreativeStudioRoutes(secondaryCreativeRoutes)
  const currentRouteIsSecondary = currentRoute ? !isPrimaryCreativeStudioRoute(currentRoute) : false

  const actions = (
    <div className="flex items-center gap-2">
      <Link
        href="/ide"
        className="inline-flex min-h-10 items-center rounded-lg border border-[var(--aethel-border-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--aethel-text-secondary)] transition-colors hover:border-[var(--aethel-border-secondary)] hover:bg-[var(--aethel-surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus-ring)]"
      >
        Open IDE
      </Link>
      <Link
        href="/nexus"
        className="inline-flex min-h-10 items-center rounded-lg bg-[var(--aethel-primary-dark)] px-3 py-1.5 text-xs font-semibold text-[var(--aethel-text-primary)] transition-colors hover:bg-[var(--aethel-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus-ring)]"
      >
        Operator
      </Link>
    </div>
  )

  return (
    <StudioLayout
      title={title}
      subtitle={undefined}
      actions={actions}
      padded={false}
      maxWidth="full"
      compactNav
      className="flex h-[calc(100vh-116px)] flex-col overflow-hidden"
    >
      <div
        className="border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_66%,transparent)] px-4 py-3 md:hidden"
        data-studio-mobile-editor-switcher
      >
        <details className="group rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)]">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-left [&::-webkit-details-marker]:hidden">
            <span className="min-w-0">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
                {currentGuidance.label}
              </span>
              <span className="mt-0.5 block truncate text-sm font-semibold text-[var(--aethel-text-primary)]">
                {currentRoute?.label ?? 'Creative Hub'}
              </span>
            </span>
            <span className="shrink-0 rounded-full border border-[var(--aethel-border-subtle)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-info-light)]">
              Switch
            </span>
          </summary>

          <div className="space-y-3 border-t border-[var(--aethel-border-subtle)] px-3 pb-3 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/studio"
                className={`${creativeTabClass(pathname === '/studio')} inline-flex min-h-10 items-center justify-between gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold`}
              >
                <span>Creative Hub</span>
                <MaturityBadge path="/studio" compact />
              </Link>
              {primaryCreativeRoutes.map((route) => (
                <Link
                  key={route.href}
                  href={getCreativeStudioRouteNavigationHref(route)}
                  className={`${creativeTabClass(currentHref === route.href || pathname === route.href)} inline-flex min-h-10 items-center justify-between gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold`}
                  title={route.description}
                >
                  <span>{route.shortLabel}</span>
                  <MaturityBadge maturity={route.maturity} compact />
                </Link>
              ))}
            </div>

            <details className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_38%,transparent)]">
              <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-secondary)] [&::-webkit-details-marker]:hidden">
                Advanced editors ({secondaryCreativeRoutes.length})
              </summary>
              <div className="grid gap-2 border-t border-[var(--aethel-border-subtle)] p-2">
                {secondaryCreativeGroups.map((group) => (
                  <div key={group.id} className="space-y-2" data-studio-editor-group={group.id}>
                    <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
                      {group.label}
                    </p>
                    {group.routes.map((route) => (
                      <Link
                        key={route.href}
                        href={getCreativeStudioRouteNavigationHref(route)}
                        className="block rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] px-3 py-2"
                        title={route.description}
                        data-studio-editor-group={route.group}
                        data-studio-editor-route={route.href}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[var(--aethel-text-primary)]">{route.label}</span>
                          <MaturityBadge maturity={route.maturity} compact />
                        </span>
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            </details>
          </div>
        </details>
      </div>

      <nav
        className="hidden min-h-12 items-center gap-2 overflow-x-auto border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_48%,transparent)] px-4 py-2 md:flex lg:px-6"
        aria-label="Creative studio modes"
      >
        <Link
          href="/studio"
          className={`${creativeTabClass(pathname === '/studio')} inline-flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus-ring)]`}
          aria-current={pathname === '/studio' ? 'page' : undefined}
        >
          <span>Creative Hub</span>
          <MaturityBadge path="/studio" compact />
        </Link>
        {currentRouteIsSecondary && currentRoute ? (
          <Link
            key={currentRoute.href}
            href={currentRoute.href}
            className={`${creativeTabClass(true)} inline-flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus-ring)]`}
            title={currentRoute.description}
            aria-current="page"
          >
            <span>{currentRoute.shortLabel}</span>
            <MaturityBadge maturity={currentRoute.maturity} compact />
          </Link>
        ) : null}
        {primaryCreativeRoutes.map((route) => (
          <Link
            key={route.href}
            href={getCreativeStudioRouteNavigationHref(route)}
            className={`${creativeTabClass(currentHref === route.href || pathname === route.href)} inline-flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus-ring)]`}
            title={route.description}
            aria-current={currentHref === route.href || pathname === route.href ? 'page' : undefined}
          >
            <span>{route.shortLabel}</span>
            <MaturityBadge maturity={route.maturity} compact />
          </Link>
        ))}
        <details className="group relative shrink-0">
          <summary className={`${creativeTabClass(currentRouteIsSecondary)} inline-flex min-h-10 cursor-pointer list-none items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus-ring)]`}>
            More editors
          </summary>
          <div className="fixed left-3 right-3 top-36 z-50 grid max-h-[70vh] gap-2 overflow-y-auto rounded-[24px] border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.42)] sm:left-auto sm:right-6 sm:w-[640px] sm:grid-cols-2 lg:grid-cols-3">
            {secondaryCreativeGroups.map((group) => (
              <div
                key={group.id}
                className="space-y-2 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_24%,transparent)] p-2"
                data-studio-editor-group={group.id}
              >
                <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
                  {group.label}
                </p>
                {group.routes.map((route) => (
                  <Link
                    key={route.href}
                    href={getCreativeStudioRouteNavigationHref(route)}
                    className="block rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_38%,transparent)] px-3 py-3 transition hover:border-[var(--aethel-border-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_58%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus-ring)]"
                    title={route.description}
                    aria-current={currentHref === route.href || pathname === route.href ? 'page' : undefined}
                    data-studio-editor-group={route.group}
                    data-studio-editor-route={route.href}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[var(--aethel-text-primary)]">{route.label}</span>
                      <MaturityBadge maturity={route.maturity} compact />
                    </span>
                    <span className="mt-1 line-clamp-2 block text-[11px] leading-4 text-[var(--aethel-text-tertiary)]">
                      {route.description}
                    </span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </details>
      </nav>

      <div className="hidden min-h-[52px] flex-col gap-2 border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_66%,transparent)] px-4 py-2 md:flex lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
              {currentGuidance.label}
            </span>
            {currentRoute ? <MaturityBadge maturity={currentRoute.maturity} /> : <MaturityBadge path="/studio" />}
            <span className="rounded-full border border-[var(--aethel-border-subtle)] px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
              Jobs paused
            </span>
          </div>
          <p className="mt-1 max-w-3xl truncate text-xs leading-5 text-[var(--aethel-text-secondary)]">
            {currentGuidance.detail}
          </p>
        </div>
        <div className="hidden shrink-0 flex-wrap gap-2 text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)] xl:flex">
          <span className="rounded-full border border-[var(--aethel-border-subtle)] px-2.5 py-1">Preview</span>
          <span className="rounded-full border border-[var(--aethel-border-subtle)] px-2.5 py-1">Local optional</span>
          <span className="rounded-full border border-[var(--aethel-border-subtle)] px-2.5 py-1">Cloud locked</span>
        </div>
      </div>

      <section className="min-h-0 flex-1 overflow-hidden">
        {children}
      </section>
    </StudioLayout>
  )
}
