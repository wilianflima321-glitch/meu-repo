'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import useSWR from 'swr'
import {
  Activity,
  AlertTriangle,
  Bell,
  Brain,
  ChevronDown,
  ChevronRight,
  Clock,
  CreditCard,
  Home,
  LayoutDashboard,
  Menu,
  Server,
  Settings,
  Shield,
  TrendingUp,
  Users,
  X,
  Gauge,
  Flag,
  MessageSquare,
  Boxes,
  Package,
  FileText,
  Lock,
  Zap,
  Database,
} from 'lucide-react'
import { useBrowserPathname } from '@/lib/navigation/use-browser-pathname'
import { ADMIN_CONSOLIDATED_SECTIONS } from '@/lib/admin/admin-consolidation'
import { Badge } from '@/components/ui/Badge'
import StudioRuntimeProviders from '@/components/providers/StudioRuntimeProviders'

/* ==========================================================================
 * Admin Ops Layout — Unified with Studio Design Language
 * Source: docs/master/76_AUDITORIA_DEFINITIVA_BENCHMARK_2026-04-11.md
 * ========================================================================== */

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

/* ---------- Grouped Navigation (benchmark: Linear's tree navigation) ---------- */

interface NavGroup {
  label: string
  icon: React.ElementType
  items: { title: string; href: string; icon: React.ElementType; badge?: string }[]
}

const sectionIconById = {
  users: Users,
  billing: CreditCard,
  ops: Server,
  security: Shield,
  ai: Brain,
  marketplace: Boxes,
} satisfies Record<string, React.ElementType>

const routeIconByHref: Record<string, React.ElementType> = {
  '/admin/users': Users,
  '/admin/roles': Lock,
  '/admin/support': MessageSquare,
  '/admin/onboarding': Zap,
  '/admin/finance': TrendingUp,
  '/admin/payments': CreditCard,
  '/admin/subscriptions': CreditCard,
  '/admin/cost-optimization': Gauge,
  '/admin/monitoring': Activity,
  '/admin/infrastructure': Server,
  '/admin/deploy': Package,
  '/admin/emergency': AlertTriangle,
  '/admin/security': Lock,
  '/admin/audit-logs': FileText,
  '/admin/compliance': FileText,
  '/admin/rate-limiting': Gauge,
  '/admin/ai-monitor': Brain,
  '/admin/ai-agents': Boxes,
  '/admin/fine-tuning': Gauge,
  '/admin/indexing': Database,
  '/admin/marketplace': Boxes,
  '/admin/feature-flags': Flag,
  '/admin/ide-settings': Settings,
  '/admin/apis': Package,
}

const navGroups: NavGroup[] = ADMIN_CONSOLIDATED_SECTIONS.map((section) => ({
  label: section.label,
  icon: sectionIconById[section.id],
  items: section.primaryLinks.map((link) => ({
    title: link.label,
    href: link.href,
    icon: routeIconByHref[link.href] || sectionIconById[section.id],
    badge: link.badge,
  })),
}))

/* ---------- Reusable Components ---------- */

function StatusDot({ status }: { status: 'healthy' | 'degraded' | 'down' }) {
  const color = status === 'healthy'
    ? 'bg-[var(--aethel-success)]'
    : status === 'degraded'
      ? 'bg-[var(--aethel-warning)]'
      : 'bg-[var(--aethel-error)]'
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${color} ${status !== 'healthy' ? 'animate-pulse' : ''}`}
      aria-label={`Status: ${status}`}
    />
  )
}

function QuickStatPill({
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
    <div
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors ${
        alert
          ? 'border-[var(--aethel-error)]/40 bg-[var(--aethel-error)]/10'
          : 'border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)]/40'
      }`}
    >
      <Icon className={`h-3.5 w-3.5 ${alert ? 'text-[var(--aethel-error)]' : 'text-[var(--aethel-text-tertiary)]'}`} />
      <div>
        <p className="text-[10px] text-[var(--aethel-text-tertiary)]">{label}</p>
        <p className={`font-semibold ${alert ? 'text-[var(--aethel-error-light)]' : 'text-[var(--aethel-text-primary)]'}`}>
          {value}
        </p>
      </div>
    </div>
  )
}

/* ---------- Collapsible Sidebar Group ---------- */

function NavGroupSection({ group, isCollapsed }: { group: NavGroup; isCollapsed?: boolean }) {
  const pathname = useBrowserPathname()
  const hasActiveChild = group.items.some((item) => pathname === item.href)
  const [open, setOpen] = useState(hasActiveChild)

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--aethel-text-tertiary)] transition-colors hover:text-[var(--aethel-text-secondary)]"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <group.icon className="h-3 w-3" />
          {!isCollapsed && group.label}
        </span>
        {!isCollapsed && (
          <ChevronRight
            className={`h-3 w-3 transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
          />
        )}
      </button>
      {open && !isCollapsed && (
        <nav className="ml-3 space-y-0.5 border-l border-[var(--aethel-border-subtle)] pl-2 mt-0.5">
          {group.items.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-all duration-150 ${
                  isActive
                    ? 'bg-[var(--aethel-primary)]/15 text-[var(--aethel-info-light)] border border-[var(--aethel-primary)]/25'
                    : 'text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-primary)]'
                }`}
              >
                <span className="flex items-center gap-2">
                  <item.icon className="h-3.5 w-3.5" />
                  {item.title}
                </span>
                {item.badge && (
                  <Badge variant={item.badge === 'Ao vivo' ? 'success' : 'secondary'} size="sm">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            )
          })}
        </nav>
      )}
    </div>
  )
}

