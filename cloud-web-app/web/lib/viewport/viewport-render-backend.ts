import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import {
  buildViewportRenderEvidenceFromContract,
  type ViewportRenderOutputArtifact,
  type ViewportRenderOutputEvidence,
  type ViewportRenderOutputValidation,
} from '@/lib/production/render-output-evidence'
import {
  VIEWPORT_RENDER_QUEUE_JOB_TYPE,
  type ViewportRenderQueuePayload,
} from '@/lib/viewport/viewport-render-queue'

export interface ViewportRenderBackendRequest {
  jobType: typeof VIEWPORT_RENDER_QUEUE_JOB_TYPE
  payload: ViewportRenderQueuePayload
  evidencePolicy?: {
    requirePlayback?: boolean
    requirePerformance?: boolean
    requireLicense?: boolean
    requireContinuity?: boolean
    neverAutoRelease?: boolean
  }
}

export interface ViewportRenderBackendResult {
  evidence: ViewportRenderOutputEvidence
  renderer: {
    kind: 'aethel-internal-scene-preview'
    artifactRoot: string
    producedKinds: string[]
    blockedKinds: string[]
    releaseReady: false
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function coerceViewportRenderBackendRequest(input: unknown): ViewportRenderBackendRequest | null {
  if (!isRecord(input) || input.jobType !== VIEWPORT_RENDER_QUEUE_JOB_TYPE || !isRecord(input.payload)) {
    return null
  }

  const payload = input.payload as Partial<ViewportRenderQueuePayload>
  if (
    typeof payload.projectId !== 'string' ||
    !isRecord(payload.metadata) ||
    payload.metadata.source !== 'viewport-render-contract' ||
    !isRecord(payload.metadata.renderContract) ||
    !isRecord(payload.runtimeRoute)
  ) {
    return null
  }

  return {
    jobType: VIEWPORT_RENDER_QUEUE_JOB_TYPE,
    payload: input.payload as unknown as ViewportRenderQueuePayload,
    evidencePolicy: isRecord(input.evidencePolicy) ? input.evidencePolicy : undefined,
  }
}

function normalizePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(0, 120)
}

function getDefaultArtifactRoot(): string {
  return process.env.AETHEL_RENDER_ARTIFACT_ROOT || path.join(process.cwd(), '.aethel', 'runtime-artifacts')
}

function buildArtifactUrl(projectId: string, contractId: string, fileName: string): string {
  return `aethel-artifact://viewport-render/${encodeURIComponent(projectId)}/${encodeURIComponent(contractId)}/${encodeURIComponent(fileName)}`
}

async function writeArtifact(input: {
  artifactRoot: string
  projectId: string
  contractId: string
  fileName: string
  body: string
  kind: ViewportRenderOutputArtifact['kind']
  durationSeconds?: number
}): Promise<ViewportRenderOutputArtifact> {
  const dir = path.join(
    input.artifactRoot,
    'viewport-renders',
    normalizePathSegment(input.projectId),
    normalizePathSegment(input.contractId),
  )
  await mkdir(dir, { recursive: true })

  const filePath = path.join(dir, input.fileName)
  await writeFile(filePath, input.body, 'utf8')

  return {
    kind: input.kind,
    url: buildArtifactUrl(input.projectId, input.contractId, input.fileName),
    sizeBytes: Buffer.byteLength(input.body, 'utf8'),
    durationSeconds: input.durationSeconds,
    checksum: createHash('sha256').update(input.body).digest('hex'),
  }
}

function jsonBody(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildScenePreviewSvg(payload: ViewportRenderQueuePayload, variant: 'thumbnail' | 'proxy'): string {
  const contract = payload.metadata.renderContract
  const title = `${contract.mode.toUpperCase()} ${contract.quality.toUpperCase()}`
  const selected = contract.selectedObjectName ?? 'Scene'
  const assetFormats = contract.scene.assetFormats.length > 0 ? contract.scene.assetFormats.join(', ') : 'none'
  const width = variant === 'thumbnail' ? 960 : 1280
  const height = variant === 'thumbnail' ? 540 : 720
  const accent = contract.mode === 'film' ? '#61dafb' : '#80ff9f'
  const gridOpacity = variant === 'thumbnail' ? '0.16' : '0.24'

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(title)} viewport preview">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#09111f"/>
      <stop offset="50%" stop-color="#101a2b"/>
      <stop offset="100%" stop-color="#061014"/>
    </linearGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M 48 0 L 0 0 0 48" fill="none" stroke="${accent}" stroke-width="1" opacity="${gridOpacity}"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect width="100%" height="100%" fill="url(#grid)"/>
  <rect x="72" y="72" width="${width - 144}" height="${height - 144}" rx="28" fill="rgba(255,255,255,0.045)" stroke="${accent}" stroke-width="2" opacity="0.92"/>
  <circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) * 0.18}" fill="${accent}" opacity="0.12"/>
  <path d="M ${width * 0.34} ${height * 0.6} L ${width * 0.5} ${height * 0.32} L ${width * 0.66} ${height * 0.6} Z" fill="none" stroke="${accent}" stroke-width="5" stroke-linejoin="round"/>
  <text x="96" y="126" fill="${accent}" font-family="Inter, ui-sans-serif, system-ui" font-size="26" font-weight="700">${escapeXml(title)}</text>
  <text x="96" y="164" fill="#dbeafe" font-family="Inter, ui-sans-serif, system-ui" font-size="18">${escapeXml(selected)}</text>
  <text x="96" y="${height - 136}" fill="#a7b7d4" font-family="Inter, ui-sans-serif, system-ui" font-size="16">objects ${contract.scene.objectCount} / assets ${contract.scene.assetCount} / duration ${contract.timeline.duration}s / ${contract.profile.resolution}@${contract.profile.fps}</text>
  <text x="96" y="${height - 100}" fill="#7f8ea8" font-family="Inter, ui-sans-serif, system-ui" font-size="14">formats: ${escapeXml(assetFormats)}</text>
  <text x="96" y="${height - 68}" fill="#7f8ea8" font-family="Inter, ui-sans-serif, system-ui" font-size="14">Aethel internal scene preview - not a final cinematic export</text>
</svg>
`
}

function expectedMissingMediaKinds(payload: ViewportRenderQueuePayload): string[] {
  const expected = payload.metadata.expectedOutputs
  return expected.filter((kind) => kind === 'review-mp4' || kind === 'final-video' || kind === 'audio-mix')
}

function buildValidation(payload: ViewportRenderQueuePayload, blockedKinds: string[]): ViewportRenderOutputValidation {
  const contract = payload.metadata.renderContract
  const hasBlockingMedia = blockedKinds.length > 0
  return {
    playbackOk: !hasBlockingMedia && (contract.quality === 'draft' || payload.metadata.expectedOutputs.includes('proxy-preview')),
    performanceOk: !hasBlockingMedia || contract.quality !== 'final',
    licenseOk: true,
    continuityOk: true,
  }
}

export async function renderViewportBackendArtifacts(
  request: ViewportRenderBackendRequest,
  options: {
    artifactRoot?: string
    capturedAt?: string
    jobId?: string | null
  } = {},
): Promise<ViewportRenderBackendResult> {
  const payload = request.payload
  const contract = payload.metadata.renderContract
  const artifactRoot = options.artifactRoot ?? getDefaultArtifactRoot()
  const capturedAt = options.capturedAt ?? new Date().toISOString()
  const blockedKinds = expectedMissingMediaKinds(payload)

  const manifest = await writeArtifact({
    artifactRoot,
    projectId: payload.projectId,
    contractId: contract.id,
    fileName: 'manifest.json',
    kind: 'manifest',
    body: jsonBody({
      renderer: 'aethel-internal-scene-preview',
      capturedAt,
      projectId: payload.projectId,
      projectName: payload.projectName,
      requestedBy: payload.requestedBy,
      requestedAt: payload.requestedAt,
      contract,
      runtimeRoute: payload.runtimeRoute,
      executionPlan: payload.metadata.executionPlan,
      expectedOutputs: payload.metadata.expectedOutputs,
      blockedKinds,
      releaseReady: false,
    }),
  })

  const thumbnail = await writeArtifact({
    artifactRoot,
    projectId: payload.projectId,
    contractId: contract.id,
    fileName: 'thumbnail.svg',
    kind: 'thumbnail',
    body: buildScenePreviewSvg(payload, 'thumbnail'),
  })

  const artifacts: ViewportRenderOutputArtifact[] = [manifest, thumbnail]

  if (contract.quality === 'draft') {
    artifacts.push(await writeArtifact({
      artifactRoot,
      projectId: payload.projectId,
      contractId: contract.id,
      fileName: 'proxy-preview.svg',
      kind: 'proxy-preview',
      body: buildScenePreviewSvg(payload, 'proxy'),
      durationSeconds: contract.timeline.duration,
    }))
  }

  artifacts.push(await writeArtifact({
    artifactRoot,
    projectId: payload.projectId,
    contractId: contract.id,
    fileName: 'performance-report.json',
    kind: 'performance-report',
    body: jsonBody({
      capturedAt,
      estimatedCostUsd: payload.metadata.estimatedCostUsd,
      objectCount: contract.scene.objectCount,
      assetCount: contract.scene.assetCount,
      visualScriptNodes: contract.scene.visualScriptNodes,
      vfxNodes: contract.scene.vfxNodes,
      budget: {
        resolution: contract.profile.resolution,
        fps: contract.profile.fps,
        maxDurationSeconds: contract.profile.maxDurationSeconds,
      },
      verdict: blockedKinds.length > 0 ? 'media-backend-required' : 'draft-preview-ready',
    }),
  }))

  artifacts.push(await writeArtifact({
    artifactRoot,
    projectId: payload.projectId,
    contractId: contract.id,
    fileName: 'license-report.json',
    kind: 'license-report',
    body: jsonBody({
      capturedAt,
      assetFormats: contract.scene.assetFormats,
      verdict: 'source-license-review-required-before-final-release',
      note: 'Internal scene preview does not mint new marketplace rights; final release still requires asset provenance review.',
    }),
  }))

  const validation = buildValidation(payload, blockedKinds)
  artifacts.push(await writeArtifact({
    artifactRoot,
    projectId: payload.projectId,
    contractId: contract.id,
    fileName: 'validation-report.json',
    kind: 'validation-report',
    body: jsonBody({
      capturedAt,
      validation,
      blockedKinds,
      releaseReady: false,
      notes: [
        'Aethel internal renderer produced real scene preview artifacts.',
        ...(blockedKinds.length > 0
          ? [`Missing media outputs: ${blockedKinds.join(', ')}. Configure FFmpeg, Studio Local native render, or cloud render for final playback evidence.`]
          : ['Draft proxy preview is available. Human review is still recommended before promoting quality.']),
      ],
    }),
  }))

  const evidence = buildViewportRenderEvidenceFromContract(contract, {
    jobId: options.jobId,
    capturedAt,
    artifacts,
    validation,
    notes: [
      'Aethel internal scene preview renderer generated concrete artifacts.',
      'Release remains blocked from auto-publish; human approval is required.',
      ...(blockedKinds.length > 0
        ? [`Media outputs still require a real FFmpeg/native/cloud renderer: ${blockedKinds.join(', ')}.`]
        : []),
    ],
  })

  return {
    evidence,
    renderer: {
      kind: 'aethel-internal-scene-preview',
      artifactRoot,
      producedKinds: artifacts.map((artifact) => artifact.kind),
      blockedKinds,
      releaseReady: false,
    },
  }
}
