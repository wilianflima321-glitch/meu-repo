'use client'

import type { ReactNode } from 'react'
import StudioRuntimeProviders, { type StudioRuntimeSurface } from '@/components/providers/StudioRuntimeProviders'

interface StudioRuntimeLayoutClientProps {
  children: ReactNode
  surface?: StudioRuntimeSurface
  onboardingChrome?: boolean
}

export default function StudioRuntimeLayoutClient({
  children,
  surface = 'full',
  onboardingChrome = true,
}: StudioRuntimeLayoutClientProps) {
  return (
    <StudioRuntimeProviders surface={surface} onboardingChrome={onboardingChrome}>
      {children}
    </StudioRuntimeProviders>
  )
}
