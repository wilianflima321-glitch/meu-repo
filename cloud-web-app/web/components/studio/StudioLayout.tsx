/**
 * StudioLayout - Shared layout for all studio surfaces
 * Eliminates duplicate Shell/Header patterns across /billing, /settings, /profile, etc.
 * Provides consistent navigation, spacing, and responsive behavior.
 */

'use client'

import type { ReactNode } from 'react'
import StudioGlobalNav from './StudioGlobalNav'

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
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full'
  /** Add padding to content area (default: true) */
  padded?: boolean
}

const MAX_WIDTH_CLASSES: Record<string, string> = {
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

export default function StudioLayout({
  title,
  subtitle,
  actions,
  children,
  className = '',
  maxWidth = '7xl',
  padded = true,
}: StudioLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-lg focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-white focus:outline-none"
      >
        Skip to main content
      </a>

      <StudioGlobalNav
        title={title}
        subtitle={subtitle}
        rightSlot={actions}
      />

      <main
        id="main-content"
        className={`mx-auto ${MAX_WIDTH_CLASSES[maxWidth] || 'max-w-7xl'} ${
          padded ? 'px-4 py-6 sm:px-6 lg:px-8' : ''
        } ${className}`}
      >
        {children}
      </main>
    </div>
  )
}
