'use client'

import { useState, type ReactNode } from 'react'
import DashboardSidebar, { type DashboardTab } from './DashboardSidebar'
import AethelHeaderPro from '../AethelHeaderPro'

interface DashboardLayoutProps {
  children: ReactNode
  activeTab: DashboardTab
  onTabChange: (tab: DashboardTab) => void
  isAdmin?: boolean
}

export function DashboardLayout({
  children,
  activeTab,
  onTabChange,
  isAdmin = false,
}: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-slate-950">
      <AethelHeaderPro />
      
      <div className="flex h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <DashboardSidebar
          activeTab={activeTab}
          onTabChange={onTabChange}
          isAdmin={isAdmin}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
