import { NextRequest } from 'next/server'

import { AI_STATUS_RATE_LIMIT, enforceAiCoreRateLimit } from '@/lib/server/ai-core-rate-limit'
import { getVideoStatusOrProviders } from '../generate/route'

export async function GET(req: NextRequest) {
  const rateLimited = enforceAiCoreRateLimit({
    req,
    capability: 'ai.status.video',
    route: '/api/ai/video/status',
    config: AI_STATUS_RATE_LIMIT,
  })
  if (rateLimited) return rateLimited

  return getVideoStatusOrProviders(req)
}
