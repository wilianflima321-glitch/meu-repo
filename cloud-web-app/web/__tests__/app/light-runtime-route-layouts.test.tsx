import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'

const routeLayoutSpy = vi.fn(
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
      data-onboarding-chrome={String(onboardingChrome)}
      data-surface={surface ?? 'full'}
    >
      {children}
    </div>
  )
)

vi.mock('@/components/providers/StudioRuntimeRouteLayout', () => ({
  default: (props: {
    children: React.ReactNode
    onboardingChrome?: boolean
    surface?: 'full' | 'light'
  }) => routeLayoutSpy(props),
}))

import DashboardLayout from '@/app/dashboard/layout'
import NexusLayout from '@/app/nexus/layout'
import ProfileLayout from '@/app/profile/layout'
import ProjectSettingsLayout from '@/app/project-settings/layout'
import SettingsLayout from '@/app/settings/layout'

describe('light runtime route layouts', () => {
  it.each([
    ['dashboard', DashboardLayout],
    ['settings', SettingsLayout],
    ['profile', ProfileLayout],
    ['project-settings', ProjectSettingsLayout],
    ['nexus', NexusLayout],
  ])('keeps %s on the lightweight studio runtime surface', (_name, LayoutComponent) => {
    routeLayoutSpy.mockClear()

    render(
      <LayoutComponent>
        <div>Route content</div>
      </LayoutComponent>
    )

    expect(routeLayoutSpy).toHaveBeenCalledTimes(1)
    expect(routeLayoutSpy.mock.calls[0]?.[0]).toMatchObject({
      surface: 'light',
      onboardingChrome: false,
    })
  })
})
