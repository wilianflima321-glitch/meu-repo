'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
  Brain,
} from 'lucide-react'

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
  { title: 'Infrastructure', href: '/admin/infrastructure', icon: Server },
  { title: 'Moderation', href: '/admin/moderation', icon: Shield },
  { title: 'Analytics', href: '/admin/analytics', icon: TrendingUp },
  { title: 'Settings', href: '/admin/ide-settings', icon: Settings },
]

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
    <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 ${alert ? 'border-red-500/40 bg-red-500/10' : 'border-white/10 bg-white/[0.04]'}`}>
      <Icon className={`h-3.5 w-3.5 ${alert ? 'text-red-400' : 'text-zinc-300'}`} />
      <div>
        <p className="text-[10px] text-zinc-500">{label}</p>
        <p className={`text-xs font-semibold ${alert ? 'text-red-300' : 'text-zinc-100'}`}>{value}</p>
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
        className={`fixed left-0 top-0 z-50 h-full w-64 border-r border-white/10 bg-[linear-gradient(180deg,rgba(16,19,26,0.98),rgba(12,14,20,0.98))] shadow-[inset_-1px_0_0_rgba(255,255,255,0.03)] transition-transform duration-200 lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-12 items-center justify-between border-b border-white/10 px-3">
          <div className="flex items-center gap-2">
            <Image
              src="/branding/aethel-icon-source.png"
              alt="Aethel"
              width={28}
              height={28}
              className="rounded-lg border border-white/10 bg-white/[0.04] p-1"
            />
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
                className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors ${
                  isActive ? 'bg-[linear-gradient(135deg,rgba(79,70,229,0.35),rgba(14,165,233,0.2))] text-sky-200 border border-sky-400/25' : 'text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <item.icon className="h-3.5 w-3.5" />
                  {item.title}
                </span>
                {item.badge && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${item.badge === 'Live' ? 'bg-green-500/20 text-green-400' : 'bg-white/[0.06] text-zinc-400'}`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-3">
          <Link
            href="/admin/emergency"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-100 transition-colors hover:bg-red-500/25"
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
}) {
  return (
    <header className="flex h-12 items-center justify-between border-b border-white/10 bg-[linear-gradient(180deg,rgba(16,19,26,0.96),rgba(10,12,17,0.98))] px-3 shadow-[0_12px_32px_rgba(0,0,0,0.3)]">
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

      <div className="flex items-center gap-2">
        <button className="relative rounded-lg p-1.5 text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-500" />
        </button>
        <button className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100">
          <span>Admin</span>
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  )
}

export default function AdminOpsLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { data: statusData } = useSWR('/api/admin/status', { refreshInterval: 10000 })
  const { data: statsData } = useSWR('/api/admin/quick-stats', { refreshInterval: 30000 })

  const systemStatus = statusData?.status || null
  const quickStats = statsData?.stats || null

  return (
    <div className="admin-unified-theme density-compact flex min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)] [background-image:var(--aethel-app-background)]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-h-screen flex-1 flex-col">
        <Header onMenuClick={() => setSidebarOpen(true)} systemStatus={systemStatus} quickStats={quickStats} />
        <main className="flex-1 overflow-auto">{children}</main>
        <footer className="flex h-8 items-center justify-between border-t border-white/10 bg-[linear-gradient(180deg,rgba(13,16,22,0.96),rgba(10,12,17,0.98))] px-3 text-[11px] text-zinc-500">
          <span>Aethel Admin v2.0</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Last sync: {new Date().toLocaleTimeString()}</span>
        </footer>
      </div>
    </div>
  )
}
