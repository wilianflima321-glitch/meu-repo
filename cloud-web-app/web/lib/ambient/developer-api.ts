/**
 * Developer API surface — `aethel/ambient` style.
 * Subscribe emotion, heartbeat spikes, capability probe — honest degradation.
 * Zero-UI: missing CSI / probe fail never throws user-visible errors; classic heuristic path.
 * Path: lib/ambient/developer-api.ts
 */

import { createComponentLogger } from '@/lib/observability/logger'
import { evaluateAmbientHonesty, probeAmbientCapability } from './capability'
import {
  createAmbientCostGuardSuppressor,
  type AmbientCostGuardSuppressor,
  type AmbientEscalationDecision,
} from './cost-guard-suppressor'
import {
  createGameplayHeuristicEmotionProvider,
  resolveAmbientEmotionProvider,
  type AmbientEmotionProvider,
} from './fallback-provider'
import { evaluateAmbientFocusLock } from './camera-csi-lock'
import {
  buildAmbientApexMoAPort,
  buildAmbientNpcBtPort,
  buildAmbientPhysicsPort,
  type AmbientApexMoAPort,
  type AmbientNpcBtPort,
  type AmbientPhysicsPort,
} from './ports'
import type {
  AmbientCapabilityProbeInput,
  AmbientCapabilitySnapshot,
  AmbientDeltaEvent,
  AmbientEmotionDelta,
  AmbientFocusLockRequest,
  AmbientFocusLockState,
  GameplayAffectHeuristicInput,
} from './types'

const log = createComponentLogger('aethel-ambient-api')

export type AmbientEmotionListener = (delta: AmbientEmotionDelta, event: AmbientDeltaEvent) => void
export type AmbientHeartbeatSpikeListener = (event: AmbientDeltaEvent) => void

export interface AethelAmbientApi {
  /** Capability probe — csiReady false on Ethernet / no driver */
  probeCapability(input?: AmbientCapabilityProbeInput): AmbientCapabilitySnapshot
  /** Honesty report for IDE badges / Critic */
  evaluateHonesty(input?: AmbientCapabilityProbeInput): ReturnType<typeof evaluateAmbientHonesty>
  /** Subscribe to emotion deltas (heuristic or future CSI) */
  onEmotion(listener: AmbientEmotionListener): () => void
  /**
   * Heartbeat spike hook — fires only when event.kind === heartbeat_spike.
   * CSI BPM spikes [HELD]; gameplay may emit held:true synthetic spikes for BT tests.
   */
  onPlayerHeartbeatSpike(listener: AmbientHeartbeatSpikeListener): () => void
  /** Push gameplay heuristic sample (tests / host without CSI) */
  ingestGameplayHeuristic(input: GameplayAffectHeuristicInput): AmbientDeltaEvent
  /**
   * Evaluate whether Apex MoA / cloud emotion may run (CostGuard companion).
   * On reject: settleOnReject: 0 — caller must not reserve/settle paid legs.
   */
  evaluateCloudEscalation(event: AmbientDeltaEvent): AmbientEscalationDecision
  /** Record successful cloud escalation after CostGuard settle */
  recordCloudEscalation(atMs?: number): void
  /** Camera+CSI focus lock — [HELD] without camera pipeline */
  evaluateFocusLock(
    request: AmbientFocusLockRequest,
    probeInput?: AmbientCapabilityProbeInput,
  ): AmbientFocusLockState
  /** Typed MoA port (undefined when suppressed) */
  toApexMoAPort(event: AmbientDeltaEvent): AmbientApexMoAPort | undefined
  /** Typed NPC BT port */
  toNpcBtPort(emotion: AmbientEmotionDelta): AmbientNpcBtPort
  /**
   * Typed World/Character physics port (letter ba + bb honesty stamp).
   * Default classic no-op when csiReady false unless enhancementActive forced.
   * `activeRagdollHeld` defaults true until Law III apply honesty flips ready.
   */
  toPhysicsPort(
    emotion: AmbientEmotionDelta | undefined,
    options?: { enhancementActive?: boolean; activeRagdollHeld?: boolean },
  ): AmbientPhysicsPort
  /** Expose suppressor for tests */
  getSuppressor(): AmbientCostGuardSuppressor
  /** Active emotion provider id */
  getProviderId(): string
}