/* ---------- Sidebar ---------- */

function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-[color-mix(in_srgb,var(--aethel-surface-primary)_50%,transparent)] backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] transition-transform duration-200 lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="navigation"
        aria-label="Navegação administrativa"
      >
        {/* Header */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--aethel-border-subtle)] px-3">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <Image
              src="/branding/aethel-icon-source.png"
              alt="Aethel"
              width={28}
              height={28}
              className="rounded-lg border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] p-1"
            />
            <div>
              <p className="text-xs font-semibold text-[var(--aethel-text-primary)] group-hover:text-[var(--aethel-info)]">
                Aethel Admin
              </p>
              <p className="text-[10px] text-[var(--aethel-text-tertiary)]">Operações</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--aethel-text-tertiary)] hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-secondary)] lg:hidden"
            aria-label="Fechar menu lateral"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Back to Studio */}
        <div className="px-2 pt-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-primary)]"
          >
            <Home className="h-3.5 w-3.5" />
            ← Voltar ao Studio
          </Link>
        </div>

        {/* Navigation Groups */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {navGroups.map((group) => (
            <NavGroupSection key={group.label} group={group} />
          ))}
        </div>

        {/* Emergency Action */}
        <div className="shrink-0 border-t border-[var(--aethel-border-subtle)] p-3">
          <Link
            href="/admin/emergency"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--aethel-error)]/40 bg-[var(--aethel-error)]/15 px-3 py-2 text-xs font-semibold text-[var(--aethel-error-light)] transition-colors hover:bg-[var(--aethel-error)]/25"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Modo de emergência
          </Link>
        </div>
      </aside>
    </>
  )
}

/* ---------- Header ---------- */

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
    <header
      className="flex h-12 items-center justify-between border-b border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] px-4"
      role="banner"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-1.5 text-[var(--aethel-text-tertiary)] hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-secondary)] lg:hidden"
          aria-label="Abrir menu lateral"
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* Breadcrumb placeholder */}
        <nav className="hidden text-xs text-[var(--aethel-text-tertiary)] md:flex items-center gap-1" aria-label="Breadcrumb">
          <span>Admin</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-[var(--aethel-text-secondary)]">Dashboard</span>
        </nav>

        {systemStatus && (
          <div className="hidden items-center gap-3 text-[11px] lg:flex ml-4 border-l border-[var(--aethel-border-subtle)] pl-4">
            <span className="flex items-center gap-1.5 text-[var(--aethel-text-tertiary)]"><StatusDot status={systemStatus.api} /> API</span>
            <span className="flex items-center gap-1.5 text-[var(--aethel-text-tertiary)]"><StatusDot status={systemStatus.database} /> DB</span>
            <span className="flex items-center gap-1.5 text-[var(--aethel-text-tertiary)]"><StatusDot status={systemStatus.redis} /> Redis</span>
            <span className="flex items-center gap-1.5 text-[var(--aethel-text-tertiary)]"><StatusDot status={systemStatus.ai} /> AI</span>
          </div>
        )}
      </div>

      {quickStats && (
        <div className="hidden items-center gap-2 lg:flex">
          <QuickStatPill icon={Users} label="Online" value={quickStats.activeUsers} />
          <QuickStatPill icon={Activity} label="Req/min" value={quickStats.requestsPerMinute} />
          <QuickStatPill
            icon={CreditCard}
            label="Custo IA hoje"
            value={`$${quickStats.aiCostToday.toFixed(2)}`}
            alert={quickStats.aiCostToday > 50}
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="relative rounded-lg p-1.5 text-[var(--aethel-text-tertiary)] hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-secondary)]"
          aria-label="Notificações"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[var(--aethel-error)]" />
        </button>
      </div>
    </header>
  )
}

/* ---------- Main Layout ---------- */

export default function AdminOpsLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { data: statusData } = useSWR('/api/admin/status', { refreshInterval: 10000 })
  const { data: statsData } = useSWR('/api/admin/quick-stats', { refreshInterval: 30000 })

  const systemStatus = statusData?.status || null
  const quickStats = statsData?.stats || null

  return (
    <StudioRuntimeProviders surface="light">
      <div className="flex min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex min-h-screen flex-1 flex-col">
          <Header
            onMenuClick={() => setSidebarOpen(true)}
            systemStatus={systemStatus}
            quickStats={quickStats}
          />
          <main className="flex-1 overflow-auto p-6">{children}</main>
          <footer className="flex h-8 shrink-0 items-center justify-between border-t border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] px-4 text-[11px] text-[var(--aethel-text-tertiary)]">
            <span>Aethel Admin v2.1</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Última sincronização: {new Date().toLocaleTimeString('pt-BR')}
            </span>
          </footer>
        </div>
      </div>
    </StudioRuntimeProviders>
  )
}
