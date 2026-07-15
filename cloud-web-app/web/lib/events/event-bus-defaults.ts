import type { EventBusConfig, EventPriority } from './event-bus-contracts';

export const EVENT_PRIORITY_ORDER: Record<EventPriority, number> = {
  highest: 4,
  high: 3,
  normal: 2,
  low: 1,
  lowest: 0,
};

export function createDefaultEventBusConfig(config: Partial<EventBusConfig> = {}): EventBusConfig {
  return {
    maxHistorySize: 1000,
    enableHistory: true,
    enableLogging: false,
    asyncHandlers: true,
    throwOnError: false,
    ...config,
  };
}
