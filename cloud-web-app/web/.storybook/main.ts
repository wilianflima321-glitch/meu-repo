/**
 * Storybook configuration (Next.js + Vite builder).
 *
 * This file is the single source of truth for:
 *   - Which stories Storybook picks up.
 *   - Which addons are enabled (a11y, interactions, links).
 *   - The framework preset (Next.js).
 *
 * Activation
 * ----------
 *   npm -D i @storybook/react @storybook/nextjs @storybook/addon-essentials \
 *          @storybook/addon-a11y @storybook/addon-interactions storybook
 *   npx storybook dev -p 6006
 *
 * The design-system, collaboration and common UI primitives already publish
 * stories adjacent to their source files (`*.stories.tsx`). The glob below
 * keeps Storybook colocated with the component code so contributions don't
 * drift into a parallel tree.
 */

import type { StorybookConfig } from '@storybook/nextjs'

const config: StorybookConfig = {
  stories: [
    '../components/**/*.stories.@(ts|tsx|mdx)',
    '../hooks/**/*.stories.@(ts|tsx|mdx)',
    '../app/**/*.stories.@(ts|tsx|mdx)',
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
    '@storybook/addon-interactions',
    '@storybook/addon-links',
  ],
  framework: {
    name: '@storybook/nextjs',
    options: {
      nextConfigPath: '../next.config.js',
    },
  },
  docs: {
    autodocs: 'tag',
  },
  staticDirs: ['../public'],
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
  },
}

export default config
