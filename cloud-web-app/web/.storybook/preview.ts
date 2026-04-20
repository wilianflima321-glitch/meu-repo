/**
 * Global Storybook preview — loads the same Tailwind + design-token CSS that
 * Next.js injects in production so components render identically in Storybook.
 *
 * The `backgrounds` parameter lets reviewers toggle between the dark (default)
 * and high-contrast light surfaces to catch contrast regressions early.
 */

import type { Preview } from '@storybook/react'
import '../app/globals.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'surface-primary',
      values: [
        { name: 'surface-primary', value: 'var(--aethel-surface-primary)' },
        { name: 'surface-secondary', value: 'var(--aethel-surface-secondary)' },
        { name: 'surface-contrast', value: 'var(--aethel-surface-contrast)' },
      ],
    },
    a11y: {
      // axe-core options: run WCAG 2.1 AA + best-practice rules
      config: {
        rules: [{ id: 'color-contrast', enabled: true }],
      },
    },
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default preview
