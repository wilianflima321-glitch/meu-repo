'use client'

import type { ReactNode } from 'react'

import FullStudioRuntime from '@/components/providers/runtime/FullStudioRuntime'
import LightweightStudioRuntime from '@/components/providers/runtime/LightweightStudioRuntime'

export type StudioRuntimeSurface = 'full' | 'light'

interface StudioRuntimeProvidersProps {
  children: ReactNode
  surface?: StudioRuntimeSurface
  onboardingChrome?: boolean
}

export default function StudioRuntimeProviders({
  children,
  surface = 'full',
  onboardingChrome = true,
}: StudioRuntimeProvidersProps) {
  if (surface === 'light') {
    return <LightweightStudioRuntime>{children}</LightweightStudioRuntime>
  }

  return <FullStudioRuntime onboardingChrome={onboardingChrome}>{children}</FullStudioRuntime>
}
