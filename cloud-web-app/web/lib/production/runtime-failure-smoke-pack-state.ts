import type { RuntimeFailureSmokePackReport } from '@/lib/runtime/runtime-failure-smoke-pack'

export const RUNTIME_FAILURE_SMOKE_PACK_SETTINGS_KEY = 'aethelRuntimeFailureSmokePacks'
export const RUNTIME_FAILURE_SMOKE_PACK_HISTORY_LIMIT = 12

export type RuntimeFailureSmokePackStoredSummary = {
  runId: string
  generatedAt: string
  scenarioCount: number
  governedFailureCount: number
  recoveredWithReceiptsCount: number
  blockedForReviewCount: number
  marketClaimAllowed: false
  releaseReady: false
  evidenceRefs: string[]
}

export type RuntimeFailureSmokePackState = {
  version: 1
  projectId: string
  updatedAt: string
  packs: RuntimeFailureSmokePackStoredSummary[]
  summary: {
    totalPacks: number
    totalScenarios: number
    governedFailureCount: number
    blockedForReviewCount: number
    recoveredWithReceiptsCount: number
    lastRunId: string | null
    releaseReady: false
  }
  releasePolicy: 'human-review-required'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function unique(values: string[], limit = 80): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).slice(0, limit)
}

function packEvidenceRefs(report: RuntimeFailureSmokePackReport): string[] {
  return unique([
    `runtime-failure-smoke-pack:${report.generatedAt}`,
    ...report.scenarios.map((scenario) => `runtime-failure-smoke:${scenario.runId}`),
    ...report.scenarios.flatMap((scenario) => scenario.ledger.events.flatMap((event) => event.evidenceRefs)),
  ], 120)
}

export function summarizeRuntimeFailureSmokePack(
  report: RuntimeFailureSmokePackReport,
): RuntimeFailureSmokePackStoredSummary {
  return {
    runId: report.scenarios[0]?.runId.split(':').slice(0, -1).join(':') || `runtime-smoke:${report.generatedAt}`,
    generatedAt: report.generatedAt,
    scenarioCount: report.scenarioCount,
    governedFailureCount: report.governedFailureCount,
    recoveredWithReceiptsCount: report.recoveredWithReceiptsCount,
    blockedForReviewCount: report.blockedForReviewCount,
    marketClaimAllowed: false,
    releaseReady: false,
    evidenceRefs: packEvidenceRefs(report),
  }
}

export function buildRuntimeFailureSmokePackState(params: {
  projectId: string
  report: RuntimeFailureSmokePackReport
  previous?: RuntimeFailureSmokePackState | null
}): RuntimeFailureSmokePackState {
  const updatedAt = params.report.generatedAt
  const nextPack = summarizeRuntimeFailureSmokePack(params.report)
  const previousPacks = params.previous?.packs ?? []
  const packs = [nextPack, ...previousPacks.filter((pack) => pack.runId !== nextPack.runId)].slice(0, RUNTIME_FAILURE_SMOKE_PACK_HISTORY_LIMIT)
  return {
    version: 1,
    projectId: params.projectId,
    updatedAt,
    packs,
    summary: {
      totalPacks: packs.length,
      totalScenarios: packs.reduce((total, pack) => total + pack.scenarioCount, 0),
      governedFailureCount: packs.reduce((total, pack) => total + pack.governedFailureCount, 0),
      blockedForReviewCount: packs.reduce((total, pack) => total + pack.blockedForReviewCount, 0),
      recoveredWithReceiptsCount: packs.reduce((total, pack) => total + pack.recoveredWithReceiptsCount, 0),
      lastRunId: nextPack.runId,
      releaseReady: false,
    },
    releasePolicy: 'human-review-required',
  }
}

export function validateRuntimeFailureSmokePackState(state: RuntimeFailureSmokePackState): string[] {
  const failures: string[] = []
  if (state.version !== 1) failures.push('invalid smoke pack state version')
  if (!state.projectId.trim()) failures.push('projectId is required')
  if (state.releasePolicy !== 'human-review-required') failures.push('release policy must require human review')
  if (state.summary.releaseReady !== false) failures.push('runtime failure smoke pack state cannot be release ready')
  if (state.packs.length > RUNTIME_FAILURE_SMOKE_PACK_HISTORY_LIMIT) failures.push('smoke pack history limit exceeded')
  for (const pack of state.packs) {
    if (pack.marketClaimAllowed !== false) failures.push(`${pack.runId}: market claims must stay blocked`)
    if (pack.releaseReady !== false) failures.push(`${pack.runId}: releaseReady must stay false`)
    if (pack.evidenceRefs.length === 0) failures.push(`${pack.runId}: evidence refs are required`)
  }
  return failures
}

export function readRuntimeFailureSmokePackStateFromSettings(settings: unknown): RuntimeFailureSmokePackState | null {
  if (!isRecord(settings)) return null
  const candidate = settings[RUNTIME_FAILURE_SMOKE_PACK_SETTINGS_KEY]
  if (!isRecord(candidate)) return null
  if (candidate.version !== 1 || typeof candidate.projectId !== 'string' || !Array.isArray(candidate.packs)) return null
  return candidate as unknown as RuntimeFailureSmokePackState
}

export function writeRuntimeFailureSmokePackStateToSettings(
  settings: unknown,
  state: RuntimeFailureSmokePackState,
): Record<string, unknown> {
  return {
    ...(isRecord(settings) ? settings : {}),
    [RUNTIME_FAILURE_SMOKE_PACK_SETTINGS_KEY]: state,
  }
}
