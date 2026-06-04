/**
 * Shared credit wallet pricing primitives.
 * Kept separate so wallet persistence can stay small while public cost APIs remain stable.
 */

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

export function calculateTokenCost(operationType: AIOperationType, tokens: number): number {
  if (!Number.isFinite(tokens) || tokens <= 0) return 0;
  const per1k = CREDITS_PER_1K_TOKENS[operationType];
  if (!per1k) return 0;
  const rawCost = (tokens / 1000) * per1k;
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
