/**
 * Onda K / M — Ambient + Affective Computing contracts (K.0 / M.0 scaffolding).
 * Zero-MVP: CSI / TinyML / camera fusion remain [HELD] until hardware path proven.
 * Path: lib/ambient/types.ts
 */

/** Channel-state information sample from Wi-Fi NIC — HELD without real CSI driver. */
export interface CsiSample {
  /** Monotonic capture time (ms, edge clock) */
  capturedAtMs: number
  /** Subcarrier amplitudes — length depends on NIC; empty when unsupported */
  amplitudes: Float32Array
  /** Subcarrier phases — may be empty if NIC exposes amplitude-only */
  phases: Float32Array
  /** Nominal capture rate target (Hz). Edge path aims for 60; not a production claim. */
  nominalHz: 60
  /** NIC / driver provenance — never invent unsupported chipsets */
  provenance: CsiProvenance
}

export type CsiProvenance =
  | { kind: 'unsupported'; reason: string }
  | { kind: 'held_driver'; driverId: string; note: string }
  | { kind: 'live'; driverId: string; interfaceName: string }

/** TinyML inference frame over a CSI ring window — weights [HELD]. */
export interface AmbientTensorFrame {
  frameId: string
  windowStartMs: number
  windowEndMs: number
  /** Flattened feature tensor; empty when TinyML weights absent */
  features: Float32Array
  featureDim: number
  modelId: 'ambient-tinyml-v0' | 'none'
  /** True only when a real model produced features — never fake confidence */
  modelReady: boolean
}

export type AmbientEmotionLabel = 'calm' | 'stressed' | 'panicked' | 'absent'

export type AmbientSignalSource =
  | 'csi_tinyml'
  | 'gameplay_heuristic'
  | 'camera_fusion'
  | 'fused'

/**
 * Player affective delta for NPC BT / MoA — production truth only when source proven.
 * CSI BPM / HR claims are [HELD] — do not treat confidence as medical truth.
 */
export interface AmbientEmotionDelta {
  label: AmbientEmotionLabel
  /** 0–1 model/heuristic confidence — not clinical accuracy */
  confidence: number
  source: AmbientSignalSource
  /** Optional physiological proxy estimates — always tagged held when unverified */
  heartRateBpmEstimate?: number
  heartRateHeld: boolean
  breathRateEstimate?: number
  breathRateHeld: boolean
  emittedAtMs: number
  /** Previous label for gating critical transitions */
  previousLabel?: AmbientEmotionLabel
}

export type AmbientDeltaKind =
  | 'emotion'
  | 'presence'
  | 'heartbeat_spike'
  | 'capability'

export interface AmbientDeltaEvent {
  eventId: string
  kind: AmbientDeltaKind
  /** Critical = may escalate to cloud LLM behind CostGuard; routine stays edge/$0 */
  critical: boolean
  emotion?: AmbientEmotionDelta
  presence?: { present: boolean; confidence: number }
  heartbeatSpike?: {
    /** Estimate only — [HELD] without validated TinyML + NIC */
    bpmEstimate?: number
    held: true | false
    magnitude: number
  }
  capabilitySnapshot?: AmbientCapabilitySnapshot
  emittedAtMs: number
}

export interface AmbientCapabilitySnapshot {
  /** Real CSI NIC path available and producing samples */
  csiReady: false | true
  /** TinyML weights loaded and producing non-empty tensors */
  tinymlReady: false | true
  /** Camera topology lock-on pipeline live */
  cameraFusionReady: false | true
  /** Isolated ambient sensor kernel thread running (desktop) */
  sensorKernelReady: false | true
  /** Link medium — Ethernet cannot provide CSI */
  linkMedium: 'wifi' | 'ethernet' | 'unknown' | 'none'
  /** Honest marketing gate */
  marketingAmbientSensingAllowed: false
  heldReasons: string[]
}

/** Camera + CSI topology lock-on — implementation [HELD] without camera pipeline. */
export interface AmbientFocusLockTarget {
  entityId: string
  /** Screen-space or world hint — topology only until camera pipeline ships */
  topologyHint?: { x: number; y: number; z?: number }
  lockStrength: number
  source: 'camera' | 'csi' | 'fused' | 'none'
  held: boolean
}

export interface AmbientFocusLockState {
  locked: boolean
  target?: AmbientFocusLockTarget
  /** Fail-closed: fusion claims require both camera + CSI readiness */
  fusionClaimAllowed: false | true
  note: string
}

/** Gameplay heuristic inputs when CSI unavailable (Ethernet / no NIC). */
export interface GameplayAffectHeuristicInput {
  playerId: string
  /** Recent damage taken intensity 0–1 */
  damageIntensity?: number
  /** Time since last enemy contact (ms) */
  msSinceThreat?: number
  /** Sprint / exertion proxy 0–1 */
  exertion?: number
  /** Explicit AFK / tab-hidden */
  absent?: boolean
  nowMs?: number
}
