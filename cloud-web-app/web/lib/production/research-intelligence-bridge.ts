import {
  AgenticProductionState,
  MissionLedgerEntry,
  ProductionGraphKey,
  ProductionGraphNode,
  ProductionNodeStatus,
  mergeAgenticProductionState,
} from './agentic-production-state'
import type { RepositoryCartographyManifest, RepositorySurface } from './repository-cartography'

export const RESEARCH_INTELLIGENCE_SETTINGS_KEY = 'aethelResearchIntelligencePacket'

export type ResearchSourceKind =
  | 'web'
  | 'official-docs'
  | 'paper'
  | 'github'
  | 'huggingface-hub'
  | 'browser-operator'
  | 'local-repo'
  | 'user-upload'
  | 'unknown'

export type ResearchClaimStatus =
  | 'confirmed-by-repo'
  | 'confirmed-by-source'
  | 'needs-verification'
  | 'conflicts-with-repo'
  | 'hypothesis'

export type ResearchRiskSeverity = 'blocker' | 'high' | 'medium' | 'low'

export interface ResearchEvidenceInput {
  id?: string
  title?: string
  sourceKind?: ResearchSourceKind
  url?: string
  collectedAt?: string
  claim?: string
  summary?: string
  confidence?: number
  relatedPaths?: string[]
  evidenceRefs?: string[]
  requiresBrowserReplay?: boolean
  requiresHumanApproval?: boolean
  conflictWithRepo?: boolean
}

export interface ResearchSourceRecord {
  id: string
  title: string
  sourceKind: ResearchSourceKind
  url: string | null
  collectedAt: string
  confidence: number
  requiresBrowserReplay: boolean
  requiresHumanApproval: boolean
}

export interface ResearchClaimRecord {
  id: string
  title: string
  claim: string
  status: ResearchClaimStatus
  confidence: number
  sourceIds: string[]
  relatedPaths: string[]
  repoSurfaceIds: string[]
  evidenceRefs: string[]
  blockers: string[]
}

export interface ResearchRisk {
  id: string
  severity: ResearchRiskSeverity
  title: string
  recommendation: string
  sourceIds: string[]
  relatedPaths: string[]
}

export interface ResearchExternalToolPlan {
  id: string
  tool: 'browser-operator' | 'huggingface-cli' | 'github' | 'web-search' | 'human-review'
  purpose: string
  safeMode: 'metadata-only' | 'read-only' | 'approval-required'
  commandHint?: string
  approvalRequired: boolean
  evidenceRequired: string[]
}

export interface ResearchIntelligencePacket {
  version: 1
  id: string
  projectId: string
  mission: string
  generatedAt: string
  sources: ResearchSourceRecord[]
  claims: ResearchClaimRecord[]
  risks: ResearchRisk[]
  externalToolPlan: ResearchExternalToolPlan[]
  guardrails: string[]
  contextLinks: {
    repositoryManifestId: string | null
    relatedSurfaceCount: number
    sourceCount: number
    claimCount: number
  }
}

export interface ResearchIntelligenceInput {
  projectId: string
  mission?: string
  generatedAt?: string
  evidence: ResearchEvidenceInput[]
  repositoryManifest?: RepositoryCartographyManifest | null
}

const DEFAULT_MISSION = 'Connect external research with repository evidence before agents edit.'
const LOW_CONFIDENCE = 0.55
const MEDIUM_CONFIDENCE = 0.72

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function compact(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function clampConfidence(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0.5
  return Math.max(0, Math.min(1, Math.round(value * 100) / 100))
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return slug || 'research'
}

function unique(values: string[], limit = 60): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).slice(0, limit)
}

function normalizeSourceKind(input: ResearchSourceKind | undefined, url?: string): ResearchSourceKind {
  if (input) return input
  const lower = url?.toLowerCase() ?? ''
  if (lower.includes('huggingface.co/')) return 'huggingface-hub'
  if (lower.includes('github.com/')) return 'github'
  if (lower.includes('arxiv.org/') || lower.includes('doi.org/')) return 'paper'
  if (lower.includes('docs.') || lower.includes('/docs/')) return 'official-docs'
  return lower ? 'web' : 'unknown'
}

function normalizeRelatedPaths(value: string[] | undefined): string[] {
  return unique((value ?? []).map((item) => item.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '')), 30)
}

