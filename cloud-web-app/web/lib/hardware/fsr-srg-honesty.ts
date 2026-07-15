/**
 * Letter ci — FSR ScalableRenderGraph executor honesty.
 * `fsrSrgReady` flips only after soak evidence (distinct from cg `fsrSpatialReady`).
 * DLSS native web always HELD. Full frameGraphLive remains HELD (3B.2).
 */

import { buildHardwareStaticProfile } from '@aethel/engine/render/hardware-profile'
import {
  buildScalableRenderGraphReport,
  FSR_SRG_EXECUTOR_LETTER,
  FSR_SRG_EXECUTOR_SHIPPED,
  DLSS_NATIVE_WEB_HELD as DLSS_NATIVE_WEB_HELD_CI,
  proveFsrSrgExecutorSoak,
  resolveFsrSrgExecutorPlan,
  type FsrSrgExecutorPlan,
} from '@aethel/engine/render/scalable-render-graph'
import { proveFsrSpatialWire } from '@/lib/hardware/fsr-upscale'

export { FSR_SRG_EXECUTOR_LETTER, FSR_SRG_EXECUTOR_SHIPPED }
export const FSR_SRG_LETTER = FSR_SRG_EXECUTOR_LETTER
export const FSR_SRG_WIRED = FSR_SRG_EXECUTOR_SHIPPED

export interface FsrSrgHonestyInput {
  capabilityScore?: number
  fsrSrgSoakPassed?: boolean
  fsrSpatialPassed?: boolean
}

export interface FsrSrgHonestyReport {
  letter: typeof FSR_SRG_LETTER
  wired: typeof FSR_SRG_WIRED
  /** Soak-gated — SRG FSR node executor + CapScore plan proven. */
  fsrSrgReady: boolean
  /** Letter cg spatial math (separate probe). */
  fsrSpatialReady: boolean
  fsrNodeRegistered: boolean
  executableNodeCount: number
  /** Full dual-live GPU frame graph — still HELD. */
  frameGraphLive: false
  dlssNativeWebAllowed: false
  plan: FsrSrgExecutorPlan
  zeroUiWhenUnavailable: true
  notes: string[]
}

let cachedFsrSrgSoak: boolean | null = null

export function proveFsrSrgWire(capabilityScore = 12): {
  passed: boolean
  letter: typeof FSR_SRG_LETTER
  plan: FsrSrgExecutorPlan
  fsrNodeRegistered: boolean
  executableNodeCount: number
} {
  const soak = proveFsrSrgExecutorSoak(capabilityScore)
  const profile = buildHardwareStaticProfile({
    webgpuAvailable: capabilityScore >= 20,
    webgl2Available: true,
    hardwareConcurrency: capabilityScore < 20 ? 4 : 8,
    deviceMemoryGb: capabilityScore < 20 ? 4 : 8,
  })
  // Force CapScore under test so blueprint/registration match soak score.
  const report = buildScalableRenderGraphReport({
    ...profile,
    capabilityScore,
    tier:
      capabilityScore < 20
        ? 'webgl2'
        : capabilityScore < 45
          ? 'integrated'
          : capabilityScore < 75
            ? 'discrete'
            : 'enthusiast',
  })
  const fsrNode = report.nodes.find((n) => n.id === 'FSR')
  const fsrNodeRegistered = fsrNode?.status === 'registered'
  const passed =
    soak.passed &&
    fsrNodeRegistered &&
    report.executableNodeCount >= 1 &&
    report.frameGraphLive === false &&
    soak.plan.dlssNativeAllowed === false

  if (passed) cachedFsrSrgSoak = true
  else if (cachedFsrSrgSoak !== true) cachedFsrSrgSoak = false

  return {
    passed,
    letter: FSR_SRG_LETTER,
    plan: soak.plan,
    fsrNodeRegistered,
    executableNodeCount: report.executableNodeCount,
  }
}

export function probeFsrSrgHonesty(
  input: FsrSrgHonestyInput = {},
): FsrSrgHonestyReport {
  const score = input.capabilityScore ?? 12
  const plan = resolveFsrSrgExecutorPlan({ capabilityScore: score })

  if (input.fsrSrgSoakPassed === undefined && cachedFsrSrgSoak === null) {
    proveFsrSrgWire(score)
  }

  const fsrSrgReady = input.fsrSrgSoakPassed ?? cachedFsrSrgSoak ?? false
  const spatial =
    input.fsrSpatialPassed !== undefined
      ? { passed: input.fsrSpatialPassed }
      : proveFsrSpatialWire()
  const profile = buildHardwareStaticProfile({
    webgpuAvailable: score >= 20,
    webgl2Available: true,
    hardwareConcurrency: 8,
    deviceMemoryGb: 8,
  })
  const report = buildScalableRenderGraphReport({
    ...profile,
    capabilityScore: score,
    tier:
      score < 20
        ? 'webgl2'
        : score < 45
          ? 'integrated'
          : score < 75
            ? 'discrete'
            : 'enthusiast',
  })
  const fsrNodeRegistered =
    report.nodes.find((n) => n.id === 'FSR')?.status === 'registered'

  return {
    letter: FSR_SRG_LETTER,
    wired: FSR_SRG_WIRED,
    fsrSrgReady,
    fsrSpatialReady: spatial.passed,
    fsrNodeRegistered: fsrNodeRegistered === true,
    executableNodeCount: report.executableNodeCount,
    frameGraphLive: false,
    dlssNativeWebAllowed: false,
    plan,
    zeroUiWhenUnavailable: true,
    notes: [
      ...plan.notes,
      fsrSrgReady
        ? 'fsrSrgReady CLOSED (letter ci) — SRG FSR executor + CapScore'
        : 'fsrSrgReady pending soak',
      'frameGraphLive HELD — non-FSR nodes still blueprint-only (3B.2)',
      DLSS_NATIVE_WEB_HELD_CI
        ? 'DLSS native web HELD — FSR/XeSS-class spatial only'
        : 'DLSS unexpected',
      plan.upscaleActive
        ? 'upscale active in frame path'
        : 'Zero-UI: upscale unavailable / native — no upscale chrome',
    ],
  }
}
