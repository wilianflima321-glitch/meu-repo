/**
 * Aethel Accessibility Utilities
 * Source: docs/master/76_AUDITORIA_DEFINITIVA_BENCHMARK_2026-04-11.md
 * WCAG 2.2 AA compliance helpers
 */

/**
 * Focus trap for modals and dialogs
 */
export function trapFocus(element: HTMLElement) {
  const focusableElements = element.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )
  
  const firstFocusable = focusableElements[0]
  const lastFocusable = focusableElements[focusableElements.length - 1]
  
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Tab') return
    
    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        lastFocusable?.focus()
        e.preventDefault()
      }
    } else {
      if (document.activeElement === lastFocusable) {
        firstFocusable?.focus()
        e.preventDefault()
      }
    }
  }
  
  element.addEventListener('keydown', handleKeyDown)
  firstFocusable?.focus()
  
  return () => element.removeEventListener('keydown', handleKeyDown)
}

/**
 * Skip to main content link helper
 */
export function createSkipLink(): string {
  return 'sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:rounded-lg focus:bg-[var(--aethel-primary)] focus:px-4 focus:py-2 focus:text-white focus:outline-none'
}

/**
 * Screen reader only text
 */
export const SR_ONLY = 'sr-only' as const

/**
 * Announce to screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const el = document.createElement('div')
  el.setAttribute('role', 'status')
  el.setAttribute('aria-live', priority)
  el.setAttribute('aria-atomic', 'true')
  el.className = 'sr-only'
  el.textContent = message
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 3000)
}

/**
 * Keyboard shortcut handler
 */
export function createKeyboardShortcut(
  shortcuts: Record<string, () => void>
): (e: KeyboardEvent) => void {
  return (e: KeyboardEvent) => {
    const key = [
      e.ctrlKey || e.metaKey ? 'mod' : '',
      e.shiftKey ? 'shift' : '',
      e.altKey ? 'alt' : '',
      e.key.toLowerCase(),
    ].filter(Boolean).join('+')
    
    const handler = shortcuts[key]
    if (handler) {
      e.preventDefault()
      handler()
    }
  }
}

/**
 * Minimum touch target size (WCAG 2.2 Target Size)
 */
export const MIN_TARGET_SIZE = {
  default: 'min-h-[44px] min-w-[44px]',
  dense: 'min-h-[32px] min-w-[32px]',
} as const

/**
 * Reduced motion check
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * High contrast check
 */
export function prefersHighContrast(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-contrast: high)').matches
}
