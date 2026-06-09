import type { Meta, StoryObj } from '@storybook/react'

import { PreviewRuntimeTrustNotice } from './PreviewRuntimeTrustNotice'

const meta: Meta<typeof PreviewRuntimeTrustNotice> = {
  title: 'Preview/PreviewRuntimeTrustNotice',
  component: PreviewRuntimeTrustNotice,
  tags: ['autodocs'],
  args: {
    previewRuntimeUrl: 'http://localhost:5173',
    runtimeHealth: { status: 'checking', reason: 'Runtime check is in progress.' },
    runtimeReadiness: {
      status: 'partial',
      strategy: 'local',
      recommendedAction: 'discover',
      blockers: ['Local runtime has not returned a fresh health receipt.'],
    },
    runtimePrimaryActionLabel: 'Check runtime',
    runtimeStrategyLabel: 'Local runtime',
    runtimeDiscoveryMessage: 'Aethel will continue with inline preview until the runtime is reachable.',
    forceInlinePreviewFallback: false,
    isSavingFile: false,
    density: 'default',
    artifactLabel: 'live',
  },
}

export default meta
type Story = StoryObj<typeof PreviewRuntimeTrustNotice>

export const Default: Story = {}

export const CompactFallback: Story = {
  args: {
    previewRuntimeUrl: null,
    runtimeHealth: { status: 'idle', reason: 'No live preview URL is configured.' },
    runtimeReadiness: {
      status: 'partial',
      strategy: 'inline',
      recommendedAction: 'inline',
      blockers: ['Live runtime URL is missing.'],
    },
    runtimePrimaryActionLabel: 'Use inline preview',
    runtimeStrategyLabel: 'Inline',
    runtimeDiscoveryMessage: 'Inline preview remains available while local/cloud runtime stays held.',
    forceInlinePreviewFallback: true,
    density: 'compact',
    artifactLabel: 'proposal',
  },
}

export const ReachablePartial: Story = {
  args: {
    runtimeHealth: { status: 'reachable', latencyMs: 82, httpStatus: 200 },
    runtimeReadiness: {
      status: 'partial',
      strategy: 'managed',
      recommendedAction: 'provision',
      blockers: ['Publish evidence has not been attached yet.'],
    },
    runtimePrimaryActionLabel: 'Attach evidence',
    runtimeStrategyLabel: 'Managed runtime',
  },
}
