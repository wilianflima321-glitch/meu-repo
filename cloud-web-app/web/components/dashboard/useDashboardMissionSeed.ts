'use client'

import { useEffect, useRef } from 'react'
import { STORAGE_KEYS, type ActiveTab, type ToastType } from './aethel-dashboard-model'
import {
  getMissionFromLocation,
  getOnboardingFlagFromLocation,
  getSourceFromLocation,
} from './aethel-dashboard-location-utils'

type TrackEvent = (
  category: string,
  action: string,
  metadata?: Record<string, unknown>
) => void

type ShowToast = (message: string, type?: ToastType) => void

type Params = {
  trackEvent: TrackEvent
  showToastMessage: ShowToast
  setShowFirstValueGuide: (value: boolean) => void
  setActiveTab: (tab: ActiveTab) => void
  setChatMessage: (updater: (prev: string) => string) => void
}

export function useDashboardMissionSeed({
  trackEvent,
  showToastMessage,
  setShowFirstValueGuide,
  setActiveTab,
  setChatMessage,
}: Params) {
  const loadedRef = useRef(false)

  useEffect(() => {
    if (loadedRef.current || typeof window === 'undefined') return
    loadedRef.current = true

    const mission = getMissionFromLocation()
    const onboarding = getOnboardingFlagFromLocation()
    const source = getSourceFromLocation()

    if (onboarding) {
      setShowFirstValueGuide(true)
      setActiveTab('projects')
      window.localStorage.setItem(STORAGE_KEYS.activeTab, 'projects')
      trackEvent('user', 'settings_change', {
        section: 'onboarding',
        action: 'entry',
        source: source || 'unknown',
      })
      showToastMessage('Onboarding iniciado. Crie o primeiro projeto e avance no guia.', 'success')
    }

    if (!mission) return
    setActiveTab('ai-chat')
    window.localStorage.setItem(STORAGE_KEYS.activeTab, 'ai-chat')
    setChatMessage((prev) => (prev.trim() ? prev : mission))
    setShowFirstValueGuide(true)
    trackEvent('ai', 'ai_chat', { source: 'dashboard-mission-seed' })
    showToastMessage('Missao carregada no Studio Home. Revise e envie para iniciar.', 'info')
  }, [setActiveTab, setChatMessage, setShowFirstValueGuide, showToastMessage, trackEvent])
}
