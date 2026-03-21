export type OpenRouterTier = 'best' | 'budget' | 'free'

export interface OpenRouterModel {
  id: string
  name: string
  tier: OpenRouterTier
  description: string
  contextWindow: number
  maxOutput: number
  inputCost: number
  outputCost: number
  supportsVision: boolean
  supportsTools: boolean
  supportsJson: boolean
}

export const OPENROUTER_BEST_MODELS: OpenRouterModel[] = [
  {
    id: 'openai/gpt-5.4-pro',
    name: 'GPT-5.4 Pro',
    tier: 'best',
    description: 'Max quality and reasoning at the highest cost tier',
    contextWindow: 1050000,
    maxOutput: 128000,
    inputCost: 30.0,
    outputCost: 180.0,
    supportsVision: true,
    supportsTools: true,
    supportsJson: true,
  },
  {
    id: 'openai/gpt-5.4',
    name: 'GPT-5.4',
    tier: 'best',
    description: 'Flagship GPT-5.4 balance for reasoning and code',
    contextWindow: 1050000,
    maxOutput: 128000,
    inputCost: 2.5,
    outputCost: 15.0,
    supportsVision: true,
    supportsTools: true,
    supportsJson: true,
  },
  {
    id: 'openai/gpt-5-pro',
    name: 'GPT-5 Pro',
    tier: 'best',
    description: 'High depth reasoning, premium cost tier',
    contextWindow: 400000,
    maxOutput: 128000,
    inputCost: 15.0,
    outputCost: 120.0,
    supportsVision: true,
    supportsTools: true,
    supportsJson: true,
  },
  {
    id: 'openai/gpt-5',
    name: 'GPT-5',
    tier: 'best',
    description: 'Strong general-purpose reasoning and coding',
    contextWindow: 400000,
    maxOutput: 128000,
    inputCost: 1.25,
    outputCost: 10.0,
    supportsVision: true,
    supportsTools: true,
    supportsJson: true,
  },
  {
    id: 'openai/gpt-5-codex',
    name: 'GPT-5 Codex',
    tier: 'best',
    description: 'Coding-focused GPT-5 family model',
    contextWindow: 400000,
    maxOutput: 128000,
    inputCost: 1.25,
    outputCost: 10.0,
    supportsVision: true,
    supportsTools: true,
    supportsJson: true,
  },
  {
    id: 'openai/gpt-5.3-codex',
    name: 'GPT-5.3 Codex',
    tier: 'best',
    description: 'High-quality coding model with strong tool use',
    contextWindow: 400000,
    maxOutput: 128000,
    inputCost: 1.75,
    outputCost: 14.0,
    supportsVision: true,
    supportsTools: true,
    supportsJson: true,
  },
  {
    id: 'openai/o3',
    name: 'OpenAI o3',
    tier: 'best',
    description: 'Focused reasoning model for complex analysis',
    contextWindow: 200000,
    maxOutput: 100000,
    inputCost: 2.0,
    outputCost: 8.0,
    supportsVision: true,
    supportsTools: true,
    supportsJson: true,
  },
  {
    id: 'anthropic/claude-opus-4.6',
    name: 'Claude Opus 4.6',
    tier: 'best',
    description: 'Top-tier Claude reasoning and writing',
    contextWindow: 1000000,
    maxOutput: 128000,
    inputCost: 5.0,
    outputCost: 25.0,
    supportsVision: true,
    supportsTools: true,
    supportsJson: true,
  },
  {
    id: 'anthropic/claude-sonnet-4.6',
    name: 'Claude Sonnet 4.6',
    tier: 'best',
    description: 'Balanced Claude performance for product work',
    contextWindow: 1000000,
    maxOutput: 128000,
    inputCost: 3.0,
    outputCost: 15.0,
    supportsVision: true,
    supportsTools: true,
    supportsJson: true,
  },
  {
    id: 'anthropic/claude-opus-4.5',
    name: 'Claude Opus 4.5',
    tier: 'best',
    description: 'High-accuracy Claude reasoning',
    contextWindow: 200000,
    maxOutput: 64000,
    inputCost: 5.0,
    outputCost: 25.0,
    supportsVision: true,
    supportsTools: true,
    supportsJson: true,
  },
  {
    id: 'anthropic/claude-sonnet-4.5',
    name: 'Claude Sonnet 4.5',
    tier: 'best',
    description: 'Balanced Claude model for day-to-day use',
    contextWindow: 1000000,
    maxOutput: 64000,
    inputCost: 3.0,
    outputCost: 15.0,
    supportsVision: true,
    supportsTools: true,
    supportsJson: true,
  },
  {
    id: 'anthropic/claude-3.7-sonnet',
    name: 'Claude 3.7 Sonnet',
    tier: 'best',
    description: 'Reliable long-context reasoning',
    contextWindow: 200000,
    maxOutput: 64000,
    inputCost: 3.0,
    outputCost: 15.0,
    supportsVision: true,
    supportsTools: true,
    supportsJson: false,
  },
  {
    id: 'google/gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    tier: 'best',
    description: 'High-end Gemini with multimodal support',
    contextWindow: 1048576,
    maxOutput: 65536,
    inputCost: 1.25,
    outputCost: 10.0,
    supportsVision: true,
    supportsTools: true,
    supportsJson: true,
  },
  {
    id: 'google/gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro Preview',
    tier: 'best',
    description: 'Latest Gemini preview for advanced tasks',
    contextWindow: 1048576,
    maxOutput: 65536,
    inputCost: 2.0,
    outputCost: 12.0,
    supportsVision: true,
    supportsTools: true,
    supportsJson: true,
  },
  {
    id: 'openai/gpt-4.1',
    name: 'GPT-4.1',
    tier: 'best',
    description: 'Stable GPT-4.1 for dependable reasoning',
    contextWindow: 1047576,
    maxOutput: 32768,
    inputCost: 2.0,
    outputCost: 8.0,
    supportsVision: true,
    supportsTools: true,
    supportsJson: true,
  },
]

