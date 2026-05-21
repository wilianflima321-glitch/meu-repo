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
import {
  ADMIN_CONSOLIDATED_SECTIONS,
  type AdminEvidenceStatus,
  type AdminRouteRiskLane,
  findAdminSectionForRoute,
  getAdminRouteCoverage,
  getAdminRouteLabel,
} from '@/lib/admin/admin-consolidation'
import { Badge } from '@/components/ui/Badge'
import StudioRuntimeProviders from '@/components/providers/StudioRuntimeProviders'

/* ==========================================================================
 * Admin Ops Layout - Unified with Studio Design Language
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
  href: string
  description: string
  owner: string
  intent: string
  riskLane: AdminRouteRiskLane
  evidenceStatus: AdminEvidenceStatus
  routeCount: number
  icon: React.ElementType
  items: { title: string; href: string; icon: React.ElementType; badge?: string }[]
  primaryItems: { title: string; href: string; icon: React.ElementType; badge?: string }[]
  legacyItems: { title: string; href: string; icon: React.ElementType; badge?: string }[]
}

const sectionIconById = {
  people: Users,
  money: CreditCard,
  ai: Brain,
  platform: Server,
  trust: Shield,
  product: Boxes,
} satisfies Record<string, React.ElementType>

const routeIconByHref: Record<string, React.ElementType> = {
  '/admin/people': Users,
  '/admin/users': Users,
  '/admin/roles': Lock,
  '/admin/support': MessageSquare,
  '/admin/feedback': MessageSquare,
  '/admin/onboarding': Zap,
  '/admin/money': CreditCard,
  '/admin/finance': TrendingUp,
  '/admin/payments': CreditCard,
  '/admin/subscriptions': CreditCard,
  '/admin/cost-optimization': Gauge,
  '/admin/arpu-churn': TrendingUp,
  '/admin/promotions': CreditCard,
  '/admin/platform': Server,
  '/admin/monitoring': Activity,
  '/admin/infrastructure': Server,
  '/admin/deploy': Package,
  '/admin/emergency': AlertTriangle,
  '/admin/backup': Database,
  '/admin/scalability': Gauge,
  '/admin/updates': Package,
  '/admin/real-time': Activity,
  '/admin/trust': Shield,
  '/admin/security': Lock,
  '/admin/audit-logs': FileText,
  '/admin/compliance': FileText,
  '/admin/rate-limiting': Gauge,
  '/admin/moderation': Shield,
  '/admin/ip-registry': Shield,
  '/admin/god-view': Gauge,
  '/admin/ai': Brain,
  '/admin/ai-monitor': Brain,
  '/admin/ai-agents': Boxes,
  '/admin/ai-training': Gauge,
  '/admin/fine-tuning': Gauge,
  '/admin/indexing': Database,
  '/admin/ai-enhancements': Brain,
  '/admin/ai-upgrades': Brain,
  '/admin/bias-detection': Shield,
  '/admin/automation': Zap,
  '/admin/product': LayoutDashboard,
  '/admin/marketplace': Boxes,
  '/admin/feature-flags': Flag,
  '/admin/ide-settings': Settings,
  '/admin/apis': Package,
  '/admin/collaboration': MessageSquare,
  '/admin/chat': MessageSquare,
  '/admin/multi-tenancy': Users,
  '/admin/notifications': Bell,
}

const navGroups: NavGroup[] = ADMIN_CONSOLIDATED_SECTIONS.map((section) => ({
  label: section.label,
  href: section.href,
  description: section.operatorQuestion,
  owner: section.owner,
  intent: section.intent,
  riskLane: section.riskLane,
  evidenceStatus: section.evidenceStatus,
  routeCount: section.routes.length,
  icon: sectionIconById[section.id],
  items: section.routes.map((route) => ({
    title: getAdminRouteLabel(route),
    href: route,
    icon: routeIconByHref[route] || sectionIconById[section.id],
    badge: section.primaryLinks.find((link) => link.href === route)?.badge,
  })),
  primaryItems: section.primaryLinks.map((link) => ({
    title: link.label,
    href: link.href,
    icon: routeIconByHref[link.href] || sectionIconById[section.id],
    badge: link.badge,
  })),
  legacyItems: section.routes
    .filter((route) => route !== section.href && !section.primaryLinks.some((link) => link.href === route))
    .map((route) => ({
      title: getAdminRouteLabel(route),
      href: route,
      icon: routeIconByHref[route] || sectionIconById[section.id],
    })),
}))

const adminCoverage = getAdminRouteCoverage()

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
  const hasActiveChild = pathname === group.href || group.items.some((item) => pathname === item.href)
  const [open, setOpen] = useState(hasActiveChild)
  const activeLegacyItem = group.legacyItems.find((item) => pathname === item.href)

  return (
    <div className="mb-1">
      <div
        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wider transition-colors ${
          hasActiveChild
            ? 'bg-[var(--aethel-primary)]/10 text-[var(--aethel-info-light)]'
            : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
        }`}
      >
        <Link href={group.href} className="flex min-w-0 items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus-ring)]">
          <group.icon className="h-3 w-3" />
          {!isCollapsed && group.label}
        </Link>
        {!isCollapsed && (
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="flex items-center gap-1.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus-ring)]"
            aria-expanded={open}
            aria-label={`${group.label}: ${group.description}`}
          >
            <span className="rounded-full border border-[var(--aethel-border-subtle)] px-1.5 py-0.5 text-[10px] normal-case tracking-normal text-[var(--aethel-text-tertiary)]">
              {group.primaryItems.length}
            </span>
            <ChevronRight
              className={`h-3 w-3 transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
            />
          </button>
        )}
      </div>
      {open && !isCollapsed && (
        <div className="ml-3 mt-1 rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_32%,transparent)] px-2.5 py-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-[var(--aethel-border-primary)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">
              {group.owner}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] ${
              group.riskLane === 'critical'
                ? 'border-[color-mix(in_srgb,var(--aethel-error)_36%,transparent)] text-[var(--aethel-error-light)]'
                : group.riskLane === 'high'
                  ? 'border-[color-mix(in_srgb,var(--aethel-warning)_36%,transparent)] text-[var(--aethel-warning-light)]'
                  : 'border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] text-[var(--aethel-info-light)]'
            }`}>
              {group.riskLane} risk
            </span>
            <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-success)_28%,transparent)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-success-light)]">
              {group.evidenceStatus}
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-4 text-[var(--aethel-text-tertiary)]">{group.intent}</p>
        </div>
      )}
      {open && !isCollapsed && (
        <nav className="ml-3 mt-1 space-y-0.5 border-l border-[var(--aethel-border-subtle)] pl-2">
          {group.primaryItems.map((item) => {
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
                  <Badge variant={item.badge === 'Live' ? 'success' : 'secondary'} size="sm">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            )
          })}
          {activeLegacyItem && (
            <Link
              href={activeLegacyItem.href}
              className="flex items-center justify-between rounded-lg border border-[var(--aethel-primary)]/20 bg-[var(--aethel-primary)]/10 px-2.5 py-1.5 text-xs text-[var(--aethel-info-light)]"
            >
              <span className="flex items-center gap-2">
                <activeLegacyItem.icon className="h-3.5 w-3.5" />
                {activeLegacyItem.title}
              </span>
              <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">Legacy</span>
            </Link>
          )}
          {group.legacyItems.length > 0 && (
            <details className="rounded-lg px-2 py-1" aria-label={`${group.label} Legacy compatibility map`}>
              <summary className="cursor-pointer text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
                <span className="sr-only">Legacy map</span>
                Compatibility routes
              </summary>
              <p className="mt-1 text-[10px] normal-case leading-4 tracking-normal text-[var(--aethel-text-quaternary)]">
                Older URLs remain available but stay secondary to the six operating areas.
              </p>
              <div className="mt-1 max-h-48 space-y-0.5 overflow-y-auto pr-1">
                {group.legacyItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2 rounded-md px-2 py-1 text-[11px] text-[var(--aethel-text-tertiary)] hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-primary)]"
                  >
                    <item.icon className="h-3 w-3" />
                    {item.title}
                  </Link>
                ))}
              </div>
            </details>
          )}
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
        aria-label="Admin navigation"
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
              <p className="text-[10px] text-[var(--aethel-text-tertiary)]">Operations</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--aethel-text-tertiary)] hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-secondary)] lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Back to Studio */}
        <div className="px-2 pt-2">
          <Link
            href="/admin"
            className="mb-1 flex items-center justify-between rounded-lg border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)]/45 px-2.5 py-2 text-xs text-[var(--aethel-text-secondary)] transition-colors hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-primary)]"
          >
            <span className="flex items-center gap-2">
              <LayoutDashboard className="h-3.5 w-3.5" />
              Command center
            </span>
            <span className="text-[10px] text-[var(--aethel-text-tertiary)]">{adminCoverage.sections} areas</span>
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-primary)]"
          >
            <Home className="h-3.5 w-3.5" />
            Back to Studio
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
            Emergency mode
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

        <nav className="hidden text-xs text-[var(--aethel-text-tertiary)] md:flex items-center gap-1" aria-label="Breadcrumb">
          <span>Admin</span>
          <ChevronRight className="h-3 w-3" />
          {currentSection && (
            <>
              <span>{currentSection.label}</span>
              <ChevronRight className="h-3 w-3" />
            </>
          )}
          <span className="text-[var(--aethel-text-secondary)]">{currentLabel}</span>
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
            label="AI cost today"
            value={`$${quickStats.aiCostToday.toFixed(2)}`}
            alert={quickStats.aiCostToday > 50}
          />
        </div>
      )}

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
          <main id="admin-main-content" className="flex-1 overflow-auto p-6" tabIndex={-1}>{children}</main>
          <footer className="flex h-8 shrink-0 items-center justify-between border-t border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] px-4 text-[11px] text-[var(--aethel-text-tertiary)]">
            <span>Aethel Admin v2.1</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last sync: {new Date().toLocaleTimeString('en-US')}
            </span>
          </footer>
        </div>
      </div>
    </StudioRuntimeProviders>
  )
}
