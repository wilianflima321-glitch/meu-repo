'use client'

import { type ReactNode } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  CloudCog,
  CreditCard,
  FileCode,
  FolderKanban,
  Gamepad2,
  LayoutDashboard,
  MessageSquare,
  Palette,
  Wallet,
} from 'lucide-react'
import { CreditDisplay } from './CreditDisplay'

// Legacy sidebar kept for compatibility with the older modular shell.
// Canonical navigation for the active dashboard runtime is AethelDashboardSidebar.

export type DashboardTab =
  | 'overview'
  | 'projects'
  | 'ai-chat'
  | 'content-creation'
  | 'unreal'
  | 'wallet'
  | 'billing'
  | 'connectivity'
  | 'templates'

interface TabConfig {
  id: DashboardTab
  label: string
  icon: ReactNode
}

const tabs: TabConfig[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'ai-chat', label: 'AI Console', icon: <MessageSquare className="w-5 h-5" /> },
  { id: 'projects', label: 'Projects', icon: <FolderKanban className="w-5 h-5" /> },
  { id: 'billing', label: 'Billing', icon: <CreditCard className="w-5 h-5" /> },
  { id: 'wallet', label: 'Wallet', icon: <Wallet className="w-5 h-5" /> },
  { id: 'connectivity', label: 'Connectivity', icon: <CloudCog className="w-5 h-5" /> },
  { id: 'templates', label: 'Templates', icon: <FileCode className="w-5 h-5" /> },
  { id: 'content-creation', label: 'Creation', icon: <Palette className="w-5 h-5" /> },
  { id: 'unreal', label: 'Unreal', icon: <Gamepad2 className="w-5 h-5" /> },
]

interface DashboardSidebarProps {
  activeTab: DashboardTab
  onTabChange: (tab: DashboardTab) => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function DashboardSidebar({
  activeTab,
  onTabChange,
  collapsed = false,
  onToggleCollapse,
}: DashboardSidebarProps) {
  return (
    <aside
      className={`
        flex flex-col h-full bg-[var(--aethel-surface-secondary)] border-r border-[var(--aethel-border-primary)]
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-16' : 'w-64'}
      `}
    >
      <div className="flex items-center justify-between h-14 px-4 border-b border-[var(--aethel-border-primary)]">
        {!collapsed && (
          <span className="font-semibold text-[var(--aethel-text-primary)]">Dashboard</span>
        )}
        <button
          type="button"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
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

      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id

          return (
            <button
              type="button"
              aria-label={`Open ${tab.label}`}
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                transition-all duration-200
                ${isActive
                  ? 'bg-[var(--aethel-info)] text-[var(--aethel-text-primary)] shadow-lg shadow-sky-500/20'
                  : 'text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-tertiary)]'
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

      <CreditDisplay collapsed={collapsed} />
    </aside>
  )
}

export default DashboardSidebar
