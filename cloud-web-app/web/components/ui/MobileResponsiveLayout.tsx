'use client';

/**
 * Mobile Responsive Layout Components
 * Provides responsive shells for dashboard, landing, and IDE entry surfaces.
 * Ensures WCAG 2.2 AA compliance with touch targets >= 44px and readable text.
 */
import { useState, useCallback, useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import {
  Home,
  Code,
  MessageSquare,
  Settings,
  Search,
  Menu,
  X,
  ChevronRight,
  Smartphone,
} from 'lucide-react'
import { useBrowserPathname } from '@/lib/navigation/use-browser-pathname'

// ============================================================================
// MOBILE BOTTOM NAVIGATION
// ============================================================================

export interface MobileNavItem {
  href: string
  label: string
  icon: React.ElementType
  matchPaths?: string[]
}

const DEFAULT_NAV_ITEMS: MobileNavItem[] = [
  { href: '/dashboard', label: 'Home', icon: Home, matchPaths: ['/dashboard'] },
  { href: '/ide', label: 'IDE', icon: Code, matchPaths: ['/ide'] },
  { href: '/dashboard?tab=ai-chat', label: 'AI', icon: MessageSquare, matchPaths: [] },
  { href: '/search', label: 'Search', icon: Search, matchPaths: ['/search'] },
  { href: '/settings', label: 'Settings', icon: Settings, matchPaths: ['/settings'] },
]

export function MobileBottomNav({
  items = DEFAULT_NAV_ITEMS,
}: {
  items?: MobileNavItem[]
}) {
  const pathname = useBrowserPathname()
  const columnClass = items.length <= 3 ? 'grid-cols-3' : items.length === 4 ? 'grid-cols-4' : 'grid-cols-5'

  const isActive = useCallback(
    (item: MobileNavItem) => {
      if (item.href === pathname) return true
      return item.matchPaths?.some((p) => pathname?.startsWith(p)) ?? false
    },
    [pathname]
  )

  return (
    <nav
      className={joinClasses(
        'mobile-bottom-nav fixed inset-x-3 bottom-3 z-40 grid gap-1 rounded-[24px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_92%,transparent)] p-1 shadow-[0_18px_60px_rgba(var(--aethel-overlay-ink-rgb),0.42)] backdrop-blur-xl md:hidden',
        columnClass,
      )}
      role="navigation"
      aria-label="Mobile navigation"
    >
      {items.map((item) => {
        const Icon = item.icon
        const active = isActive(item)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`mobile-bottom-nav-item flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-[18px] px-1 py-1 text-[10px] font-semibold transition ${
              active
                ? 'active bg-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)] text-[var(--aethel-info-light)]'
                : 'text-[var(--aethel-text-tertiary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_52%,transparent)] hover:text-[var(--aethel-text-primary)]'
            }`}
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
  maxWidth?: ResponsiveMaxWidth
  padding?: boolean
  className?: string
}

export type ResponsiveMaxWidth = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full'

const MAX_WIDTH_MAP: Record<ResponsiveMaxWidth, string> = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-[1400px]',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
}

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function getResponsiveContainerClassName(
  maxWidth: ResponsiveMaxWidth = 'xl',
  padding = true,
  className = ''
) {
  return joinClasses(
    'mx-auto w-full',
    MAX_WIDTH_MAP[maxWidth],
    padding && 'px-4 sm:px-6 lg:px-8',
    className
  )
}

export function ResponsiveContainer({
  children,
  maxWidth = 'xl',
  padding = true,
  className = '',
}: ResponsiveContainerProps) {
  return (
    <div className={getResponsiveContainerClassName(maxWidth, padding, className)}>
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
  useEscapeToClose(isOpen, onClose)
  useBodyScrollLock(isOpen)

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
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)] backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={joinClasses(
          'relative z-10 flex h-full w-[min(85vw,360px)] flex-col bg-[var(--aethel-surface-secondary)] shadow-2xl',
          side === 'right' ? 'ml-auto' : 'mr-auto'
        )}
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
          <button type="button"
            onClick={onClose}
            className="ml-auto flex h-10 w-10 items-center justify-center rounded-lg text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] hover:text-[var(--aethel-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aethel-primary)]"
            aria-label="Close menu"
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
  const gridCols = joinClasses(
    cols.mobile === 1 ? 'grid-cols-1' : `grid-cols-${cols.mobile}`,
    cols.tablet ? `sm:grid-cols-${cols.tablet}` : undefined,
    cols.desktop ? `lg:grid-cols-${cols.desktop}` : undefined
  )

  return (
    <div className={joinClasses('grid', gridCols, gap, className)}>
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
// MOBILE CONTINUITY CARD
// ============================================================================

interface MobileContinuityCardProps {
  title: string
  description: string
  href: string
  ctaLabel?: string
  statusLabel?: string
}

export function MobileContinuityCard({
  title,
  description,
  href,
  ctaLabel = 'Continuar no mobile',
  statusLabel,
}: MobileContinuityCardProps) {
  return (
    <div
      className="rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_78%,transparent)] p-4"
      style={{ boxShadow: 'var(--aethel-shadow-md)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--aethel-text-primary)]">{title}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--aethel-text-secondary)]">{description}</p>
        </div>
        {statusLabel ? (
          <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-info-light)]">
            {statusLabel}
          </span>
        ) : null}
      </div>
      <Link
        href={href}
        aria-label={ctaLabel}
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--aethel-primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_16%,transparent)] px-4 py-2 text-sm font-medium text-[var(--aethel-text-primary)] transition hover:bg-[color-mix(in_srgb,var(--aethel-primary)_22%,transparent)]"
      >
        <Smartphone size={16} aria-hidden="true" />
        <span>{ctaLabel}</span>
        <ChevronRight size={16} aria-hidden="true" />
      </Link>
    </div>
  )
}

// ============================================================================
// RESPONSIVE TABLE (horizontal scroll on mobile)
// ============================================================================

export function ResponsiveTable({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={joinClasses('-mx-4 overflow-x-auto sm:mx-0', className)}>
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
  const directionClass: Record<'sm' | 'md' | 'lg', string> = {
    sm: 'flex-col sm:flex-row',
    md: 'flex-col md:flex-row',
    lg: 'flex-col lg:flex-row',
  }

  return (
    <div className={joinClasses('flex', directionClass[breakpoint], gap, className)}>
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
      className={joinClasses(
        'inline-flex h-10 w-10 items-center justify-center rounded-lg text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] hover:text-[var(--aethel-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aethel-primary)] md:hidden',
        className
      )}
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
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

function useEscapeToClose(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])
}

function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) {
      document.body.style.overflow = ''
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isLocked])
}

function getBreakpointFromWidth(width: number): Breakpoint {
  if (width < 640) return 'mobile'
  if (width < 1024) return 'tablet'
  if (width < 1440) return 'desktop'
  return 'wide'
}

export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() =>
    typeof window === 'undefined' ? 'desktop' : getBreakpointFromWidth(window.innerWidth)
  )

  useEffect(() => {
    const checkBreakpoint = () => setBreakpoint(getBreakpointFromWidth(window.innerWidth))
    window.addEventListener('resize', checkBreakpoint)
    return () => window.removeEventListener('resize', checkBreakpoint)
  }, [])

  return breakpoint
}
