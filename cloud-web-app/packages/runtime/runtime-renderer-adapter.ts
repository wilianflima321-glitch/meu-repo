import {
  coerceViewportRenderOutputEvidence,
  type ViewportRenderOutputEvidence,
} from '../../web/lib/production/render-output-evidence'
import type { ViewportRenderQueuePayload } from '../../web/lib/viewport/viewport-render-queue'

export type RuntimeRendererBackendKind = 'browser-preview' | 'wgpu-native' | 'cloud-renderer' | 'held'
export type RuntimeRendererTarget = 'browser-preview' | 'local-native' | 'cloud-sandbox' | 'held'

export interface RuntimeRendererPerformanceReport {
  renderTimeMs: number
  frameCount: number
  averageFps: number
  peakMemoryMb: number
  peakVramMb?: number
  toolchainDigests: Record<string, string>
}

export interface RuntimeRendererValidationReport {
  playbackOk: boolean
  performanceOk: boolean
  licenseOk: boolean
  continuityOk: boolean
  artifactOwnershipChecked: boolean
  shaderCompileOk?: boolean
  assetBudgetOk?: boolean
}

export interface RuntimeRendererEvidenceEnvelope {
  schemaVersion: 1
  backendId: string
  backendKind: RuntimeRendererBackendKind
  target: RuntimeRendererTarget
  contractId: string
  projectId: string
  jobId?: string | null
  finishedAt: string
  evidence: ViewportRenderOutputEvidence
  performanceReport: RuntimeRendererPerformanceReport
  validationReport: RuntimeRendererValidationReport
}

export interface RuntimeRendererRequestEnvelope {
  schemaVersion: 1
  jobType: 'render:viewport'
  idempotencyKey: string
  payload: ViewportRenderQueuePayload
  runtimeEngine: {
    contract: 'hybrid-wgpu-v1'
    acceptedTargets: RuntimeRendererTarget[]
    browserRole: 'preview-only'
    neverMainThread: true
  }
  evidencePolicy: {
    requirePlayback: true
    requirePerformance: true
    requireLicense: true
    requireContinuity: true
    requirePerformanceReportArtifact: true
    requireValidationReportArtifact: true
    neverAutoRelease: true
  }
}

export type RuntimeRendererEnvelopeResult =
  | { ok: true; envelope: RuntimeRendererEvidenceEnvelope; evidence: ViewportRenderOutputEvidence }
  | { ok: false; blockers: string[] }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function positiveNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

function coerceStringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {}
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => {
      return typeof entry[1] === 'string' && entry[1].trim().length > 0
    }),
  )
}

function artifactKinds(evidence: ViewportRenderOutputEvidence): Set<string> {
  return new Set(evidence.artifacts.map((artifact) => artifact.kind))
}

function coercePerformanceReport(value: unknown): RuntimeRendererPerformanceReport | null {
  if (!isRecord(value)) return null
  const renderTimeMs = positiveNumber(value.renderTimeMs)
  const frameCount = positiveNumber(value.frameCount)
  const averageFps = positiveNumber(value.averageFps)
  const peakMemoryMb = positiveNumber(value.peakMemoryMb)
  if (renderTimeMs === null || frameCount === null || averageFps === null || peakMemoryMb === null) return null

  const peakVramMb = positiveNumber(value.peakVramMb)
  return {
    renderTimeMs,
    frameCount,
    averageFps,
    peakMemoryMb,
    peakVramMb: peakVramMb ?? undefined,
    toolchainDigests: coerceStringRecord(value.toolchainDigests),
  }
}

function coerceValidationReport(value: unknown): RuntimeRendererValidationReport | null {
  if (!isRecord(value)) return null
  return {
    playbackOk: value.playbackOk === true,
    performanceOk: value.performanceOk === true,
    licenseOk: value.licenseOk === true,
    continuityOk: value.continuityOk === true,
    artifactOwnershipChecked: value.artifactOwnershipChecked === true,
    shaderCompileOk: typeof value.shaderCompileOk === 'boolean' ? value.shaderCompileOk : undefined,
    assetBudgetOk: typeof value.assetBudgetOk === 'boolean' ? value.assetBudgetOk : undefined,
  }
}

export function buildRuntimeRendererRequestEnvelope(payload: ViewportRenderQueuePayload): RuntimeRendererRequestEnvelope {
  return {
    schemaVersion: 1,
    jobType: 'render:viewport',
    idempotencyKey: `${payload.projectId}:${payload.metadata.renderContract.id}:${payload.requestedAt}`,
    payload,
    runtimeEngine: {
      contract: 'hybrid-wgpu-v1',
      acceptedTargets: ['browser-preview', 'local-native', 'cloud-sandbox', 'held'],
      browserRole: 'preview-only',
      neverMainThread: true,
    },
    evidencePolicy: {
      requirePlayback: true,
      requirePerformance: true,
      requireLicense: true,
      requireContinuity: true,
      requirePerformanceReportArtifact: true,
      requireValidationReportArtifact: true,
      neverAutoRelease: true,
    },
  }
}

