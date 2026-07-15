/**
 * Letter cx — Hot-fix event bus (event-driven) vs Weekly Evolution cadence.
 * Founder thesis: no 24/7 Opus polling — hot fixes react to events; evolution is weekly.
 */

import { randomUUID } from 'crypto'
import { createComponentLogger } from '@/lib/observability/logger'
import type { ForgeWorkDomain } from '@/lib/ai/domain-economic-router-policy'

const log = createComponentLogger('hot-fix-event-bus')

export const HOT_FIX_EVENT_BUS_LETTER = 'cx' as const
export const HOT_FIX_EVENT_BUS_WIRED = true as const

/** Cadence doctrine — “30 years in 2” without continuous Premium burn */
export type ForgeCadence = 'hot-fix' | 'weekly-evolution'

export type HotFixSeverity = 'blocker' | 'regression' | 'soak-fail' | 'lazy-reject' | 'l5-fail'

export interface HotFixEvent {
  eventId: string
  projectId: string
  severity: HotFixSeverity
  domain: ForgeWorkDomain
  summary: string
  evidenceRef?: string
  createdAt: string
  /** True when this may enqueue a hot AutonomousEngineerLoop cell — not weekly planner */
  eventDriven: true
  /** Never schedules continuous Opus polling */
  continuousPollingForbidden: true
}

export type HotFixListener = (event: HotFixEvent) => void | Promise<void>

export interface HotFixEnqueueResult {
  accepted: true
  event: HotFixEvent
  cadence: 'hot-fix'
}

export interface HotFixRejectResult {
  accepted: false
  reason: 'continuous_polling_forbidden' | 'empty_summary'
  settleZero: true
}

const listeners = new Set<HotFixListener>()
const recent: HotFixEvent[] = []
const MAX_RECENT = 64

export function subscribeHotFixEvents(listener: HotFixListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function listRecentHotFixEvents(): readonly HotFixEvent[] {
  return recent
}

export function __resetHotFixEventBusForTests(): void {
  listeners.clear()
  recent.length = 0
}

/**
 * Enqueue an event-driven hot fix. Rejects any attempt to mark continuous polling.
 */
export async function enqueueHotFixEvent(input: {
  projectId: string
  severity: HotFixSeverity
  domain: ForgeWorkDomain
  summary: string
  evidenceRef?: string
  /** Must never be true — Founder cadence doctrine */
  continuousPolling?: boolean
}): Promise<HotFixEnqueueResult | HotFixRejectResult> {
  if (input.continuousPolling === true) {
    log.warn('hot_fix_continuous_polling_rejected', { projectId: input.projectId })
    return {
      accepted: false,
      reason: 'continuous_polling_forbidden',
      settleZero: true,
    }
  }
  const summary = input.summary.trim()
  if (!summary) {
    return { accepted: false, reason: 'empty_summary', settleZero: true }
  }

  const event: HotFixEvent = {
    eventId: randomUUID(),
    projectId: input.projectId,
    severity: input.severity,
    domain: input.domain,
    summary,
    evidenceRef: input.evidenceRef,
    createdAt: new Date().toISOString(),
    eventDriven: true,
    continuousPollingForbidden: true,
  }

  recent.unshift(event)
  if (recent.length > MAX_RECENT) recent.length = MAX_RECENT

  log.info('hot_fix_enqueued', {
    eventId: event.eventId,
    severity: event.severity,
    domain: event.domain,
    letter: HOT_FIX_EVENT_BUS_LETTER,
  })

  for (const listener of listeners) {
    await listener(event)
  }

  return { accepted: true, event, cadence: 'hot-fix' }
}

export function assertCadenceNotContinuousOpus(cadence: ForgeCadence): boolean {
  return cadence === 'hot-fix' || cadence === 'weekly-evolution'
}
