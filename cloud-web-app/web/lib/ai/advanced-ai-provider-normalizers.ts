import type { CompletionResponse } from './advanced-ai-provider-contracts';

type CompletionFinishReason = CompletionResponse['finishReason'];

export function normalizeFinishReason(reason: unknown): CompletionFinishReason {
  switch (reason) {
    case 'stop':
    case 'length':
    case 'tool_calls':
    case 'content_filter':
      return reason;
    case 'end_turn':
    case 'stop_sequence':
      return 'stop';
    case 'max_tokens':
      return 'length';
    case 'tool_use':
      return 'tool_calls';
    default:
      return 'stop';
  }
}

export function readToolArguments(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }

  return input as Record<string, unknown>;
}

export function parseToolArguments(raw: string): Record<string, unknown> {
  try {
    return readToolArguments(JSON.parse(raw));
  } catch {
    return {};
  }
}
