/**
 * Top-8 #3 — Creative / native-gen ORT session deepen (fail-closed).
 *
 * Pattern sibling: `lib/server/quant/finance-onnx-session.ts` (N8).
 * Refuses session/infer without model bytes; records evidence.
 *
 * Optional fixture loader may set local `ortFixtureLoaded` evidence ONLY —
 * NEVER flips `nativeOnnxReady`, Meshy/Tripo clay parity, or Instant Meshes.
 * Letter da/cu product gate remains HELD until Founder-licensed text-to-3d
 * weights + ORT runtime + cu soak.
 */

import { createHash } from 'node:crypto'
import { existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

import { createComponentLogger } from '@/lib/observability/logger'
import {
  getNativeOnnxReady,
  probeOnnxOrtRuntime,
  probeOnnxOrtWeightsOnDisk,
  ONNX_ORT_WEIGHTS_CANDIDATE_PATHS,
} from '@/lib/native-gen/onnx-ort-session'
import { NATIVE_ONNX_READY } from '@/lib/native-gen/onnx-job-protocol'

const log = createComponentLogger('creative-onnx-session')

export const CREATIVE_ONNX_SESSION_LETTER = 'da-cu-creative' as const
export const CREATIVE_ONNX_SESSION_WIRED = true as const

/** Product gate — always false here; only cu soak + Founder weights may flip live gate. */
export const CREATIVE_NATIVE_ONNX_READY = false as const
export const MESHY_TRIPO_CLAY_PARITY_CLAIM = false as const
export const INSTANT_MESHES_PARITY_CLAIM = false as const

export type CreativeOnnxRejectCode =
  | 'no_model_bytes'
  | 'ort_runtime_missing'
  | 'native_onnx_not_ready'
  | 'invalid_input'
  | 'native_onnx_gate_flip_forbidden'
  | 'empty_fixture_bytes'
  | 'theater_fixture'

export type CreativeOnnxResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: CreativeOnnxRejectCode; message: string; evidence?: CreativeOnnxEvidence }

export interface CreativeOnnxEvidence {
  version: 1
  letter: typeof CREATIVE_ONNX_SESSION_LETTER
  projectId: string
  /** Local evidence — fixture bytes accepted for plumbing tests only. */
  ortFixtureLoaded: boolean
  /** Always false in this module — never advertise product ready. */
  nativeOnnxReady: false
  meshyTripoClayParityClaim: false
  instantMeshesParityClaim: false
  modelByteLength: number
  fingerprint: string
  summary: string
  refs: string[]
}

export interface CreativeOnnxSessionRequest {
  projectId: string
  prompt: string
  /** Optional CapScore for Zero-UI notes — not a ready flip. */
  capabilityScore?: number
}

/** In-memory fixture evidence — test/Founder inject only; not product ready. */
let ortFixtureLoadedLive = false
let ortFixtureByteLength = 0
let ortFixtureFingerprint: string | null = null
let ortFixtureLabel: string | null = null

export function __resetCreativeOnnxSessionForTests(): void {
  ortFixtureLoadedLive = false
  ortFixtureByteLength = 0
  ortFixtureFingerprint = null
  ortFixtureLabel = null
}

export function getOrtFixtureLoaded(): boolean {
  return ortFixtureLoadedLive === true
}

function fingerprintBytes(bytes: Uint8Array, label: string): string {
  return createHash('sha256')
    .update(label)
    .update('|')
    .update(bytes)
    .digest('hex')
    .slice(0, 32)
}

function buildEvidence(input: {
  projectId: string
  summary: string
  ortFixtureLoaded: boolean
  modelByteLength: number
  refs: string[]
  fingerprintSeed?: string
}): CreativeOnnxEvidence {
  const fingerprint =
    input.fingerprintSeed ??
    createHash('sha256')
      .update(
        [
          CREATIVE_ONNX_SESSION_LETTER,
          input.projectId,
          input.summary,
          String(input.ortFixtureLoaded),
          String(input.modelByteLength),
          ...input.refs,
        ].join('|'),
      )
      .digest('hex')
      .slice(0, 32)

  return {
    version: 1,
    letter: CREATIVE_ONNX_SESSION_LETTER,
    projectId: input.projectId,
    ortFixtureLoaded: input.ortFixtureLoaded,
    nativeOnnxReady: false,
    meshyTripoClayParityClaim: false,
    instantMeshesParityClaim: false,
    modelByteLength: input.modelByteLength,
    fingerprint,
    summary: input.summary,
    refs: input.refs,
  }
}

