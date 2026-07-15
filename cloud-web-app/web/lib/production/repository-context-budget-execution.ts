import type { RepositoryCartographyManifest, RepositoryContextStrategy } from './repository-cartography'

export const REPOSITORY_CONTEXT_BUDGET_EXECUTION_SETTINGS_KEY = 'aethelRepositoryContextBudgetExecution'

export type RepositoryContextBudgetBatchStatus = 'pending' | 'running' | 'complete' | 'blocked'

export interface RepositoryContextBudgetExecutionBatch {
  id: string
  strategy: RepositoryContextStrategy
  purpose: string
  status: RepositoryContextBudgetBatchStatus
  surfaceCount: number
  completedSurfaceCount: number
  evidenceRefs: string[]
  blocker: string | null
  updatedAt: string
}

export interface RepositoryContextBudgetExecutionState {
  version: 1
  projectId: string
  manifestId: string
  manifestGeneratedAt: string
  updatedAt: string
  batches: RepositoryContextBudgetExecutionBatch[]
}

export type RepositoryContextBudgetExecutionPatch = {
  batchId?: string
  status?: RepositoryContextBudgetBatchStatus
  completedSurfaceCount?: number
  evidenceRefs?: string[]
  blocker?: string | null
}

const statuses: RepositoryContextBudgetBatchStatus[] = ['pending', 'running', 'complete', 'blocked']

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)))
}

function isoNow(now?: string): string {
  return now ?? new Date().toISOString()
}

function normalizeCompleted(value: unknown, surfaceCount: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(surfaceCount, Math.floor(value as number)))
}

function normalizeStatus(value: unknown, fallback: RepositoryContextBudgetBatchStatus): RepositoryContextBudgetBatchStatus {
  return typeof value === 'string' && statuses.includes(value as RepositoryContextBudgetBatchStatus)
    ? (value as RepositoryContextBudgetBatchStatus)
    : fallback
}

function normalizeEvidenceRefs(value: unknown): string[] {
  return unique(Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [])
}

function batchFromManifest(
  manifest: RepositoryCartographyManifest,
  previous: RepositoryContextBudgetExecutionState | null | undefined,
  now?: string
): RepositoryContextBudgetExecutionBatch[] {
  const previousById = new Map(previous?.manifestId === manifest.id ? previous.batches.map((batch) => [batch.id, batch]) : [])
  return manifest.contextBudget.retrievalBatches.map((batch) => {
    const existing = previousById.get(batch.id)
    return {
      id: batch.id,
      strategy: batch.strategy,
      purpose: batch.purpose,
      status: existing?.status ?? 'pending',
      surfaceCount: batch.surfaces.length,
      completedSurfaceCount: Math.min(existing?.completedSurfaceCount ?? 0, batch.surfaces.length),
      evidenceRefs: existing?.evidenceRefs ?? [],
      blocker: existing?.blocker ?? null,
      updatedAt: existing?.updatedAt ?? isoNow(now),
    }
  })
}

export function buildRepositoryContextBudgetExecutionState(input: {
  projectId: string
  manifest: RepositoryCartographyManifest
  previous?: RepositoryContextBudgetExecutionState | null
  now?: string
}): RepositoryContextBudgetExecutionState {
  return {
    version: 1,
    projectId: input.projectId,
    manifestId: input.manifest.id,
    manifestGeneratedAt: input.manifest.generatedAt,
    updatedAt: isoNow(input.now),
    batches: batchFromManifest(input.manifest, input.previous, input.now),
  }
}

export function mergeRepositoryContextBudgetExecutionPatch(
  current: RepositoryContextBudgetExecutionState,
  patch: RepositoryContextBudgetExecutionPatch,
  now?: string
): RepositoryContextBudgetExecutionState {
  const batchId = patch.batchId?.trim()
  if (!batchId) return current

  const updatedAt = isoNow(now)
  return {
    ...current,
    updatedAt,
    batches: current.batches.map((batch) => {
      if (batch.id !== batchId) return batch
      const status = normalizeStatus(patch.status, batch.status)
      const completedSurfaceCount =
        typeof patch.completedSurfaceCount === 'number'
          ? normalizeCompleted(patch.completedSurfaceCount, batch.surfaceCount)
          : status === 'complete'
            ? batch.surfaceCount
            : batch.completedSurfaceCount
      return {
        ...batch,
        status,
        completedSurfaceCount,
        evidenceRefs: unique([...batch.evidenceRefs, ...normalizeEvidenceRefs(patch.evidenceRefs)]).slice(0, 20),
        blocker: patch.blocker === undefined ? batch.blocker : patch.blocker,
        updatedAt,
      }
    }),
  }
}

export function readRepositoryContextBudgetExecutionStateFromSettings(
  settings: unknown
): RepositoryContextBudgetExecutionState | null {
  if (!isRecord(settings)) return null
  const candidate = settings[REPOSITORY_CONTEXT_BUDGET_EXECUTION_SETTINGS_KEY]
  if (!isRecord(candidate)) return null
  if (candidate.version !== 1) return null
  if (
    typeof candidate.projectId !== 'string' ||
    typeof candidate.manifestId !== 'string' ||
    typeof candidate.manifestGeneratedAt !== 'string' ||
    typeof candidate.updatedAt !== 'string' ||
    !Array.isArray(candidate.batches)
  ) {
    return null
  }
  return candidate as unknown as RepositoryContextBudgetExecutionState
}

export function writeRepositoryContextBudgetExecutionStateToSettings(
  settings: unknown,
  executionState: RepositoryContextBudgetExecutionState
): Record<string, unknown> {
  return {
    ...(isRecord(settings) ? settings : {}),
    [REPOSITORY_CONTEXT_BUDGET_EXECUTION_SETTINGS_KEY]: executionState,
  }
}
