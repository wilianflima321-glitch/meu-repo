import {
  buildProductionReadinessSummary,
  type AgenticProductionState,
} from '@/lib/production/agentic-production-state'

export type EvidenceCoverageDomainId =
  | 'project-memory'
  | 'research-intelligence'
  | 'browser-navigation'
  | 'agent-run-ledger'
  | 'asset-quality'
  | 'runtime-job'
  | 'playtest'
  | 'release-approval'

export type EvidenceCoverageStatus = 'covered' | 'missing' | 'needs-review' | 'blocked'

export interface EvidenceCoverageDomain {
  id: EvidenceCoverageDomainId
  label: string
  required: boolean
  status: EvidenceCoverageStatus
  evidenceRefs: string[]
  missingEvidence: string[]
  nextAction: string
}

export interface EvidenceRefCoverageReport {
  version: 1
  capability: 'AETHEL_EVIDENCE_REF_COVERAGE'
  capabilityStatus: EvidenceCoverageStatus
  marketReady: boolean
  coveragePercent: number
  coveredRequiredDomains: number
  totalRequiredDomains: number
  evidenceRefs: string[]
  domains: EvidenceCoverageDomain[]
  blockers: string[]
  nextAction: string
}

type EvidenceRule = {
  id: EvidenceCoverageDomainId
  label: string
  required: (input: EvidenceCoverageInput) => boolean
  patterns: RegExp[]
  missingEvidence: string[]
  nextAction: string
}

export interface EvidenceCoverageInput {
  state: AgenticProductionState
  settings?: unknown
}

const SETTINGS_KEYS = {
  researchIntelligence: 'aethelResearchIntelligencePacket',
  researchNavigation: 'aethelResearchNavigationMesh',
  agentRunLedger: 'aethelAgentRunLedger',
  agentReadReceipts: 'aethelAgentReadReceipts',
}

const releaseApprovalPatterns = [
  /human[-_ ]?approval/i,
  /release[-_ ]?approval/i,
  /approval[-_: ]?record/i,
  /approved[-_: ]?release/i,
]

const evidenceRules: EvidenceRule[] = [
  {
    id: 'project-memory',
    label: 'Project memory and Mission Ledger',
    required: () => true,
    patterns: [/mission[-_ ]?ledger/i, /project[-_ ]?brain/i, /repo[-_ ]?cartography/i, /agent-read-receipt:/i],
    missingEvidence: ['Mission Ledger or Project Brain evidence ref is required before trusting production memory.'],
    nextAction: 'Persist a mission ledger update with evidence refs and rollback notes.',
  },
  {
    id: 'research-intelligence',
    label: 'Research intelligence',
    required: ({ settings }) => hasSettingsKey(settings, SETTINGS_KEYS.researchIntelligence),
    patterns: [/research-intelligence:/i, /source:/i, /citation:/i, /claim:/i],
    missingEvidence: ['Research claims require source/date/confidence evidence.'],
    nextAction: 'Attach research-intelligence evidence with source URLs, dates, confidence, and contradiction notes.',
  },
  {
    id: 'browser-navigation',
    label: 'Browser navigation and replay',
    required: ({ settings }) => hasSettingsKey(settings, SETTINGS_KEYS.researchNavigation),
    patterns: [/research-navigation-mesh:/i, /navigation-lane:/i, /browser[-_ ]?replay/i, /screenshot:/i, /dom[-_ ]?snapshot/i],
    missingEvidence: ['Browser work requires replay, screenshot, DOM hash, and pause/takeover evidence.'],
    nextAction: 'Persist the Research Navigation Mesh and attach replay/screenshot/DOM evidence before agent browsing claims.',
  },
  {
    id: 'agent-run-ledger',
    label: 'Agent run ledger',
    required: ({ settings }) => hasSettingsKey(settings, SETTINGS_KEYS.agentRunLedger),
    patterns: [/agent-run-ledger:/i, /agent-run:/i, /pull-request:/i, /preview:/i, /replay:/i],
    missingEvidence: ['Agent output requires run ledger evidence plus branch/PR or preview/replay artifacts.'],
    nextAction: 'Persist the project-scoped AgentRunLedger and resolve missing branch/PR/preview/replay artifacts.',
  },
  {
    id: 'asset-quality',
    label: 'Asset quality',
    required: ({ state }) => state.brain.domain === 'game' || state.brain.domain === 'film' || state.brain.domain === 'game-film',
    patterns: [/asset-import:/i, /asset-quality/i, /license/i, /provenance/i, /LOD[0-3]/i, /PBR/i, /collision/i, /navmesh/i],
    missingEvidence: ['Game/film assets require provenance, license, LOD/PBR, collision/navmesh, performance trace, and human review.'],
    nextAction: 'Run the asset quality pipeline and attach provenance, LOD/PBR, collision/navmesh, perf, and review evidence.',
  },
  {
    id: 'runtime-job',
    label: 'Runtime job receipts',
    required: ({ state }) => state.runtimePolicy.preferredTarget !== 'held' || state.runtimePolicy.maxConcurrentHeavyJobs > 0,
    patterns: [/runtime-job:/i, /render-job:/i, /studio-local-cook/i, /sidecar/i, /dispatch/i, /teardown/i],
    missingEvidence: ['Runtime work needs job receipts, capability status, dispatch decision, and rollback/teardown evidence.'],
    nextAction: 'Attach governed runtime job, Studio Local cook, render, or Cloud Stream receipts before runtime claims.',
  },
  {
    id: 'playtest',
    label: 'Playtest evidence',
    required: ({ state }) => state.brain.domain === 'game' || state.brain.domain === 'game-film',
    patterns: [/playtest/i, /bot[-_ ]?run/i, /softlock/i, /performance[-_ ]?trace/i, /input[-_ ]?replay/i],
    missingEvidence: ['Playable game claims require bot/human playtest logs, blockers, performance traces, and replay evidence.'],
    nextAction: 'Run a governed playtest and attach bot/human logs, blockers, performance trace, and replay.',
  },
  {
    id: 'release-approval',
    label: 'Human release approval',
    required: () => true,
    patterns: releaseApprovalPatterns,
    missingEvidence: ['Human release approval evidence is required before release can be marked ready.'],
    nextAction: 'Request human owner review and attach approval evidence before release/public claims.',
  },
]

