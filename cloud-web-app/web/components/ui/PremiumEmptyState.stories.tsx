import type { Meta, StoryObj } from '@storybook/react'
import { PremiumEmptyState } from './PremiumEmptyState'

const meta: Meta<typeof PremiumEmptyState> = {
  title: 'UI/PremiumEmptyState',
  component: PremiumEmptyState,
  tags: ['autodocs'],
  args: {
    title: 'Start with a mission',
    description: 'Aethel works best when the first surface is a scoped mission with preview and evidence expectations.',
    action: { label: 'Create mission', onClick: () => undefined },
    secondaryAction: { label: 'Import repo', onClick: () => undefined },
  },
}

export default meta
type Story = StoryObj<typeof PremiumEmptyState>

export const MissionFirst: Story = {}
export const Compact: Story = { args: { compact: true } }
