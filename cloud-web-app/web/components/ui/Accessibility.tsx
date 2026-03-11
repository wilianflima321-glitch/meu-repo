'use client'

import { useEffect, useRef } from 'react'

/**
 * Accessibility utilities and skip-to-content for Aethel Engine.
 * Implements WCAG 2.1 AA requirements for keyboard navigation.
 */

/* ── Skip Links ── */
interface SkipLink {
  href: string
  label: string
}

const DEFAULT_SKIP_LINKS: SkipLink[] = [
  { href: '#main-content', label: 'Pular para conteudo principal' },
  { href: '#navigation', label: 'Pular para navegacao' },
]

export function SkipToContent({ links = DEFAULT_SKIP_LINKS }: { links?: SkipLink[] }) {
  return (
    <div className="sr-only focus-within:not-sr-only focus-within:fixed focus-within:left-4 focus-within:top-4 focus-within:z-[9999] focus-within:flex focus-within:flex-col focus-within:gap-2">
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg ring-2 ring-blue-400 ring-offset-2 ring-offset-black transition-colors focus:outline-none"
        >
          {link.label}
        </a>
      ))}
    </div>
  )
}

/* ── Focus Trap ── */
interface FocusTrapProps {
  active: boolean
  children: React.ReactNode
  restoreFocus?: boolean
  autoFocus?: boolean
}

export function FocusTrap({ active, children, restoreFocus = true, autoFocus = true }: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<Element | null>(null)

  useEffect(() => {
    if (!active) return

    if (restoreFocus) {
      previousFocusRef.current = document.activeElement
    }

    const container = containerRef.current
    if (!container) return

    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

    const getFocusableElements = () =>
      Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (el) => !el.hasAttribute('disabled') && el.offsetParent !== null
      )

    // Auto-focus first element
    if (autoFocus) {
      const firstFocusable = getFocusableElements()[0]
      if (firstFocusable) {
        requestAnimationFrame(() => firstFocusable.focus())
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const focusable = getFocusableElements()
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
      if (restoreFocus && previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus()
      }
    }
  }, [active, restoreFocus, autoFocus])

  return (
    <div ref={containerRef} role="dialog" aria-modal={active ? 'true' : undefined}>
      {children}
    </div>
  )
}

/* ── Live Region ── */
interface LiveRegionProps {
  message: string
  type?: 'polite' | 'assertive'
}

export function LiveRegion({ message, type = 'polite' }: LiveRegionProps) {
  return (
    <div className="sr-only" aria-live={type} aria-atomic="true" role={type === 'assertive' ? 'alert' : 'status'}>
      {message}
    </div>
  )
}

/* ── Visually Hidden ── */
export function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return <span className="sr-only">{children}</span>
}

/* ── Accessible Icon Button ── */
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  size?: 'sm' | 'md' | 'lg'
}

export function IconButton({ label, size = 'md', className = '', children, ...props }: IconButtonProps) {
  const sizeClasses = {
    sm: 'h-7 w-7',
    md: 'h-9 w-9',
    lg: 'h-11 w-11 min-h-[44px] min-w-[44px]',
  }

  return (
    <button
      type="button"
      aria-label={label}
      className={`inline-flex items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
      <VisuallyHidden>{label}</VisuallyHidden>
    </button>
  )
}
