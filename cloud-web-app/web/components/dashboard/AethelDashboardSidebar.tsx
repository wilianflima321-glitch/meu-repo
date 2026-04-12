import Image from 'next/image'
import { useState } from 'react'

import type { ActiveTab, SessionFilter } from './aethel-dashboard-model'

type NavGroup = 'core' | 'ops' | 'labs'

type NavItem = {
  group: NavGroup
  tab: ActiveTab
  label: string
  iconPrimary: string
  iconSecondary?: string
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

const NAV_GROUPS: Array<{ id: NavGroup; label: string }> = [
  { id: 'core', label: 'Fluxo principal' },
  { id: 'ops', label: 'Operacao e negocio' },
  { id: 'labs', label: 'Labs e exploracao' },
]

const NAV_ITEMS: NavItem[] = [
  {
    group: 'core',
    tab: 'overview',
    label: 'Visao geral',
    iconPrimary:
      'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  },
  {
    group: 'core',
    tab: 'projects',
    label: 'Projetos',
    iconPrimary: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z',
    iconSecondary: 'M8 5a2 2 0 012-2h4a2 2 0 012 2v0M8 5a2 2 0 012-2h4a2 2 0 012 2v0',
  },
  {
    group: 'core',
    tab: 'ai-chat',
    label: 'Chat IA',
    iconPrimary: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  },
  {
    group: 'core',
    tab: 'agent-canvas',
    label: 'Canvas de agentes',
    iconPrimary: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
  {
    group: 'labs',
    tab: 'content-creation',
    label: 'Criacao de conteudo',
    iconPrimary: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
    iconSecondary: 'M7 10l2 2-2 2',
  },
  {
    group: 'labs',
    tab: 'unreal',
    label: 'Unreal Engine',
    iconPrimary: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  },
  {
    group: 'labs',
    tab: 'templates',
    label: 'Modelos',
    iconPrimary: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
  {
    group: 'labs',
    tab: 'use-cases',
    label: 'Casos de uso',
    iconPrimary: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
  {
    group: 'labs',
    tab: 'download',
    label: 'Baixar IDE',
    iconPrimary: 'M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
  {
    group: 'ops',
    tab: 'wallet',
    label: 'Carteira',
    iconPrimary: 'M3 7h18a2 2 0 012 2v6a2 2 0 01-2 2H3a2 2 0 01-2-2V9a2 2 0 012-2z',
    iconSecondary: 'M16 11a1 1 0 110 2 1 1 0 010-2z',
  },
  {
    group: 'ops',
    tab: 'billing',
    label: 'Faturamento',
    iconPrimary:
      'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1',
  },
  {
    group: 'ops',
    tab: 'connectivity',
    label: 'Conectividade',
    iconPrimary: 'M12 8c-3.866 0-7 3.134-7 7m7-11c5.523 0 10 4.477 10 10m-5 0a5 5 0 00-10 0',
    iconSecondary: 'M12 19h.01',
  },
  {
    group: 'ops',
    tab: 'admin',
    label: 'Painel admin',
    iconPrimary:
      'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  },
]

const SECONDARY_TABS = new Set<ActiveTab>([
  'agent-canvas',
  'content-creation',
  'unreal',
  'templates',
  'use-cases',
  'download',
  'wallet',
  'connectivity',
  'admin',
])

function buildSidebarItemClass(isActive: boolean) {
  const base =
    'flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left text-sm font-medium transition-all'
  return isActive
    ? `${base} border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--aethel-primary)_22%,transparent),color-mix(in_srgb,var(--aethel-info)_14%,transparent))] text-[var(--aethel-text-primary)] shadow-[0_14px_30px_rgba(14,165,233,0.12)]`
    : `${base} border-transparent bg-transparent text-[var(--aethel-text-secondary)] hover:border-[var(--aethel-border-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_52%,transparent)] hover:text-[var(--aethel-text-primary)]`
}

function buildFilterClass(isActive: boolean) {
  const base =
    'flex items-center justify-center clickable rounded-full px-3 py-1.5 text-xs leading-4 border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] text-[var(--aethel-text-secondary)] transition'
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
        label: 'Ir para AI Chat',
        description: 'Transforme contexto em plano acionavel.',
        tab: 'ai-chat',
      }
    case 'ai-chat':
      return {
        label: 'Ir para Projetos',
        description: 'Crie ou ajuste o workspace antes da execucao.',
        tab: 'projects',
      }
    case 'projects':
      return {
        label: 'Abrir IDE',
        description: 'Leve o handoff para edicao e preview.',
        action: 'ide',
      }
    default:
      return {
        label: 'Voltar ao overview',
        description: 'Reencontre a jornada principal do Studio.',
        tab: 'overview',
      }
  }
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
  const [expandedGroups, setExpandedGroups] = useState<Record<NavGroup, boolean>>({
    core: true,
    ops: false,
    labs: false,
  })
  const recommendedStep = getRecommendedNextStep(activeTab)

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
                <span className="block text-sm font-semibold text-[var(--aethel-text-primary)]">Navegacao</span>
                <span className="block text-[11px] text-[var(--aethel-text-tertiary)]">Fluxos organizados por superficie</span>
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
            <span>Nova tarefa</span>
            <div className="ml-auto flex items-center gap-0.5">
              <span className="flex min-w-4 items-center justify-center rounded px-1 text-xs font-normal text-[var(--aethel-text-secondary)]">Ctrl</span>
              <span className="flex h-4 w-4 items-center justify-center rounded px-1 text-xs font-normal text-[var(--aethel-text-secondary)]">K</span>
            </div>
          </button>
        </div>

        <div className="px-4 pb-4">
          <details className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-3 py-2">
            <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
              Filtros de sessao
            </summary>
            <div className="mt-2 flex gap-1">
              <button type="button" onClick={() => onSelectSessionFilter('all')} className={buildFilterClass(sessionFilter === 'all')}>
                Todas
              </button>
              <button type="button" onClick={() => onSelectSessionFilter('favorites')} className={buildFilterClass(sessionFilter === 'favorites')}>
                <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
                Favoritas
              </button>
              <button type="button" onClick={() => onSelectSessionFilter('scheduled')} className={buildFilterClass(sessionFilter === 'scheduled')}>
                <svg className="mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Agendadas
              </button>
            </div>
          </details>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <div className="mb-4 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_36%,transparent)] px-3 py-3">
            <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Contexto atual</div>
            <div className="mt-2 text-sm font-medium text-[var(--aethel-text-primary)]">
              {NAV_ITEMS.find((item) => item.tab === activeTab)?.label ?? 'Studio'}
            </div>
            <div className="mt-1 text-xs text-[var(--aethel-text-secondary)]">
              Navegue sem perder o foco entre criacao, execucao e operacao.
            </div>
          </div>

          <div className="mb-4 rounded-2xl border border-[color-mix(in_srgb,var(--aethel-primary)_24%,transparent)] bg-[linear-gradient(135deg,rgba(79,70,229,0.12),rgba(14,165,233,0.08))] px-3 py-3 shadow-[0_16px_40px_rgba(2,6,23,0.16)]">
            <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Proxima melhor etapa</div>
            <div className="mt-2 text-sm font-semibold text-[var(--aethel-text-primary)]">{recommendedStep.label}</div>
            <div className="mt-1 text-xs leading-5 text-[var(--aethel-text-secondary)]">
              {entryMission
                ? `${recommendedStep.description} Missao ativa preservada no fluxo.`
                : recommendedStep.description}
            </div>
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

          <div className="space-y-4">
            {NAV_GROUPS.map((group) => {
              const items = NAV_ITEMS.filter((item) => item.group === group.id)
              const primaryItems = items.filter((item) => !SECONDARY_TABS.has(item.tab))
              const secondaryItems = items.filter((item) => SECONDARY_TABS.has(item.tab))
              const isExpanded = expandedGroups[group.id]

              return (
                <section key={group.id} className="space-y-2">
                  <div className="flex items-center justify-between px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
                    <span>{group.label}</span>
                    {secondaryItems.length > 0 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedGroups((prev) => ({
                            ...prev,
                            [group.id]: !prev[group.id],
                          }))
                        }
                        className="rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)] transition hover:text-[var(--aethel-text-secondary)]"
                        aria-expanded={isExpanded}
                        aria-controls={`sidebar-group-${group.id}`}
                      >
                        {isExpanded ? 'Menos' : 'Mais'}
                      </button>
                    ) : null}
                  </div>
                  <div id={`sidebar-group-${group.id}`} className="space-y-1">
                    {primaryItems.map((item) => (
                      <button
                        key={item.tab}
                        type="button"
                        onClick={() => selectTab(item.tab)}
                        className={buildSidebarItemClass(activeTab === item.tab)}
                        aria-current={activeTab === item.tab ? 'page' : undefined}
                      >
                        <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.iconPrimary} />
                          {item.iconSecondary ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.iconSecondary} /> : null}
                        </svg>
                        {item.label}
                      </button>
                    ))}

                    {secondaryItems.length > 0 && isExpanded ? (
                      <div className="mt-1 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_28%,transparent)] p-2">
                        {secondaryItems.map((item) => (
                          <button
                            key={item.tab}
                            type="button"
                            onClick={() => selectTab(item.tab)}
                            className={buildSidebarItemClass(activeTab === item.tab)}
                            aria-current={activeTab === item.tab ? 'page' : undefined}
                          >
                            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.iconPrimary} />
                              {item.iconSecondary ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.iconSecondary} />
                              ) : null}
                            </svg>
                            {item.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
