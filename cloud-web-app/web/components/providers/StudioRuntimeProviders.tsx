'use client'

import { Suspense } from 'react'
import { AuthProvider } from '@/contexts/AuthContext'
import { SessionTrackerProvider } from '@/lib/hooks/use-session-tracker'
import { ErrorBoundaryProvider } from '@/components/error/ErrorBoundary'
import { A11yProvider } from '@/lib/a11y/accessibility'
import { ServiceWorkerProvider } from '@/components/ServiceWorkerProvider'
import { OnboardingProvider, OnboardingChecklist, WelcomeModal } from '@/components/Onboarding'
import { AethelProvider } from '@/lib/providers/AethelProvider'
import { LowBalanceModalAuto } from '@/components/billing/LowBalanceModal'
import { AISuggestionBubbleAuto } from '@/components/ai/AISuggestionBubble'
import { CommandRegistryProvider, useDefaultCommands } from '@/lib/commands/command-registry'
import { DevToolsProvider } from '@/lib/debug/devtools-provider'
import TelemetryBootstrap from '@/components/observability/TelemetryBootstrap'
import WebVitalsReporter from '@/components/analytics/WebVitalsReporter'
import CookieConsent from '@/components/ui/CookieConsent'
import CoreUiProviders from '@/components/providers/CoreUiProviders'

export type StudioRuntimeSurface = 'full' | 'light'

interface StudioRuntimeProvidersProps {
  children: React.ReactNode
  surface?: StudioRuntimeSurface
  onboardingChrome?: boolean
}

function DefaultCommandsRegistration() {
  useDefaultCommands()
  return null
}

function LoadingFallback() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)] backdrop-blur-xl">
      <div className="flex min-w-[260px] flex-col items-center gap-4 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_4%,transparent)] px-8 py-7 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] bg-gradient-to-br from-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] via-[var(--aethel-surface-secondary)] to-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)]">
          <div className="h-9 w-9 rounded-xl border-2 border-[color-mix(in_srgb,var(--aethel-info)_80%,transparent)] border-t-transparent animate-spin" />
          <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_center,color-mix(in_srgb,var(--aethel-primary)_22%,transparent),transparent_60%)]" />
        </div>
        <div className="space-y-1 text-center">
          <p className="text-sm font-medium text-[var(--aethel-text-primary)]">Inicializando studio</p>
          <p className="text-xs text-[var(--aethel-text-tertiary)]">Carregando runtime, comandos e contexto do Aethel.</p>
        </div>
      </div>
    </div>
  )
}

function LightweightStudioRuntime({ children }: { children: React.ReactNode }) {
  return (
    <CoreUiProviders>
      <ErrorBoundaryProvider>
        <A11yProvider>
          <Suspense fallback={<LoadingFallback />}>{children}</Suspense>
        </A11yProvider>
      </ErrorBoundaryProvider>
    </CoreUiProviders>
  )
}

function FullStudioRuntime({
  children,
  onboardingChrome = true,
}: {
  children: React.ReactNode
  onboardingChrome?: boolean
}) {
  return (
    <CoreUiProviders>
      <ErrorBoundaryProvider>
        <A11yProvider>
          <ServiceWorkerProvider enabled>
            <TelemetryBootstrap />
            <WebVitalsReporter />
            <AuthProvider>
              <SessionTrackerProvider>
                <CommandRegistryProvider>
                  <DevToolsProvider>
                    <AethelProvider>
                      <OnboardingProvider enabled={onboardingChrome}>
                        <DefaultCommandsRegistration />
                        {onboardingChrome ? <WelcomeModal /> : null}
                        {onboardingChrome ? <OnboardingChecklist /> : null}
                        <LowBalanceModalAuto />
                        <AISuggestionBubbleAuto />
                        <Suspense fallback={<LoadingFallback />}>{children}</Suspense>
                        <CookieConsent />
                      </OnboardingProvider>
                    </AethelProvider>
                  </DevToolsProvider>
                </CommandRegistryProvider>
              </SessionTrackerProvider>
            </AuthProvider>
          </ServiceWorkerProvider>
        </A11yProvider>
      </ErrorBoundaryProvider>
    </CoreUiProviders>
  )
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