export function coerceRuntimeRendererEvidenceEnvelope(
  input: unknown,
  payload: ViewportRenderQueuePayload,
): RuntimeRendererEnvelopeResult {
  const source = isRecord(input) && isRecord(input.runtimeEngine) ? input.runtimeEngine : input
  const blockers: string[] = []

  if (!isRecord(source) || source.schemaVersion !== 1) {
    return { ok: false, blockers: ['Renderer backend response must use runtimeEngine schemaVersion 1.'] }
  }

  const backendId = stringOrNull(source.backendId)
  const backendKind = source.backendKind === 'browser-preview' || source.backendKind === 'wgpu-native' || source.backendKind === 'cloud-renderer' || source.backendKind === 'held'
    ? source.backendKind
    : null
  const target = source.target === 'browser-preview' || source.target === 'local-native' || source.target === 'cloud-sandbox' || source.target === 'held' ? source.target : null
  const contractId = stringOrNull(source.contractId)
  const projectId = stringOrNull(source.projectId)
  const finishedAt = typeof source.finishedAt === 'string' && !Number.isNaN(Date.parse(source.finishedAt))
    ? source.finishedAt
    : null
  const performanceReport = coercePerformanceReport(source.performanceReport)
  const validationReport = coerceValidationReport(source.validationReport)
  const evidence = coerceViewportRenderOutputEvidence(source.evidence)

  if (!backendId) blockers.push('Renderer backend response is missing backendId.')
  if (!backendKind) blockers.push('Renderer backend response must declare backendKind.')
  if (!target) blockers.push('Renderer backend response must target local-native or cloud-sandbox.')
  if (!contractId || contractId !== payload.metadata.renderContract.id) blockers.push('Renderer backend contractId does not match the queued render contract.')
  if (!projectId || projectId !== payload.projectId) blockers.push('Renderer backend projectId does not match the queued project.')
  if (!finishedAt) blockers.push('Renderer backend response is missing a valid finishedAt timestamp.')
  if (!performanceReport) blockers.push('Renderer backend response must include a performanceReport.')
  if (!validationReport) blockers.push('Renderer backend response must include a validationReport.')
  if (!evidence) blockers.push('Renderer backend response must include viewport output evidence.')

  if (backendKind === 'browser-preview' || target === 'browser-preview') {
    blockers.push('browser-preview is responsive viewport evidence only and cannot satisfy final render evidence.')
  }
  if (backendKind === 'held' || target === 'held') {
    blockers.push('held render state requires a blocker manifest and cannot satisfy completed render evidence.')
  }
  if (backendKind === 'wgpu-native' && target !== 'local-native') {
    blockers.push('wgpu-native evidence must come from the local-native runtime target.')
  }
  if (backendKind === 'cloud-renderer' && target !== 'cloud-sandbox') {
    blockers.push('cloud-renderer evidence must come from the cloud-sandbox runtime target.')
  }

  if (evidence) {
    const kinds = artifactKinds(evidence)
    if (!kinds.has('performance-report')) blockers.push('Renderer evidence must include a performance-report artifact.')
    if (!kinds.has('validation-report')) blockers.push('Renderer evidence must include a validation-report artifact.')
    if (evidence.contractId !== payload.metadata.renderContract.id) blockers.push('Evidence contractId does not match the queued render contract.')
    if (evidence.projectId && evidence.projectId !== payload.projectId) blockers.push('Evidence projectId does not match the queued project.')
  }

  if (validationReport) {
    if (!validationReport.artifactOwnershipChecked) blockers.push('Renderer validation report must confirm artifact ownership was checked.')
    if (evidence) {
      if (validationReport.playbackOk !== evidence.validation.playbackOk) blockers.push('Validation playback result must match output evidence.')
      if (validationReport.performanceOk !== evidence.validation.performanceOk) blockers.push('Validation performance result must match output evidence.')
      if (validationReport.licenseOk !== evidence.validation.licenseOk) blockers.push('Validation license result must match output evidence.')
      if (validationReport.continuityOk !== evidence.validation.continuityOk) blockers.push('Validation continuity result must match output evidence.')
    }
  }

  if (blockers.length > 0 || !backendId || !backendKind || !target || !contractId || !projectId || !finishedAt || !performanceReport || !validationReport || !evidence) {
    return { ok: false, blockers: Array.from(new Set(blockers)) }
  }

  return {
    ok: true,
    envelope: {
      schemaVersion: 1,
      backendId,
      backendKind,
      target,
      contractId,
      projectId,
      jobId: stringOrNull(source.jobId),
      finishedAt,
      evidence,
      performanceReport,
      validationReport,
    },
    evidence,
  }
}
