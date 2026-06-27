/**
 * Aethel Fusion — intelligent, task-aware model router.
 *
 * OpenRouter's "Auto"/Fusion picks a model from a generic heuristic. This router
 * goes further: it scores every candidate model on three axes that actually
 * decide output quality and price for a SPECIFIC task:
 *
 *   1. Capability fit   — tier + required features (tools / vision / json / context)
 *   2. Reliability      — per-model robustness profile weaknesses that matter for
 *                         THIS task kind (e.g. tool JSON fragility hurts tool-use,
 *                         hallucination hurts grounded code/planning)
 *   3. Cost             — cheaper is better, weighted by the caller's budget
 *
 * The result is "best work at the lowest defensible cost": cheap, reliable models
 * for simple/bulk work, automatic escalation to stronger models for complex or
 * high-stakes work, and a resilient fallback chain that crosses model families so
 * a single provider outage never blocks the user.
 */

import { MODEL_CONFIGS } from '../emergency-mode-models';
import { OPENROUTER_MODEL_MAP, OPENROUTER_MODELS, EMERGENCY_FALLBACK_MODEL_ID } from './openrouter-models';
import { detectModelFamily, getModelRobustnessProfile, type ModelFamily, type ModelWeaknessProfile } from './model-robustness-profiles';

export type TaskKind =
  | 'simple-chat'
  | 'code'
  | 'planning'
  | 'deep-reasoning'
  | 'tool-use'
  | 'vision'
  | 'bulk-cheap'
  | 'critic'
  | 'creative-writing'
  | 'mesh-generation'
  | 'texture-generation'
  | 'world-layout'
  | 'material-authoring'
  | 'ecosystem-population';

export type TaskComplexity = 'low' | 'medium' | 'high';
export type RoutingBudget = 'economy' | 'balanced' | 'max-quality';
export type ModelTier = 'best' | 'budget' | 'free';

export interface RoutingRequest {
  kind: TaskKind;
  complexity?: TaskComplexity;
  needsTools?: boolean;
  needsVision?: boolean;
  needsJson?: boolean;
  /** Minimum context window required, in tokens. */
  minContextTokens?: number;
  budget?: RoutingBudget;
  /** Restrict routing to these model ids (e.g. only configured providers). */
  availableModelIds?: string[];
  /** If the previous execution failed, you can pass the failed model ids to exclude them. */
  failedModelIds?: string[];
  /** If true, the router will artificially bump complexity and budget to ensure a more capable model is chosen. */
  isEscalation?: boolean;
}

export interface ModelCandidate {
  id: string;
  family: ModelFamily;
  tier: ModelTier;
  contextWindow: number;
  maxOutput: number;
  inputCost: number;
  outputCost: number;
  supportsVision: boolean;
  supportsTools: boolean;
  supportsJson: boolean;
}

export interface ScoredCandidate {
  candidate: ModelCandidate;
  score: number;
  capabilityScore: number;
  reliabilityScore: number;
  costScore: number;
}

export interface RoutingDecision {
  model: string;
  fallbackChain: string[];
  rationale: string;
  scored: ScoredCandidate[];
}

function inferTierFromCost(totalCost: number): ModelTier {
  if (totalCost <= 0) return 'free';
  if (totalCost >= 20) return 'best';
  return 'budget';
}

/** Build a normalized candidate from the OpenRouter catalog or direct MODEL_INFO. */
export function getModelCandidate(id: string): ModelCandidate | null {
  const orm = OPENROUTER_MODEL_MAP[id];
  if (orm) {
    return {
      id,
      family: detectModelFamily(id),
      tier: orm.tier,
      contextWindow: orm.contextWindow,
      maxOutput: orm.maxOutput,
      inputCost: orm.inputCost,
      outputCost: orm.outputCost,
      supportsVision: orm.supportsVision,
      supportsTools: orm.supportsTools,
      supportsJson: orm.supportsJson,
    };
  }
  const info = MODEL_CONFIGS[id];
  if (info) {
    return {
      id,
      family: detectModelFamily(id),
      tier: inferTierFromCost(info.inputCostPer1M + info.outputCostPer1M),
      contextWindow: 128000,
      maxOutput: 4000,
      inputCost: info.inputCostPer1M,
      outputCost: info.outputCostPer1M,
      supportsVision: true,
      supportsTools: true,
      supportsJson: true,
    };
  }
  return null;
}

