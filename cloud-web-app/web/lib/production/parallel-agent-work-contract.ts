import type { AgenticProductionState } from './agentic-production-state'
import type {
  RepositoryCartographyManifest,
  RepositoryCriticalGap,
  RepositorySurface,
} from './repository-cartography'

export type AgentWorkLane =
  | 'orchestration'
  | 'research'
  | 'software'
  | 'gameplay'
  | 'creative'
  | 'asset'
  | 'validation'
  | 'release'
  | 'browser-operator'
  | 'performance'

export type AgentWorkTool =
  | 'project-brain'
  | 'mission-ledger'
  | 'repository-cartography'
  | 'context-budget'
  | 'code-search'
  | 'file-read'
  | 'diff-proposal'
  | 'test-runner'
  | 'deep-research'
  | 'source-citation'
  | 'browser-operator'
  | 'browser-replay'
  | 'github-mirror'
  | 'huggingface-mirror'
  | 'asset-metadata'
  | 'license-check'
  | 'viewport-capture'
  | 'playtest-runner'
  | 'render-queue'
  | 'renderer-probe'
  | 'asset-optimize'
  | 'shader-compile'
  | 'render-submit'
  | 'render-validate'
  | 'deployment'
  | 'runtime-router'
  | 'cost-meter'
  | 'human-approval'

export type AgentScopeMode = 'read-only' | 'diff-only' | 'exclusive-apply-held'

export interface AgentScopeLock {
  mode: AgentScopeMode
  surfaces: string[]
  rule: string
}

export interface ParallelAgentWorkContract {
  version: 1
  agent: string
  lane: AgentWorkLane
  allowedTools: AgentWorkTool[]
  blockedUntil: string[]
  scopeLock: AgentScopeLock
  parallelRules: string[]
  approvalRequiredFor: string[]
  researchPolicy: string[]
  browserOperatorPolicy: string[]
  evidenceRequired: string[]
  canRunInParallelWith: string[]
}

export interface BuildParallelAgentWorkContractInput {
  agent: string
  state: AgenticProductionState
  manifest?: RepositoryCartographyManifest | null
  ownedSurfaces: Pick<RepositorySurface, 'path' | 'domain' | 'strategy' | 'priority' | 'sourceKind'>[]
  criticalGaps: Pick<RepositoryCriticalGap, 'severity' | 'title' | 'recommendation'>[]
}

const allSpecializedAgents = [
  'Producer Agent',
  'Research Agent',
  'Software Engineer Agent',
  'Asset Librarian Agent',
  'Technical Artist Agent',
  'Gameplay Engineer Agent',
  'Cinematic Editor Agent',
  'Story Agent',
  'QA Agent',
  'Performance Agent',
  'Release Agent',
  'Browser Operator Agent',
]

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}

function laneForAgent(agent: string): AgentWorkLane {
  switch (agent) {
    case 'Producer Agent':
      return 'orchestration'
    case 'Research Agent':
      return 'research'
    case 'Browser Operator Agent':
      return 'browser-operator'
    case 'Software Engineer Agent':
      return 'software'
    case 'Gameplay Engineer Agent':
      return 'gameplay'
    case 'Cinematic Editor Agent':
    case 'Story Agent':
    case 'Technical Artist Agent':
      return 'creative'
    case 'Asset Librarian Agent':
      return 'asset'
    case 'QA Agent':
      return 'validation'
    case 'Performance Agent':
      return 'performance'
    case 'Release Agent':
      return 'release'
    default:
      return 'orchestration'
  }
}

