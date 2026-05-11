import type { ViewportRenderQueuePayload, ViewportRenderRuntimeRoute } from '@/lib/viewport/viewport-render-queue'
import type { ViewportRenderJobContract } from '@/lib/viewport/viewport-render-contract'

export type ViewportRenderReadinessSeverity = 'ready' | 'review' | 'fallback' | 'held'

export interface ViewportRenderResourceEstimate {
  estimatedFrames: number
  estimatedMemoryMb: number
  estimatedVramMb: number
  sceneComplexity: number
  riskScore: number
}

export interface ViewportRenderReadinessReport extends ViewportRenderResourceEstimate {
  severity: ViewportRenderReadinessSeverity
  runtimeTarget: ViewportRenderQueuePayload['runtimeTarget']
  preferredPlacement: ViewportRenderRuntimeRoute['preferredPlacement']
  recommendedLane: ViewportRenderQueuePayload['runtimeTarget']
  shouldHold: boolean
  shouldUseCloud: boolean
  shouldUseNative: boolean
  reasons: string[]
  requiredEvidence: string[]
  mitigationSteps: string[]
}

function resolutionPixels(resolution: string): number {
  const [widthRaw, heightRaw] = resolution.split('x')
  const width = Number(widthRaw)
  const height = Number(heightRaw)
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return 1280 * 720
  }
  return width * height
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)))
}

export function estimateViewportRenderResources(contract: ViewportRenderJobContract): ViewportRenderResourceEstimate {
  const pixels = resolutionPixels(contract.profile.resolution)
  const megapixels = pixels / 1_000_000
  const estimatedFrames = Math.max(1, Math.ceil(contract.timeline.duration * contract.profile.fps))
  const sceneComplexity = Math.round(
    contract.scene.objectCount * 1.2 +
      contract.scene.assetCount * 9 +
      contract.scene.visualScriptNodes * 1.6 +
      contract.scene.vfxNodes * 4.5,
  )
  const qualityMultiplier = contract.quality === 'final' ? 2.8 : contract.quality === 'review' ? 1.65 : 1
  const modeMultiplier = contract.renderMode === 'cinematic' ? 1.35 : 1
  const estimatedMemoryMb = Math.ceil(
    220 + sceneComplexity * 4.5 + megapixels * 180 * qualityMultiplier + estimatedFrames * 0.18 * modeMultiplier,
  )
  const estimatedVramMb = Math.ceil(
    160 + contract.scene.assetCount * 64 + contract.scene.objectCount * 5 + megapixels * 260 * qualityMultiplier,
  )
  const riskScore = Math.min(
    100,
    Math.round(
      sceneComplexity * 0.28 +
        estimatedFrames * 0.018 +
        megapixels * 7 * qualityMultiplier +
        (contract.profile.target === 'local-native' ? 4 : 0),
    ),
  )

  return {
    estimatedFrames,
    estimatedMemoryMb,
    estimatedVramMb,
    sceneComplexity,
    riskScore,
  }
}

export function buildViewportRenderReadinessReport(payload: ViewportRenderQueuePayload): ViewportRenderReadinessReport {
  const contract = payload.metadata.renderContract
  const route = payload.runtimeRoute
  const estimate = estimateViewportRenderResources(contract)
  const reasons: string[] = []
  const mitigationSteps: string[] = []
  const requiredEvidence = unique([
    ...payload.metadata.evidenceRequired,
    'Runtime route report attached',
    'Memory and VRAM estimate attached',
    'Human approval remains required before release outputs',
  ])

  let severity: ViewportRenderReadinessSeverity = 'ready'
  let recommendedLane = payload.runtimeTarget

  if (!route.canStart || route.target === 'held' || route.safety === 'held') {
    severity = 'held'
    recommendedLane = 'held'
    reasons.push(route.reason || 'Runtime route is held by device or policy constraints.')
    mitigationSteps.push('Wait for device pressure to recover or route the render through a cloud sandbox.')
  }

  if (route.safety === 'fallback' && severity !== 'held') {
    severity = 'fallback'
    recommendedLane = 'cloud-sandbox'
    reasons.push(route.reason || 'The preferred local executor is not safe; cloud fallback is required.')
    mitigationSteps.push('Use cloud-sandbox or Studio Local native execution before retrying heavy media output.')
  }

  if (contract.quality !== 'draft' && route.target === 'local-main-safe' && severity !== 'held') {
    severity = 'fallback'
    recommendedLane = 'cloud-sandbox'
    reasons.push('Review/final viewport renders must not run on the browser main thread.')
    mitigationSteps.push('Move review/final output to local-native or cloud-sandbox execution.')
  }

  if (contract.quality === 'final' && route.target !== 'cloud-sandbox' && route.target !== 'local-native' && severity !== 'held') {
    severity = 'fallback'
    recommendedLane = 'cloud-sandbox'
    reasons.push('Final export needs native/cloud media tooling for video, audio, license, and performance evidence.')
    mitigationSteps.push('Use cloud-sandbox for final export or connect Studio Local native render helpers.')
  }

  if (estimate.riskScore >= 78 && severity === 'ready') {
    severity = 'review'
    reasons.push('Scene complexity is high enough to require explicit review before execution.')
    mitigationSteps.push('Lower quality, split the shot/level, reduce VFX density, or promote to native/cloud execution.')
  }

  if (estimate.estimatedMemoryMb >= 4096 && severity !== 'held') {
    if (severity === 'ready') severity = 'review'
    reasons.push('Estimated memory exceeds 4 GB for this render contract.')
    mitigationSteps.push('Generate proxies first and avoid parallel heavy jobs on constrained devices.')
  }

  if (estimate.estimatedVramMb >= 3072 && route.target === 'local-worker' && severity !== 'held') {
    severity = 'fallback'
    recommendedLane = 'cloud-sandbox'
    reasons.push('Estimated VRAM pressure is too high for browser worker execution.')
    mitigationSteps.push('Use local-native GPU/NPU helpers or cloud-sandbox instead of browser worker rendering.')
  }

  if (reasons.length === 0) {
    reasons.push('Render contract is within the current isolated runtime budget.')
  }

  if (mitigationSteps.length === 0) {
    mitigationSteps.push('Keep render execution outside the browser main thread and attach evidence before approval.')
  }

  return {
    ...estimate,
    severity,
    runtimeTarget: payload.runtimeTarget,
    preferredPlacement: route.preferredPlacement,
    recommendedLane,
    shouldHold: severity === 'held',
    shouldUseCloud: recommendedLane === 'cloud-sandbox',
    shouldUseNative: recommendedLane === 'local-native',
    reasons: unique(reasons),
    requiredEvidence,
    mitigationSteps: unique(mitigationSteps),
  }
}
