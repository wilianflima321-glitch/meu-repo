import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PreviewRuntimeTrustNotice } from '@/components/preview/PreviewRuntimeTrustNotice'

const baseProps = {
  previewRuntimeUrl: 'http://localhost:3001',
  runtimeHealth: { status: 'reachable' as const, latencyMs: 18 },
  runtimeReadiness: { status: 'ready' as const, blockers: [], instructions: [] },
  runtimePrimaryActionLabel: 'Open review target',
  runtimeStrategyLabel: 'managed runtime',
  runtimeDiscoveryMessage: null,
  forceInlinePreviewFallback: false,
  isSavingFile: false,
}

describe('PreviewRuntimeTrustNotice', () => {
  it('keeps compact trust chrome short when runtime is healthy', () => {
    render(
      <PreviewRuntimeTrustNotice
        {...baseProps}
        density="compact"
        artifactLabel="proposal"
        runtimeReadiness={{ status: 'partial', blockers: ['Missing preview evidence'], instructions: [] }}
      />,
    )

    expect(screen.getByText('managed runtime')).toBeInTheDocument()
    expect(screen.getByText('reachable')).toBeInTheDocument()
    expect(screen.getByText('partial')).toBeInTheDocument()
    expect(screen.getByText('proposal')).toBeInTheDocument()
    expect(screen.getByText(/Next: Open review target/i)).toBeInTheDocument()
    expect(screen.getByText('Live preview is reachable; one check is still pending.')).toBeInTheDocument()
    expect(screen.getByText('Missing preview evidence')).toBeInTheDocument()
  })

  it('surfaces the degraded reason when compact trust is warning-grade', () => {
    render(
      <PreviewRuntimeTrustNotice
        {...baseProps}
        density="compact"
        previewRuntimeUrl={null}
        forceInlinePreviewFallback
        runtimeHealth={{ status: 'unreachable', reason: 'Runtime handshake failed' }}
        runtimeReadiness={{ status: 'partial', blockers: ['Missing preview sandbox'], instructions: [] }}
      />,
    )

    expect(screen.getByText('Local preview active.')).toBeInTheDocument()
    expect(screen.getByText('Runtime handshake failed')).toBeInTheDocument()
  })
})
