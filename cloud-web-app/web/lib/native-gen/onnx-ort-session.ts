/**
 * Letter cu — Native ONNX ORT weights soak + session load protocol.
 * Letter da — fixture honesty deepen: redistributable text-to-3d ONNX HELD (size/license).
 *
 * Deepens ca scaffold: real session state machine + VRAM pager pause/resume
 * around load/infer. `nativeOnnxReady` flips ONLY when weights+runtime present
 * AND soak evidence passes. Weights missing ≠ ready. BYOK clay (cb) remains.
 * Do not invent Identity protobuf as text-to-3d (see onnx-fixture-honesty da).
 *
 * No invent Coins/Agones/Nanite/DLSS. J.11/J.12 STOPPED.
 */

import {
  NATIVE_GEN_LETTER,
  evaluateNativeGenCapability,
  type NativeGenStageReceipt,
} from '@/lib/native-gen/types'
import {
  createVramPager,
  transitionVramPager,
  type VramPagerSnapshot,
  type VramPagerState,
} from '@/lib/native-gen/vram-pager'

export const ONNX_ORT_SOAK_LETTER = 'cu' as const
export const ONNX_ORT_SESSION_WIRED = true as const

/** Candidate paths relative to repo / web cwd — probe only; never invent bytes. */
export const ONNX_ORT_WEIGHTS_CANDIDATE_PATHS = [
  'fixtures/onnx/tiny-text-to-3d.onnx',
  'cloud-web-app/web/fixtures/onnx/tiny-text-to-3d.onnx',
  'apps/studio-local/models/text-to-3d.onnx',
  'apps/studio-local/models/tiny-text-to-3d.onnx',
] as const

export type OnnxOrtSessionState =
  | 'idle'
  | 'probe_weights'
  | 'pause_viewport'
  | 'load_session'
  | 'session_ready'
  | 'infer'
  | 'unload_session'
  | 'resume_viewport'
  | 'fail_closed'
  | 'held_no_weights'

export const ONNX_ORT_SESSION_HAPPY_PATH: readonly OnnxOrtSessionState[] = [
  'idle',
  'probe_weights',
  'pause_viewport',
  'load_session',
  'session_ready',
  'infer',
  'unload_session',
  'resume_viewport',
  'idle',
] as const

const SESSION_ALLOWED: Record<OnnxOrtSessionState, readonly OnnxOrtSessionState[]> = {
  idle: ['probe_weights', 'fail_closed', 'held_no_weights'],
  probe_weights: ['pause_viewport', 'held_no_weights', 'fail_closed'],
  pause_viewport: ['load_session', 'fail_closed', 'resume_viewport'],
  load_session: ['session_ready', 'fail_closed', 'unload_session'],
  session_ready: ['infer', 'unload_session', 'fail_closed'],
  infer: ['unload_session', 'fail_closed'],
  unload_session: ['resume_viewport', 'fail_closed'],
  resume_viewport: ['idle', 'fail_closed'],
  fail_closed: ['idle'],
  held_no_weights: ['idle'],
}

export interface OnnxWeightsProbeResult {
  present: boolean
  path: string | null
  probedPaths: string[]
  /** Honesty: missing weights never implies ready. */
  weightsMissingMeansNotReady: true
  note: string
}

export interface OnnxOrtRuntimeProbe {
  /** True when a load/infer backend is available (injected or env). */
  runtimePresent: boolean
  note: string
}

/** Injectable ORT backend — production wires real ORT; tests inject fixture runner. */
export interface OnnxOrtSessionBackend {
  load(modelPath: string): Promise<{ ok: boolean; error?: string }>
  infer(prompt: string): Promise<{
    ok: boolean
    error?: string
    /** Never invent mesh — only return when real session produced bytes. */
    meshPositions?: Float32Array
    meshIndices?: Uint32Array
  }>
  unload(): Promise<void>
}

export interface OnnxOrtSessionSnapshot {
  state: OnnxOrtSessionState
  weightsPresent: boolean
  weightsPath: string | null
  runtimePresent: boolean
  sessionLoaded: boolean
  luxuryViewportPaused: boolean
  lastError?: string
  history: OnnxOrtSessionState[]
  pager: VramPagerSnapshot
}