function buildSurfaceLookup(manifest?: RepositoryCartographyManifest | null): Map<string, RepositorySurface> {
  const lookup = new Map<string, RepositorySurface>()
  for (const surface of manifest?.surfaces ?? []) {
    lookup.set(surface.path, surface)
    lookup.set(surface.basename, surface)
  }
  return lookup
}

function matchRepoSurfaces(paths: string[], lookup: Map<string, RepositorySurface>): RepositorySurface[] {
  const matches: RepositorySurface[] = []
  for (const path of paths) {
    const exact = lookup.get(path)
    if (exact) {
      matches.push(exact)
      continue
    }
    for (const [candidate, surface] of lookup.entries()) {
      if (candidate.endsWith(path) || path.endsWith(candidate)) {
        matches.push(surface)
        break
      }
    }
  }
  return Array.from(new Map(matches.map((surface) => [surface.id, surface])).values())
}

function inferClaimStatus(input: {
  evidence: ResearchEvidenceInput
  sourceKind: ResearchSourceKind
  confidence: number
  repoSurfaces: RepositorySurface[]
}): ResearchClaimStatus {
  if (input.evidence.conflictWithRepo) return 'conflicts-with-repo'
  if (input.confidence < LOW_CONFIDENCE) return 'needs-verification'
  if (input.repoSurfaces.length > 0) return 'confirmed-by-repo'
  if (input.sourceKind === 'unknown') return 'hypothesis'
  if (input.confidence < MEDIUM_CONFIDENCE) return 'needs-verification'
  return 'confirmed-by-source'
}

function blockersForClaim(status: ResearchClaimStatus, source: ResearchSourceRecord, repoSurfaces: RepositorySurface[]): string[] {
  const blockers: string[] = []
  if (status === 'conflicts-with-repo') blockers.push('Research conflicts with mapped repository evidence; human review required.')
  if (status === 'needs-verification') blockers.push('Source confidence is too low for autonomous edits.')
  if (status === 'hypothesis') blockers.push('Claim has no trusted source or repo match; keep as hypothesis.')
  if (source.sourceKind === 'huggingface-hub' && repoSurfaces.some((surface) => !surface.license)) {
    blockers.push('Hugging Face asset/model reference touches unlicensed repo surfaces; verify license before use.')
  }
  if (source.requiresBrowserReplay) blockers.push('Browser operator replay evidence is required before claiming completion.')
  return blockers
}

function buildSource(input: ResearchEvidenceInput, index: number, generatedAt: string): ResearchSourceRecord {
  const url = compact(input.url) ?? null
  const sourceKind = normalizeSourceKind(input.sourceKind, url ?? undefined)
  const title = compact(input.title) ?? compact(input.claim) ?? `Research source ${index + 1}`
  return {
    id: compact(input.id) ?? `research-source-${index + 1}-${slugify(title)}`,
    title,
    sourceKind,
    url,
    collectedAt: compact(input.collectedAt) ?? generatedAt,
    confidence: clampConfidence(input.confidence),
    requiresBrowserReplay: Boolean(input.requiresBrowserReplay || sourceKind === 'browser-operator'),
    requiresHumanApproval: Boolean(input.requiresHumanApproval || sourceKind === 'browser-operator'),
  }
}

function buildClaim(input: {
  evidence: ResearchEvidenceInput
  source: ResearchSourceRecord
  repoSurfaces: RepositorySurface[]
  index: number
}): ResearchClaimRecord {
  const claimText = compact(input.evidence.claim) ?? compact(input.evidence.summary) ?? input.source.title
  const status = inferClaimStatus({
    evidence: input.evidence,
    sourceKind: input.source.sourceKind,
    confidence: input.source.confidence,
    repoSurfaces: input.repoSurfaces,
  })
  const relatedPaths = normalizeRelatedPaths(input.evidence.relatedPaths)
  const evidenceRefs = unique([
    ...((input.evidence.evidenceRefs ?? []).filter((item): item is string => typeof item === 'string')),
    `research-source:${input.source.id}`,
    ...input.repoSurfaces.map((surface) => `repo-surface:${surface.id}`),
  ])

  return {
    id: `research-claim-${input.index + 1}-${slugify(claimText)}`,
    title: compact(input.evidence.title) ?? input.source.title,
    claim: claimText,
    status,
    confidence: input.source.confidence,
    sourceIds: [input.source.id],
    relatedPaths,
    repoSurfaceIds: input.repoSurfaces.map((surface) => surface.id),
    evidenceRefs,
    blockers: blockersForClaim(status, input.source, input.repoSurfaces),
  }
}

