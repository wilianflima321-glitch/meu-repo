/**
 * Tests for ThemeToggle.
 *
 * We stub the ThemeContext to avoid pulling in Monaco theme loading logic;
 * the test focuses on the toggle's contract:
 *
 *   - renders a button with an accessible label reflecting the current theme;
 *   - `aria-pressed` mirrors the "is light" state;
 *   - clicking swaps between dark-plus and light-plus theme ids.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const setTheme = vi.fn()

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    themeType: (globalThis as any).__themeType ?? 'dark',
    setTheme,
  }),
}))

import { ThemeToggle } from '../components/ui/ThemeToggle'

describe('ThemeToggle', () => {
  beforeEach(() => {
    setTheme.mockReset()
  })

  it('announces switch-to-light when the current theme is dark', () => {
    ;(globalThis as any).__themeType = 'dark'
    render(<ThemeToggle />)
    const btn = screen.getByTestId('theme-toggle')
    expect(btn.getAttribute('aria-label')).toBe('Switch to light theme')
    expect(btn.getAttribute('aria-pressed')).toBe('false')
  })

  it('announces switch-to-dark when the current theme is light', () => {
    ;(globalThis as any).__themeType = 'light'
    render(<ThemeToggle />)
    const btn = screen.getByTestId('theme-toggle')
    expect(btn.getAttribute('aria-label')).toBe('Switch to dark theme')
    expect(btn.getAttribute('aria-pressed')).toBe('true')
  })

  it('calls setTheme("light-plus") when currently dark and clicked', () => {
    ;(globalThis as any).__themeType = 'dark'
    render(<ThemeToggle />)
    fireEvent.click(screen.getByTestId('theme-toggle'))
    expect(setTheme).toHaveBeenCalledWith('light-plus')
  })

  it('calls setTheme("dark-plus") when currently light and clicked', () => {
    ;(globalThis as any).__themeType = 'light'
    render(<ThemeToggle />)
    fireEvent.click(screen.getByTestId('theme-toggle'))
    expect(setTheme).toHaveBeenCalledWith('dark-plus')
  })
})
