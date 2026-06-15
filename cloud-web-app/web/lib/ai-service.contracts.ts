import { OPENROUTER_MODELS } from './ai/openrouter-models';

// TIPOS
// ============================================================================

export type LLMProvider = 'openai' | 'openrouter' | 'anthropic' | 'google' | 'groq';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIQueryOptions {
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  userId?: string; // Para tracking e shadow ban
  bypassEmergency?: boolean; // Para admin override
}

export interface AIResponse {
  content: string;
  model: string;
  provider: LLMProvider;
  tokensUsed: number;
  latencyMs: number;
  cost?: number; // Custo estimado em USD
  downgraded?: boolean; // Se foi downgrade por emergency mode
  originalModel?: string; // Modelo original se foi downgraded
}

export function parseModelSelection(
  model?: string,
  provider?: LLMProvider
): { model?: string; provider?: LLMProvider } {
  const rawModel = String(model || '').trim();
  if (!rawModel) {
    return { model: undefined, provider };
  }

  const colonIndex = rawModel.indexOf(':');
  if (colonIndex > 0 && colonIndex < rawModel.length - 1) {
    const prefix = rawModel.slice(0, colonIndex).toLowerCase();
    const nextModel = rawModel.slice(colonIndex + 1);
    if (prefix === 'openrouter') return { model: nextModel, provider: 'openrouter' };
    if (prefix === 'openai') return { model: nextModel, provider: provider === 'openrouter' ? provider : 'openai' };
    if (prefix === 'anthropic') return { model: nextModel, provider: provider === 'openrouter' ? provider : 'anthropic' };
    if (prefix === 'google') return { model: nextModel, provider: provider === 'openrouter' ? provider : 'google' };
    if (prefix === 'groq') return { model: nextModel, provider: 'groq' };
  }

  if (!provider) {
    if (rawModel.startsWith('openai/')) return { model: rawModel, provider: 'openrouter' };
    if (rawModel.startsWith('anthropic/')) return { model: rawModel, provider: 'openrouter' };
    if (rawModel.startsWith('google/')) return { model: rawModel, provider: 'openrouter' };
  }

  return { model: rawModel, provider };
}

// ============================================================================
// PRICING PER MILLION TOKENS (December 2024)
// ============================================================================

const OPENROUTER_PRICING = Object.fromEntries(
  OPENROUTER_MODELS.map((model) => [
    model.id,
    { input: model.inputCost, output: model.outputCost },
  ])
);

export const PRICING: Record<string, { input: number; output: number }> = {
  ...OPENROUTER_PRICING,
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
  'claude-3-5-haiku-20241022': { input: 0.80, output: 4.00 },
  'gemini-1.5-pro': { input: 1.25, output: 5.00 },
  'gemini-1.5-flash': { input: 0.075, output: 0.30 },
};

// ============================================================================
