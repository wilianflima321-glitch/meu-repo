/**
 * K.0/J AmbientEmotionDelta live wire — MoA (CostGuard-critical) + local NPC BT ($0)
 * + World/Character physics subscribe (letter ba).
 * Enhancement-only: missing CSI → classic physics no-op / heuristic BT; Zero-UI.
 * Path: lib/ambient/live-wire.ts
 */

import { createComponentLogger } from '@/lib/observability/logger'
import type { Blackboard } from '@/lib/ai/behavior-tree-blackboard'
import {
  settleCreativeCostZero,
  type CostGuardLedgerAdapter,
  type CreativeCostReservation,
} from '@/lib/production/creative-cost-guard'
import type { AethelAmbientApi } from './developer-api'
import {
  buildAmbientApexMoAPort,
  buildAmbientNpcBtPort,
  buildAmbientPhysicsPort,
  buildClassicAmbientPhysicsPort,
  priorityBiasFromEmotion,
  type AmbientApexMoAPort,
  type AmbientNpcPriorityBias,
  type AmbientPhysicsPort,
} from './ports'
import type {
  AmbientCapabilityProbeInput,
  AmbientDeltaEvent,
  AmbientEmotionDelta,
  AmbientEmotionLabel,
} from './types'
import type { AmbientEscalationDecision } from './cost-guard-suppressor'

const log = createComponentLogger('ambient-live-wire')

export type { AmbientNpcPriorityBias }

export const AMBIENT_BT_KEYS = {
  emotion: 'ambientEmotion',
  confidence: 'ambientConfidence',
  source: 'ambientSource',
  heartRateHeld: 'heartRateHeld',
  npcPriorityBias: 'ambientNpcPriorityBias',
  lastEmittedAtMs: 'ambientLastEmittedAtMs',
} as const

export function recomputeNpcPriorityBias(
  label: AmbientEmotionLabel,
): AmbientNpcPriorityBias {
  return priorityBiasFromEmotion(label)
}

export function applyAmbientEmotionToBlackboard(
  blackboard: Blackboard | null | undefined,
  emotion: AmbientEmotionDelta,
): AmbientNpcPriorityBias | undefined {
  if (!blackboard) return undefined
  const port = buildAmbientNpcBtPort(emotion)
  const bias = recomputeNpcPriorityBias(emotion.label)
  blackboard.set(AMBIENT_BT_KEYS.emotion, port.blackboardKeys.ambientEmotion)
  blackboard.set(AMBIENT_BT_KEYS.confidence, port.blackboardKeys.ambientConfidence)
  blackboard.set(AMBIENT_BT_KEYS.source, port.blackboardKeys.ambientSource)
  blackboard.set(AMBIENT_BT_KEYS.heartRateHeld, port.blackboardKeys.heartRateHeld)
  blackboard.set(AMBIENT_BT_KEYS.npcPriorityBias, bias)
  blackboard.set(AMBIENT_BT_KEYS.lastEmittedAtMs, emotion.emittedAtMs)
  return bias
}

export type AmbientMoAEscalationListener = (payload: {
  event: AmbientDeltaEvent
  decision: AmbientEscalationDecision
  moaPort: AmbientApexMoAPort
}) => void

export type AmbientBtEmotionListener = (payload: {
  emotion: AmbientEmotionDelta
  event: AmbientDeltaEvent
  priorityBias: AmbientNpcPriorityBias
}) => void

/** Physics / ragdoll / character-motion hint listener (letter ba). */
export type AmbientPhysicsHintListener = (payload: {
  emotion: AmbientEmotionDelta
  event: AmbientDeltaEvent
  physicsPort: AmbientPhysicsPort
  csiReady: boolean
}) => void

export interface AmbientLiveWireOptions {
  api: AethelAmbientApi
  blackboards?: Array<Blackboard | null | undefined>
  onMoAEscalation?: AmbientMoAEscalationListener
  onBtEmotion?: AmbientBtEmotionListener
  /**
   * World/Character physics subscribe.
   * Classic no-op when csiReady false unless physicsEnhancementActive forced.
   */
  onPhysicsHint?: AmbientPhysicsHintListener
  /**
   * Opt-in enhancement for physics hints without CSI hardware (tests / Founder).
   * Default: enhancement only when probe csiReady === true.
   */
  physicsEnhancementActive?: boolean
  /**
   * Law III honesty stamp (letter bb). Default true (held) until apply + Rapier ready.
   * CSI remains independent — this does not flip physiologyHeld.
   */
  activeRagdollHeld?: boolean
  costGuardAdapter?: CostGuardLedgerAdapter
}

export interface AmbientLiveWireHandle {
  stop: () => void
  getLatestMoASlice: () => AmbientApexMoAPort['ambientEmotionSlice'] | undefined
  getLatestEmotion: () => AmbientEmotionDelta | undefined
  getLatestPhysicsPort: () => AmbientPhysicsPort | undefined
  getLastDecision: () => AmbientEscalationDecision | undefined
  settleRejectedReservation: (
    reservation: CreativeCostReservation | undefined,
  ) => Promise<void>
}

