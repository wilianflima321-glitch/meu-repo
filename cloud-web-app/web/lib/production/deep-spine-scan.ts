import {
  type AgenticProductionState,
  type MissionLedgerEntry,
  type ProductionGraphKey,
  type ProductionGraphNode,
  mergeAgenticProductionState,
} from './agentic-production-state'
import type { AgentReadReceiptInput } from './agent-read-receipts'
import type { ProjectMemoryRuntimeProbe } from './multi-resolution-project-memory'
import {
  buildMultiResolutionProjectMemory,
  planGbScaleProjectIndexing,
} from './multi-resolution-project-memory'
import {
  buildRepositoryCartographyManifest,
  type RepositoryCartographyManifest,
} from './repository-cartography'
import type { ResearchIntelligencePacket } from './research-intelligence-bridge'
import {
  appendTaskEvidence,
  type TaskEvidenceLedger,
} from './task-evidence-ledger'

import {
  DEEP_SPINE_SCAN_SETTINGS_KEY,
  DEFAULT_RUNTIME,
} from './deep-spine-scan.contracts'
import type {
  DeepSpineFinding,
  DeepSpineFindingCategory,
  DeepSpineScanBudget,
  DeepSpineScanInput,
  DeepSpineScanManifest,
  DeepSpineScanMode,
  DeepSpineScanReadiness,
  DeepSpineScanScope,
  DeepSpineScanSurfaceSignal,
  DeepSpineWorkPacket,
} from './deep-spine-scan.contracts'
export { DEEP_SPINE_SCAN_SETTINGS_KEY } from './deep-spine-scan.contracts'
export type {
  DeepSpineFinding,
  DeepSpineFindingCategory,
  DeepSpineFindingSeverity,
  DeepSpineScanBudget,
  DeepSpineScanInput,
  DeepSpineScanManifest,
  DeepSpineScanMode,
  DeepSpineScanReadiness,
  DeepSpineScanScope,
  DeepSpineScanSurfaceSignal,
  DeepSpineWorkPacket,
} from './deep-spine-scan.contracts'
import {
  appendUnique,
  isRecord,
  normalizeBudget,
  normalizeScope,
  scanIdFor,
  selectArtifactsForBudget,
  unique,
} from './deep-spine-scan.utils'
import {
  buildBlockedActions,
  buildFindings,
  buildHandoffPrompt,
  buildNextActions,
  buildWorkPackets,
  sourceRefsFor,
} from './deep-spine-scan.findings'

export function buildDeepSpineScanManifest(input: DeepSpineScanInput): DeepSpineScanManifest {
  const generatedAt = input.generatedAt ?? new Date().toISOString()
  const budget = normalizeBudget(input.budget)
  const scope = normalizeScope({ scope: input.scope, artifacts: input.artifacts })
  const selectedArtifacts = selectArtifactsForBudget(input.artifacts, budget)
  const bytesScanned = selectedArtifacts.reduce((sum, artifact) => sum + artifact.sizeBytes, 0)
  const totalBytes = input.artifacts.reduce((sum, artifact) => sum + artifact.sizeBytes, 0)
  const cartography = buildRepositoryCartographyManifest({
    projectId: input.projectId,
    generatedAt,
    artifacts: selectedArtifacts,
  })
  const memory = buildMultiResolutionProjectMemory({
    manifest: cartography,
    researchPacket: input.researchPacket,
    generatedAt,
  })
  const indexingPlan = planGbScaleProjectIndexing({
    memory,
    runtime: input.runtime ?? DEFAULT_RUNTIME,
    allowCloudIndexing: budget.allowCloudIndexing,
  })
  const findings = buildFindings({
    mode: input.mode,
    budget,
    selectedArtifacts,
    allArtifacts: input.artifacts,
    cartography,
    surfaceSignals: input.surfaceSignals ?? [],
    heldBytes: indexingPlan.heldBytes,
    indexingBlockers: indexingPlan.blockers,
  })
  const scanId = scanIdFor({ projectId: input.projectId, mode: input.mode, generatedAt })
  const sourceRefs = sourceRefsFor(cartography.surfaces)
  const readReceipts = unique([
    `read-receipt:${scanId}:cartography:${cartography.id}`,
    `read-receipt:${scanId}:memory:${memory.manifestId}`,
    ...cartography.surfaces.slice(0, 24).map((surface) => `read-receipt:${scanId}:surface:${surface.path}`),
  ])
  const evidenceRefs = unique([
    `deep-spine-scan:${scanId}`,
    `cartography:${cartography.id}`,
    `memory:${memory.manifestId}`,
    `indexing-plan:${input.projectId}`,
    'policy:no-auto-fix',
    'policy:metadata-first-external-sources',
  ])
  const workPackets = buildWorkPackets(findings)

  const manifest: DeepSpineScanManifest = {
    version: 1,
    scanId,
    projectId: input.projectId,
    mode: input.mode,
    generatedAt,
    scope,
    budget,
    sourceRefs,
    filesScanned: selectedArtifacts.length,
    bytesScanned,
    bytesSkipped: Math.max(0, totalBytes - bytesScanned),
    budgetExhausted: selectedArtifacts.length < input.artifacts.length || bytesScanned < totalBytes,
    findings,
    readReceipts,
    evidenceRefs,
    nextActions: buildNextActions(findings, workPackets),
    blockedActions: buildBlockedActions(findings),
    workPackets,
    handoffPrompt: '',
  }

  return {
    ...manifest,
    handoffPrompt: buildHandoffPrompt({ manifest, cartography }),
  }
}

