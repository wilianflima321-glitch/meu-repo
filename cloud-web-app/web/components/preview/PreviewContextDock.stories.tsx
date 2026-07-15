import type { Meta, StoryObj } from '@storybook/react'

import { PreviewContextDock } from './PreviewContextDock'

const meta: Meta<typeof PreviewContextDock> = {
  title: 'Preview/PreviewContextDock',
  component: PreviewContextDock,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    isInline: false,
    isInspecting: false,
    isStale: false,
    onInspect: () => undefined,
    onRefresh: () => undefined,
  },
}

export default meta
type Story = StoryObj<typeof PreviewContextDock>

export const RuntimeReady: Story = {
  render: (args) => (
    <div className="relative h-[360px] bg-[linear-gradient(135deg,var(--aethel-surface-primary),var(--aethel-surface-secondary))]">
      <PreviewContextDock {...args} />
    </div>
  ),
}

export const InlineStale: Story = {
  args: {
    isInline: true,
    isStale: true,
    isInspecting: true,
  },
  render: (args) => (
    <div className="relative h-[360px] bg-[linear-gradient(135deg,var(--aethel-surface-primary),var(--aethel-surface-secondary))]">
      <PreviewContextDock {...args} />
    </div>
  ),
}
