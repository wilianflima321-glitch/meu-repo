/**
 * Onda K — Neural radiance / inference honesty (fail-closed AAA).
 *
 * Seals a deterministic CPU MLP-lite irradiance substrate (no ONNX weights,
 * no Lumen/Neural GI marketing). Product neural radiance inference stays HELD
 * until Founder-licensed weights + ORT soak.
 */

import { createHash } from 'node:crypto'

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('neural-radiance-inference-honesty')

/** Product neural radiance / Neural GI — always false until Onda K Founder soak. */
export const NEURAL_RADIANCE_INFERENCE_READY = false as const
export const NEURAL_GI_AAA_READY = false as const
export const NEURAL_RADIANCE_MARKETING_ALLOWED = false as const
export const LUMEN_NEURAL_PARITY_READY = false as const

export type NeuralRadianceRejectCode =
  | 'empty_samples'
  | 'non_finite'
  | 'aaa_claim_held'
  | 'inference_claim_held'
  | 'onnx_weights_held'

export type NeuralRadianceResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: NeuralRadianceRejectCode; message: string }

export type NeuralRadianceSample = {
  position: [number, number, number]
  normal: [number, number, number]
}

export type NeuralRadianceEvidence = {
  version: 1
  sampleCount: number
  irradianceRgbMean: [number, number, number]
  fingerprint: string
  /** Substrate math sealed — not product inference ready. */
  substratePartial: true
  neuralRadianceInferenceReady: false
  neuralGiAaaReady: false
  lumenNeuralParityReady: false
  marketingAllowed: false
  onnxWeightsPresent: false
}

/** Tiny fixed MLP weights (6→8→3) — fixture only, not trained radiance model. */
const W1 = [
  [0.21, -0.14, 0.33, 0.08, -0.19, 0.27],
  [-0.11, 0.41, 0.05, -0.22, 0.17, 0.09],
  [0.29, 0.07, -0.31, 0.15, 0.12, -0.08],
  [0.04, -0.26, 0.18, 0.36, -0.09, 0.14],
  [-0.17, 0.22, 0.11, -0.05, 0.28, -0.13],
  [0.13, -0.08, 0.24, 0.19, -0.21, 0.31],
  [0.09, 0.16, -0.12, 0.07, 0.25, -0.18],
  [-0.23, 0.05, 0.14, -0.27, 0.11, 0.2],
] as const

const B1 = [0.02, -0.01, 0.03, 0.0, -0.02, 0.01, 0.015, -0.005] as const

const W2 = [
  [0.35, -0.12, 0.18, 0.09, -0.21, 0.14, 0.07, -0.11],
  [-0.08, 0.29, 0.11, -0.17, 0.22, 0.05, -0.13, 0.19],
  [0.16, 0.07, -0.24, 0.13, 0.1, -0.09, 0.21, 0.06],
] as const

const B2 = [0.05, 0.04, 0.06] as const

function relu(x: number): number {
  return x > 0 ? x : 0
}

function fingerprint(parts: string[]): string {
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16)
}

/** Evaluate fixture MLP irradiance at one sample (CPU-only). */
export function evaluateNeuralRadianceMlpLite(sample: NeuralRadianceSample): [number, number, number] {
  const x = [
    sample.position[0],
    sample.position[1],
    sample.position[2],
    sample.normal[0],
    sample.normal[1],
    sample.normal[2],
  ]
  const h: number[] = []
  for (let i = 0; i < 8; i++) {
    let s = B1[i]
    for (let j = 0; j < 6; j++) s += W1[i][j] * x[j]
    h.push(relu(s))
  }
  const out: [number, number, number] = [0, 0, 0]
  for (let i = 0; i < 3; i++) {
    let s = B2[i]
    for (let j = 0; j < 8; j++) s += W2[i][j] * h[j]
    out[i] = Math.max(0, s)
  }
  return out
}

export function buildNeuralRadianceEvidenceSamples(): NeuralRadianceSample[] {
  return [
    { position: [0, 1, 0], normal: [0, 1, 0] },
    { position: [1, 0.5, 0], normal: [1, 0, 0] },
    { position: [-0.5, 0.2, 0.8], normal: [0, 0, 1] },
    { position: [0.3, 0.7, -0.4], normal: [-0.5, 0.7, 0.1] },
  ]
}

/**
 * Seal MLP-lite irradiance evidence. Never flips product inference / Neural GI AAA.
 */