function buildRisks(claims: ResearchClaimRecord[], sources: ResearchSourceRecord[]): ResearchRisk[] {
  const risks: ResearchRisk[] = []
  const weakClaims = claims.filter((claim) => claim.status === 'needs-verification' || claim.status === 'hypothesis')
  const conflicts = claims.filter((claim) => claim.status === 'conflicts-with-repo')
  const browserSources = sources.filter((source) => source.requiresBrowserReplay)
  const hfSources = sources.filter((source) => source.sourceKind === 'huggingface-hub')

  if (conflicts.length > 0) {
    risks.push({
      id: 'research-conflicts-with-repo',
      severity: 'blocker',
      title: 'External research conflicts with repository evidence',
      recommendation: 'Pause autonomous edits and ask Producer/Research agents to reconcile the conflict with citations.',
      sourceIds: unique(conflicts.flatMap((claim) => claim.sourceIds)),
      relatedPaths: unique(conflicts.flatMap((claim) => claim.relatedPaths)),
    })
  }

  if (weakClaims.length > 0) {
    risks.push({
      id: 'research-low-confidence-claims',
      severity: 'high',
      title: 'Some research claims are not strong enough for autonomous implementation',
      recommendation: 'Require a second source, repo match, screenshot, or official documentation before changing code/assets.',
      sourceIds: unique(weakClaims.flatMap((claim) => claim.sourceIds)),
      relatedPaths: unique(weakClaims.flatMap((claim) => claim.relatedPaths)),
    })
  }

  if (browserSources.length > 0) {
    risks.push({
      id: 'browser-operator-replay-required',
      severity: 'high',
      title: 'Browser operator actions require replay evidence',
      recommendation: 'Store replay, screenshots, permissions, and pause/takeover markers before writing Mission Ledger done states.',
      sourceIds: browserSources.map((source) => source.id),
      relatedPaths: [],
    })
  }

  if (hfSources.length > 0) {
    risks.push({
      id: 'huggingface-metadata-first',
      severity: 'medium',
      title: 'Hugging Face sources must be mirrored as metadata before GB-scale downloads',
      recommendation: 'Use hf metadata/dry-run, include/exclude filters, and cache verification before pulling model or dataset files.',
      sourceIds: hfSources.map((source) => source.id),
      relatedPaths: [],
    })
  }

  return risks
}

function buildExternalToolPlan(sources: ResearchSourceRecord[]): ResearchExternalToolPlan[] {
  const plans: ResearchExternalToolPlan[] = []
  if (sources.some((source) => source.sourceKind === 'huggingface-hub')) {
    plans.push({
      id: 'hf-metadata-first',
      tool: 'huggingface-cli',
      purpose: 'Inspect Hub repositories without downloading GB-scale assets into the UI thread.',
      safeMode: 'metadata-only',
      commandHint: 'hf download <repo-id> --dry-run --include README.md --include "*.json" --include "*.md"',
      approvalRequired: false,
      evidenceRequired: ['repo id', 'revision', 'license', 'file list', 'size plan', 'cache path'],
    })
  }
  if (sources.some((source) => source.sourceKind === 'browser-operator')) {
    plans.push({
      id: 'browser-replay-capture',
      tool: 'browser-operator',
      purpose: 'Navigate, inspect, and configure external services with human approval and replayable evidence.',
      safeMode: 'approval-required',
      approvalRequired: true,
      evidenceRequired: ['permission prompt', 'replay log', 'screenshots', 'sensitive-action approval'],
    })
  }
  if (sources.some((source) => source.sourceKind === 'github')) {
    plans.push({
      id: 'github-readonly-diff-map',
      tool: 'github',
      purpose: 'Compare upstream examples, issues, and release notes before changing local implementation.',
      safeMode: 'read-only',
      approvalRequired: false,
      evidenceRequired: ['commit or release URL', 'files compared', 'applicability note'],
    })
  }
  if (sources.some((source) => source.sourceKind === 'web' || source.sourceKind === 'official-docs' || source.sourceKind === 'paper')) {
    plans.push({
      id: 'web-research-citation-pass',
      tool: 'web-search',
      purpose: 'Turn open-web research into dated, cited claims with repo relevance.',
      safeMode: 'read-only',
      approvalRequired: false,
      evidenceRequired: ['URL', 'retrieved date', 'claim summary', 'repo paths affected'],
    })
  }
  if (sources.length === 0) {
    plans.push({
      id: 'human-research-required',
      tool: 'human-review',
      purpose: 'No external sources were supplied; keep research state blocked until evidence exists.',
      safeMode: 'approval-required',
      approvalRequired: true,
      evidenceRequired: ['mission question', 'source list', 'acceptance criteria'],
    })
  }
  return plans
}

