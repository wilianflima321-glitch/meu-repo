import Image from 'next/image'
import { useMemo, useState } from 'react'

import type { ActiveTab, SessionFilter } from './aethel-dashboard-model'

type NavItem = {
  tab: ActiveTab
  label: string
  iconPrimary: string
  iconSecondary?: string
  summary?: string
}

type NavSection = {
  id: 'ops' | 'explore'
  label: string
  description: string
  items: NavItem[]
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
    summary: 'Retome a missao principal sem sair da shell inicial do Studio.',
    iconPrimary:
      'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  },
  {
    tab: 'ai-chat',
    label: 'AI Console',
    summary: 'Planeje, pesquise e coordene agents sem perder o contexto.',
    iconPrimary: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  },
  {
    tab: 'projects',
    label: 'Projects',
    summary: 'Organize workspaces, handoffs e pontos de entrada.',
    iconPrimary: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z',
    iconSecondary: 'M8 5a2 2 0 012-2h4a2 2 0 012 2v0M8 5a2 2 0 012-2h4a2 2 0 012 2v0',
  },
]

const NAV_SECTIONS: NavSection[] = [
  {
    id: 'ops',
    label: 'Operations',
    description: 'Billing, wallet e readiness.',
    items: [
      {
        tab: 'billing',
        label: 'Billing',
        iconPrimary:
          'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1',
      },
      {
        tab: 'wallet',
        label: 'Wallet',
        iconPrimary: 'M3 7h18a2 2 0 012 2v6a2 2 0 01-2 2H3a2 2 0 01-2-2V9a2 2 0 012-2z',
        iconSecondary: 'M16 11a1 1 0 110 2 1 1 0 010-2z',
      },
      {
        tab: 'connectivity',
        label: 'Connectivity',
        iconPrimary: 'M12 8c-3.866 0-7 3.134-7 7m7-11c5.523 0 10 4.477 10 10m-5 0a5 5 0 00-10 0',
        iconSecondary: 'M12 19h.01',
      },
    ],
  },
  {
    id: 'explore',
    label: 'Explore',
    description: 'Templates and creative lanes without polluting the mission flow.',
    items: [
      {
        tab: 'templates',
        label: 'Templates',
        iconPrimary: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      },
      {
        tab: 'content-creation',
        label: 'Content creation',
        iconPrimary: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
        iconSecondary: 'M7 10l2 2-2 2',
      },
      {
        tab: 'unreal',
        label: 'Unreal',
        iconPrimary: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
      },
    ],
  },
]

function buildSidebarItemClass(isActive: boolean) {
  const base = 'flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left text-sm font-medium transition-all'
  return isActive
    ? `${base} border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--aethel-primary)_22%,transparent),color-mix(in_srgb,var(--aethel-info)_14%,transparent))] text-[var(--aethel-text-primary)] shadow-[0_14px_30px_rgba(14,165,233,0.12)]`
    : `${base} border-transparent bg-transparent text-[var(--aethel-text-secondary)] hover:border-[var(--aethel-border-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_52%,transparent)] hover:text-[var(--aethel-text-primary)]`
}

function buildFilterClass(isActive: boolean) {
  const base =
    'flex items-center justify-center rounded-full px-3 py-1.5 text-xs leading-4 border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] text-[var(--aethel-text-secondary)] transition'
  return isActive
    ? `${base} bg-[linear-gradient(135deg,rgba(79,70,229,0.35),rgba(14,165,233,0.2))] text-[var(--aethel-text-primary)] border-[color-mix(in_srgb,var(--aethel-info)_40%,transparent)]`
    : `${base} text-[var(--aethel-text-tertiary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] hover:text-[var(--aethel-text-secondary)] hover:border-[var(--aethel-border-secondary)]`
}

function getRecommendedNextStep(activeTab: ActiveTab): {
  label: string
  description: string
  tab?: ActiveTab
  action?: 'ide'
} {
  switch (activeTab) {
    case 'overview':
      return {
        label: 'Open AI Console',
        description: 'Transforme a missao atual em plano, pesquisa e execucao.',
        tab: 'ai-chat',
      }
    case 'ai-chat':
      return {
        label: 'Open Projects',
        description: 'Escolha o workspace certo antes do handoff para o Studio.',
        tab: 'projects',
      }
    case 'projects':
      return {
        label: 'Expand Studio',
        description: 'Leve o contexto para editor, viewport e review sem trocar de produto.',
        action: 'ide',
      }
    default:
      return {
        label: 'Back to Studio Home',
        description: 'Volte para a superficie principal e reencontre a proxima melhor acao.',
        tab: 'overview',
      }
  }
}