function baseToolsForLane(lane: AgentWorkLane): AgentWorkTool[] {
  const base: AgentWorkTool[] = [
    'project-brain',
    'mission-ledger',
    'repository-cartography',
    'context-budget',
    'code-search',
    'file-read',
    'cost-meter',
    'human-approval',
  ]

  switch (lane) {
    case 'research':
      return [...base, 'deep-research', 'source-citation', 'github-mirror', 'huggingface-mirror']
    case 'browser-operator':
      return [...base, 'browser-operator', 'browser-replay', 'source-citation']
    case 'software':
      return [...base, 'diff-proposal', 'test-runner']
    case 'gameplay':
      return [...base, 'diff-proposal', 'test-runner', 'playtest-runner', 'viewport-capture', 'renderer-probe', 'render-submit']
    case 'creative':
      return [...base, 'diff-proposal', 'viewport-capture', 'render-queue', 'renderer-probe', 'asset-optimize', 'shader-compile', 'render-submit', 'asset-metadata']
    case 'asset':
      return [...base, 'asset-metadata', 'asset-optimize', 'license-check', 'github-mirror', 'huggingface-mirror']
    case 'validation':
      return [...base, 'test-runner', 'playtest-runner', 'viewport-capture', 'render-validate', 'source-citation']
    case 'performance':
      return [...base, 'runtime-router', 'renderer-probe', 'shader-compile', 'test-runner', 'viewport-capture']
    case 'release':
      return [...base, 'deployment', 'render-submit', 'render-validate', 'test-runner', 'browser-replay']
    case 'orchestration':
    default:
      return [...base, 'deep-research', 'source-citation']
  }
}

function buildBlockedUntil(input: BuildParallelAgentWorkContractInput): string[] {
  const blockers: string[] = []
  if (!input.manifest) {
    blockers.push('Run Repository Cartography before broad edits or asset imports.')
  }

  for (const gap of input.criticalGaps) {
    if (gap.severity === 'blocker') {
      blockers.push(`Resolve blocker: ${gap.title}.`)
    }
  }

  if (input.state.runtimePolicy.requiresHumanApproval) {
    blockers.push('Collect human approval before applying high-impact changes.')
  }

  return unique(blockers)
}

function buildScopeLock(input: BuildParallelAgentWorkContractInput): AgentScopeLock {
  const surfaces = input.ownedSurfaces.map((surface) => surface.path).slice(0, 40)
  if (!input.manifest) {
    return {
      mode: 'read-only',
      surfaces: [],
      rule: 'No manifest is available. Agent may classify, ask questions, and request scans, but must not edit.',
    }
  }

  if (surfaces.length === 0) {
    return {
      mode: 'read-only',
      surfaces: [],
      rule: 'No owned surfaces are assigned. Agent must stay in planning/classification mode.',
    }
  }

  return {
    mode: 'diff-only',
    surfaces,
    rule:
      'Agent may propose diffs only inside owned surfaces. Applying, deleting, moving, or expanding scope requires review and Mission Ledger evidence.',
  }
}

function buildParallelRules(input: BuildParallelAgentWorkContractInput, lane: AgentWorkLane): string[] {
  const rules = [
    'Run agents in parallel only when their owned surfaces do not overlap.',
    'If two agents touch the same file, asset, scene, shot, or config, pause one and require Producer arbitration.',
    'Every agent must write evidence and rollback notes to the Mission Ledger before claiming completion.',
    'Research and Browser Operator agents may inform implementation, but may not silently apply code or account changes.',
    'Use summaries, indexes, hashes, thumbnails, and manifests for huge repos/assets instead of raw context dumps.',
    'Follow the Repository Context Budget batches before requesting extra files, downloads, or generated previews.',
  ]

  if (lane === 'browser-operator') {
    rules.push('Browser Operator work must include approval, replay evidence, pause/stop control, and no secret exfiltration.')
  }

  if (lane === 'gameplay' || lane === 'creative') {
    rules.push('Game/film agents must preserve story, feel, continuity, performance budget, and viewport evidence.')
  }

  if (input.ownedSurfaces.some((surface) => surface.strategy === 'external-mirror')) {
    rules.push('External mirror surfaces require metadata pagination before downloading or indexing large payloads.')
  }

  return unique(rules)
}

function buildApprovalRequiredFor(lane: AgentWorkLane): string[] {
  const common = [
    'file writes, deletes, moves, dependency changes, or scope expansion',
    'using secrets, credentials, billing, domains, cloud consoles, or external accounts',
    'deployments, rollback, production data changes, or paid API spend',
    'GB-scale downloads, asset imports, render jobs, or local/native execution',
  ]

  if (lane === 'browser-operator') {
    return unique([...common, 'login flows, checkout flows, admin panels, and irreversible website actions'])
  }

  if (lane === 'asset' || lane === 'creative' || lane === 'gameplay') {
    return unique([...common, 'commercial asset use without license/provenance evidence'])
  }

  return common
}

