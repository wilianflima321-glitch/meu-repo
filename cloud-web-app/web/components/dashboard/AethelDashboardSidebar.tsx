import type { ActiveTab, SessionFilter } from './aethel-dashboard-model'

type NavItem = {
  tab: ActiveTab
  label: string
  iconPrimary: string
  iconSecondary?: string
}

type AethelDashboardSidebarProps = {
  sidebarOpen: boolean
  activeTab: ActiveTab
  sessionFilter: SessionFilter
  onCreateNewSession: () => void
  onSelectSessionFilter: (filter: SessionFilter) => void
  onSelectTab: (tab: ActiveTab) => void
}

const NAV_ITEMS: NavItem[] = [
  {
    tab: 'overview',
    label: 'Visao geral',
    iconPrimary:
      'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  },
  {
    tab: 'projects',
    label: 'Projetos',
    iconPrimary: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z',
    iconSecondary: 'M8 5a2 2 0 012-2h4a2 2 0 012 2v0M8 5a2 2 0 012-2h4a2 2 0 012 2v0',
  },
  {
    tab: 'ai-chat',
    label: 'Chat IA',
    iconPrimary: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  },
  {
    tab: 'agent-canvas',
    label: 'Canvas de agentes',
    iconPrimary: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
  {
    tab: 'content-creation',
    label: 'Criacao de conteudo',
    iconPrimary: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
    iconSecondary: 'M7 10l2 2-2 2',
  },
  {
    tab: 'unreal',
    label: 'Unreal Engine',
    iconPrimary: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  },
  {
    tab: 'wallet',
    label: 'Carteira',
    iconPrimary: 'M3 7h18a2 2 0 012 2v6a2 2 0 01-2 2H3a2 2 0 01-2-2V9a2 2 0 012-2z',
    iconSecondary: 'M16 11a1 1 0 110 2 1 1 0 010-2z',
  },
  {
    tab: 'billing',
    label: 'Faturamento',
    iconPrimary:
      'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1',
  },
  {
    tab: 'connectivity',
    label: 'Conectividade',
    iconPrimary: 'M12 8c-3.866 0-7 3.134-7 7m7-11c5.523 0 10 4.477 10 10m-5 0a5 5 0 00-10 0',
    iconSecondary: 'M12 19h.01',
  },
  {
    tab: 'templates',
    label: 'Modelos',
    iconPrimary: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
  {
    tab: 'use-cases',
    label: 'Casos de uso',
    iconPrimary: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
  {
    tab: 'download',
    label: 'Baixar IDE',
    iconPrimary: 'M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
  {
    tab: 'admin',
    label: 'Painel admin',
    iconPrimary:
      'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  },
]

function buildFilterClass(isActive: boolean) {
  const base = 'flex justify-center items-center clickable rounded-full px-3 py-1.5 border-none outline-offset-0 outline-slate-600 text-xs leading-4'
  return isActive
    ? `${base} bg-blue-600 text-white outline-none outline-0`
    : `${base} border border-slate-600 text-slate-400 hover:bg-slate-800`
}

export function AethelDashboardSidebar({
  sidebarOpen,
  activeTab,
  sessionFilter,
  onCreateNewSession,
  onSelectSessionFilter,
  onSelectTab,
}: AethelDashboardSidebarProps) {
  return (
    <nav
      className={`aethel-sidebar fixed md:relative z-50 h-full md:h-auto transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}
    >
      <div className="aethel-sidebar-header">
        <div className="aethel-flex aethel-items-center aethel-gap-3">
          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded aethel-flex aethel-items-center aethel-justify-center">
            <span className="text-white font-bold text-xs">A</span>
          </div>
          <span className="font-semibold text-sm">Navegacao</span>
        </div>
      </div>

      <div className="px-3 py-3">
        <button
          type="button"
          onClick={onCreateNewSession}
          className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors active:opacity-80 bg-blue-600 text-white shadow-sm hover:bg-blue-700 active:bg-blue-800 h-9 px-3 rounded-lg gap-2 text-sm min-w-9 w-full"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Nova tarefa</span>
          <div className="flex items-center gap-0.5 ml-auto">
            <span className="flex text-slate-300 justify-center items-center min-w-4 h-4 px-1 rounded text-xs font-normal">Ctrl</span>
            <span className="flex justify-center items-center w-4 h-4 px-1 rounded text-xs font-normal text-slate-300">K</span>
          </div>
        </button>
      </div>

      <div className="px-3 pb-3">
        <div className="flex gap-1">
          <button type="button" onClick={() => onSelectSessionFilter('all')} className={buildFilterClass(sessionFilter === 'all')}>
            Todas
          </button>
          <button type="button" onClick={() => onSelectSessionFilter('favorites')} className={buildFilterClass(sessionFilter === 'favorites')}>
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            Favoritas
          </button>
          <button type="button" onClick={() => onSelectSessionFilter('scheduled')} className={buildFilterClass(sessionFilter === 'scheduled')}>
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Agendadas
          </button>
        </div>
      </div>

      <div className="aethel-sidebar-nav aethel-space-y-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.tab}
            type="button"
            onClick={() => onSelectTab(item.tab)}
            className={`aethel-sidebar-item aethel-w-full ${activeTab === item.tab ? 'active' : ''}`}
          >
            <svg className="aethel-sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.iconPrimary} />
              {item.iconSecondary ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.iconSecondary} /> : null}
            </svg>
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
