/**
 * Compatibility alias for async music generation status polling.
 *
 * Canonical implementation lives in `/api/ai/music/generate` (GET).
 * This route keeps existing clients that poll `/api/ai/music/status`
 * working without changing their integration.
 */

import { NextRequest } from 'next/server';
import { GET as getMusicGenerate } from '../generate/route';
import { AI_STATUS_RATE_LIMIT, enforceAiCoreRateLimit } from '@/lib/server/ai-core-rate-limit';

export async function GET(req: NextRequest) {
  const rateLimited = enforceAiCoreRateLimit({
    req,
    capability: 'ai.status.music',
    route: '/api/ai/music/status',
    config: AI_STATUS_RATE_LIMIT,
  });
  if (rateLimited) return rateLimited;

  return getMusicGenerate(req);
}