function buildResearchPolicy(lane: AgentWorkLane): string[] {
  const policy = [
    'Prefer official docs, source repositories, standards, product changelogs, and user-provided artifacts.',
    'Record URLs, timestamps, short summaries, and uncertainty in evidence; do not paste long copyrighted text.',
    'Separate benchmark inspiration from technical parity claims.',
  ]

  if (lane === 'research' || lane === 'browser-operator') {
    policy.push('Use deep research in parallel with implementation only as an evidence stream, not as an autonomous apply lane.')
    policy.push('For Hugging Face/GitHub-scale repositories, fetch metadata, file lists, cards, and chunk summaries before content.')
  }

  return policy
}

function buildBrowserOperatorPolicy(lane: AgentWorkLane): string[] {
  const policy = [
    'Browser Operator is permissioned: no login, purchase, domain, cloud, or settings change without explicit approval.',
    'Every web action must produce replayable evidence: target URL, intent, result, risk, and next approval point.',
    'Keep browser work in a separate runtime lane so the main Studio UI does not freeze.',
  ]

  if (lane !== 'browser-operator') {
    policy.push('Non-browser agents must request Browser Operator assistance instead of pretending they navigated the web.')
  }

  return policy
}

function buildEvidenceRequired(input: BuildParallelAgentWorkContractInput, lane: AgentWorkLane): string[] {
  const evidence = [
    'Mission Ledger entry with plan, diff/evidence, validation, cost, rollback, and next action.',
    'Repository Cartography references for every edited or newly-created surface.',
  ]

  if (lane === 'software') evidence.push('Typecheck/lint/test output or a stated blocker.')
  if (lane === 'gameplay') evidence.push('Playtest criteria, viewport/screenshot evidence, and feel/performance notes.')
  if (lane === 'creative') evidence.push('Shot/scene/viewport preview, continuity note, and render/review status.')
  if (lane === 'asset') evidence.push('Asset provenance, license, size, LOD/material metadata, and duplicate decision.')
  if (lane === 'browser-operator') evidence.push('Browser replay, approval result, target URL, and risk summary.')
  if (lane === 'research') evidence.push('Cited source list with credibility and implementation impact.')
  if (lane === 'performance') evidence.push('Runtime placement, memory/FPS/build budget, and worker/cloud fallback proof.')
  if (lane === 'release') evidence.push('Build/deploy log, preview URL, rollback plan, and incident risk.')

  if (input.criticalGaps.length > 0) {
    evidence.push('Explicit disposition for critical gaps: resolved, accepted risk, or blocked.')
  }

  return unique(evidence)
}

function buildParallelPeers(agent: string, lane: AgentWorkLane): string[] {
  if (lane === 'orchestration') return allSpecializedAgents.filter((candidate) => candidate !== agent)
  if (lane === 'browser-operator') return ['Producer Agent', 'Research Agent', 'QA Agent']
  if (lane === 'release') return ['Producer Agent', 'QA Agent', 'Performance Agent']
  if (lane === 'validation') return ['Producer Agent', 'Software Engineer Agent', 'Gameplay Engineer Agent', 'Cinematic Editor Agent']
  return ['Producer Agent', 'Research Agent', 'QA Agent', 'Performance Agent'].filter((candidate) => candidate !== agent)
}

export function buildParallelAgentWorkContract(
  input: BuildParallelAgentWorkContractInput
): ParallelAgentWorkContract {
  const lane = laneForAgent(input.agent)

  return {
    version: 1,
    agent: input.agent,
    lane,
    allowedTools: unique(baseToolsForLane(lane)),
    blockedUntil: buildBlockedUntil(input),
    scopeLock: buildScopeLock(input),
    parallelRules: buildParallelRules(input, lane),
    approvalRequiredFor: buildApprovalRequiredFor(lane),
    researchPolicy: buildResearchPolicy(lane),
    browserOperatorPolicy: buildBrowserOperatorPolicy(lane),
    evidenceRequired: buildEvidenceRequired(input, lane),
    canRunInParallelWith: buildParallelPeers(input.agent, lane),
  }
}
