'use client'

import { useEffect, useRef, useState } from 'react'

type DeferredRuntimeActivationState = {
  sessionTrackingReady: boolean
  telemetryReady: boolean
  serviceWorkerReady: boolean
  ambientUiReady: boolean
}

type DeferredRuntimeBudget = 'deep' | 'standard' | 'limited'

type DeferredRuntimeActivationOptions = {
  enabled?: boolean
  backgroundBudget?: DeferredRuntimeBudget
  userActive?: boolean
}

const INITIAL_STATE: DeferredRuntimeActivationState = {
  sessionTrackingReady: false,
  telemetryReady: false,
  serviceWorkerReady: false,
  ambientUiReady: false,
}

const RUNTIME_BUDGET_DELAYS: Record<
  DeferredRuntimeBudget,
  { idle: number; serviceWorker: number; ambientUi: number; activePenalty: number }
> = {
  deep: { idle: 1000, serviceWorker: 1800, ambientUi: 2600, activePenalty: 0 },
  standard: { idle: 1400, serviceWorker: 2400, ambientUi: 3400, activePenalty: 450 },
  limited: { idle: 2200, serviceWorker: 3800, ambientUi: 5200, activePenalty: 900 },
}

function normalizeOptions(
  options: boolean | DeferredRuntimeActivationOptions | undefined
): Required<DeferredRuntimeActivationOptions> {
  if (typeof options === 'boolean' || options === undefined) {
    return {
      enabled: options ?? true,
      backgroundBudget: 'standard',
      userActive: false,
    }
  }

  return {
    enabled: options.enabled ?? true,
    backgroundBudget: options.backgroundBudget ?? 'standard',
    userActive: options.userActive ?? false,
  }
}

function scheduleIdleTask(callback: () => void, timeoutMs: number) {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    const handle = window.requestIdleCallback(() => callback(), { timeout: timeoutMs })
    return () => {
      if ('cancelIdleCallback' in window) {
        window.cancelIdleCallback(handle)
      }
    }
  }

  const timer = globalThis.setTimeout(callback, Math.min(timeoutMs, 250))
  return () => globalThis.clearTimeout(timer)
}

export function useDeferredRuntimeActivation(
  options: boolean | DeferredRuntimeActivationOptions = true
): DeferredRuntimeActivationState {
  const { enabled, backgroundBudget, userActive } = normalizeOptions(options)
  const [state, setState] = useState<DeferredRuntimeActivationState>(INITIAL_STATE)
  const userActiveRef = useRef(userActive)

  useEffect(() => {
    userActiveRef.current = userActive
  }, [userActive])

  useEffect(() => {
    if (!enabled) {
      setState(INITIAL_STATE)
      return
    }

    let active = true
    const delays = RUNTIME_BUDGET_DELAYS[backgroundBudget]

    const markReady = (key: keyof DeferredRuntimeActivationState) => {
      if (!active) return
      setState((previous) => (previous[key] ? previous : { ...previous, [key]: true }))
    }

    const scheduleWithPressure = (callback: () => void, delayMs: number) => {
      const timer = window.setTimeout(() => {
        if (!active) return
        if (userActiveRef.current && delays.activePenalty > 0) {
          scheduleWithPressure(callback, delays.activePenalty)
          return
        }
        callback()
      }, delayMs)

      return () => window.clearTimeout(timer)
    }

    const cancelIdleActivation = scheduleIdleTask(() => {
      if (userActiveRef.current && delays.activePenalty > 0) {
        scheduleWithPressure(() => {
          markReady('sessionTrackingReady')
          markReady('telemetryReady')
        }, delays.activePenalty)
        return
      }

      markReady('sessionTrackingReady')
      markReady('telemetryReady')
    }, delays.idle)

    const cancelServiceWorker = scheduleWithPressure(() => {
      markReady('serviceWorkerReady')
    }, delays.serviceWorker)

    const cancelAmbientUi = scheduleWithPressure(() => {
      markReady('ambientUiReady')
    }, delays.ambientUi)

    const activateRemainingOnIntent = () => {
      markReady('serviceWorkerReady')
      markReady('ambientUiReady')
    }

    window.addEventListener('pointerdown', activateRemainingOnIntent, { passive: true })
    window.addEventListener('keydown', activateRemainingOnIntent)
    window.addEventListener('focus', activateRemainingOnIntent)

    return () => {
      active = false
      cancelIdleActivation()
      cancelServiceWorker()
      cancelAmbientUi()
      window.removeEventListener('pointerdown', activateRemainingOnIntent)
      window.removeEventListener('keydown', activateRemainingOnIntent)
      window.removeEventListener('focus', activateRemainingOnIntent)
    }
  }, [backgroundBudget, enabled])

  return state
}
