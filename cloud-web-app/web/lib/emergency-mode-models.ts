import { EMERGENCY_FALLBACK_MODEL_ID, OPENROUTER_MODELS } from './ai/openrouter-models';
import type { EmergencySettings, ModelConfig } from './emergency-mode.types';

const OPENROUTER_MODEL_CONFIGS = Object.fromEntries(
  OPENROUTER_MODELS.map((model) => [
    model.id,
    {
      name: model.name,
      provider: 'openrouter' as const,
      inputCostPer1M: model.inputCost,
      outputCostPer1M: model.outputCost,
      isEmergencyAllowed: model.tier === 'budget',
    },
  ])
);

export const MODEL_CONFIGS: Record<string, ModelConfig> = {
  ...OPENROUTER_MODEL_CONFIGS,
  'gpt-4o': {
    name: 'GPT-4o',
    provider: 'openai',
    inputCostPer1M: 5.0,
    outputCostPer1M: 15.0,
    isEmergencyAllowed: false,
  },
  'gpt-4-turbo': {
    name: 'GPT-4 Turbo',
    provider: 'openai',
    inputCostPer1M: 10.0,
    outputCostPer1M: 30.0,
    isEmergencyAllowed: false,
  },
  'gpt-4o-mini': {
    name: 'GPT-4o Mini',
    provider: 'openai',
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.60,
    isEmergencyAllowed: true,
  },
  'gpt-3.5-turbo': {
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    inputCostPer1M: 0.50,
    outputCostPer1M: 1.50,
    isEmergencyAllowed: true,
  },
  'claude-3-5-sonnet-20241022': {
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    inputCostPer1M: 3.0,
    outputCostPer1M: 15.0,
    isEmergencyAllowed: false,
  },
  'claude-3-5-haiku-20241022': {
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    inputCostPer1M: 0.80,
    outputCostPer1M: 4.0,
    isEmergencyAllowed: true,
  },
  'gemini-1.5-pro': {
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    inputCostPer1M: 3.50,
    outputCostPer1M: 10.50,
    isEmergencyAllowed: false,
  },
  'gemini-1.5-flash': {
    name: 'Gemini 1.5 Flash',
    provider: 'google',
    inputCostPer1M: 0.075,
    outputCostPer1M: 0.30,
    isEmergencyAllowed: true,
  },
};

export function createDefaultEmergencySettings(): EmergencySettings {
  return {
    dailyBudget: parseFloat(process.env.AI_DAILY_BUDGET || '100'),
    hourlyBudget: parseFloat(process.env.AI_HOURLY_BUDGET || '20'),
    monthlyBudget: parseFloat(process.env.AI_MONTHLY_BUDGET || '2000'),
    warningThreshold: 70,
    criticalThreshold: 90,
    autoDowngradeOnWarning: true,
    autoShutdownOnCritical: false,
    fallbackModel: EMERGENCY_FALLBACK_MODEL_ID,
    alertEmails: (process.env.ALERT_EMAILS || '').split(',').filter(Boolean),
    webhookUrl: process.env.ALERT_WEBHOOK_URL || null,
  };
}
