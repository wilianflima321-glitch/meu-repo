import type { AgenticProductionState, MissionLedgerEntry, ProductionGraphKey, ProductionGraphNode } from '@/lib/production/agentic-production-state'
import { mergeAgenticProductionState } from '@/lib/production/agentic-production-state'
import type { GizmoTransformOperation } from '@/lib/viewport/gizmo-transform-operation'
import { summarizeGizmoTransformOperation } from '@/lib/viewport/gizmo-transform-operation'

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)))
}

function operationStatus(operation: GizmoTransformOperation): ProductionGraphNode['status'] {
  if (!operation.validation.ok) return 'blocked'
  if (operation.source === 'agent' || operation.validation.warnings.length > 0) return 'needs-review'
  return 'ready'
}

function operationOwner(operation: GizmoTransformOperation): string {
  if (operation.source === 'agent') return operation.agentId ?? 'Technical Artist Agent'
  return 'Viewport User'
}

function buildOperationEvidenceRefs(operation: GizmoTransformOperation): string[] {
  return unique([`gizmo-operation:${operation.id}`, ...operation.evidenceRefs])
}

function upsertProductionGraphNode(
  state: AgenticProductionState,
  key: ProductionGraphKey,
  node: ProductionGraphNode,
): ProductionGraphNode[] {
  const existing = state.graphs[key]
  const withoutNode = existing.filter((candidate) => candidate.id !== node.id)
  return [node, ...withoutNode].slice(0, 30)
}

export function buildMissionLedgerEntryFromGizmoOperation(
  operation: GizmoTransformOperation,
  now = new Date().toISOString(),
): MissionLedgerEntry {
  const blocked = !operation.validation.ok
  const needsApproval = !blocked && (operation.source === 'agent' || operation.validation.warnings.length > 0)

  return {
    id: `gizmo-${operation.id}`,
    phase: 'Viewport transform',
    ownerAgent: operationOwner(operation),
    state: blocked ? 'blocked' : needsApproval ? 'needs-approval' : 'complete',
    summary: summarizeGizmoTransformOperation(operation),
    acceptance: [
      'Before transform captured',
      'After transform captured',
      'Rollback target available',
      blocked ? 'Resolve validation blockers before applying to release evidence' : 'Attach viewport evidence before final approval',
    ],
    evidenceRefs: buildOperationEvidenceRefs(operation),
    rollbackPlan: `Restore ${operation.objectIds.length} object(s) from gizmo operation ${operation.id} rollback target.`,
    nextAction: blocked
      ? 'Fix blocked gizmo transform and retry'
      : needsApproval
        ? 'Review viewport evidence and approve transform'
        : 'Capture viewport evidence and continue production',
    estimatedCostUsd: 0,
    updatedAt: now,
  }
}

export function mergeGizmoTransformOperationIntoProductionState(
  current: AgenticProductionState,
  operation: GizmoTransformOperation,
  now = new Date().toISOString(),
): AgenticProductionState {
  const status = operationStatus(operation)
  const ownerAgent = operationOwner(operation)
  const evidenceRefs = buildOperationEvidenceRefs(operation)
  const blockers = operation.validation.blockers
  const warnings = operation.validation.warnings
  const summary = summarizeGizmoTransformOperation(operation)
  const objectList = operation.objectIds
    .map((objectId) => operation.objectNames[objectId] ?? objectId)
    .join(', ')

  const sceneNode: ProductionGraphNode = {
    id: `gizmo-scene-${operation.id}`,
    label: `${operation.mode} ${objectList || 'viewport object'}`,
    status,
    ownerAgent,
    evidenceRefs,
    blockers,
    updatedAt: now,
  }

  const evidenceNode: ProductionGraphNode = {
    id: `gizmo-evidence-${operation.id}`,
    label: `Evidence for ${summary}`,
    status: status === 'blocked' ? 'blocked' : evidenceRefs.length > 1 ? 'ready' : 'needs-review',
    ownerAgent: 'QA Agent',
    evidenceRefs,
    blockers: evidenceRefs.length > 1 ? blockers : unique([...blockers, 'Viewport screenshot or clip is still required']),
    updatedAt: now,
  }

  const validationNode: ProductionGraphNode = {
    id: `gizmo-validation-${operation.id}`,
    label: `Validation for ${summary}`,
    status,
    ownerAgent: 'QA Agent',
    evidenceRefs,
    blockers: unique([...blockers, ...warnings.map((warning) => `Warning: ${warning}`)]),
    updatedAt: now,
  }

  return mergeAgenticProductionState(
    current,
    {
      ledger: [buildMissionLedgerEntryFromGizmoOperation(operation, now), ...current.ledger].slice(0, 50),
      graphs: {
        sceneWorldGraph: upsertProductionGraphNode(current, 'sceneWorldGraph', sceneNode),
        evidenceGraph: upsertProductionGraphNode(current, 'evidenceGraph', evidenceNode),
        validationGraph: upsertProductionGraphNode(current, 'validationGraph', validationNode),
      },
    },
    now,
  )
}
