import type { AgentType } from '../agent-orchestrator'
import { SUPPORTED_AGENT_TYPES } from '../agent-orchestrator'

export type WorkforceMissionType =
  | 'game-production'
  | 'app-platform'
  | 'research-development'
  | 'browser-operations'
  | 'financial-investment'
  | 'film-audio-production'
  | 'marketplace-commerce'
  | 'enterprise-release'
  | 'unknown'

export type WorkforceRiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type WorkforceExecutionMode = 'coordinator-first' | 'wide-research' | 'squad-build' | 'review-only' | 'human-held'
export type WorkforceRuntimeLane = 'ui-safe' | 'local-worker' | 'local-sidecar' | 'cloud-sandbox' | 'browser-operator' | 'human-review'

export interface WorkforceSquad {
  id: string
  label: string
  missionTypes: WorkforceMissionType[]
  coordinator: AgentType
  agents: AgentType[]
  runtimeLanes: WorkforceRuntimeLane[]
  defaultParallelWorkers: number
  maxParallelWorkers: number
  evidenceRequired: string[]
  costControls: string[]
  hardLimits: string[]
}

export interface WorkforceTier {
  level: 0 | 1 | 2 | 3
  label: string
  purpose: string
  agents: AgentType[]
}

export interface AgentWorkforceTopology {
  version: 1
  generatedFor: 'aethel-internal-spine'
  tiers: WorkforceTier[]
  squads: WorkforceSquad[]
  globalPolicies: string[]
  highRiskActions: string[]
  contextPolicy: string[]
  costPolicy: string[]
}

export interface WorkforcePlanningInput {
  mission: string
  missionType?: WorkforceMissionType
  riskLevel?: WorkforceRiskLevel
  itemCount?: number
  planConcurrencyLimit?: number
  maxCostUsd?: number | null
  requiresBrowser?: boolean
  requiresWrites?: boolean
  requiresRelease?: boolean
  requiresExternalAccounts?: boolean
  requiresHeavyRuntime?: boolean
}

export interface WorkforcePlan {
  version: 1
  missionType: WorkforceMissionType
  executionMode: WorkforceExecutionMode
  riskLevel: WorkforceRiskLevel
  centralCoordinator: AgentType
  selectedSquads: string[]
  selectedAgents: AgentType[]
  recommendedParallelWorkers: number
  maxParallelWorkers: number
  runtimeLanes: WorkforceRuntimeLane[]
  requiredEvidence: string[]
  requiredApprovals: string[]
  blockers: string[]
  warnings: string[]
  nextAction: string
}

export interface WorkforceReadinessReport {
  ready: boolean
  roleCoverage: {
    totalSupportedRoles: number
    coveredRoles: number
    missingRoles: AgentType[]
  }
  blockers: string[]
  warnings: string[]
}

const HUMAN_APPROVAL_ACTIONS = [
  'investment or trading submit',
  'financial transfer or purchase submit',
  'credential entry, account change, or admin panel submit',
  'production deployment, rollback, DNS, or destructive data change',
  'public publish, marketplace listing, legal, medical, or compliance filing',
]

const globalPolicies = [
  'Coordinator-first: a senior coordinator decomposes work before specialists run in parallel.',
  'No blind autonomy: every write requires read receipts, scoped ownership, Mission Ledger evidence, and rollback notes.',
  'No raw context dumps: huge repositories/assets use cartography, summaries, hashes, thumbnails, metadata, and retrieval budgets.',
  'Tool Bus only: agents may use external tools only through registered tools with risk, timeout, evidence, cost, replay, and rollback policy.',
  'High-risk actions remain human-held until explicit approval names the action, target, cost/limit, account, and rollback or recovery path.',
  'Heavy work never runs on the browser main thread; render, indexing, asset optimization, shader compile, and browser automation use workers, sidecar, or cloud sandbox.',
]

const contextPolicy = [
  'Repository Cartography runs before broad edits, game/film production, external repo mirrors, or GB-scale project reads.',
  'Project Memory selects shards by priority and token budget; direct context is reserved for small/high-signal surfaces.',
  'Research Memory Bridge stores source URLs, timestamps, claims, risks, and implementation impact before builders act on research.',
  'Browser Operator records replay, DOM snapshot, screenshot, target URL, prompt-injection review, and approval point.',
]

