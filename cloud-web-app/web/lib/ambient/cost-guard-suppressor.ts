/**
 * Ambient → cloud LLM escalation suppressor (Law XVI CostGuard companion).
 * Edge 60Hz / TinyML stays $0; cloud emotion only on critical deltas, rate-limited.
 * Reject → settle: 0 (never charge for suppressed escalations).
 * Path: lib/ambient/cost-guard-suppressor.ts
 */

import { createComponentLogger } from '@/lib/observability/logger'
import type { AmbientDeltaEvent, AmbientEmotionDelta, AmbientEmotionLabel } from './types'

const log = createComponentLogger('ambient-cost-guard-suppressor')

export interface AmbientLlmEscalationPolicy {
  /** Max critical cloud escalations per window */
  maxCriticalEscalations: number
  /** Window length (ms) */
  windowMs: number
  /** Minimum ms between escalations (debounce) */
  debounceMs: number
  /** Labels that may escalate when confidence ≥ minConfidence */
  criticalLabels: AmbientEmotionLabel[]
  /** Minimum confidence to consider critical */
  minConfidence: number
}

export const DEFAULT_AMBIENT_LLM_ESCALATION_POLICY: AmbientLlmEscalationPolicy = {
  maxCriticalEscalations: 3,
  windowMs: 60_000,
  debounceMs: 5_000,
  criticalLabels: ['stressed', 'panicked'],
  minConfidence: 0.72,
}

export type AmbientEscalationDecision =
  | {
      allow: true
      reason: 'critical_delta'
      settleOnReject: 0
    }
  | {
      allow: false
      reason:
        | 'not_critical'
        | 'debounced'
        | 'rate_limited'
        | 'low_confidence'
        | 'csi_unproven_held'
      /** Law XVI: suppressed escalation never bills — settle: 0 */
      settleOnReject: 0
      message: string
    }

export interface AmbientCostGuardSuppressor {
  evaluate(event: AmbientDeltaEvent, opts?: { csiProven?: boolean }): AmbientEscalationDecision
  /** Record a successful cloud dispatch (counts against window) */
  recordEscalation(atMs?: number): void
  /** Reset window (tests) */
  reset(): void
  getPolicy(): AmbientLlmEscalationPolicy
}

function isCriticalEmotion(
  emotion: AmbientEmotionDelta | undefined,
  policy: AmbientLlmEscalationPolicy,
): boolean {
  if (!emotion) return false
  if (!policy.criticalLabels.includes(emotion.label)) return false
  if (emotion.confidence < policy.minConfidence) return false
  // Label change or first emission
  if (emotion.previousLabel && emotion.previousLabel === emotion.label) {
    // Same label — only escalate if still critical spike kind
    return false
  }
  return true
}

/**
 * Create suppressor. Cloud LLM listen path must call evaluate() before CostGuard reserve.
 * On allow:false always settleOnReject: 0 — no UsageBucket debit for suppressed legs.
 */
export function createAmbientCostGuardSuppressor(
  policy: Partial<AmbientLlmEscalationPolicy> = {},
): AmbientCostGuardSuppressor {
  const resolved: AmbientLlmEscalationPolicy = {
    ...DEFAULT_AMBIENT_LLM_ESCALATION_POLICY,
    ...policy,
  }
  const escalationTimestamps: number[] = []
  let lastEscalationMs = 0

  function prune(now: number) {
    const cutoff = now - resolved.windowMs
    while (escalationTimestamps.length > 0 && escalationTimestamps[0]! < cutoff) {
      escalationTimestamps.shift()
    }
  }

  return {
    getPolicy() {
      return { ...resolved }
    },
    reset() {
      escalationTimestamps.length = 0
      lastEscalationMs = 0
    },
    recordEscalation(atMs = Date.now()) {
      prune(atMs)
      escalationTimestamps.push(atMs)
      lastEscalationMs = atMs
    },
    evaluate(event, opts = {}) {
      const now = event.emittedAtMs || Date.now()
      prune(now)

      // CSI-sourced critical claims without proven path → hold (gameplay heuristic may still escalate)
      if (
        event.emotion?.source === 'csi_tinyml' &&
        opts.csiProven !== true
      ) {
        const decision: AmbientEscalationDecision = {
          allow: false,
          reason: 'csi_unproven_held',
          settleOnReject: 0,
          message:
            'CSI TinyML emotion [HELD] — do not escalate cloud LLM on unproven physiological claims',
        }
        log.info('ambient_escalation_suppressed', { reason: decision.reason })
        return decision
      }

      if (!event.critical && event.kind !== 'heartbeat_spike') {
        return {
          allow: false,
          reason: 'not_critical',
          settleOnReject: 0,
          message: 'Routine ambient delta stays on edge/$0 path — no cloud LLM',
        }
      }

      if (event.emotion && event.emotion.confidence < resolved.minConfidence) {
        return {
          allow: false,
          reason: 'low_confidence',
          settleOnReject: 0,
          message: `Confidence ${event.emotion.confidence} below min ${resolved.minConfidence}`,
        }
      }

      const emotionCritical =
        event.kind === 'heartbeat_spike' ||
        isCriticalEmotion(event.emotion, resolved) ||
        (event.critical &&
          event.emotion &&
          resolved.criticalLabels.includes(event.emotion.label))

      if (!emotionCritical && event.kind !== 'heartbeat_spike') {
        return {
          allow: false,
          reason: 'not_critical',
          settleOnReject: 0,
          message: 'Delta not in critical label set / no label transition',
        }
      }

      // Heartbeat spikes from unproven CSI stay held
      if (
        event.kind === 'heartbeat_spike' &&
        event.heartbeatSpike?.held === true &&
        opts.csiProven !== true
      ) {
        return {
          allow: false,
          reason: 'csi_unproven_held',
          settleOnReject: 0,
          message: 'Heartbeat spike from unproven CSI [HELD] — settle: 0',
        }
      }

      if (lastEscalationMs > 0 && now - lastEscalationMs < resolved.debounceMs) {
        return {
          allow: false,
          reason: 'debounced',
          settleOnReject: 0,
          message: `Debounced — wait ${resolved.debounceMs}ms between cloud escalations`,
        }
      }

      if (escalationTimestamps.length >= resolved.maxCriticalEscalations) {
        return {
          allow: false,
          reason: 'rate_limited',
          settleOnReject: 0,
          message: `Rate limited — max ${resolved.maxCriticalEscalations} escalations / ${resolved.windowMs}ms`,
        }
      }

      log.info('ambient_escalation_allowed', {
        kind: event.kind,
        label: event.emotion?.label,
      })

      return {
        allow: true,
        reason: 'critical_delta',
        settleOnReject: 0,
      }
    },
  }
}
