'use client'

import { useEffect, useRef } from 'react'
import { resolveDashboardEntrySeed } from './aethel-dashboard-entry-triage'
import { persistDashboardActiveTab, type ActiveTab, type ToastType } from './aethel-dashboard-model'
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
    const seed = resolveDashboardEntrySeed({ mission, onboarding, source })

    if (seed.showFirstValueGuide) {
      setShowFirstValueGuide(true)
      setActiveTab(seed.targetTab)
      persistDashboardActiveTab(seed.targetTab)
      trackEvent('user', 'settings_change', {
        section: 'onboarding',
        action: 'entry',
        source: source || 'unknown',
      })
      if (seed.toast && !seed.chatSeed) {
        showToastMessage(seed.toast.message, seed.toast.type)
      }
    }

    if (!seed.chatSeed) return
    setActiveTab(seed.targetTab)
    persistDashboardActiveTab(seed.targetTab)
    setChatMessage((prev) => (prev.trim() ? prev : seed.chatSeed ?? ''))
    setShowFirstValueGuide(seed.showFirstValueGuide)
    trackEvent('ai', 'ai_chat', { source: 'dashboard-mission-seed', lane: source || 'unknown' })
    if (seed.toast) {
      showToastMessage(seed.toast.message, seed.toast.type)
    }
  }, [setActiveTab, setChatMessage, setShowFirstValueGuide, showToastMessage, trackEvent])
}