export function buildDeepSpineScanReadReceipts(input: {
  manifest: DeepSpineScanManifest
  agent?: string
}): AgentReadReceiptInput[] {
  const agent = input.agent ?? 'Producer Agent'
  return [
    {
      id: `${input.manifest.scanId}:receipt:cartography`,
      agent,
      kind: 'repository-cartography',
      ref: input.manifest.evidenceRefs.find((ref) => ref.startsWith('cartography:')) ?? input.manifest.scanId,
      evidenceRefs: input.manifest.evidenceRefs,
      note: 'Deep Spine Scan consumed cartography and memory shards before work packet generation.',
    },
    ...input.manifest.sourceRefs.slice(0, 12).map((ref) => ({
      id: `${input.manifest.scanId}:receipt:${slugify(ref)}`,
      agent,
      kind: 'repo-surface' as const,
      ref,
      path: ref.startsWith('hash:') || ref.startsWith('license:') || ref.startsWith('source:') ? undefined : ref,
      evidenceRefs: input.manifest.evidenceRefs,
      note: 'Surface included in Deep Spine Scan evidence manifest.',
    })),
  ]
}

export function appendDeepSpineScanEvidence(input: {
  ledger: TaskEvidenceLedger
  manifest: DeepSpineScanManifest
  actor?: string
}): TaskEvidenceLedger {
  const actor = input.actor ?? 'Producer Agent'
  const withManifest = appendTaskEvidence(input.ledger, {
    kind: 'artifact',
    title: 'Deep Spine Scan manifest',
    summary: `${input.manifest.mode} scan found ${input.manifest.findings.length} findings and ${input.manifest.workPackets.length} work packets.`,
    refs: input.manifest.evidenceRefs,
    actor,
  })
  const withReceipts = appendTaskEvidence(withManifest, {
    kind: 'read-receipt',
    title: 'Deep Spine Scan read receipts',
    summary: input.manifest.readReceipts.join(', '),
    refs: input.manifest.readReceipts,
    actor,
  })
  const withBudget = appendTaskEvidence(withReceipts, {
    kind: 'runtime-budget',
    title: 'Deep Spine Scan budget',
    summary: `files=${input.manifest.filesScanned}, bytes=${input.manifest.bytesScanned}, skipped=${input.manifest.bytesSkipped}, exhausted=${input.manifest.budgetExhausted}`,
    refs: [`budget:maxFiles:${input.manifest.budget.maxFiles}`, `budget:maxBytes:${input.manifest.budget.maxBytes}`],
    actor,
  })

  return appendTaskEvidence(withBudget, {
    kind: 'validation',
    title: 'Deep Spine Scan findings',
    summary: input.manifest.findings.map((item) => `${item.severity}:${item.category}:${item.path}`).join('; ') || 'No findings.',
    refs: input.manifest.findings.flatMap((item) => item.evidence).slice(0, 40),
    actor,
  })
}

export function evaluateDeepSpineScanReadiness(manifest: DeepSpineScanManifest): DeepSpineScanReadiness {
  const missingEvidence = manifest.findings
    .filter((item) => item.evidence.length === 0 || !manifest.readReceipts.some((receipt) => receipt.includes('read-receipt:')))
    .map((item) => item.id)
  const blockers = [
    ...manifest.findings
      .filter((item) => item.severity === 'blocker')
      .map((item) => `${item.id} blocks apply: ${item.recommendation}`),
    ...missingEvidence.map((id) => `${id} is missing scan evidence or read receipt coverage.`),
  ]

  return {
    ready: blockers.length === 0,
    blockers,
    missingEvidence,
    nextAction:
      blockers.length === 0
        ? 'Use the generated work packets with scope locks, diff proposals, tests, and rollback evidence.'
        : 'Resolve blocker findings and missing evidence before generating work packets.',
  }
}

function upsertLedgerEntry(entries: MissionLedgerEntry[], nextEntry: MissionLedgerEntry): MissionLedgerEntry[] {
  return [nextEntry, ...entries.filter((entry) => entry.id !== nextEntry.id)].slice(0, 40)
}

function upsertGraphNode(nodes: ProductionGraphNode[], nextNode: ProductionGraphNode): ProductionGraphNode[] {
  return [nextNode, ...nodes.filter((node) => node.id !== nextNode.id)].slice(0, 20)
}

