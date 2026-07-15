import type { Meta, StoryObj } from '@storybook/react'

import { StudioLocalRuntimeCapsule } from './StudioLocalRuntimeCapsule'

const meta: Meta<typeof StudioLocalRuntimeCapsule> = {
  title: 'Studio/StudioLocalRuntimeCapsule',
  component: StudioLocalRuntimeCapsule,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[520px] rounded-2xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] p-4">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof StudioLocalRuntimeCapsule>

export const CapabilityHeld: Story = {}
