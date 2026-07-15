import { OPENROUTER_MODEL_MAP } from './openrouter-models';

/**
 * Returns the weight multiplier for a given model ID.
 * Budget: 1.0x
 * Premium: 40.0x
 * Ultra: 200.0x
 */
export function getModelTokenWeight(modelId: string): number {
  if (!modelId) return 1.0;
  
  // Clean provider prefixes if needed (e.g. openrouter:openai/gpt-5 -> openai/gpt-5)
  let cleanId = modelId;
  if (cleanId.startsWith('openrouter:')) {
    cleanId = cleanId.slice('openrouter:'.length);
  }
  
  // Find in map
  const model = OPENROUTER_MODEL_MAP[cleanId];
  if (!model) {
    // Fallback based on typical premium/ultra keywords
    const lower = cleanId.toLowerCase();
    if (lower.includes('opus') || lower.includes('o1') || lower.includes('gpt-5.4-pro')) {
      return 200.0;
    }
    if (lower.includes('sonnet') || lower.includes('gpt-5') || lower.includes('o3') || lower.includes('pro')) {
      return 40.0;
    }
    return 1.0;
  }

  // Free tier models
  if (model.tier === 'free') {
    return 1.0;
  }

  // Ultra models (input cost >= $5.00/M or specified list)
  const isUltra = model.id.includes('opus') || model.id.includes('o1') || model.id === 'openai/gpt-5.4-pro' || model.inputCost >= 5.0;
  if (isUltra) {
    return 200.0;
  }

  // Premium models (tier is 'best')
  if (model.tier === 'best') {
    return 40.0;
  }

  // Budget models (tier is 'budget')
  return 1.0;
}

/**
 * Applies token weight to raw tokens for a given model.
 */
export function applyTokenWeight(rawTokens: number, modelId: string): number {
  const weight = getModelTokenWeight(modelId);
  return Math.ceil(rawTokens * weight);
}

/**
 * Returns whether the model is an ultra model requiring wallet balance for lower tiers.
 */
export function isUltraModel(modelId: string): boolean {
  return getModelTokenWeight(modelId) >= 200.0;
}
