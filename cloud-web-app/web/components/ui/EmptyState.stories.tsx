import type { Meta, StoryObj } from '@storybook/react'
import { EmptyState } from './EmptyState'

const meta: Meta<typeof EmptyState> = {
  title: 'UI/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  args: {
    title: 'No evidence yet',
    description: 'Run a validation step to attach screenshots, logs, and rollback notes.',
    action: { label: 'Run validation', onClick: () => undefined },
    secondaryAction: { label: 'Read contract', onClick: () => undefined },
  },
}

export default meta
type Story = StoryObj<typeof EmptyState>

export const EvidenceEmpty: Story = {}
export const Compact: Story = { args: { variant: 'compact' } }
