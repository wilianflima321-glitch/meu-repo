'use client'

import { useEffect, type Dispatch, type SetStateAction } from 'react'
import { analytics } from '@/lib/analytics'
import {
  buildAiProviderGateMessage,
  fetchAiProviderStatus,
} from '@/lib/ai-provider-status-client'
import { isAuthenticated } from '@/lib/auth'
import { syncAuthFromServer } from '@/lib/auth-session-sync'
import { ONBOARDING_WIZARD_DISMISSED_KEY } from './aethel-dashboard-constants'
import { coerceActiveTab } from './aethel-dashboard-core-types'
import { getProjectIdFromLocation } from './aethel-dashboard-location-utils'
import { getScopedKeys } from './aethel-dashboard-defaults'
import { persistDashboardActiveTab, type ActiveTab, type DashboardSettings } from './aethel-dashboard-model'

type AiProviderGate = {
  message: string
  capabilityStatus?: string
  setupUrl?: string
} | null

type DashboardRuntimeLifecycleInput = {
  authReady: boolean
  copilotProjectId: string | null
  hasToken: boolean
  setActiveChatThreadId: Dispatch<SetStateAction<string | null>>
  setActiveTab: Dispatch<SetStateAction<ActiveTab>>
  setActiveWorkflowId: Dispatch<SetStateAction<string | null>>
  setAiProviderGate: Dispatch<SetStateAction<AiProviderGate>>
  setAuthReady: Dispatch<SetStateAction<boolean>>
  setCopilotProjectId: Dispatch<SetStateAction<string | null>>
  setHasToken: Dispatch<SetStateAction<boolean>>
  setShowOnboardingWizard: Dispatch<SetStateAction<boolean>>
  settingsTheme: DashboardSettings['theme']
  shouldShowFirstRunOnboarding: boolean
  trackEvent: (category: string, action: string, metadata?: Record<string, unknown>) => void
}

export function useDashboardRuntimeLifecycle({
  authReady,
  copilotProjectId,
  hasToken,
  setActiveChatThreadId,
  setActiveTab,
  setActiveWorkflowId,
  setAiProviderGate,
  setAuthReady,
  setCopilotProjectId,
  setHasToken,
  setShowOnboardingWizard,
  settingsTheme,
  shouldShowFirstRunOnboarding,
  trackEvent,
}: DashboardRuntimeLifecycleInput) {
  useEffect(() => {
    if (!authReady || !hasToken) return
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const forced = params.get('onboarding') === '1'
    const dismissed = window.localStorage.getItem(ONBOARDING_WIZARD_DISMISSED_KEY) === '1'
    if (forced || (!dismissed && shouldShowFirstRunOnboarding)) {
      setShowOnboardingWizard(true)
    }
  }, [authReady, hasToken, setShowOnboardingWizard, shouldShowFirstRunOnboarding])

  useEffect(() => {
    ;(async () => {
      let isAuth = isAuthenticated()
      if (!isAuth) {
        isAuth = await syncAuthFromServer()
      }
      setHasToken(isAuth)
      setAuthReady(true)
    })()
    
    setCopilotProjectId(getProjectIdFromLocation())
    trackEvent('engine', 'editor_open', { surface: 'dashboard' })
    analytics?.trackPageLoad?.('dashboard')
  }, [setAuthReady, setCopilotProjectId, setHasToken, trackEvent])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    if (!tab) return
    const nextTab = coerceActiveTab(tab)
    setActiveTab(nextTab)
    persistDashboardActiveTab(nextTab)
  }, [setActiveTab])

  useEffect(() => {
    if (!authReady || !hasToken) return
    const controller = new AbortController()

    ;(async () => {
      try {
        const status = await fetchAiProviderStatus(controller.signal)
        if (status.configured || status.demoModeEnabled) {
          setAiProviderGate(null)
          return
        }
        setAiProviderGate({
          message: buildAiProviderGateMessage(status),
          capabilityStatus: status.capabilityStatus,
          setupUrl: status.setupUrl,
        })
        trackEvent('ai', 'ai_error', {
          source: 'dashboard-provider-preflight',
          error: 'AI_PROVIDER_NOT_CONFIGURED',
        })
      } catch {
        // best-effort preflight only
      }
    })()

    return () => controller.abort()
  }, [authReady, hasToken, setAiProviderGate, trackEvent])

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.setAttribute('data-aethel-theme', settingsTheme)
  }, [settingsTheme])

  useEffect(() => {
    if (!hasToken || typeof window === 'undefined') return
    const keys = getScopedKeys(copilotProjectId)
    const storedWorkflow =
      window.localStorage.getItem(keys.workflowKey) ||
      window.localStorage.getItem(keys.legacyWorkflowKey)
    const storedThread =
      window.localStorage.getItem(keys.chatThreadKey) ||
      window.localStorage.getItem(keys.legacyChatThreadKey)

    if (storedWorkflow) {
      setActiveWorkflowId(storedWorkflow)
    }
    if (storedThread) {
      setActiveChatThreadId(storedThread)
    }
  }, [hasToken, copilotProjectId, setActiveChatThreadId, setActiveWorkflowId])
}
