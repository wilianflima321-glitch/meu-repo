import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'

import { AgentWindowTabs } from './AgentWindowTabs'

const meta: Meta<typeof AgentWindowTabs> = {
  title: 'Agents/AgentWindowTabs',
  component: AgentWindowTabs,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof AgentWindowTabs>

function InteractiveAgentWindowTabs() {
  const [activeView, setActiveView] = useState<'fleet' | 'navigation' | 'replay'>('fleet')

  return (
    <div className="w-[560px] overflow-hidden rounded-2xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)]">
      <AgentWindowTabs
        activeView={activeView}
        setActiveView={setActiveView}
        focusClass="focus:outline-none focus:ring-2 focus:ring-[var(--aethel-border-focus)]"
      />
      <div className="p-4 text-sm text-[var(--aethel-text-secondary)]">
        Active view: <span className="font-semibold text-[var(--aethel-text-primary)]">{activeView}</span>
      </div>
    </div>
  )
}

export const Interactive: Story = {
  render: () => <InteractiveAgentWindowTabs />,
}
