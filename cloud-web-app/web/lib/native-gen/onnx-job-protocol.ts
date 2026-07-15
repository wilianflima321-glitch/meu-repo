/**
 * Letter ca — ONNX Text-to-3D job protocol (desktop scaffold + honesty).
 * Letter cu — ORT weights soak deepen: session load + pager around infer.
 * Letter da — fixture honesty: redistributable text-to-3d ONNX HELD (size/license).
 *
 * Native ONNX is enhancement Zero-UI when VRAM insufficient.
 * BYOK MoA clay remains the production clay path until models soak.
 * `nativeOnnxReady` flips ONLY when real session + weights proven — never on scaffold.
 * Weights missing ≠ ready. Do not invent Identity as text-to-3d.
 */

import {
  NATIVE_GEN_LETTER,
  evaluateNativeGenCapability,
  type NativeGenStageReceipt,
} from '@/lib/native-gen/types'
import {
  getNativeOnnxReady,
  probeOnnxOrtRuntime,
  probeOnnxOrtWeightsOnDisk,
  runOnnxOrtLoadInferWindow,
  ONNX_ORT_SESSION_WIRED,
  ONNX_ORT_SOAK_LETTER,
} from '@/lib/native-gen/onnx-ort-session'

export const ONNX_JOB_PROTOCOL_WIRED = true as const
export const ONNX_JOB_PROTOCOL_LETTER = NATIVE_GEN_LETTER
export { ONNX_ORT_SOAK_LETTER, ONNX_ORT_SESSION_WIRED }

/**
 * Commercial / soaked local Text-to-3D ONNX models — HELD until disk weights present.
 * Scaffold IPC exists; do not flip nativeOnnxReady until cargo+models soak.
 */
export function areNativeOnnxModelsHeld(): boolean {
  return !probeOnnxOrtWeightsOnDisk().present
}

/** Live: true only after cu soak with weights+runtime. Default false. */
export function resolveNativeOnnxReadyFlag(): boolean {
  return getNativeOnnxReady()
}

/**
 * Backward-compat constant for ca/cb imports.
 * Always the *default* module gate — prefer `resolveNativeOnnxReadyFlag()` /
 * `getNativeOnnxReady()` after cu soak. Remains false without weights on disk.
 */
export const NATIVE_ONNX_READY: boolean = false

/** True when weights absent — honest HELD (cu probe). */
export const NATIVE_ONNX_MODELS_HELD: boolean = true

export type OnnxNativeGenJobKind = 'text-to-3d' | 'image-to-3d' | 'splat-refine'

export interface OnnxNativeGenJobRequest {
  kind: OnnxNativeGenJobKind
  prompt: string
  projectId: string
  capabilityScore: number
  dedicatedVramMb?: number | null
  /** Prefer small CPU model when discrete VRAM unavailable — still HELD without weights. */
  preferCpuSmall?: boolean
}

export interface OnnxNativeGenJobResult {
  accepted: boolean
  nativeOnnxReady: boolean
  zeroUi: boolean
  held: boolean
  heldReason: string
  receipt: NativeGenStageReceipt
  /** Never invent mesh bytes — empty until soak. */
  meshPositions?: Float32Array
  meshIndices?: Uint32Array
}

export interface OnnxSessionProbe {
  ipcScaffoldReady: boolean
  /** False until real ORT session + weights soaked (cu). */
  nativeOnnxReady: boolean
  modelsHeld: boolean
  weightsPresent: boolean
  runtimePresent: boolean
  ortSessionWired: boolean
  letter: typeof ONNX_ORT_SOAK_LETTER | typeof NATIVE_GEN_LETTER
  note: string
}

export function probeOnnxNativeSession(): OnnxSessionProbe {
  const weights = probeOnnxOrtWeightsOnDisk()
  const runtime = probeOnnxOrtRuntime()
  const ready = getNativeOnnxReady()
  return {
    ipcScaffoldReady: true,
    nativeOnnxReady: ready,
    modelsHeld: !weights.present,
    weightsPresent: weights.present,
    runtimePresent: runtime.runtimePresent,
    ortSessionWired: ONNX_ORT_SESSION_WIRED,
    letter: ONNX_ORT_SOAK_LETTER,
    note: ready
      ? 'Letter cu — ORT session soaked; nativeOnnxReady true'
      : weights.present
        ? `Letter cu — weights present but soak/runtime HELD; ${runtime.note}`
        : `Letter cu — ${weights.note}; BYOK clay (cb) remains; nativeOnnxReady: false`,
  }
}

/**
 * Submit native ONNX job — fail-closed / Zero-UI without soaked models.
 * Never returns success:true with empty artifact claiming ship.
 * When weights+runtime+ready: runs pager-wrapped load/infer (cu).
 */