function graphNodeForScan(
  manifest: DeepSpineScanManifest,
  key: ProductionGraphKey,
  label: string,
  ownerAgent: string
): ProductionGraphNode {
  const blockerFindings = manifest.findings.filter((item) => item.severity === 'blocker' || item.severity === 'high')
  return {
    id: `deep-spine-${key}`,
    label,
    status: blockerFindings.length > 0 ? 'blocked' : manifest.findings.length > 0 ? 'needs-review' : 'ready',
    ownerAgent,
    evidenceRefs: manifest.evidenceRefs,
    blockers: blockerFindings.map((item) => `${item.category}: ${item.recommendation}`).slice(0, 10),
    updatedAt: manifest.generatedAt,
  }
}

function ledgerEntryForScan(manifest: DeepSpineScanManifest): MissionLedgerEntry {
  const blockerCount = manifest.findings.filter((item) => item.severity === 'blocker' || item.severity === 'high').length
  return {
    id: 'deep-spine-scan',
    phase: 'Deep Spine Scan',
    ownerAgent: 'Producer Agent',
    state: blockerCount > 0 ? 'blocked' : manifest.findings.length > 0 ? 'needs-approval' : 'complete',
    summary: `${manifest.mode} scan inspected ${manifest.filesScanned} files, skipped ${manifest.bytesSkipped} bytes, and found ${manifest.findings.length} findings.`,
    acceptance: [
      'Scan manifest persisted',
      'Read receipts generated',
      'No auto-fix performed',
      'Work packets require scope locks before diffs',
    ],
    evidenceRefs: manifest.evidenceRefs,
    rollbackPlan: 'Delete scan artifacts/read receipts and return to the previous production-state checkpoint.',
    nextAction: manifest.nextActions[0] ?? 'Review Deep Spine Scan work packets.',
    estimatedCostUsd: 0,
    updatedAt: manifest.generatedAt,
  }
}

export function mergeDeepSpineScanIntoProductionState(
  state: AgenticProductionState,
  manifest: DeepSpineScanManifest
): AgenticProductionState {
  const highRiskFindings = manifest.findings
    .filter((item) => item.severity === 'blocker' || item.severity === 'high')
    .map((item) => `${item.severity.toUpperCase()}: ${item.category} - ${item.recommendation}`)
  const constraints = [
    `Deep Spine Scan ${manifest.scanId}: ${manifest.filesScanned} files / ${manifest.bytesScanned} bytes inspected.`,
    'Deep Spine Scan outputs are evidence/work packets only; auto-fix is forbidden.',
    'External downloads/adaptations require license, checksum, source URL, and human approval.',
    'MB/GB scans and heavy runtime jobs must stay in worker, sidecar, cloud, or held lanes.',
  ]
  const graphs: Partial<Record<ProductionGraphKey, ProductionGraphNode[]>> = {
    evidenceGraph: upsertGraphNode(
      state.graphs.evidenceGraph,
      graphNodeForScan(manifest, 'evidenceGraph', 'Deep Spine evidence manifest', 'Producer Agent')
    ),
    validationGraph: upsertGraphNode(
      state.graphs.validationGraph,
      graphNodeForScan(manifest, 'validationGraph', 'Deep Spine validation findings', 'QA Agent')
    ),
    releaseGraph: upsertGraphNode(
      state.graphs.releaseGraph,
      graphNodeForScan(manifest, 'releaseGraph', 'Deep Spine release blockers', 'Release Agent')
    ),
  }

  return mergeAgenticProductionState(
    state,
    {
      brain: {
        technicalBible: {
          ...state.brain.technicalBible,
          constraints: appendUnique(state.brain.technicalBible.constraints, constraints),
        },
        risks: appendUnique(state.brain.risks, highRiskFindings),
      },
      ledger: upsertLedgerEntry(state.ledger, ledgerEntryForScan(manifest)),
      graphs,
      runtimePolicy: {
        requiresHumanApproval:
          state.runtimePolicy.requiresHumanApproval ||
          manifest.findings.some((item) => item.requiresHumanReview) ||
          manifest.budgetExhausted,
        maxConcurrentHeavyJobs: manifest.budgetExhausted
          ? Math.min(state.runtimePolicy.maxConcurrentHeavyJobs, 2)
          : state.runtimePolicy.maxConcurrentHeavyJobs,
      },
    },
    manifest.generatedAt
  )
}

export function readDeepSpineScanManifestFromSettings(settings: unknown): DeepSpineScanManifest | null {
  if (!isRecord(settings)) return null
  const candidate = settings[DEEP_SPINE_SCAN_SETTINGS_KEY]
  if (!isRecord(candidate)) return null
  if (candidate.version !== 1) return null
  if (typeof candidate.scanId !== 'string' || typeof candidate.projectId !== 'string') return null
  if (!Array.isArray(candidate.findings) || !Array.isArray(candidate.readReceipts)) return null
  return candidate as unknown as DeepSpineScanManifest
}

export function writeDeepSpineScanManifestToSettings(
  settings: unknown,
  manifest: DeepSpineScanManifest
): Record<string, unknown> {
  return {
    ...(isRecord(settings) ? settings : {}),
    [DEEP_SPINE_SCAN_SETTINGS_KEY]: manifest,
  }
}
