'use client'

import { useEffect, useState } from 'react'

type DeferredRuntimeActivationState = {
  sessionTrackingReady: boolean
  telemetryReady: boolean
  serviceWorkerReady: boolean
  ambientUiReady: boolean
}

const INITIAL_STATE: DeferredRuntimeActivationState = {
  sessionTrackingReady: false,
  telemetryReady: false,
  serviceWorkerReady: false,
  ambientUiReady: false,
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

export function useDeferredRuntimeActivation(enabled = true): DeferredRuntimeActivationState {
  const [state, setState] = useState<DeferredRuntimeActivationState>(INITIAL_STATE)

  useEffect(() => {
    if (!enabled) {
      setState(INITIAL_STATE)
      return
    }

    let active = true

    const markReady = (key: keyof DeferredRuntimeActivationState) => {
      if (!active) return
      setState((previous) => (previous[key] ? previous : { ...previous, [key]: true }))
    }

    const cancelIdleActivation = scheduleIdleTask(() => {
      markReady('sessionTrackingReady')
      markReady('telemetryReady')
    }, 1000)

    const serviceWorkerTimer = window.setTimeout(() => {
      markReady('serviceWorkerReady')
    }, 1800)

    const ambientUiTimer = window.setTimeout(() => {
      markReady('ambientUiReady')
    }, 2600)

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
      window.clearTimeout(serviceWorkerTimer)
      window.clearTimeout(ambientUiTimer)
      window.removeEventListener('pointerdown', activateRemainingOnIntent)
      window.removeEventListener('keydown', activateRemainingOnIntent)
      window.removeEventListener('focus', activateRemainingOnIntent)
    }
  }, [enabled])

  return state
}