export const OPENROUTER_FREE_MODELS: OpenRouterModel[] = [
  {
    id: 'openrouter/free',
    name: 'OpenRouter Free Router',
    tier: 'free',
    description: 'Routes to a free model at random based on required capabilities',
    contextWindow: 200000,
    maxOutput: 0,
    inputCost: 0.0,
    outputCost: 0.0,
    supportsVision: true,
    supportsTools: true,
    supportsJson: true,
  },
]

export const OPENROUTER_BUDGET_MODELS: OpenRouterModel[] = [
  {
    id: 'openai/gpt-5.4-mini',
    name: 'GPT-5.4 Mini',
    tier: 'budget',
    description: 'Fast and cost-efficient GPT-5.4 tier',
    contextWindow: 400000,
    maxOutput: 128000,
    inputCost: 0.75,
    outputCost: 4.5,
    supportsVision: true,
    supportsTools: true,
    supportsJson: true,
  },
  {
    id: 'openai/gpt-5.4-nano',
    name: 'GPT-5.4 Nano',
    tier: 'budget',
    description: 'Ultra low-cost GPT-5.4 for high volume',
    contextWindow: 400000,
    maxOutput: 128000,
    inputCost: 0.2,
    outputCost: 1.25,
    supportsVision: true,
    supportsTools: true,
    supportsJson: true,
  },
  {
    id: 'openai/gpt-5-mini',
    name: 'GPT-5 Mini',
    tier: 'budget',
    description: 'Fast GPT-5 tier for everyday tasks',
    contextWindow: 400000,
    maxOutput: 128000,
    inputCost: 0.25,
    outputCost: 2.0,
    supportsVision: true,
    supportsTools: true,
    supportsJson: true,
  },
  {
    id: 'openai/gpt-5-nano',
    name: 'GPT-5 Nano',
    tier: 'budget',
    description: 'Lowest cost GPT-5 tier',
    contextWindow: 400000,
    maxOutput: 128000,
    inputCost: 0.05,
    outputCost: 0.4,
    supportsVision: true,
    supportsTools: true,
    supportsJson: true,
  },
  {
    id: 'openai/gpt-4.1-mini',
    name: 'GPT-4.1 Mini',
    tier: 'budget',
    description: 'Affordable GPT-4.1 for chat and drafting',
    contextWindow: 1047576,
    maxOutput: 32768,
    inputCost: 0.4,
    outputCost: 1.6,
    supportsVision: true,
    supportsTools: true,
    supportsJson: true,
  },
  {
    id: 'openai/gpt-4.1-nano',
    name: 'GPT-4.1 Nano',
    tier: 'budget',
    description: 'Ultra low-cost GPT-4.1 tier',
    contextWindow: 1047576,
    maxOutput: 32768,
    inputCost: 0.1,
    outputCost: 0.4,
    supportsVision: true,
    supportsTools: true,
    supportsJson: true,
  },
  {
    id: 'openai/o3-mini',
    name: 'OpenAI o3 Mini',
    tier: 'budget',
    description: 'Reasoning model with budget pricing',
    contextWindow: 200000,
    maxOutput: 100000,
    inputCost: 1.1,
    outputCost: 4.4,
    supportsVision: false,
    supportsTools: true,
    supportsJson: true,
  },
  {
    id: 'openai/o4-mini',
    name: 'OpenAI o4 Mini',
    tier: 'budget',
    description: 'Efficient reasoning with strong tool use',
    contextWindow: 200000,
    maxOutput: 100000,
    inputCost: 1.1,
    outputCost: 4.4,
    supportsVision: true,
    supportsTools: true,
    supportsJson: true,
  },
  {
    id: 'openai/o4-mini-high',
    name: 'OpenAI o4 Mini High',
    tier: 'budget',
    description: 'Higher quality o4 mini tier',
    contextWindow: 200000,
    maxOutput: 100000,
    inputCost: 1.1,
    outputCost: 4.4,
    supportsVision: true,
    supportsTools: true,
    supportsJson: true,
  },
  {
    id: 'google/gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    tier: 'budget',
    description: 'Fast, low-cost Gemini for throughput',
    contextWindow: 1048576,
    maxOutput: 65535,
    inputCost: 0.3,
    outputCost: 2.5,
    supportsVision: true,
    supportsTools: true,
    supportsJson: true,
  },
  {
    id: 'google/gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    tier: 'budget',
    description: 'Cheapest Gemini tier for bulk requests',
    contextWindow: 1048576,
    maxOutput: 65535,
    inputCost: 0.1,
    outputCost: 0.4,
    supportsVision: true,
    supportsTools: true,
    supportsJson: true,
  },
  {
    id: 'google/gemini-3.1-flash-lite-preview',
    name: 'Gemini 3.1 Flash Lite Preview',
    tier: 'budget',
    description: 'Preview Gemini flash-lite for fast iteration',
    contextWindow: 1048576,
    maxOutput: 65536,
    inputCost: 0.25,
    outputCost: 1.5,
    supportsVision: true,
    supportsTools: true,
    supportsJson: true,
  },
  {
    id: 'anthropic/claude-3.5-haiku',
    name: 'Claude 3.5 Haiku',
    tier: 'budget',
    description: 'Fast Claude model with low latency',
    contextWindow: 200000,
    maxOutput: 8192,
    inputCost: 0.8,
    outputCost: 4.0,
    supportsVision: true,
    supportsTools: true,
    supportsJson: false,
  },
  {
    id: 'openai/gpt-5.1-codex',
    name: 'GPT-5.1 Codex',
    tier: 'budget',
    description: 'Lower-cost Codex tier for code edits',
    contextWindow: 400000,
    maxOutput: 128000,
    inputCost: 1.25,
    outputCost: 10.0,
    supportsVision: true,
    supportsTools: true,
    supportsJson: true,
  },
  {
    id: 'openai/gpt-5.2-codex',
    name: 'GPT-5.2 Codex',
    tier: 'budget',
    description: 'Cost-optimized Codex tier with strong quality',
    contextWindow: 400000,
    maxOutput: 128000,
    inputCost: 1.75,
    outputCost: 14.0,
    supportsVision: true,
    supportsTools: true,
    supportsJson: true,
  },
]

