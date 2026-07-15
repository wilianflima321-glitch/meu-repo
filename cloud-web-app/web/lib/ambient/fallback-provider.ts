/**
 * Graceful ambient emotion fallback — Ethernet / no CSI → gameplay heuristics.
 * Never claims CSI BPM. Path: lib/ambient/fallback-provider.ts
 */

import { randomUUID } from 'crypto'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  probeAmbientCapability,
  type AmbientCapabilityProbeInput,
} from './capability'
import type {
  AmbientDeltaEvent,
  AmbientEmotionDelta,
  AmbientEmotionLabel,
  GameplayAffectHeuristicInput,
} from './types'

const log = createComponentLogger('ambient-fallback-provider')

export interface AmbientEmotionProvider {
  readonly id: string
  /** Produce emotion delta; CSI path returns held/absent until driver proven */
  sampleEmotion(input?: GameplayAffectHeuristicInput): AmbientEmotionDelta
  /** Emit delta event for subscribers / BT ports */
  emitDelta(input?: GameplayAffectHeuristicInput): AmbientDeltaEvent
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

/**
 * Map gameplay signals → AmbientEmotionLabel without inventing physiology.
 */
export function inferGameplayEmotion(
  input: GameplayAffectHeuristicInput = {},
): AmbientEmotionDelta {
  const now = input.nowMs ?? Date.now()
  if (input.absent) {
    return {
      label: 'absent',
      confidence: 0.9,
      source: 'gameplay_heuristic',
      heartRateHeld: true,
      breathRateHeld: true,
      emittedAtMs: now,
    }
  }

  const damage = clamp01(input.damageIntensity ?? 0)
  const exertion = clamp01(input.exertion ?? 0)
  const threatRecent =
    input.msSinceThreat !== undefined ? input.msSinceThreat < 3_000 : false

  let label: AmbientEmotionLabel = 'calm'
  let confidence = 0.55

  if (damage >= 0.75 || (threatRecent && damage >= 0.4)) {
    label = 'panicked'
    confidence = 0.65 + damage * 0.25
  } else if (damage >= 0.35 || exertion >= 0.7 || threatRecent) {
    label = 'stressed'
    confidence = 0.6 + Math.max(damage, exertion) * 0.25
  } else {
    label = 'calm'
    confidence = 0.7
  }

  return {
    label,
    confidence: clamp01(confidence),
    source: 'gameplay_heuristic',
    heartRateHeld: true,
    breathRateHeld: true,
    emittedAtMs: now,
  }
}

/**
 * CSI provider stub — always held until real NIC + TinyML acceptance.
 * Returns absent/low-confidence calm with held physiology when forced.
 */
export function createHeldCsiEmotionProvider(): AmbientEmotionProvider {
  return {
    id: 'csi-tinyml-held',
    sampleEmotion(input = {}) {
      const now = input.nowMs ?? Date.now()
      log.info('csi_emotion_held_noop', { reason: 'no_csi_driver' })
      return {
        label: input.absent ? 'absent' : 'calm',
        confidence: 0,
        source: 'csi_tinyml',
        heartRateHeld: true,
        breathRateHeld: true,
        emittedAtMs: now,
      }
    },
    emitDelta(input = {}) {
      const emotion = this.sampleEmotion(input)
      return {
        eventId: randomUUID(),
        kind: 'emotion',
        critical: false,
        emotion,
        emittedAtMs: emotion.emittedAtMs,
      }
    },
  }
}

/**
 * Gameplay-heuristic provider — production-safe fallback when csiReady: false.
 */
export function createGameplayHeuristicEmotionProvider(): AmbientEmotionProvider {
  let previousLabel: AmbientEmotionLabel | undefined

  return {
    id: 'gameplay-heuristic',
    sampleEmotion(input = {}) {
      const emotion = inferGameplayEmotion(input)
      emotion.previousLabel = previousLabel
      previousLabel = emotion.label
      return emotion
    },
    emitDelta(input = {}) {
      const emotion = this.sampleEmotion(input)
      const critical =
        emotion.label === 'panicked' ||
        (emotion.label === 'stressed' &&
          emotion.previousLabel !== undefined &&
          emotion.previousLabel !== emotion.label)
      return {
        eventId: randomUUID(),
        kind: 'emotion',
        critical,
        emotion,
        emittedAtMs: emotion.emittedAtMs,
      }
    },
  }
}

/**
 * Select provider from capability probe — never pretends CSI is live on Ethernet.
 */
export function resolveAmbientEmotionProvider(
  probeInput: AmbientCapabilityProbeInput = {},
): AmbientEmotionProvider {
  const cap = probeAmbientCapability(probeInput)
  if (cap.csiReady && cap.tinymlReady) {
    // Future: return live CSI provider. Scaffold still routes to held CSI
    // until acceptance suite flips marketing + soak evidence.
    log.info('ambient_provider_csi_provisional_held', {
      note: 'csiReady provisional — live TinyML provider not shipped; heuristic fallback',
    })
  }
  return createGameplayHeuristicEmotionProvider()
}