const costPolicy = [
  'Default to 3-8 parallel workers; wide research can expand only when item count and user budget justify it.',
  'Every wave has a max worker count, token/runtime budget, and map-reduce summarizer before the next wave.',
  'Prefer metadata-first mirrors for Hugging Face, GitHub, papers, datasets, and asset stores before downloading large payloads.',
  'Weak device mode routes heavy jobs to cloud-sandbox or held instead of blocking the local UI.',
]

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(value)))
}

function includesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text))
}

function inferMissionType(input: WorkforcePlanningInput): WorkforceMissionType {
  if (input.missionType && input.missionType !== 'unknown') return input.missionType
  const text = input.mission.toLowerCase()

  if (includesAny(text, [/invest/i, /stock/i, /crypto/i, /trade/i, /brokerage/i, /portfolio/i])) return 'financial-investment'
  if (includesAny(text, [/browser/i, /navigate/i, /login/i, /checkout/i, /website/i, /chrome/i])) return 'browser-operations'
  if (includesAny(text, [/game/i, /boss/i, /combat/i, /open[- ]?world/i, /quest/i, /playtest/i])) return 'game-production'
  if (includesAny(text, [/film/i, /cinematic/i, /shot/i, /timeline/i, /audio/i, /music/i, /voice/i])) return 'film-audio-production'
  if (includesAny(text, [/research/i, /paper/i, /dataset/i, /benchmark/i, /competitor/i, /manus/i, /genspark/i])) return 'research-development'
  if (includesAny(text, [/marketplace/i, /creator/i, /payout/i, /listing/i, /commerce/i])) return 'marketplace-commerce'
  if (includesAny(text, [/enterprise/i, /saml/i, /scim/i, /release/i, /deploy/i, /compliance/i])) return 'enterprise-release'
  if (includesAny(text, [/app/i, /platform/i, /api/i, /dashboard/i, /saas/i, /tool/i])) return 'app-platform'

  return 'unknown'
}

function inferRisk(input: WorkforcePlanningInput, missionType: WorkforceMissionType): WorkforceRiskLevel {
  if (input.riskLevel) return input.riskLevel
  if (missionType === 'financial-investment') return 'critical'
  if (input.requiresExternalAccounts || input.requiresRelease) return 'high'
  if (input.requiresWrites || input.requiresBrowser || input.requiresHeavyRuntime) return 'medium'
  return 'low'
}

