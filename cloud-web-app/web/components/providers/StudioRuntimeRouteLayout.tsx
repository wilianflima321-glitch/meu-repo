import type { ReactNode } from 'react'
import type { StudioRuntimeSurface } from '@/components/providers/StudioRuntimeProviders'
import StudioRuntimeLayoutClient from './StudioRuntimeLayoutClient'

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
    <StudioRuntimeLayoutClient surface={surface} onboardingChrome={onboardingChrome}>
      {children}
    </StudioRuntimeLayoutClient>
  )
}
