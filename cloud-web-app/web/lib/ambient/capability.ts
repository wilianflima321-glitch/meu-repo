/**
 * Ambient sensing honesty / capability probe — Zero-MVP fail-closed.
 * Enhancement-only / Zero-UI: unsupported CSI = csiReady false, no modal/toast/settings nag.
 * Path: lib/ambient/capability.ts
 */

import { createComponentLogger } from '@/lib/observability/logger'
import type { AmbientCapabilitySnapshot } from './types'

const log = createComponentLogger('ambient-capability')

export type AmbientCapabilityStatus = 'IMPLEMENTED' | 'PARTIAL' | 'NOT_IMPLEMENTED' | 'HELD'

export interface AmbientHonestyReport {
  generatedAt: string
  capability: AmbientCapabilitySnapshot
  status: AmbientCapabilityStatus
  claim: string
  marketingAllowed: false
  notes: string[]
}

export interface AmbientCapabilityProbeInput {
  /** OS/driver reports CSI-capable Wi-Fi NIC */
  csiNicPresent?: boolean
  /** Isolated ambient_sensor_kernel thread started (desktop) */
  sensorKernelRunning?: boolean
  /** TinyML weights file present + validated */
  tinymlWeightsPresent?: boolean
  /** Camera pipeline producing focus lock frames */
  cameraPipelineLive?: boolean
  linkMedium?: AmbientCapabilitySnapshot['linkMedium']
  /**
   * Only after K ambient acceptance soak — never set from scaffold alone.
   * Without this, all csi/tinyml/camera readiness stay false (Zero-MVP).
   */
  acceptanceSuitePassed?: boolean
}

/**
 * Probe ambient sensing capability. Defaults honest: no CSI → csiReady false.
 * Ethernet / unknown link never claims CSI.
 * Scaffold never flips csiReady true without `acceptanceSuitePassed`.
 */
export function probeAmbientCapability(
  input: AmbientCapabilityProbeInput = {},
): AmbientCapabilitySnapshot {
  const linkMedium = input.linkMedium ?? 'unknown'
  const heldReasons: string[] = []

  const wifiOk = linkMedium === 'wifi'
  if (linkMedium === 'ethernet') {
    heldReasons.push('Ethernet link — CSI unavailable; use gameplay-heuristic emotion')
  }
  if (linkMedium === 'unknown' || linkMedium === 'none') {
    heldReasons.push('Link medium unknown/none — CSI path [HELD]')
  }
  if (!input.csiNicPresent) {
    heldReasons.push('No CSI-capable NIC/driver proven on this host')
  }
  if (!input.tinymlWeightsPresent) {
    heldReasons.push('TinyML ambient weights absent — BPM/breath estimates [HELD]')
  }
  if (!input.cameraPipelineLive) {
    heldReasons.push('Camera topology lock-on pipeline [HELD]')
  }
  if (!input.sensorKernelRunning) {
    heldReasons.push('ambient_sensor_kernel isolated thread not live / no-op without CSI driver')
  }
  if (!input.acceptanceSuitePassed) {
    heldReasons.push(
      'K ambient acceptance suite not passed — csiReady/tinymlReady forced false (Zero-MVP)',
    )
  }

  const hardwareLegs =
    Boolean(input.csiNicPresent) &&
    wifiOk &&
    Boolean(input.sensorKernelRunning) &&
    Boolean(input.tinymlWeightsPresent)

  // Production truth requires acceptance soak — scaffold never markets CSI as ready.
  const accepted = Boolean(input.acceptanceSuitePassed) && hardwareLegs
  const csiReady = accepted
  const tinymlReady = accepted
  const cameraFusionReady =
    accepted && Boolean(input.cameraPipelineLive)
  const sensorKernelReady =
    Boolean(input.sensorKernelRunning) && Boolean(input.csiNicPresent) && wifiOk

  return {
    csiReady,
    tinymlReady,
    cameraFusionReady,
    sensorKernelReady: accepted ? sensorKernelReady : false,
    linkMedium,
    marketingAmbientSensingAllowed: false,
    heldReasons,
  }
}

export function evaluateAmbientHonesty(
  input: AmbientCapabilityProbeInput = {},
): AmbientHonestyReport {
  const capability = probeAmbientCapability(input)
  const notes = [...capability.heldReasons]

  let status: AmbientCapabilityStatus = 'HELD'
  if (capability.csiReady && capability.tinymlReady && input.acceptanceSuitePassed) {
    status = 'PARTIAL'
    notes.push('CSI+TinyML path provisional after acceptance — marketing still blocked')
  } else {
    notes.push('Graceful degradation: gameplay-heuristic AmbientEmotionDelta only')
  }

  const claim =
    status === 'PARTIAL'
      ? 'Ambient sensing edge path provisional — no marketing claim; CostGuard gates cloud emotion'
      : 'Ambient Wi-Fi CSI / TinyML affective sensing [HELD] — gameplay-heuristic emotion fallback only'

  log.info('ambient_honesty_evaluated', {
    status,
    csiReady: capability.csiReady,
    linkMedium: capability.linkMedium,
  })

  return {
    generatedAt: new Date().toISOString(),
    capability,
    status,
    claim,
    marketingAllowed: false,
    notes,
  }
}
