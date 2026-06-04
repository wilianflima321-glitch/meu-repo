import type { DebugPayload } from './debug-adapter-contracts';

export function asDebugPayload(value: unknown): DebugPayload {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as DebugPayload) : {};
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