export interface CreateAethelAmbientApiOptions {
  probeInput?: AmbientCapabilityProbeInput
  provider?: AmbientEmotionProvider
  suppressor?: AmbientCostGuardSuppressor
}

/**
 * Create the `aethel/ambient` developer surface.
 * Default: gameplay heuristic + CostGuard suppressor; CSI path held.
 */
export function createAethelAmbientApi(
  options: CreateAethelAmbientApiOptions = {},
): AethelAmbientApi {
  const probeInput = options.probeInput ?? {}
  const provider =
    options.provider ??
    resolveAmbientEmotionProvider(probeInput) ??
    createGameplayHeuristicEmotionProvider()
  const suppressor = options.suppressor ?? createAmbientCostGuardSuppressor()

  const emotionListeners = new Set<AmbientEmotionListener>()
  const spikeListeners = new Set<AmbientHeartbeatSpikeListener>()

  function dispatch(event: AmbientDeltaEvent) {
    // Zero-UI: listener failures must not surface as gameplay errors
    if (event.emotion) {
      for (const listener of emotionListeners) {
        try {
          listener(event.emotion, event)
        } catch (err) {
          log.info('ambient_emotion_listener_swallowed', {
            message: err instanceof Error ? err.message : 'unknown',
          })
        }
      }
    }
    if (event.kind === 'heartbeat_spike') {
      for (const listener of spikeListeners) {
        try {
          listener(event)
        } catch (err) {
          log.info('ambient_spike_listener_swallowed', {
            message: err instanceof Error ? err.message : 'unknown',
          })
        }
      }
    }
  }

  log.info('aethel_ambient_api_created', { providerId: provider.id })

  return {
    probeCapability(input) {
      return probeAmbientCapability(input ?? probeInput)
    },
    evaluateHonesty(input) {
      return evaluateAmbientHonesty(input ?? probeInput)
    },
    onEmotion(listener) {
      emotionListeners.add(listener)
      return () => {
        emotionListeners.delete(listener)
      }
    },
    onPlayerHeartbeatSpike(listener) {
      spikeListeners.add(listener)
      return () => {
        spikeListeners.delete(listener)
      }
    },
    ingestGameplayHeuristic(input) {
      const event = provider.emitDelta(input)
      dispatch(event)
      return event
    },
    evaluateCloudEscalation(event) {
      const cap = probeAmbientCapability(probeInput)
      return suppressor.evaluate(event, { csiProven: cap.csiReady && cap.tinymlReady })
    },
    recordCloudEscalation(atMs) {
      suppressor.recordEscalation(atMs)
    },
    evaluateFocusLock(request, input) {
      return evaluateAmbientFocusLock(request, input ?? probeInput)
    },
    toApexMoAPort(event) {
      const decision = this.evaluateCloudEscalation(event)
      return buildAmbientApexMoAPort(event, decision)
    },
    toNpcBtPort(emotion) {
      return buildAmbientNpcBtPort(emotion)
    },
    toPhysicsPort(emotion, options) {
      let enhancementActive = options?.enhancementActive === true
      if (options?.enhancementActive === undefined) {
        try {
          enhancementActive = probeAmbientCapability(probeInput).csiReady === true
        } catch {
          enhancementActive = false
        }
      }
      return buildAmbientPhysicsPort(emotion, {
        enhancementActive,
        activeRagdollHeld: options?.activeRagdollHeld,
      })
    },
    getSuppressor() {
      return suppressor
    },
    getProviderId() {
      return provider.id
    },
  }
}

/** Singleton-style helper for IDE imports — `import { aethelAmbient } from '@/lib/ambient'` */
let defaultApi: AethelAmbientApi | undefined

export function getAethelAmbientApi(): AethelAmbientApi {
  if (!defaultApi) {
    defaultApi = createAethelAmbientApi()
  }
  return defaultApi
}

/** Test-only reset */
export function resetAethelAmbientApiForTests(): void {
  defaultApi = undefined
}
