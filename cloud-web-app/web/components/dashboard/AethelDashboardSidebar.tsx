import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

import {
  resolvePrimaryDashboardTab,
  type ActiveTab,
  type DashboardPrimaryTab,
  type SessionFilter,
} from './aethel-dashboard-model'

type NavItem = {
  tab: DashboardPrimaryTab
  label: string
  iconPrimary: string
  iconSecondary?: string
  summary?: string
}

type ToolLink = {
  href: string
  label: string
  summary: string
  iconPrimary: string
}

type NavSection = {
  id: 'ops' | 'explore'
  label: string
  description: string
  items: ToolLink[]
}

type AethelDashboardSidebarProps = {
  sidebarOpen: boolean
  activeTab: ActiveTab
  sessionFilter: SessionFilter
  entryMission?: string | null
  onCreateNewSession: () => void
  onSelectSessionFilter: (filter: SessionFilter) => void
  onSelectTab: (tab: ActiveTab) => void
  onOpenIde?: () => void
  onCloseMobile?: () => void
}

const PRIMARY_ITEMS: NavItem[] = [
  {
    tab: 'overview',
    label: 'Studio Home',
    summary: 'Mission, preview, cost, next action.',
    iconPrimary:
      'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  },
  {
    tab: 'projects',
    label: 'Projects',
    summary: 'Choose or shape a workspace.',
    iconPrimary: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z',
    iconSecondary: 'M8 5a2 2 0 012-2h4a2 2 0 012 2v0M8 5a2 2 0 012-2h4a2 2 0 012 2v0',
  },
  {
    tab: 'activity',
    label: 'Activity',
    summary: 'Agents, cost, trust, evidence.',
    iconPrimary: 'M4 6h16M4 12h10M4 18h7M17 12l2 2 4-4',
  },
]

const NAV_SECTIONS: NavSection[] = [
  {
    id: 'ops',
    label: 'Operations',
    description: 'Secondary tools.',
    items: [
      {
        href: '/billing',
        label: 'Billing',
        summary: 'Plans, invoices, wallet.',
        iconPrimary: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1',
      },
      {
        href: '/settings?tab=integrations',
        label: 'Integrations',
        summary: 'Providers, keys, services.',
        iconPrimary: 'M12 8c-3.866 0-7 3.134-7 7m7-11c5.523 0 10 4.477 10 10m-5 0a5 5 0 00-10 0',
      },
      {
        href: '/evidence',
        label: 'Evidence',
        summary: 'Receipts, blockers, release state.',
        iconPrimary: 'M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z',
      },
    ],
  },
  {
    id: 'explore',
    label: 'Depth',
    description: 'Deep tools.',
    items: [
      {
        href: '/ide?panel=agents',
        label: 'Agents in IDE',
        summary: 'Copilot, tools, handoffs.',
        iconPrimary: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
      },
      {
        href: '/studio',
        label: 'Creative Studio',
        summary: 'World, character, FX, film, logic.',
        iconPrimary: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
      },
      {
        href: '/marketplace',
        label: 'Marketplace',
        summary: 'Assets and extensions.',
        iconPrimary: 'M4 7h16M4 12h16M4 17h16',
      },
    ],
  },
]

function buildSidebarItemClass(isActive: boolean) {
  const base = 'flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left text-sm font-medium transition-all'
  return isActive
    ? `${base} border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] text-[var(--aethel-text-primary)] shadow-[0_12px_28px_rgba(2,6,23,0.18)]`
    : `${base} border-transparent bg-transparent text-[var(--aethel-text-secondary)] hover:border-[var(--aethel-border-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_52%,transparent)] hover:text-[var(--aethel-text-primary)]`
}

function buildFilterClass(isActive: boolean) {
  const base =
    'flex items-center justify-center rounded-full px-3 py-1.5 text-xs leading-4 border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] text-[var(--aethel-text-secondary)] transition'
  return isActive
    ? `${base} bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] text-[var(--aethel-text-primary)] border-[var(--aethel-border-primary)]`
    : `${base} text-[var(--aethel-text-tertiary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] hover:text-[var(--aethel-text-secondary)] hover:border-[var(--aethel-border-secondary)]`
}

function SidebarIcon({ path, secondary }: { path: string; secondary?: string }) {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
      {secondary ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={secondary} /> : null}
    </svg>
  )
}