/**
 * Optional fixture loader — accepts real non-empty bytes for evidence plumbing.
 * Sets `ortFixtureLoaded` only. NEVER flips `nativeOnnxReady` / Meshy parity.
 * Theater labels (mock/fake/identity-as-text-to-3d) are refused.
 */
export function loadOrtFixtureEvidence(input: {
  label: string
  bytes: Uint8Array
  /** Forbidden: attempt to claim product nativeOnnxReady from fixture load. */
  claimNativeOnnxReady?: boolean
}): CreativeOnnxResult<{
  ortFixtureLoaded: true
  nativeOnnxReady: false
  byteLength: number
  fingerprint: string
  evidence: CreativeOnnxEvidence
}> {
  if (input.claimNativeOnnxReady === true) {
    return {
      ok: false,
      code: 'native_onnx_gate_flip_forbidden',
      message:
        'Fixture loader must not flip nativeOnnxReady — Founder weights + ORT + cu soak only',
    }
  }

  const label = (input.label ?? '').trim().toLowerCase()
  if (!label) {
    return { ok: false, code: 'invalid_input', message: 'fixture label required' }
  }
  if (
    /^(mock|fake|theater|placeholder|identity|tiny-identity)/i.test(label) ||
    /identity.*text-to-3d|text-to-3d.*identity/i.test(label)
  ) {
    return {
      ok: false,
      code: 'theater_fixture',
      message:
        'Theater/Identity-as-text-to-3d fixture refused — do not fake nativeOnnxReady (letter da)',
    }
  }

  if (!input.bytes || input.bytes.byteLength <= 0) {
    return {
      ok: false,
      code: 'empty_fixture_bytes',
      message: 'Empty fixture bytes refused — ortFixtureLoaded stays false',
    }
  }

  const fp = fingerprintBytes(input.bytes, label)
  ortFixtureLoadedLive = true
  ortFixtureByteLength = input.bytes.byteLength
  ortFixtureFingerprint = fp
  ortFixtureLabel = label

  const evidence = buildEvidence({
    projectId: 'ort-fixture',
    summary: `ORT fixture evidence loaded (${input.bytes.byteLength} B) — ortFixtureLoaded=true; nativeOnnxReady remains false`,
    ortFixtureLoaded: true,
    modelByteLength: input.bytes.byteLength,
    refs: ['creative-onnx:ortFixtureLoaded', `label:${label}`, fp],
    fingerprintSeed: fp,
  })

  log.info('ort_fixture_loaded', {
    label,
    byteLength: input.bytes.byteLength,
    nativeOnnxReady: false,
    liveGate: getNativeOnnxReady(),
  })

  return {
    ok: true,
    value: {
      ortFixtureLoaded: true,
      nativeOnnxReady: false,
      byteLength: input.bytes.byteLength,
      fingerprint: fp,
      evidence,
    },
  }
}

export function clearOrtFixtureEvidence(): void {
  ortFixtureLoadedLive = false
  ortFixtureByteLength = 0
  ortFixtureFingerprint = null
  ortFixtureLabel = null
}

/**
 * Attempt creative native-gen ORT session open.
 * Without model bytes → refuse (fail-closed). Even with bytes/fixture,
 * product nativeOnnxReady stays false until cu soak + Founder drop.
 */
