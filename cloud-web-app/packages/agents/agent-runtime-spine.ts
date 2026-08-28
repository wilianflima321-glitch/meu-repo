import { SUPPORTED_AGENT_TYPES, type AgentType } from './runtime/agent-roles'
import type { ContextMemorySpinePlan } from '../../web/lib/production/context-memory-spine'

export type AgentRuntimeState =
  | 'available'
  | 'held'
  | 'blocked'
  | 'needs-review'
  | 'provider_unavailable'
  | 'human_review_required'

export type AgentRuntimeCapabilityId =
  | 'tool-calling'
  | 'project-memory'
  | 'code-sandbox'
  | 'browser-replay'
  | 'vector-store'
  | 'role-evals'
  | 'multi-agent-squad'
  | 'approval-gate'

export type AgentRuntimeCapability = {
  id: AgentRuntimeCapabilityId
  state: AgentRuntimeState
  label: string
  evidenceRefs: string[]
  blockers: string[]
  nextAction: string
}

export type AgentRuntimeSpineInput = {
  selectedAgents?: AgentType[]
  memoryPlan?: ContextMemorySpinePlan | null
  toolRegistryAvailable?: boolean
  sandboxProvider?: 'none' | 'local-script-sandbox' | 'vercel-sandbox' | 'studio-local'
  browserReplayEnabled?: boolean
  vectorStoreProvider?: 'none' | 'local-index' | 'cloud-index'
  roleEvalSuiteAvailable?: boolean
  humanApprovalRequired?: boolean
  evidenceRefs?: string[]
}

export type AgentRuntimeSpinePlan = {
  version: 1
  state: AgentRuntimeState
  selectedAgents: AgentType[]
  capabilities: AgentRuntimeCapability[]
  blockers: string[]
  noFakeSuccessRules: string[]
  nextAction: string
}

export const AGENT_RUNTIME_NO_FAKE_SUCCESS_RULES = [
  'Agents cannot claim research verified without browser replay, source receipts, and artifact evidence.',
  'Agents cannot apply code, deploy, purchase, delete, or publish without an approval gate.',
  'Agents cannot use broad project memory unless context budget, read receipts, and selected shards are present.',
  'Agents cannot claim autonomous execution when code sandbox, browser replay, or tool registry is held.',
] as const

function capability(
  id: AgentRuntimeCapabilityId,
  label: string,
  state: AgentRuntimeState,
  nextAction: string,
  evidenceRefs: string[] = [],
  blockers: string[] = [],
): AgentRuntimeCapability {
  return { id, label, state, evidenceRefs, blockers, nextAction }
}

function mergeState(states: AgentRuntimeState[]): AgentRuntimeState {
  if (states.includes('blocked')) return 'blocked'
  if (states.includes('provider_unavailable')) return 'provider_unavailable'
  if (states.includes('human_review_required')) return 'human_review_required'
  if (states.includes('held')) return 'held'
  if (states.includes('needs-review')) return 'needs-review'
  return 'available'
}

