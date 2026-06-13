import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const { canonicalPreviewSpy } = vi.hoisted(() => ({
  canonicalPreviewSpy: vi.fn((props: any) => (
    <div
      data-testid="canonical-preview"
      data-state={props.runtimeInfoOverride?.state ?? 'none'}
      data-show-lifecycle={props.showLifecycleBar === false ? 'no' : 'yes'}
      data-title={props.title ?? 'none'}
      data-content={props.content ?? 'none'}
    />
  )),
}))

const { trustNoticeSpy } = vi.hoisted(() => ({
  trustNoticeSpy: vi.fn((props: any) => (
    <div
      data-testid="trust-notice"
      data-density={props.density ?? 'default'}
      data-artifact={props.artifactLabel ?? 'live'}
    />
  )),
}))

vi.mock('@/components/preview/CanonicalPreviewSurface', () => ({
  default: canonicalPreviewSpy,
}))

vi.mock('@/components/preview/PreviewRuntimeTrustNotice', () => ({
  PreviewRuntimeTrustNotice: trustNoticeSpy,
}))

vi.mock('@/components/ide/DevicePreview', () => ({
  DevicePreview: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="device-preview">{children}</div>
  ),
}))

import { WorkbenchPreviewRuntimeSurface } from '@/components/ide/fullscreen/WorkbenchPreviewRuntimeSurface'

const baseProps = {
  activeFile: {
    path: 'src/app.tsx',
    content: 'export default function App() { return null }',
    language: 'typescript',
  },
  previewRefreshTick: 1,
  previewRuntimeUrl: 'http://localhost:3001',
  forceInlinePreviewFallback: false,
  isSavingFile: false,
  projectId: 'project-1',
  runtimeHealth: { status: 'reachable' as const, latencyMs: 18 },
  runtimeHealthCheckedAt: new Date('2026-04-26T12:00:00.000Z'),
  runtimeReadiness: { status: 'ready' as const },
  runtimePrimaryActionLabel: 'Provisionar sandbox',
  runtimeStrategyLabel: 'sandbox gerenciado',
  runtimeDiscoveryMessage: null,
  setPreviewRefreshTick: vi.fn(),
  provisionRuntime: vi.fn(async () => true),
  handleUseInlineFallback: vi.fn(),
}

describe('WorkbenchPreviewRuntimeSurface', () => {
  beforeEach(() => {
    canonicalPreviewSpy.mockClear()
    trustNoticeSpy.mockClear()
  })

  it('passes a controlled healthy runtime into the canonical preview surface', () => {
    render(<WorkbenchPreviewRuntimeSurface {...baseProps} mode="runtime" />)

    expect(screen.getByTestId('trust-notice')).toBeInTheDocument()
    expect(screen.getByTestId('trust-notice')).toHaveAttribute('data-density', 'compact')
    expect(screen.getByTestId('trust-notice')).toHaveAttribute('data-artifact', 'live')
    expect(screen.getByTestId('canonical-preview')).toHaveAttribute('data-state', 'healthy')
    expect(screen.getByTestId('canonical-preview')).toHaveAttribute('data-show-lifecycle', 'no')
    expect(screen.getByTestId('canonical-preview')).toHaveAttribute('data-title', 'Live preview')
    expect(screen.getByTestId('canonical-preview')).toHaveAttribute(
      'data-content',
      'export default function App() { return null }',
    )
  })

  it('maps unreachable runtime health to degraded controlled state', () => {
    render(
      <WorkbenchPreviewRuntimeSurface
        {...baseProps}
        runtimeHealth={{ status: 'unreachable', reason: 'network' }}
        mode="device"
      />,
    )

    expect(screen.getByTestId('device-preview')).toBeInTheDocument()
    expect(screen.getByTestId('canonical-preview')).toHaveAttribute('data-state', 'degraded')
  })

  it('switches the runtime artifact to proposal content when previewing a pending patch', () => {
    render(
      <WorkbenchPreviewRuntimeSurface
        {...baseProps}
        mode="runtime"
        proposalContent={'export default function App() { return <main>Proposal</main> }'}
        isProposalPreviewing
      />,
    )

    expect(screen.getByTestId('trust-notice')).toHaveAttribute('data-artifact', 'proposal')
    expect(screen.getByTestId('canonical-preview')).toHaveAttribute('data-title', 'Proposal preview')
    expect(screen.getByTestId('canonical-preview')).toHaveAttribute(
      'data-content',
      'export default function App() { return <main>Proposal</main> }',
    )
  })
})
