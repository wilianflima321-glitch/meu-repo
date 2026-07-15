/**
 * Block 9 — Sidecar AI health probe honesty.
 * Real ping when probe evidence exists; otherwise honest HELD (DESK-004 / SIDECAR-001).
 */

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('sidecar-ai-health')

export type SidecarAiHealthStatus = 'ok' | 'degraded' | 'held' | 'missing'

export interface SidecarAiHealthInput {
  /** Probe reported onnx-runtime available. */
  onnxProbeAvailable?: boolean
  /** Optional wall-clock ping latency in ms from a real health check. */
  pingLatencyMs?: number | null
  /** Last ping succeeded. */
  pingOk?: boolean
  /** Human-review / releaseReady gate still closed. */
  releaseReady?: false
}

export interface SidecarAiHealthReport {
  generatedAt: string
  status: SidecarAiHealthStatus
  capabilityStatus: 'IMPLEMENTED' | 'PARTIAL' | 'HELD' | 'NOT_IMPLEMENTED'
  releaseReady: false
  ping: {
    attempted: boolean
    ok: boolean
    latencyMs: number | null
  }
  reason: string
  claim: string
  nextAction: string
}

/**
 * Evaluate sidecar AI health. Without a successful ping + probe, stays HELD.
 * Never claims releaseReady=true (SIDECAR-001).
 */
export function evaluateSidecarAiHealth(
  input: SidecarAiHealthInput = {},
): SidecarAiHealthReport {
  const releaseReady = false as const
  const probe = input.onnxProbeAvailable === true
  const pingAttempted =
    typeof input.pingOk === 'boolean' ||
    (typeof input.pingLatencyMs === 'number' && Number.isFinite(input.pingLatencyMs))
  const pingOk = input.pingOk === true
  const latencyMs =
    typeof input.pingLatencyMs === 'number' && Number.isFinite(input.pingLatencyMs)
      ? input.pingLatencyMs
      : null

  let status: SidecarAiHealthStatus
  let capabilityStatus: SidecarAiHealthReport['capabilityStatus']
  let reason: string
  let claim: string
  let nextAction: string

  if (probe && pingOk) {
    status = latencyMs !== null && latencyMs > 2_000 ? 'degraded' : 'ok'
    capabilityStatus = 'PARTIAL'
    reason =
      status === 'ok'
        ? 'ONNX probe available and health ping succeeded — inference still behind human-review gate.'
        : `ONNX ping ok but slow (${latencyMs}ms) — treat as degraded.`
    claim = 'Sidecar AI health probed — releaseReady remains false'
    nextAction = 'Keep SIDECAR-001 human-review closed until signed sidecar receipts exist.'
  } else if (probe && !pingAttempted) {
    status = 'held'
    capabilityStatus = 'HELD'
    reason =
      'ONNX probe bit set but no real health ping receipt — refuse to claim healthy sidecar.'
    claim = 'Sidecar AI health [HELD] — probe without ping'
    nextAction = 'Wire a real sidecar ping (or keep ai_complete provider_unavailable).'
  } else if (probe && pingAttempted && !pingOk) {
    status = 'missing'
    capabilityStatus = 'NOT_IMPLEMENTED'
    reason = 'ONNX probe claimed available but health ping failed.'
    claim = 'Sidecar AI unhealthy'
    nextAction = 'Clear false probe bits; keep ai_complete provider_unavailable.'
  } else {
    status = 'held'
    capabilityStatus = 'HELD'
    reason =
      'No ONNX sidecar health evidence — Studio Local ai_complete stays provider_unavailable (DESK-004).'
    claim = 'Sidecar AI [HELD]'
    nextAction = 'Approve and ship onnx sidecar with checksum + health receipts before claims.'
  }

  log.info('sidecar_ai_health_evaluated', { status, probe, pingOk, pingAttempted })

  return {
    generatedAt: new Date().toISOString(),
    status,
    capabilityStatus,
    releaseReady,
    ping: {
      attempted: pingAttempted,
      ok: pingOk,
      latencyMs,
    },
    reason,
    claim,
    nextAction,
  }
}

/**
 * Perform a best-effort ping when a probe function is provided.
 * Without a probeFn, returns honest HELD (no fake success).
 */
export async function probeSidecarAiHealth(options: {
  onnxProbeAvailable?: boolean
  pingFn?: () => Promise<{ ok: boolean; latencyMs: number }>
}): Promise<SidecarAiHealthReport> {
  if (!options.pingFn) {
    return evaluateSidecarAiHealth({
      onnxProbeAvailable: options.onnxProbeAvailable === true,
    })
  }
  const started = Date.now()
  try {
    const result = await options.pingFn()
    return evaluateSidecarAiHealth({
      onnxProbeAvailable: options.onnxProbeAvailable === true,
      pingOk: result.ok,
      pingLatencyMs: result.latencyMs ?? Date.now() - started,
      releaseReady: false,
    })
  } catch {
    return evaluateSidecarAiHealth({
      onnxProbeAvailable: options.onnxProbeAvailable === true,
      pingOk: false,
      pingLatencyMs: Date.now() - started,
      releaseReady: false,
    })
  }
}
