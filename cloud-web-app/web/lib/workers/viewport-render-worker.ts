import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { createComponentLogger } from '@/lib/observability/logger'
import {
  persistViewportRenderOutputEvidenceForProject,
  type ViewportRenderEvidencePersistenceResult,
} from '@/lib/production/render-output-evidence-persistence'
import {
  buildViewportRenderEvidenceFromContract,
  coerceViewportRenderOutputEvidence,
  type ViewportRenderOutputArtifact,
  type ViewportRenderOutputEvidence,
  type ViewportRenderOutputValidation,
} from '@/lib/production/render-output-evidence'
import {
  QUEUE_NAMES,
  queueManager,
  type QueueJobAdapter,
  type WorkerAdapter,
} from '@/lib/queue-system'
import {
  shouldHoldViewportRenderRuntimeRoute,
  VIEWPORT_RENDER_QUEUE_JOB_TYPE,
  type ViewportRenderQueuePayload,
  type ViewportRenderRuntimeRoute,
} from '@/lib/viewport/viewport-render-queue'
import { validateViewportRenderEvidenceArtifactOwnership } from '@/lib/viewport/viewport-render-evidence-ownership'

const logger = createComponentLogger('workers.viewport-render')

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export type ViewportRenderWorkerStatus = 'completed' | 'blocked' | 'skipped'

export interface ViewportRenderWorkerOptions {
  artifactRoot?: string
  fetcher?: FetchLike
  persistEvidence?: boolean
  rendererEndpoint?: string
  rendererToken?: string
}

export interface ViewportRenderWorkerResult {
  status: ViewportRenderWorkerStatus
  jobId: string | null
  projectId?: string
  contractId?: string
  evidence?: ViewportRenderOutputEvidence
  persisted?: ViewportRenderEvidencePersistenceResult
  renderer: 'external-backend' | 'manifest-only' | 'none'
  blockers: string[]
  notes: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isRuntimeRoute(value: unknown): value is ViewportRenderRuntimeRoute {
  if (!isRecord(value)) return false
  return value.lane === 'viewport-render' && typeof value.target === 'string'
}

function isViewportRenderQueuePayload(value: unknown): value is ViewportRenderQueuePayload {
  if (!isRecord(value) || !isRecord(value.metadata)) return false
  return (
    typeof value.projectId === 'string' &&
    value.metadata.source === 'viewport-render-contract' &&
    isRecord(value.metadata.renderContract) &&
    isRuntimeRoute(value.runtimeRoute)
  )
}

function validationPassed(validation: ViewportRenderOutputValidation): boolean {
  return validation.playbackOk && validation.performanceOk && validation.licenseOk && validation.continuityOk
}

function normalizePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(0, 120)
}

function buildArtifactUrl(projectId: string, contractId: string, fileName: string): string {
  return `aethel-artifact://viewport-render/${encodeURIComponent(projectId)}/${encodeURIComponent(contractId)}/${encodeURIComponent(fileName)}`
}

async function writeJsonArtifact(input: {
  artifactRoot: string
  projectId: string
  contractId: string
  fileName: string
  content: unknown
}): Promise<ViewportRenderOutputArtifact> {
  const dir = path.join(
    input.artifactRoot,
    'viewport-renders',
    normalizePathSegment(input.projectId),
    normalizePathSegment(input.contractId),
  )
  await mkdir(dir, { recursive: true })

  const body = `${JSON.stringify(input.content, null, 2)}\n`
  const filePath = path.join(dir, input.fileName)
  await writeFile(filePath, body, 'utf8')

  return {
    kind: input.fileName.includes('validation') ? 'validation-report' : 'manifest',
    url: buildArtifactUrl(input.projectId, input.contractId, input.fileName),
    sizeBytes: Buffer.byteLength(body, 'utf8'),
    checksum: createHash('sha256').update(body).digest('hex'),
  }
}

function getDefaultArtifactRoot(): string {
  return process.env.AETHEL_RENDER_ARTIFACT_ROOT || path.join(process.cwd(), '.aethel', 'runtime-artifacts')
}

