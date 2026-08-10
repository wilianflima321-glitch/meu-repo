/**
 * Letter da — Native ONNX ORT fixture / `nativeOnnxReady` honesty deepen.
 *
 * Distinct from letter cu (protocol + pager CLOSED): this letter decides whether
 * a redistributable text-to-3d `.onnx` can legally/practically land on disk.
 *
 * Zero-MVP: do **not** vendor commercial TripoSR/InstantMesh-class weights
 * (size + license). Do **not** invent Identity protobuf bytes as "text-to-3d"
 * and flip the IDE native pager green. Do **not** claim ORT runtime in web
 * without onnxruntime / cargo `local-ai` soak.
 *
 * `nativeOnnxReady` stays false until Founder drops a real text-to-3d `.onnx`
 * + ORT runtime + cu soak evidence. BYOK clay (cb) remains.
 *
 * No invent Coins/Agones/Nanite/DLSS. J.11/J.12 STOPPED.
 */

import {
  getNativeOnnxReady,
  probeOnnxOrtRuntime,
  probeOnnxOrtWeightsOnDisk,
  ONNX_ORT_SOAK_LETTER,
  type NativeOnnxOrtSoakResult,
} from '@/lib/native-gen/onnx-ort-session'
import {
  describeOrtFixtureEvidenceState,
  getOrtFixtureLoaded,
} from '@/lib/native-gen/creative-onnx-session'
import { selectGameReadyCharacterRoute } from '@/lib/native-gen/native-gen-ide-route'

export const ONNX_FIXTURE_HONESTY_LETTER = 'da' as const
export const ONNX_FIXTURE_HONESTY_WIRED = true as const
export const ONNX_FIXTURE_PRIOR_LETTER = ONNX_ORT_SOAK_LETTER

/**
 * Honesty constant: commercial / large text-to-3d ONNX cannot be vendored
 * into this repo under current license + size constraints.
 * Identity-only stubs must not be renamed as text-to-3d to fake ready.
 */
export const REDISTRIBUTABLE_TEXT_TO_3D_ONNX_UNAVAILABLE = true as const

export type OnnxFixtureHeldReason =
  | 'onnx_fixture_no_text_to_3d_weights'
  | 'onnx_fixture_ort_runtime_missing'
  | 'onnx_fixture_soak_unproven'
  | 'onnx_fixture_license_size_held'
  | 'onnx_fixture_force_disabled'

export interface OnnxFixtureHonestyProbe {
  letter: typeof ONNX_FIXTURE_HONESTY_LETTER
  priorLetter: typeof ONNX_ORT_SOAK_LETTER
  wired: true
  /** Product gate — true only after real weights + ORT + cu soak. */
  nativeOnnxReady: boolean
  /**
   * Local evidence only (Top-8 #3) — fixture bytes loaded for plumbing.
   * NEVER implies nativeOnnxReady / Meshy parity.
   */
  ortFixtureLoaded: boolean
  textTo3dWeightsOnDisk: boolean
  weightsPath: string | null
  ortRuntimePresent: boolean
  soakProven: boolean
  /** Always true until Founder licenses + drops redistributable weights. */
  redistributableTextTo3dFixtureUnavailable: true
  byokClayFallback: true
  meshyTripoClayParityClaim: false
  stamp: 'IMPLEMENTED' | 'HELD'
  heldReason?: OnnxFixtureHeldReason
  notes: string[]
}

export interface ProbeOnnxFixtureHonestyOptions {
  /** Injected soak (Vitest) — production uses live cu gate. */
  soak?: NativeOnnxOrtSoakResult | null
  /** Force HELD even if soak inject claims ready. */
  forceDisabled?: boolean
  /** Test inject — overrides disk probe. */
  weightsPresentOverride?: boolean
  /** Test inject — overrides runtime probe. */
  runtimePresentOverride?: boolean
}

function resolveHeldReason(input: {
  forceDisabled: boolean
  weightsPresent: boolean
  runtimePresent: boolean
  soakProven: boolean
  ready: boolean
}): OnnxFixtureHeldReason | undefined {
  if (input.ready) return undefined
  if (input.forceDisabled) return 'onnx_fixture_force_disabled'
  if (!input.weightsPresent) {
    // Primary production posture: no redistributable text-to-3d fixture.
    return 'onnx_fixture_license_size_held'
  }
  if (!input.runtimePresent) return 'onnx_fixture_ort_runtime_missing'
  if (!input.soakProven) return 'onnx_fixture_soak_unproven'
  return 'onnx_fixture_no_text_to_3d_weights'
}

