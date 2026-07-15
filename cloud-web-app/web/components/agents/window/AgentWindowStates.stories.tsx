import type { Meta, StoryObj } from '@storybook/react'

import { AgentWindowError, AgentWindowLoading, AgentWindowNoProject } from './AgentWindowStates'

const meta: Meta = {
  title: 'Agents/AgentWindowStates',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
}

export default meta
type Story = StoryObj

export const NoProject: Story = {
  render: () => (
    <div className="h-80 w-[420px] rounded-2xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)]">
      <AgentWindowNoProject />
    </div>
  ),
}

export const Loading: Story = {
  render: () => (
    <div className="h-80 w-[420px] rounded-2xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)]">
      <AgentWindowLoading />
    </div>
  ),
}

export const Error: Story = {
  render: () => (
    <div className="h-80 w-[420px] rounded-2xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)]">
      <AgentWindowError focusClass="focus:outline-none focus:ring-2 focus:ring-[var(--aethel-border-focus)]" onRetry={() => undefined} />
    </div>
  ),
}
