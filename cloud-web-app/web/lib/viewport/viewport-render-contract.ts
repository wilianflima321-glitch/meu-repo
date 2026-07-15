export type ViewportRenderQuality = 'draft' | 'review' | 'final'
export type ViewportRenderCreativeMode = 'game' | 'film'
export type ViewportRenderSurfaceMode = 'draft' | 'cinematic'
export type ViewportRenderTarget = 'local-worker' | 'local-native' | 'cloud-sandbox'

export interface ViewportRenderTimelineSnapshot {
  currentTime: number
  duration: number
  isPlaying: boolean
}

export interface ViewportRenderSceneSnapshot {
  objectCount: number
  assetCount: number
  selectedObjectId: string | null
  selectedObjectName: string | null
  assetFormats: string[]
  visualScriptNodes: number
  visualScriptEdges: number
  vfxNodes: number
  vfxConnections: number
}

export interface ViewportRenderQualityProfile {
  quality: ViewportRenderQuality
  label: string
  resolution: string
  fps: number
  target: ViewportRenderTarget
  requiresProxy: boolean
  requiresHumanApproval: boolean
  expectedOutputs: string[]
  maxDurationSeconds: number
}

export interface ViewportRenderJobContract {
  id: string
  projectId?: string | null
  mode: ViewportRenderCreativeMode
  renderMode: ViewportRenderSurfaceMode
  quality: ViewportRenderQuality
  requestedAt: string
  selectedObjectId: string | null
  selectedObjectName: string | null
  timeline: ViewportRenderTimelineSnapshot
  scene: ViewportRenderSceneSnapshot
  profile: ViewportRenderQualityProfile
  evidenceRefs: string[]
  acceptance: string[]
  estimatedCostUsd: number
}

export const VIEWPORT_RENDER_QUALITY_PROFILES: Record<ViewportRenderQuality, ViewportRenderQualityProfile> = {
  draft: {
    quality: 'draft',
    label: 'Draft preview',
    resolution: '1280x720',
    fps: 24,
    target: 'local-worker',
    requiresProxy: true,
    requiresHumanApproval: false,
    expectedOutputs: ['manifest', 'thumbnail', 'proxy-preview'],
    maxDurationSeconds: 30,
  },
  review: {
    quality: 'review',
    label: 'Review render',
    resolution: '1920x1080',
    fps: 30,
    target: 'cloud-sandbox',
    requiresProxy: true,
    requiresHumanApproval: true,
    expectedOutputs: ['manifest', 'thumbnail', 'review-mp4', 'validation-report'],
    maxDurationSeconds: 120,
  },
  final: {
    quality: 'final',
    label: 'Final export',
    resolution: '3840x2160',
    fps: 60,
    target: 'cloud-sandbox',
    requiresProxy: false,
    requiresHumanApproval: true,
    expectedOutputs: ['manifest', 'final-video', 'audio-mix', 'license-report', 'performance-report'],
    maxDurationSeconds: 600,
  },
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function numberOrFallback(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)))
}

function normalizeQuality(value: unknown): ViewportRenderQuality {
  return value === 'review' || value === 'final' || value === 'draft' ? value : 'draft'
}

function normalizeMode(value: unknown): ViewportRenderCreativeMode {
  return value === 'film' ? 'film' : 'game'
}

function normalizeRenderMode(value: unknown): ViewportRenderSurfaceMode {
  return value === 'cinematic' ? 'cinematic' : 'draft'
}

export function estimateViewportRenderCostUsd(input: {
  quality: ViewportRenderQuality
  durationSeconds: number
  assetCount: number
  objectCount: number
}): number {
  const duration = Math.max(1, Math.min(600, input.durationSeconds))
  const complexity = Math.max(1, input.assetCount * 1.4 + input.objectCount * 0.12)
  const base = input.quality === 'final' ? 0.9 : input.quality === 'review' ? 0.18 : 0.02
  const perSecond = input.quality === 'final' ? 0.018 : input.quality === 'review' ? 0.004 : 0.0008
  return Number((base + duration * perSecond + complexity * 0.01).toFixed(2))
}

