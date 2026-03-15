'use client'

import { useState, type ReactNode } from 'react'
import DashboardSidebar, { type DashboardTab } from './DashboardSidebar'
import AethelHeaderPro from '../AethelHeaderPro'

// Legacy shell wrapper kept for compatibility with earlier refactor work.
// New dashboard work should anchor on AethelDashboard + AethelDashboardSidebar.

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
    <div className="min-h-screen bg-[#07080c] [background-image:radial-gradient(circle_at_top,rgba(99,102,241,0.14),transparent_30%),radial-gradient(circle_at_right_top,rgba(14,165,233,0.08),transparent_24%),linear-gradient(180deg,#0a0c12_0%,#06070a_100%)]">
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