export function attemptCreativeOnnxSession(
  request: CreativeOnnxSessionRequest,
  options?: {
    cwd?: string
    weightsPresentOverride?: boolean
    runtimePresentOverride?: boolean
    /** Forbidden: flip product nativeOnnxReady from this session. */
    claimNativeOnnxReady?: boolean
  },
): CreativeOnnxResult<{
  sessionOpened: false
  nativeOnnxReady: false
  ortFixtureLoaded: boolean
  evidence: CreativeOnnxEvidence
}> {
  if (options?.claimNativeOnnxReady === true) {
    return {
      ok: false,
      code: 'native_onnx_gate_flip_forbidden',
      message: 'Creative ORT session must not flip nativeOnnxReady / Meshy parity',
    }
  }
  if (!request.projectId?.trim()) {
    return { ok: false, code: 'invalid_input', message: 'projectId required' }
  }
  if (!request.prompt?.trim()) {
    return { ok: false, code: 'invalid_input', message: 'prompt required' }
  }

  const weights =
    typeof options?.weightsPresentOverride === 'boolean'
      ? {
          present: options.weightsPresentOverride,
          path: options.weightsPresentOverride ? 'inject://creative.onnx' : null,
          probedPaths: [...ONNX_ORT_WEIGHTS_CANDIDATE_PATHS],
          note: options.weightsPresentOverride
            ? 'weightsPresentOverride=true (test inject)'
            : 'weightsPresentOverride=false',
          byteLength: options.weightsPresentOverride ? 1 : 0,
        }
      : probeCreativeWeights(options?.cwd)

  const runtimePresent =
    typeof options?.runtimePresentOverride === 'boolean'
      ? options.runtimePresentOverride
      : probeOnnxOrtRuntime().runtimePresent

  if (!weights.present) {
    const evidence = buildEvidence({
      projectId: request.projectId,
      summary:
        'Creative ORT session REFUSED — no model bytes on disk; nativeOnnxReady=false; BYOK clay remains',
      ortFixtureLoaded: getOrtFixtureLoaded(),
      modelByteLength: 0,
      refs: ['creative-onnx:no_model_bytes', ...weights.probedPaths.slice(0, 2)],
    })
    log.warn('creative_onnx_session_refused', { reason: 'no_model_bytes' })
    return {
      ok: false,
      code: 'no_model_bytes',
      message: weights.note,
      evidence,
    }
  }

  if (!runtimePresent) {
    const evidence = buildEvidence({
      projectId: request.projectId,
      summary:
        'Creative ORT session REFUSED — ORT runtime missing; nativeOnnxReady=false; no fake mesh',
      ortFixtureLoaded: getOrtFixtureLoaded(),
      modelByteLength: weights.byteLength ?? 0,
      refs: ['creative-onnx:ort_runtime_missing', weights.path ?? ''],
    })
    log.warn('creative_onnx_session_refused', { reason: 'ort_runtime_missing' })
    return {
      ok: false,
      code: 'ort_runtime_missing',
      message: 'ORT runtime not available for creative native-gen — session refused',
      evidence,
    }
  }

  // Bytes/runtime may exist — still refuse product session until nativeOnnxReady soak.
  // Fixture evidence does not open a product session.
  const evidence = buildEvidence({
    projectId: request.projectId,
    summary:
      'Creative ORT bytes/runtime may be present but nativeOnnxReady=false until Founder soak — session withheld (no fake mesh)',
    ortFixtureLoaded: getOrtFixtureLoaded(),
    modelByteLength: weights.byteLength ?? ortFixtureByteLength,
    refs: [
      'creative-onnx:native_onnx_not_ready',
      weights.path ?? 'unknown',
      `fixture:${ortFixtureLabel ?? 'none'}`,
      `moduleGate:${NATIVE_ONNX_READY}`,
      `liveGate:${getNativeOnnxReady()}`,
    ],
  })

  log.info('creative_onnx_session_withheld', {
    path: weights.path,
    ortFixtureLoaded: getOrtFixtureLoaded(),
    nativeOnnxReady: false,
    moduleGate: NATIVE_ONNX_READY,
    liveGate: getNativeOnnxReady(),
  })

  return {
    ok: false,
    code: 'native_onnx_not_ready',
    message:
      'nativeOnnxReady stays false until Founder-licensed weights + ORT + cu soak — refusing creative ORT session (no fake mesh)',
    evidence,
  }
}

