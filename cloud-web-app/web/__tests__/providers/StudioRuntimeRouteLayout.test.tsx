import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const studioRuntimeProvidersSpy = vi.fn(
  ({
    children,
    onboardingChrome,
    surface,
  }: {
    children: React.ReactNode
    onboardingChrome?: boolean
    surface?: 'full' | 'light'
  }) => (
    <div
      data-testid="studio-runtime-providers"
      data-onboarding-chrome={String(onboardingChrome)}
      data-surface={surface ?? 'full'}
    >
      {children}
    </div>
  )
)

vi.mock('@/components/providers/StudioRuntimeProviders', () => ({
  default: (props: {
    children: React.ReactNode
    onboardingChrome?: boolean
    surface?: 'full' | 'light'
  }) => studioRuntimeProvidersSpy(props),
}))

import StudioRuntimeRouteLayout from '@/components/providers/StudioRuntimeRouteLayout'

describe('StudioRuntimeRouteLayout', () => {
  afterEach(() => {
    studioRuntimeProvidersSpy.mockClear()
  })

  it('defaults to the full runtime surface with onboarding chrome enabled', () => {
    render(
      <StudioRuntimeRouteLayout>
        <div>Studio content</div>
      </StudioRuntimeRouteLayout>
    )

    expect(studioRuntimeProvidersSpy).toHaveBeenCalledTimes(1)
    expect(studioRuntimeProvidersSpy.mock.calls[0]?.[0]).toMatchObject({
      onboardingChrome: true,
      surface: 'full',
    })
    expect(screen.getByTestId('studio-runtime-providers')).toHaveAttribute('data-surface', 'full')
    expect(screen.getByTestId('studio-runtime-providers')).toHaveAttribute('data-onboarding-chrome', 'true')
  })

  it('forwards explicit route-surface overrides', () => {
    render(
      <StudioRuntimeRouteLayout surface="light" onboardingChrome={false}>
        <div>Light surface</div>
      </StudioRuntimeRouteLayout>
    )

    expect(studioRuntimeProvidersSpy).toHaveBeenCalledTimes(1)
    expect(studioRuntimeProvidersSpy.mock.calls[0]?.[0]).toMatchObject({
      onboardingChrome: false,
      surface: 'light',
    })
    expect(screen.getByTestId('studio-runtime-providers')).toHaveAttribute('data-surface', 'light')
    expect(screen.getByTestId('studio-runtime-providers')).toHaveAttribute('data-onboarding-chrome', 'false')
    expect(screen.getByText('Light surface')).toBeInTheDocument()
  })
})
