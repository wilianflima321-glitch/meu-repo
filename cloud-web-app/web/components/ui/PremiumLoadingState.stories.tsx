/**
 * PremiumLoadingState.stories.tsx — V31 Wave B (bonus)
 *
 * All 5 variants of the loading state component.
 * Reference for what to use in each context:
 *
 *   route   → Suspense fallback on full-page routes
 *   splash  → IDE/Studio cold start (4-8s wait)
 *   data    → Panel-local data fetch (SWR loading)
 *   inline  → Button loading state
 *   skeleton→ List/table placeholder rows
 */

import type { Meta, StoryObj } from '@storybook/react'
import PremiumLoadingState from './PremiumLoadingState'

const meta = {
  title: 'UI/PremiumLoadingState',
  component: PremiumLoadingState,
  parameters: {
    docs: {
      description: {
        component: `
**PremiumLoadingState** — V31 unified loading component.

Replaces all ad-hoc \`<div>Carregando...</div>\` patterns.

| Variant   | Use when |
|-----------|----------|
| route     | \`<Suspense fallback>\` on a full-page route |
| splash    | IDE / Studio cold start (loading Monaco, Three, etc.) |
| data      | SWR \`isLoading\` inside a panel or card |
| inline    | Button or chip loading state |
| skeleton  | Table / list placeholder before data arrives |
        `.trim(),
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof PremiumLoadingState>

export default meta
type Story = StoryObj<typeof meta>

export const Route: Story = {
  name: 'route — full-page Suspense fallback',
  args: { variant: 'route', label: 'Loading workspace' },
  parameters: { layout: 'fullscreen' },
}

export const Splash: Story = {
  name: 'splash — IDE cold start with progress',
  args: {
    variant: 'splash',
    label: 'Loading IDE',
    showProgress: true,
    estimatedMs: 5000,
  },
  parameters: { layout: 'fullscreen' },
}

export const Data: Story = {
  name: 'data — panel-local fetch',
  args: { variant: 'data', label: 'Fetching agents' },
  decorators: [
    (Story) => (
      <div className="h-[300px] w-[400px] rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950 flex items-center justify-center">
        <Story />
      </div>
    ),
  ],
}

export const Inline: Story = {
  name: 'inline — button or chip',
  args: { variant: 'inline', label: 'Saving' },
  decorators: [
    (Story) => (
      <div className="p-6 flex items-center gap-4">
        <button
          disabled
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white opacity-80"
        >
          <Story />
        </button>
      </div>
    ),
  ],
}

export const Skeleton: Story = {
  name: 'skeleton — list placeholder',
  args: { variant: 'skeleton', rows: 5 },
  decorators: [
    (Story) => (
      <div className="w-[400px] rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950 p-5">
        <Story />
      </div>
    ),
  ],
}
