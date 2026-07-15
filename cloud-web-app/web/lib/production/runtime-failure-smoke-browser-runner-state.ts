import type { RuntimeFailureSmokeBrowserRunnerReport } from '@aethel/runtime/runtime-failure-smoke-runner-report'
import { validateRuntimeFailureSmokeBrowserRunnerReport } from '@aethel/runtime/runtime-failure-smoke-runner-report'

export const RUNTIME_FAILURE_SMOKE_BROWSER_RUNNER_SETTINGS_KEY = 'aethelRuntimeFailureSmokeBrowserRunnerReports'
export const RUNTIME_FAILURE_SMOKE_BROWSER_RUNNER_HISTORY_LIMIT = 12

export type RuntimeFailureSmokeBrowserRunnerStoredSummary = {
  runId: string
  generatedAt: string
  baseUrl: string
  harnessCount: number
  passedCount: number
  strictReceiptMatchCount: number
  marketClaimAllowed: false
  releaseReady: false
  evidenceRefs: string[]
  screenshotRefs: string[]
}

export type RuntimeFailureSmokeBrowserRunnerState = {
  version: 1
  projectId: string
  updatedAt: string
  reports: RuntimeFailureSmokeBrowserRunnerStoredSummary[]
  summary: {
    totalReports: number
    totalHarnesses: number
    totalPassedHarnesses: number
    strictReceiptMatchCount: number
    lastRunId: string | null
    releaseReady: false
  }
  releasePolicy: 'human-review-required'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function unique(values: string[], limit = 120): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).slice(0, limit)
}

function browserRunnerEvidenceRefs(report: RuntimeFailureSmokeBrowserRunnerReport): string[] {
  return unique([
    `runtime-failure-smoke-browser-runner:${report.generatedAt}`,
    ...report.evidenceRefs,
    ...report.results.flatMap((result: any) => result.evidenceRefs),
  ], 160)
}

export function summarizeRuntimeFailureSmokeBrowserRunnerReport(
  report: RuntimeFailureSmokeBrowserRunnerReport,
): RuntimeFailureSmokeBrowserRunnerStoredSummary {
  return {
    runId: `runtime-browser-smoke:${report.generatedAt}`,
    generatedAt: report.generatedAt,
    baseUrl: report.baseUrl,
    harnessCount: report.harnessCount,
    passedCount: report.passedCount,
    strictReceiptMatchCount: report.strictReceiptMatchCount,
    marketClaimAllowed: false,
    releaseReady: false,
    evidenceRefs: browserRunnerEvidenceRefs(report),
    screenshotRefs: unique(report.results.map((result: any) => result.screenshot)),
  }
}

export function buildRuntimeFailureSmokeBrowserRunnerState(params: {
  projectId: string
  report: RuntimeFailureSmokeBrowserRunnerReport
  previous?: RuntimeFailureSmokeBrowserRunnerState | null
}): RuntimeFailureSmokeBrowserRunnerState {
  const updatedAt = params.report.generatedAt
  const nextReport = summarizeRuntimeFailureSmokeBrowserRunnerReport(params.report)
  const previousReports = params.previous?.reports ?? []
  const reports = [nextReport, ...previousReports.filter((report) => report.runId !== nextReport.runId)].slice(
    0,
    RUNTIME_FAILURE_SMOKE_BROWSER_RUNNER_HISTORY_LIMIT,
  )
  return {
    version: 1,
    projectId: params.projectId,
    updatedAt,
    reports,
    summary: {
      totalReports: reports.length,
      totalHarnesses: reports.reduce((total, report) => total + report.harnessCount, 0),
      totalPassedHarnesses: reports.reduce((total, report) => total + report.passedCount, 0),
      strictReceiptMatchCount: reports.reduce((total, report) => total + report.strictReceiptMatchCount, 0),
      lastRunId: nextReport.runId,
      releaseReady: false,
    },
    releasePolicy: 'human-review-required',
  }
}

export function validateRuntimeFailureSmokeBrowserRunnerState(
  state: RuntimeFailureSmokeBrowserRunnerState,
): string[] {
  const failures: string[] = []
  if (state.version !== 1) failures.push('invalid browser runner state version')
  if (!state.projectId.trim()) failures.push('projectId is required')
  if (state.releasePolicy !== 'human-review-required') failures.push('browser runner state must require human review')
  if (state.summary.releaseReady !== false) failures.push('browser runner state cannot be release ready')
  if (state.reports.length > RUNTIME_FAILURE_SMOKE_BROWSER_RUNNER_HISTORY_LIMIT) failures.push('browser runner report history limit exceeded')
  for (const report of state.reports) {
    if (report.marketClaimAllowed !== false) failures.push(`${report.runId}: market claims must stay blocked`)
    if (report.releaseReady !== false) failures.push(`${report.runId}: releaseReady must stay false`)
    if (report.harnessCount !== 2) failures.push(`${report.runId}: IDE and preview harness reports are required`)
    if (report.strictReceiptMatchCount !== report.harnessCount) failures.push(`${report.runId}: strict receipt coverage is incomplete`)
    if (report.evidenceRefs.length < 6) failures.push(`${report.runId}: evidence refs are too thin`)
    if (report.screenshotRefs.length < 2) failures.push(`${report.runId}: screenshot refs are required for both harnesses`)
  }
  return failures
}

export function buildRuntimeFailureSmokeBrowserRunnerStateFromReport(params: {
  projectId: string
  report: RuntimeFailureSmokeBrowserRunnerReport
  previous?: RuntimeFailureSmokeBrowserRunnerState | null
}): { state: RuntimeFailureSmokeBrowserRunnerState; validationErrors: string[] } {
  const reportErrors = validateRuntimeFailureSmokeBrowserRunnerReport(params.report)
  const state = buildRuntimeFailureSmokeBrowserRunnerState(params)
  return {
    state,
    validationErrors: unique([...reportErrors, ...validateRuntimeFailureSmokeBrowserRunnerState(state)]),
  }
}

export function readRuntimeFailureSmokeBrowserRunnerStateFromSettings(
  settings: unknown,
): RuntimeFailureSmokeBrowserRunnerState | null {
  if (!isRecord(settings)) return null
  const candidate = settings[RUNTIME_FAILURE_SMOKE_BROWSER_RUNNER_SETTINGS_KEY]
  if (!isRecord(candidate)) return null
  if (candidate.version !== 1 || typeof candidate.projectId !== 'string' || !Array.isArray(candidate.reports)) return null
  return candidate as unknown as RuntimeFailureSmokeBrowserRunnerState
}

export function writeRuntimeFailureSmokeBrowserRunnerStateToSettings(
  settings: unknown,
  state: RuntimeFailureSmokeBrowserRunnerState,
): Record<string, unknown> {
  return {
    ...(isRecord(settings) ? settings : {}),
    [RUNTIME_FAILURE_SMOKE_BROWSER_RUNNER_SETTINGS_KEY]: state,
  }
}
