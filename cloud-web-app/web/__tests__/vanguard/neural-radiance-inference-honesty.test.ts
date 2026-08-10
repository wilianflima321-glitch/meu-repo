/**
 * Onda K — Neural radiance inference honesty (fail-closed AAA).
 */

import { describe, expect, it } from 'vitest'

import {
  LUMEN_NEURAL_PARITY_READY,
  NEURAL_GI_AAA_READY,
  NEURAL_RADIANCE_INFERENCE_READY,
  NEURAL_RADIANCE_MARKETING_ALLOWED,
  claimNeuralGiAaa,
  claimNeuralRadianceInferenceReady,
  claimOnnxNeuralRadianceWeights,
  evaluateNeuralRadianceMlpLite,
  probeNeuralRadianceInferenceReadiness,
  runNeuralRadianceInferenceEvidenceSoak,
} from '@/lib/vanguard/neural-radiance-inference-honesty'

describe('Onda K neural radiance inference honesty', () => {
  it('seals MLP-lite irradiance without flipping inference/AAA', () => {
    const rgb = evaluateNeuralRadianceMlpLite({
      position: [0, 1, 0],
      normal: [0, 1, 0],
    })
    expect(rgb.every((c) => Number.isFinite(c) && c >= 0)).toBe(true)

    const soak = runNeuralRadianceInferenceEvidenceSoak()
    expect(soak.ok).toBe(true)
    if (!soak.ok) return
    expect(soak.value.fingerprint.length).toBeGreaterThanOrEqual(8)
    expect(soak.value.sampleCount).toBeGreaterThanOrEqual(2)
    expect(soak.value.neuralRadianceInferenceReady).toBe(false)
    expect(soak.value.neuralGiAaaReady).toBe(false)
    expect(soak.value.onnxWeightsPresent).toBe(false)
    expect(soak.value.marketingAllowed).toBe(false)
  })

  it('refuses empty samples and marketing claims', () => {
    expect(runNeuralRadianceInferenceEvidenceSoak({ samples: [] }).ok).toBe(false)
    expect(claimNeuralRadianceInferenceReady().ok).toBe(false)
    expect(claimNeuralGiAaa().ok).toBe(false)
    expect(claimOnnxNeuralRadianceWeights().ok).toBe(false)
    expect(NEURAL_RADIANCE_INFERENCE_READY).toBe(false)
    expect(NEURAL_GI_AAA_READY).toBe(false)
    expect(NEURAL_RADIANCE_MARKETING_ALLOWED).toBe(false)
    expect(LUMEN_NEURAL_PARITY_READY).toBe(false)
  })

  it('probe stays PARTIAL', () => {
    const probe = probeNeuralRadianceInferenceReadiness()
    expect(probe.ready).toBe(true)
    expect(probe.status).toBe('PARTIAL')
    expect(probe.neuralRadianceInferenceReady).toBe(false)
    expect(probe.marketingAllowed).toBe(false)
  })
})
