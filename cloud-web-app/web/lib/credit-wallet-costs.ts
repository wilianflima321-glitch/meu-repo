/**
 * Shared credit wallet pricing primitives.
 * Kept separate so wallet persistence can stay small while public cost APIs remain stable.
 *
 * Model cost multipliers (DEBT-FIN-008):
 *   Cheap/fast models (Gemini Flash, Haiku) cost 1× credit per token.
 *   Premium models (GPT-4o, Claude Opus) cost proportionally more so the
 *   platform does not absorb the real-world price difference.
 *
 *   Multiplier formula: (model_real_$/M_out) / (gemini-1.5-flash_$/M_out)
 *   Base reference: gemini-1.5-flash ≈ $0.075 / M output tokens → 1×
 */

// ---------------------------------------------------------------------------
// MODEL COST MULTIPLIERS
// ---------------------------------------------------------------------------

/** Multiplier applied to base token credits for each named model. */
export const MODEL_COST_MULTIPLIERS: Record<string, number> = {
  // --- Google ---
  'gemini-1.5-flash': 1,
  'gemini-1.5-flash-8b': 0.5,
  'gemini-1.5-pro': 8,
  'gemini-2.0-flash': 1.5,
  'gemini-2.5-pro': 20,

  // --- OpenAI ---
  'gpt-4o-mini': 4,
  'gpt-4o': 30,
  'gpt-4-turbo': 40,
  'o1-mini': 12,
  'o1': 80,
  'o3-mini': 18,

  // --- Anthropic ---
  'claude-3-5-haiku-20241022': 5,
  'claude-3-5-sonnet-20241022': 24,
  'claude-3-opus-20240229': 100,
  'claude-3-7-sonnet-20250219': 28,

  // --- Groq (fast inference, reduced cost) ---
  'llama-3.1-8b-instant': 0.5,
  'llama-3.1-70b-versatile': 3,
  'llama-3.3-70b-versatile': 3,
  'mixtral-8x7b-32768': 2,
}

/**
 * Returns the credit multiplier for a given model ID.
 * Falls back to 1.0 (neutral) for unrecognised models.
 * Performs a prefix search so versioned aliases resolve gracefully.
 */
export function getModelCostMultiplier(modelId: string): number {
  if (!modelId) return 1
  const direct = MODEL_COST_MULTIPLIERS[modelId]
  if (direct !== undefined) return direct

  // Prefix fallback (e.g. "openai/gpt-4o" → check "gpt-4o")
  const short = modelId.includes('/') ? modelId.split('/').pop()! : modelId
  const byShort = MODEL_COST_MULTIPLIERS[short]
  if (byShort !== undefined) return byShort

  // Best-effort: scan keys that are prefixes of the given modelId
  for (const [key, mult] of Object.entries(MODEL_COST_MULTIPLIERS)) {
    if (modelId.startsWith(key)) return mult
  }

  return 1
}

export type AIOperationType =
  | 'chat'
  | 'chat_advanced'
  | 'code_generation'
  | 'image_generation'
  | 'audio_generation'
  | 'music_generation'
  | '3d_generation'
  | 'voice'
  | 'inline_completion'
  | 'inline_edit'
  | 'agent_task';

// ============================================================================
// CUSTOS POR OPERAÇÃO
// ============================================================================

// Créditos por 1K tokens (para operações de texto)
export const CREDITS_PER_1K_TOKENS: Record<string, number> = {
  chat: 1,
  chat_advanced: 2,
  code_generation: 3,
  inline_completion: 0.5,
  inline_edit: 1,
  agent_task: 5,
};

// Créditos fixos por unidade (para operações não-texto)
export const CREDITS_FIXED_COST: Record<string, number> = {
  image_generation: 10,      // por imagem
  audio_generation: 5,       // por minuto
  music_generation: 8,       // por minuto
  '3d_generation': 20,       // por asset
  voice: 2,                  // por 30s de áudio
};

// ============================================================================
// FUNÇÕES DE CRÉDITO
// ============================================================================

export const clampNonNegative = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
};

export const ensurePositiveAmount = (value: number, label: string): number => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive number`);
  }
  return value;
};

export function calculateTokenCost(
  operationType: AIOperationType,
  tokens: number,
  /** Optional model ID — applies per-model cost multiplier when provided. */
  modelId?: string,
): number {
  if (!Number.isFinite(tokens) || tokens <= 0) return 0;
  const per1k = CREDITS_PER_1K_TOKENS[operationType];
  if (!per1k) return 0;
  const multiplier = modelId ? getModelCostMultiplier(modelId) : 1;
  const rawCost = (tokens / 1000) * per1k * multiplier;
  if (per1k < 1) {
    return Math.round(rawCost * 1000) / 1000;
  }
  return Math.ceil(clampNonNegative(rawCost));
}

export function calculateEstimatedCost(
  operationType: AIOperationType,
  params: { count?: number; minutes?: number; tokens?: number }
): number {
  if (params.tokens && CREDITS_PER_1K_TOKENS[operationType]) {
    return calculateTokenCost(operationType, params.tokens);
  }

  if (CREDITS_FIXED_COST[operationType]) {
    const multiplier = clampNonNegative(params.count || params.minutes || 1);
    return CREDITS_FIXED_COST[operationType] * multiplier;
  }

  return 1;
}

/**
 * Estima custo em créditos para uma operação
 */
export function estimateCreditCost(
  operationType: AIOperationType,
  params: {
    estimatedTokens?: number;
    imageCount?: number;
    audioMinutes?: number;
    assetCount?: number;
  }
): number {
  // Operações de texto
  if (CREDITS_PER_1K_TOKENS[operationType] && params.estimatedTokens) {
    return Math.ceil(clampNonNegative((params.estimatedTokens / 1000) * CREDITS_PER_1K_TOKENS[operationType]));
  }

  // Operações fixas
  if (CREDITS_FIXED_COST[operationType]) {
    const multiplier = clampNonNegative(params.imageCount || params.audioMinutes || params.assetCount || 1);
    return CREDITS_FIXED_COST[operationType] * multiplier;
  }

  // Fallback
  return 1;
}
