/**
 * Aethel Fusion — Canonical Role → TaskKind mapping.
 *
 * Single source of truth for how every agent role in the system maps to the
 * intelligent model router's TaskKind. This eliminates hard-coded model IDs
 * across agent-orchestrator, ai-agent-system, and agent-mode.
 *
 * @see intelligent-model-router.ts for scoring logic
 * @see ai-service.ts for the LLM call helper
 */

import type { TaskKind, RoutingBudget, TaskComplexity } from './intelligent-model-router';
import type { AgentType } from '@/lib/agent-orchestrator';

// ============================================================================
// ORCHESTRATOR ROLE → TASK KIND
// ============================================================================

const ORCHESTRATOR_ROLE_MAP: Record<AgentType, TaskKind> = {
  architect: 'planning',
  designer: 'creative-writing',
  engineer: 'code',
  qa: 'critic',
  researcher: 'deep-reasoning',
  'browser-operator': 'tool-use',
  'fact-checker': 'critic',
  summarizer: 'simple-chat',
  'competitor-tracker': 'deep-reasoning',
  'paper-reader': 'deep-reasoning',
  'dataset-scout': 'tool-use',
  'huggingface-curator': 'tool-use',
  'github-cartographer': 'tool-use',
  'security-auditor': 'critic',
  'performance-engineer': 'code',
  'release-manager': 'planning',
  'devops-operator': 'code',
  'game-designer': 'creative-writing',
  'gameplay-engineer': 'code',
  'cinematic-director': 'creative-writing',
  'audio-composer': 'creative-writing',
  'asset-pipeline': 'tool-use',
  'ux-researcher': 'deep-reasoning',
  translator: 'simple-chat',
  'documentation-writer': 'simple-chat',
  'cost-governor': 'planning',
  'legal-reviewer': 'critic',
};

// ============================================================================
// AGENT SYSTEM ROLE → TASK KIND
// ============================================================================

/**
 * Maps the simpler AgentRole enum from ai-agent-system.ts to TaskKinds.
 */
const AGENT_ROLE_MAP: Record<string, TaskKind> = {
  coder: 'code',
  artist: 'creative-writing',
  'sound-designer': 'creative-writing',
  'game-designer': 'planning',
  qa: 'critic',
  architect: 'planning',
  'video-editor': 'creative-writing',
  universal: 'tool-use',
};

// ============================================================================
// BUDGET DEFAULTS PER ROLE
// ============================================================================

const ROLE_BUDGET_DEFAULTS: Partial<Record<AgentType | string, RoutingBudget>> = {
  architect: 'max-quality',
  engineer: 'balanced',
  qa: 'balanced',
  researcher: 'max-quality',
  designer: 'balanced',
  summarizer: 'economy',
  translator: 'economy',
  'documentation-writer': 'economy',
  'cost-governor': 'economy',
  // Agent system roles
  coder: 'balanced',
  artist: 'economy',
  'sound-designer': 'economy',
  'game-designer': 'balanced',
  'video-editor': 'economy',
  universal: 'balanced',
};

const ROLE_COMPLEXITY_DEFAULTS: Partial<Record<AgentType | string, TaskComplexity>> = {
  architect: 'high',
  researcher: 'high',
  'deep-reasoning': 'high',
  'security-auditor': 'high',
  summarizer: 'low',
  translator: 'low',
  'documentation-writer': 'low',
};

// ============================================================================
// PUBLIC API
// ============================================================================

export interface FusionRoleConfig {
  taskKind: TaskKind;
  budget: RoutingBudget;
  complexity: TaskComplexity;
}

/**
 * Resolves the Fusion Router config for any role string across the system.
 * Works with both AgentType (orchestrator) and AgentRole (agent-system) keys.
 */
export function resolveTaskKindForRole(role: string): FusionRoleConfig {
  const taskKind =
    ORCHESTRATOR_ROLE_MAP[role as AgentType] ??
    AGENT_ROLE_MAP[role] ??
    'simple-chat';

  const budget = ROLE_BUDGET_DEFAULTS[role] ?? 'balanced';
  const complexity = ROLE_COMPLEXITY_DEFAULTS[role] ?? 'medium';

  return { taskKind, budget, complexity };
}

/**
 * Typed getter for orchestrator roles specifically.
 */
export function getOrchestratorTaskKind(role: AgentType): TaskKind {
  return ORCHESTRATOR_ROLE_MAP[role];
}

/**
 * Typed getter for agent-system roles specifically.
 */
export function getAgentSystemTaskKind(role: string): TaskKind {
  return AGENT_ROLE_MAP[role] ?? 'tool-use';
}