function probeCreativeWeights(cwd = process.cwd()): {
  present: boolean
  path: string | null
  byteLength: number
  probedPaths: string[]
  note: string
} {
  const disk = probeOnnxOrtWeightsOnDisk(cwd)
  if (disk.present && disk.path) {
    let byteLength = 0
    try {
      if (existsSync(disk.path)) {
        byteLength = statSync(disk.path).size
      }
    } catch {
      byteLength = 0
    }
    return {
      present: true,
      path: disk.path,
      byteLength,
      probedPaths: disk.probedPaths,
      note: disk.note,
    }
  }

  // Also probe absolute candidates from cwd (finance-style)
  const probedPaths: string[] = []
  for (const rel of ONNX_ORT_WEIGHTS_CANDIDATE_PATHS) {
    const abs = resolve(cwd, rel)
    probedPaths.push(abs)
    try {
      if (existsSync(abs)) {
        const st = statSync(abs)
        if (st.isFile() && st.size > 0) {
          return {
            present: true,
            path: abs,
            byteLength: st.size,
            probedPaths,
            note: `creative ONNX bytes found (${st.size} B)`,
          }
        }
      }
    } catch {
      /* continue */
    }
  }

  return {
    present: false,
    path: null,
    byteLength: 0,
    probedPaths: [...disk.probedPaths, ...probedPaths],
    note: disk.note,
  }
}

export function probeCreativeOnnxSessionReadiness(options?: {
  cwd?: string
  weightsPresentOverride?: boolean
  runtimePresentOverride?: boolean
}): {
  id: 'creative-onnx-session'
  status: 'PARTIAL'
  ready: boolean
  path: string
  ortFixtureLoaded: boolean
  nativeOnnxReady: false
  meshyTripoClayParityClaim: false
  note: string
} {
  __resetCreativeOnnxSessionForTests()
  const denied = attemptCreativeOnnxSession(
    { projectId: 'probe', prompt: 'a chair' },
    {
      cwd: options?.cwd,
      weightsPresentOverride: options?.weightsPresentOverride ?? false,
      runtimePresentOverride: options?.runtimePresentOverride,
      claimNativeOnnxReady: false,
    },
  )
  const gateGuard = attemptCreativeOnnxSession(
    { projectId: 'probe', prompt: 'x' },
    { claimNativeOnnxReady: true },
  )
  const theater = loadOrtFixtureEvidence({
    label: 'identity-text-to-3d',
    bytes: new Uint8Array([1, 2, 3]),
  })
  const fixture = loadOrtFixtureEvidence({
    label: 'plumbing-evidence-bytes',
    bytes: new Uint8Array([0x4f, 0x4e, 0x4e, 0x58, 0x01, 0x02]),
  })

  const ready =
    !denied.ok &&
    (denied.code === 'no_model_bytes' ||
      denied.code === 'ort_runtime_missing' ||
      denied.code === 'native_onnx_not_ready') &&
    !gateGuard.ok &&
    gateGuard.code === 'native_onnx_gate_flip_forbidden' &&
    !theater.ok &&
    theater.code === 'theater_fixture' &&
    fixture.ok &&
    fixture.value.nativeOnnxReady === false &&
    getOrtFixtureLoaded() === true &&
    getNativeOnnxReady() === false &&
    CREATIVE_NATIVE_ONNX_READY === false &&
    NATIVE_ONNX_READY === false

  // Leave fixture loaded state as probe artifact for honesty consumers; tests reset.
  return {
    id: 'creative-onnx-session',
    status: 'PARTIAL',
    ready,
    path: 'lib/native-gen/creative-onnx-session.ts',
    ortFixtureLoaded: getOrtFixtureLoaded(),
    nativeOnnxReady: false,
    meshyTripoClayParityClaim: false,
    note: ready
      ? 'Creative ORT refuses session without model bytes; ortFixtureLoaded is local evidence only; nativeOnnxReady stays false'
      : 'Creative ORT session probe failed',
  }
}

export function describeOrtFixtureEvidenceState(): {
  ortFixtureLoaded: boolean
  byteLength: number
  fingerprint: string | null
  label: string | null
  nativeOnnxReady: false
} {
  return {
    ortFixtureLoaded: getOrtFixtureLoaded(),
    byteLength: ortFixtureByteLength,
    fingerprint: ortFixtureFingerprint,
    label: ortFixtureLabel,
    nativeOnnxReady: false,
  }
}
