import type {
  AgenticProductionState,
  ProductionGraphNode,
  ProductionNodeStatus,
} from '@/lib/production/agentic-production-state'
import type {
  RepositoryContextBudgetBatchStatus,
  RepositoryContextBudgetExecutionState,
} from '@/lib/production/repository-context-budget-execution'
import type { RepositoryCartographyManifest, RepositoryContextStrategy } from '@/lib/production/repository-cartography'

export type RepositoryCartographyStatus = 'ready' | 'attention' | 'blocked'

export type RepositoryCartographySignal = {
  label: string
  value: string
  status: RepositoryCartographyStatus
}

export type RepositoryAgentFleetSignal = {
  label: string
  scope: string
  status: RepositoryCartographyStatus
}

export type RepositoryContextBudgetSignal = {
  label: string
  value: string
  status: RepositoryCartographyStatus
}

export type RepositoryContextBudgetSnapshot = {
  summary: string
  batches: RepositoryContextBudgetSignal[]
}

export type RepositoryCartographySnapshot = {
  title: string
  status: RepositoryCartographyStatus
  statusLabel: string
  summary: string
  nextAction: string
  signals: RepositoryCartographySignal[]
  contextBudget: RepositoryContextBudgetSnapshot
  agents: RepositoryAgentFleetSignal[]
  guardrails: string[]
}

type BuildRepositoryCartographySnapshotInput = {
  productionState?: AgenticProductionState | null
  manifest?: RepositoryCartographyManifest | null
  contextBudgetExecution?: RepositoryContextBudgetExecutionState | null
}

const CARTOGRAPHY_REF_PREFIX = 'repo-cartography:'

const statusWeight: Record<RepositoryCartographyStatus, number> = {
  ready: 1,
  attention: 2,
  blocked: 3,
}

