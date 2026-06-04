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
  type CartographySourceKind,
  type RepositoryArtifactInput,
  type RepositoryCartographyManifest,
  type RepositorySurface,
} from './repository-cartography'
import type { ResearchIntelligencePacket } from './research-intelligence-bridge'
import {
  appendTaskEvidence,
  type TaskEvidenceLedger,
} from './task-evidence-ledger'

import {
  DEEP_SPINE_SCAN_SETTINGS_KEY,
  DEFAULT_BUDGET,
  DEFAULT_RUNTIME,
  ENGINE_LIB_TARGETS,
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

function compact(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '').replace(/\/+/g, '/').trim()
}

function unique(values: string[], limit = 120): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).slice(0, limit)
}

function appendUnique(existing: string[], incoming: string[], limit = 80): string[] {
  return unique([...existing, ...incoming], limit)
}

function clamp(value: number | undefined, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.max(min, Math.min(max, Math.floor(value as number)))
}

function normalizeBudget(input: Partial<DeepSpineScanBudget> | undefined): DeepSpineScanBudget {
  return {
    maxFiles: clamp(input?.maxFiles, DEFAULT_BUDGET.maxFiles, 1, 50_000),
    maxBytes: clamp(input?.maxBytes, DEFAULT_BUDGET.maxBytes, 1_000, 50 * 1024 * 1024 * 1024),
    maxHashBytes: clamp(input?.maxHashBytes, DEFAULT_BUDGET.maxHashBytes, 0, 512 * 1024 * 1024),
    maxTimeMs: clamp(input?.maxTimeMs, DEFAULT_BUDGET.maxTimeMs, 10_000, 3_600_000),
    maxFindings: clamp(input?.maxFindings, DEFAULT_BUDGET.maxFindings, 1, 500),
    allowCloudIndexing: input?.allowCloudIndexing ?? DEFAULT_BUDGET.allowCloudIndexing,
  }
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90) || 'scan'
}

function scanIdFor(input: { projectId: string; mode: DeepSpineScanMode; generatedAt: string }): string {
  return `deep-spine-${slugify(`${input.projectId}-${input.mode}-${input.generatedAt}`)}`
}

function normalizeScope(input: {
  scope?: Partial<DeepSpineScanScope>
  artifacts: RepositoryArtifactInput[]
}): DeepSpineScanScope {
  const paths = unique(
    (input.scope?.paths && input.scope.paths.length > 0
      ? input.scope.paths
      : input.artifacts.map((artifact) => artifact.path)
    ).map(normalizePath),
    80
  )
  const sourceKinds = new Set<CartographySourceKind>(
    input.artifacts.map((artifact) => artifact.sourceKind ?? 'local-workspace')
  )
  const inferredSourceKind: CartographySourceKind | 'mixed' = sourceKinds.size === 1 ? Array.from(sourceKinds)[0] : 'mixed'

  return {
    paths: paths.length > 0 ? paths : ['/'],
    sourceKind: input.scope?.sourceKind ?? inferredSourceKind,
    description: compact(input.scope?.description) ?? 'Governed deep scan over selected project surfaces.',
  }
}

function selectArtifactsForBudget(artifacts: RepositoryArtifactInput[], budget: DeepSpineScanBudget): RepositoryArtifactInput[] {
  const selected: RepositoryArtifactInput[] = []
  let totalBytes = 0

  for (const artifact of artifacts) {
    if (selected.length >= budget.maxFiles) break
    if (totalBytes + artifact.sizeBytes > budget.maxBytes) break
    selected.push(artifact)
    totalBytes += artifact.sizeBytes
  }

  return selected
}

function finding(input: Omit<DeepSpineFinding, 'id' | 'safeAutofix' | 'requiresHumanReview'> & { id?: string }): DeepSpineFinding {
  return {
    id: input.id ?? `finding-${slugify(`${input.category}-${input.path}-${input.recommendation}`)}`,
    severity: input.severity,
    category: input.category,
    path: normalizePath(input.path || 'project'),
    line: input.line,
    evidence: unique(input.evidence, 20),
    recommendation: input.recommendation,
    confidence: Math.max(0, Math.min(1, input.confidence)),
    safeAutofix: false,
    requiresHumanReview: input.severity === 'blocker' || input.severity === 'high' || input.category === 'external-provenance',
  }
}

function sourceRefsFor(surfaces: RepositorySurface[]): string[] {
  return unique(
    surfaces.flatMap((surface) => [
      surface.path,
      surface.hash ? `hash:${surface.hash}` : '',
      surface.license ? `license:${surface.license}` : '',
      surface.sourceUrl ? `source:${surface.sourceUrl}` : '',
    ]),
    120
  )
}

