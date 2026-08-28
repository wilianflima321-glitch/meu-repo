import { SUPPORTED_AGENT_TYPES, type AgentType } from './agent-roles'
import { buildMissingReceipt, countReceipts } from './receipts'
import { decideAgentRuntimeSandbox } from './sandbox-provider'
import { buildAgentRoleEvalSuite, validateAgentRoleEvalSuite, type AgentRoleEvalSuite } from './role-eval-suite'
import { buildAgentRoleManifest, validateAgentRoleManifest } from './tool-registry'
import {
  uniqueAgentRuntimeValues,
  type AgentRuntimeExecutionPlan,
  type AgentRuntimeReceipt,
  type AgentRuntimeRoleManifest,
  type AgentRuntimeSandboxProvider,
} from './types'

export type BuildAgentRuntimeExecutionPlanInput = {
  roles?: AgentType[]
  missionScope: string
  manifests?: AgentRuntimeRoleManifest[]
  sandboxProvider?: AgentRuntimeSandboxProvider
  receipts?: AgentRuntimeReceipt[]
  evalSuite?: AgentRoleEvalSuite
  browserReplayEnabled?: boolean
  memoryReceiptsRequired?: boolean
}

function mergeState(blockers: string[]): AgentRuntimeExecutionPlan['state'] {
  return blockers.length > 0 ? 'blocked' : 'needs-review'
}

export function buildAgentRuntimeExecutionPlan(input: BuildAgentRuntimeExecutionPlanInput): AgentRuntimeExecutionPlan {
  const defaultRoles: AgentType[] = ['architect', 'engineer', 'qa']
  const roles: AgentType[] = input.roles?.length ? input.roles : defaultRoles
  const supported = new Set<AgentType>(SUPPORTED_AGENT_TYPES)
  const manifests = roles.map((role) => input.manifests?.find((manifest) => manifest.role === role) ?? buildAgentRoleManifest({ role, missionScope: input.missionScope }))
  const sandbox = decideAgentRuntimeSandbox(input.sandboxProvider ?? 'none', input.receipts?.flatMap((receipt) => receipt.evidenceRefs) ?? [])
  const receipts = [...(input.receipts ?? [])]
  const evalSuite = input.evalSuite ?? buildAgentRoleEvalSuite()

  for (const role of roles) {
    if (countReceipts(receipts.filter((receipt) => receipt.role === role), 'tool') === 0) receipts.push(buildMissingReceipt(role, 'tool', 'Tool receipt is required before write actions.'))
    if (input.browserReplayEnabled && countReceipts(receipts.filter((receipt) => receipt.role === role), 'browser-replay') === 0) receipts.push(buildMissingReceipt(role, 'browser-replay', 'Browser replay receipt is required for navigation claims.'))
    if (input.memoryReceiptsRequired !== false && countReceipts(receipts.filter((receipt) => receipt.role === role), 'memory') === 0) receipts.push(buildMissingReceipt(role, 'memory', 'Memory/read receipt is required before broad context use.'))
  }

  const blockers = uniqueAgentRuntimeValues([
    ...roles.filter((role) => !supported.has(role)).map((role) => `Unsupported role: ${role}`),
    ...manifests.flatMap(validateAgentRoleManifest),
    ...receipts.filter((receipt) => receipt.state === 'blocked').map((receipt) => receipt.reason),
    ...(sandbox.state === 'available' ? [] : [sandbox.reason]),
    ...validateAgentRoleEvalSuite(evalSuite, roles),
  ])

  return {
    version: 1,
    state: mergeState(blockers),
    roles: manifests,
    sandboxProvider: sandbox.provider,
    receipts,
    blockers,
    nextAction: blockers.length > 0
      ? 'Attach tool, memory, sandbox, browser replay, eval, and approval receipts before agent apply claims.'
      : 'All evidence receipts attached. Operator approval required before any agent apply or autonomous loop trigger.',
  }
}

export function validateAgentRuntimeExecutionPlan(plan: AgentRuntimeExecutionPlan): string[] {
  const failures: string[] = []
  if (plan.roles.length === 0) failures.push('roles are required')
  if (plan.receipts.length === 0) failures.push('receipts are required')
  if (plan.state === 'available') failures.push('agent runtime execution plan must not mark autonomy available by default')
  if (!plan.nextAction.includes('approval')) failures.push('nextAction must preserve approval gate')
  return failures
}