export interface OnnxOrtSessionTransitionResult {
  snapshot: OnnxOrtSessionSnapshot
  ok: boolean
  receipt: NativeGenStageReceipt
}

export interface NativeOnnxOrtSoakResult {
  letter: typeof ONNX_ORT_SOAK_LETTER
  passed: boolean
  /** Flips only with weights + runtime + load/infer evidence. */
  nativeOnnxReady: boolean
  weightsPresent: boolean
  runtimePresent: boolean
  held: boolean
  heldReason?: string
  frames: number
  notes: string[]
  receipts: NativeGenStageReceipt[]
  snapshot: OnnxOrtSessionSnapshot
}

let cachedSoak: NativeOnnxOrtSoakResult | null = null
/** Live gate — false until proveNativeOnnxOrtSoak passes. */
let nativeOnnxReadyLive = false

let weightsProbeOverride: OnnxWeightsProbeResult | null = null
let runtimeProbeOverride: OnnxOrtRuntimeProbe | null = null
let sessionBackendOverride: OnnxOrtSessionBackend | null = null

export function __resetNativeOnnxOrtSoakForTests(): void {
  cachedSoak = null
  nativeOnnxReadyLive = false
  weightsProbeOverride = null
  runtimeProbeOverride = null
  sessionBackendOverride = null
}

export function __setNativeOnnxOrtTestHooks(hooks: {
  weights?: OnnxWeightsProbeResult | null
  runtime?: OnnxOrtRuntimeProbe | null
  backend?: OnnxOrtSessionBackend | null
}): void {
  if (hooks.weights !== undefined) weightsProbeOverride = hooks.weights
  if (hooks.runtime !== undefined) runtimeProbeOverride = hooks.runtime
  if (hooks.backend !== undefined) sessionBackendOverride = hooks.backend
}

/**
 * Disk probe for ORT weights. Browser / missing fs → not present (honest HELD).
 * Override via `__setNativeOnnxOrtTestHooks` for Vitest soak with fixture inject.
 */
export function probeOnnxOrtWeightsOnDisk(cwd?: string): OnnxWeightsProbeResult {
  if (weightsProbeOverride) return weightsProbeOverride

  const probedPaths: string[] = [...ONNX_ORT_WEIGHTS_CANDIDATE_PATHS]
  let present = false
  let path: string | null = null

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pathMod = require('path') as typeof import('path')
    const root = cwd ?? process.cwd()
    for (const rel of ONNX_ORT_WEIGHTS_CANDIDATE_PATHS) {
      const abs = pathMod.resolve(root, rel)
      probedPaths.push(abs)
      if (fs.existsSync(abs) && fs.statSync(abs).isFile() && fs.statSync(abs).size > 0) {
        present = true
        path = abs
        break
      }
    }
  } catch {
    // Browser / sandbox — no fs → weights not present
  }

  return {
    present,
    path,
    probedPaths,
    weightsMissingMeansNotReady: true,
    note: present
      ? `ORT weights found at ${path}`
      : 'ORT weights missing on disk — nativeOnnxReady stays false; BYOK clay (cb) remains',
  }
}

export function probeOnnxOrtRuntime(): OnnxOrtRuntimeProbe {
  if (runtimeProbeOverride) return runtimeProbeOverride
  // No onnxruntime-web dep in web package; desktop Rust `ort` is optional feature.
  // Honest default: runtime absent unless inject / future env wire.
  const envFlag =
    typeof process !== 'undefined' &&
    process.env?.AETHEL_ONNX_ORT_RUNTIME === '1'
  return {
    runtimePresent: Boolean(envFlag) || sessionBackendOverride != null,
    note: envFlag
      ? 'AETHEL_ONNX_ORT_RUNTIME=1 — runtime claimed via env'
      : sessionBackendOverride
        ? 'ORT backend injected (test/soak)'
        : 'ORT runtime not wired in web — cargo `local-ai`/ort HELD; BYOK clay remains',
  }
}

export function getNativeOnnxReady(): boolean {
  return nativeOnnxReadyLive === true
}