export function AethelDashboardSidebar({
  sidebarOpen,
  activeTab,
  sessionFilter,
  entryMission,
  onCreateNewSession,
  onSelectSessionFilter,
  onSelectTab,
  onOpenIde,
  onCloseMobile,
}: AethelDashboardSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Record<NavSection['id'], boolean>>({
    ops: false,
    explore: false,
  })
  const primaryActiveTab = resolvePrimaryDashboardTab(activeTab)

  const selectTab = (tab: DashboardPrimaryTab) => {
    onSelectTab(tab)
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
      onCloseMobile?.()
    }
  }

  return (
    <nav
      id="dashboard-sidebar"
      className={`fixed z-50 h-full w-[292px] shrink-0 transform border-r border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] shadow-[0_30px_80px_rgba(0,0,0,0.30)] transition-transform duration-300 ease-in-out md:sticky md:top-[88px] md:h-[calc(100vh-104px)] md:rounded-r-3xl ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}
      aria-label="Primary Studio navigation"
    >
      <div className="flex h-full flex-col overflow-hidden">
        <div className="border-b border-[var(--aethel-border-subtle)] px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Image
                src="/branding/aethel-mark.svg"
                alt="Aethel"
                width={28}
                height={28}
                className="rounded-xl shadow-[0_0_0_1px_var(--aethel-border-subtle)]"
              />
              <div>
                <span className="block text-sm font-semibold text-[var(--aethel-text-primary)]">Studio nav</span>
                <span className="block text-[11px] text-[var(--aethel-text-tertiary)]">
                  Three paths. Depth on demand.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onCloseMobile}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--aethel-border-subtle)] text-[var(--aethel-text-secondary)] transition hover:text-[var(--aethel-text-primary)] md:hidden"
              aria-label="Close navigation"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {entryMission ? (
            <p className="mt-3 line-clamp-2 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] px-3 py-2 text-xs leading-5 text-[var(--aethel-text-secondary)]">
              {entryMission}
            </p>
          ) : null}
        </div>

        <div className="px-4 py-4">
          <button
            type="button"
            onClick={onCreateNewSession}
            className="inline-flex w-full min-w-9 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[var(--aethel-text-primary)] px-3 py-2 text-sm font-semibold text-[var(--aethel-surface-primary)] shadow-[0_10px_24px_rgba(2,6,23,0.18)] transition hover:bg-[var(--aethel-text-secondary)] active:opacity-80"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>New mission</span>
            <div className="ml-auto flex items-center gap-0.5">
              <span className="flex min-w-4 items-center justify-center rounded px-1 text-xs font-normal text-[var(--aethel-text-secondary)]">Ctrl</span>
              <span className="flex h-4 w-4 items-center justify-center rounded px-1 text-xs font-normal text-[var(--aethel-text-secondary)]">K</span>
            </div>
          </button>
        </div>

        <div className="px-4 pb-4">
          <details className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-3 py-2">
            <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
              Session filters
            </summary>
            <div className="mt-2 flex gap-1">
              <button type="button" onClick={() => onSelectSessionFilter('all')} className={buildFilterClass(sessionFilter === 'all')}>
                All
              </button>
              <button type="button" onClick={() => onSelectSessionFilter('favorites')} className={buildFilterClass(sessionFilter === 'favorites')}>
                Favorites
              </button>
              <button type="button" onClick={() => onSelectSessionFilter('scheduled')} className={buildFilterClass(sessionFilter === 'scheduled')}>
                Scheduled
              </button>
            </div>
          </details>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4" data-dashboard-sidebar-density="three-primary-tabs">
          <section className="space-y-2" data-dashboard-primary-tabs="3">
            <div className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Primary flow</div>
            <div className="space-y-1">
              {PRIMARY_ITEMS.map((item) => (
                <button
                  key={item.tab}
                  type="button"
                  onClick={() => selectTab(item.tab)}
                  className={buildSidebarItemClass(primaryActiveTab === item.tab)}
                  aria-current={primaryActiveTab === item.tab ? 'page' : undefined}
                >
                  <SidebarIcon path={item.iconPrimary} secondary={item.iconSecondary} />
                  <div className="min-w-0 flex-1">
                    <div>{item.label}</div>
                    {item.summary ? <div className="mt-0.5 text-xs font-normal text-[var(--aethel-text-tertiary)]">{item.summary}</div> : null}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <div className="mt-4 space-y-3" data-dashboard-secondary-tools="drawer-links">
            {NAV_SECTIONS.map((section) => {
              const isExpanded = expandedSections[section.id]

              return (
                <section key={section.id} className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_24%,transparent)] p-2">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedSections((prev) => ({
                        ...prev,
                        [section.id]: !prev[section.id],
                      }))
                    }
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2 text-left"
                    aria-expanded={isExpanded}
                    aria-controls={`sidebar-section-${section.id}`}
                  >
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">{section.label}</div>
                      <div className="mt-1 text-xs text-[var(--aethel-text-secondary)]">{section.description}</div>
                    </div>
                    <span className="rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)] px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
                      {isExpanded ? 'Hide' : 'Show'}
                    </span>
                  </button>

                  {isExpanded ? (
                    <div id={`sidebar-section-${section.id}`} className="mt-2 space-y-1">
                      {section.items.map((item) => (
                        <Link key={item.href} href={item.href} className={buildSidebarItemClass(false)} onClick={onCloseMobile}>
                          <SidebarIcon path={item.iconPrimary} />
                          <span className="min-w-0 flex-1">
                            <span className="block">{item.label}</span>
                            <span className="mt-0.5 block text-xs font-normal text-[var(--aethel-text-tertiary)]">{item.summary}</span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </section>
              )
            })}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[var(--aethel-border-subtle)] pt-4">
            <button
              type="button"
              onClick={() => onOpenIde?.()}
              className="inline-flex items-center justify-center rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_46%,transparent)] px-3 py-2 text-sm font-semibold text-[var(--aethel-text-primary)] transition hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_62%,transparent)]"
            >
              Open IDE
            </button>
            <Link
              href="/evidence"
              className="inline-flex items-center justify-center rounded-xl border border-[var(--aethel-border-subtle)] bg-transparent px-3 py-2 text-sm font-semibold text-[var(--aethel-text-secondary)] transition hover:text-[var(--aethel-text-primary)]"
            >
              Evidence
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
