import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const fullStudioRuntimeSpy = vi.fn(({ children }: { children: React.ReactNode }) => (
  <div data-testid="full-studio-runtime">{children}</div>
))
const lightweightStudioRuntimeSpy = vi.fn(({ children }: { children: React.ReactNode }) => (
  <div data-testid="light-studio-runtime">{children}</div>
))

vi.mock('@/components/providers/runtime/FullStudioRuntime', () => ({
  default: (props: { children: React.ReactNode; onboardingChrome?: boolean }) => fullStudioRuntimeSpy(props),
}))

vi.mock('@/components/providers/runtime/LightweightStudioRuntime', () => ({
  default: (props: { children: React.ReactNode }) => lightweightStudioRuntimeSpy(props),
}))

import StudioRuntimeProviders from '@/components/providers/StudioRuntimeProviders'

describe('StudioRuntimeProviders', () => {
  afterEach(() => {
    fullStudioRuntimeSpy.mockClear()
    lightweightStudioRuntimeSpy.mockClear()
  })

  it('renders the full runtime by default', () => {
    render(
      <StudioRuntimeProviders>
        <div>Full runtime</div>
      </StudioRuntimeProviders>
    )

    expect(fullStudioRuntimeSpy).toHaveBeenCalledTimes(1)
    expect(fullStudioRuntimeSpy.mock.calls[0]?.[0]).toMatchObject({
      onboardingChrome: true,
    })
    expect(lightweightStudioRuntimeSpy).not.toHaveBeenCalled()
    expect(screen.getByTestId('full-studio-runtime')).toBeInTheDocument()
  })

  it('switches to the light runtime surface when requested', () => {
    render(
      <StudioRuntimeProviders surface="light" onboardingChrome={false}>
        <div>Light runtime</div>
      </StudioRuntimeProviders>
    )

    expect(lightweightStudioRuntimeSpy).toHaveBeenCalledTimes(1)
    expect(fullStudioRuntimeSpy).not.toHaveBeenCalled()
    expect(screen.getByTestId('light-studio-runtime')).toBeInTheDocument()
  })
})