/** Module default export for ca/cb consumers — live after soak, else false. */
export function resolveNativeOnnxReady(): boolean {
  return getNativeOnnxReady()
}

export function createOnnxOrtSession(input?: {
  capabilityScore?: number
  dedicatedVramMb?: number | null
}): OnnxOrtSessionSnapshot {
  const weights = probeOnnxOrtWeightsOnDisk()
  const runtime = probeOnnxOrtRuntime()
  const pager = createVramPager({
    capabilityScore: input?.capabilityScore ?? 100,
    dedicatedVramMb: input?.dedicatedVramMb ?? null,
  })
  return {
    state: 'idle',
    weightsPresent: weights.present,
    weightsPath: weights.path,
    runtimePresent: runtime.runtimePresent,
    sessionLoaded: false,
    luxuryViewportPaused: false,
    history: ['idle'],
    pager,
  }
}

export function transitionOnnxOrtSession(
  snap: OnnxOrtSessionSnapshot,
  next: OnnxOrtSessionState,
  opts?: { error?: string },
): OnnxOrtSessionTransitionResult {
  const allowed = SESSION_ALLOWED[snap.state]
  if (!allowed.includes(next)) {
    return {
      ok: false,
      snapshot: {
        ...snap,
        lastError: `Illegal session transition ${snap.state} → ${next}`,
      },
      receipt: {
        stage: 'onnx-text-to-3d',
        status: 'rejected',
        evidence: ['illegal-session-transition', snap.state, next, 'letter-cu'],
        heldReason: `Illegal session transition ${snap.state} → ${next}`,
      },
    }
  }

  let luxuryViewportPaused = snap.luxuryViewportPaused
  let sessionLoaded = snap.sessionLoaded
  let pager = snap.pager

  const mirrorPager = (pagerNext: VramPagerState) => {
    const t = transitionVramPager(pager, pagerNext, { error: opts?.error })
    if (t.ok) pager = t.snapshot
  }

  switch (next) {
    case 'probe_weights':
      break
    case 'pause_viewport':
      luxuryViewportPaused = true
      mirrorPager('pause_viewport')
      break
    case 'load_session':
      mirrorPager('isolate_alloc')
      break
    case 'session_ready':
      sessionLoaded = true
      break
    case 'infer':
      mirrorPager('generate')
      break
    case 'unload_session':
      sessionLoaded = false
      mirrorPager('unload_model')
      break
    case 'resume_viewport':
      luxuryViewportPaused = false
      sessionLoaded = false
      mirrorPager('resume_viewport')
      break
    case 'idle':
      luxuryViewportPaused = false
      sessionLoaded = false
      if (pager.state !== 'idle') {
        const t = transitionVramPager(pager, 'idle')
        if (t.ok) pager = t.snapshot
      }
      break
    case 'fail_closed':
      sessionLoaded = false
      mirrorPager('fail_closed')
      break
    case 'held_no_weights':
      sessionLoaded = false
      luxuryViewportPaused = false
      break
  }

  return {
    ok: true,
    snapshot: {
      ...snap,
      state: next,
      luxuryViewportPaused,
      sessionLoaded,
      lastError: opts?.error,
      history: [...snap.history, next],
      pager,
    },
    receipt: {
      stage: 'onnx-text-to-3d',
      status:
        next === 'fail_closed'
          ? 'rejected'
          : next === 'held_no_weights'
            ? 'held'
            : 'closed',
      evidence: ['onnx-ort-session', next, 'letter-cu', `pager=${pager.state}`],
      metrics: {
        sessionLoaded,
        luxuryViewportPaused,
        weightsPresent: snap.weightsPresent,
        runtimePresent: snap.runtimePresent,
      },
      heldReason: opts?.error,
    },
  }
}

function defaultBackendRefuse(): OnnxOrtSessionBackend {
  return {
    async load() {
      return { ok: false, error: 'ort_runtime_not_wired' }
    },
    async infer() {
      return { ok: false, error: 'ort_runtime_not_wired' }
    },
    async unload() {},
  }
}

