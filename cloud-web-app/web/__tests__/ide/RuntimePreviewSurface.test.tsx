import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const { previewPanelSpy } = vi.hoisted(() => ({
  previewPanelSpy: vi.fn((props: any) => (
    <div
      data-testid="preview-panel"
      data-runtime-url={props.runtimeUrl ?? ''}
      data-inline={props.forceInlineFallback ? 'yes' : 'no'}
    />
  )),
}))

vi.mock('next/dynamic', () => ({
  default: () => previewPanelSpy,
}))

vi.mock('@/components/preview/useMagicWand', () => ({
  useMagicWand: () => ({
    magicWandState: { isOpen: false, position: null, elementInfo: null },
    openMagicWand: vi.fn(),
    closeMagicWand: vi.fn(),
    handleSendMessage: vi.fn(),
  }),
}))

vi.mock('@/components/preview/usePreviewRuntime', () => ({
  usePreviewRuntime: () => ({
    runtime: {
      state: 'idle',
      strategy: 'none',
      runtimeUrl: null,
      sandboxId: null,
      provider: null,
      startedAt: null,
      latencyMs: null,
      error: null,
      guidance: null,
      recommendedAction: null,
      setupEnv: [],
      hmrConnected: false,
      hmrState: 'idle',
      filesInSync: 0,
      lastSyncAt: null,
      lastHealthCheckAt: null,
      lastHealthyAt: null,
      failureCount: 0,
    },
    provision: vi.fn(),
    switchToInline: vi.fn(),
  }),
}))

import RuntimePreviewSurface from '@/components/preview/RuntimePreviewSurface'
import type { PreviewRuntimeInfo } from '@/components/preview/previewRuntime.types'

function createRuntimeOverride(overrides: Partial<PreviewRuntimeInfo> = {}): PreviewRuntimeInfo {
  return {
    state: 'healthy',
    strategy: 'iframe',
    runtimeUrl: 'http://localhost:3001',
    sandboxId: null,
    provider: null,
    startedAt: null,
    latencyMs: 42,
    error: null,
    guidance: null,
    recommendedAction: null,
    setupEnv: [],
    hmrConnected: false,
    hmrState: 'idle',
    filesInSync: 0,
    lastSyncAt: null,
    lastHealthCheckAt: null,
    lastHealthyAt: null,
    failureCount: 0,
    ...overrides,
  }
}

describe('RuntimePreviewSurface', () => {
  beforeEach(() => {
    previewPanelSpy.mockClear()
  })

  it('honors a controlled healthy runtime instead of forcing degraded for external URLs', () => {
    render(
      <RuntimePreviewSurface
        variant="runtime"
        projectId="p1"
        runtimeUrl="http://localhost:3001"
        runtimeInfoOverride={createRuntimeOverride({ state: 'healthy' })}
      />,
    )

    expect(screen.getByText('Preview em execucao')).toBeInTheDocument()
    expect(screen.queryByText('Preview degradado')).not.toBeInTheDocument()
    expect(previewPanelSpy).toHaveBeenCalled()
  })

  it('still surfaces fallback inline when controlled runtime is degraded', () => {
    render(
      <RuntimePreviewSurface
        variant="runtime"
        projectId="p1"
        runtimeUrl="http://localhost:3001"
        forceInlineFallback
        runtimeInfoOverride={createRuntimeOverride({
          state: 'degraded',
          strategy: 'inline',
          runtimeUrl: null,
        })}
      />,
    )

    expect(screen.getByText('Preview degradado')).toBeInTheDocument()
    expect(screen.getByText('Fallback inline')).toBeInTheDocument()
    expect(screen.getByTestId('preview-panel')).toHaveAttribute('data-inline', 'yes')
  })

  it('shows actionable guidance when the managed runtime fails', () => {
    render(
      <RuntimePreviewSurface
        variant="runtime"
        projectId="p1"
        runtimeInfoOverride={createRuntimeOverride({
          state: 'failed',
          strategy: 'e2b',
          runtimeUrl: null,
          provider: 'e2b',
          error: 'Provisionamento falhou.',
          guidance: 'E2B_API_KEY nao configurada.',
          recommendedAction: 'Configure o provider antes de compartilhar review remoto.',
          setupEnv: ['E2B_API_KEY', 'AETHEL_PREVIEW_E2B_TEMPLATE'],
        })}
      />,
    )

    expect(screen.getAllByText('Falha no preview').length).toBeGreaterThan(0)
    expect(screen.getByText('E2B_API_KEY nao configurada.')).toBeInTheDocument()
    expect(screen.getByText(/Configure o provider antes de compartilhar review remoto/i)).toBeInTheDocument()
    expect(screen.getByText(/provider e2b/i)).toBeInTheDocument()
    expect(screen.getByText(/env E2B_API_KEY/i)).toBeInTheDocument()
  })
})
