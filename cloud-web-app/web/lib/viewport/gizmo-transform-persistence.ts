import type { GizmoTransformOperation } from '@/lib/viewport/gizmo-transform-operation'

export type GizmoTransformPersistenceStatus = 'idle' | 'saving' | 'saved' | 'error' | 'skipped'

export type GizmoTransformPersistenceResult =
  | { ok: true; status: number; payload: unknown }
  | { ok: false; status: number; error: string }

export type GizmoTransformPersistenceChipTone = 'neutral' | 'saving' | 'success' | 'warning' | 'error'

export type GizmoTransformPersistenceChipInput = {
  status: GizmoTransformPersistenceStatus
  canPersist: boolean
  lastOperationLabel?: string | null
  lastError?: string | null
}

export type GizmoTransformPersistenceChip = {
  visible: boolean
  tone: GizmoTransformPersistenceChipTone
  label: string
  detail: string
}

export type GizmoTransformPersistenceOptions = {
  projectId: string | null | undefined
  operation: GizmoTransformOperation
  token?: string | null
  fetcher?: typeof fetch
}

export function canPersistGizmoTransform(projectId: string | null | undefined): projectId is string {
  return Boolean(projectId && projectId.trim().length > 0 && projectId !== 'local-project')
}

export function buildGizmoTransformPersistenceChip(input: GizmoTransformPersistenceChipInput): GizmoTransformPersistenceChip {
  const label = input.lastOperationLabel?.trim() || 'Viewport transform'

  if (input.status === 'idle') {
    return {
      visible: false,
      tone: 'neutral',
      label: 'Gizmo memory',
      detail: input.canPersist ? 'Ready to capture transforms' : 'Local preview only',
    }
  }

  if (input.status === 'saving') {
    return {
      visible: true,
      tone: 'saving',
      label: 'Saving transform',
      detail: label,
    }
  }

  if (input.status === 'saved') {
    return {
      visible: true,
      tone: 'success',
      label: 'Saved to Mission Ledger',
      detail: label,
    }
  }

  if (input.status === 'skipped') {
    return {
      visible: true,
      tone: 'warning',
      label: 'Local viewport only',
      detail: 'Open a persisted project to write gizmo memory',
    }
  }

  return {
    visible: true,
    tone: 'error',
    label: 'Gizmo memory failed',
    detail: input.lastError?.trim() || 'Transform was not persisted',
  }
}

export function buildGizmoTransformPersistenceRequest(
  projectId: string,
  operation: GizmoTransformOperation,
  token?: string | null,
): { url: string; init: RequestInit } {
  return {
    url: `/api/projects/${encodeURIComponent(projectId)}/production-state/gizmo-transform`,
    init: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        operation: {
          ...operation,
          projectId: operation.projectId ?? projectId,
          evidenceRefs: Array.from(new Set([
            ...operation.evidenceRefs,
            `viewport:gizmo:${operation.id}`,
          ])),
        },
      }),
    },
  }
}

export async function persistGizmoTransformOperation({
  projectId,
  operation,
  token,
  fetcher = fetch,
}: GizmoTransformPersistenceOptions): Promise<GizmoTransformPersistenceResult> {
  if (!canPersistGizmoTransform(projectId)) {
    return { ok: false, status: 0, error: 'No persisted project context is available for this viewport transform.' }
  }

  const request = buildGizmoTransformPersistenceRequest(projectId, operation, token)
  try {
    const response = await fetcher(request.url, request.init)
    const payload = await response.json().catch(() => null) as unknown
    if (!response.ok) {
      const error = typeof payload === 'object' && payload && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : 'Failed to persist gizmo transform operation.'
      return { ok: false, status: response.status, error }
    }
    return { ok: true, status: response.status, payload }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : 'Failed to persist gizmo transform operation.',
    }
  }
}
