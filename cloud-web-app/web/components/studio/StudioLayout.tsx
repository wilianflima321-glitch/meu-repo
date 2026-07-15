'use client';

/**
 * StudioLayout - Shared layout for all studio surfaces
 * Eliminates duplicate Shell/Header patterns across /billing, /settings, /profile, etc.
 * Provides consistent navigation, spacing, and responsive behavior.
 */
import type { ReactNode } from 'react'
import { Code, CreditCard, LayoutDashboard, MessageSquare, Settings } from 'lucide-react'
import StudioGlobalNav from './StudioGlobalNav'
import {
  MobileBottomNav,
  type MobileNavItem,
  type ResponsiveMaxWidth,
} from '@/components/ui/MobileResponsiveLayout'

interface StudioLayoutProps {
  /** Page title shown in the header */
  title: string
  /** Optional subtitle */
  subtitle?: string
  /** Optional right-side slot for actions */
  actions?: ReactNode
  /** Main page content */
  children: ReactNode
  /** Additional CSS classes for the content area */
  className?: string
  /** Max width constraint */
  maxWidth?: ResponsiveMaxWidth
  /** Add padding to content area (default: true) */
  padded?: boolean
  /** Hide global route rows when a child surface owns navigation */
  compactNav?: boolean
}

const STUDIO_MOBILE_NAV_ITEMS: MobileNavItem[] = [
  { href: '/dashboard', label: 'Mission', icon: LayoutDashboard, matchPaths: ['/dashboard'] },
  { href: '/ide', label: 'IDE', icon: Code, matchPaths: ['/ide'] },
  { href: '/nexus', label: 'Nexus', icon: MessageSquare, matchPaths: ['/nexus'] },
  { href: '/billing', label: 'Billing', icon: CreditCard, matchPaths: ['/billing'] },
  { href: '/settings', label: 'Settings', icon: Settings, matchPaths: ['/settings'] },
]

const STUDIO_MAX_WIDTH_CLASSES: Record<ResponsiveMaxWidth, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
}

function getStudioContentClassName(maxWidth: ResponsiveMaxWidth, padded: boolean, className: string) {
  return [
    'mx-auto has-mobile-nav',
    STUDIO_MAX_WIDTH_CLASSES[maxWidth],
    padded ? 'px-4 py-6 sm:px-6 lg:px-8' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')
}

export default function StudioLayout({
  title,
  subtitle,
  actions,
  children,
  className = '',
  maxWidth = '7xl',
  padded = true,
  compactNav = false,
}: StudioLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-lg focus:bg-[var(--aethel-primary-dark)] focus:px-4 focus:py-2 focus:text-[var(--aethel-text-primary)] focus:outline-none"
      >
        Skip to main content
      </a>

      <StudioGlobalNav
        title={title}
        subtitle={subtitle}
        rightSlot={actions}
        compact={compactNav}
      />

      <main
        id="main-content"
        className={getStudioContentClassName(maxWidth, padded, className)}
      >
        {children}
      </main>
      <MobileBottomNav items={STUDIO_MOBILE_NAV_ITEMS} />
    </div>
  )
}
