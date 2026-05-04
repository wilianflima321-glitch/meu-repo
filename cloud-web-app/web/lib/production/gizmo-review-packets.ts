import type {
  AgenticProductionState,
  MissionLedgerEntry,
  ProductionGraphNode,
  ProductionNodeStatus,
} from '@/lib/production/agentic-production-state'

export type GizmoTransformReviewState = 'ready' | 'needs-approval' | 'needs-evidence' | 'blocked'

export interface GizmoTransformReviewPacket {
  operationId: string
  ledgerId: string
  summary: string
  ownerAgent: string
  state: GizmoTransformReviewState
  ledgerState: MissionLedgerEntry['state']
  graphStatuses: Record<'scene' | 'evidence' | 'validation', ProductionNodeStatus | 'missing'>
  graphNodeIds: string[]
  evidenceRefs: string[]
  blockers: string[]
  warnings: string[]
  rollbackPlan: string
  nextAction: string
  updatedAt: string
}

export interface GizmoTransformReviewSummary {
  total: number
  ready: number
  needsApproval: number
  needsEvidence: number
  blocked: number
  latestOperationId: string | null
  latestAction: string
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)))
}

function operationIdFromLedgerEntry(entry: MissionLedgerEntry): string | null {
  if (!entry.id.startsWith('gizmo-')) return null
  const operationId = entry.id.slice('gizmo-'.length).trim()
  return operationId.length > 0 ? operationId : null
}

function findNode(nodes: ProductionGraphNode[], id: string): ProductionGraphNode | null {
  return nodes.find((node) => node.id === id) ?? null
}

function buildState(input: {
  ledger: MissionLedgerEntry
  nodes: ProductionGraphNode[]
  evidenceRefs: string[]
  blockers: string[]
}): GizmoTransformReviewState {
  if (input.ledger.state === 'blocked' || input.nodes.some((node) => node.status === 'blocked')) {
    return 'blocked'
  }

  const missingEvidence =
    input.evidenceRefs.length <= 1 ||
    input.blockers.some((blocker) => blocker.toLowerCase().includes('viewport screenshot or clip is still required'))

  if (missingEvidence) return 'needs-evidence'

  if (input.ledger.state === 'needs-approval' || input.nodes.some((node) => node.status === 'needs-review')) {
    return 'needs-approval'
  }

  return 'ready'
}

export function buildGizmoTransformReviewPackets(
  state: AgenticProductionState,
  limit = 10,
): GizmoTransformReviewPacket[] {
  return state.ledger
    .map((ledger) => {
      const operationId = operationIdFromLedgerEntry(ledger)
      if (!operationId) return null

      const sceneNode = findNode(state.graphs.sceneWorldGraph, `gizmo-scene-${operationId}`)
      const evidenceNode = findNode(state.graphs.evidenceGraph, `gizmo-evidence-${operationId}`)
      const validationNode = findNode(state.graphs.validationGraph, `gizmo-validation-${operationId}`)
      const nodes = [sceneNode, evidenceNode, validationNode].filter((node): node is ProductionGraphNode => Boolean(node))
      const evidenceRefs = unique([...ledger.evidenceRefs, ...nodes.flatMap((node) => node.evidenceRefs)])
      const allBlockers = unique(nodes.flatMap((node) => node.blockers))
      const warnings = allBlockers
        .filter((blocker) => blocker.startsWith('Warning: '))
        .map((warning) => warning.replace(/^Warning:\s*/, ''))
      const blockers = allBlockers.filter((blocker) => !blocker.startsWith('Warning: '))
      const reviewState = buildState({
        ledger,
        nodes,
        evidenceRefs,
        blockers,
      })

      return {
        operationId,
        ledgerId: ledger.id,
        summary: ledger.summary,
        ownerAgent: ledger.ownerAgent,
        state: reviewState,
        ledgerState: ledger.state,
        graphStatuses: {
          scene: sceneNode?.status ?? 'missing',
          evidence: evidenceNode?.status ?? 'missing',
          validation: validationNode?.status ?? 'missing',
        },
        graphNodeIds: nodes.map((node) => node.id),
        evidenceRefs,
        blockers,
        warnings,
        rollbackPlan: ledger.rollbackPlan,
        nextAction:
          reviewState === 'blocked'
            ? 'Resolve blockers before release approval'
            : reviewState === 'needs-evidence'
              ? 'Capture viewport screenshot or clip evidence'
              : ledger.nextAction,
        updatedAt: ledger.updatedAt,
      } satisfies GizmoTransformReviewPacket
    })
    .filter((packet): packet is GizmoTransformReviewPacket => Boolean(packet))
    .slice(0, Math.max(0, limit))
}

export function buildGizmoTransformReviewSummary(
  packets: GizmoTransformReviewPacket[],
): GizmoTransformReviewSummary {
  const latest = packets[0]

  return {
    total: packets.length,
    ready: packets.filter((packet) => packet.state === 'ready').length,
    needsApproval: packets.filter((packet) => packet.state === 'needs-approval').length,
    needsEvidence: packets.filter((packet) => packet.state === 'needs-evidence').length,
    blocked: packets.filter((packet) => packet.state === 'blocked').length,
    latestOperationId: latest?.operationId ?? null,
    latestAction: latest?.nextAction ?? 'No gizmo transform history yet',
  }
}
