/**
 * Storybook configuration (React + Vite component lab).
 *
 * This file is the single source of truth for:
 *   - Which stories Storybook picks up.
 *   - Which addons are enabled (a11y, interactions, links).
 *   - The framework preset (React + Vite).
 *
 * Activation
 * ----------
 *   npm -D i @storybook/react @storybook/react-vite @storybook/addon-essentials \
 *          @storybook/addon-a11y @storybook/addon-interactions storybook
 *   npx storybook dev -p 6006
 *
 * The design-system, collaboration and common UI primitives already publish
 * stories adjacent to their source files (`*.stories.tsx`). The glob below
 * keeps Storybook colocated with the component code so contributions don't
 * drift into a parallel tree.
 */

import { resolve } from 'path'
import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  stories: [
    '../components/**/*.stories.@(ts|tsx|mdx)',
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
    '@storybook/addon-interactions',
    '@storybook/addon-links',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
  },
  viteFinal: async (config) => {
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': resolve(__dirname, '..'),
    }

    return config
  },
}

export default config
