import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const serviceWorkerProviderSpy = vi.fn(
  ({ children, enabled }: { children?: React.ReactNode; enabled?: boolean }) => (
    <div data-testid="sw-provider" data-enabled={String(enabled)} data-has-children={String(Boolean(children))}>
      {children}
    </div>
  )
)

vi.mock('@/components/ai/AISuggestionBubble', () => ({
  AISuggestionBubbleAuto: () => <div data-testid="ai-suggestion-bubble" />,
}))

vi.mock('@/components/billing/LowBalanceModal', () => ({
  LowBalanceModalAuto: () => <div data-testid="low-balance-modal" />,
}))

vi.mock('@/components/ui/CookieConsent', () => ({
  default: () => <div data-testid="cookie-consent" />,
}))

vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-provider">{children}</div>,
}))

vi.mock('@/lib/a11y/accessibility', () => ({
  A11yProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="a11y-provider">{children}</div>,
}))

vi.mock('@/lib/commands/command-registry', () => ({
  CommandRegistryProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="command-registry-provider">{children}</div>
  ),
}))

vi.mock('@/lib/debug/devtools-provider', () => ({
  DevToolsProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="devtools-provider">{children}</div>,
}))

vi.mock('@/lib/hooks/use-session-tracker', () => ({
  SessionTrackerProvider: ({
    children,
    enabled,
  }: {
    children: React.ReactNode
    enabled?: boolean
  }) => (
    <div data-testid="session-tracker-provider" data-enabled={String(enabled)}>
      {children}
    </div>
  ),
}))

vi.mock('@/lib/providers/AethelProvider', () => ({
  AethelProvider: ({
    children,
    runtimeReady,
  }: {
    children: React.ReactNode
    runtimeReady?: boolean
  }) => (
    <div data-testid="aethel-provider" data-runtime-ready={String(runtimeReady)}>
      {children}
    </div>
  ),
}))

vi.mock('@/components/error/ErrorBoundary', () => ({
  ErrorBoundaryProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="error-boundary-provider">{children}</div>
  ),
}))

vi.mock('@/components/Onboarding', () => ({
  OnboardingProvider: ({
    children,
    enabled,
  }: {
    children: React.ReactNode
    enabled?: boolean
  }) => (
    <div data-testid="onboarding-provider" data-enabled={String(enabled)}>
      {children}
    </div>
  ),
  OnboardingChecklist: () => <div data-testid="onboarding-checklist" />,
  WelcomeModal: () => <div data-testid="welcome-modal" />,
}))

vi.mock('@/components/observability/TelemetryBootstrap', () => ({
  default: () => <div data-testid="telemetry-bootstrap" />,
}))

vi.mock('@/components/providers/CoreUiProviders', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="core-ui-providers">{children}</div>,
}))

vi.mock('@/components/ServiceWorkerProvider', () => ({
  ServiceWorkerProvider: (props: { children?: React.ReactNode; enabled?: boolean }) => serviceWorkerProviderSpy(props),
}))

vi.mock('@/components/analytics/WebVitalsReporter', () => ({
  default: () => <div data-testid="web-vitals-reporter" />,
}))

vi.mock('@/components/providers/runtime/StudioRuntimeCommandRegistration', () => ({
  default: () => <div data-testid="runtime-command-registration" />,
}))

vi.mock('@/components/providers/runtime/StudioRuntimeLoadingFallback', () => ({
  default: () => <div data-testid="runtime-loading-fallback" />,
}))

vi.mock('@/components/providers/runtime/useDeferredRuntimeActivation', () => ({
  useDeferredRuntimeActivation: () => ({
    serviceWorkerReady: true,
    telemetryReady: true,
    sessionTrackingReady: true,
    ambientUiReady: true,
  }),
}))

import FullStudioRuntime from '@/components/providers/runtime/FullStudioRuntime'

describe('FullStudioRuntime', () => {
  it('mounts the service worker provider as an ambient leaf instead of wrapping the runtime tree', () => {
    render(
      <FullStudioRuntime onboardingChrome={false}>
        <div>Studio child</div>
      </FullStudioRuntime>
    )

    expect(screen.getByText('Studio child')).toBeInTheDocument()
    expect(screen.getByTestId('telemetry-bootstrap')).toBeInTheDocument()
    expect(screen.getByTestId('web-vitals-reporter')).toBeInTheDocument()
    expect(screen.getByTestId('aethel-provider')).toHaveAttribute('data-runtime-ready', 'true')
    expect(screen.getByTestId('onboarding-provider')).toHaveAttribute('data-enabled', 'false')
    expect(screen.getByTestId('sw-provider')).toHaveAttribute('data-enabled', 'true')
    expect(screen.getByTestId('sw-provider')).toHaveAttribute('data-has-children', 'false')
    expect(serviceWorkerProviderSpy).toHaveBeenCalledTimes(1)
  })
})