export function buildEvidenceRefCoverageReport(input: EvidenceCoverageInput): EvidenceRefCoverageReport {
  const evidenceRefs = collectEvidenceRefs(input.state)
  const readiness = buildProductionReadinessSummary(input.state)
  const domains = evidenceRules.map((rule) => buildDomainCoverage(rule, input, evidenceRefs))
  const requiredDomains = domains.filter((domain) => domain.required)
  const coveredRequiredDomains = requiredDomains.filter((domain) => domain.status === 'covered').length
  const blockers = unique([
    ...domains.flatMap((domain) => domain.status === 'covered' ? [] : domain.missingEvidence),
    ...Object.values(input.state.graphs).flatMap((nodes) => nodes.flatMap((node) => node.status === 'blocked' ? node.blockers : [])),
  ])
  const totalRequiredDomains = requiredDomains.length
  const coveragePercent = totalRequiredDomains === 0
    ? 100
    : Math.round((coveredRequiredDomains / totalRequiredDomains) * 100)
  const marketReady =
    readiness.ready &&
    blockers.length === 0 &&
    totalRequiredDomains > 0 &&
    coveredRequiredDomains === totalRequiredDomains
  const capabilityStatus: EvidenceCoverageStatus =
    blockers.length > 0
      ? 'blocked'
      : marketReady
        ? 'covered'
        : 'needs-review'

  return {
    version: 1,
    capability: 'AETHEL_EVIDENCE_REF_COVERAGE',
    capabilityStatus,
    marketReady,
    coveragePercent,
    coveredRequiredDomains,
    totalRequiredDomains,
    evidenceRefs,
    domains,
    blockers,
    nextAction: nextActionForReport(domains, marketReady),
  }
}

function buildDomainCoverage(
  rule: EvidenceRule,
  input: EvidenceCoverageInput,
  evidenceRefs: string[]
): EvidenceCoverageDomain {
  const required = rule.required(input)
  const matchingRefs = evidenceRefs.filter((ref) => rule.patterns.some((pattern) => pattern.test(ref)))
  const hasPersistedSettings = settingsEvidenceMatches(rule.id, input.settings)
  const covered = matchingRefs.length > 0 || hasPersistedSettings
  const blockedByGraph = Object.values(input.state.graphs)
    .flat()
    .some((node) => node.status === 'blocked' && rule.patterns.some((pattern) => pattern.test(`${node.id} ${node.label} ${node.blockers.join(' ')}`)))

  return {
    id: rule.id,
    label: rule.label,
    required,
    status: covered ? 'covered' : blockedByGraph ? 'blocked' : required ? 'missing' : 'needs-review',
    evidenceRefs: matchingRefs,
    missingEvidence: covered ? [] : rule.missingEvidence,
    nextAction: covered ? 'Evidence present; keep it attached to the release/review path.' : rule.nextAction,
  }
}

function collectEvidenceRefs(state: AgenticProductionState): string[] {
  return unique([
    ...state.ledger.flatMap((entry) => entry.evidenceRefs),
    ...Object.values(state.graphs).flatMap((nodes) => nodes.flatMap((node) => node.evidenceRefs)),
  ]).slice(0, 250)
}

function hasSettingsKey(settings: unknown, key: string): boolean {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return false
  return key in settings
}

function settingsEvidenceMatches(domain: EvidenceCoverageDomainId, settings: unknown): boolean {
  if (domain === 'research-intelligence') return hasSettingsKey(settings, SETTINGS_KEYS.researchIntelligence)
  if (domain === 'browser-navigation') return hasSettingsKey(settings, SETTINGS_KEYS.researchNavigation)
  if (domain === 'agent-run-ledger') return hasSettingsKey(settings, SETTINGS_KEYS.agentRunLedger)
  if (domain === 'project-memory') return hasSettingsKey(settings, SETTINGS_KEYS.agentReadReceipts)
  return false
}

function nextActionForReport(domains: EvidenceCoverageDomain[], marketReady: boolean): string {
  if (marketReady) return 'Evidence coverage is complete; request final human release review.'
  const missingRequired = domains.find((domain) => domain.required && domain.status !== 'covered')
  return missingRequired?.nextAction ?? 'Evidence coverage is complete; request final human release review.'
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)))
}