function signalFor(signals: DeepSpineScanSurfaceSignal[], path: string): DeepSpineScanSurfaceSignal | undefined {
  const normalized = normalizePath(path)
  return signals.find((signal) => normalizePath(signal.path) === normalized || normalized.endsWith(normalizePath(signal.path)))
}

function buildFindings(input: {
  mode: DeepSpineScanMode
  budget: DeepSpineScanBudget
  selectedArtifacts: RepositoryArtifactInput[]
  allArtifacts: RepositoryArtifactInput[]
  cartography: RepositoryCartographyManifest
  surfaceSignals: DeepSpineScanSurfaceSignal[]
  heldBytes: number
  indexingBlockers: string[]
}): DeepSpineFinding[] {
  const findings: DeepSpineFinding[] = []
  const selectedBytes = input.selectedArtifacts.reduce((sum, artifact) => sum + artifact.sizeBytes, 0)
  const allBytes = input.allArtifacts.reduce((sum, artifact) => sum + artifact.sizeBytes, 0)

  if (input.selectedArtifacts.length < input.allArtifacts.length || selectedBytes < allBytes) {
    findings.push(
      finding({
        severity: 'high',
        category: 'runtime-budget',
        path: 'project',
        line: null,
        evidence: [`selected:${input.selectedArtifacts.length}`, `total:${input.allArtifacts.length}`, `budget:${input.budget.maxBytes}`],
        recommendation: 'Continue in worker/sidecar/cloud-indexer batches; never dump the full MB/GB project into model context.',
        confidence: 0.98,
      })
    )
  }

  if (input.heldBytes > 0) {
    findings.push(
      finding({
        severity: 'high',
        category: 'context-budget',
        path: 'project',
        line: null,
        evidence: [`held-bytes:${input.heldBytes}`, ...input.indexingBlockers.slice(0, 4)],
        recommendation: 'Resolve held shards with sidecar/cloud indexing or human review before apply/generation.',
        confidence: 0.95,
      })
    )
  }

  for (const surface of input.cartography.surfaces) {
    const signal = signalFor(input.surfaceSignals, surface.path)
    if (surface.sizeClass === 'huge' || surface.strategy === 'manual-review') {
      findings.push(
        finding({
          severity: 'medium',
          category: 'large-file',
          path: surface.path,
          line: null,
          evidence: [`size:${surface.sizeBytes}`, `strategy:${surface.strategy}`, ...surface.risks],
          recommendation: 'Keep this surface metadata/index-only until proxy, thumbnail, license, and budget evidence exist.',
          confidence: 0.9,
        })
      )
    }

    if (input.mode === 'external' || surface.sourceKind !== 'local-workspace') {
      const hasLicense = Boolean(surface.license) || signal?.hasLicenseEvidence === true
      const hasChecksum = Boolean(surface.hash) || signal?.hasChecksumEvidence === true
      if (!hasLicense || !hasChecksum || !surface.sourceUrl) {
        findings.push(
          finding({
            severity: 'high',
            category: 'external-provenance',
            path: surface.path,
            line: null,
            evidence: [
              `source-kind:${surface.sourceKind}`,
              hasLicense ? 'license:present' : 'license:missing',
              hasChecksum ? 'checksum:present' : 'checksum:missing',
              surface.sourceUrl ? 'source-url:present' : 'source-url:missing',
            ],
            recommendation: 'Hold adaptation until license, checksum, source URL, and explicit approval are recorded.',
            confidence: 0.97,
          })
        )
      }
    }

    if (signal?.lineCount && signal.lineCount >= 950) {
      findings.push(
        finding({
          severity: 'medium',
          category: 'god-file',
          path: surface.path,
          line: 1,
          evidence: [`line-count:${signal.lineCount}`],
          recommendation: 'Split this file before it crosses the god-file ratchet; keep orchestration thin and move sections behind adapters.',
          confidence: 0.88,
        })
      )
    }

    if (signal?.hardcodedCopyMatches && signal.hardcodedCopyMatches > 0) {
      findings.push(
        finding({
          severity: 'medium',
          category: 'i18n',
          path: surface.path,
          line: null,
          evidence: [`hardcoded-copy-matches:${signal.hardcodedCopyMatches}`],
          recommendation: 'Migrate visible Portuguese copy to locale keys and keep tests/docs allowlisted only.',
          confidence: 0.86,
        })
      )
    }

    const engineTarget = ENGINE_LIB_TARGETS.get(surface.basename)
    if (engineTarget && signal?.importerCount === 0) {
      findings.push(
        finding({
          severity: 'high',
          category: 'dead-code',
          path: surface.path,
          line: 1,
          evidence: [`importer-count:${signal.importerCount}`, `owner:${engineTarget.agent}`],
          recommendation: engineTarget.recommendation,
          confidence: 0.94,
        })
      )
    }

    if (/aaa-renderer-impl\.ts$/.test(surface.path) && !signal?.hasAaaRendererEvidence) {
      findings.push(
        finding({
          severity: 'high',
          category: 'rendering',
          path: surface.path,
          line: 1,
          evidence: ['audit-v17:aaa-render-impl-risk', 'renderer-evidence:missing'],
          recommendation: 'Add explicit renderer capability/frame evidence and final-render blockers before marketing AAA render claims.',
          confidence: 0.92,
        })
      )
    }
  }

  const hasWebGpuEvidence =
    input.surfaceSignals.some((signal) => signal.hasWebGpuReference) ||
    input.cartography.surfaces.some((surface) => /webgpu|webgpu-renderer/i.test(surface.path))
  if (input.mode === 'aaa' && !hasWebGpuEvidence) {
    findings.push(
      finding({
        severity: 'high',
        category: 'rendering',
        path: 'cloud-web-app/web/lib/render',
        line: null,
        evidence: ['mode:aaa', 'webgpu-reference:missing'],
        recommendation: 'Add a feature-flagged WebGPU renderer probe/fallback before claiming modern browser AAA rendering.',
        confidence: 0.9,
      })
    )
  }

  return findings
    .sort((left, right) => {
      const priority = { blocker: 0, high: 1, medium: 2, low: 3 }
      return priority[left.severity] - priority[right.severity] || left.path.localeCompare(right.path)
    })
    .slice(0, input.budget.maxFindings)
}

