/**
 * Compatibility alias for async 3D generation status polling.
 *
 * Canonical implementation lives in `/api/ai/3d/generate` (GET).
 * This route keeps existing clients that poll `/api/ai/3d/status`
 * working without changing their integration.
 */

import { NextRequest } from 'next/server';
import { GET as get3DGenerate } from '../generate/route';

export async function GET(req: NextRequest) {
  return get3DGenerate(req);
}

