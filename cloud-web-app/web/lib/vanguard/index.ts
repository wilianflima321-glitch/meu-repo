/**
 * Onda K / Vanguard — honesty probes (Neural radiance + 3DGS).
 * Product AAA / marketing flags stay false.
 */

export {
  NEURAL_RADIANCE_INFERENCE_READY,
  NEURAL_GI_AAA_READY,
  NEURAL_RADIANCE_MARKETING_ALLOWED,
  LUMEN_NEURAL_PARITY_READY,
  evaluateNeuralRadianceMlpLite,
  buildNeuralRadianceEvidenceSamples,
  runNeuralRadianceInferenceEvidenceSoak,
  claimNeuralRadianceInferenceReady,
  claimNeuralGiAaa,
  claimOnnxNeuralRadianceWeights,
  probeNeuralRadianceInferenceReadiness,
  type NeuralRadianceEvidence,
} from './neural-radiance-inference-honesty'

export {
  GAUSSIAN_SPLAT_AAA_READY,
  INSTANT_NGP_PARITY_READY,
  GAUSSIAN_SPLAT_MARKETING_ALLOWED,
  SPLAT_VIEWPORT_PRODUCT_READY,
  buildGaussianSplatEvidenceCloud,
  runGaussianSplatSubstrateEvidenceSoak,
  claimGaussianSplatAaa,
  claimInstantNgpParity,
  probeGaussianSplatSubstrateReadiness,
  type GaussianSplatSubstrateEvidence,
} from './gaussian-splat-substrate-evidence'
