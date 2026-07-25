/**
 * CW6 — Agents work-OS receipt completeness (NOT J.11/J.12).
 * Visible honesty for TaskEvidence / Nexus cells / apply-deny posture.
 */

import type { AIChatEvidenceArtifact } from '@/components/agents/evidence'
import type { NexusMissionUiPayload } from '@/lib/production/nexus-mission-phases'

/** Minimal creative receipt shape for completeness (avoids coupling to dispatch module). */
export type CreativeReceiptCompletenessInput = {
  operator: { kind: string; target?: string }
  graphId?: string | null
  scaffoldId?: string | null
  fusionTransactionId?: string | null
  nodeCount?: number
  stateCount?: number
  placementCount?: number
  sessionId?: string | null
  runId?: string | null
  sourceCount?: number
  turnId?: string | null
  evidenceReceiptId?: string | null
  blockedReason?: string | null
}

export type ReceiptFieldStatus = 'present' | 'missing' | 'held'

export interface ReceiptCompletenessField {
  id: string
  label: string
  status: ReceiptFieldStatus
}

export interface ReceiptCompletenessReport {
  kind: 'ledger' | 'trace' | 'research' | 'nexus' | 'creative' | 'empty'
  complete: boolean
  presentCount: number
  missingCount: number
  heldCount: number
  fields: ReceiptCompletenessField[]
  /** Always false — incomplete or HELD fields block supremacy marketing. */
  marketingAllowed: false
  summary: string
}

function tally(fields: ReceiptCompletenessField[]): Omit<ReceiptCompletenessReport, 'kind' | 'summary' | 'marketingAllowed' | 'complete'> & {
  complete: boolean
} {
  const presentCount = fields.filter((f) => f.status === 'present').length
  const missingCount = fields.filter((f) => f.status === 'missing').length
  const heldCount = fields.filter((f) => f.status === 'held').length
  // Held fields block "complete" — VisualEvidence [HELD] must not read as 100%/shipped.
  return {
    complete: missingCount === 0 && heldCount === 0,
    presentCount,
    missingCount,
    heldCount,
    fields,
  }
}

export function evaluateEvidenceReceiptCompleteness(
  artifact: AIChatEvidenceArtifact | null | undefined,
): ReceiptCompletenessReport {
  if (!artifact) {
    return {
      kind: 'empty',
      complete: false,
      presentCount: 0,
      missingCount: 1,
      heldCount: 0,
      fields: [{ id: 'receipt', label: 'Evidence receipt', status: 'missing' }],
      marketingAllowed: false,
      summary: 'No evidence receipt yet',
    }
  }

  if (artifact.kind === 'ledger') {
    const fields: ReceiptCompletenessField[] = [
      {
        id: 'taskId',
        label: 'Task id',
        status: artifact.taskId ? 'present' : 'missing',
      },
      {
        id: 'mission',
        label: 'Mission',
        status: artifact.mission ? 'present' : 'missing',
      },
      {
        id: 'events',
        label: 'Ledger events',
        status: artifact.eventCount > 0 && artifact.events.length > 0 ? 'present' : 'missing',
      },
      {
        id: 'fusionTx',
        label: 'Fusion transaction',
        status: artifact.fusionTransactionId ? 'present' : 'missing',
      },
      {
        id: 'visualEvidence',
        label: 'VisualEvidence',
        // J.9 WebM is platform HELD. Ledger has no IMPLEMENTED frame path —
        // absent held-flag must not paint as "missing field" (Cursor receipt honesty).
        status: 'held',
      },
    ]
    const scored = tally(fields)
    return {
      kind: 'ledger',
      ...scored,
      marketingAllowed: false,
      summary: scored.complete
        ? `Ledger complete (${scored.presentCount} fields)`
        : `Ledger incomplete — ${scored.missingCount} missing · ${scored.heldCount} held`,
    }
  }

  if (artifact.kind === 'trace') {
    const fields: ReceiptCompletenessField[] = [
      { id: 'traceId', label: 'Trace id', status: artifact.traceId ? 'present' : 'missing' },
      {
        id: 'tools',
        label: 'Tool runs',
        status: artifact.toolRuns.length > 0 ? 'present' : 'missing',
      },
      {
        id: 'risks',
        label: 'Risk checks',
        status: artifact.riskChecks.length > 0 ? 'present' : 'missing',
      },
      {
        id: 'evidence',
        label: 'Evidence items',
        status: artifact.evidence.length > 0 ? 'present' : 'missing',
      },
    ]
    const scored = tally(fields)
    return {
      kind: 'trace',
      ...scored,
      marketingAllowed: false,
      summary: scored.complete
        ? `Trace complete (${scored.presentCount} fields)`
        : `Trace incomplete — ${scored.missingCount} missing`,
    }
  }

  const fields: ReceiptCompletenessField[] = [
    { id: 'query', label: 'Query', status: artifact.query ? 'present' : 'missing' },
    {
      id: 'sources',
      label: 'Sources',
      status: artifact.sources.length > 0 ? 'present' : 'missing',
    },
  ]
  const scored = tally(fields)
  return {
    kind: 'research',
    ...scored,
    marketingAllowed: false,
    summary: scored.complete
      ? `Research complete (${scored.presentCount} fields)`
      : `Research incomplete — ${scored.missingCount} missing`,
  }
}

