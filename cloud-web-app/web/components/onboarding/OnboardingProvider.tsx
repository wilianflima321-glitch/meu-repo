'use client'

import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import { logger } from '@/lib/observability/logger'
import type { OnboardingContextType, OnboardingState } from './types'

const OnboardingContext = createContext<OnboardingContextType>({
  state: null,
  loading: true,
  completeStep: async () => {},
  completeTour: async () => {},
  skipOnboarding: async () => {},
  showWelcome: false,
  setShowWelcome: () => {},
})

export function OnboardingProvider({
  children,
  enabled = true,
}: {
  children: ReactNode
  enabled?: boolean
}) {
  const [state, setState] = useState<OnboardingState | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      setShowWelcome(false)
      return
    }

    fetch('/api/onboarding')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setState(data.onboarding)
          if (data.onboarding.currentStep === 'welcome') {
            setShowWelcome(true)
          }
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [enabled])

  const completeStep = async (step: string) => {
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete_step', step }),
      })
      const data = await res.json()
      if (data.success) {
        setState(data.onboarding)
      }
    } catch (error) {
      logger.error('Failed to complete step:', error)
    }
  }

  const completeTour = async (tour: string) => {
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete_tour', tour }),
      })
      const data = await res.json()
      if (data.success) {
        setState(data.onboarding)
      }
    } catch (error) {
      logger.error('Failed to complete tour:', error)
    }
  }

  const skipOnboarding = async () => {
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'skip' }),
      })
      const data = await res.json()
      if (data.success) {
        setState(data.onboarding)
        setShowWelcome(false)
      }
    } catch (error) {
      logger.error('Failed to skip onboarding:', error)
    }
  }

  return (
    <OnboardingContext.Provider
      value={{
        state,
        loading,
        completeStep,
        completeTour,
        skipOnboarding,
        showWelcome,
        setShowWelcome,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  return useContext(OnboardingContext)
}