export function buildViewportRenderJobContract(input: {
  id?: string
  projectId?: string | null
  mode: ViewportRenderCreativeMode
  renderMode: ViewportRenderSurfaceMode
  quality: ViewportRenderQuality
  requestedAt?: string
  selectedObjectId?: string | null
  selectedObjectName?: string | null
  timeline: ViewportRenderTimelineSnapshot
  scene: ViewportRenderSceneSnapshot
  evidenceRefs?: string[]
}): ViewportRenderJobContract {
  const requestedAt = input.requestedAt ?? new Date().toISOString()
  const profile = VIEWPORT_RENDER_QUALITY_PROFILES[input.quality]
  const scene = {
    ...input.scene,
    assetFormats: unique(input.scene.assetFormats.map((format) => format.toLowerCase())),
  }
  const evidenceRefs = unique([
    `viewport-render:${input.id ?? requestedAt}`,
    `viewport-render-quality:${input.quality}`,
    ...(input.evidenceRefs ?? []),
  ])

  return {
    id: input.id ?? `viewport-render-${requestedAt.replace(/[^0-9]/g, '').slice(0, 14)}`,
    projectId: input.projectId,
    mode: input.mode,
    renderMode: input.renderMode,
    quality: input.quality,
    requestedAt,
    selectedObjectId: input.selectedObjectId ?? null,
    selectedObjectName: input.selectedObjectName ?? null,
    timeline: {
      currentTime: Math.max(0, input.timeline.currentTime),
      duration: Math.max(0.1, Math.min(profile.maxDurationSeconds, input.timeline.duration)),
      isPlaying: input.timeline.isPlaying,
    },
    scene,
    profile,
    evidenceRefs,
    acceptance: [
      'Render runs outside the browser main thread',
      'Manifest captures scene, timeline, quality, and selected surface',
      'Thumbnail/proxy evidence is attached before review approval',
      'Final release remains blocked until validation and license checks pass',
    ],
    estimatedCostUsd: estimateViewportRenderCostUsd({
      quality: input.quality,
      durationSeconds: input.timeline.duration,
      assetCount: scene.assetCount,
      objectCount: scene.objectCount,
    }),
  }
}

export function coerceViewportRenderJobContract(input: unknown): ViewportRenderJobContract | null {
  const source = isRecord(input) && isRecord(input.contract) ? input.contract : input
  if (!isRecord(source)) return null

  const timelineInput = isRecord(source.timeline) ? source.timeline : null
  const sceneInput = isRecord(source.scene) ? source.scene : null
  if (!timelineInput || !sceneInput) return null

  const quality = normalizeQuality(source.quality)
  const mode = normalizeMode(source.mode)
  const renderMode = normalizeRenderMode(source.renderMode)
  const assetFormats = Array.isArray(sceneInput.assetFormats)
    ? sceneInput.assetFormats.filter((format): format is string => typeof format === 'string')
    : []

  return buildViewportRenderJobContract({
    id: typeof source.id === 'string' && source.id.trim().length > 0 ? source.id : undefined,
    projectId: typeof source.projectId === 'string' ? source.projectId : null,
    mode,
    renderMode,
    quality,
    requestedAt: typeof source.requestedAt === 'string' ? source.requestedAt : undefined,
    selectedObjectId: stringOrNull(source.selectedObjectId),
    selectedObjectName: stringOrNull(source.selectedObjectName),
    timeline: {
      currentTime: numberOrFallback(timelineInput.currentTime, 0),
      duration: numberOrFallback(timelineInput.duration, 8),
      isPlaying: timelineInput.isPlaying === true,
    },
    scene: {
      objectCount: Math.max(0, Math.round(numberOrFallback(sceneInput.objectCount, 0))),
      assetCount: Math.max(0, Math.round(numberOrFallback(sceneInput.assetCount, 0))),
      selectedObjectId: stringOrNull(sceneInput.selectedObjectId),
      selectedObjectName: stringOrNull(sceneInput.selectedObjectName),
      assetFormats,
      visualScriptNodes: Math.max(0, Math.round(numberOrFallback(sceneInput.visualScriptNodes, 0))),
      visualScriptEdges: Math.max(0, Math.round(numberOrFallback(sceneInput.visualScriptEdges, 0))),
      vfxNodes: Math.max(0, Math.round(numberOrFallback(sceneInput.vfxNodes, 0))),
      vfxConnections: Math.max(0, Math.round(numberOrFallback(sceneInput.vfxConnections, 0))),
    },
    evidenceRefs: Array.isArray(source.evidenceRefs)
      ? source.evidenceRefs.filter((ref): ref is string => typeof ref === 'string')
      : [],
  })
}
