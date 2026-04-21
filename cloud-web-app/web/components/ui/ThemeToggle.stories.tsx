/**
 * Storybook stories for ThemeToggle.
 *
 * The toggle is documented at product-surface scale so designers can review
 * both size variants, the dark/light announcement, and the focus ring against
 * the live Aethel tokens (data-theme on :root).
 *
 * We inject a minimal ThemeContext mock via the decorator so the stories run
 * without pulling Monaco/theme-loader cost; the decorator flips `data-theme`
 * on the document root so the global CSS variables shift accordingly — which
 * means the surrounding canvas recolours to match the theme the story claims.
 */

import type { Meta, StoryObj } from '@storybook/react'
import React, { useEffect, useState } from 'react'
import { ThemeToggle } from './ThemeToggle'

// Minimal stand-in for the real ThemeContext so stories don't pull Monaco.
const ThemeContextModule = require('@/contexts/ThemeContext') as {
  useTheme?: () => unknown
}

function withThemeRoot(initial: 'dark' | 'light') {
  return function Wrapper(Story: React.ComponentType) {
    const [themeType, setThemeType] = useState<'dark' | 'light'>(initial)

    useEffect(() => {
      document.documentElement.setAttribute('data-theme', themeType)
      return () => {
        document.documentElement.removeAttribute('data-theme')
      }
    }, [themeType])

    // Monkey-patch the exported hook for this render. Restored on unmount.
    const original = ThemeContextModule.useTheme
    ThemeContextModule.useTheme = () => ({
      themeType,
      setTheme: (id: string) => {
        setThemeType(id.startsWith('light') ? 'light' : 'dark')
      },
    })

    useEffect(() => {
      return () => {
        ThemeContextModule.useTheme = original
      }
    }, [original])

    return (
      <div
        style={{
          padding: '1.5rem',
          background: 'var(--aethel-surface-primary)',
          color: 'var(--aethel-text-primary)',
          minWidth: '200px',
          borderRadius: '0.75rem',
          border: '1px solid var(--aethel-border-primary)',
        }}
      >
        <Story />
      </div>
    )
  }
}

const meta: Meta<typeof ThemeToggle> = {
  title: 'UI/ThemeToggle',
  component: ThemeToggle,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Accessible toggle between the dark-plus and light-plus Aethel themes. ' +
          'Uses `aria-pressed` to announce state to screen readers and keeps a ' +
          'fixed 20x20 icon container so switching never causes layout shift.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof ThemeToggle>

export const DarkDefaultSmall: Story = {
  name: 'Dark (default) — size sm',
  decorators: [withThemeRoot('dark')],
  args: { size: 'sm' },
}

export const LightActiveSmall: Story = {
  name: 'Light (active) — size sm',
  decorators: [withThemeRoot('light')],
  args: { size: 'sm' },
}

export const DarkDefaultMedium: Story = {
  name: 'Dark — size md (settings panel)',
  decorators: [withThemeRoot('dark')],
  args: { size: 'md' },
}

export const LightActiveMedium: Story = {
  name: 'Light — size md (settings panel)',
  decorators: [withThemeRoot('light')],
  args: { size: 'md' },
}
