'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import useSWR from 'swr'
import {
  Activity,
  AlertTriangle,
  Bell,
  ChevronDown,
  Clock,
  CreditCard,
  LayoutDashboard,
  Menu,
  Server,
  Settings,
  Shield,
  TrendingUp,
  Users,
  X,
  Zap,
  Brain,
} from 'lucide-react'
import { getToken } from '@/lib/auth'

interface SystemStatus {
  api: 'healthy' | 'degraded' | 'down'
  database: 'healthy' | 'degraded' | 'down'
  redis: 'healthy' | 'degraded' | 'down'
  ai: 'healthy' | 'degraded' | 'down'
  websocket: 'healthy' | 'degraded' | 'down'
}

interface QuickStats {
  activeUsers: number
  requestsPerMinute: number
  aiCostToday: number
  emergencyLevel: 'normal' | 'warning' | 'critical' | 'shutdown'
}

const navItems = [
  { title: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { title: 'Finance', href: '/admin/finance', icon: CreditCard, badge: 'MRR' },
  { title: 'Users', href: '/admin/users', icon: Users },
  { title: 'AI Monitor', href: '/admin/ai-monitor', icon: Brain, badge: 'Live' },
  { title: 'Emergency', href: '/admin/emergency', icon: AlertTriangle, badge: 'Ops' },
  { title: 'Infrastructure', href: '/admin/infrastructure', icon: Server },
  { title: 'Moderation', href: '/admin/moderation', icon: Shield },
  { title: 'Analytics', href: '/admin/analytics', icon: TrendingUp },
  { title: 'Settings', href: '/admin/ide-settings', icon: Settings },
]

const adminFetcher = async (url: string) => {
  const token = getToken()
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  if (!response.ok) return null
  return response.json()
}

function StatusIndicator({ status }: { status: 'healthy' | 'degraded' | 'down' }) {
  const color = status === 'healthy' ? 'bg-green-500' : status === 'degraded' ? 'bg-amber-500' : 'bg-red-500'
  return <span className={`h-2 w-2 rounded-full ${color} ${status !== 'healthy' ? 'animate-pulse' : ''}`} />
}

function QuickStatCard({
  icon: Icon,
  label,
  value,
  alert,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  alert?: boolean
}) {
  return (
    <div className={`flex items-center gap-2 rounded-md border px-3 py-1.5 ${alert ? 'border-red-500/40 bg-red-500/10' : 'border-zinc-700 bg-zinc-800/60'}`}>
      <Icon className={`h-3.5 w-3.5 ${alert ? 'text-red-400' : 'text-zinc-400'}`} />
      <div>
        <p className="text-[10px] text-zinc-500">{label}</p>
        <p className={`text-xs font-semibold ${alert ? 'text-red-300' : 'text-zinc-200'}`}>{value}</p>
      </div>
    </div>
  )
}

function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname()

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed left-0 top-0 z-50 h-full w-64 border-r border-zinc-800 bg-zinc-900 transition-transform duration-200 lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-12 items-center justify-between border-b border-zinc-800 px-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-gradient-to-br from-blue-600 to-cyan-600">
              <Zap className="h-3.5 w-3.5 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-100">Aethel Ops</p>
              <p className="text-[10px] text-zinc-500">Operations</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 lg:hidden" aria-label="Close sidebar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="space-y-1 p-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center justify-between rounded px-2.5 py-2 text-xs transition-colors ${
                  isActive ? 'bg-blue-600/20 text-blue-300' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <item.icon className="h-3.5 w-3.5" />
                  {item.title}
                </span>
                {item.badge && (
                  <span className={`rounded px-1.5 py-0.5 text-[10px] ${item.badge === 'Live' ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-400'}`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-zinc-800 p-3">
          <Link
            href="/admin/emergency"
            className="flex w-full items-center justify-center gap-2 rounded bg-red-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-500"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Emergency Mode
          </Link>
        </div>
      </aside>
    </>
  )
}

function Header({
  onMenuClick,
  systemStatus,
  quickStats,
}: {
  onMenuClick: () => void
  systemStatus: SystemStatus | null
  quickStats: QuickStats | null
  hasStatusData: boolean
  hasStatsData: boolean
}) {
  return (
    <header className="flex h-12 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-3">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="text-zinc-500 hover:text-zinc-200 lg:hidden" aria-label="Open sidebar">
          <Menu className="h-4 w-4" />
        </button>
        {systemStatus && (
          <div className="hidden items-center gap-3 text-[11px] md:flex">
            <span className="flex items-center gap-1.5 text-zinc-500"><StatusIndicator status={systemStatus.api} />API</span>
            <span className="flex items-center gap-1.5 text-zinc-500"><StatusIndicator status={systemStatus.database} />DB</span>
            <span className="flex items-center gap-1.5 text-zinc-500"><StatusIndicator status={systemStatus.redis} />Redis</span>
            <span className="flex items-center gap-1.5 text-zinc-500"><StatusIndicator status={systemStatus.ai} />AI</span>
          </div>
        )}
        {!systemStatus && !hasStatusData && (
          <span className="hidden text-[11px] text-amber-300 md:block">Status telemetry unavailable</span>
        )}
      </div>

      {quickStats && (
        <div className="hidden items-center gap-2 lg:flex">
          <QuickStatCard icon={Users} label="Online" value={quickStats.activeUsers} />
          <QuickStatCard icon={Activity} label="Req/min" value={quickStats.requestsPerMinute} />
          <QuickStatCard icon={CreditCard} label="AI cost today" value={`$${quickStats.aiCostToday.toFixed(2)}`} alert={quickStats.aiCostToday > 50} />
          {quickStats.emergencyLevel !== 'normal' && (
            <QuickStatCard icon={AlertTriangle} label="Emergency" value={quickStats.emergencyLevel.toUpperCase()} alert />
          )}
        </div>
      )}
      {!quickStats && !hasStatsData && (
        <div className="hidden items-center gap-2 text-[11px] text-amber-300 lg:flex">
          Quick stats unavailable
        </div>
      )}

      <div className="flex items-center gap-2">
        <button className="relative p-1.5 text-zinc-500 hover:text-zinc-200" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-500" />
        </button>
        <button className="flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-100">
          <span>Admin</span>
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  )
}

export default function AdminOpsLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { data: statusData } = useSWR('/api/admin/status', adminFetcher, { refreshInterval: 10000 })
  const { data: statsData } = useSWR('/api/admin/quick-stats', adminFetcher, { refreshInterval: 30000 })

  const systemStatus = statusData?.status ?? null
  const quickStats = statsData?.stats ?? null

  return (
    <div className="admin-unified-theme density-compact flex min-h-screen bg-zinc-950 text-zinc-100">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-h-screen flex-1 flex-col">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          systemStatus={systemStatus}
          quickStats={quickStats}
          hasStatusData={statusData !== undefined}
          hasStatsData={statsData !== undefined}
        />
        <main className="flex-1 overflow-auto">{children}</main>
        <footer className="flex h-8 items-center justify-between border-t border-zinc-800 bg-zinc-900 px-3 text-[11px] text-zinc-500">
          <span>Aethel Admin v2.0</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Last sync: {new Date().toLocaleTimeString()}</span>
        </footer>
      </div>
    </div>
  )
}
