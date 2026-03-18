/**
 * Mobile Responsive Layout Components
 * Provides responsive shells for dashboard, landing, and IDE entry surfaces.
 * Ensures WCAG 2.2 AA compliance with touch targets >= 44px and readable text.
 */

'use client'

import { useState, useCallback, useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Code,
  MessageSquare,
  Settings,
  Search,
  Menu,
  X,
  ChevronRight,
  LayoutDashboard,
  Zap,
  CreditCard,
  Users,
  HelpCircle,
} from 'lucide-react'

// ============================================================================
// MOBILE BOTTOM NAVIGATION
// ============================================================================

interface MobileNavItem {
  href: string
  label: string
  icon: React.ElementType
  matchPaths?: string[]
}

const DEFAULT_NAV_ITEMS: MobileNavItem[] = [
  { href: '/dashboard', label: 'Inicio', icon: Home, matchPaths: ['/dashboard'] },
  { href: '/ide', label: 'IDE', icon: Code, matchPaths: ['/ide'] },
  { href: '/dashboard?tab=ai-chat', label: 'Chat', icon: MessageSquare, matchPaths: [] },
  { href: '/search', label: 'Busca', icon: Search, matchPaths: ['/search'] },
  { href: '/settings', label: 'Ajustes', icon: Settings, matchPaths: ['/settings'] },
]

export function MobileBottomNav({
  items = DEFAULT_NAV_ITEMS,
}: {
  items?: MobileNavItem[]
}) {
  const pathname = usePathname()

  const isActive = useCallback(
    (item: MobileNavItem) => {
      if (item.href === pathname) return true
      return item.matchPaths?.some((p) => pathname?.startsWith(p)) ?? false
    },
    [pathname]
  )

  return (
    <nav
      className="mobile-bottom-nav"
      role="navigation"
      aria-label="Navegacao mobile"
    >
      {items.map((item) => {
        const Icon = item.icon
        const active = isActive(item)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`mobile-bottom-nav-item ${active ? 'active' : ''}`}
            aria-current={active ? 'page' : undefined}
            aria-label={item.label}
          >
            <Icon size={20} aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

// ============================================================================
// RESPONSIVE CONTAINER
// ============================================================================

interface ResponsiveContainerProps {
  children: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  padding?: boolean
  className?: string
}

const MAX_WIDTH_MAP = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-[1400px]',
  full: 'max-w-full',
}

export function ResponsiveContainer({
  children,
  maxWidth = 'xl',
  padding = true,
  className = '',
}: ResponsiveContainerProps) {
  return (
    <div
      className={`mx-auto w-full ${MAX_WIDTH_MAP[maxWidth]} ${
        padding ? 'px-4 sm:px-6 lg:px-8' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}

// ============================================================================
// RESPONSIVE SIDEBAR OVERLAY (for mobile drawer pattern)
// ============================================================================

interface MobileSidebarProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  side?: 'left' | 'right'
  title?: string
}

export function MobileSidebarOverlay({
  isOpen,
  onClose,
  children,
  side = 'left',
  title,
}: MobileSidebarProps) {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[1050] flex"
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Menu lateral'}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`relative z-10 flex h-full w-[min(85vw,360px)] flex-col bg-[var(--aethel-surface-secondary)] shadow-2xl ${
          side === 'right' ? 'ml-auto' : 'mr-auto'
        }`}
        style={{
          animation: `aethel-slide-in-${side === 'right' ? 'right' : 'left'} 200ms ease-out`,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] px-4 py-3">
          {title && (
            <h2 className="text-sm font-semibold text-[var(--aethel-text-primary)]">
              {title}
            </h2>
          )}
          <button
            onClick={onClose}
            className="ml-auto flex h-10 w-10 items-center justify-center rounded-lg text-[var(--aethel-text-tertiary)] transition-colors hover:bg-white/10 hover:text-[var(--aethel-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aethel-primary)]"
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4">
          {children}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// RESPONSIVE GRID
// ============================================================================

interface ResponsiveGridProps {
  children: ReactNode
  cols?: {
    mobile?: number
    tablet?: number
    desktop?: number
  }
  gap?: string
  className?: string
}

export function ResponsiveGrid({
  children,
  cols = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 'gap-4 sm:gap-6',
  className = '',
}: ResponsiveGridProps) {
  const gridCols = [
    cols.mobile === 1 ? 'grid-cols-1' : `grid-cols-${cols.mobile}`,
    cols.tablet ? `sm:grid-cols-${cols.tablet}` : '',
    cols.desktop ? `lg:grid-cols-${cols.desktop}` : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={`grid ${gridCols} ${gap} ${className}`}>
      {children}
    </div>
  )
}

// ============================================================================
// RESPONSIVE PAGE HEADER
// ============================================================================

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  breadcrumbs?: Array<{ label: string; href?: string }>
  backHref?: string
}

export function ResponsivePageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  backHref,
}: PageHeaderProps) {
  return (
    <header className="mb-6 space-y-2 sm:mb-8">
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Trilha de navegacao" className="mb-2">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-[var(--aethel-text-tertiary)] sm:text-sm">
            {breadcrumbs.map((crumb, i) => (
              <li key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={12} aria-hidden="true" />}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="hover:text-[var(--aethel-text-primary)] transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-[var(--aethel-text-secondary)]">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* Title row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--aethel-text-primary)] sm:text-2xl lg:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-[var(--aethel-text-tertiary)] sm:text-base">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </header>
  )
}

// ============================================================================
// RESPONSIVE TABLE (horizontal scroll on mobile)
// ============================================================================

export function ResponsiveTable({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`-mx-4 overflow-x-auto sm:mx-0 ${className}`}>
      <div className="inline-block min-w-full align-middle">
        {children}
      </div>
    </div>
  )
}

// ============================================================================
// RESPONSIVE STACK (vertical on mobile, horizontal on desktop)
// ============================================================================

export function ResponsiveStack({
  children,
  gap = 'gap-4',
  breakpoint = 'sm',
  className = '',
}: {
  children: ReactNode
  gap?: string
  breakpoint?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const directionClass = {
    sm: 'flex-col sm:flex-row',
    md: 'flex-col md:flex-row',
    lg: 'flex-col lg:flex-row',
  }

  return (
    <div className={`flex ${directionClass[breakpoint]} ${gap} ${className}`}>
      {children}
    </div>
  )
}

// ============================================================================
// MOBILE HAMBURGER BUTTON
// ============================================================================

export function MobileMenuButton({
  isOpen,
  onClick,
  className = '',
}: {
  isOpen: boolean
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg text-[var(--aethel-text-secondary)] transition-colors hover:bg-white/10 hover:text-[var(--aethel-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aethel-primary)] md:hidden ${className}`}
      aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'}
      aria-expanded={isOpen}
    >
      {isOpen ? <X size={20} /> : <Menu size={20} />}
    </button>
  )
}

// ============================================================================
// BREAKPOINT HOOK
// ============================================================================

type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide'

export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop')

  useEffect(() => {
    const checkBreakpoint = () => {
      const width = window.innerWidth
      if (width < 640) setBreakpoint('mobile')
      else if (width < 1024) setBreakpoint('tablet')
      else if (width < 1440) setBreakpoint('desktop')
      else setBreakpoint('wide')
    }

    checkBreakpoint()
    window.addEventListener('resize', checkBreakpoint)
    return () => window.removeEventListener('resize', checkBreakpoint)
  }, [])

  return breakpoint
}
