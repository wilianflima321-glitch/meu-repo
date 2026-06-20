import { OPENROUTER_MODELS } from './openrouter-models';
import type { LLMProvider } from '../ai-service.contracts';

const OPENROUTER_MODEL_INFO = Object.fromEntries(
  OPENROUTER_MODELS.map((model) => [
    model.id,
    {
      provider: 'openrouter' as LLMProvider,
      contextWindow: model.contextWindow,
      maxOutput: model.maxOutput,
      inputCost: model.inputCost,
      outputCost: model.outputCost,
      supportsVision: model.supportsVision,
      supportsTools: model.supportsTools,
      supportsJson: model.supportsJson,
    },
  ])
);

export const MODEL_INFO: Record<string, {
  provider: LLMProvider;
  contextWindow: number;
  maxOutput: number;
  inputCost: number;  // per 1M tokens
  outputCost: number; // per 1M tokens
  supportsVision?: boolean;
  supportsTools?: boolean;
  supportsJson?: boolean;
}> = {
  ...OPENROUTER_MODEL_INFO,

  // OpenAI (direct)
  'gpt-4o': { provider: 'openai', contextWindow: 128000, maxOutput: 16384, inputCost: 2.50, outputCost: 10.00, supportsVision: true, supportsTools: true, supportsJson: true },
  'gpt-4o-mini': { provider: 'openai', contextWindow: 128000, maxOutput: 16384, inputCost: 0.15, outputCost: 0.60, supportsVision: true, supportsTools: true, supportsJson: true },
  'gpt-4-turbo': { provider: 'openai', contextWindow: 128000, maxOutput: 4096, inputCost: 10.00, outputCost: 30.00, supportsVision: true, supportsTools: true, supportsJson: true },
  'o1-preview': { provider: 'openai', contextWindow: 128000, maxOutput: 32768, inputCost: 15.00, outputCost: 60.00, supportsTools: false },
  'o1-mini': { provider: 'openai', contextWindow: 128000, maxOutput: 65536, inputCost: 3.00, outputCost: 12.00, supportsTools: false },

  // Anthropic (direct)
  'claude-3-5-sonnet-20241022': { provider: 'anthropic', contextWindow: 200000, maxOutput: 8192, inputCost: 3.00, outputCost: 15.00, supportsVision: true, supportsTools: true },
  'claude-3-5-haiku-20241022': { provider: 'anthropic', contextWindow: 200000, maxOutput: 8192, inputCost: 0.80, outputCost: 4.00, supportsVision: true, supportsTools: true },
  'claude-3-opus-20240229': { provider: 'anthropic', contextWindow: 200000, maxOutput: 4096, inputCost: 15.00, outputCost: 75.00, supportsVision: true, supportsTools: true },

  // Google (direct)
  'gemini-1.5-pro': { provider: 'google', contextWindow: 2000000, maxOutput: 8192, inputCost: 1.25, outputCost: 5.00, supportsVision: true, supportsTools: true, supportsJson: true },
  'gemini-1.5-flash': { provider: 'google', contextWindow: 1000000, maxOutput: 8192, inputCost: 0.075, outputCost: 0.30, supportsVision: true, supportsTools: true, supportsJson: true },
  'gemini-2.0-flash-exp': { provider: 'google', contextWindow: 1000000, maxOutput: 8192, inputCost: 0.10, outputCost: 0.40, supportsVision: true, supportsTools: true, supportsJson: true },
};
