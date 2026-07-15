/**
 * Compatibility alias for async 3D generation status polling.
 *
 * Canonical implementation lives in `/api/ai/3d/generate` (GET).
 * This route keeps existing clients that poll `/api/ai/3d/status`
 * working without changing their integration.
 */

import { NextRequest } from 'next/server';
import { GET as get3DGenerate } from '../generate/route';
import { AI_STATUS_RATE_LIMIT, enforceAiCoreRateLimit } from '@/lib/server/ai-core-rate-limit';

export async function GET(req: NextRequest) {
  const rateLimited = enforceAiCoreRateLimit({
    req,
    capability: 'ai.status.3d',
    route: '/api/ai/3d/status',
    config: AI_STATUS_RATE_LIMIT,
  });
  if (rateLimited) return rateLimited;

  return get3DGenerate(req);
}