function buildSquads(): WorkforceSquad[] {
  return [
    {
      id: 'command-core',
      label: 'Command Core',
      missionTypes: ['unknown', 'game-production', 'app-platform', 'research-development', 'browser-operations', 'financial-investment', 'film-audio-production', 'marketplace-commerce', 'enterprise-release'],
      coordinator: 'architect',
      agents: ['architect', 'cost-governor', 'documentation-writer', 'summarizer'],
      runtimeLanes: ['ui-safe', 'local-worker'],
      defaultParallelWorkers: 3,
      maxParallelWorkers: 5,
      evidenceRequired: ['mission decomposition', 'cost budget', 'next-action ledger'],
      costControls: ['start with coordinator-only plan', 'expand by wave after map-reduce summary'],
      hardLimits: ['cannot bypass scope locks', 'cannot approve its own high-risk action'],
    },
    {
      id: 'research-intelligence',
      label: 'Research Intelligence Squad',
      missionTypes: ['research-development', 'game-production', 'app-platform', 'film-audio-production', 'marketplace-commerce', 'enterprise-release'],
      coordinator: 'researcher',
      agents: ['researcher', 'fact-checker', 'paper-reader', 'dataset-scout', 'huggingface-curator', 'github-cartographer', 'competitor-tracker', 'summarizer', 'translator'],
      runtimeLanes: ['local-worker', 'cloud-sandbox'],
      defaultParallelWorkers: 6,
      maxParallelWorkers: 20,
      evidenceRequired: ['source citations', 'read receipts', 'claim/risk table', 'implementation impact summary'],
      costControls: ['metadata-first external mirrors', 'dedupe sources before reading full text', 'summarizer reduces each wave'],
      hardLimits: ['cannot make uncited benchmark claims', 'cannot download GB-scale datasets without budget approval'],
    },
    {
      id: 'software-platform',
      label: 'Software Platform Squad',
      missionTypes: ['app-platform', 'enterprise-release', 'marketplace-commerce'],
      coordinator: 'engineer',
      agents: ['engineer', 'security-auditor', 'performance-engineer', 'qa', 'github-cartographer', 'release-manager', 'devops-operator', 'ux-researcher'],
      runtimeLanes: ['local-worker', 'local-sidecar', 'cloud-sandbox'],
      defaultParallelWorkers: 4,
      maxParallelWorkers: 10,
      evidenceRequired: ['repository cartography', 'diff proposal', 'tests or blocker', 'rollback plan'],
      costControls: ['parallelize only non-overlapping surfaces', 'prefer targeted tests before full build loops'],
      hardLimits: ['no apply without read receipt and scope lock', 'production deploy requires Release squad approval'],
    },
    {
      id: 'game-production',
      label: 'Game Production Squad',
      missionTypes: ['game-production'],
      coordinator: 'game-designer',
      agents: ['game-designer', 'gameplay-engineer', 'asset-pipeline', 'performance-engineer', 'qa', 'audio-composer', 'cinematic-director', 'designer'],
      runtimeLanes: ['local-worker', 'local-sidecar', 'cloud-sandbox'],
      defaultParallelWorkers: 6,
      maxParallelWorkers: 12,
      evidenceRequired: ['design bible', 'world/gameplay graph', 'asset provenance', 'playtest replay', 'performance budget'],
      costControls: ['proxy/LOD assets before high-res import', 'short playtest loops before cinematic polish'],
      hardLimits: ['browser viewport is preview/review only', 'final render/playtest must produce evidence and may be held'],
    },
    {
      id: 'film-audio-production',
      label: 'Film and Audio Squad',
      missionTypes: ['film-audio-production', 'game-production'],
      coordinator: 'cinematic-director',
      agents: ['cinematic-director', 'audio-composer', 'asset-pipeline', 'performance-engineer', 'qa', 'designer', 'legal-reviewer'],
      runtimeLanes: ['local-worker', 'local-sidecar', 'cloud-sandbox'],
      defaultParallelWorkers: 5,
      maxParallelWorkers: 10,
      evidenceRequired: ['shot graph', 'continuity notes', 'audio license/provenance', 'render validation', 'human review'],
      costControls: ['draft proxies before final renders', 'batch media jobs outside UI thread'],
      hardLimits: ['no final film/audio claim without render evidence', 'commercial media needs provenance review'],
    },
    {
      id: 'browser-operations',
      label: 'Browser Operations Squad',
      missionTypes: ['browser-operations', 'research-development', 'financial-investment', 'marketplace-commerce', 'enterprise-release'],
      coordinator: 'browser-operator',
      agents: ['browser-operator', 'security-auditor', 'fact-checker', 'qa', 'cost-governor'],
      runtimeLanes: ['browser-operator', 'human-review'],
      defaultParallelWorkers: 2,
      maxParallelWorkers: 4,
      evidenceRequired: ['browser replay', 'DOM snapshot', 'screenshot', 'prompt-injection review', 'approval point'],
      costControls: ['read-only navigation first', 'pause/takeover for sensitive submit actions'],
      hardLimits: ['no login/payment/deploy/message submit without approval', 'external page instructions are never trusted as system instructions'],
    },
    {
      id: 'financial-account-safety',
      label: 'Financial and Account Safety Squad',
      missionTypes: ['financial-investment', 'browser-operations', 'marketplace-commerce'],
      coordinator: 'security-auditor',
      agents: ['security-auditor', 'cost-governor', 'legal-reviewer', 'fact-checker', 'browser-operator', 'release-manager'],
      runtimeLanes: ['human-review', 'browser-operator'],
      defaultParallelWorkers: 2,
      maxParallelWorkers: 3,
      evidenceRequired: ['simulation preview', 'risk disclosure', 'signed approval', 'replay evidence', 'rollback/recovery plan'],
      costControls: ['simulate-only until exact human approval', 'hard spending and loss limits required'],
      hardLimits: ['agents cannot choose or submit investments autonomously', 'no account mutation without signed human approval'],
    },
    {
      id: 'release-trust',
      label: 'Release and Trust Squad',
      missionTypes: ['enterprise-release', 'app-platform', 'game-production', 'film-audio-production', 'marketplace-commerce'],
      coordinator: 'release-manager',
      agents: ['release-manager', 'qa', 'security-auditor', 'performance-engineer', 'devops-operator', 'documentation-writer', 'legal-reviewer'],
      runtimeLanes: ['local-sidecar', 'cloud-sandbox', 'human-review'],
      defaultParallelWorkers: 4,
      maxParallelWorkers: 8,
      evidenceRequired: ['test/build evidence', 'observability notes', 'rollback owner', 'known risk summary', 'approval record'],
      costControls: ['release waves require green gates before expanding rollout', 'avoid repeated full builds without changed-surface reason'],
      hardLimits: ['production release is human-held', 'critical compliance claims need human review'],
    },
  ]
}