export function evaluateNexusTaskGraphCompleteness(
  nexus: NexusMissionUiPayload | null | undefined,
): ReceiptCompletenessReport {
  if (!nexus) {
    return {
      kind: 'empty',
      complete: false,
      presentCount: 0,
      missingCount: 1,
      heldCount: 0,
      fields: [{ id: 'nexus', label: 'Nexus mission', status: 'missing' }],
      marketingAllowed: false,
      summary: 'No Nexus task graph',
    }
  }

  const fields: ReceiptCompletenessField[] = [
    {
      id: 'missionId',
      label: 'Mission id',
      status: nexus.missionId ? 'present' : 'missing',
    },
    {
      id: 'phases',
      label: 'Phase trail',
      status: nexus.phases.length > 0 ? 'present' : 'missing',
    },
    {
      id: 'cells',
      label: 'Task cells',
      status: nexus.cells.length > 0 ? 'present' : 'missing',
    },
    {
      id: 'verdict',
      label: 'Verdict',
      status: nexus.verdict ? 'present' : 'missing',
    },
    {
      id: 'fusionTx',
      label: 'Fusion transaction',
      status: nexus.fusionTransactionId
        ? 'present'
        : nexus.verdict === 'APPLY'
          ? 'missing'
          : 'held',
    },
    {
      id: 'visualEvidence',
      label: 'VisualEvidence',
      status:
        nexus.visualEvidence?.status === 'IMPLEMENTED'
          ? 'present'
          : nexus.visualEvidence?.status === 'HELD'
            ? 'held'
            : 'missing',
    },
  ]
  const scored = tally(fields)
  return {
    kind: 'nexus',
    ...scored,
    marketingAllowed: false,
    summary: scored.complete
      ? `Task graph complete (${nexus.cells.length} cells)`
      : `Task graph incomplete — ${scored.missingCount} missing · ${scored.heldCount} held`,
  }
}

export function evaluateCreativeReceiptCompleteness(
  receipt: CreativeReceiptCompletenessInput | null | undefined,
): ReceiptCompletenessReport {
  if (!receipt) {
    return {
      kind: 'empty',
      complete: false,
      presentCount: 0,
      missingCount: 1,
      heldCount: 0,
      fields: [{ id: 'creative', label: 'Creative receipt', status: 'missing' }],
      marketingAllowed: false,
      summary: 'No creative operator receipt',
    }
  }

  const kind = receipt.operator.kind
  const fields: ReceiptCompletenessField[] = [
    {
      id: 'operator',
      label: 'Operator',
      status: kind ? 'present' : 'missing',
    },
    {
      id: 'fusionTx',
      label: 'Fusion transaction',
      status: receipt.fusionTransactionId ? 'present' : 'missing',
    },
  ]

  if (kind === 'graph-operator') {
    fields.push(
      { id: 'graphId', label: 'Graph id', status: receipt.graphId ? 'present' : 'missing' },
      {
        id: 'nodes',
        label: 'Node count',
        status: typeof receipt.nodeCount === 'number' ? 'present' : 'missing',
      },
    )
  } else if (kind === 'video-to-mechanic') {
    fields.push(
      {
        id: 'scaffoldId',
        label: 'Scaffold id',
        status: receipt.scaffoldId ? 'present' : 'missing',
      },
      {
        id: 'states',
        label: 'State count',
        status: typeof receipt.stateCount === 'number' ? 'present' : 'missing',
      },
    )
  } else if (kind === 'browser-operator') {
    fields.push(
      {
        id: 'sessionId',
        label: 'Session id',
        status: receipt.sessionId ? 'present' : 'missing',
      },
      {
        id: 'sources',
        label: 'Source count',
        status: typeof receipt.sourceCount === 'number' ? 'present' : 'missing',
      },
    )
  } else if (kind === 'live-voice') {
    fields.push(
      { id: 'turnId', label: 'Turn id', status: receipt.turnId ? 'present' : 'missing' },
      {
        id: 'evidence',
        label: 'Evidence receipt',
        status: receipt.evidenceReceiptId ? 'present' : 'missing',
      },
    )
  }

  if (receipt.blockedReason) {
    fields.push({ id: 'blocked', label: 'Blocked reason', status: 'present' })
  }

  const scored = tally(fields)
  return {
    kind: 'creative',
    ...scored,
    marketingAllowed: false,
    summary: scored.complete
      ? `${kind} receipt complete`
      : `${kind} receipt incomplete — ${scored.missingCount} missing · ${scored.heldCount} held`,
  }
}
