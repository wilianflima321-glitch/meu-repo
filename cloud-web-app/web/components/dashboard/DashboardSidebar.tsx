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
  { id: 'ai-chat', label: 'AI Chat', icon: <MessageSquare className="w-5 h-5" /> },
  { id: 'agent-canvas', label: 'Agent Canvas', icon: <Workflow className="w-5 h-5" /> },
  { id: 'content-creation', label: 'Criação', icon: <Palette className="w-5 h-5" /> },
  { id: 'unreal', label: 'Unreal', icon: <Gamepad2 className="w-5 h-5" /> },
  { id: 'wallet', label: 'Carteira', icon: <Wallet className="w-5 h-5" /> },
  { id: 'billing', label: 'Planos', icon: <CreditCard className="w-5 h-5" /> },
  { id: 'connectivity', label: 'Status', icon: <Wifi className="w-5 h-5" /> },
  { id: 'templates', label: 'Templates', icon: <FileCode className="w-5 h-5" /> },
  { id: 'use-cases', label: 'Use Cases', icon: <Lightbulb className="w-5 h-5" /> },
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
      className={`
        flex flex-col h-full bg-slate-900 border-r border-slate-800
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-16' : 'w-64'}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-slate-800">
        {!collapsed && (
          <span className="font-semibold text-slate-200">Dashboard</span>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
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
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                transition-all duration-200
                ${isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
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

      {/* Footer - Storage/Usage */}
      {!collapsed && (
        <div className="p-4 border-t border-slate-800">
          <div className="text-xs text-slate-500 mb-2">Uso do mês</div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
              style={{ width: '45%' }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-400">
            <span>450 requests</span>
            <span>1000 limit</span>
          </div>
        </div>
      )}
    </aside>
  )
}

export default DashboardSidebar
