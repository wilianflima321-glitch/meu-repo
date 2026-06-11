import { DEFAULT_BUDGET } from './deep-spine-scan.contracts'
import type { DeepSpineScanBudget, DeepSpineScanMode, DeepSpineScanScope } from './deep-spine-scan.contracts'
import type { CartographySourceKind, RepositoryArtifactInput } from './repository-cartography'

export function compact(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function normalizePath(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '').replace(/\/+/g, '/').trim()
}

export function unique(values: string[], limit = 120): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).slice(0, limit)
}

export function appendUnique(existing: string[], incoming: string[], limit = 80): string[] {
  return unique([...existing, ...incoming], limit)
}

export function clamp(value: number | undefined, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.max(min, Math.min(max, Math.floor(value as number)))
}

export function normalizeBudget(input: Partial<DeepSpineScanBudget> | undefined): DeepSpineScanBudget {
  return {
    maxFiles: clamp(input?.maxFiles, DEFAULT_BUDGET.maxFiles, 1, 50_000),
    maxBytes: clamp(input?.maxBytes, DEFAULT_BUDGET.maxBytes, 1_000, 50 * 1024 * 1024 * 1024),
    maxHashBytes: clamp(input?.maxHashBytes, DEFAULT_BUDGET.maxHashBytes, 0, 512 * 1024 * 1024),
    maxTimeMs: clamp(input?.maxTimeMs, DEFAULT_BUDGET.maxTimeMs, 10_000, 3_600_000),
    maxFindings: clamp(input?.maxFindings, DEFAULT_BUDGET.maxFindings, 1, 500),
    allowCloudIndexing: input?.allowCloudIndexing ?? DEFAULT_BUDGET.allowCloudIndexing,
  }
}

export function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90) || 'scan'
}

export function scanIdFor(input: { projectId: string; mode: DeepSpineScanMode; generatedAt: string }): string {
  return `deep-spine-${slugify(`${input.projectId}-${input.mode}-${input.generatedAt}`)}`
}

export function normalizeScope(input: {
  scope?: Partial<DeepSpineScanScope>
  artifacts: RepositoryArtifactInput[]
}): DeepSpineScanScope {
  const paths = unique(
    (input.scope?.paths && input.scope.paths.length > 0
      ? input.scope.paths
      : input.artifacts.map((artifact) => artifact.path)
    ).map(normalizePath),
    80
  )
  const sourceKinds = new Set<CartographySourceKind>(
    input.artifacts.map((artifact) => artifact.sourceKind ?? 'local-workspace')
  )
  const inferredSourceKind: CartographySourceKind | 'mixed' = sourceKinds.size === 1 ? Array.from(sourceKinds)[0] : 'mixed'

  return {
    paths: paths.length > 0 ? paths : ['/'],
    sourceKind: input.scope?.sourceKind ?? inferredSourceKind,
    description: compact(input.scope?.description) ?? 'Governed deep scan over selected project surfaces.',
  }
}

export function selectArtifactsForBudget(artifacts: RepositoryArtifactInput[], budget: DeepSpineScanBudget): RepositoryArtifactInput[] {
  const selected: RepositoryArtifactInput[] = []
  let totalBytes = 0

  for (const artifact of artifacts) {
    if (selected.length >= budget.maxFiles) break
    if (totalBytes + artifact.sizeBytes > budget.maxBytes) break
    selected.push(artifact)
    totalBytes += artifact.sizeBytes
  }

  return selected
}
