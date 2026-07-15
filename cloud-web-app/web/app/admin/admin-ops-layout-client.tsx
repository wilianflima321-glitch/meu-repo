'use client'

import type React from 'react'
import { useState } from 'react'
import useSWR from 'swr'
import StudioRuntimeProviders from '@/components/providers/StudioRuntimeProviders'
import {
  AdminOpsHeader,
  AdminOpsSidebar,
  type QuickStats,
  type SystemStatus,
} from './admin-ops-layout.parts'

export default function AdminOpsLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { data: statusData } = useSWR('/api/admin/status', { refreshInterval: 10000 })
  const { data: statsData } = useSWR('/api/admin/quick-stats', { refreshInterval: 30000 })

  const systemStatus = (statusData?.status || null) as SystemStatus | null
  const quickStats = (statsData?.stats || null) as QuickStats | null

  return (
    <StudioRuntimeProviders surface="light">
      <div className="flex min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
        <AdminOpsSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex min-h-screen flex-1 flex-col">
          <AdminOpsHeader
            onMenuClick={() => setSidebarOpen(true)}
            systemStatus={systemStatus}
            quickStats={quickStats}
          />
          <main id="admin-main-content" className="flex-1 overflow-auto p-6" tabIndex={-1}>
            {children}
          </main>
          <footer className="flex h-8 shrink-0 items-center justify-between border-t border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] px-4 text-[11px] text-[var(--aethel-text-tertiary)]">
            <span>Aethel Admin v2.1</span>
            <span>Synced</span>
          </footer>
        </div>
      </div>
    </StudioRuntimeProviders>
  )
}
