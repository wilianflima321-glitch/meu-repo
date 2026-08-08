'use client'

import { useCallback } from 'react'

import { getAuthHeaders } from './aethel-dashboard-location-utils'
import { ONBOARDING_WIZARD_DISMISSED_KEY } from './aethel-dashboard-constants'
import type { ForgeScaffoldUxResult } from '@/lib/production/forge-scaffold-client'

type SetState<T> = React.Dispatch<React.SetStateAction<T>>

export type DashboardOnboardingActionsInput = {
  hasToken: boolean
  mutateOnboarding: () => Promise<any>
  trackEvent: (category: string, action: string, metadata?: Record<string, unknown>) => void
  handleTemplateSelect: (templateId: string) => void
  setNewProjectName: SetState<string>
  setShowOnboardingWizard: SetState<boolean>
}

export function useDashboardOnboardingActions({
  hasToken,
  mutateOnboarding,
  trackEvent,
  handleTemplateSelect,
  setNewProjectName,
  setShowOnboardingWizard,
}: DashboardOnboardingActionsInput) {
  const persistOnboardingProgress = useCallback((action: 'complete_step' | 'skip', step?: string) => {
    if (!hasToken) return

    void (async () => {
      try {
        const response = await fetch('/api/onboarding', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify(step ? { action, step } : { action }),
        })

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`)
        }

        await mutateOnboarding()
      } catch (error) {
        trackEvent('onboarding', 'wizard_sync_error', {
          action,
          step: step || null,
          error: error instanceof Error ? error.message : 'unknown',
        })
      }
    })()
  }, [hasToken, mutateOnboarding, trackEvent])

  const handleDismissOnboardingWizard = useCallback((reason: 'skip' | 'complete') => {
    setShowOnboardingWizard(false)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ONBOARDING_WIZARD_DISMISSED_KEY, '1')
    }
    trackEvent('onboarding', 'wizard_dismiss', { reason })
  }, [setShowOnboardingWizard, trackEvent])

  /** L.9 ForgeScaffoldWizard success — evidence-backed only (client already fail-closed). */
  const handleOnboardingComplete = useCallback(
    (result: Extract<ForgeScaffoldUxResult, { ok: true }>) => {
      handleDismissOnboardingWizard('complete')
      persistOnboardingProgress('complete_step', 'welcome')
      persistOnboardingProgress('complete_step', 'first_project')
      setNewProjectName('')
      trackEvent('onboarding', 'forge_scaffold_ok', {
        projectId: result.projectId,
        templateId: result.templateId,
        hasPreview: Boolean(result.previewUrl),
      })
      handleTemplateSelect(result.templateId)
      // Navigation is owned by ForgeScaffoldWizard (autoNavigate).
    },
    [
      handleDismissOnboardingWizard,
      persistOnboardingProgress,
      setNewProjectName,
      trackEvent,
      handleTemplateSelect,
    ],
  )

  const handleOnboardingSkip = useCallback(() => {
    handleDismissOnboardingWizard('skip')
    persistOnboardingProgress('skip')
  }, [handleDismissOnboardingWizard, persistOnboardingProgress])

  return {
    handleDismissOnboardingWizard,
    handleOnboardingComplete,
    handleOnboardingSkip,
  }
}
