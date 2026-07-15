import type { ViewportAssetImportBatch } from '@/lib/viewport/viewport-asset-import'

export type ViewportAssetImportPersistenceStatus = 'idle' | 'saving' | 'saved' | 'error' | 'skipped'

export type ViewportAssetImportPersistenceResult =
  | { ok: true; status: number; payload: unknown }
  | { ok: false; status: number; error: string }

export type ViewportAssetImportPersistenceOptions = {
  projectId: string | null | undefined
  batch: ViewportAssetImportBatch
  token?: string | null
  fetcher?: typeof fetch
}

export function canPersistViewportAssetImport(projectId: string | null | undefined): projectId is string {
  return Boolean(projectId && projectId.trim().length > 0 && projectId !== 'local-project')
}

export function buildViewportAssetImportPersistenceRequest(
  projectId: string,
  batch: ViewportAssetImportBatch,
  token?: string | null,
): { url: string; init: RequestInit } {
  return {
    url: `/api/projects/${encodeURIComponent(projectId)}/production-state/asset-import`,
    init: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        batch: {
          ...batch,
          projectId,
          evidenceRefs: Array.from(new Set([
            ...batch.evidenceRefs,
            `viewport:asset-import:${batch.id}`,
          ])),
        },
      }),
    },
  }
}

export async function persistViewportAssetImportBatch({
  projectId,
  batch,
  token,
  fetcher = fetch,
}: ViewportAssetImportPersistenceOptions): Promise<ViewportAssetImportPersistenceResult> {
  if (!canPersistViewportAssetImport(projectId)) {
    return { ok: false, status: 0, error: 'No persisted project context is available for this viewport asset import.' }
  }

  const request = buildViewportAssetImportPersistenceRequest(projectId, batch, token)
  try {
    const response = await fetcher(request.url, request.init)
    const payload = await response.json().catch(() => null) as unknown
    if (!response.ok) {
      const error = typeof payload === 'object' && payload && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : 'Failed to persist viewport asset import.'
      return { ok: false, status: response.status, error }
    }
    return { ok: true, status: response.status, payload }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : 'Failed to persist viewport asset import.',
    }
  }
}
