/**
 * N8 — Finance ONNX / Mini-IA session probe (fail-closed).
 * Distinct from letter da text-to-3d `nativeOnnxReady` — never flips that gate.
 * Refuses inference without model bytes; records Mathematical Evidence; no fake predictions.
 */

import { existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

import { createComponentLogger } from '@/lib/observability/logger'
import { ONNX_FIXTURE_HONESTY_WIRED } from '@/lib/native-gen/onnx-fixture-honesty'
import { probeOnnxOrtRuntime } from '@/lib/native-gen/onnx-ort-session'
import {
  createMathematicalEvidenceReport,
  type MathematicalEvidenceReport,
} from '@/lib/server/quant/mathematical-evidence'

const log = createComponentLogger('finance-onnx-session')

/** Product gate — true only with finance .onnx bytes + ORT + soak. Always false until then. */
export const FINANCE_ONNX_READY = false as const

export const FINANCE_ONNX_WEIGHTS_CANDIDATE_PATHS = [
  'fixtures/onnx/finance-mini-ia.onnx',
  'cloud-web-app/web/fixtures/onnx/finance-mini-ia.onnx',
  'apps/studio-local/models/finance-mini-ia.onnx',
  'packages/aethel-kernel-rust/models/finance-mini-ia.onnx',
] as const

export type FinanceOnnxRejectCode =
  | 'no_model_bytes'
  | 'ort_runtime_missing'
  | 'finance_onnx_not_ready'
  | 'invalid_input'
  | 'native_gen_gate_forbidden'

export type FinanceOnnxResult<T> =
  | { ok: true; value: T }
  | {
      ok: false
      code: FinanceOnnxRejectCode
      message: string
      evidence?: MathematicalEvidenceReport
    }

export interface FinanceOnnxWeightsProbe {
  present: boolean
  path: string | null
  byteLength: number | null
  probedPaths: string[]
  note: string
}

export interface FinanceOnnxInferenceRequest {
  projectId: string
  strategyId: string
  /** Feature vector — never used to invent predictions when model missing */
  features: number[]
}

export interface FinanceOnnxInferenceDenied {
  financeOnnxReady: false
  predicted: false
  reason: FinanceOnnxRejectCode
  evidence: MathematicalEvidenceReport
}

function probeFinanceWeightsOnDisk(cwd = process.cwd()): FinanceOnnxWeightsProbe {
  const probedPaths: string[] = []
  for (const rel of FINANCE_ONNX_WEIGHTS_CANDIDATE_PATHS) {
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
            note: `finance ONNX bytes found (${st.size} B)`,
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
    byteLength: null,
    probedPaths,
    note: 'no finance-mini-ia.onnx bytes on disk — inference refused',
  }
}

export function probeFinanceOnnxWeights(
  options?: { cwd?: string; weightsPresentOverride?: boolean; weightsPathOverride?: string | null },
): FinanceOnnxWeightsProbe {
  if (typeof options?.weightsPresentOverride === 'boolean') {
    return {
      present: options.weightsPresentOverride,
      path: options.weightsPresentOverride ? (options.weightsPathOverride ?? 'inject://finance.onnx') : null,
      byteLength: options.weightsPresentOverride ? 1 : null,
      probedPaths: [...FINANCE_ONNX_WEIGHTS_CANDIDATE_PATHS],
      note: options.weightsPresentOverride
        ? 'weightsPresentOverride=true (test inject only)'
        : 'weightsPresentOverride=false',
    }
  }
  return probeFinanceWeightsOnDisk(options?.cwd)
}

/**
 * Attempt finance Mini-IA inference.
 * Without model bytes → refuse + Mathematical Evidence (no invented scores).
 * Even with bytes, product `financeOnnxReady` stays false until Founder soak (no silent green).
 */
export function attemptFinanceOnnxInference(
  request: FinanceOnnxInferenceRequest,
  options?: {
    cwd?: string
    weightsPresentOverride?: boolean
    runtimePresentOverride?: boolean
    /** Forbidden: flip text-to-3d nativeOnnxReady */
    claimNativeGenReady?: boolean
  },
): FinanceOnnxResult<FinanceOnnxInferenceDenied | { predicted: true; scores: number[]; financeOnnxReady: false }> {
  if (options?.claimNativeGenReady === true) {
    return {
      ok: false,
      code: 'native_gen_gate_forbidden',
      message: 'N8 must not flip letter da / nativeOnnxReady text-to-3d gate',
    }
  }
  if (!request.projectId?.trim() || !request.strategyId?.trim()) {
    return { ok: false, code: 'invalid_input', message: 'projectId and strategyId required' }
  }
  if (!Array.isArray(request.features) || request.features.length === 0) {
    return { ok: false, code: 'invalid_input', message: 'features required' }
  }
  if (request.features.some((n) => typeof n !== 'number' || !Number.isFinite(n))) {
    return { ok: false, code: 'invalid_input', message: 'features must be finite numbers' }
  }

  const weights = probeFinanceOnnxWeights({
    cwd: options?.cwd,
    weightsPresentOverride: options?.weightsPresentOverride,
  })
  const runtimePresent =
    typeof options?.runtimePresentOverride === 'boolean'
      ? options.runtimePresentOverride
      : probeOnnxOrtRuntime().runtimePresent

  if (!weights.present) {
    const evidence = createMathematicalEvidenceReport({
      kind: 'regime_flag',
      projectId: request.projectId,
      strategyId: request.strategyId,
      summary: 'N8 finance ONNX inference REFUSED — no model bytes on disk; no fake prediction',
      metrics: {
        features: request.features.length,
        modelBytes: 0,
        financeOnnxReady: 0,
        textTo3dGateUntouched: 1,
      },
      refs: ['n8:no_model_bytes', ...weights.probedPaths.slice(0, 2)],
    })
    log.warn('finance_onnx_infer_refused', { reason: 'no_model_bytes' })
    return {
      ok: false,
      code: 'no_model_bytes',
      message: weights.note,
      evidence: evidence.ok ? evidence.value : undefined,
    }
  }

  if (!runtimePresent) {
    const evidence = createMathematicalEvidenceReport({
      kind: 'regime_flag',
      projectId: request.projectId,
      strategyId: request.strategyId,
      summary: 'N8 finance ONNX inference REFUSED — ORT runtime missing; no fake prediction',
      metrics: {
        features: request.features.length,
        modelBytes: weights.byteLength ?? 0,
        ortRuntime: 0,
        financeOnnxReady: 0,
      },
      refs: ['n8:ort_runtime_missing', weights.path ?? ''],
    })
    log.warn('finance_onnx_infer_refused', { reason: 'ort_runtime_missing' })
    return {
      ok: false,
      code: 'ort_runtime_missing',
      message: 'onnxruntime not available for finance Mini-IA',
      evidence: evidence.ok ? evidence.value : undefined,
    }
  }

  // Model bytes may exist in Founder inject — still refuse product ready until soak.
  // Do not invent prediction scores when FINANCE_ONNX_READY is false.
  const evidence = createMathematicalEvidenceReport({
    kind: 'regime_flag',
    projectId: request.projectId,
    strategyId: request.strategyId,
    summary:
      'N8 finance ONNX bytes/runtime may be present but financeOnnxReady=false until soak — inference withheld (no fake scores)',
    metrics: {
      features: request.features.length,
      modelBytes: weights.byteLength ?? 0,
      ortRuntime: 1,
      financeOnnxReady: 0,
      predicted: 0,
    },
    refs: ['n8:finance_onnx_not_ready', weights.path ?? ''],
  })
  log.info('finance_onnx_infer_withheld', {
    path: weights.path,
    financeOnnxReady: false,
    textTo3dFixtureWired: ONNX_FIXTURE_HONESTY_WIRED,
  })
  return {
    ok: false,
    code: 'finance_onnx_not_ready',
    message:
      'financeOnnxReady stays false until Founder soak — refusing inference to avoid fake predictions',
    evidence: evidence.ok ? evidence.value : undefined,
  }
}

export function probeFinanceOnnxReadiness(options?: {
  cwd?: string
  weightsPresentOverride?: boolean
  runtimePresentOverride?: boolean
}): {
  id: 'N8'
  status: 'PARTIAL' | 'NOT_IMPLEMENTED'
  ready: boolean
  path: string
  note: string
  financeOnnxReady: false
  investmentGrade: false
  doesNotFlipNativeGenGate: true
} {
  const denied = attemptFinanceOnnxInference(
    {
      projectId: 'n8-probe',
      strategyId: 's1',
      features: [0.1, 0.2, 0.3],
    },
    {
      cwd: options?.cwd,
      weightsPresentOverride: options?.weightsPresentOverride ?? false,
      runtimePresentOverride: options?.runtimePresentOverride,
      claimNativeGenReady: false,
    },
  )
  const gateGuard = attemptFinanceOnnxInference(
    { projectId: 'n8-probe', strategyId: 's1', features: [1] },
    { claimNativeGenReady: true },
  )

  const ready =
    !denied.ok &&
    (denied.code === 'no_model_bytes' ||
      denied.code === 'ort_runtime_missing' ||
      denied.code === 'finance_onnx_not_ready') &&
    Boolean(denied.evidence) &&
    !gateGuard.ok &&
    gateGuard.code === 'native_gen_gate_forbidden' &&
    FINANCE_ONNX_READY === false

  return {
    id: 'N8',
    status: ready ? 'PARTIAL' : 'NOT_IMPLEMENTED',
    ready,
    path: 'lib/server/quant/finance-onnx-session.ts',
    note: ready
      ? 'Finance ONNX probe refuses inference without model bytes / until soak; financeOnnxReady=false; does not flip text-to-3d nativeOnnxReady.'
      : 'N8 finance ONNX probe failed.',
    financeOnnxReady: false,
    investmentGrade: false,
    doesNotFlipNativeGenGate: true,
  }
}
