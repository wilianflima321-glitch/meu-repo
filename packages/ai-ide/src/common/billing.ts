/**
 * Minimal billing and metering helpers.
 *
 * This module implements conservative, easily-testable helpers to estimate
 * provider call costs and emit in-memory usage events. Later iterations can
 * persist events and wire a billing UI.
 */

export type UsageEvent = {
  id: string;
  providerId?: string;
  timestamp: string;
  tokens?: number;
  estimatedCost?: number;
  meta?: Record<string, unknown>;
};

const events: UsageEvent[] = [];

export function calcEstimatedProviderCost(tokens: number, centsPerKToken = 1): number {
  // Very conservative cost estimator: default cents per 1k tokens = 1 cent
  if (!tokens || tokens <= 0) return 0;
  const costCents = (tokens / 1000) * centsPerKToken;
  return Math.max(0, costCents / 100); // return in dollars
}

export function emitUsageEvent(e: UsageEvent): void {
  events.push(e);
}

export function listUsageEvents(): UsageEvent[] {
  return events.slice();
}

export function clearUsageEvents(): void {
  events.length = 0;
}
