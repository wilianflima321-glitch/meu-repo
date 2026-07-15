/**
 * Block 3A.4 — Pause R3F when document hidden or viewport off-screen.
 */

import { useEffect, useState, type RefObject } from 'react'

export type ViewportFrameloopMode = 'always' | 'never'

/**
 * Returns whether the viewport should keep rendering (frameloop always vs never).
 * Pauses on: document.hidden, zero intersection with viewport, forcePause (Code profile).
 */
export function useViewportRenderActivity(options: {
  rootRef: RefObject<HTMLElement | null>
  /** When true (e.g. Code workspace profile), never run the 3D loop */
  forcePause?: boolean
}): { active: boolean; frameloop: ViewportFrameloopMode } {
  const { rootRef, forcePause = false } = options
  const [documentVisible, setDocumentVisible] = useState(true)
  const [inView, setInView] = useState(true)

  useEffect(() => {
    if (typeof document === 'undefined') return
    const sync = () => setDocumentVisible(!document.hidden)
    sync()
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [])

  useEffect(() => {
    const el = rootRef.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        setInView(Boolean(entry?.isIntersecting && (entry.intersectionRatio ?? 0) > 0.02))
      },
      { threshold: [0, 0.02, 0.1, 0.5] }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [rootRef])

  const active = !forcePause && documentVisible && inView
  return { active, frameloop: active ? 'always' : 'never' }
}

/** localStorage / data attribute helper for Code profile pause (7A.4). */
export function isCodeWorkspaceProfileActive(): boolean {
  if (typeof window === 'undefined') return false
  try {
    // Prefer shared profile helper when available (same storage key).
    const fromAttr = window.document.documentElement.getAttribute('data-workspace-profile')
    if (fromAttr === 'code') return true
    return window.localStorage.getItem('aethel.workspace.profile') === 'code'
  } catch {
    return false
  }
}
