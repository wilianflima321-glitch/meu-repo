import type { Meta, StoryObj } from '@storybook/react'

import { AgentCard } from './AgentCard'
import type { AgentFleetMemberSnapshot } from './types'

const readyMember: AgentFleetMemberSnapshot = {
  agent: 'Architect',
  role: 'senior-coordinator',
  lane: 'Workspace blueprint and approval gates',
  status: 'ready',
  ownedSurfaceCount: 6,
  activeLockCount: 2,
  lockedSurfacePreview: ['preview', 'editor'],
  staleSurfaceCount: 0,
  staleSurfacePreview: [],
  nextAction: 'Review the diff package before applying workspace changes.',
}

const meta: Meta<typeof AgentCard> = {
  title: 'Agents/AgentCard',
  component: AgentCard,
  tags: ['autodocs'],
  args: {
    member: readyMember,
  },
}

export default meta
type Story = StoryObj<typeof AgentCard>

export const Ready: Story = {}

export const Blocked: Story = {
  args: {
    member: {
      ...readyMember,
      agent: 'Browser Operator',
      lane: 'Research replay and source capture',
      status: 'blocked',
      activeLockCount: 0,
      staleSurfaceCount: 3,
      staleSurfacePreview: ['sources', 'artifact', 'final-answer'],
      nextAction: 'Attach browser replay receipts before marking the research answer complete.',
    },
  },
}

export const NeedsAttention: Story = {
  args: {
    member: {
      ...readyMember,
      agent: 'Runtime Reviewer',
      lane: 'Preview runtime and rollback evidence',
      status: 'attention',
      activeLockCount: 1,
      staleSurfaceCount: 1,
      nextAction: 'Confirm rollback evidence before publish.',
    },
  },
}