function buildGuardrails(input: {
  claims: ResearchClaimRecord[]
  sources: ResearchSourceRecord[]
  manifest?: RepositoryCartographyManifest | null
}): string[] {
  return unique([
    'Do not convert external research into implementation unless it is linked to repo surfaces or marked as a hypothesis.',
    'Do not download GB-scale model, dataset, video, or asset files on the main UI thread.',
    'Every research-derived task must cite source URL/date and the affected repo path or asset graph node.',
    'Browser operator actions that log in, buy, deploy, message, or mutate external services require human approval and replay evidence.',
    'Hugging Face Hub usage starts with metadata, license, revision, size plan, and cache verification before file download.',
    input.manifest ? `Repository manifest ${input.manifest.id} is the current repo truth source.` : 'Repository cartography is required before autonomous implementation.',
    input.claims.some((claim) => claim.status === 'conflicts-with-repo')
      ? 'Conflicting research blocks autonomous edits until reconciled.'
      : '',
    input.sources.some((source) => source.requiresBrowserReplay)
      ? 'Research from browser operation is incomplete without replay and screenshot evidence.'
      : '',
  ])
}

export function buildResearchIntelligencePacket(input: ResearchIntelligenceInput): ResearchIntelligencePacket {
  const generatedAt = input.generatedAt ?? new Date().toISOString()
  const mission = compact(input.mission) ?? DEFAULT_MISSION
  const surfaceLookup = buildSurfaceLookup(input.repositoryManifest)
  const sources = input.evidence.map((evidence, index) => buildSource(evidence, index, generatedAt))
  const claims = input.evidence.map((evidence, index) => {
    const source = sources[index]
    const repoSurfaces = matchRepoSurfaces(normalizeRelatedPaths(evidence.relatedPaths), surfaceLookup)
    return buildClaim({ evidence, source, repoSurfaces, index })
  })
  const risks = buildRisks(claims, sources)

  return {
    version: 1,
    id: `research-intelligence-${slugify(input.projectId)}-${generatedAt.slice(0, 10)}`,
    projectId: input.projectId,
    mission,
    generatedAt,
    sources,
    claims,
    risks,
    externalToolPlan: buildExternalToolPlan(sources),
    guardrails: buildGuardrails({ claims, sources, manifest: input.repositoryManifest }),
    contextLinks: {
      repositoryManifestId: input.repositoryManifest?.id ?? null,
      relatedSurfaceCount: unique(claims.flatMap((claim) => claim.repoSurfaceIds)).length,
      sourceCount: sources.length,
      claimCount: claims.length,
    },
  }
}

function graphStatusForPacket(packet: ResearchIntelligencePacket, key: ProductionGraphKey): ProductionNodeStatus {
  if (packet.risks.some((risk) => risk.severity === 'blocker')) return 'blocked'
  if (packet.risks.some((risk) => risk.severity === 'high')) return 'needs-review'
  if (key === 'evidenceGraph' || key === 'validationGraph') return packet.sources.length > 0 ? 'ready' : 'needs-review'
  return packet.sources.length > 0 ? 'needs-review' : 'draft'
}

function buildResearchGraphNode(packet: ResearchIntelligencePacket, key: ProductionGraphKey): ProductionGraphNode {
  return {
    id: `research-intelligence-${key}`,
    label: key === 'evidenceGraph' ? 'External research evidence' : 'Research validation gates',
    status: graphStatusForPacket(packet, key),
    ownerAgent: key === 'evidenceGraph' ? 'Research Agent' : 'QA Agent',
    evidenceRefs: [`research-intelligence:${packet.id}`, ...packet.claims.flatMap((claim) => claim.evidenceRefs)].slice(0, 40),
    blockers: packet.risks.filter((risk) => risk.severity === 'blocker' || risk.severity === 'high').map((risk) => risk.title),
    updatedAt: packet.generatedAt,
  }
}

