'use client'

import { type ReactNode } from 'react'
import {
  LayoutDashboard,
  FolderKanban,
  MessageSquare,
  Workflow,
  Palette,
  Gamepad2,
  Wallet,
  CreditCard,
  Wifi,
  FileCode,
  Lightbulb,
  Download,
  Shield,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { CreditDisplay } from './CreditDisplay'

// Legacy sidebar kept for compatibility with the older modular shell.
// Canonical navigation for the active dashboard runtime is AethelDashboardSidebar.

export type DashboardTab =
  | 'overview'
  | 'projects'
  | 'ai-chat'
  | 'agent-canvas'
  | 'content-creation'
  | 'unreal'
  | 'wallet'
  | 'billing'
  | 'connectivity'
  | 'templates'
  | 'use-cases'
  | 'download'
  | 'admin'

interface TabConfig {
  id: DashboardTab
  label: string
  icon: ReactNode
  adminOnly?: boolean
}

const tabs: TabConfig[] = [
  { id: 'overview', label: 'Visão Geral', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'projects', label: 'Projetos', icon: <FolderKanban className="w-5 h-5" /> },
  { id: 'ai-chat', label: 'Chat IA', icon: <MessageSquare className="w-5 h-5" /> },
  { id: 'agent-canvas', label: 'Canvas de Agentes', icon: <Workflow className="w-5 h-5" /> },
  { id: 'content-creation', label: 'Criação', icon: <Palette className="w-5 h-5" /> },
  { id: 'unreal', label: 'Unreal', icon: <Gamepad2 className="w-5 h-5" /> },
  { id: 'wallet', label: 'Carteira', icon: <Wallet className="w-5 h-5" /> },
  { id: 'billing', label: 'Planos', icon: <CreditCard className="w-5 h-5" /> },
  { id: 'connectivity', label: 'Status', icon: <Wifi className="w-5 h-5" /> },
  { id: 'templates', label: 'Modelos', icon: <FileCode className="w-5 h-5" /> },
  { id: 'use-cases', label: 'Casos de Uso', icon: <Lightbulb className="w-5 h-5" /> },
  { id: 'download', label: 'Download', icon: <Download className="w-5 h-5" /> },
  { id: 'admin', label: 'Admin', icon: <Shield className="w-5 h-5" />, adminOnly: true },
]

interface DashboardSidebarProps {
  activeTab: DashboardTab
  onTabChange: (tab: DashboardTab) => void
  isAdmin?: boolean
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function DashboardSidebar({
  activeTab,
  onTabChange,
  isAdmin = false,
  collapsed = false,
  onToggleCollapse,
}: DashboardSidebarProps) {
  const filteredTabs = tabs.filter((tab) => !tab.adminOnly || isAdmin)

  return (
    <aside
      className={`flex flex-col h-full bg-[var(--aethel-surface-secondary)] border-r border-[var(--aethel-border-primary)] transition-all duration-300 ease-in-out ${collapsed ? 'w-16' : 'w-64'}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-[var(--aethel-border-primary)]">
        {!collapsed && (
          <span className="font-semibold text-[var(--aethel-text-primary)]">Dashboard</span>
        )}
        <button type="button" aria-label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-tertiary)] transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {filteredTabs.map((tab) => {
          const isActive = activeTab === tab.id

          return (
            <button type="button" aria-label={`Abrir ${tab.label}`}
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${isActive
 ? 'bg-[var(--aethel-info)] text-[var(--aethel-text-primary)] shadow-lg shadow-sky-500/20'
 : 'text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-tertiary)]'
 } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? tab.label : undefined}
            >
              <span className="flex-shrink-0">{tab.icon}</span>
              {!collapsed && (
                <span className="text-sm font-medium truncate">{tab.label}</span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer - Credit Display */}
      <CreditDisplay collapsed={collapsed} />
    </aside>
  )
}

export default DashboardSidebar