const TIER_CAPABILITY: Record<ModelTier, number> = { best: 1, budget: 0.6, free: 0.35 };

/**
 * Which robustness weaknesses matter for each task kind. Higher weight means the
 * weakness is more damaging for that task, so models with that weakness rank lower.
 */
const TASK_WEAKNESS_WEIGHTS: Record<TaskKind, Partial<Record<keyof ModelWeaknessProfile, number>>> = {
  'simple-chat': { hallucination: 0.4, verbosity: 0.3, sycophancy: 0.3 },
  code: { hallucination: 0.35, laziness: 0.4, toolJsonFragility: 0.25 },
  planning: { hallucination: 0.45, laziness: 0.35, sycophancy: 0.2 },
  'deep-reasoning': { hallucination: 0.55, laziness: 0.45 },
  'tool-use': { toolJsonFragility: 0.5, hallucination: 0.3, laziness: 0.2 },
  vision: { hallucination: 0.6, laziness: 0.4 },
  'bulk-cheap': { toolJsonFragility: 0.5, hallucination: 0.5 },
  critic: { sycophancy: 0.45, hallucination: 0.4, laziness: 0.15 },
  'creative-writing': { hallucination: 0.3, verbosity: 0.4, sycophancy: 0.3 },
  'mesh-generation': { hallucination: 0.5, laziness: 0.4 },
  'texture-generation': { hallucination: 0.4, laziness: 0.3 },
  'world-layout': { hallucination: 0.5, laziness: 0.3, toolJsonFragility: 0.2 },
  'material-authoring': { hallucination: 0.4, laziness: 0.3 },
  'ecosystem-population': { hallucination: 0.4, laziness: 0.4 },
};

const BUDGET_WEIGHTS: Record<RoutingBudget, { cost: number; reliability: number; capability: number }> = {
  economy: { cost: 0.58, reliability: 0.3, capability: 0.12 },
  balanced: { cost: 0.33, reliability: 0.34, capability: 0.33 },
  'max-quality': { cost: 0.1, reliability: 0.35, capability: 0.55 },
};

function reliabilityForTask(modelId: string, kind: TaskKind): number {
  const { weaknesses } = getModelRobustnessProfile(modelId);
  const weights = TASK_WEAKNESS_WEIGHTS[kind];
  let weightedPenalty = 0;
  let totalWeight = 0;
  for (const [key, weight] of Object.entries(weights)) {
    const severity = weaknesses[key as keyof typeof weaknesses] ?? 0;
    weightedPenalty += severity * (weight ?? 0);
    totalWeight += weight ?? 0;
  }
  if (totalWeight === 0) return 0.6;
  return Math.max(0, 1 - weightedPenalty / totalWeight);
}

function passesHardFilters(candidate: ModelCandidate, request: RoutingRequest): boolean {
  if (request.needsTools && !candidate.supportsTools) return false;
  if (request.needsVision && !candidate.supportsVision) return false;
  if (request.needsJson && !candidate.supportsJson) return false;
  if (request.minContextTokens && candidate.contextWindow < request.minContextTokens) return false;
  return true;
}

function defaultBudgetForComplexity(complexity: TaskComplexity): RoutingBudget {
  if (complexity === 'high') return 'max-quality';
  if (complexity === 'low') return 'economy';
  return 'balanced';
}

/**
 * Score and rank every viable model for the request. Pure and deterministic.
 */