/**
 * Load protocol: probe → pager pause → load → ready → infer → unload → resume.
 * Fail-closed GT730. Honest HELD when weights or runtime missing.
 */
export async function runOnnxOrtLoadInferWindow(input: {
  prompt: string
  capabilityScore: number
  dedicatedVramMb?: number | null
  preferCpuFallbackOnWeak?: boolean
  backend?: OnnxOrtSessionBackend
}): Promise<{
  snapshot: OnnxOrtSessionSnapshot
  receipts: NativeGenStageReceipt[]
  jobOk: boolean
  zeroUi: boolean
  held: boolean
  heldReason?: string
  meshPositions?: Float32Array
  meshIndices?: Uint32Array
}> {
  const gate = evaluateNativeGenCapability({
    capabilityScore: input.capabilityScore,
    dedicatedVramMb: input.dedicatedVramMb,
  })
  let snap = createOnnxOrtSession({
    capabilityScore: gate.capabilityScore,
    dedicatedVramMb: gate.dedicatedVramMb,
  })
  const receipts: NativeGenStageReceipt[] = []
  const backend = input.backend ?? sessionBackendOverride ?? defaultBackendRefuse()

  if (!gate.onnxPathAllowed) {
    const fail = transitionOnnxOrtSession(snap, 'fail_closed', {
      error: gate.notes[0],
    })
    receipts.push(fail.receipt)
    snap = fail.snapshot
    const back = transitionOnnxOrtSession(snap, 'idle')
    receipts.push(back.receipt)
    return {
      snapshot: back.snapshot,
      receipts,
      jobOk: false,
      zeroUi: true,
      held: true,
      heldReason: gate.notes[0],
    }
  }

  // probe_weights
  {
    const t = transitionOnnxOrtSession(snap, 'probe_weights')
    receipts.push(t.receipt)
    snap = t.snapshot
    const weights = probeOnnxOrtWeightsOnDisk()
    const runtime = probeOnnxOrtRuntime()
    snap = {
      ...snap,
      weightsPresent: weights.present,
      weightsPath: weights.path,
      runtimePresent: runtime.runtimePresent || input.backend != null,
    }
    if (!weights.present) {
      const held = transitionOnnxOrtSession(snap, 'held_no_weights', {
        error: 'weights_missing_on_disk',
      })
      receipts.push(held.receipt)
      snap = held.snapshot
      const back = transitionOnnxOrtSession(snap, 'idle')
      receipts.push(back.receipt)
      return {
        snapshot: back.snapshot,
        receipts,
        jobOk: false,
        zeroUi: false,
        held: true,
        heldReason:
          'ORT weights missing on disk — nativeOnnxReady false; BYOK clay (cb) remains',
      }
    }
    if (!snap.runtimePresent) {
      const held = transitionOnnxOrtSession(snap, 'held_no_weights', {
        error: 'ort_runtime_missing',
      })
      receipts.push(held.receipt)
      snap = held.snapshot
      const back = transitionOnnxOrtSession(snap, 'idle')
      receipts.push(back.receipt)
      return {
        snapshot: back.snapshot,
        receipts,
        jobOk: false,
        zeroUi: false,
        held: true,
        heldReason:
          'ORT runtime missing — weights alone ≠ ready; BYOK clay (cb) remains',
      }
    }
  }

  const steps: OnnxOrtSessionState[] = [
    'pause_viewport',
    'load_session',
    'session_ready',
    'infer',
    'unload_session',
    'resume_viewport',
    'idle',
  ]

  let jobOk = false
  let meshPositions: Float32Array | undefined
  let meshIndices: Uint32Array | undefined

  const recover = async (from: OnnxOrtSessionSnapshot, err: string) => {
    let s = from
    const fail = transitionOnnxOrtSession(s, 'fail_closed', { error: err })
    receipts.push(fail.receipt)
    s = fail.snapshot
    try {
      await backend.unload()
    } catch {
      /* best-effort */
    }
    for (const recovery of ['unload_session', 'resume_viewport', 'idle'] as const) {
      if (SESSION_ALLOWED[s.state].includes(recovery)) {
        const r = transitionOnnxOrtSession(s, recovery)
        receipts.push(r.receipt)
        s = r.snapshot
      }
    }
    return s
  }

  for (const step of steps) {
    if (step === 'load_session') {
      const t = transitionOnnxOrtSession(snap, 'load_session')
      receipts.push(t.receipt)
      snap = t.snapshot
      const load = await backend.load(snap.weightsPath ?? '')
      if (!load.ok) {
        snap = await recover(snap, load.error ?? 'ort_load_failed')
        return {
          snapshot: snap,
          receipts,
          jobOk: false,
          zeroUi: false,
          held: true,
          heldReason: load.error ?? 'ort_load_failed',
        }
      }
      continue
    }
    if (step === 'infer') {
      const t = transitionOnnxOrtSession(snap, 'infer')
      receipts.push(t.receipt)
      snap = t.snapshot
      try {
        const result = await backend.infer(input.prompt)
        jobOk = result.ok
        if (!result.ok) {
          snap = await recover(snap, result.error ?? 'ort_infer_failed')
          return {
            snapshot: snap,
            receipts,
            jobOk: false,
            zeroUi: false,
            held: true,
            heldReason: result.error ?? 'ort_infer_failed',
          }
        }
        meshPositions = result.meshPositions
        meshIndices = result.meshIndices
      } catch (err) {
        snap = await recover(
          snap,
          err instanceof Error ? err.message : 'ort_infer_throw',
        )
        return {
          snapshot: snap,
          receipts,
          jobOk: false,
          zeroUi: false,
          held: true,
          heldReason: err instanceof Error ? err.message : 'ort_infer_throw',
        }
      }
      continue
    }
    if (step === 'unload_session') {
      await backend.unload()
    }
    const t = transitionOnnxOrtSession(snap, step)
    if (!t.ok) {
      receipts.push(t.receipt)
      return {
        snapshot: t.snapshot,
        receipts,
        jobOk: false,
        zeroUi: false,
        held: true,
        heldReason: t.snapshot.lastError,
      }
    }
    receipts.push(t.receipt)
    snap = t.snapshot
  }

  return {
    snapshot: snap,
    receipts,
    jobOk,
    zeroUi: false,
    held: !jobOk,
    meshPositions,
    meshIndices,
  }
}

