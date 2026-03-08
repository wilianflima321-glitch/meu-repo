/**
 * Compatibility alias for async music generation status polling.
 *
 * Canonical implementation lives in `/api/ai/music/generate` (GET).
 * This route keeps existing clients that poll `/api/ai/music/status`
 * working without changing their integration.
 */

import { NextRequest } from 'next/server';
import { GET as getMusicGenerate } from '../generate/route';

export async function GET(req: NextRequest) {
  return getMusicGenerate(req);
}

