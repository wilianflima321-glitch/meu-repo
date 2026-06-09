import type { Meta, StoryObj } from '@storybook/react'

import { AgentTrustStrip } from './AgentTrustStrip'

const meta: Meta<typeof AgentTrustStrip> = {
  title: 'Agents/AgentTrustStrip',
  component: AgentTrustStrip,
  tags: ['autodocs'],
  args: {
    activeLockCount: 2,
    staleSurfaceCount: 0,
    latestReplayRun: {
      runId: 'run_browser_001',
      mission: 'Compare build tools and capture source receipts',
      status: 'available',
      updatedAt: '2026-06-07T12:00:00.000Z',
      stepCount: 18,
      timelineHash: 'sha256:7d1a4c9b8f0e2a11',
    },
  },
}

export default meta
type Story = StoryObj<typeof AgentTrustStrip>

export const HealthyReceipts: Story = {}

export const StaleReceipts: Story = {
  args: {
    activeLockCount: 0,
    staleSurfaceCount: 4,
    latestReplayRun: undefined,
  },
}