/**
 * Soak: weights + runtime + pager-wrapped load/infer.
 * Without fixture on disk → HELD, nativeOnnxReady stays false.
 */
export async function proveNativeOnnxOrtSoak(input?: {
  frames?: number
  prompt?: string
  capabilityScore?: number
  dedicatedVramMb?: number | null
  backend?: OnnxOrtSessionBackend
}): Promise<NativeOnnxOrtSoakResult> {
  const frames = Math.max(1, Math.floor(input?.frames ?? 2))
  const notes: string[] = []
  const receipts: NativeGenStageReceipt[] = []
  const weights = probeOnnxOrtWeightsOnDisk()
  const runtime = probeOnnxOrtRuntime()
  notes.push(weights.note, runtime.note)

  if (!weights.present) {
    const snap = createOnnxOrtSession({
      capabilityScore: input?.capabilityScore ?? 70,
      dedicatedVramMb: input?.dedicatedVramMb ?? 4096,
    })
    const result: NativeOnnxOrtSoakResult = {
      letter: ONNX_ORT_SOAK_LETTER,
      passed: false,
      nativeOnnxReady: false,
      weightsPresent: false,
      runtimePresent: runtime.runtimePresent,
      held: true,
      heldReason: 'weights_missing_on_disk',
      frames,
      notes: [...notes, 'weights-missing≠ready', 'onnx-ort-soak-held'],
      receipts,
      snapshot: snap,
    }
    cachedSoak = result
    nativeOnnxReadyLive = false
    return result
  }

  const effectiveRuntime =
    runtime.runtimePresent || input?.backend != null || sessionBackendOverride != null
  if (!effectiveRuntime) {
    const snap = createOnnxOrtSession({
      capabilityScore: input?.capabilityScore ?? 70,
      dedicatedVramMb: input?.dedicatedVramMb ?? 4096,
    })
    const result: NativeOnnxOrtSoakResult = {
      letter: ONNX_ORT_SOAK_LETTER,
      passed: false,
      nativeOnnxReady: false,
      weightsPresent: true,
      runtimePresent: false,
      held: true,
      heldReason: 'ort_runtime_missing',
      frames,
      notes: [...notes, 'weights-without-runtime≠ready', 'onnx-ort-soak-held'],
      receipts,
      snapshot: snap,
    }
    cachedSoak = result
    nativeOnnxReadyLive = false
    return result
  }

  let allOk = true
  let lastSnap = createOnnxOrtSession({
    capabilityScore: input?.capabilityScore ?? 70,
    dedicatedVramMb: input?.dedicatedVramMb ?? 4096,
  })

  for (let f = 0; f < frames; f++) {
    const window = await runOnnxOrtLoadInferWindow({
      prompt: input?.prompt ?? `soak-frame-${f}`,
      capabilityScore: input?.capabilityScore ?? 70,
      dedicatedVramMb: input?.dedicatedVramMb ?? 4096,
      backend: input?.backend,
    })
    receipts.push(...window.receipts)
    lastSnap = window.snapshot
    if (!window.jobOk || window.held || window.zeroUi) {
      allOk = false
      notes.push(`frame-${f}-fail`)
    } else {
      notes.push(`frame-${f}-ok`)
    }
    // Pager must not leave model resident
    if (window.snapshot.sessionLoaded || window.snapshot.pager.modelResident) {
      allOk = false
      notes.push(`frame-${f}-resident-leak`)
    }
  }

  // GT730 contrast — must Zero-UI / not claim ready
  const weak = await runOnnxOrtLoadInferWindow({
    prompt: 'gt730-contrast',
    capabilityScore: 12,
    dedicatedVramMb: 8192,
    backend: input?.backend,
  })
  receipts.push(...weak.receipts)
  if (!weak.zeroUi || weak.jobOk) {
    allOk = false
    notes.push('gt730-contrast-fail')
  } else {
    notes.push('gt730-fail-closed-ok')
  }

  const passed = allOk
  if (passed) notes.push('onnx-ort-soak-passed')
  else notes.push('onnx-ort-soak-held')

  nativeOnnxReadyLive = passed
  const result: NativeOnnxOrtSoakResult = {
    letter: ONNX_ORT_SOAK_LETTER,
    passed,
    nativeOnnxReady: passed,
    weightsPresent: true,
    runtimePresent: true,
    held: !passed,
    heldReason: passed ? undefined : 'soak_evidence_incomplete',
    frames,
    notes,
    receipts,
    snapshot: lastSnap,
  }
  cachedSoak = result
  return result
}

