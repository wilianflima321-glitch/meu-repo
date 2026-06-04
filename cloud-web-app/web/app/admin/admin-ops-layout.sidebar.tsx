'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AlertTriangle, ChevronRight, Home, LayoutDashboard, Search, X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { useBrowserPathname } from '@/lib/navigation/use-browser-pathname'
import { adminCoverage, navGroups } from './admin-ops-layout.model'
import type { LegacyRouteItem, NavGroup } from './admin-ops-layout.types'

function NavGroupSection({ group, isCollapsed }: { group: NavGroup; isCollapsed?: boolean }) {
  const pathname = useBrowserPathname()
  const hasActiveChild = pathname === group.href || group.items.some((item) => pathname === item.href)
  const [open, setOpen] = useState(hasActiveChild)
  const activeLegacyItem = group.legacyItems.find((item) => pathname === item.href)

  return (
    <div className="mb-1">
      <div
        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wider transition-colors ${
          hasActiveChild
            ? 'bg-[var(--aethel-primary)]/10 text-[var(--aethel-info-light)]'
            : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
        }`}
      >
        <Link href={group.href} className="flex min-w-0 items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus-ring)]">
          <group.icon className="h-3 w-3" />
          {!isCollapsed && group.label}
        </Link>
        {!isCollapsed && (
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="flex items-center gap-1.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus-ring)]"
            aria-expanded={open}
            aria-label={`${group.label}: ${group.description}`}
          >
            <span className="rounded-full border border-[var(--aethel-border-subtle)] px-1.5 py-0.5 text-[10px] normal-case tracking-normal text-[var(--aethel-text-tertiary)]">
              {group.primaryItems.length}
            </span>
            <ChevronRight className={`h-3 w-3 transition-transform duration-150 ${open ? 'rotate-90' : ''}`} />
          </button>
        )}
      </div>

      {open && !isCollapsed && (
        <div className="ml-3 mt-1 rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_32%,transparent)] px-2.5 py-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-[var(--aethel-border-primary)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">
              {group.owner}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] ${
              group.riskLane === 'critical'
                ? 'border-[color-mix(in_srgb,var(--aethel-error)_36%,transparent)] text-[var(--aethel-error-light)]'
                : group.riskLane === 'high'
                  ? 'border-[color-mix(in_srgb,var(--aethel-warning)_36%,transparent)] text-[var(--aethel-warning-light)]'
                  : 'border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] text-[var(--aethel-info-light)]'
            }`}>
              {group.riskLane} risk
            </span>
            <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-success)_28%,transparent)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-success-light)]">
              {group.evidenceStatus}
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-4 text-[var(--aethel-text-tertiary)]">{group.intent}</p>
        </div>
      )}

      {open && !isCollapsed && (
        <nav className="ml-3 mt-1 space-y-0.5 border-l border-[var(--aethel-border-subtle)] pl-2">
          {group.primaryItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-all duration-150 ${
                  isActive
                    ? 'border border-[var(--aethel-primary)]/25 bg-[var(--aethel-primary)]/15 text-[var(--aethel-info-light)]'
                    : 'text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-primary)]'
                }`}
              >
                <span className="flex items-center gap-2">
                  <item.icon className="h-3.5 w-3.5" />
                  {item.title}
                </span>
                {item.badge ? (
                  <Badge variant={item.badge === 'Live' ? 'success' : 'secondary'} size="sm">
                    {item.badge}
                  </Badge>
                ) : null}
              </Link>
            )
          })}
          {activeLegacyItem ? (
            <Link
              href={activeLegacyItem.href}
              className="flex items-center justify-between rounded-lg border border-[var(--aethel-primary)]/20 bg-[var(--aethel-primary)]/10 px-2.5 py-1.5 text-xs text-[var(--aethel-info-light)]"
            >
              <span className="flex items-center gap-2">
                <activeLegacyItem.icon className="h-3.5 w-3.5" />
                {activeLegacyItem.title}
              </span>
              <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">Legacy</span>
            </Link>
          ) : null}
        </nav>
      )}
    </div>
  )
}

function CompatibilityRoutesDrawer({ groups }: { groups: NavGroup[] }) {
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const routes: LegacyRouteItem[] = groups.flatMap((group) =>
    group.legacyItems.map((item) => ({
      ...item,
      sectionLabel: group.label,
      owner: group.owner,
      riskLane: group.riskLane,
      evidenceStatus: group.evidenceStatus,
    })),
  )
  const filteredRoutes = normalizedQuery
    ? routes.filter((route) =>
        [route.title, route.href, route.sectionLabel, route.owner, route.riskLane, route.evidenceStatus]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : routes

  return (
    <details
      className="mx-2 mb-2 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_32%,transparent)]"
      aria-label="Global Legacy compatibility map"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-xs font-semibold text-[var(--aethel-text-secondary)]">
        <span>
          <span className="sr-only">Legacy map</span>
          Compatibility routes
        </span>
        <span className="rounded-full border border-[var(--aethel-border-subtle)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">
          {routes.length}
        </span>
      </summary>
      <div className="border-t border-[var(--aethel-border-subtle)] p-3">
        <p className="text-[11px] leading-5 text-[var(--aethel-text-tertiary)]">
          Legacy URLs stay searchable while the visible admin model remains six operator areas.
        </p>
        <label className="mt-3 flex min-h-10 items-center gap-2 rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] px-3 text-xs text-[var(--aethel-text-tertiary)]">
          <Search className="h-3.5 w-3.5" />
          <span className="sr-only">Search compatibility routes</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Search legacy routes..."
            className="min-w-0 flex-1 bg-transparent text-[var(--aethel-text-primary)] outline-none placeholder:text-[var(--aethel-text-quaternary)]"
          />
        </label>
        <div className="mt-3 max-h-72 space-y-1 overflow-y-auto pr-1">
          {filteredRoutes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className="block rounded-xl border border-transparent px-3 py-2 text-xs text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-subtle)] hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-primary)]"
            >
              <span className="flex items-center gap-2 font-medium">
                <route.icon className="h-3.5 w-3.5" />
                {route.title}
              </span>
              <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">
                <span>{route.sectionLabel}</span>
                <span>{route.owner}</span>
                <span>{route.riskLane}</span>
                <span>{route.evidenceStatus}</span>
              </span>
            </Link>
          ))}
          {filteredRoutes.length === 0 ? (
            <div className="rounded-xl border border-[var(--aethel-border-subtle)] px-3 py-4 text-center text-xs text-[var(--aethel-text-tertiary)]">
              No compatibility route matches this search.
            </div>
          ) : null}
        </div>
      </div>
    </details>
  )
}

export function AdminOpsSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <>
      {isOpen ? (
        <div
          className="fixed inset-0 z-40 bg-[color-mix(in_srgb,var(--aethel-surface-primary)_50%,transparent)] backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      ) : null}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] transition-transform duration-200 lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="navigation"
        aria-label="Admin navigation"
      >
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--aethel-border-subtle)] px-3">
          <Link href="/dashboard" className="group flex items-center gap-2">
            <Image
              src="/branding/aethel-mark.svg"
              alt="Aethel"
              width={28}
              height={28}
              className="rounded-lg shadow-[0_0_0_1px_var(--aethel-border-subtle)]"
            />
            <div>
              <p className="text-xs font-semibold text-[var(--aethel-text-primary)] group-hover:text-[var(--aethel-info)]">
                Aethel Admin
              </p>
              <p className="text-[10px] text-[var(--aethel-text-tertiary)]">Operations</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--aethel-text-tertiary)] hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-secondary)] lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-2 pt-2">
          <Link
            href="/admin"
            className="mb-1 flex items-center justify-between rounded-lg border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)]/45 px-2.5 py-2 text-xs text-[var(--aethel-text-secondary)] transition-colors hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-primary)]"
          >
            <span className="flex items-center gap-2">
              <LayoutDashboard className="h-3.5 w-3.5" />
              Command center
            </span>
            <span className="text-[10px] text-[var(--aethel-text-tertiary)]">{adminCoverage.sections} areas</span>
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-primary)]"
          >
            <Home className="h-3.5 w-3.5" />
            Back to Studio
          </Link>
        </div>

        <div className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {navGroups.map((group) => (
            <NavGroupSection key={group.label} group={group} />
          ))}
        </div>

        <CompatibilityRoutesDrawer groups={navGroups} />

        <div className="shrink-0 border-t border-[var(--aethel-border-subtle)] p-3">
          <Link
            href="/admin/emergency"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--aethel-error)]/40 bg-[var(--aethel-error)]/15 px-3 py-2 text-xs font-semibold text-[var(--aethel-error-light)] transition-colors hover:bg-[var(--aethel-error)]/25"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Emergency mode
          </Link>
        </div>
      </aside>
    </>
  )
}
