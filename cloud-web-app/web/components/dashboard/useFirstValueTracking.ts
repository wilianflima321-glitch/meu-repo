'use client'

import { useEffect, useRef } from 'react'
import { analytics } from '@/lib/analytics'

type TrackEvent = (
  category: string,
  action: string,
  metadata?: Record<string, unknown>
) => void

type Params = {
  projectsCount: number
  defaultProjectsCount: number
  firstValueAiSuccess: boolean
  firstValueOpenedIde: boolean
  trackEvent: TrackEvent
}

export function useFirstValueTracking({
  projectsCount,
  defaultProjectsCount,
  firstValueAiSuccess,
  firstValueOpenedIde,
  trackEvent,
}: Params) {
  const firstValueStartedAtRef = useRef<number | null>(null)
  const firstValueCompletionTrackedRef = useRef(false)
  const firstValueProjectTrackedRef = useRef(false)
  const firstValueAiTrackedRef = useRef(false)
  const firstValueIdeTrackedRef = useRef(false)

  useEffect(() => {
    if (firstValueStartedAtRef.current !== null) return
    if (typeof performance === 'undefined') return
    firstValueStartedAtRef.current = performance.now()
  }, [])

  useEffect(() => {
    if (firstValueCompletionTrackedRef.current) return
    const firstProjectCreated = projectsCount > defaultProjectsCount
    if (!firstProjectCreated || !firstValueAiSuccess || !firstValueOpenedIde) return

    firstValueCompletionTrackedRef.current = true
    const durationMs =
      typeof performance !== 'undefined' && firstValueStartedAtRef.current !== null
        ? Math.max(0, Math.round(performance.now() - firstValueStartedAtRef.current))
        : undefined

    trackEvent('user', 'settings_change', {
      section: 'first-value-guide',
      action: 'completed',
      durationMs,
    })

    if (typeof durationMs === 'number') {
      analytics?.trackPerformance?.('first_value_time', durationMs, 'ms', { surface: 'dashboard' })
    }
  }, [projectsCount, defaultProjectsCount, firstValueAiSuccess, firstValueOpenedIde, trackEvent])

  useEffect(() => {
    const firstProjectCreated = projectsCount > defaultProjectsCount
    if (!firstProjectCreated || firstValueProjectTrackedRef.current) return
    firstValueProjectTrackedRef.current = true
    trackEvent('project', 'project_create', {
      source: 'first-value-guide',
      milestone: 'first-project-created',
    })
  }, [projectsCount, defaultProjectsCount, trackEvent])

  useEffect(() => {
    if (!firstValueAiSuccess || firstValueAiTrackedRef.current) return
    firstValueAiTrackedRef.current = true
    trackEvent('ai', 'ai_chat', {
      source: 'first-value-guide',
      milestone: 'first-ai-success',
    })
  }, [firstValueAiSuccess, trackEvent])

  useEffect(() => {
    if (!firstValueOpenedIde || firstValueIdeTrackedRef.current) return
    firstValueIdeTrackedRef.current = true
    trackEvent('engine', 'editor_open', {
      source: 'first-value-guide',
      milestone: 'first-ide-opened',
    })
  }, [firstValueOpenedIde, trackEvent])
}
