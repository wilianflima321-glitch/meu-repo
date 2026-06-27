import type { NextResponse } from 'next/server';

const DEFAULT_SUCCESSOR = '/api/ai/chat-advanced';

export function withLegacyAiRouteDeprecation(
  response: NextResponse,
  successorPath: string = DEFAULT_SUCCESSOR,
): NextResponse {
  response.headers.set('Deprecation', 'true');
  response.headers.set('Link', `<${successorPath}>; rel="successor-version"`);
  response.headers.set('Sunset', 'Sat, 01 Nov 2026 00:00:00 GMT');
  response.headers.set('X-Aethel-Legacy-Ai-Route', successorPath);
  return response;
}

export const LEGACY_AI_CHAT_SUCCESSOR = DEFAULT_SUCCESSOR;
