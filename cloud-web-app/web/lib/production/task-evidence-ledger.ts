import type { AgentToolBusDecision } from './agent-tool-bus'

export type TaskEvidenceKind =
  | 'mission'
  | 'source'
  | 'read-receipt'
  | 'tool-call'
  | 'command'
  | 'diff'
  | 'screenshot'
  | 'browser-replay'
  | 'dom-snapshot'
  | 'validation'
  | 'cost'
  | 'approval'
  | 'rollback'
  | 'artifact'

export interface TaskEvidenceEvent {
  id: string
  kind: TaskEvidenceKind
  title: string
  summary: string
  refs: string[]
  createdAt: string
  actor: string
}

export interface TaskEvidenceLedger {
  version: 1
  taskId: string
  projectId: string
  mission: string
  ownerAgent: string
  createdAt: string
  updatedAt: string
  events: TaskEvidenceEvent[]
}

export interface TaskEvidenceReadiness {
  ready: boolean
  missingKinds: TaskEvidenceKind[]
  blockers: string[]
  nextAction: string
}

const KIND_BY_REQUIREMENT: Array<[RegExp, TaskEvidenceKind]> = [
  [/read receipt/i, 'read-receipt'],
  [/source|citation|research/i, 'source'],
  [/replay/i, 'browser-replay'],
  [/screenshot/i, 'screenshot'],
  [/DOM snapshot/i, 'dom-snapshot'],
  [/diff/i, 'diff'],
  [/test|validation|playtest|build result/i, 'validation'],
  [/cost|budget/i, 'cost'],
  [/approval/i, 'approval'],
  [/rollback/i, 'rollback'],
  [/artifact|render|preview/i, 'artifact'],
]

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'event'
}

export function createTaskEvidenceLedger(input: {
  taskId: string
  projectId: string
  mission: string
  ownerAgent: string
  now?: string
}): TaskEvidenceLedger {
  const now = input.now ?? new Date().toISOString()
  return {
    version: 1,
    taskId: input.taskId,
    projectId: input.projectId,
    mission: input.mission,
    ownerAgent: input.ownerAgent,
    createdAt: now,
    updatedAt: now,
    events: [
      {
        id: `${input.taskId}:mission`,
        kind: 'mission',
        title: 'Mission accepted',
        summary: input.mission,
        refs: [],
        createdAt: now,
        actor: input.ownerAgent,
      },
    ],
  }
}

export function appendTaskEvidence(
  ledger: TaskEvidenceLedger,
  event: Omit<TaskEvidenceEvent, 'id' | 'createdAt'> & { id?: string; createdAt?: string }
): TaskEvidenceLedger {
  const createdAt = event.createdAt ?? new Date().toISOString()
  const id = event.id ?? `${ledger.taskId}:${event.kind}:${slugify(event.title)}`
  const nextEvent: TaskEvidenceEvent = {
    id,
    kind: event.kind,
    title: event.title,
    summary: event.summary,
    refs: event.refs,
    createdAt,
    actor: event.actor,
  }

  return {
    ...ledger,
    updatedAt: createdAt,
    events: [nextEvent, ...ledger.events.filter((candidate) => candidate.id !== id)],
  }
}

function requirementToKind(requirement: string): TaskEvidenceKind | null {
  return KIND_BY_REQUIREMENT.find(([pattern]) => pattern.test(requirement))?.[1] ?? null
}

export function requiredEvidenceKindsFromToolDecision(decision: AgentToolBusDecision): TaskEvidenceKind[] {
  return unique(
    decision.requiredEvidence
      .map(requirementToKind)
      .filter((kind): kind is TaskEvidenceKind => Boolean(kind))
  )
}

export function evaluateTaskEvidenceReadiness(
  ledger: TaskEvidenceLedger,
  decision: AgentToolBusDecision
): TaskEvidenceReadiness {
  const present = new Set(ledger.events.map((event) => event.kind))
  const requiredKinds = requiredEvidenceKindsFromToolDecision(decision)
  const missingKinds = requiredKinds.filter((kind) => !present.has(kind))
  const blockers = [...decision.blockers]

  for (const kind of missingKinds) {
    blockers.push(`Missing required evidence: ${kind}.`)
  }

  return {
    ready: blockers.length === 0,
    missingKinds,
    blockers,
    nextAction:
      blockers.length === 0
        ? 'Evidence is sufficient for review/apply.'
        : `Collect ${missingKinds[0] ?? 'blocked'} evidence before continuing.`,
  }
}

export function summarizeTaskEvidenceLedger(ledger: TaskEvidenceLedger): string {
  const counts = ledger.events.reduce<Record<TaskEvidenceKind, number>>((acc, event) => {
    acc[event.kind] = (acc[event.kind] ?? 0) + 1
    return acc
  }, {} as Record<TaskEvidenceKind, number>)

  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([kind, count]) => `${kind}:${count}`)
    .join(', ')
}
