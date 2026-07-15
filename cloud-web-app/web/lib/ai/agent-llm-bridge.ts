/**
 * Bridge between autonomous agent phases and the Aethel Fusion router.
 *
 * Keeps model selection logic in one place so planner/executor/reflector phases
 * automatically pick the right cost/reliability profile without each phase
 * hard-coding a model id.
 */

import { aiService } from '@/lib/ai-service';
import type { LLMProvider } from '@/lib/ai-service.contracts';
import {
  applyModelRobustnessHardening,
  clampTemperatureForModel,
} from './model-robustness-profiles';
import {
  selectModelForTask,
  type RoutingBudget,
  type TaskKind,
} from './intelligent-model-router';

export interface AgentLlmCallOptions {
  /** Explicit model override from agent config or user selection. */
  model?: string;
  provider?: LLMProvider;
  temperature?: number;
  maxTokens?: number;
  budget?: RoutingBudget;
}

function resolveRoutedModel(kind: TaskKind, options: AgentLlmCallOptions): string | undefined {
  if (options.model) return options.model;
  const decision = selectModelForTask({
    kind,
    budget: options.budget ?? 'balanced',
    complexity: kind === 'deep-reasoning' || kind === 'critic' ? 'high' : 'medium',
    needsJson: true,
  });
  return decision?.model;
}

/**
 * Chat helper for agent phases: routes the model, applies per-model hardening,
 * and clamps temperature before delegating to aiService.
 */
export async function agentLlmChat(params: {
  kind: TaskKind;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  options?: AgentLlmCallOptions;
}) {
  const options = params.options ?? {};
  const model = resolveRoutedModel(params.kind, options);
  const hardenedMessages = model
    ? applyModelRobustnessHardening(params.messages, model)
    : params.messages;
  const temperature = model
    ? clampTemperatureForModel(model, options.temperature)
    : options.temperature;

  return aiService.chat({
    messages: hardenedMessages,
    model,
    provider: options.provider,
    temperature,
    maxTokens: options.maxTokens,
  });
}
