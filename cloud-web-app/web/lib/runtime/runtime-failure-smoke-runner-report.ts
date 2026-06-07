import type { RuntimeFailureSmokeHarnessId } from '@/lib/runtime/runtime-failure-smoke-harness'

export type RuntimeFailureSmokeBrowserRunnerResult = {
  id: RuntimeFailureSmokeHarnessId
  route: string
  finalUrl: string
  recoveredWithBoundary: boolean
  receipt: string | null
  expectedReceipt: string
  screenshot: string
  blockedClaims: string[]
  marketClaimAllowed: false
  releaseReady: false
  strictReceiptMatch: boolean
  evidenceRefs: string[]
  consoleErrors: string[]
  networkErrors: string[]
}

export type RuntimeFailureSmokeBrowserRunnerReport = {
  version: 1
  capability: 'AETHEL_RUNTIME_FAILURE_SMOKE_BROWSER_RUNNER'
  generatedAt: string
  baseUrl: string
  harnessCount: number
  passedCount: number
  strictReceiptMatchCount: number
  marketClaimAllowed: false
  releaseReady: false
  results: RuntimeFailureSmokeBrowserRunnerResult[]
  failures: string[]
  evidenceRefs: string[]
  nextAction: string
}

export type RuntimeFailureSmokeBrowserRunnerReportInput = {
  generatedAt?: string
  baseUrl: string
  results: RuntimeFailureSmokeBrowserRunnerResult[]
  failures?: string[]
}

function unique(values: string[], limit = 120): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).slice(0, limit)
}

export function buildRuntimeFailureSmokeBrowserRunnerEvidenceRefs(
  result: Pick<RuntimeFailureSmokeBrowserRunnerResult, 'id' | 'receipt' | 'screenshot'>,
): string[] {
  return unique([
    `runtime-failure-smoke-browser:${result.id}`,
    `runtime-failure-smoke-browser-screenshot:${result.screenshot}`,
    result.receipt ? `runtime-failure-smoke-browser-receipt:${result.receipt}` : '',
  ])
}

export function buildRuntimeFailureSmokeBrowserRunnerReport(
  input: RuntimeFailureSmokeBrowserRunnerReportInput,
): RuntimeFailureSmokeBrowserRunnerReport {
  const normalizedResults = input.results.map((result) => ({
    ...result,
    strictReceiptMatch: result.receipt === result.expectedReceipt,
    evidenceRefs: unique([...result.evidenceRefs, ...buildRuntimeFailureSmokeBrowserRunnerEvidenceRefs(result)]),
    marketClaimAllowed: false as const,
    releaseReady: false as const,
  }))
  const strictReceiptMatchCount = normalizedResults.filter((result) => result.strictReceiptMatch).length
  const derivedFailures = normalizedResults.flatMap((result) => [
    ...(result.recoveredWithBoundary ? [] : [`${result.id}: missing error-boundary receipt`]),
    ...(result.receipt ? [] : [`${result.id}: missing receipt value`]),
    ...(result.strictReceiptMatch ? [] : [`${result.id}: receipt mismatch expected=${result.expectedReceipt} actual=${result.receipt ?? 'none'}`]),
    ...(result.marketClaimAllowed === false ? [] : [`${result.id}: market claim allowed`]),
    ...(result.releaseReady === false ? [] : [`${result.id}: releaseReady must remain false`]),
  ])
  const failures = unique([...(input.failures ?? []), ...derivedFailures])

  return {
    version: 1,
    capability: 'AETHEL_RUNTIME_FAILURE_SMOKE_BROWSER_RUNNER',
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    baseUrl: input.baseUrl,
    harnessCount: normalizedResults.length,
    passedCount: normalizedResults.length - failures.length,
    strictReceiptMatchCount,
    marketClaimAllowed: false,
    releaseReady: false,
    results: normalizedResults,
    failures,
    evidenceRefs: unique(normalizedResults.flatMap((result) => result.evidenceRefs)),
    nextAction: 'Persist browser runner evidence refs into the runtime evidence package after human review.',
  }
}

export function validateRuntimeFailureSmokeBrowserRunnerReport(
  report: RuntimeFailureSmokeBrowserRunnerReport,
): string[] {
  const failures: string[] = []
  if (report.capability !== 'AETHEL_RUNTIME_FAILURE_SMOKE_BROWSER_RUNNER') failures.push('invalid browser runner capability')
  if (report.version !== 1) failures.push('invalid browser runner report version')
  if (report.harnessCount !== 2) failures.push('browser runner must cover IDE and preview harnesses')
  if (report.results.length !== report.harnessCount) failures.push('browser runner result count mismatch')
  if (report.strictReceiptMatchCount !== report.harnessCount) failures.push('all browser runner receipts must match expected receipts')
  if (report.marketClaimAllowed !== false) failures.push('browser runner report cannot allow market claims')
  if (report.releaseReady !== false) failures.push('browser runner report cannot be release ready')
  if (report.failures.length > 0) failures.push(...report.failures)
  if (report.evidenceRefs.length < 6) failures.push('browser runner report evidence refs are too thin')

  for (const result of report.results) {
    if (!result.route.includes('aethelRuntimeFailureSmoke=')) failures.push(`${result.id}: route must inject runtime failure smoke`)
    if (!result.finalUrl.includes('/ide')) failures.push(`${result.id}: finalUrl must stay on IDE`)
    if (!result.recoveredWithBoundary) failures.push(`${result.id}: boundary recovery was not proven`)
    if (result.receipt !== result.expectedReceipt) failures.push(`${result.id}: strict receipt mismatch`)
    if (!result.screenshot.startsWith('output/playwright/v29-runtime-failure-smoke/')) failures.push(`${result.id}: screenshot path is outside smoke output`)
    if (result.marketClaimAllowed !== false) failures.push(`${result.id}: market claim allowed`)
    if (result.releaseReady !== false) failures.push(`${result.id}: release ready`)
    if (result.blockedClaims.length < 2) failures.push(`${result.id}: blocked claims are too thin`)
    if (!result.evidenceRefs.some((ref) => ref.startsWith(`runtime-failure-smoke-browser:${result.id}`))) {
      failures.push(`${result.id}: missing browser smoke evidence ref`)
    }
    if (!result.evidenceRefs.some((ref) => ref.startsWith('runtime-failure-smoke-browser-screenshot:'))) {
      failures.push(`${result.id}: missing screenshot evidence ref`)
    }
    if (!result.evidenceRefs.some((ref) => ref.startsWith('runtime-failure-smoke-browser-receipt:'))) {
      failures.push(`${result.id}: missing receipt evidence ref`)
    }
  }

  return unique(failures)
}
