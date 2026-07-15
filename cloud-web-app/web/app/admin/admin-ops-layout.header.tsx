'use client'

import { Activity, Bell, ChevronRight, CreditCard, Menu, Users } from 'lucide-react'
import { findAdminSectionForRoute, getAdminRouteLabel } from '@/lib/admin/admin-consolidation'
import { useBrowserPathname } from '@/lib/navigation/use-browser-pathname'
import { QuickStatPill, StatusDot } from './admin-ops-layout.primitives'
import type { QuickStats, SystemStatus } from './admin-ops-layout.types'

export function AdminOpsHeader({
  onMenuClick,
  systemStatus,
  quickStats,
}: {
  onMenuClick: () => void
  systemStatus: SystemStatus | null
  quickStats: QuickStats | null
}) {
  const pathname = useBrowserPathname()
  const currentSection = findAdminSectionForRoute(pathname)
  const currentLabel = pathname === '/admin' ? 'Command center' : getAdminRouteLabel(pathname)

  return (
    <header
      className="flex h-12 items-center justify-between border-b border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] px-4"
      role="banner"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-1.5 text-[var(--aethel-text-tertiary)] hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-secondary)] lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="h-4 w-4" />
        </button>

        <nav className="hidden items-center gap-1 text-xs text-[var(--aethel-text-tertiary)] md:flex" aria-label="Breadcrumb">
          <span>Admin</span>
          <ChevronRight className="h-3 w-3" />
          {currentSection ? (
            <>
              <span>{currentSection.label}</span>
              <ChevronRight className="h-3 w-3" />
            </>
          ) : null}
          <span className="text-[var(--aethel-text-secondary)]">{currentLabel}</span>
        </nav>

        {systemStatus ? (
          <div className="ml-4 hidden items-center gap-3 border-l border-[var(--aethel-border-subtle)] pl-4 text-[11px] lg:flex">
            <span className="flex items-center gap-1.5 text-[var(--aethel-text-tertiary)]"><StatusDot status={systemStatus.api} /> API</span>
            <span className="flex items-center gap-1.5 text-[var(--aethel-text-tertiary)]"><StatusDot status={systemStatus.database} /> DB</span>
            <span className="flex items-center gap-1.5 text-[var(--aethel-text-tertiary)]"><StatusDot status={systemStatus.redis} /> Redis</span>
            <span className="flex items-center gap-1.5 text-[var(--aethel-text-tertiary)]"><StatusDot status={systemStatus.ai} /> AI</span>
          </div>
        ) : null}
      </div>

      {quickStats ? (
        <div className="hidden items-center gap-2 lg:flex">
          <QuickStatPill icon={Users} label="Online" value={quickStats.activeUsers} />
          <QuickStatPill icon={Activity} label="Req/min" value={quickStats.requestsPerMinute} />
          <QuickStatPill
            icon={CreditCard}
            label="AI cost today"
            value={`$${quickStats.aiCostToday.toFixed(2)}`}
            alert={quickStats.aiCostToday > 50}
          />
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="relative rounded-lg p-1.5 text-[var(--aethel-text-tertiary)] hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-secondary)]"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[var(--aethel-error)]" />
        </button>
      </div>
    </header>
  )
}