export function rankModelsForTask(request: RoutingRequest): ScoredCandidate[] {
  let ids =
    request.availableModelIds && request.availableModelIds.length > 0
      ? request.availableModelIds
      : OPENROUTER_MODELS.map((model) => model.id);

  if (request.failedModelIds && request.failedModelIds.length > 0) {
    ids = ids.filter(id => !request.failedModelIds!.includes(id));
  }

  const candidates = ids
    .map((id) => getModelCandidate(id))
    .filter((candidate): candidate is ModelCandidate => candidate !== null)
    .filter((candidate) => passesHardFilters(candidate, request));

  if (candidates.length === 0) return [];

  let complexity = request.complexity ?? 'medium';
  if (request.isEscalation && complexity !== 'high') {
    complexity = 'high';
  }

  let budget = request.budget ?? defaultBudgetForComplexity(complexity);
  if (request.isEscalation && budget !== 'max-quality') {
    budget = 'max-quality';
  }

  const weights = { ...BUDGET_WEIGHTS[budget] };

  // High complexity tilts toward capability/reliability; low complexity toward cost.
  if (complexity === 'high') {
    weights.capability += 0.12;
    weights.cost = Math.max(0.05, weights.cost - 0.12);
  } else if (complexity === 'low') {
    weights.cost += 0.1;
    weights.capability = Math.max(0.05, weights.capability - 0.1);
  }

  const totals = candidates.map((c) => c.inputCost + c.outputCost);
  const minCost = Math.min(...totals);
  const maxCost = Math.max(...totals);
  const costSpread = maxCost - minCost;

  const scored: ScoredCandidate[] = candidates.map((candidate) => {
    const totalCost = candidate.inputCost + candidate.outputCost;
    const costScore = costSpread === 0 ? 1 : 1 - (totalCost - minCost) / costSpread;
    const capabilityScore = TIER_CAPABILITY[candidate.tier];
    const reliabilityScore = reliabilityForTask(candidate.id, request.kind);
    const score =
      weights.cost * costScore +
      weights.reliability * reliabilityScore +
      weights.capability * capabilityScore;
    return { candidate, score, capabilityScore, reliabilityScore, costScore };
  });

  return scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Deterministic tiebreaks: cheaper first, then id.
    const costA = a.candidate.inputCost + a.candidate.outputCost;
    const costB = b.candidate.inputCost + b.candidate.outputCost;
    if (costA !== costB) return costA - costB;
    return a.candidate.id.localeCompare(b.candidate.id);
  });
}

/**
 * Build a resilient fallback chain: prefer crossing model families so a single
 * provider/family failure does not strand the request, and always end with the
 * emergency fallback model when it is available.
 */
function buildFallbackChain(scored: ScoredCandidate[], primary: string, availableIds: string[] | undefined): string[] {
  const chain: string[] = [];
  const primaryFamily = detectModelFamily(primary);
  const seenFamilies = new Set<ModelFamily>([primaryFamily]);

  for (const entry of scored) {
    if (entry.candidate.id === primary) continue;
    if (chain.length >= 3) break;
    if (!seenFamilies.has(entry.candidate.family)) {
      chain.push(entry.candidate.id);
      seenFamilies.add(entry.candidate.family);
    }
  }
  // Fill remaining slots with next-best of any family.
  for (const entry of scored) {
    if (chain.length >= 3) break;
    if (entry.candidate.id !== primary && !chain.includes(entry.candidate.id)) {
      chain.push(entry.candidate.id);
    }
  }

  const emergencyAllowed = !availableIds || availableIds.includes(EMERGENCY_FALLBACK_MODEL_ID);
  if (emergencyAllowed && primary !== EMERGENCY_FALLBACK_MODEL_ID && !chain.includes(EMERGENCY_FALLBACK_MODEL_ID)) {
    chain.push(EMERGENCY_FALLBACK_MODEL_ID);
  }
  return chain;
}

/**
 * Pick the best model for a task and a resilient fallback chain. Returns null
 * only when no candidate satisfies the hard capability requirements.
 */
export function selectModelForTask(request: RoutingRequest): RoutingDecision | null {
  const scored = rankModelsForTask(request);
  if (scored.length === 0) return null;

  const best = scored[0];
  const fallbackChain = buildFallbackChain(scored, best.candidate.id, request.availableModelIds);
  const rationale =
    `Selected ${best.candidate.id} for ${request.kind} ` +
    `(complexity=${request.complexity ?? 'medium'}, budget=${request.budget ?? defaultBudgetForComplexity(request.complexity ?? 'medium')}): ` +
    `capability=${best.capabilityScore.toFixed(2)}, reliability=${best.reliabilityScore.toFixed(2)}, cost=${best.costScore.toFixed(2)}.`;

  return { model: best.candidate.id, fallbackChain, rationale, scored };
}