export function runNeuralRadianceInferenceEvidenceSoak(input?: {
  samples?: NeuralRadianceSample[]
}): NeuralRadianceResult<NeuralRadianceEvidence> {
  const samples = input?.samples ?? buildNeuralRadianceEvidenceSamples()
  if (samples.length < 2) {
    return { ok: false, code: 'empty_samples', message: 'Neural radiance evidence needs ≥2 samples' }
  }

  const rgbs = samples.map((s) => evaluateNeuralRadianceMlpLite(s))
  for (const rgb of rgbs) {
    if (!rgb.every((c) => Number.isFinite(c))) {
      return { ok: false, code: 'non_finite', message: 'Neural radiance MLP produced non-finite irradiance' }
    }
  }

  const mean: [number, number, number] = [0, 0, 0]
  for (const rgb of rgbs) {
    mean[0] += rgb[0]
    mean[1] += rgb[1]
    mean[2] += rgb[2]
  }
  mean[0] /= rgbs.length
  mean[1] /= rgbs.length
  mean[2] /= rgbs.length

  const fp = fingerprint([
    'onda-k-neural-radiance-mlp-lite',
    String(samples.length),
    mean.map((c) => c.toFixed(6)).join(','),
    ...rgbs.map((rgb) => rgb.map((c) => c.toFixed(5)).join(':')),
  ])

  const evidence: NeuralRadianceEvidence = {
    version: 1,
    sampleCount: samples.length,
    irradianceRgbMean: mean,
    fingerprint: fp,
    substratePartial: true,
    neuralRadianceInferenceReady: false,
    neuralGiAaaReady: false,
    lumenNeuralParityReady: false,
    marketingAllowed: false,
    onnxWeightsPresent: false,
  }

  log.info('neural_radiance_inference_evidence_sealed', {
    fingerprint: fp,
    samples: samples.length,
    mean,
    inferenceReady: false,
    aaa: false,
  })

  return { ok: true, value: evidence }
}

export function claimNeuralRadianceInferenceReady(): NeuralRadianceResult<never> {
  return {
    ok: false,
    code: 'inference_claim_held',
    message:
      'NEURAL_RADIANCE_INFERENCE_READY=false — MLP-lite fixture ≠ ONNX/ORT neural radiance product path',
  }
}

export function claimNeuralGiAaa(): NeuralRadianceResult<never> {
  return {
    ok: false,
    code: 'aaa_claim_held',
    message: 'NEURAL_GI_AAA_READY=false — no Lumen / Neural GI AAA marketing from fixture soak',
  }
}

export function claimOnnxNeuralRadianceWeights(): NeuralRadianceResult<never> {
  return {
    ok: false,
    code: 'onnx_weights_held',
    message: 'Neural radiance ONNX weights unavailable — redistributable inference HELD (Onda K)',
  }
}

export function probeNeuralRadianceInferenceReadiness(): {
  id: 'onda-k-neural-radiance'
  status: 'PARTIAL' | 'NOT_IMPLEMENTED'
  ready: boolean
  neuralRadianceInferenceReady: false
  neuralGiAaaReady: false
  marketingAllowed: false
  path: string
  note: string
} {
  const soak = runNeuralRadianceInferenceEvidenceSoak()
  const empty = runNeuralRadianceInferenceEvidenceSoak({ samples: [] })
  const inference = claimNeuralRadianceInferenceReady()
  const aaa = claimNeuralGiAaa()
  const onnx = claimOnnxNeuralRadianceWeights()

  const ready =
    soak.ok &&
    soak.value.fingerprint.length >= 8 &&
    soak.value.sampleCount >= 2 &&
    soak.value.neuralRadianceInferenceReady === false &&
    soak.value.neuralGiAaaReady === false &&
    !empty.ok &&
    !inference.ok &&
    !aaa.ok &&
    !onnx.ok &&
    NEURAL_RADIANCE_INFERENCE_READY === false &&
    NEURAL_GI_AAA_READY === false &&
    NEURAL_RADIANCE_MARKETING_ALLOWED === false &&
    LUMEN_NEURAL_PARITY_READY === false

  return {
    id: 'onda-k-neural-radiance',
    status: ready ? 'PARTIAL' : 'NOT_IMPLEMENTED',
    ready,
    neuralRadianceInferenceReady: false,
    neuralGiAaaReady: false,
    marketingAllowed: false,
    path: 'lib/vanguard/neural-radiance-inference-honesty.ts',
    note: ready
      ? 'Neural radiance MLP-lite substrate PARTIAL; product inference / Neural GI AAA / ONNX weights HELD.'
      : 'Neural radiance inference probe failed.',
  }
}
