/**
 * @aethel/agents/runtime — deterministic, fail-closed agent runtime policy core.
 *
 * Public API of the agent runtime governance layer: role manifests, tool
 * permissions, evidence receipts, eval suites, sandbox decisions, and the
 * execution-plan builder/validator.
 *
 * NOTE (2026-08-11 audit): this barrel intentionally does NOT re-export the
 * optional LangGraph mission loop (`./langgraph`) — that module is an opt-in
 * LLM-runtime integration that pulls `@langchain/*`. Consumers that need it
 * import `@aethel/agents/runtime/langgraph` directly. Keeping the policy core
 * provider-free guarantees it stays unit-testable and fail-closed without an
 * external model dependency.
 */

// Types + shared constants
export {
  AGENT_RUNTIME_FORBIDDEN_CLAIMS,
  uniqueAgentRuntimeValues,
  type AgentRuntimeExecutionPlan,
  type AgentRuntimeExecutionState,
  type AgentRuntimeReceipt,
  type AgentRuntimeRoleManifest,
  type AgentRuntimeSandboxProvider,
  type AgentRuntimeToolPermission,
  type AgentRuntimeToolRisk,
} from './types'

// Evidence receipts
export { buildMissingReceipt, countReceipts, createAgentRuntimeReceipt } from './receipts'

// Role manifests + tool permissions
export { buildAgentRoleManifest, toolPermission, validateAgentRoleManifest } from './tool-registry'

// Role eval suites
export {
  buildAgentRoleEvalSuite,
  validateAgentRoleEvalSuite,
  type AgentRoleEvalCase,
  type AgentRoleEvalSuite,
} from './role-eval-suite'

// Sandbox decisions
export { decideAgentRuntimeSandbox, type AgentRuntimeSandboxDecision } from './sandbox-provider'

// Execution plan builder/validator
export {
  buildAgentRuntimeExecutionPlan,
  validateAgentRuntimeExecutionPlan,
  type BuildAgentRuntimeExecutionPlanInput,
} from './orchestrator'
