import type { ReactNode } from 'react'
import StudioRuntimeProviders, { type StudioRuntimeSurface } from '@/components/providers/StudioRuntimeProviders'

interface StudioRuntimeRouteLayoutProps {
  children: ReactNode
  surface?: StudioRuntimeSurface
  onboardingChrome?: boolean
}

export default function StudioRuntimeRouteLayout({
  children,
  surface = 'full',
  onboardingChrome = true,
}: StudioRuntimeRouteLayoutProps) {
  return (
    <StudioRuntimeProviders surface={surface} onboardingChrome={onboardingChrome}>
      {children}
    </StudioRuntimeProviders>
  )
}