export function buildAgentRuntimeSpinePlan(input: AgentRuntimeSpineInput = {}): AgentRuntimeSpinePlan {
  const defaultAgents: AgentType[] = ['architect', 'designer', 'engineer']
  const selectedAgents: AgentType[] = input.selectedAgents?.length ? input.selectedAgents : defaultAgents
  const supportedAgents = new Set<AgentType>(SUPPORTED_AGENT_TYPES)
  const unsupportedAgents = selectedAgents.filter((agent) => !supportedAgents.has(agent))
  const evidenceRefs = input.evidenceRefs ?? []

  const toolCalling = capability(
    'tool-calling',
    'Tool registry',
    input.toolRegistryAvailable ? 'available' : 'held',
    input.toolRegistryAvailable ? 'Run tools through scoped receipts.' : 'Connect tools to scoped receipts before autonomous work.',
    evidenceRefs.filter((ref) => ref.includes('tool')),
    input.toolRegistryAvailable ? [] : ['Tool registry receipt is missing.'],
  )

  const projectMemoryState: AgentRuntimeState = input.memoryPlan
    ? input.memoryPlan.status === 'available'
      ? 'available'
      : input.memoryPlan.status === 'blocked'
        ? 'blocked'
        : input.memoryPlan.status
    : 'held'

  const projectMemory = capability(
    'project-memory',
    'Project memory',
    projectMemoryState,
    projectMemoryState === 'available'
      ? 'Use selected shards and receipts only.'
      : 'Build memory plan, selected shards, and read receipts before broad agent execution.',
    input.memoryPlan?.evidenceRefs ?? [],
    input.memoryPlan?.blockers ?? ['Context memory plan is missing.'],
  )

  const sandboxState: AgentRuntimeState =
    input.sandboxProvider && input.sandboxProvider !== 'none' ? 'available' : 'provider_unavailable'
  const codeSandbox = capability(
    'code-sandbox',
    'Sandboxed code execution',
    sandboxState,
    sandboxState === 'available' ? `Route execution through ${input.sandboxProvider}.` : 'Choose a sandbox provider before code execution.',
    evidenceRefs.filter((ref) => ref.includes('sandbox')),
    sandboxState === 'available' ? [] : ['No sandbox provider configured.'],
  )

  const browserReplay = capability(
    'browser-replay',
    'Browser replay',
    input.browserReplayEnabled ? 'available' : 'held',
    input.browserReplayEnabled ? 'Record navigation, screenshots, and DOM receipts.' : 'Enable replay before Manus-grade research claims.',
    evidenceRefs.filter((ref) => ref.includes('browser') || ref.includes('replay')),
    input.browserReplayEnabled ? [] : ['Browser replay receipt is missing.'],
  )

  const vectorStoreState: AgentRuntimeState =
    input.vectorStoreProvider && input.vectorStoreProvider !== 'none' ? 'available' : 'held'
  const vectorStore = capability(
    'vector-store',
    'Vector store',
    vectorStoreState,
    vectorStoreState === 'available' ? `Use ${input.vectorStoreProvider} with project-scoped shards.` : 'Create local/cloud project index before GB-scale RAG.',
    evidenceRefs.filter((ref) => ref.includes('vector') || ref.includes('index')),
    vectorStoreState === 'available' ? [] : ['No project vector/index provider configured.'],
  )

  const roleEvals = capability(
    'role-evals',
    'Role evals',
    input.roleEvalSuiteAvailable ? 'available' : 'needs-review',
    input.roleEvalSuiteAvailable ? 'Track role quality with deterministic evals.' : 'Add role-level evals before scaling agent autonomy.',
    evidenceRefs.filter((ref) => ref.includes('eval')),
    input.roleEvalSuiteAvailable ? [] : ['Role eval suite is missing.'],
  )

  const multiAgentSquad = capability(
    'multi-agent-squad',
    'Multi-agent squad runtime',
    unsupportedAgents.length === 0 ? 'available' : 'blocked',
    unsupportedAgents.length === 0 ? 'Coordinate selected roles with non-overlap policy.' : 'Remove unsupported agent roles.',
    evidenceRefs.filter((ref) => ref.includes('agent') || ref.includes('squad')),
    unsupportedAgents.map((agent) => `Unsupported agent role: ${agent}`),
  )

  const approvalGate = capability(
    'approval-gate',
    'Human approval gate',
    input.humanApprovalRequired === false ? 'available' : 'human_review_required',
    input.humanApprovalRequired === false ? 'Safe read-only run.' : 'Require approval before apply/deploy/destructive steps.',
    evidenceRefs.filter((ref) => ref.includes('approval')),
    input.humanApprovalRequired === false ? [] : ['Human approval is required for mutating actions.'],
  )

  const capabilities = [
    toolCalling,
    projectMemory,
    codeSandbox,
    browserReplay,
    vectorStore,
    roleEvals,
    multiAgentSquad,
    approvalGate,
  ]
  const blockers = capabilities.flatMap((item) => item.blockers)
  const state = mergeState(capabilities.map((item) => item.state))

  return {
    version: 1,
    state,
    selectedAgents,
    capabilities,
    blockers,
    noFakeSuccessRules: [...AGENT_RUNTIME_NO_FAKE_SUCCESS_RULES],
    nextAction:
      state === 'available'
        ? 'Run the squad with receipts, selected context, and scoped tool permissions.'
        : 'Resolve held runtime capabilities before claiming autonomous execution.',
  }
}

export function validateAgentRuntimeSpinePlan(plan: AgentRuntimeSpinePlan): string[] {
  const failures: string[] = []
  if (plan.selectedAgents.length === 0) failures.push('selectedAgents is empty')
  if (plan.capabilities.length < 8) failures.push('agent runtime capability matrix is incomplete')
  if (plan.noFakeSuccessRules.length < 4) failures.push('no-fake-success rules are too thin')
  if (plan.state === 'available' && plan.blockers.length > 0) failures.push('available runtime cannot have blockers')
  if (plan.capabilities.some((item) => item.id === 'browser-replay' && item.state === 'available' && item.evidenceRefs.length === 0)) {
    failures.push('available browser replay requires evidence refs')
  }
  return failures
}
