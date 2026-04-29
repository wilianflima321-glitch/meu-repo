import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import PreviewRuntimeToolbar from '@/components/ide/PreviewRuntimeToolbar'

const baseProps = {
  previewRuntimeUrl: 'http://localhost:3000',
  runtimeHealthStatus: 'reachable' as const,
  runtimeHealthLatencyMs: 22,
  runtimeHealthCheckedAt: new Date('2026-04-29T10:00:00.000Z'),
  runtimeHealthHint: 'Runtime saudavel',
  runtimeReadiness: { status: 'ready' as const },
  runtimeStrategyLabel: 'sandbox gerenciado',
  runtimeStrategyHint: 'Mantem parity forte',
  runtimePrimaryAction: 'provision' as const,
  runtimePrimaryActionLabel: 'Provisionar runtime',
  showRuntimeSettings: false,
  previewRuntimeInput: '',
  onToggleSettings: vi.fn(),
  onRuntimeInputChange: vi.fn(),
  onApplyRuntime: vi.fn(),
  onUseFallback: vi.fn(),
  onRevalidate: vi.fn(),
  onOpenRuntime: vi.fn(),
  onDiscoverRuntime: vi.fn(),
  onProvisionRuntime: vi.fn(),
  onSyncRuntime: vi.fn(),
  onRunRecommendedAction: vi.fn(),
  isDiscoveringRuntime: false,
  isProvisioningRuntime: false,
  isSyncingRuntime: false,
  canSyncRuntime: true,
  runtimeDiscoveryMessage: null,
  runtimeDiscoveryTone: 'info' as const,
  deployReadiness: { canDeploy: true },
  deployStatus: 'ready' as const,
  deployStatusHref: 'https://status.example.com',
  deployUrl: 'https://deploy.example.com',
  deployFeedback: null,
  reviewTarget: {
    kind: 'review_ready_public' as const,
    href: 'https://deploy.example.com',
    label: 'Public deploy',
    summary: 'Deploy publico pronto para revisar.',
    actionLabel: 'Copy review link',
  },
  isDeploySubmitting: false,
  isDeployRefreshing: false,
  onStartDeploy: vi.fn(),
  onRefreshDeploy: vi.fn(),
  onCopyShareLink: vi.fn(),
  onOpenDeployStatus: vi.fn(),
  onOpenDeploySite: vi.fn(),
}

describe('PreviewRuntimeToolbar', () => {
  it('keeps quick facts hidden until runtime settings are expanded', () => {
    const { rerender } = render(<PreviewRuntimeToolbar {...baseProps} />)

    expect(screen.queryByText('Estado do runtime')).not.toBeInTheDocument()
    expect(screen.getByText('Deploy trust')).toBeInTheDocument()

    rerender(<PreviewRuntimeToolbar {...baseProps} showRuntimeSettings />)

    expect(screen.getByText('Estado do runtime')).toBeInTheDocument()
    expect(screen.getByText('Estratégia de preview')).toBeInTheDocument()
    expect(screen.getByText('Próxima ação recomendada')).toBeInTheDocument()
  })
})