export function buildAgentWorkforceTopology(): AgentWorkforceTopology {
  return {
    version: 1,
    generatedFor: 'aethel-internal-spine',
    tiers: [
      {
        level: 0,
        label: 'Senior Coordinator',
        purpose: 'Interpret the user intent, pick squads, budget work, arbitrate scope conflicts, and pause high-risk actions.',
        agents: ['architect', 'cost-governor', 'summarizer'],
      },
      {
        level: 1,
        label: 'Domain Leads',
        purpose: 'Own product domains: research, code, games, film/audio, browser operations, release, and safety.',
        agents: ['researcher', 'engineer', 'game-designer', 'cinematic-director', 'browser-operator', 'release-manager', 'security-auditor'],
      },
      {
        level: 2,
        label: 'Specialist Workers',
        purpose: 'Execute bounded lanes with tools, receipts, scope locks, validation, and rollback plans.',
        agents: [
          'designer',
          'qa',
          'fact-checker',
          'paper-reader',
          'dataset-scout',
          'huggingface-curator',
          'github-cartographer',
          'performance-engineer',
          'devops-operator',
          'gameplay-engineer',
          'audio-composer',
          'asset-pipeline',
          'ux-researcher',
          'translator',
          'documentation-writer',
          'legal-reviewer',
        ],
      },
      {
        level: 3,
        label: 'Ephemeral Work Packets',
        purpose: 'Map-reduce subagents for source batches, files, assets, playtest runs, benchmarks, and browser evidence without keeping expensive contexts alive.',
        agents: ['summarizer', 'fact-checker', 'github-cartographer', 'dataset-scout', 'qa', 'performance-engineer'],
      },
    ],
    squads: buildSquads(),
    globalPolicies,
    highRiskActions: HUMAN_APPROVAL_ACTIONS,
    contextPolicy,
    costPolicy,
  }
}

function squadsForMission(topology: AgentWorkforceTopology, missionType: WorkforceMissionType, input: WorkforcePlanningInput): WorkforceSquad[] {
  const squads = topology.squads.filter((squad) => squad.missionTypes.includes(missionType))
  const selected = new Map(squads.map((squad) => [squad.id, squad]))
  selected.set('command-core', topology.squads.find((squad) => squad.id === 'command-core')!)

  if (input.requiresBrowser || missionType === 'browser-operations' || missionType === 'financial-investment') {
    selected.set('browser-operations', topology.squads.find((squad) => squad.id === 'browser-operations')!)
  }
  if (missionType === 'financial-investment' || input.requiresExternalAccounts) {
    selected.set('financial-account-safety', topology.squads.find((squad) => squad.id === 'financial-account-safety')!)
  }
  if (input.requiresRelease || ['enterprise-release', 'marketplace-commerce', 'game-production', 'film-audio-production'].includes(missionType)) {
    selected.set('release-trust', topology.squads.find((squad) => squad.id === 'release-trust')!)
  }
  if (input.requiresHeavyRuntime && missionType !== 'game-production' && missionType !== 'film-audio-production') {
    selected.set('software-platform', topology.squads.find((squad) => squad.id === 'software-platform')!)
  }

  return Array.from(selected.values())
}

