export type EmergencyLevel = 'normal' | 'warning' | 'critical' | 'shutdown';

export interface EmergencyState {
  level: EmergencyLevel;
  activatedAt: Date | null;
  activatedBy: string | null;
  reason: string | null;
  settings: EmergencySettings;
  metrics: CostMetrics;
}

export interface EmergencySettings {
  dailyBudget: number;
  hourlyBudget: number;
  monthlyBudget: number;
  warningThreshold: number;
  criticalThreshold: number;
  autoDowngradeOnWarning: boolean;
  autoShutdownOnCritical: boolean;
  fallbackModel: string;
  alertEmails: string[];
  webhookUrl: string | null;
}

export interface CostMetrics {
  hourlySpend: number;
  dailySpend: number;
  monthlySpend: number;
  totalTokensToday: number;
  totalRequestsToday: number;
  avgCostPerRequest: number;
  lastUpdated: Date;
}

export interface ModelConfig {
  name: string;
  provider: 'openai' | 'openrouter' | 'anthropic' | 'google';
  inputCostPer1M: number;
  outputCostPer1M: number;
  isEmergencyAllowed: boolean;
}
