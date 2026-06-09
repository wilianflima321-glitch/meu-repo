import { type RuntimeResilienceSurfaceId, type RuntimeRecoveryMode } from '@/lib/runtime/runtime-resilience-budget'

export type RuntimeResilienceEventKind =
  | 'region-error'
  | 'crash-loop'
  | 'retry-attempted'
  | 'fallback-activated'
  | 'rollback-applied'
  | 'takeover-requested'
  | 'teardown-completed'
  | 'human-review-recorded'

export type RuntimeResilienceEventSeverity = 'info' | 'warning' | 'critical'

export type RuntimeResilienceLedgerEvent = {
  id: string
  runId: string
  surfaceId: RuntimeResilienceSurfaceId
  kind: RuntimeResilienceEventKind
  severity: RuntimeResilienceEventSeverity
  occurredAt: string
  recoveryMode: RuntimeRecoveryMode
  message: string
  evidenceRefs: string[]
  blockedClaims: string[]
}

export type RuntimeResilienceLedgerSummary = {
  eventCount: number
  criticalCount: number
  surfaces: RuntimeResilienceSurfaceId[]
  missingEvidenceCount: number
  blockedClaims: string[]
  readyForStrongerClaims: boolean
  nextAction: string
}

export type RuntimeResilienceLedger = {
  version: 1
  capability: 'AETHEL_RUNTIME_RESILIENCE_LEDGER'
  runId: string
  events: RuntimeResilienceLedgerEvent[]
  summary: RuntimeResilienceLedgerSummary
}

export type RuntimeResilienceLedgerEventInput = Partial<RuntimeResilienceLedgerEvent> & {
  surfaceId: RuntimeResilienceSurfaceId
  kind: RuntimeResilienceEventKind
  recoveryMode: RuntimeRecoveryMode
  message: string
}

export type RuntimeResilienceLedgerInput = {
  runId: string
  events?: RuntimeResilienceLedgerEventInput[]
}

const CLAIMS_BLOCKED_BY_DEFAULT = [
  'autonomous execution ready',
  'desktop ready',
  'native renderer ready',
  'cloud render available',
  'research verified',
  'production ready',
]

const REQUIRED_EVIDENCE_BY_KIND: Record<RuntimeResilienceEventKind, string[]> = {
  'region-error': ['error-boundary-receipt', 'crash-state-receipt'],
  'crash-loop': ['crash-state-receipt', 'retry-policy-receipt'],
  'retry-attempted': ['retry-policy-receipt'],
  'fallback-activated': ['error-boundary-receipt', 'performance-trace-receipt'],
  'rollback-applied': ['rollback-receipt'],
  'takeover-requested': ['takeover-control-receipt', 'browser-replay-receipt'],
  'teardown-completed': ['teardown-receipt', 'cost-cap-receipt'],
  'human-review-recorded': ['human-review-receipt'],
}

function normalizeRefs(refs: string[] | undefined): string[] {
  return Array.from(new Set((refs ?? []).map((ref) => ref.trim()).filter(Boolean)))
}

function hasEvidence(evidenceRefs: string[], required: string): boolean {
  const token = required.replace(/-receipt$/, '').replace(/-/g, ' ')
  return evidenceRefs.some((ref) => ref.toLowerCase().includes(token))
}

function missingEvidenceFor(kind: RuntimeResilienceEventKind, evidenceRefs: string[]): string[] {
  return REQUIRED_EVIDENCE_BY_KIND[kind].filter((required) => !hasEvidence(evidenceRefs, required))
}

function severityFor(kind: RuntimeResilienceEventKind, missingEvidence: string[]): RuntimeResilienceEventSeverity {
  if (kind === 'crash-loop' || kind === 'rollback-applied' || kind === 'takeover-requested') return 'critical'
  if (missingEvidence.length > 0) return 'warning'
  return 'info'
}

function normalizeEvent(
  runId: string,
  index: number,
  event: RuntimeResilienceLedgerEventInput,
): RuntimeResilienceLedgerEvent {
  const evidenceRefs = normalizeRefs(event.evidenceRefs)
  const missingEvidence = missingEvidenceFor(event.kind, evidenceRefs)
  return {
    id: event.id ?? `${runId}:resilience:${index + 1}`,
    runId: event.runId ?? runId,
    surfaceId: event.surfaceId,
    kind: event.kind,
    severity: event.severity ?? severityFor(event.kind, missingEvidence),
    occurredAt: event.occurredAt ?? new Date(0).toISOString(),
    recoveryMode: event.recoveryMode,
    message: event.message,
    evidenceRefs,
    blockedClaims: normalizeRefs([...(event.blockedClaims ?? []), ...CLAIMS_BLOCKED_BY_DEFAULT]),
  }
}

export function buildRuntimeResilienceLedger(input: RuntimeResilienceLedgerInput): RuntimeResilienceLedger {
  const events = (input.events ?? []).map((event, index) => normalizeEvent(input.runId, index, event))
  const surfaces = Array.from(new Set(events.map((event) => event.surfaceId)))
  const missingEvidenceCount = events.reduce(
    (count, event) => count + missingEvidenceFor(event.kind, event.evidenceRefs).length,
    0,
  )
  const blockedClaims = Array.from(new Set(events.flatMap((event) => event.blockedClaims))).sort()
  const criticalCount = events.filter((event) => event.severity === 'critical').length
  const readyForStrongerClaims = events.length > 0 && criticalCount === 0 && missingEvidenceCount === 0

  return {
    version: 1,
    capability: 'AETHEL_RUNTIME_RESILIENCE_LEDGER',
    runId: input.runId,
    events,
    summary: {
      eventCount: events.length,
      criticalCount,
      surfaces,
      missingEvidenceCount,
      blockedClaims,
      readyForStrongerClaims,
      nextAction: readyForStrongerClaims
        ? 'Attach this ledger to the run evidence package before promotion.'
        : 'Resolve missing resilience receipts and keep stronger claims blocked.',
    },
  }
}

export function validateRuntimeResilienceLedger(ledger: RuntimeResilienceLedger): string[] {
  const failures: string[] = []
  if (ledger.capability !== 'AETHEL_RUNTIME_RESILIENCE_LEDGER') failures.push('invalid capability marker')
  if (!ledger.runId.trim()) failures.push('runId is required')
  if (ledger.summary.eventCount !== ledger.events.length) failures.push('event count mismatch')
  if (ledger.summary.criticalCount !== ledger.events.filter((event) => event.severity === 'critical').length) failures.push('critical count mismatch')
  if (ledger.summary.blockedClaims.length < CLAIMS_BLOCKED_BY_DEFAULT.length) failures.push('blocked claims matrix is too thin')

  for (const event of ledger.events) {
    if (event.runId !== ledger.runId) failures.push(`${event.id}: runId mismatch`)
    if (!event.message.trim()) failures.push(`${event.id}: message is required`)
    const missingEvidence = missingEvidenceFor(event.kind, event.evidenceRefs)
    if (missingEvidence.length > 0 && ledger.summary.readyForStrongerClaims) failures.push(`${event.id}: stronger claims allowed despite missing evidence`)
    if (event.kind === 'takeover-requested' && !event.blockedClaims.includes('research verified')) failures.push(`${event.id}: takeover must block research verified claims`)
    if (event.kind === 'teardown-completed' && !event.blockedClaims.includes('cloud render available')) failures.push(`${event.id}: teardown must keep cloud availability claim governed`)
  }

  return failures
}
