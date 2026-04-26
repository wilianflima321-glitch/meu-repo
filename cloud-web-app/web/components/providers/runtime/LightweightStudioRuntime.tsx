'use client'

import { Suspense, type ReactNode } from 'react'
import { ErrorBoundaryProvider } from '@/components/error/ErrorBoundary'
import CoreUiProviders from '@/components/providers/CoreUiProviders'
import { A11yProvider } from '@/lib/a11y/accessibility'

import StudioRuntimeLoadingFallback from './StudioRuntimeLoadingFallback'

export default function LightweightStudioRuntime({ children }: { children: ReactNode }) {
  return (
    <CoreUiProviders>
      <ErrorBoundaryProvider>
        <A11yProvider>
          <Suspense fallback={<StudioRuntimeLoadingFallback />}>{children}</Suspense>
        </A11yProvider>
      </ErrorBoundaryProvider>
    </CoreUiProviders>
  )
}
