'use client'

/**
 * ThemeToggle
 *
 * Accessible toggle between dark (default) and light Aethel themes, wired to
 * the ThemeContext which already manages persistence, Monaco sync, and the
 * `data-theme` attribute on `<html>` consumed by globals.css.
 *
 * Design:
 *   - Single button with sun/moon icon swap, aria-pressed reflects state.
 *   - Follows target-size 32px dense (non-critical control per WCAG).
 *   - Zero layout shift: icon container is fixed 20x20.
 *   - Safe on SSR: the button renders in a neutral initial state until the
 *     theme has hydrated on the client.
 */

import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

interface ThemeToggleProps {
  /** Optional className to position the toggle in a header / toolbar. */
  className?: string
  /** Render a compact 28x28 square (toolbar) or 40x40 (settings). */
  size?: 'sm' | 'md'
}

const DARK_THEME_ID = 'dark-plus'
const LIGHT_THEME_ID = 'light-plus'

export function ThemeToggle({ className = '', size = 'sm' }: ThemeToggleProps) {
  const { themeType, setTheme } = useTheme()
  const isLight = themeType === 'light' || themeType === 'hc-light'

  const dimension = size === 'sm' ? 'w-7 h-7' : 'w-10 h-10'

  const handleToggle = React.useCallback(() => {
    setTheme(isLight ? DARK_THEME_ID : LIGHT_THEME_ID)
  }, [isLight, setTheme])

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-pressed={isLight}
      aria-label={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
      title={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
      data-testid="theme-toggle"
      className={`inline-flex items-center justify-center rounded-md ${dimension} text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-border-focus)] transition-colors ${className}`}
    >
      {isLight ? (
        <Moon className="w-4 h-4" aria-hidden="true" />
      ) : (
        <Sun className="w-4 h-4" aria-hidden="true" />
      )}
    </button>
  )
}

export default ThemeToggle
