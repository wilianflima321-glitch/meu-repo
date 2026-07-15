'use client'

import { useEffect, useState } from 'react'

const ACTIVE_HOLD_MS = 3500

export function useRuntimeInteractionPressure(enabled = true): boolean {
  const [userActive, setUserActive] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setUserActive(false)
      return
    }

    let clearTimer: number | null = null

    const markActive = () => {
      setUserActive(true)
      if (clearTimer) {
        window.clearTimeout(clearTimer)
      }
      clearTimer = window.setTimeout(() => {
        setUserActive(false)
      }, ACTIVE_HOLD_MS)
    }

    window.addEventListener('pointerdown', markActive, { passive: true })
    window.addEventListener('keydown', markActive)
    window.addEventListener('wheel', markActive, { passive: true })
    window.addEventListener('touchstart', markActive, { passive: true })

    return () => {
      if (clearTimer) {
        window.clearTimeout(clearTimer)
      }
      window.removeEventListener('pointerdown', markActive)
      window.removeEventListener('keydown', markActive)
      window.removeEventListener('wheel', markActive)
      window.removeEventListener('touchstart', markActive)
    }
  }, [enabled])

  return userActive
}
