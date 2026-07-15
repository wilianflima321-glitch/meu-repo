'use client'

import { Suspense, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { LowBalanceModalAuto } from '@/components/billing/LowBalanceModal'
import CookieConsent from '@/components/ui/CookieConsent'
import { AuthProvider } from '@/contexts/AuthContext'
import { A11yProvider } from '@/lib/a11y/accessibility'
import { CommandRegistryProvider } from '@/lib/commands/command-registry'
import { DevToolsProvider } from '@/lib/debug/devtools-provider'
import { SessionTrackerProvider } from '@/lib/hooks/use-session-tracker'
import { AethelProvider } from '@/lib/providers/AethelProvider'
import { ErrorBoundaryProvider } from '@/components/error/ErrorBoundary'
import { OnboardingChecklist, OnboardingProvider, WelcomeModal } from '@/components/onboarding/Onboarding'
import TelemetryBootstrap from '@/components/observability/TelemetryBootstrap'
import CoreUiProviders from '@/components/providers/CoreUiProviders'
import { ServiceWorkerProvider } from '@/components/providers/ServiceWorkerProvider'
import WebVitalsReporter from '@/components/analytics/WebVitalsReporter'
import { useRuntimeCapabilityProfile } from '@/hooks/useRuntimeCapabilityProfile'

import StudioRuntimeCommandRegistration from './StudioRuntimeCommandRegistration'
import StudioRuntimeLoadingFallback from './StudioRuntimeLoadingFallback'
import { useDeferredRuntimeActivation } from './useDeferredRuntimeActivation'
import { useRuntimeInteractionPressure } from './useRuntimeInteractionPressure'

const AISuggestionBubbleAuto = dynamic(
  () => import('@/components/ai/AISuggestionBubble').then((mod) => mod.AISuggestionBubbleAuto),
  {
    ssr: false,
    loading: () => null,
  },
)

export default function FullStudioRuntime({
  children,
  onboardingChrome = true,
}: {
  children: ReactNode
  onboardingChrome?: boolean
}) {
  const { profile: deviceProfile } = useRuntimeCapabilityProfile()
  const userActive = useRuntimeInteractionPressure()
  const deferredActivation = useDeferredRuntimeActivation({
    enabled: true,
    backgroundBudget: deviceProfile.policy.backgroundTaskBudget,
    userActive,
  })

  return (
    <CoreUiProviders>
      <ErrorBoundaryProvider>
        <A11yProvider>
          {deferredActivation.telemetryReady ? <TelemetryBootstrap /> : null}
          {deferredActivation.telemetryReady ? <WebVitalsReporter /> : null}
          <AuthProvider>
            <SessionTrackerProvider enabled={deferredActivation.sessionTrackingReady}>
              <CommandRegistryProvider>
                <DevToolsProvider>
                  <AethelProvider runtimeReady={deferredActivation.sessionTrackingReady}>
                    <OnboardingProvider enabled={onboardingChrome}>
                      <StudioRuntimeCommandRegistration />
                      {onboardingChrome ? <WelcomeModal /> : null}
                      {onboardingChrome ? <OnboardingChecklist /> : null}
                      {deferredActivation.ambientUiReady ? <LowBalanceModalAuto /> : null}
                      {deferredActivation.ambientUiReady ? <AISuggestionBubbleAuto /> : null}
                      <Suspense fallback={<StudioRuntimeLoadingFallback />}>{children}</Suspense>
                      <CookieConsent />
                    </OnboardingProvider>
                  </AethelProvider>
                </DevToolsProvider>
              </CommandRegistryProvider>
            </SessionTrackerProvider>
          </AuthProvider>
          <ServiceWorkerProvider enabled={deferredActivation.serviceWorkerReady} />
        </A11yProvider>
      </ErrorBoundaryProvider>
    </CoreUiProviders>
  )
}
