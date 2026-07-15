'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  getMissionFromLocation,
  getOnboardingFlagFromLocation,
  getSourceFromLocation,
} from './aethel-dashboard-location-utils'

type EntryIntent = {
  mission: string | null
  source: string | null
  onboarding: boolean
}

function readEntryIntent(): EntryIntent {
  return {
    mission: getMissionFromLocation(),
    source: getSourceFromLocation(),
    onboarding: getOnboardingFlagFromLocation(),
  }
}

export function useDashboardEntryIntent() {
  const [entryIntent, setEntryIntent] = useState<EntryIntent>(() => readEntryIntent())

  useEffect(() => {
    setEntryIntent(readEntryIntent())
  }, [])

  const dismissEntryIntent = useCallback(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('mission')
      url.searchParams.delete('source')
      url.searchParams.delete('onboarding')
      window.history.replaceState({}, '', url.toString())
    }

    setEntryIntent({ mission: null, source: null, onboarding: false })
  }, [])

  return {
    mission: entryIntent.mission,
    source: entryIntent.source,
    onboarding: entryIntent.onboarding,
    hasEntryIntent: Boolean(entryIntent.mission || entryIntent.onboarding),
    dismissEntryIntent,
  }
}