export function probeNativeOnnxOrtHonesty(input?: {
  soak?: NativeOnnxOrtSoakResult
}): {
  letter: typeof ONNX_ORT_SOAK_LETTER
  priorLetter: typeof NATIVE_GEN_LETTER
  wired: true
  nativeOnnxReady: boolean
  weightsPresent: boolean
  runtimePresent: boolean
  modelsHeld: boolean
  held: boolean
  byokClayFallback: true
  notes: string[]
} {
  const soak = input?.soak ?? cachedSoak
  const weights = probeOnnxOrtWeightsOnDisk()
  const runtime = probeOnnxOrtRuntime()
  const ready = soak?.nativeOnnxReady === true && nativeOnnxReadyLive === true
  return {
    letter: ONNX_ORT_SOAK_LETTER,
    priorLetter: NATIVE_GEN_LETTER,
    wired: true,
    nativeOnnxReady: ready,
    weightsPresent: weights.present,
    runtimePresent: runtime.runtimePresent,
    modelsHeld: !weights.present,
    held: !ready,
    byokClayFallback: true,
    notes: [
      'cu: ORT load protocol + pager pause/resume around infer',
      'cu: nativeOnnxReady only with weights+runtime+soak evidence',
      'cu: weights missing ≠ ready — BYOK clay (cb) remains',
      weights.note,
      runtime.note,
      ...(soak?.notes ?? ['soak-not-run']),
    ],
  }
}