function resolvePhysicsEnhancement(
  api: AethelAmbientApi,
  forced: boolean | undefined,
): { enhancementActive: boolean; csiReady: boolean } {
  let csiReady = false
  try {
    csiReady = api.probeCapability().csiReady === true
  } catch {
    csiReady = false
  }
  if (forced === true) {
    return { enhancementActive: true, csiReady }
  }
  if (forced === false) {
    return { enhancementActive: false, csiReady }
  }
  return { enhancementActive: csiReady, csiReady }
}

export function wireAmbientEmotionDeltaLive(
  options: AmbientLiveWireOptions,
): AmbientLiveWireHandle {
  const {
    api,
    blackboards = [],
    onMoAEscalation,
    onBtEmotion,
    onPhysicsHint,
    physicsEnhancementActive,
    activeRagdollHeld,
    costGuardAdapter,
  } = options

  let latestEmotion: AmbientEmotionDelta | undefined
  let latestMoASlice: AmbientApexMoAPort['ambientEmotionSlice'] | undefined
  let latestPhysicsPort: AmbientPhysicsPort | undefined
  let lastDecision: AmbientEscalationDecision | undefined

  try {
    const cap = api.probeCapability()
    if (!cap.csiReady) {
      log.info('ambient_live_wire_classic_path', {
        linkMedium: cap.linkMedium,
        note: 'csiReady false - gameplay heuristic / classic BT+physics; Zero-UI',
      })
    }
  } catch {
    log.info('ambient_live_wire_probe_swallowed', {
      note: 'capability probe threw - classic path continues',
    })
  }

  const unsub = api.onEmotion((emotion, event) => {
    latestEmotion = emotion

    let priorityBias: AmbientNpcPriorityBias = 'normal'
    for (const board of blackboards) {
      const bias = applyAmbientEmotionToBlackboard(board, emotion)
      if (bias) priorityBias = bias
    }
    if (blackboards.length === 0) {
      priorityBias = recomputeNpcPriorityBias(emotion.label)
    }
    onBtEmotion?.({ emotion, event, priorityBias })

    const { enhancementActive, csiReady } = resolvePhysicsEnhancement(
      api,
      physicsEnhancementActive,
    )
    const physicsPort = buildAmbientPhysicsPort(emotion, {
      enhancementActive,
      activeRagdollHeld,
    })
    latestPhysicsPort = physicsPort
    onPhysicsHint?.({ emotion, event, physicsPort, csiReady })

    const decision = api.evaluateCloudEscalation(event)
    lastDecision = decision
    if (!decision.allow) {
      latestMoASlice = undefined
      log.info('ambient_moa_suppressed', {
        reason: decision.reason,
        settleOnReject: decision.settleOnReject,
      })
      return
    }

    const moaPort = buildAmbientApexMoAPort(event, decision)
    if (!moaPort?.ambientEmotionSlice) {
      latestMoASlice = undefined
      return
    }

    latestMoASlice = moaPort.ambientEmotionSlice
    api.recordCloudEscalation(event.emittedAtMs)
    onMoAEscalation?.({ event, decision, moaPort })
    log.info('ambient_moa_escalation_allowed', {
      label: emotion.label,
      source: emotion.source,
    })
  })

  return {
    stop: () => {
      unsub()
    },
    getLatestMoASlice: () => latestMoASlice,
    getLatestEmotion: () => latestEmotion,
    getLatestPhysicsPort: () => latestPhysicsPort,
    getLastDecision: () => lastDecision,
    async settleRejectedReservation(reservation) {
      if (!reservation || !costGuardAdapter) return
      if (lastDecision && !lastDecision.allow) {
        await settleCreativeCostZero(reservation.reservationId, costGuardAdapter)
      }
    },
  }
}

export function silentAmbientStartupProbe(
  api: AethelAmbientApi,
  input?: AmbientCapabilityProbeInput,
): {
  csiReady: boolean
  classicPath: true
  errorSurface: null
} {
  try {
    const cap = api.probeCapability(input)
    return {
      csiReady: cap.csiReady === true,
      classicPath: true,
      errorSurface: null,
    }
  } catch {
    return {
      csiReady: false,
      classicPath: true,
      errorSurface: null,
    }
  }
}

/** Singleton MoA listen handle — CostGuard suppressor gated. */
let moaWire: AmbientLiveWireHandle | undefined
let moaApi: AethelAmbientApi | undefined

export function subscribeAmbientEmotionForMoA(
  options: AmbientLiveWireOptions,
): AmbientLiveWireHandle {
  if (moaWire) return moaWire
  moaApi = options.api
  moaWire = wireAmbientEmotionDeltaLive(options)
  return moaWire
}

export function getAmbientMoALiveWire(): AmbientLiveWireHandle | undefined {
  return moaWire
}

/** Test-only reset of MoA singleton listen path */
export function resetAmbientMoALiveWireForTests(): void {
  moaWire?.stop()
  moaWire = undefined
  moaApi = undefined
}