function SidebarIcon({ item }: { item: NavItem }) {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.iconPrimary} />
      {item.iconSecondary ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.iconSecondary} /> : null}
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
  const recommendedStep = getRecommendedNextStep(activeTab)

  const activeNavItem = useMemo(
    () => [...PRIMARY_ITEMS, ...NAV_SECTIONS.flatMap((section) => section.items)].find((item) => item.tab === activeTab),
    [activeTab]
  )

  const selectTab = (tab: ActiveTab) => {
    onSelectTab(tab)
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
      onCloseMobile?.()
    }
  }

  return (
    <nav
      id="dashboard-sidebar"
      className={`fixed z-50 h-full w-[300px] shrink-0 transform border-r border-[var(--aethel-border-subtle)] bg-[linear-gradient(180deg,rgba(10,13,20,0.98),rgba(8,10,16,0.96))] shadow-[0_30px_80px_rgba(0,0,0,0.45)] transition-transform duration-300 ease-in-out md:sticky md:top-[88px] md:h-[calc(100vh-104px)] md:rounded-r-3xl ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}
      aria-label="Navegacao principal do studio"
    >
      <div className="flex h-full flex-col overflow-hidden">
        <div className="border-b border-[var(--aethel-border-subtle)] px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Image
                src="/branding/aethel-icon-source.png"
                alt="Aethel"
                width={28}
                height={28}
                className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-1"
              />
              <div>
                <span className="block text-sm font-semibold text-[var(--aethel-text-primary)]">Studio nav</span>
                <span className="block text-[11px] text-[var(--aethel-text-tertiary)]">One shell, more depth only when needed</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onCloseMobile}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--aethel-border-subtle)] text-[var(--aethel-text-secondary)] transition hover:text-[var(--aethel-text-primary)] md:hidden"
              aria-label="Fechar navegacao"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-4 py-4">
          <button
            type="button"
            onClick={onCreateNewSession}
            className="inline-flex w-full min-w-9 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[linear-gradient(135deg,rgba(79,70,229,0.95),rgba(14,165,233,0.9))] px-3 py-2 text-sm font-semibold text-[var(--aethel-text-primary)] shadow-[0_10px_24px_rgba(59,130,246,0.25)] transition active:opacity-80 hover:brightness-110"
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

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <div className="mb-4 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_36%,transparent)] px-3 py-3">
            <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Current surface</div>
            <div className="mt-2 text-sm font-medium text-[var(--aethel-text-primary)]">{activeNavItem?.label ?? 'Studio'}</div>
            <div className="mt-1 text-xs leading-5 text-[var(--aethel-text-secondary)]">
              {entryMission
                ? `Mission: ${entryMission}`
                : activeNavItem?.summary ?? 'Keep the product focused around one visible next step.'}
            </div>
          </div>

          <div className="mb-4 rounded-2xl border border-[color-mix(in_srgb,var(--aethel-primary)_24%,transparent)] bg-[linear-gradient(135deg,rgba(79,70,229,0.12),rgba(14,165,233,0.08))] px-3 py-3 shadow-[0_16px_40px_rgba(2,6,23,0.16)]">
            <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Next best move</div>
            <div className="mt-2 text-sm font-semibold text-[var(--aethel-text-primary)]">{recommendedStep.label}</div>
            <div className="mt-1 text-xs leading-5 text-[var(--aethel-text-secondary)]">{recommendedStep.description}</div>
            <button
              type="button"
              onClick={() => {
                if (recommendedStep.action === 'ide') {
                  onOpenIde?.()
                  return
                }
                if (recommendedStep.tab) {
                  selectTab(recommendedStep.tab)
                }
              }}
              className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-[linear-gradient(135deg,rgba(79,70,229,0.95),rgba(14,165,233,0.9))] px-3 py-2 text-sm font-semibold text-[var(--aethel-text-primary)] shadow-[0_10px_24px_rgba(59,130,246,0.25)] transition hover:brightness-110"
            >
              {recommendedStep.label}
            </button>
          </div>

          <section className="space-y-2">
            <div className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Primary flow</div>
            <div className="space-y-1">
              {PRIMARY_ITEMS.map((item) => (
                <button
                  key={item.tab}
                  type="button"
                  onClick={() => selectTab(item.tab)}
                  className={buildSidebarItemClass(activeTab === item.tab)}
                  aria-current={activeTab === item.tab ? 'page' : undefined}
                >
                  <SidebarIcon item={item} />
                  <div className="min-w-0 flex-1">
                    <div>{item.label}</div>
                    {item.summary ? <div className="mt-0.5 text-xs font-normal text-[var(--aethel-text-tertiary)]">{item.summary}</div> : null}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <div className="mt-4 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_24%,transparent)] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Deep Studio</div>
                <div className="mt-1 text-sm font-medium text-[var(--aethel-text-primary)]">Expand the cockpit only when the task gets deep.</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenIde?.()}
              className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--aethel-info)_24%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-3 py-2 text-sm font-semibold text-[var(--aethel-info-light)] transition hover:border-[color-mix(in_srgb,var(--aethel-info)_36%,transparent)]"
            >
              Expand Studio
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {NAV_SECTIONS.map((section) => {
              const hasActiveItem = section.items.some((item) => item.tab === activeTab)
              const isExpanded = hasActiveItem || expandedSections[section.id]

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
                        <button
                          key={item.tab}
                          type="button"
                          onClick={() => selectTab(item.tab)}
                          className={buildSidebarItemClass(activeTab === item.tab)}
                          aria-current={activeTab === item.tab ? 'page' : undefined}
                        >
                          <SidebarIcon item={item} />
                          {item.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </section>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