function getRendererEndpoint(options?: ViewportRenderWorkerOptions): string | null {
  const value = options?.rendererEndpoint ?? process.env.AETHEL_RENDER_BACKEND_ENDPOINT ?? process.env.AETHEL_RENDER_BACKEND_BASE_URL
  if (!value || value.trim().length === 0) return null
  return value.trim()
}

function buildRendererEndpointUrl(endpoint: string): string {
  if (endpoint.endsWith('/viewport/render')) return endpoint
  return `${endpoint.replace(/\/+$/, '')}/viewport/render`
}

async function requestExternalRenderEvidence(
  payload: ViewportRenderQueuePayload,
  options: ViewportRenderWorkerOptions,
): Promise<ViewportRenderOutputEvidence | null> {
  const endpoint = getRendererEndpoint(options)
  if (!endpoint) return null

  const fetcher = options.fetcher ?? fetch
  const response = await fetcher(buildRendererEndpointUrl(endpoint), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(options.rendererToken || process.env.AETHEL_RENDER_BACKEND_TOKEN
        ? { authorization: `Bearer ${options.rendererToken ?? process.env.AETHEL_RENDER_BACKEND_TOKEN}` }
        : {}),
    },
    body: JSON.stringify({
      jobType: VIEWPORT_RENDER_QUEUE_JOB_TYPE,
      payload,
      evidencePolicy: {
        requirePlayback: true,
        requirePerformance: true,
        requireLicense: true,
        requireContinuity: true,
        neverAutoRelease: true,
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Renderer backend rejected viewport render (${response.status})`)
  }

  return coerceViewportRenderOutputEvidence(await response.json())
}

async function buildManifestOnlyEvidence(
  payload: ViewportRenderQueuePayload,
  input: {
    jobId: string | null
    artifactRoot: string
    blockers: string[]
    notes: string[]
  },
): Promise<ViewportRenderOutputEvidence> {
  const contract = payload.metadata.renderContract
  const base = {
    generatedAt: new Date().toISOString(),
    jobId: input.jobId,
    projectId: payload.projectId,
    projectName: payload.projectName,
    contract,
    runtimeRoute: payload.runtimeRoute,
    requestedBy: payload.requestedBy,
    requestedAt: payload.requestedAt,
  }

  const manifest = await writeJsonArtifact({
    artifactRoot: input.artifactRoot,
    projectId: payload.projectId,
    contractId: contract.id,
    fileName: 'manifest.json',
    content: {
      ...base,
      outputs: payload.metadata.expectedOutputs,
      executionPlan: payload.metadata.executionPlan,
      note: 'Manifest was generated by the viewport render worker. Media rendering remains blocked until a real renderer backend produces playback evidence.',
    },
  })
  const validation = await writeJsonArtifact({
    artifactRoot: input.artifactRoot,
    projectId: payload.projectId,
    contractId: contract.id,
    fileName: 'validation-report.json',
    content: {
      ...base,
      validation: {
        playbackOk: false,
        performanceOk: false,
        licenseOk: true,
        continuityOk: true,
      },
      blockers: input.blockers,
      notes: input.notes,
    },
  })

  return buildViewportRenderEvidenceFromContract(contract, {
    jobId: input.jobId,
    artifacts: [manifest, validation],
    validation: {
      playbackOk: false,
      performanceOk: false,
      licenseOk: true,
      continuityOk: true,
    },
    notes: input.notes,
  })
}

export async function executeViewportRenderQueuePayload(
  payload: ViewportRenderQueuePayload,
  options: ViewportRenderWorkerOptions = {},
  jobId: string | null = null,
): Promise<ViewportRenderWorkerResult> {
  if (shouldHoldViewportRenderRuntimeRoute(payload.runtimeRoute)) {
    return {
      status: 'blocked',
      jobId,
      projectId: payload.projectId,
      contractId: payload.metadata.renderContract.id,
      renderer: 'none',
      blockers: [payload.runtimeRoute.reason],
      notes: ['Runtime router held the viewport render job before heavy work started.'],
    }
  }

  const blockers: string[] = []
  const notes: string[] = []
  const rendererEndpoint = getRendererEndpoint(options)

  if (rendererEndpoint) {
    try {
      const evidence = await requestExternalRenderEvidence(payload, options)
      if (evidence) {
        const artifactOwnership = validateViewportRenderEvidenceArtifactOwnership({
          evidence,
          projectId: payload.projectId,
        })
        if (!artifactOwnership.ok) {
          return {
            status: 'blocked',
            jobId,
            projectId: payload.projectId,
            contractId: evidence.contractId,
            renderer: 'external-backend',
            blockers: [`Renderer backend returned unsafe artifact evidence: ${artifactOwnership.message}`],
            notes: [
              'Renderer backend evidence was rejected before persistence because an internal artifact reference failed project ownership validation.',
            ],
          }
        }

        return {
          status: validationPassed(evidence.validation) ? 'completed' : 'blocked',
          jobId,
          projectId: payload.projectId,
          contractId: evidence.contractId,
          evidence: {
            ...evidence,
            projectId: payload.projectId,
            jobId,
          },
          renderer: 'external-backend',
          blockers: validationPassed(evidence.validation) ? [] : ['Renderer backend returned evidence that did not pass every release gate.'],
          notes: ['Renderer backend produced media evidence. Human release approval is still required.'],
        }
      }
      blockers.push('Renderer backend response did not contain valid viewport output evidence.')
    } catch (error) {
      blockers.push(error instanceof Error ? error.message : 'Renderer backend failed with an unknown error.')
    }
  } else {
    blockers.push('AETHEL_RENDER_BACKEND_ENDPOINT is not configured.')
  }

  notes.push('No media artifact was fabricated. Worker generated manifest and validation evidence only.')
  notes.push('Configure a real renderer backend, Studio Local native renderer, or cloud sandbox executor to unlock playback evidence.')

  const evidence = await buildManifestOnlyEvidence(payload, {
    jobId,
    artifactRoot: options.artifactRoot ?? getDefaultArtifactRoot(),
    blockers,
    notes,
  })

  return {
    status: 'blocked',
    jobId,
    projectId: payload.projectId,
    contractId: evidence.contractId,
    evidence,
    renderer: 'manifest-only',
    blockers,
    notes,
  }
}

export async function processViewportRenderQueueJob(
  job: Pick<QueueJobAdapter, 'id' | 'name' | 'data'>,
  options: ViewportRenderWorkerOptions = {},
): Promise<ViewportRenderWorkerResult> {
  const jobId = job.id === undefined ? null : String(job.id)
  if (job.name !== VIEWPORT_RENDER_QUEUE_JOB_TYPE) {
    return {
      status: 'skipped',
      jobId,
      renderer: 'none',
      blockers: [],
      notes: [`Skipped unsupported job type "${job.name}".`],
    }
  }

  if (!isViewportRenderQueuePayload(job.data)) {
    throw new Error('Invalid viewport render queue payload.')
  }

  const result = await executeViewportRenderQueuePayload(job.data, options, jobId)
  if (options.persistEvidence !== false && result.evidence) {
    result.persisted = await persistViewportRenderOutputEvidenceForProject({
      projectId: job.data.projectId,
      evidence: result.evidence,
    })
  }

  logger.info('viewport_render_job.processed', {
    jobId,
    projectId: result.projectId,
    contractId: result.contractId,
    status: result.status,
    renderer: result.renderer,
    blockerCount: result.blockers.length,
    artifactCount: result.evidence?.artifacts.length ?? 0,
    persisted: result.persisted?.persisted ?? false,
  })

  return result
}

export async function registerViewportRenderWorker(input: {
  concurrency?: number
  options?: ViewportRenderWorkerOptions
} = {}): Promise<WorkerAdapter | null> {
  return queueManager.registerWorker(
    QUEUE_NAMES.EXPORT,
    (job) => processViewportRenderQueueJob(job, input.options),
    input.concurrency ?? 2,
  )
}