export function submitOnnxNativeGenJob(
  req: OnnxNativeGenJobRequest,
): OnnxNativeGenJobResult {
  const gate = evaluateNativeGenCapability({
    capabilityScore: req.capabilityScore,
    dedicatedVramMb: req.dedicatedVramMb,
  })
  const probe = probeOnnxNativeSession()

  if (gate.zeroUiFallback || !gate.onnxPathAllowed) {
    return {
      accepted: false,
      nativeOnnxReady: false,
      zeroUi: true,
      held: true,
      heldReason:
        gate.notes[0] ??
        'Law XV — native ONNX fail-closed; use BYOK MoA clay (Zero-UI)',
      receipt: {
        stage: 'onnx-text-to-3d',
        status: 'zero-ui',
        evidence: ['capability-gate', 'moa-clay-fallback', `score=${gate.capabilityScore}`, 'letter-cu'],
        heldReason: 'VRAM/capability insufficient for local ONNX Text-to-3D',
        metrics: {
          claimedVramMb: gate.claimedVramMb,
          onnxPathAllowed: false,
        },
      },
    }
  }

  if (!probe.weightsPresent) {
    return {
      accepted: false,
      nativeOnnxReady: false,
      zeroUi: false,
      held: true,
      heldReason:
        'Local Text-to-3D ONNX weights not on disk — BYOK MoA clay remains; weights missing ≠ ready',
      receipt: {
        stage: 'onnx-text-to-3d',
        status: 'held',
        evidence: [
          'onnx-job-protocol',
          'weights-missing-on-disk',
          probe.note,
          'no-invented-mesh-bytes',
          'letter-cu',
        ],
        heldReason: 'weights_missing_on_disk',
        metrics: {
          ipcScaffoldReady: probe.ipcScaffoldReady,
          nativeOnnxReady: false,
          claimedVramMb: gate.claimedVramMb,
          weightsPresent: false,
        },
      },
    }
  }

  if (!probe.nativeOnnxReady) {
    return {
      accepted: false,
      nativeOnnxReady: false,
      zeroUi: false,
      held: true,
      heldReason:
        'ORT weights present but soak/runtime not proven — nativeOnnxReady HELD; BYOK clay remains',
      receipt: {
        stage: 'onnx-text-to-3d',
        status: 'held',
        evidence: [
          'onnx-job-protocol',
          'weights-present-soak-held',
          probe.note,
          'letter-cu',
        ],
        heldReason: 'soak_or_runtime_held',
        metrics: {
          ipcScaffoldReady: probe.ipcScaffoldReady,
          nativeOnnxReady: false,
          claimedVramMb: gate.claimedVramMb,
          weightsPresent: true,
          runtimePresent: probe.runtimePresent,
        },
      },
    }
  }

  // Ready path — synchronous wrapper refuses invent; async window is for soak/conveyor.
  return {
    accepted: false,
    nativeOnnxReady: true,
    zeroUi: false,
    held: true,
    heldReason:
      'Use runOnnxOrtLoadInferWindow / proveNativeOnnxOrtSoak for pager-wrapped infer — sync submit never invents mesh',
    receipt: {
      stage: 'onnx-text-to-3d',
      status: 'held',
      evidence: ['sync-submit-no-invent', 'use-async-load-infer-window', 'letter-cu'],
      heldReason: 'async_infer_required',
      metrics: {
        nativeOnnxReady: true,
        claimedVramMb: gate.claimedVramMb,
      },
    },
  }
}

/** Async submit when cu soak flipped ready — pager pause/resume around infer. */
export async function submitOnnxNativeGenJobAsync(
  req: OnnxNativeGenJobRequest,
): Promise<OnnxNativeGenJobResult> {
  const sync = submitOnnxNativeGenJob(req)
  if (sync.zeroUi || !getNativeOnnxReady()) {
    return sync
  }

  const window = await runOnnxOrtLoadInferWindow({
    prompt: req.prompt,
    capabilityScore: req.capabilityScore,
    dedicatedVramMb: req.dedicatedVramMb,
    preferCpuFallbackOnWeak: req.preferCpuSmall,
  })

  return {
    accepted: window.jobOk,
    nativeOnnxReady: getNativeOnnxReady(),
    zeroUi: window.zeroUi,
    held: window.held || !window.jobOk,
    heldReason: window.heldReason ?? (window.jobOk ? '' : 'ort_infer_failed'),
    receipt: window.receipts[window.receipts.length - 1] ?? {
      stage: 'onnx-text-to-3d',
      status: window.jobOk ? 'closed' : 'held',
      evidence: ['async-load-infer', 'letter-cu'],
    },
    meshPositions: window.meshPositions,
    meshIndices: window.meshIndices,
  }
}

export function buildNativeOnnxProbeInvoke(): {
  cmd: 'probe_onnx_native_gen_cmd'
  letter: typeof ONNX_ORT_SOAK_LETTER
} {
  return { cmd: 'probe_onnx_native_gen_cmd', letter: ONNX_ORT_SOAK_LETTER }
}

export function buildNativeOnnxRunInvoke(req: OnnxNativeGenJobRequest): {
  cmd: 'run_onnx_native_gen_cmd'
  letter: typeof ONNX_ORT_SOAK_LETTER
  request: OnnxNativeGenJobRequest
} {
  return { cmd: 'run_onnx_native_gen_cmd', letter: ONNX_ORT_SOAK_LETTER, request: req }
}
