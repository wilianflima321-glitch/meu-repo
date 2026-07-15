/**
 * Letter cg — Hardware Max contracts (Law XV).
 * Multi-lane worker pools + async compute jobs + FSR / CapScore degrade.
 * Letter ci FSR SRG letter constant lives in fsr-srg-honesty / engine fsr-executor.
 */

export const HARDWARE_MAX_LETTER = 'cg' as const

export type HardwareWorkerLane = 'physics' | 'ai' | 'asset' | 'general'

export type AsyncComputeJobKind =
  | 'bvh_build'
  | 'mesh_extract'
  | 'volumetrics'
  | 'general_compute'

export type HardwareJobPriority = 'critical' | 'high' | 'normal' | 'low'

export type HardwareJobStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'main_thread_fallback'

export interface HardwareWorkerPoolConfig {
  capabilityScore: number
  maxWorkersPerLane: number
  maxQueuedJobs: number
  /** When false / score too low — never spawn Workers; run in-process. */
  allowWorkers: boolean
}

export interface HardwareScheduledJob<TPayload = unknown, TResult = unknown> {
  id: string
  lane: HardwareWorkerLane
  priority: HardwareJobPriority
  payload: TPayload
  /** Pure handler — must not touch DOM/GPU. */
  run: (payload: TPayload) => TResult | Promise<TResult>
  enqueuedAtMs: number
  status: HardwareJobStatus
  result?: TResult
  error?: string
  ranOnMainThread?: boolean
}

export interface AsyncComputeJob<TPayload = unknown, TResult = unknown> {
  id: string
  kind: AsyncComputeJobKind
  priority: HardwareJobPriority
  payload: TPayload
  run: (payload: TPayload) => TResult | Promise<TResult>
  /** Prefer GPU async queue; fail-closed to main when unavailable. */
  preferAsyncCompute: boolean
  status: HardwareJobStatus
  result?: TResult
  error?: string
  executedOn: 'async_compute' | 'main_thread' | 'unrun'
}

export type FsrQualityMode = 'native' | 'quality' | 'balanced' | 'performance' | 'ultra_performance'

export interface FsrUpscalePlan {
  capabilityScore: number
  mode: FsrQualityMode
  /** Internal render scale 0..1 before present. */
  internalScale: number
  fsrAllowed: boolean
  /** Always false on WebGL2 / web Capability Score — no native DLSS. */
  dlssNativeAllowed: false
  /** XeSS-class honesty: web may claim FSR/XeSS-class spatial only. */
  xessClassSpatialAllowed: boolean
  notes: string[]
}

export interface CapScoreDegradeAction {
  subsystem: string
  from: string
  to: string
  reason: string
}

export interface CapScoreDegradePlan {
  capabilityScore: number
  estimatedVramMb: number
  vramBudgetMb: number
  oomRisk: boolean
  /** Never throw / never crash — degrade instead. */
  crashOomForbidden: true
  actions: CapScoreDegradeAction[]
  notes: string[]
}