const sortByTotalCostDesc = (a: OpenRouterModel, b: OpenRouterModel) =>
  (b.inputCost + b.outputCost) - (a.inputCost + a.outputCost)

const sortByTotalCostAsc = (a: OpenRouterModel, b: OpenRouterModel) =>
  (a.inputCost + a.outputCost) - (b.inputCost + b.outputCost)

const formatCost = (value: number) => {
  if (value >= 10) {
    return `$${value.toFixed(0)}`
  }
  if (value >= 1) {
    return `$${value.toFixed(2)}`
  }
  return `$${value.toFixed(4)}`
}

export const OPENROUTER_MODELS: OpenRouterModel[] = [
  ...OPENROUTER_BEST_MODELS,
  ...OPENROUTER_FREE_MODELS,
  ...OPENROUTER_BUDGET_MODELS,
]

export const OPENROUTER_MODEL_MAP = Object.fromEntries(
  OPENROUTER_MODELS.map((model) => [model.id, model])
)

export const DEFAULT_OPENROUTER_MODEL_ID = 'google/gemini-2.5-flash-lite'
export const EMERGENCY_FALLBACK_MODEL_ID = 'google/gemini-2.5-flash-lite'

export const OPENROUTER_BEST_MODELS_SORTED = [...OPENROUTER_BEST_MODELS].sort(sortByTotalCostDesc)
export const OPENROUTER_BUDGET_MODELS_SORTED = [...OPENROUTER_BUDGET_MODELS].sort(sortByTotalCostAsc)
export const OPENROUTER_FREE_MODELS_SORTED = [...OPENROUTER_FREE_MODELS]

export const OPENROUTER_BEST_OPTIONS = OPENROUTER_BEST_MODELS_SORTED.map((model) => ({
  value: model.id,
  label: `${model.name} · ${formatCost(model.inputCost)}/${formatCost(model.outputCost)} per 1M (Best)`,
}))

export const OPENROUTER_FREE_OPTIONS = OPENROUTER_FREE_MODELS_SORTED.map((model) => ({
  value: model.id,
  label: `${model.name} · Free`,
}))

export const OPENROUTER_BUDGET_OPTIONS = OPENROUTER_BUDGET_MODELS_SORTED.map((model) => ({
  value: model.id,
  label: `${model.name} · ${formatCost(model.inputCost)}/${formatCost(model.outputCost)} per 1M (Budget)`,
}))

export const OPENROUTER_MODEL_OPTIONS = [
  ...OPENROUTER_FREE_OPTIONS,
  ...OPENROUTER_BUDGET_OPTIONS,
  ...OPENROUTER_BEST_OPTIONS,
]