function ownerAgentFor(category: DeepSpineFindingCategory): string {
  switch (category) {
    case 'rendering':
    case 'toolchain':
      return 'Performance Agent'
    case 'game-production':
    case 'dead-code':
      return 'Gameplay Engineer Agent'
    case 'external-provenance':
      return 'Legal Reviewer'
    case 'i18n':
      return 'Translator'
    case 'god-file':
      return 'Software Engineer Agent'
    default:
      return 'Producer Agent'
  }
}

function buildWorkPackets(findings: DeepSpineFinding[]): DeepSpineWorkPacket[] {
  return findings
    .filter((item) => item.severity === 'blocker' || item.severity === 'high')
    .slice(0, 12)
    .map((item) => ({
      id: `work-${slugify(item.id)}`,
      title: item.recommendation,
      ownerAgent: ownerAgentFor(item.category),
      targetPaths: item.path === 'project' ? [] : [item.path],
      blockedUntil: [
        'Read receipts are recorded for every target surface.',
        'Scope lock is assigned before diff proposal.',
        'Rollback or artifact cleanup plan exists before apply.',
      ],
      evidenceRequired: unique(['deep-spine-scan manifest', ...item.evidence, 'validation result'], 12),
    }))
}

function buildNextActions(findings: DeepSpineFinding[], workPackets: DeepSpineWorkPacket[]): string[] {
  if (findings.length === 0) {
    return ['No blockers found. Keep the scan manifest as evidence and run focused validation before apply.']
  }

  return unique(
    [
      ...workPackets.map((packet) => `${packet.ownerAgent}: ${packet.title}`),
      'Use diff-proposal only after read receipts, scope lock, tests, and rollback evidence exist.',
      'Re-run Deep Spine Scan after fixes to close stale work packets.',
    ],
    16
  )
}

function buildBlockedActions(findings: DeepSpineFinding[]): string[] {
  const blocked = [
    'Do not auto-fix from scan output; generate scoped diffs only through the governed apply path.',
    'Do not download internet packages or models from this scan without license, checksum, source URL, and approval.',
    'Do not run MB/GB indexing, render, asset optimization, shader compile, or browser automation on the browser main thread.',
  ]

  if (findings.some((item) => item.category === 'external-provenance')) {
    blocked.push('External adaptation is held until provenance evidence is complete.')
  }
  if (findings.some((item) => item.category === 'runtime-budget' || item.category === 'context-budget')) {
    blocked.push('Apply/generation is held for over-budget or held shards until sidecar/cloud/human review resolves them.')
  }

  return blocked
}

function buildHandoffPrompt(input: {
  manifest: DeepSpineScanManifest
  cartography: RepositoryCartographyManifest
}): string {
  const topFindings = input.manifest.findings
    .slice(0, 6)
    .map((item) => `${item.severity}:${item.category}:${item.path}`)
    .join(', ')

  return [
    `Deep Spine Scan ${input.manifest.scanId} inspected ${input.manifest.filesScanned} files / ${input.manifest.bytesScanned} bytes.`,
    `Use cartography ${input.cartography.id}, read receipts ${input.manifest.readReceipts.join(', ')}, and work packets before edits.`,
    topFindings ? `Top findings: ${topFindings}.` : 'No top findings.',
    'Never claim done until validation evidence and rollback/artifact cleanup are recorded.',
  ].join(' ')
}

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