function executionModeFor(missionType: WorkforceMissionType, riskLevel: WorkforceRiskLevel, input: WorkforcePlanningInput): WorkforceExecutionMode {
  if (riskLevel === 'critical' || missionType === 'financial-investment') return 'human-held'
  if (!input.requiresWrites && !input.requiresRelease && missionType === 'research-development') return 'wide-research'
  if (input.requiresRelease) return 'review-only'
  if (['game-production', 'app-platform', 'film-audio-production', 'marketplace-commerce'].includes(missionType)) return 'squad-build'
  return 'coordinator-first'
}

function parallelWorkerCount(input: WorkforcePlanningInput, squads: WorkforceSquad[], mode: WorkforceExecutionMode): number {
  const itemCount = Math.max(1, input.itemCount ?? 1)
  const planLimit = input.planConcurrencyLimit && input.planConcurrencyLimit > 0 ? input.planConcurrencyLimit : 8
  const budgetLimit = typeof input.maxCostUsd === 'number'
    ? input.maxCostUsd <= 0.5
      ? 3
      : input.maxCostUsd <= 3
        ? 6
        : input.maxCostUsd <= 10
          ? 12
          : 20
    : 8
  const squadDefault = Math.max(...squads.map((squad) => squad.defaultParallelWorkers), 1)
  const squadMax = Math.max(...squads.map((squad) => squad.maxParallelWorkers), 1)

  if (mode === 'human-held') return Math.min(2, planLimit, budgetLimit, squadMax)
  if (mode === 'wide-research') return clamp(Math.ceil(Math.sqrt(itemCount)) + 2, 4, Math.min(20, planLimit, budgetLimit, squadMax))
  if (mode === 'squad-build') return clamp(squadDefault + (itemCount > 20 ? 2 : 0), 3, Math.min(planLimit, budgetLimit, squadMax))
  return clamp(Math.min(squadDefault, 5), 1, Math.min(planLimit, budgetLimit, squadMax))
}

function approvalRequirements(missionType: WorkforceMissionType, riskLevel: WorkforceRiskLevel, input: WorkforcePlanningInput): string[] {
  const approvals: string[] = []
  if (riskLevel === 'critical' || missionType === 'financial-investment') {
    approvals.push('signed human approval before investment, transfer, purchase, credential, account, or submit actions')
  }
  if (input.requiresBrowser) approvals.push('browser pause/takeover approval for login, payment, admin, message, deploy, or destructive submit')
  if (input.requiresRelease) approvals.push('release approval with build/test evidence, rollback owner, and deployment target')
  if (input.requiresExternalAccounts) approvals.push('external account approval with target account, scope, and recovery path')
  if (input.requiresHeavyRuntime) approvals.push('runtime budget approval for sidecar/cloud compute, asset processing, render, or indexing jobs')
  return unique(approvals)
}

function blockersFor(missionType: WorkforceMissionType, riskLevel: WorkforceRiskLevel, input: WorkforcePlanningInput): string[] {
  const blockers: string[] = []
  if (riskLevel === 'critical' || missionType === 'financial-investment') {
    blockers.push('Mission is human-held: agents may research, simulate, and prepare evidence, but cannot submit financial or account actions autonomously.')
  }
  if (input.requiresWrites) blockers.push('Require Repository Cartography, read receipts, and non-overlapping scope locks before writes.')
  if (input.requiresHeavyRuntime) blockers.push('Require Runtime Budget Gate: heavy render/asset/indexing/shader/browser jobs cannot run on the UI main thread.')
  return unique(blockers)
}

function warningsFor(input: WorkforcePlanningInput, workerCount: number): string[] {
  const warnings: string[] = []
  if ((input.itemCount ?? 0) > 100 && workerCount < 12) {
    warnings.push('Large research set detected; keep the first wave metadata-first, then expand only after summarizer reduces duplicate sources.')
  }
  if (typeof input.maxCostUsd === 'number' && input.maxCostUsd <= 1) {
    warnings.push('Low cost budget detected; prefer coordinator plan plus small evidence samples before wide execution.')
  }
  return warnings
}

