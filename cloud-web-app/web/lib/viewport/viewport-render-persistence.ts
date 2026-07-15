import type { ViewportRenderJobContract } from '@/lib/viewport/viewport-render-contract'

export type ViewportRenderJobPersistenceStatus = 'idle' | 'saving' | 'saved' | 'error' | 'skipped'

export type ViewportRenderJobPersistencePayload = {
  queued?: boolean
  queue?: {
    status?: string
    jobId?: string
    message?: string
  }
  queueNote?: string
}

export type ViewportRenderJobPersistenceResult =
  | {
      ok: true
      status: number
      payload: unknown
      queued: boolean
      queueStatus: string | null
      jobId: string | null
      message: string | null
    }
  | { ok: false; status: number; error: string }

export type ViewportRenderJobPersistenceOptions = {
  projectId: string | null | undefined
  contract: ViewportRenderJobContract
  token?: string | null
  enqueue?: boolean
  fetcher?: typeof fetch
}

export function canPersistViewportRenderJob(projectId: string | null | undefined): projectId is string {
  return Boolean(projectId && projectId.trim().length > 0 && projectId !== 'local-project')
}

export function buildViewportRenderJobPersistenceRequest(
  projectId: string,
  contract: ViewportRenderJobContract,
  token?: string | null,
  enqueue = false,
): { url: string; init: RequestInit } {
  return {
    url: `/api/projects/${encodeURIComponent(projectId)}/production-state/render-job`,
    init: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        enqueue,
        contract: {
          ...contract,
          projectId,
          evidenceRefs: Array.from(new Set([
            ...contract.evidenceRefs,
            `viewport:render-job:${contract.id}`,
          ])),
        },
      }),
    },
  }
}

export async function persistViewportRenderJob({
  projectId,
  contract,
  token,
  enqueue = false,
  fetcher = fetch,
}: ViewportRenderJobPersistenceOptions): Promise<ViewportRenderJobPersistenceResult> {
  if (!canPersistViewportRenderJob(projectId)) {
    return { ok: false, status: 0, error: 'No persisted project context is available for this viewport render contract.' }
  }

  const request = buildViewportRenderJobPersistenceRequest(projectId, contract, token, enqueue)
  try {
    const response = await fetcher(request.url, request.init)
    const payload = await response.json().catch(() => null) as unknown
    if (!response.ok) {
      const error = typeof payload === 'object' && payload && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : 'Failed to persist viewport render contract.'
      return { ok: false, status: response.status, error }
    }
    const parsedPayload = isPersistencePayload(payload) ? payload : null
    return {
      ok: true,
      status: response.status,
      payload,
      queued: parsedPayload?.queued === true,
      queueStatus: typeof parsedPayload?.queue?.status === 'string' ? parsedPayload.queue.status : null,
      jobId: typeof parsedPayload?.queue?.jobId === 'string' ? parsedPayload.queue.jobId : null,
      message:
        typeof parsedPayload?.queue?.message === 'string'
          ? parsedPayload.queue.message
          : typeof parsedPayload?.queueNote === 'string'
            ? parsedPayload.queueNote
            : null,
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : 'Failed to persist viewport render contract.',
    }
  }
}

function isPersistencePayload(value: unknown): value is ViewportRenderJobPersistencePayload {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