/**
 * Honesty probe for native ONNX fixture / ready flip.
 * Fail-closed: missing redistributable `.onnx` or ORT ≠ ready.
 * Distinct letter from cu protocol CLOSED.
 */
export function probeNativeOnnxFixtureHonesty(
  options: ProbeOnnxFixtureHonestyOptions = {},
): OnnxFixtureHonestyProbe {
  const weights = probeOnnxOrtWeightsOnDisk()
  const runtime = probeOnnxOrtRuntime()

  const textTo3dWeightsOnDisk =
    options.weightsPresentOverride !== undefined
      ? options.weightsPresentOverride
      : weights.present === true
  const ortRuntimePresent =
    options.runtimePresentOverride !== undefined
      ? options.runtimePresentOverride
      : runtime.runtimePresent === true

  const soakProven =
    options.soak?.nativeOnnxReady === true || getNativeOnnxReady() === true

  const forceDisabled = options.forceDisabled === true
  const ready =
    !forceDisabled &&
    textTo3dWeightsOnDisk &&
    ortRuntimePresent &&
    soakProven &&
    getNativeOnnxReady() === true

  const heldReason = resolveHeldReason({
    forceDisabled,
    weightsPresent: textTo3dWeightsOnDisk,
    runtimePresent: ortRuntimePresent,
    soakProven,
    ready,
  })

  const notes: string[] = [
    'letter da — Native ONNX fixture honesty (distinct from cu protocol)',
    'letter da — commercial text-to-3d ONNX not redistributable (size/license) → no vendored tiny-text-to-3d.onnx',
    'letter da — Identity-only stubs must not fake text-to-3d or flip nativeOnnxReady',
    'letter da — ORT runtime not wired in web package (cargo local-ai / onnxruntime HELD)',
    'Top-8 #3 — ortFixtureLoaded is local evidence only; never equals nativeOnnxReady',
    weights.note,
    runtime.note,
  ]

  const fixtureState = describeOrtFixtureEvidenceState()
  if (fixtureState.ortFixtureLoaded) {
    notes.push(
      `ortFixtureLoaded=true (${fixtureState.byteLength} B) — plumbing evidence only; nativeOnnxReady untouched`,
    )
  }

  if (!ready) {
    notes.push(
      'letter da — nativeOnnxReady HELD (fail-closed); BYOK clay (cb) remains',
    )
  } else {
    notes.push(
      'letter da — nativeOnnxReady IMPLEMENTED (disk weights + ORT + cu soak proven)',
    )
  }

  return {
    letter: ONNX_FIXTURE_HONESTY_LETTER,
    priorLetter: ONNX_ORT_SOAK_LETTER,
    wired: true,
    nativeOnnxReady: ready,
    ortFixtureLoaded: getOrtFixtureLoaded(),
    textTo3dWeightsOnDisk,
    weightsPath: textTo3dWeightsOnDisk ? weights.path : null,
    ortRuntimePresent,
    soakProven,
    redistributableTextTo3dFixtureUnavailable:
      REDISTRIBUTABLE_TEXT_TO_3D_ONNX_UNAVAILABLE,
    byokClayFallback: true,
    meshyTripoClayParityClaim: false,
    stamp: ready ? 'IMPLEMENTED' : 'HELD',
    heldReason,
    notes,
  }
}

/** IDE / conveyor may prefer native pager only when fixture honesty is ready. */
export function shouldPreferNativeOnnxPager(probe: {
  nativeOnnxReady?: boolean
}): boolean {
  return probe.nativeOnnxReady === true
}

export function nativeOnnxFixtureStamp(probe: {
  nativeOnnxReady?: boolean
}): 'IMPLEMENTED' | 'HELD' {
  return shouldPreferNativeOnnxPager(probe) ? 'IMPLEMENTED' : 'HELD'
}

/**
 * Production fail-closed assertion: without redistributable weights, route stays BYOK.
 */
export function assertNativeOnnxFailClosedDefault(): {
  nativeOnnxReady: boolean
  routePath: 'byok-clay' | 'native-pager'
  stamp: 'HELD' | 'IMPLEMENTED'
} {
  const probe = probeNativeOnnxFixtureHonesty()
  const route = selectGameReadyCharacterRoute({
    nativeOnnxReady: probe.nativeOnnxReady,
  })
  return {
    nativeOnnxReady: probe.nativeOnnxReady,
    routePath: route.path,
    stamp: probe.stamp,
  }
}