function compactText(value: string, maxLength = 72): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1).trim()}...` : value
}

function compactConstraint(value: string | undefined, fallback: string): string {
  if (!value) return fallback
  return compactText(value.replace(/^Repository cartography coverage:\s*/i, '').replace(/\.$/, ''), 44)
}

function formatMb(bytes: number): string {
  if (bytes <= 0) return '0 MB'
  const mb = bytes / (1024 * 1024)
  return `${Math.round(mb * 10) / 10} MB`
}

function batchStatus(strategy: RepositoryContextStrategy, bytes: number): RepositoryCartographyStatus {
  if (bytes <= 0) return 'attention'
  if (strategy === 'manual-review') return 'blocked'
  if (strategy === 'external-mirror') return 'attention'
  return 'ready'
}

function executionStatusToCardStatus(status: RepositoryContextBudgetBatchStatus): RepositoryCartographyStatus {
  if (status === 'blocked') return 'blocked'
  if (status === 'complete') return 'ready'
  return 'attention'
}

function nodeStatusToCardStatus(status: ProductionNodeStatus): RepositoryCartographyStatus {
  if (status === 'blocked') return 'blocked'
  if (status === 'ready') return 'ready'
  return 'attention'
}

function worstStatus(statuses: RepositoryCartographyStatus[]): RepositoryCartographyStatus {
  return statuses.reduce<RepositoryCartographyStatus>(
    (worst, status) => (statusWeight[status] > statusWeight[worst] ? status : worst),
    'ready'
  )
}

function hasCartographyEvidence(node: ProductionGraphNode): boolean {
  return node.evidenceRefs.some((ref) => ref.startsWith(CARTOGRAPHY_REF_PREFIX))
}

function collectCartographyNodes(state: AgenticProductionState): ProductionGraphNode[] {
  return Object.values(state.graphs)
    .flat()
    .filter(hasCartographyEvidence)
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items.filter((item) => item.trim().length > 0)))
}

function buildAgentSignals(nodes: ProductionGraphNode[], externalMirrorSignal: boolean): RepositoryAgentFleetSignal[] {
  const agentScopes = new Map<string, { count: number; statuses: RepositoryCartographyStatus[] }>()

  const addAgent = (label: string, status: RepositoryCartographyStatus, count = 1) => {
    const existing = agentScopes.get(label) ?? { count: 0, statuses: [] }
    existing.count += count
    existing.statuses.push(status)
    agentScopes.set(label, existing)
  }

  addAgent('Producer Agent', nodes.length > 0 ? 'ready' : 'attention')
  if (externalMirrorSignal) {
    addAgent('Research Agent', 'attention')
  }

  for (const node of nodes) {
    addAgent(node.ownerAgent, nodeStatusToCardStatus(node.status))
  }

  return Array.from(agentScopes.entries())
    .map(([label, value]) => ({
      label,
      count: value.count,
      scope: value.count === 1 ? '1 surface' : `${value.count} surfaces`,
      status: worstStatus(value.statuses),
    }))
    .sort(
      (a, b) =>
        statusWeight[b.status] - statusWeight[a.status] ||
        b.count - a.count ||
        a.label.localeCompare(b.label)
    )
    .slice(0, 6)
    .map(({ label, scope, status }) => ({ label, scope, status }))
}

function buildContextBudgetSnapshot(
  manifest: RepositoryCartographyManifest | null | undefined,
  execution: RepositoryContextBudgetExecutionState | null | undefined
): RepositoryContextBudgetSnapshot {
  const budget = manifest?.contextBudget
  if (!budget) {
    return {
      summary: 'Run scan to plan context slices',
      batches: [
        { label: 'Read', value: 'Pending', status: 'attention' },
        { label: 'Summarize', value: 'Pending', status: 'attention' },
        { label: 'Index/Mirror', value: 'Pending', status: 'attention' },
        { label: 'Review', value: 'Pending', status: 'attention' },
      ],
    }
  }

  if (execution?.manifestId === manifest.id) {
    return {
      summary: `${execution.batches.filter((batch) => batch.status === 'complete').length}/${execution.batches.length} batches done`,
      batches: execution.batches.slice(0, 4).map((batch) => ({
        label:
          batch.id === 'read-canonical-contracts'
            ? 'Read'
            : batch.id === 'summarize-medium-text'
              ? 'Summarize'
              : batch.id === 'manual-review-queue'
                ? 'Review'
                : batch.id === 'mirror-external-metadata'
                  ? 'Mirror'
                  : 'Index',
        value: `${batch.completedSurfaceCount}/${batch.surfaceCount}`,
        status: executionStatusToCardStatus(batch.status),
      })),
    }
  }

  const indexAndMirrorBytes = budget.indexOnlyBytes + budget.externalMirrorBytes
  return {
    summary: `${budget.estimatedChunkCount} chunks / ${budget.retrievalBatches.length} batches`,
    batches: [
      {
        label: 'Read',
        value: formatMb(budget.directReadBytes),
        status: batchStatus('direct-read', budget.directReadBytes),
      },
      {
        label: 'Summarize',
        value: formatMb(budget.summarizeFirstBytes),
        status: batchStatus('summarize-first', budget.summarizeFirstBytes),
      },
      {
        label: 'Index/Mirror',
        value: formatMb(indexAndMirrorBytes),
        status: budget.externalMirrorBytes > 0 ? 'attention' : batchStatus('index-only', indexAndMirrorBytes),
      },
      {
        label: 'Review',
        value: formatMb(budget.manualReviewBytes),
        status: batchStatus('manual-review', budget.manualReviewBytes),
      },
    ],
  }
}

export function buildDashboardRepositoryCartographySnapshot({
  productionState,
  manifest,
  contextBudgetExecution,
}: BuildRepositoryCartographySnapshotInput): RepositoryCartographySnapshot {
  if (!productionState) {
    return {
      title: 'Repository Cartography',
      status: 'attention',
      statusLabel: 'Map first',
      summary:
        'Map canonical files, assets, scenes, licenses, external sources, and no-invention rules before parallel agents edit a large project.',
      nextAction: 'Run cartography',
      signals: [
        { label: 'Files', value: 'Not mapped', status: 'attention' },
        { label: 'Graphs', value: '0/6', status: 'attention' },
        { label: 'Evidence', value: 'Missing', status: 'attention' },
        { label: 'Risk', value: 'Unknown', status: 'attention' },
      ],
      contextBudget: buildContextBudgetSnapshot(manifest, contextBudgetExecution),
      agents: [
        { label: 'Producer Agent', scope: 'scope lock', status: 'attention' },
        { label: 'Research Agent', scope: 'external mirrors', status: 'attention' },
        { label: 'QA Agent', scope: 'evidence gate', status: 'attention' },
      ],
      guardrails: [
        'Do not invent duplicate prototypes when canonical files exist.',
        'Do not load GB-scale assets directly into chat context.',
      ],
    }
  }

  const cartographyNodes = collectCartographyNodes(productionState)
  const ledgerEntry = productionState.ledger.find((entry) => entry.id === 'repo-cartography')
  const constraints = productionState.brain.technicalBible.constraints
  const coverageConstraint = constraints.find((constraint) => constraint.startsWith('Repository cartography coverage:'))
  const externalMirrorConstraint = constraints.find((constraint) => constraint.includes('external-mirror'))
  const mustReadConstraint = constraints.find((constraint) => constraint.includes('mustReadFirst'))
  const risks = productionState.brain.risks.filter(
    (risk) =>
      /^(BLOCKER|HIGH|MEDIUM|LOW):/i.test(risk) &&
      /cartography|license|duplicate|external|provenance|validation|story/i.test(risk)
  )
  const hardRisks = risks.filter((risk) => /BLOCKER|HIGH/i.test(risk))
  const blockers = unique([...cartographyNodes.flatMap((node) => node.blockers), ...hardRisks])
  const evidenceRefs = unique([
    ...(ledgerEntry?.evidenceRefs ?? []),
    ...cartographyNodes.flatMap((node) => node.evidenceRefs),
  ])
  const readyNodes = cartographyNodes.filter((node) => node.status === 'ready').length
  const graphStatus =
    cartographyNodes.length === 0
      ? 'attention'
      : cartographyNodes.some((node) => node.status === 'blocked')
        ? 'blocked'
        : readyNodes === cartographyNodes.length
          ? 'ready'
          : 'attention'
  const status = blockers.length > 0 ? 'blocked' : graphStatus
  const statusLabel = status === 'blocked' ? 'Blocked' : status === 'attention' ? 'Needs review' : 'Ready'
  const hasExternalMirrorWork = Boolean(externalMirrorConstraint)
  const riskValue = blockers.length > 0 ? `${blockers.length} blockers` : risks.length > 0 ? `${risks.length} risks` : 'Clear'
  const graphValue = cartographyNodes.length > 0 ? `${readyNodes}/${cartographyNodes.length}` : '0/6'
  const contextValue = mustReadConstraint
    ? compactText(mustReadConstraint.replace(/\.$/, ''), 34)
    : 'mustRead pending'

  return {
    title: 'Repository Cartography',
    status,
    statusLabel,
    summary:
      ledgerEntry?.summary ??
      'Repository cartography is seeded into Project Brain, Mission Ledger, production graphs, and agent handoffs.',
    nextAction: ledgerEntry?.nextAction ? compactText(ledgerEntry.nextAction, 88) : 'Route agents through handoffs',
    signals: [
      {
        label: 'Files',
        value: compactConstraint(coverageConstraint, 'Coverage pending'),
        status: coverageConstraint ? 'ready' : 'attention',
      },
      { label: 'Graphs', value: graphValue, status: graphStatus },
      {
        label: 'Evidence',
        value: evidenceRefs.length > 0 ? `${evidenceRefs.length} refs` : 'Missing',
        status: evidenceRefs.length > 0 ? 'ready' : 'attention',
      },
      {
        label: 'Risk',
        value: riskValue,
        status: blockers.length > 0 ? 'blocked' : risks.length > 0 ? 'attention' : 'ready',
      },
      {
        label: 'Context',
        value: contextValue,
        status: mustReadConstraint ? 'ready' : 'attention',
      },
    ],
    contextBudget: buildContextBudgetSnapshot(manifest, contextBudgetExecution),
    agents: buildAgentSignals(cartographyNodes, hasExternalMirrorWork),
    guardrails:
      blockers.length > 0
        ? blockers.slice(0, 2).map((risk) => compactText(risk.replace(/^(BLOCKER|HIGH):\s*/i, ''), 96))
        : [
            'Agents must read Project Brain, Mission Ledger, and mustReadFirst before edits.',
            'Large assets stay indexed or mirrored before download, render, or release.',
          ],
  }
}