/** Singleton physics subscribe handle — classic no-op when CSI absent. */
let physicsWire: AmbientLiveWireHandle | undefined

export interface AmbientPhysicsSubscribeOptions {
  api: AethelAmbientApi
  onPhysicsHint?: AmbientPhysicsHintListener
  /**
   * Force enhancement path without CSI hardware (heuristic posture hints).
   * Default false → classic no-op when csiReady false.
   */
  enhancementActive?: boolean
  /**
   * Law III honesty stamp (letter bb). Default true (held) until apply + Rapier ready.
   */
  activeRagdollHeld?: boolean
}

export interface AmbientPhysicsSubscribeHandle {
  stop: () => void
  getLatestPhysicsPort: () => AmbientPhysicsPort | undefined
  getLatestEmotion: () => AmbientEmotionDelta | undefined
  /** Always null — Zero-UI; never toast / never throw surface */
  errorSurface: null
}

/**
 * Subscribe Rapier / Active Ragdoll / character motion to AmbientEmotionDelta.
 * Missing CSI → classic no-op port (safe). Enhancement opt-in applies posture/priority hints
 * without requiring hardware. Never auto-applies Rapier forces.
 */
export function subscribeAmbientEmotionForPhysics(
  options: AmbientPhysicsSubscribeOptions,
): AmbientPhysicsSubscribeHandle {
  if (physicsWire) {
    return {
      stop: () => {
        physicsWire?.stop()
        physicsWire = undefined
      },
      getLatestPhysicsPort: () => physicsWire?.getLatestPhysicsPort(),
      getLatestEmotion: () => physicsWire?.getLatestEmotion(),
      errorSurface: null,
    }
  }

  try {
    const silent = silentAmbientStartupProbe(options.api)
    if (!silent.csiReady && options.enhancementActive !== true) {
      log.info('ambient_physics_subscribe_classic', {
        note: 'csiReady false - classic no-op physics path; Zero-UI',
      })
    }
  } catch {
    log.info('ambient_physics_subscribe_probe_swallowed', {
      note: 'probe threw - classic physics path continues',
    })
  }

  physicsWire = wireAmbientEmotionDeltaLive({
    api: options.api,
    onPhysicsHint: options.onPhysicsHint,
    physicsEnhancementActive: options.enhancementActive,
    activeRagdollHeld: options.activeRagdollHeld,
  })

  return {
    stop: () => {
      physicsWire?.stop()
      physicsWire = undefined
    },
    getLatestPhysicsPort: () => physicsWire?.getLatestPhysicsPort(),
    getLatestEmotion: () => physicsWire?.getLatestEmotion(),
    errorSurface: null,
  }
}

export function getAmbientPhysicsLiveWire(): AmbientLiveWireHandle | undefined {
  return physicsWire
}

/** Test-only reset of physics singleton subscribe path */
export function resetAmbientPhysicsLiveWireForTests(): void {
  physicsWire?.stop()
  physicsWire = undefined
}

/**
 * Resolve classic vs enhanced physics port without wiring a bus.
 * Safe when CSI missing — returns classic no-op.
 */
export function resolveAmbientPhysicsPortForConsumer(
  api: AethelAmbientApi,
  emotion: AmbientEmotionDelta | undefined,
  options?: { enhancementActive?: boolean; activeRagdollHeld?: boolean },
): AmbientPhysicsPort {
  try {
    const { enhancementActive } = resolvePhysicsEnhancement(
      api,
      options?.enhancementActive,
    )
    return buildAmbientPhysicsPort(emotion, {
      enhancementActive,
      activeRagdollHeld: options?.activeRagdollHeld,
    })
  } catch {
    return buildClassicAmbientPhysicsPort({
      activeRagdollHeld: options?.activeRagdollHeld,
    })
  }
}

/**
 * Append suppressor-allowed ambient slice to MoA prompt.
 * No-op when undefined (settle:0 / suppressed — no pack pollution).
 */
export function appendAmbientSliceToMoAPrompt(
  prompt: string,
  slice: AmbientApexMoAPort['ambientEmotionSlice'] | undefined,
): string {
  if (!slice) return prompt
  return [
    prompt,
    '',
    '=== AmbientEmotionDelta (critical, CostGuard-gated) ===',
    `label: ${slice.label}`,
    `confidence: ${slice.confidence}`,
    `source: ${slice.source}`,
    'physiologyHeld: true',
    '=== end ambient ===',
  ].join('\n')
}

/**
 * Stamp MultiSurface pack ambientCriticalDelta only after suppressor allow.
 */
export function applyAmbientSliceToMultiSurfacePack<
  T extends {
    ambientCriticalDelta?: {
      label: 'calm' | 'stressed' | 'panicked' | 'absent'
      confidence: number
      source: string
      physiologyHeld: true
    }
  },
>(pack: T, slice: AmbientApexMoAPort['ambientEmotionSlice'] | undefined): T {
  if (!slice) return pack
  pack.ambientCriticalDelta = {
    label: slice.label,
    confidence: slice.confidence,
    source: slice.source,
    physiologyHeld: true,
  }
  return pack
}
