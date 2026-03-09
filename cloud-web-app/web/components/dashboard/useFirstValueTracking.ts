'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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

export type FirstValueSessionSummary = {
  startedAt: string | null
  completedAt: string | null
  durationMs: number | null
  targetMs: number
  status: 'in_progress' | 'completed'
  milestones: {
    firstProjectCreatedAt: string | null
    firstAiSuccessAt: string | null
    firstIdeOpenedAt: string | null
  }
}

const DEFAULT_FIRST_VALUE_TARGET_MS = 90_000
const FIRST_VALUE_SESSION_STORAGE_KEY = 'aethel.dashboard.first-value.session-summary'

function buildInitialSummary(): FirstValueSessionSummary {
  if (typeof window === 'undefined') {
    return {
      startedAt: null,
      completedAt: null,
      durationMs: null,
      targetMs: DEFAULT_FIRST_VALUE_TARGET_MS,
      status: 'in_progress',
      milestones: {
        firstProjectCreatedAt: null,
        firstAiSuccessAt: null,
        firstIdeOpenedAt: null,
      },
    }
  }

  try {
    const raw = window.sessionStorage.getItem(FIRST_VALUE_SESSION_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as FirstValueSessionSummary
      if (parsed && typeof parsed === 'object') {
        return {
          startedAt: typeof parsed.startedAt === 'string' ? parsed.startedAt : null,
          completedAt: typeof parsed.completedAt === 'string' ? parsed.completedAt : null,
          durationMs: typeof parsed.durationMs === 'number' ? parsed.durationMs : null,
          targetMs: typeof parsed.targetMs === 'number' ? parsed.targetMs : DEFAULT_FIRST_VALUE_TARGET_MS,
          status: parsed.status === 'completed' ? 'completed' : 'in_progress',
          milestones: {
            firstProjectCreatedAt:
              typeof parsed.milestones?.firstProjectCreatedAt === 'string' ? parsed.milestones.firstProjectCreatedAt : null,
            firstAiSuccessAt: typeof parsed.milestones?.firstAiSuccessAt === 'string' ? parsed.milestones.firstAiSuccessAt : null,
            firstIdeOpenedAt: typeof parsed.milestones?.firstIdeOpenedAt === 'string' ? parsed.milestones.firstIdeOpenedAt : null,
          },
        }
      }
    }
  } catch {
    // Ignore storage corruption and recreate summary.
  }

  return {
    startedAt: null,
    completedAt: null,
    durationMs: null,
    targetMs: DEFAULT_FIRST_VALUE_TARGET_MS,
    status: 'in_progress',
    milestones: {
      firstProjectCreatedAt: null,
      firstAiSuccessAt: null,
      firstIdeOpenedAt: null,
    },
  }
}

export function useFirstValueTracking({
  projectsCount,
  defaultProjectsCount,
  firstValueAiSuccess,
  firstValueOpenedIde,
  trackEvent,
}: Params) {
  const firstValueStartedAtRef = useRef<number | null>(null)
  const firstValueStartedAtIsoRef = useRef<string | null>(null)
  const firstValueCompletionTrackedRef = useRef(false)
  const firstValueProjectTrackedRef = useRef(false)
  const firstValueAiTrackedRef = useRef(false)
  const firstValueIdeTrackedRef = useRef(false)
  const [sessionSummary, setSessionSummary] = useState<FirstValueSessionSummary>(() => buildInitialSummary())

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.sessionStorage.setItem(FIRST_VALUE_SESSION_STORAGE_KEY, JSON.stringify(sessionSummary))
    } catch {
      // Ignore quota/storage errors.
    }
  }, [sessionSummary])

  useEffect(() => {
    if (firstValueStartedAtRef.current !== null) return
    const startedAt = firstValueStartedAtIsoRef.current || new Date().toISOString()
    firstValueStartedAtRef.current = Date.now()
    firstValueStartedAtIsoRef.current = startedAt
    setSessionSummary((current) => (current.startedAt ? current : { ...current, startedAt }))
  }, [])

  useEffect(() => {
    if (firstValueCompletionTrackedRef.current) return
    const firstProjectCreated = projectsCount > defaultProjectsCount
    if (!firstProjectCreated || !firstValueAiSuccess || !firstValueOpenedIde) return

    firstValueCompletionTrackedRef.current = true
    const startedAtMs = firstValueStartedAtIsoRef.current ? Date.parse(firstValueStartedAtIsoRef.current) : NaN
    const durationMs = Number.isFinite(startedAtMs) ? Math.max(0, Math.round(Date.now() - startedAtMs)) : undefined
    const completedAt = new Date().toISOString()

    setSessionSummary((current) => ({
      ...current,
      completedAt,
      durationMs: typeof durationMs === 'number' ? durationMs : current.durationMs,
      status: 'completed',
    }))

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
    if (firstValueStartedAtIsoRef.current || !sessionSummary.startedAt) return
    firstValueStartedAtIsoRef.current = sessionSummary.startedAt
  }, [sessionSummary.startedAt])

  useEffect(() => {
    const firstProjectCreated = projectsCount > defaultProjectsCount
    if (!firstProjectCreated || firstValueProjectTrackedRef.current) return
    firstValueProjectTrackedRef.current = true
    const firstProjectCreatedAt = new Date().toISOString()
    setSessionSummary((current) => ({
      ...current,
      milestones: {
        ...current.milestones,
        firstProjectCreatedAt: current.milestones.firstProjectCreatedAt || firstProjectCreatedAt,
      },
    }))
    trackEvent('project', 'project_create', {
      source: 'first-value-guide',
      milestone: 'first-project-created',
    })
  }, [projectsCount, defaultProjectsCount, trackEvent])

  useEffect(() => {
    if (!firstValueAiSuccess || firstValueAiTrackedRef.current) return
    firstValueAiTrackedRef.current = true
    const firstAiSuccessAt = new Date().toISOString()
    setSessionSummary((current) => ({
      ...current,
      milestones: {
        ...current.milestones,
        firstAiSuccessAt: current.milestones.firstAiSuccessAt || firstAiSuccessAt,
      },
    }))
    trackEvent('ai', 'ai_chat', {
      source: 'first-value-guide',
      milestone: 'first-ai-success',
    })
  }, [firstValueAiSuccess, trackEvent])

  useEffect(() => {
    if (!firstValueOpenedIde || firstValueIdeTrackedRef.current) return
    firstValueIdeTrackedRef.current = true
    const firstIdeOpenedAt = new Date().toISOString()
    setSessionSummary((current) => ({
      ...current,
      milestones: {
        ...current.milestones,
        firstIdeOpenedAt: current.milestones.firstIdeOpenedAt || firstIdeOpenedAt,
      },
    }))
    trackEvent('engine', 'editor_open', {
      source: 'first-value-guide',
      milestone: 'first-ide-opened',
    })
  }, [firstValueOpenedIde, trackEvent])

  return useMemo(() => sessionSummary, [sessionSummary])
}