export function planAgentWorkforceForMission(input: WorkforcePlanningInput): WorkforcePlan {
  const topology = buildAgentWorkforceTopology()
  const missionType = inferMissionType(input)
  const riskLevel = inferRisk(input, missionType)
  const selectedSquads = squadsForMission(topology, missionType, input)
  const executionMode = executionModeFor(missionType, riskLevel, input)
  const recommendedParallelWorkers = parallelWorkerCount(input, selectedSquads, executionMode)
  const maxParallelWorkers = Math.min(
    input.planConcurrencyLimit && input.planConcurrencyLimit > 0 ? input.planConcurrencyLimit : 20,
    Math.max(...selectedSquads.map((squad) => squad.maxParallelWorkers))
  )
  const selectedAgents = unique(selectedSquads.flatMap((squad) => [squad.coordinator, ...squad.agents]))
  const runtimeLanes = unique(selectedSquads.flatMap((squad) => squad.runtimeLanes))
  const requiredApprovals = approvalRequirements(missionType, riskLevel, input)
  const blockers = blockersFor(missionType, riskLevel, input)

  const centralCoordinator: AgentType =
    missionType === 'game-production'
      ? 'game-designer'
      : missionType === 'film-audio-production'
        ? 'cinematic-director'
        : missionType === 'financial-investment'
          ? 'security-auditor'
          : missionType === 'research-development'
            ? 'researcher'
            : 'architect'

  return {
    version: 1,
    missionType,
    executionMode,
    riskLevel,
    centralCoordinator,
    selectedSquads: selectedSquads.map((squad) => squad.id),
    selectedAgents,
    recommendedParallelWorkers,
    maxParallelWorkers,
    runtimeLanes,
    requiredEvidence: unique(selectedSquads.flatMap((squad) => squad.evidenceRequired)),
    requiredApprovals,
    blockers,
    warnings: warningsFor(input, recommendedParallelWorkers),
    nextAction:
      blockers.length > 0
        ? 'Collect required approvals/evidence, then run a small coordinator-reviewed wave.'
        : 'Run coordinator-first decomposition, then launch non-overlapping specialist work packets with ledger evidence.',
  }
}

export function evaluateAgentWorkforceTopologyReadiness(
  topology: AgentWorkforceTopology = buildAgentWorkforceTopology()
): WorkforceReadinessReport {
  const covered = new Set<AgentType>()
  const blockers: string[] = []
  const warnings: string[] = []

  for (const tier of topology.tiers) {
    for (const agent of tier.agents) covered.add(agent)
  }
  for (const squad of topology.squads) {
    covered.add(squad.coordinator)
    for (const agent of squad.agents) covered.add(agent)

    if (squad.evidenceRequired.length === 0) blockers.push(`${squad.id} has no evidence requirements.`)
    if (squad.costControls.length === 0) blockers.push(`${squad.id} has no cost controls.`)
    if (squad.hardLimits.length === 0) blockers.push(`${squad.id} has no hard limits.`)
    if (squad.maxParallelWorkers < squad.defaultParallelWorkers) blockers.push(`${squad.id} max parallel workers is below its default.`)
  }

  const missingRoles = SUPPORTED_AGENT_TYPES.filter((agent) => !covered.has(agent))
  if (missingRoles.length > 0) blockers.push(`Missing role coverage: ${missingRoles.join(', ')}.`)

  const policyText = [...topology.globalPolicies, ...topology.contextPolicy, ...topology.costPolicy].join(' ').toLowerCase()
  for (const required of ['scope', 'read receipts', 'tool bus', 'human', 'main thread', 'metadata']) {
    if (!policyText.includes(required)) blockers.push(`Topology policy is missing ${required}.`)
  }
  for (const action of HUMAN_APPROVAL_ACTIONS) {
    if (!topology.highRiskActions.includes(action)) warnings.push(`High-risk action is not explicitly listed: ${action}.`)
  }

  return {
    ready: blockers.length === 0,
    roleCoverage: {
      totalSupportedRoles: SUPPORTED_AGENT_TYPES.length,
      coveredRoles: covered.size,
      missingRoles,
    },
    blockers,
    warnings,
  }
}