function upsertGraphNode(nodes: ProductionGraphNode[], node: ProductionGraphNode): ProductionGraphNode[] {
  return [node, ...nodes.filter((candidate) => candidate.id !== node.id)]
}

function upsertLedgerEntry(entries: MissionLedgerEntry[], entry: MissionLedgerEntry): MissionLedgerEntry[] {
  return [entry, ...entries.filter((candidate) => candidate.id !== entry.id)]
}

function buildResearchLedgerEntry(packet: ResearchIntelligencePacket): MissionLedgerEntry {
  const blockerCount = packet.risks.filter((risk) => risk.severity === 'blocker' || risk.severity === 'high').length
  return {
    id: 'research-intelligence',
    phase: 'Research intelligence',
    ownerAgent: 'Research Agent',
    state: blockerCount > 0 || packet.sources.length === 0 ? 'needs-approval' : 'running',
    summary: `Linked ${packet.sources.length} external sources to ${packet.contextLinks.relatedSurfaceCount} repository surfaces with ${packet.claims.length} claims.`,
    acceptance: [
      'source URLs/dates captured',
      'repo-related paths linked',
      'hypotheses separated from confirmed claims',
      'browser/Hugging Face actions constrained to safe tool plans',
    ],
    evidenceRefs: [`research-intelligence:${packet.id}`],
    rollbackPlan: 'Remove research-derived graph updates and keep repository cartography as source of truth.',
    nextAction:
      packet.risks[0]?.recommendation ??
      'Route implementation through scope locks, read receipts, and citation-backed task plans.',
    estimatedCostUsd: 0,
    updatedAt: packet.generatedAt,
  }
}

export function mergeResearchIntelligenceIntoProductionState(
  state: AgenticProductionState,
  packet: ResearchIntelligencePacket
): AgenticProductionState {
  const constraints = [
    `Research intelligence coverage: ${packet.sources.length} sources / ${packet.claims.length} claims.`,
    `${packet.contextLinks.relatedSurfaceCount} repository surfaces are linked to external research.`,
    ...packet.guardrails,
  ]
  const risks = packet.risks.map((risk) => `${risk.severity.toUpperCase()}: ${risk.title}`)
  const ledger = upsertLedgerEntry(state.ledger, buildResearchLedgerEntry(packet))

  return mergeAgenticProductionState(
    state,
    {
      brain: {
        technicalBible: {
          ...state.brain.technicalBible,
          constraints: unique([...state.brain.technicalBible.constraints, ...constraints], 80),
        },
        risks: unique([...state.brain.risks, ...risks], 80),
      },
      ledger,
      graphs: {
        evidenceGraph: upsertGraphNode(state.graphs.evidenceGraph, buildResearchGraphNode(packet, 'evidenceGraph')),
        validationGraph: upsertGraphNode(state.graphs.validationGraph, buildResearchGraphNode(packet, 'validationGraph')),
      },
      runtimePolicy:
        packet.externalToolPlan.some((plan) => plan.approvalRequired) || packet.risks.length > 0
          ? { requiresHumanApproval: true, maxConcurrentHeavyJobs: Math.min(state.runtimePolicy.maxConcurrentHeavyJobs, 2) }
          : { requiresHumanApproval: state.runtimePolicy.requiresHumanApproval },
    },
    packet.generatedAt
  )
}

export function readResearchIntelligencePacketFromSettings(settings: unknown): ResearchIntelligencePacket | null {
  if (!isRecord(settings)) return null
  const candidate = settings[RESEARCH_INTELLIGENCE_SETTINGS_KEY]
  if (!isRecord(candidate)) return null
  if (candidate.version !== 1) return null
  if (typeof candidate.id !== 'string' || typeof candidate.projectId !== 'string') return null
  if (!Array.isArray(candidate.sources) || !Array.isArray(candidate.claims) || !Array.isArray(candidate.guardrails)) return null
  return candidate as unknown as ResearchIntelligencePacket
}

export function writeResearchIntelligencePacketToSettings(
  settings: unknown,
  packet: ResearchIntelligencePacket
): Record<string, unknown> {
  return {
    ...(isRecord(settings) ? settings : {}),
    [RESEARCH_INTELLIGENCE_SETTINGS_KEY]: packet,
  }
}
